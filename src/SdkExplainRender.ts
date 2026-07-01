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
    // Language info strings can carry extra words (e.g. "ts fluent", "typescript fluent") —
    // only the first token identifies the language.
    const l = lang.toLowerCase().split(/\s+/)[0];
    if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') {
        return tokenizeJs(raw);
    }
    return escStr(raw);
}

// ── Output parser ──────────────────────────────────────────────────────────────

export function esc(s: string): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatPropLine(line: string): string {
    // Bare URL (e.g. the "See" section's reference links) — don't split on its colon
    if (/^https?:\/\//.test(line)) {
        return `<a href="${esc(line)}">${esc(line)}</a>`;
    }
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

// Renders a parameter's own type expression (e.g. `Acl<keyof Tables, 'record' | 'processor' | string>`)
// as a code-styled line, highlighting quoted union members so long enum lists read like code.
function formatTypeExpr(line: string): string {
    return esc(line).replace(/'[^']*'/g, m => `<span class="hl-str">${m}</span>`);
}

function isTableSeparatorRow(line: string): boolean {
    return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
    let s = line.trim();
    if (s.startsWith('|')) { s = s.slice(1); }
    if (s.endsWith('|')) { s = s.slice(0, -1); }
    return s.split('|').map(c => c.trim());
}

export function convertToHtml(raw: string): string {
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
    // -1 = no active param context; 0 = next line is the param's type; 1 = next line is its description
    let paramLineIndex = -1;

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

        // ── Markdown table (leaks through verbatim from guide docs) ──
        if (line.startsWith('|') && i < lines.length && isTableSeparatorRow(lines[i])) {
            const headerCells = parseTableRow(line);
            i++; // skip the "|---|---|" separator row
            const rows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                rows.push(parseTableRow(lines[i]));
                i++;
            }
            html += '<table class="nd-table"><thead><tr>'
                + headerCells.map(c => `<th>${esc(c)}</th>`).join('')
                + '</tr></thead><tbody>'
                + rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('')
                + '</tbody></table>';
            continue;
        }

        // ── Blockquote callout ──
        if (line.startsWith('>')) {
            const parts = [line.replace(/^>\s?/, '')];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                parts.push(lines[i].trim().replace(/^>\s?/, ''));
                i++;
            }
            html += `<div class="nd-callout">${esc(parts.join(' '))}</div>`;
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
            inParams = true; inExamples = false; paramLineIndex = -1;
            html += `<h2 class="sec-h">Parameters</h2>`;
            continue;
        }
        if (line === 'Examples') {
            inExamples = true; inParams = false; exampleExpectTitle = true;
            html += `<h2 class="sec-h">Examples</h2>`;
            continue;
        }
        if (line === 'Signature' || line === 'Usage' || line === 'See') {
            inParams = false; inExamples = false;
            html += `<h2 class="sec-h">${esc(line)}</h2>`;
            continue;
        }
        if (line === 'Properties:') {
            html += `<h4 class="props-h">Properties</h4>`;
            continue;
        }
        if (line === 'Variant Properties:') {
            html += `<h4 class="props-h">Variant Properties</h4>`;
            continue;
        }
        if (/^(When .+:|Otherwise:)$/.test(line)) {
            html += `<div class="variant-cond">${esc(line)}</div>`;
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
                if (!lt) { i++; continue; } // blank lines separate properties but don't end the list
                if (lt.startsWith('```') || lt === 'Parameters' || lt === 'Examples'
                    || lt === 'Properties:' || lt === 'Variant Properties:'
                    || /^(When .+:|Otherwise:)$/.test(lt)) {
                    break;
                }
                if (lt.startsWith('•')) {
                    i++;
                    const bulletIdx = lr.indexOf('•');
                    const content = lt.slice(1).trim();
                    const nested = bulletIdx > indent0;
                    listHtml += `<li${nested ? ' class="nested"' : ''}>${formatPropLine(content)}</li>`;
                } else if (lr.match(/^ {2,}/)) {
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

        // ── Parameters section: name → type → description, in fixed order ──
        if (inParams) {
            if (paramLineIndex === 0) {
                html += `<div class="type-expr">${formatTypeExpr(line)}</div>`;
                paramLineIndex = 1;
                continue;
            }
            if (paramLineIndex === 1) {
                html += `<p class="param-desc">${esc(line)}</p>`;
                paramLineIndex = 2;
                continue;
            }
            // Bare identifier with no active param context = a new top-level parameter name
            if (/^[$a-zA-Z_][\w$]*$/.test(line)) {
                html += `<div class="param-name">${esc(line)}</div>`;
                paramLineIndex = 0;
                continue;
            }
        }

        html += `<p>${esc(line)}</p>`;
    }

    return html;
}
