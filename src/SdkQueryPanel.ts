import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as crypto from 'crypto';
import { getShell } from './shellConfig';
import { getSharedPanelStyles } from './SharedPanelStyles';

interface QueryParams {
    table: string;
    query: string;
    fields: string;
    limit: string;
    displayValue: string;
    offset: number;
    page: number;
}

interface QueryEnvelope {
    ok: boolean;
    records: Record<string, unknown>[];
    hasMore?: boolean;
    nextOffset?: number;
}

const _panels = new Map<string, vscode.WebviewPanel>();

// Stores the most-recent query params for each open panel (keyed by table).
// The onDidReceiveMessage handler reads from here so pagination always uses
// the latest params, even after the user re-queries the same table.
const _currentParams = new Map<string, { query: string; fields: string; limit: string; displayValue: string }>();

export function showSdkQueryPanel(
    table: string,
    query: string,
    fields: string,
    limit: string,
    displayValue: string,
    offset: number = 0,
    page: number = 1
): void {
    const key = table.toLowerCase();

    // Always update stored params so pagination picks up the current values.
    _currentParams.set(key, { query, fields, limit, displayValue });

    let panel = _panels.get(key);
    if (!panel) {
        panel = vscode.window.createWebviewPanel(
            'nowdev.sdkQuery',
            `${table} — Query Results`,
            { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
            { enableScripts: true, localResourceRoots: [], retainContextWhenHidden: true }
        );
        _panels.set(key, panel);
        panel.onDidDispose(() => { _panels.delete(key); _currentParams.delete(key); });
        panel.webview.onDidReceiveMessage((msg: { command: string; offset: number; page: number }) => {
            if (msg.command === 'nextPage' || msg.command === 'prevPage') {
                const p = _currentParams.get(key) ?? { query, fields, limit, displayValue };
                showSdkQueryPanel(table, p.query, p.fields, p.limit, p.displayValue, msg.offset, msg.page);
            }
        });
    } else {
        panel.reveal(undefined, false);
    }

    if (!/^[\w.]+$/.test(table)) {
        panel.webview.html = errorHtml('Invalid table name. Names may only contain letters, digits, dots, and underscores.');
        return;
    }

    const params: QueryParams = { table, query, fields, limit, displayValue, offset, page };
    panel.webview.html = loadingHtml(table);

    const args = ['query', table, '-o', 'json'];
    if (query)        { args.push('--query', query); }
    if (fields)       { args.push('--fields', fields); }
    if (limit)        { args.push('--limit', limit); }
    if (offset > 0)   { args.push('--offset', String(offset)); }
    if (displayValue) { args.push('--display-value', displayValue); }

    const proc = cp.spawn('now-sdk', args, { timeout: 30000, shell: getShell() });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8'); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8'); });
    proc.on('close', () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const p = panel!;
        const raw = stdout.trim();
        if (!raw) {
            p.webview.html = errorHtml(stderr.trim() || 'No output from now-sdk. Make sure it is installed and you are authenticated.');
            return;
        }
        // Strip any leading log lines (e.g. "[now-sdk] Access Token has expired, refreshing token")
        // that the CLI emits before the JSON envelope.
        const jsonStart = raw.indexOf('{');
        let envelope: QueryEnvelope;
        try {
            envelope = JSON.parse(jsonStart > 0 ? raw.slice(jsonStart) : raw) as QueryEnvelope;
        } catch {
            p.webview.html = errorHtml(`Could not parse response. Raw output: ${esc(raw.slice(0, 300))}`);
            return;
        }
        if (!envelope.ok) {
            p.webview.html = errorHtml(stderr.trim() || 'Query returned ok: false. Check your query syntax and authentication.');
            return;
        }
        p.webview.html = renderHtml(params, envelope);
    });
    proc.on('error', () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        panel!.webview.html = errorHtml('Failed to run now-sdk. Make sure it is installed and accessible.');
    });
}

// ── HTML templates ─────────────────────────────────────────────────────────────

function loadingHtml(table: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${getSharedPanelStyles()}</style></head><body>
<div class="loading">Querying <strong>${esc(table)}</strong>&hellip;</div>
</body></html>`;
}

function errorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${getSharedPanelStyles()}</style></head><body>
<div class="error-msg">${esc(msg)}</div>
</body></html>`;
}

