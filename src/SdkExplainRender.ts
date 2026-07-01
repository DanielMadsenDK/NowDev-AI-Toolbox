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

export function esc(s: string): string {
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
