import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { spawnSdk } from './SdkProcess';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { panelStyles } from './SdkQueryStyles';

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

    const args = ['query', table, '-o', 'json', '--no-count'];
    // now-sdk query requires --query even with no filter (an empty string is
    // accepted; omitting the flag entirely errors with "Missing required
    // argument: query").
    args.push('--query', query ?? '');
    if (fields)       { args.push('--fields', fields); }
    if (limit)        { args.push('--limit', limit); }
    if (offset > 0)   { args.push('--offset', String(offset)); }
    if (displayValue) { args.push('--display-value', displayValue); }

    const proc = spawnSdk(args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8'); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8'); });
    proc.on('close', (code: number | null) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const p = panel!;
        const raw = stdout.trim();
        const combinedOutput = [stderr.trim(), raw].filter(Boolean).join('\n');
        const sdkError = formatSdkQueryError(combinedOutput);
        if (sdkError) {
            p.webview.html = errorHtml(sdkError);
            return;
        }
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
            const prefix = code === 0 ? 'Could not parse response.' : `now-sdk query failed with exit ${code}.`;
            p.webview.html = errorHtml(`${prefix} Raw output: ${raw.slice(0, 300)}`);
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

function formatSdkQueryError(output: string): string | undefined {
    if (/Unknown commands?:\s*query\b/i.test(output) || /Unknown commands?:.*\bquery\b/i.test(output)) {
        return 'The now-sdk query command requires ServiceNow SDK 4.8.0 or newer. Update the now-sdk available to the VS Code/PowerShell environment, then reload VS Code. Verify with: now-sdk --version and now-sdk query --help.';
    }
    return undefined;
}

// ── HTML templates ─────────────────────────────────────────────────────────────

function loadingHtml(table: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${getSharedPanelStyles()}</style></head><body class="nd-transient-panel">
<div class="loading">Querying <strong>${esc(table)}</strong>&hellip;</div>
</body></html>`;
}

function errorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${getSharedPanelStyles()}</style></head><body class="nd-transient-panel">
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
  <div class="view-toggle" role="tablist" aria-label="Query result views">
    <button id="btnTable" class="nd-btn secondary active-view" role="tab" aria-selected="true" aria-controls="view-table">Table</button>
    <button id="btnJson"  class="nd-btn secondary" role="tab" aria-selected="false" aria-controls="view-json" tabindex="-1">JSON</button>
  </div>
</div>
${infoParts.length > 0 ? `<div class="query-info">${infoParts.join(' &middot; ')}</div>` : ''}
${records.length === 0 ? '<div class="loading">No records found.</div>' : ''}

<div id="view-table" role="tabpanel" aria-labelledby="btnTable"${records.length === 0 ? ' style="display:none"' : ''}>
  <div class="table-wrap">${tableHtml}</div>
  ${paginationHtml}
</div>

<div id="view-json" role="tabpanel" aria-labelledby="btnJson" style="display:none" hidden aria-hidden="true">
  <pre class="codeblock" data-lang="json"><code>${jsonHtml}</code></pre>
</div>

<script nonce="${nonce}">
  (function () {
    var vscode = acquireVsCodeApi();
    var btnTable = document.getElementById('btnTable');
    var btnJson  = document.getElementById('btnJson');
    var viewTable = document.getElementById('view-table');
    var viewJson  = document.getElementById('view-json');

    function activateView(view) {
      var tableActive = view === 'table';
      viewTable.style.display = tableActive ? '' : 'none';
      viewJson.style.display  = tableActive ? 'none' : '';
      viewTable.toggleAttribute('hidden', !tableActive);
      viewJson.toggleAttribute('hidden', tableActive);
      viewTable.setAttribute('aria-hidden', String(!tableActive));
      viewJson.setAttribute('aria-hidden', String(tableActive));
      btnTable.classList.toggle('active-view', tableActive);
      btnJson.classList.toggle('active-view', !tableActive);
      btnTable.setAttribute('aria-selected', String(tableActive));
      btnJson.setAttribute('aria-selected', String(!tableActive));
      btnTable.setAttribute('tabindex', tableActive ? '0' : '-1');
      btnJson.setAttribute('tabindex', tableActive ? '-1' : '0');
    }
    btnTable.addEventListener('click', function () { activateView('table'); });
    btnJson.addEventListener('click', function () { activateView('json'); });
    [btnTable, btnJson].forEach(function (btn) {
      btn.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') { return; }
        event.preventDefault();
        var next = btn === btnTable ? btnJson : btnTable;
        if (event.key === 'Home') { next = btnTable; }
        if (event.key === 'End') { next = btnJson; }
        next.focus();
        activateView(next === btnTable ? 'table' : 'json');
      });
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