function renderHtml(params: QueryParams, envelope: QueryEnvelope): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    const records = envelope.records ?? [];
    const hasMore = !!envelope.hasMore;
    const nextOffset = envelope.nextOffset ?? 0;
    const nextPage = params.page + 1;
    const hasPrev = params.page > 1;
    const prevOffset = Math.max(0, params.offset - (parseInt(params.limit) || 100));
    const prevPage = params.page - 1;

    const columns = records.length > 0 ? Object.keys(records[0]) : [];

    const infoParts: string[] = [];
    if (params.query)       { infoParts.push(esc(params.query)); }
    if (params.fields)      { infoParts.push(`fields: ${esc(params.fields)}`); }
    if (params.displayValue && params.displayValue !== 'false') {
        infoParts.push(`display-value: ${params.displayValue}`);
    }

    const tableHtml  = columns.length > 0 ? renderTable(columns, records) : '';
    const jsonText   = JSON.stringify(records, null, 2);
    const jsonHtml   = highlightJson(jsonText);
    const pageLabel  = params.page > 1 ? `<span class="tag nd-pill neutral">Page ${params.page}</span>` : '';
    const countLabel = `<span class="tag">${records.length} record${records.length !== 1 ? 's' : ''}${hasMore ? '+' : ''}</span>`;

    const hasPagination = hasPrev || hasMore;
    const paginationHtml = hasPagination ? `
<div class="pagination">
  ${hasPrev  ? `<button id="btnPrevPage" class="nd-btn secondary">← Prev Page</button>` : ''}
  ${hasMore  ? `<button id="btnNextPage" class="nd-btn secondary">Next Page →</button>` : ''}
  <span class="page-hint">offset ${params.offset}</span>
</div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
${getSharedPanelStyles()}
${panelStyles()}
</style>
</head>
<body>
<div class="qr-header">
  <div class="api-header" style="margin:0;flex:1">
    <div class="api-id">${esc(params.table)}</div>
    <div class="api-tags">${countLabel}${pageLabel}</div>
  </div>
  <div class="view-toggle">
    <button id="btnTable" class="nd-btn secondary active-view">Table</button>
    <button id="btnJson"  class="nd-btn secondary">JSON</button>
  </div>
</div>
${infoParts.length > 0 ? `<div class="query-info">${infoParts.join(' &middot; ')}</div>` : ''}
${records.length === 0 ? '<div class="loading">No records found.</div>' : ''}

<div id="view-table"${records.length === 0 ? ' style="display:none"' : ''}>
  <div class="table-wrap">${tableHtml}</div>
  ${paginationHtml}
</div>

<div id="view-json" style="display:none">
  <pre class="codeblock" data-lang="json"><code>${jsonHtml}</code></pre>
</div>

<script nonce="${nonce}">
  (function () {
    var vscode = acquireVsCodeApi();
    var btnTable = document.getElementById('btnTable');
    var btnJson  = document.getElementById('btnJson');
    var viewTable = document.getElementById('view-table');
    var viewJson  = document.getElementById('view-json');

    btnTable.addEventListener('click', function () {
      viewTable.style.display = '';
      viewJson.style.display  = 'none';
      btnTable.classList.add('active-view');
      btnJson.classList.remove('active-view');
    });
    btnJson.addEventListener('click', function () {
      viewTable.style.display = 'none';
      viewJson.style.display  = '';
      btnTable.classList.remove('active-view');
      btnJson.classList.add('active-view');
    });

    var btnNext = document.getElementById('btnNextPage');
    var btnPrev = document.getElementById('btnPrevPage');
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        vscode.postMessage({ command: 'nextPage', offset: ${nextOffset}, page: ${nextPage} });
      });
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        vscode.postMessage({ command: 'prevPage', offset: ${prevOffset}, page: ${prevPage} });
      });
    }

  })();
</script>
</body>
</html>`;
}

// ── Table renderer ─────────────────────────────────────────────────────────────

