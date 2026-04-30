import * as vscode from 'vscode';
import * as cp from 'child_process';
import { getShell } from './shellConfig';
import { getSharedPanelStyles } from './SharedPanelStyles';

const _panels = new Map<string, vscode.WebviewPanel>();

/**
 * Opens (or reveals) a webview panel showing nicely formatted documentation
 * for a ServiceNow Fluent API by running `now-sdk explain <api>` and
 * rendering the output as HTML.
 */
export function showSdkExplainPanel(apiName: string): void {
    const key = apiName.toLowerCase();

    // Reuse an existing open panel for the same API
    const existing = _panels.get(key);
    if (existing) {
        existing.reveal(undefined, true);
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'nowdev.sdkExplain',
        `${apiName} — SDK Docs`,
        { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
        { enableScripts: false, localResourceRoots: [], retainContextWhenHidden: true }
    );

    _panels.set(key, panel);
    panel.onDidDispose(() => _panels.delete(key));
    panel.webview.html = loadingHtml(apiName);

    cp.exec(`now-sdk explain ${apiName}`, { timeout: 15000, encoding: 'utf-8', shell: getShell() }, (_err, stdout, stderr) => {
        const output = String(stdout || stderr || '').trim();
        if (!output) {
            panel.webview.html = errorHtml(`No documentation found for "${apiName}". Check that the API name is correct and now-sdk is installed.`);
            return;
        }

        // Detect "Multiple matching topics" disambiguation output
        const topics = parseMultipleTopics(output);
        if (topics) {
            panel.webview.html = multipleTopicsHtml(apiName, topics);
            vscode.window.showQuickPick(
                topics.map(t => ({ label: t.name, description: t.desc })),
                { placeHolder: `Multiple topics matched "${apiName}" — select one to view` }
            ).then(selected => {
                if (!selected) { return; }
                panel.webview.html = loadingHtml(selected.label);
                cp.exec(`now-sdk explain ${selected.label}`, { timeout: 15000, encoding: 'utf-8', shell: getShell() }, (_e, out, err) => {
                    const o = String(out || err || '').trim();
                    panel.webview.html = o ? renderHtml(selected.label, o) : errorHtml(`No documentation found for "${selected.label}".`);
                });
            });
            return;
        }

        panel.webview.html = renderHtml(apiName, output);
    });
}

// ── Multiple-topics helpers ───────────────────────────────────────────────────

function parseMultipleTopics(output: string): Array<{ name: string; desc: string }> | null {
    if (!output.includes('Multiple matching topics')) { return null; }
    const topics: Array<{ name: string; desc: string }> = [];
    for (const line of output.split(/\r?\n/)) {
        // Lines look like:  "  topic-name: Description text."
        const m = line.trim().match(/^([\w-]+):\s*(.*)/);
        if (m) {
            // Strip backticks from the description for cleaner display
            topics.push({ name: m[1], desc: m[2].replace(/`/g, '') });
        }
    }
    return topics.length > 0 ? topics : null;
}

function multipleTopicsHtml(apiName: string, topics: Array<{ name: string; desc: string }>): string {
    const items = topics.map(t =>
        `<li><div class="param-name">${esc(t.name)}</div><div class="cont">${esc(t.desc)}</div></li>`
    ).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="api-header">
  <div class="api-id">${esc(apiName)}</div>
  <div class="api-tags"><span class="tag">Multiple Matches</span></div>
</div>
<h2 class="sec-h">Multiple matching topics</h2>
<p style="margin:0 0 14px;color:var(--vscode-descriptionForeground,#888);font-size:12px;">
  A topic picker has opened above \u2014 select one to view its documentation.
</p>
<ul class="props">${items}</ul>
</body></html>`;
}

// ── HTML templates ─────────────────────────────────────────────────────────────

function loadingHtml(apiName: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="loading">Loading documentation for <strong>${esc(apiName)}</strong>&hellip;</div>
</body></html>`;
}

function errorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="error-msg">${esc(msg)}</div>
</body></html>`;
}

function renderHtml(apiName: string, raw: string): string {
    const body = convertToHtml(raw);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
${styles()}
</head>
<body>${body}</body>
</html>`;
}

// ── Syntax highlighter (runs in extension host — no webview scripts needed) ──────

const JS_TS_KEYWORDS = new Set([
    'import','export','from','as','const','let','var','function','return',
    'class','extends','new','this','typeof','instanceof','if','else','for',
    'while','do','switch','case','break','continue','default','try','catch',
    'finally','throw','async','await','yield','of','in','null','undefined',
    'true','false','void','delete','type','interface','enum','namespace',
    'declare','readonly','public','private','protected','static','abstract',
    'implements','keyof','infer','never','any','unknown','string','number',
    'boolean','object','symbol','require','module','exports',
]);

function escRaw(ch: string): string {
    if (ch === '&') { return '&amp;'; }
    if (ch === '<') { return '&lt;'; }
    if (ch === '>') { return '&gt;'; }
    if (ch === '"') { return '&quot;'; }
    return ch;
}

function escStr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sp(cls: string, content: string): string {
    return `<span class="${cls}">${escStr(content)}</span>`;
}

function tokenizeJs(src: string): string {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        // Line comment
        if (ch === '/' && src[i + 1] === '/') {
            let j = i + 2;
            while (j < src.length && src[j] !== '\n') { j++; }
            out += sp('hl-cmt', src.slice(i, j));
            i = j; continue;
        }
        // Block comment
        if (ch === '/' && src[i + 1] === '*') {
            let j = i + 2;
            while (j < src.length && !(src[j] === '*' && src[j + 1] === '/')) { j++; }
            out += sp('hl-cmt', src.slice(i, j + 2));
            i = j + 2; continue;
        }
        // Template literal
        if (ch === '`') {
            let j = i + 1;
            while (j < src.length && src[j] !== '`') {
                if (src[j] === '\\') { j++; }
                j++;
            }
            out += sp('hl-str', src.slice(i, j + 1));
            i = j + 1; continue;
        }
        // String literal
        if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < src.length && src[j] !== ch) {
                if (src[j] === '\\') { j++; }
                j++;
            }
            out += sp('hl-str', src.slice(i, j + 1));
            i = j + 1; continue;
        }
        // Number
        if (ch >= '0' && ch <= '9') {
            let j = i;
            while (j < src.length && /[\d.xXa-fA-F_n]/.test(src[j])) { j++; }
            out += sp('hl-num', src.slice(i, j));
            i = j; continue;
        }
        // Identifier, keyword, or function call
        if (/[a-zA-Z_$]/.test(ch)) {
            let j = i;
            while (j < src.length && /[\w$]/.test(src[j])) { j++; }
            const word = src.slice(i, j);
            if (JS_TS_KEYWORDS.has(word)) {
                out += sp('hl-kw', word);
            } else if (src[j] === '(') {
                out += sp('hl-fn', word);
            } else {
                out += escStr(word);
            }
            i = j; continue;
        }
        // Decorator
        if (ch === '@' && /[a-zA-Z_$]/.test(src[i + 1] ?? '')) {
            let j = i + 1;
            while (j < src.length && /[\w$.]/.test(src[j])) { j++; }
            out += sp('hl-dec', src.slice(i, j));
            i = j; continue;
        }
        out += escRaw(ch);
        i++;
    }
    return out;
}

function highlightCode(raw: string, lang: string): string {
    const l = lang.toLowerCase();
    if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') {
        return tokenizeJs(raw);
    }
    return escStr(raw);
}

// ── Output parser ──────────────────────────────────────────────────────────────

function esc(s: string): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatPropLine(line: string): string {
    // "$id (required): string | number"
    const m = line.match(/^(\S+)\s+\((required|optional)\):\s*(.*)$/);
    if (m) {
        const cls = m[2] === 'required' ? 'req' : 'opt';
        return `<span class="pname">${esc(m[1])}</span> <span class="${cls}">(${m[2]})</span><span class="ptype">: ${esc(m[3])}</span>`;
    }
    // "key: value"
    const kv = line.match(/^(\S+):\s*(.*)$/);
    if (kv) {
        return `<span class="pname">${esc(kv[1])}</span><span class="ptype">: ${esc(kv[2])}</span>`;
    }
    return esc(line);
}

function convertToHtml(raw: string): string {
    const lines = raw.split(/\r?\n/);
    let i = 0;
    let html = '';

    // ── Header block (between ════ separators) ─────────────────────
    while (i < lines.length && !lines[i].match(/^═{4,}/)) { i++; }
    let apiId = '';
    let tags: string[] = [];
    if (i < lines.length) {
        i++; // skip opening ════
        while (i < lines.length && !lines[i].match(/^═{4,}/)) {
            const t = lines[i].trim();
            if (t.startsWith('Tags:')) {
                tags = t.slice(5).split(',').map(s => s.trim()).filter(Boolean);
            } else if (t) {
                apiId = t;
            }
            i++;
        }
        i++; // skip closing ════
    }

    if (apiId || tags.length) {
        html += `<div class="api-header">`;
        if (apiId) { html += `<div class="api-id">${esc(apiId)}</div>`; }
        if (tags.length) {
            html += `<div class="api-tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
        }
        html += `</div>`;
    }

    // ── Body ───────────────────────────────────────────────────────
    let inExamples = false;
    let inParams = false;
    let exampleExpectTitle = true;

    while (i < lines.length) {
        const rawLine = lines[i];
        const line = rawLine.trim();
        i++;

        if (!line) { continue; }

        // ── Code block ──
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim() || 'text';
            let code = '';
            while (i < lines.length) {
                const cl = lines[i]; i++;
                if (cl.trim() === '```') { break; }
                code += cl + '\n';
            }
            html += `<pre class="codeblock" data-lang="${esc(lang)}"><code>${highlightCode(code.trimEnd(), lang)}</code></pre>`;
            if (inExamples) { exampleExpectTitle = true; }
            continue;
        }

        // ── Function signature ──
        if (line.startsWith('Function:')) {
            const sig = line.slice('Function:'.length).trim();
            html += `<div class="fn-sig"><span class="fn-kw">Function</span> <span class="fn-name">${esc(sig)}</span></div>`;
            continue;
        }

        // ── Section headings ──
        if (line === 'Parameters') {
            inParams = true; inExamples = false;
            html += `<h2 class="sec-h">Parameters</h2>`;
            continue;
        }
        if (line === 'Examples') {
            inExamples = true; inParams = false; exampleExpectTitle = true;
            html += `<h2 class="sec-h">Examples</h2>`;
            continue;
        }
        if (line === 'Properties:') {
            html += `<h4 class="props-h">Properties</h4>`;
            continue;
        }

        // ── Bullet list ──
        if (line.startsWith('•')) {
            const indent0 = rawLine.indexOf('•');
            i--; // back up to re-process
            let listHtml = '<ul class="props">';
            while (i < lines.length) {
                const lr = lines[i];
                const lt = lr.trim();
                if (!lt || lt.startsWith('```') || lt === 'Parameters' || lt === 'Examples') { break; }
                if (lt.startsWith('•')) {
                    i++;
                    const bulletIdx = lr.indexOf('•');
                    const content = lt.slice(1).trim();
                    const nested = bulletIdx > indent0;
                    listHtml += `<li${nested ? ' class="nested"' : ''}>${formatPropLine(content)}</li>`;
                } else if (lr.match(/^ {2,}/) && lt) {
                    i++;
                    // Append continuation to last <li>
                    listHtml = listHtml.slice(0, listHtml.lastIndexOf('</li>'));
                    listHtml += `<div class="cont">${esc(lt)}</div></li>`;
                } else {
                    break;
                }
            }
            listHtml += '</ul>';
            html += listHtml;
            continue;
        }

        // ── Examples section ──
        if (inExamples) {
            // File label: no spaces, has a file extension
            if (!line.includes(' ') && /\.\w+$/.test(line)) {
                html += `<div class="file-label">${esc(line)}</div>`;
                exampleExpectTitle = false;
                continue;
            }
            // First non-empty text after section header or code block = example title
            if (exampleExpectTitle) {
                html += `<h3 class="ex-title">${esc(line)}</h3>`;
                exampleExpectTitle = false;
                continue;
            }
            html += `<p>${esc(line)}</p>`;
            continue;
        }

        // ── Parameters section ──
        if (inParams) {
            // Parameter name: lowercase, no spaces, no colon
            if (!line.includes(' ') && !line.includes(':') && /^[a-z]/.test(line)) {
                html += `<div class="param-name">${esc(line)}</div>`;
                continue;
            }
            // Type name: starts with uppercase, no colon, short
            if (!line.includes(':') && /^[A-Z]/.test(line) && line.length < 40) {
                html += `<div class="type-name">${esc(line)}</div>`;
                continue;
            }
        }

        html += `<p>${esc(line)}</p>`;
    }

    return html;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function styles(): string {
    return `<style>${getSharedPanelStyles()}</style>`;
}
