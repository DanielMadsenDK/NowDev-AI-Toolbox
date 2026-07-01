import * as vscode from 'vscode';
import { spawnSdk } from './SdkProcess';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { convertToHtml, esc } from './SdkExplainRender';

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
        { enableScripts: false, enableCommandUris: true, localResourceRoots: [], retainContextWhenHidden: true }
    );

    _panels.set(key, panel);
    panel.onDidDispose(() => _panels.delete(key));

    // Reject input that contains shell metacharacters — API names are identifiers only
    if (!/^[\w.-]+$/.test(apiName)) {
        panel.webview.html = errorHtml(`Invalid API name. Names may only contain letters, digits, dots, underscores, and hyphens.`);
        return;
    }

    panel.webview.html = loadingHtml(apiName);

    const proc = spawnSdk(['explain', apiName], { timeout: 15000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8'); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8'); });
    proc.on('close', () => {
        const output = (stdout || stderr || '').trim();
        if (!output) {
            panel.webview.html = errorHtml(`No documentation found for "${apiName}". Check that the API name is correct and now-sdk is installed.`);
            return;
        }

        // Detect "Multiple matching topics" disambiguation output
        const topics = parseMultipleTopics(output);
        if (topics) {
            panel.webview.html = multipleTopicsHtml(apiName, topics);
            return;
        }

        panel.webview.html = renderHtml(apiName, output);
    });
    proc.on('error', () => {
        panel.webview.html = errorHtml(`Failed to run now-sdk. Make sure it is installed and accessible.`);
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
                `<li><div class="param-name"><a href="${explainCommandUri(t.name)}">${esc(t.name)}</a></div><div class="cont">${esc(t.desc)}</div></li>`
    ).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">${styles()}</head><body>
<div class="api-header">
  <div class="api-id">${esc(apiName)}</div>
  <div class="api-tags"><span class="tag">Multiple Matches</span></div>
</div>
<h2 class="sec-h">Multiple matching topics</h2>
<p style="margin:0 0 14px;color:var(--vscode-descriptionForeground,#888);font-size:12px;">
    Click a topic below to open its documentation directly.
</p>
<ul class="props">${items}</ul>
</body></html>`;
}

function explainCommandUri(topicName: string): string {
        const args = encodeURIComponent(JSON.stringify([topicName]));
        return `command:nowdev-ai-toolbox.sdkExplain?${args}`;
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

// ── Styles ─────────────────────────────────────────────────────────────────────

function styles(): string {
    return `<style>${getSharedPanelStyles()}</style>`;
}