function renderTable(columns: string[], records: Record<string, unknown>[]): string {
    const headers = columns.map((c, i) =>
        `<th>${esc(c)}</th>`
    ).join('');
    const rows = records.map(r => {
        const cells = columns.map(c => {
            const val = String(r[c] ?? '');
            const display = val.length > 100 ? val.slice(0, 100) + '…' : val;
            return `<td title="${esc(val)}">${esc(display)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

// ── JSON syntax highlighter ────────────────────────────────────────────────────

function highlightJson(src: string): string {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const ch = src[i];

        if (ch === '"') {
            let j = i + 1;
            while (j < src.length && src[j] !== '"') {
                if (src[j] === '\\') { j++; }
                j++;
            }
            const raw = src.slice(i, j + 1);
            let k = j + 1;
            while (k < src.length && (src[k] === ' ' || src[k] === '\t')) { k++; }
            if (src[k] === ':') {
                out += `<span class="hl-fn">${escStr(raw)}</span>`;
            } else {
                out += `<span class="hl-str">${escStr(raw)}</span>`;
            }
            i = j + 1;
            continue;
        }

        if ((ch >= '0' && ch <= '9') || (ch === '-' && i + 1 < src.length && src[i + 1] >= '0' && src[i + 1] <= '9')) {
            let j = i;
            if (src[j] === '-') { j++; }
            while (j < src.length && /[\d.eE+\-]/.test(src[j])) { j++; }
            out += `<span class="hl-num">${escStr(src.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        if (src.startsWith('true', i))  { out += '<span class="hl-kw">true</span>';  i += 4; continue; }
        if (src.startsWith('false', i)) { out += '<span class="hl-kw">false</span>'; i += 5; continue; }
        if (src.startsWith('null', i))  { out += '<span class="hl-kw">null</span>';  i += 4; continue; }

        out += escRaw(ch);
        i++;
    }
    return out;
}

// ── Escaping helpers ───────────────────────────────────────────────────────────

function esc(s: string): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escStr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escRaw(ch: string): string {
    if (ch === '&') { return '&amp;'; }
    if (ch === '<') { return '&lt;'; }
    if (ch === '>') { return '&gt;'; }
    if (ch === '"') { return '&quot;'; }
    return ch;
}

// ── Additional panel styles ────────────────────────────────────────────────────

function panelStyles(): string {
    return `
/* ── Header bar ───────────────────────────────────────────────────── */
.qr-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--nd-sp-3);
    gap: var(--nd-sp-4);
}
.view-toggle {
    display: flex;
    gap: var(--nd-sp-1);
    flex-shrink: 0;
    padding-top: 2px;
}
.nd-btn.active-view {
    background: rgba(129,181,161,0.12);
    border-color: var(--nd-accent);
    color: var(--nd-accent-hi);
}

/* ── Query info pill ───────────────────────────────────────────────── */
.query-info {
    font-family: var(--nd-font-mono);
    font-size: 11px;
    color: var(--nd-fg-mute);
    margin-bottom: var(--nd-sp-4);
    padding: 5px var(--nd-sp-3);
    background: var(--nd-bg-soft);
    border-left: 2px solid var(--nd-border-strong);
    border-radius: 0 var(--nd-r-sm) var(--nd-r-sm) 0;
}

/* ── Table container ───────────────────────────────────────────────── */
.table-wrap {
    overflow-x: auto;
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    margin-bottom: var(--nd-sp-3);
    box-shadow: var(--nd-shadow-1);
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

/* ── Header ─────────────────────────────────────────────────────────── */
thead {
    position: sticky;
    top: 0;
    z-index: 2;
}
thead tr {
    background: rgba(129,181,161,0.07);
    border-bottom: 2px solid var(--nd-border);
}
th {
    padding: 10px var(--nd-sp-4);
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--nd-fg-mute);
    white-space: nowrap;
    background: rgba(129,181,161,0.07);
    border-right: 1px solid var(--nd-border-soft);
    transition: background 0.12s, color 0.12s;
}
th:last-child { border-right: none; }

/* ── Body rows — zebra striping ─────────────────────────────────────── */
tbody tr {
    transition: background 0.08s;
}
tbody tr:nth-child(even) td {
    background: rgba(255,255,255,0.028);
}
tbody tr:hover td {
    background: rgba(129,181,161,0.075) !important;
}

/* ── Cells ──────────────────────────────────────────────────────────── */
td {
    padding: 7px var(--nd-sp-4);
    border-bottom: 1px solid var(--nd-border-soft);
    border-right: 1px solid rgba(255,255,255,0.04);
    font-family: var(--nd-font-mono);
    font-size: 11.5px;
    color: var(--nd-fg-strong);
    max-width: 340px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
td:last-child { border-right: none; }
tbody tr:last-child td { border-bottom: none; }

/* Empty cell — visually quiet */
td:empty::after { content: '—'; color: var(--nd-fg-mute); opacity: 0.4; }

/* ── Pagination bar ─────────────────────────────────────────────────── */
.pagination {
    display: flex;
    align-items: center;
    gap: var(--nd-sp-2);
    margin-top: var(--nd-sp-3);
    margin-bottom: var(--nd-sp-5);
}
.page-hint {
    font-size: 11px;
    color: var(--nd-fg-mute);
    font-family: var(--nd-font-mono);
    margin-left: var(--nd-sp-1);
}
`;
}
