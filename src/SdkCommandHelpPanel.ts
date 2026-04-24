import * as vscode from 'vscode';
import * as cp from 'child_process';
import { getShell } from './shellConfig';

const _panels = new Map<string, vscode.WebviewPanel>();

/**
 * Opens (or reveals) a webview panel showing nicely formatted CLI help
 * for a ServiceNow SDK command by running `now-sdk <command> --help`
 * and rendering the output as HTML with the same style as SdkExplainPanel.
 */
export function showSdkCommandHelpPanel(command: string): void {
    const key = `cmd:${command}`;

    const existing = _panels.get(key);
    if (existing) {
        existing.reveal(undefined, true);
        return;
    }

    const label = capitalize(command);
    const panel = vscode.window.createWebviewPanel(
        'nowdev.sdkCommandHelp',
        `${label} — SDK Command`,
        { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
        { enableScripts: false, localResourceRoots: [], retainContextWhenHidden: true }
    );

    _panels.set(key, panel);
    panel.onDidDispose(() => _panels.delete(key));
    panel.webview.html = loadingHtml(label);

    cp.exec(`now-sdk ${command} --help`, { timeout: 10000, encoding: 'utf-8', shell: getShell() }, (_err, stdout, stderr) => {
        // Commander.js sends --help to stdout; some CLIs use stderr
        const output = String(stdout || stderr || '').trim();
        if (!output) {
            panel.webview.html = errorHtml(`No help available for "now-sdk ${command}". Make sure now-sdk is installed and accessible.`);
            return;
        }
        panel.webview.html = renderHtml(label, command, output);
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── HTML templates ─────────────────────────────────────────────────────────────

function loadingHtml(label: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="loading">Loading help for <strong>${esc(label)}</strong>&hellip;</div>
</body></html>`;
}

function errorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="error-msg">${esc(msg)}</div>
</body></html>`;
}

function renderHtml(label: string, command: string, raw: string): string {
    const body = convertToHtml(label, command, raw);
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

// ── Output parser ──────────────────────────────────────────────────────────────

function esc(s: string): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Yargs-aware parser ────────────────────────────────────────────────────────

interface ParsedOption {
    flags: string;
    desc: string;
    type: string;
    defaultVal: string;
}

function isSectionHeader(t: string): boolean {
    // Matches "Options:", "Parameters:", "Commands:", "Arguments:" at column 0
    return /^[A-Z][a-zA-Z ]+:$/.test(t);
}

/**
 * Collect yargs-formatted option rows within a section.
 *
 * Yargs indents option lines 2-8 spaces and starts them with - or a word.
 * Continuation lines (wrapped description or right-aligned type annotations)
 * have more indentation and do not start with a flag pattern.
 * Type annotations appear as [boolean], [string], etc.; defaults as [default: x].
 */
function collectItems(lines: string[], startI: number): { items: ParsedOption[]; nextI: number } {
    interface RawItem { flags: string; descLines: string[] }
    const raws: RawItem[] = [];
    let current: RawItem | null = null;
    let i = startI;

    const flush = () => { if (current) { raws.push(current); current = null; } };

    while (i < lines.length) {
        const raw = lines[i]; i++;
        const t = raw.trim();
        if (!t) {
            const next = lines.slice(i).find(l => l.trim());
            if (!next || isSectionHeader(next.trim())) { flush(); break; }
            continue;
        }
        if (isSectionHeader(t)) { i--; flush(); break; }

        const indent = raw.search(/\S/);
        // New item: 2-10 leading spaces, starts with - (flag) or lowercase/digit (positional)
        if (indent >= 2 && indent <= 10 && /^(-|[a-z0-9])/.test(t)) {
            flush();
            // Split at the first 2+ space gap: left = flag(s), right = start of description
            const splitM = t.match(/^(.+?)\s{2,}(.*)/);
            if (splitM) {
                current = { flags: splitM[1].trim(), descLines: splitM[2] ? [splitM[2].trim()] : [] };
            } else {
                current = { flags: t, descLines: [] };
            }
        } else if (current) {
            current.descLines.push(t);
        } else {
            raws.push({ flags: t, descLines: [] });
        }
    }
    flush();

    const items: ParsedOption[] = raws.map(r => {
        let fullDesc = r.descLines.join(' ').replace(/\s+/g, ' ').trim();
        let type = '';
        let defaultVal = '';
        const tm = fullDesc.match(/\[(boolean|string|number|array|count)\]/i);
        if (tm) { type = tm[1].toLowerCase(); fullDesc = fullDesc.replace(tm[0], '').trim(); }
        const dm = fullDesc.match(/\[default:\s*([^\]]+)\]/);
        if (dm) { defaultVal = dm[1].trim(); fullDesc = fullDesc.replace(dm[0], '').trim(); }
        return { flags: r.flags, desc: fullDesc.replace(/\s+/g, ' ').trim(), type, defaultVal };
    });

    return { items, nextI: i };
}

function renderItem(item: ParsedOption): string {
    const flagsHtml = esc(item.flags)
        .replace(/(--?[\w-]+)/g, '<span class="pname">$1</span>')
        .replace(/(&lt;[\w-]+&gt;)/g, '<span class="ptype">$1</span>')
        .replace(/(\[(?!default)[\w|]+\])/g, '<span class="opt">$1</span>');

    let html = `<span class="flag-sig">${flagsHtml}</span>`;
    if (item.desc) {
        html += `<span class="item-desc">${esc(item.desc)}</span>`;
    }
    const metaParts: string[] = [];
    if (item.type) { metaParts.push(`<span class="type-badge">${esc(item.type)}</span>`); }
    if (item.defaultVal) { metaParts.push(`<span class="default-badge">default: ${esc(item.defaultVal)}</span>`); }
    if (metaParts.length) { html += `<div class="item-meta">${metaParts.join('')}</div>`; }
    return html;
}

function convertToHtml(label: string, command: string, raw: string): string {
    const lines = raw.split(/\r?\n/);
    let i = 0;
    let html = '';

    // ── Header block ──────────────────────────────────────────────
    html += `<div class="api-header">`;
    html += `<div class="api-id">now-sdk ${esc(command)}</div>`;
    html += `<div class="api-tags"><span class="tag">CLI Command</span><span class="tag">${esc(label)}</span></div>`;
    html += `</div>`;

    // Skip leading blank lines
    while (i < lines.length && !lines[i].trim()) { i++; }

    // ── First non-blank line = usage signature (yargs has no "Usage:" prefix) ──
    if (i < lines.length) {
        const sig = lines[i].trim();
        if (sig && !isSectionHeader(sig)) {
            html += `<div class="fn-sig"><span class="fn-kw">Usage</span> <span class="fn-name">${esc(sig)}</span></div>`;
            i++;
        }
    }

    // ── Description: lines until first section header ─────────────
    let desc = '';
    while (i < lines.length) {
        const t = lines[i].trim();
        if (isSectionHeader(t)) { break; }
        if (t) { desc += (desc ? ' ' : '') + t; }
        i++;
    }
    if (desc) {
        html += `<p class="cmd-desc">${esc(desc)}</p>`;
    }

    // ── Sections ──────────────────────────────────────────────────
    while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) { i++; continue; }

        if (isSectionHeader(t)) {
            const title = t.replace(/:$/, '');
            html += `<h2 class="sec-h">${esc(title)}</h2>`;
            i++;
            const { items, nextI } = collectItems(lines, i);
            i = nextI;
            if (items.length > 0) {
                html += '<ul class="props">';
                for (const item of items) {
                    html += `<li>${renderItem(item)}</li>`;
                }
                html += '</ul>';
            }
            continue;
        }

        html += `<p>${esc(t)}</p>`;
        i++;
    }

    return html;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function styles(): string {
    return `<style>
:root { color-scheme: dark light; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-editor-foreground, #ccc);
    background: var(--vscode-editor-background, #1e1e1e);
    padding: 28px 40px;
    max-width: 880px;
    line-height: 1.65;
}
.api-header {
    padding: 14px 18px;
    border-left: 3px solid var(--vscode-textLink-foreground, #4ec9b0);
    background: var(--vscode-editorWidget-background, rgba(255,255,255,0.04));
    border-radius: 0 5px 5px 0;
    margin-bottom: 24px;
}
.api-id {
    font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
    color: var(--vscode-descriptionForeground, #888);
    font-family: var(--vscode-editor-font-family, monospace);
    margin-bottom: 8px;
}
.api-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag {
    font-size: 11px; padding: 2px 8px; border-radius: 10px;
    background: var(--vscode-badge-background, #444);
    color: var(--vscode-badge-foreground, #ddd);
}
.fn-sig {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 14px;
    padding: 10px 14px;
    background: var(--vscode-textCodeBlock-background, rgba(255,255,255,0.05));
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    border-radius: 4px;
    margin: 14px 0 16px;
}
.fn-kw { color: var(--vscode-symbolIcon-keywordForeground, #c586c0); }
.fn-name { color: var(--vscode-symbolIcon-functionForeground, #dcdcaa); font-weight: 700; }
h2.sec-h {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: var(--vscode-descriptionForeground, #888);
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.12));
    padding-bottom: 5px;
    margin: 28px 0 14px;
}
.cmd-desc {
    font-size: 13px;
    color: var(--vscode-editor-foreground, #ccc);
    margin: 10px 0 6px;
}
p { margin: 6px 0; }
ul.props { list-style: none; padding: 0; margin: 6px 0 10px 0; }
ul.props li {
    padding: 6px 0 6px 14px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06));
    font-size: 12px;
    position: relative;
    line-height: 1.5;
}
ul.props li:last-child { border-bottom: none; }
ul.props li::before {
    content: "▸"; position: absolute; left: 0;
    color: var(--vscode-textLink-foreground, #4ec9b0);
    font-size: 9px; top: 9px;
}
.flag-sig {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px;
    display: block;
    color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
}
.pname { color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe); font-weight: 600; }
.ptype { color: var(--vscode-symbolIcon-typeParameterForeground, #b5cea8); }
.opt { font-size: 10px; color: var(--vscode-descriptionForeground, #888); }
.item-desc {
    display: block;
    font-size: 12px;
    color: var(--vscode-editor-foreground, #ccc);
    margin-top: 2px;
    font-family: var(--vscode-font-family, sans-serif);
}
.item-meta {
    display: flex;
    gap: 5px;
    margin-top: 4px;
    flex-wrap: wrap;
}
.type-badge {
    font-size: 10px; font-family: var(--vscode-editor-font-family, monospace);
    padding: 1px 6px; border-radius: 3px;
    background: rgba(78,201,176,0.15);
    color: var(--vscode-textLink-foreground, #4ec9b0);
    border: 1px solid rgba(78,201,176,0.3);
}
.default-badge {
    font-size: 10px; font-family: var(--vscode-editor-font-family, monospace);
    padding: 1px 6px; border-radius: 3px;
    background: var(--vscode-textCodeBlock-background, rgba(255,255,255,0.04));
    color: var(--vscode-descriptionForeground, #888);
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
}
pre.codeblock {
    background: var(--vscode-textCodeBlock-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    border-radius: 4px; padding: 12px 16px; overflow-x: auto;
    margin: 6px 0 14px; position: relative;
}
pre.codeblock code {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px; color: var(--vscode-editor-foreground, #d4d4d4);
    white-space: pre; display: block;
}
.loading, .error-msg { padding: 32px 0; font-size: 13px; }
.error-msg { color: var(--vscode-errorForeground, #f48771); }
</style>`;
}
