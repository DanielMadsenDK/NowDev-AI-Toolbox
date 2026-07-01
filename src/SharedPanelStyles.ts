/**
 * Shared design tokens & component styles for editor-area webview panels.
 *
 * Every panel (Agent Topology, SDK Explain, SDK Command Help) injects
 * this into its inline <style> block so all surfaces share one design language.
 *
 * Sidebar uses media/webview/styles/*.css — keep token sets in sync with those files.
 */
export function getSharedPanelStyles(): string {
    return `
:root {
    color-scheme: dark light;

    /* ── Brand ─────────────────────────────────────────────────── */
    --nd-accent:        #81B5A1;
    --nd-accent-hi:     #a8d4c4;
    --nd-accent-lo:     #5a8a78;
    --nd-highlight:     #CDDC39;

    /* ── Surfaces (lean on VS Code tokens, with sane fallbacks) ── */
    --nd-bg:            var(--vscode-editor-background, #1e1e1e);
    --nd-bg-soft:       var(--vscode-editorWidget-background, rgba(255,255,255,0.03));
    --nd-bg-card:       var(--vscode-sideBar-background, rgba(255,255,255,0.025));
    --nd-bg-elevated:   color-mix(in srgb, var(--vscode-editor-background, #1e1e1e) 86%, var(--nd-accent) 14%);
    --nd-bg-code:       var(--vscode-textCodeBlock-background, rgba(255,255,255,0.04));
    --nd-bg-input:      var(--vscode-input-background, rgba(255,255,255,0.04));

    --nd-border:        var(--vscode-panel-border, rgba(255,255,255,0.10));
    --nd-border-soft:   var(--vscode-widget-border, rgba(255,255,255,0.06));
    --nd-border-strong: rgba(129,181,161,0.45);

    --nd-fg:            var(--vscode-foreground, #cdd6f4);
    --nd-fg-mute:       var(--vscode-descriptionForeground, #8a8a8a);
    --nd-fg-strong:     var(--vscode-editor-foreground, #e2e8f0);

    --nd-link:          var(--vscode-textLink-foreground, var(--nd-accent));
    --nd-link-hi:       var(--vscode-textLink-activeForeground, var(--nd-accent-hi));

    /* ── Status ─────────────────────────────────────────────────── */
    --nd-success:       var(--vscode-testing-iconPassed, #4ec98b);
    --nd-warning:       var(--vscode-editorWarning-foreground, #e2b73b);
    --nd-danger:        var(--vscode-testing-iconFailed, #f14c4c);
    --nd-info:          var(--nd-accent);

    /* ── Spacing scale (4-pt rhythm) ────────────────────────────── */
    --nd-sp-1: 4px;
    --nd-sp-2: 8px;
    --nd-sp-3: 12px;
    --nd-sp-4: 16px;
    --nd-sp-5: 20px;
    --nd-sp-6: 24px;
    --nd-sp-8: 32px;

    /* ── Radii ─────────────────────────────────────────────────── */
    --nd-r-sm:  4px;
    --nd-r-md:  6px;
    --nd-r-lg: 10px;
    --nd-r-pill: 999px;

    /* ── Shadows ───────────────────────────────────────────────── */
    --nd-shadow-1: 0 1px 2px rgba(0,0,0,0.18);
    --nd-shadow-2: 0 4px 14px rgba(0,0,0,0.28);
    --nd-shadow-glow: 0 0 0 1px rgba(129,181,161,0.25), 0 4px 18px rgba(129,181,161,0.18);

    /* ── Type ──────────────────────────────────────────────────── */
    --nd-font:      var(--vscode-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
    --nd-font-mono: var(--vscode-editor-font-family, "Cascadia Code", Menlo, Consolas, monospace);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
    min-height: 100%;
    background: var(--nd-bg);
}

body {
    font-family: var(--nd-font);
    font-size: 13px;
    line-height: 1.6;
    color: var(--nd-fg);
    background: linear-gradient(180deg, color-mix(in srgb, var(--nd-bg) 92%, var(--nd-accent) 8%) 0, var(--nd-bg) 180px);
    padding: var(--nd-sp-8) clamp(20px, 6vw, 56px) var(--nd-sp-8);
    max-width: 1080px;
    margin: 0 auto;
}

body.nd-transient-panel {
    min-height: 100vh;
    max-width: none;
    margin: 0;
    background: var(--nd-bg);
    padding: var(--nd-sp-8) clamp(20px, 7vw, 64px);
}

button:focus-visible,
select:focus-visible,
input:focus-visible,
textarea:focus-visible,
a:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--nd-accent) 72%, transparent);
    outline-offset: 2px;
}

/* ── Headings ─────────────────────────────────────────────────── */
.nd-eyebrow,
h2.sec-h, h2.nd-sec-h {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--nd-fg-mute);
    border-bottom: 1px solid var(--nd-border);
    padding-bottom: var(--nd-sp-2);
    margin: var(--nd-sp-6) 0 var(--nd-sp-3);
}

/* ── Cards & surfaces ─────────────────────────────────────────── */
.nd-card {
    background: color-mix(in srgb, var(--nd-bg-card) 92%, var(--nd-accent) 8%);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    padding: var(--nd-sp-3) var(--nd-sp-4);
    transition: border-color 0.15s, box-shadow 0.15s;
}
.nd-card:hover {
    border-color: var(--nd-border-strong);
    box-shadow: var(--nd-shadow-1);
}

.nd-callout {
    padding: var(--nd-sp-3) var(--nd-sp-4);
    border-left: 3px solid var(--nd-accent);
    background: var(--nd-bg-elevated);
    border-radius: 0 var(--nd-r-sm) var(--nd-r-sm) 0;
    margin-bottom: var(--nd-sp-5);
}

/* ── Pills / badges / tags ────────────────────────────────────── */
.tag, .nd-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--nd-sp-1);
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: var(--nd-r-pill);
    background: rgba(129,181,161,0.10);
    color: var(--nd-accent-hi);
    border: 1px solid rgba(129,181,161,0.28);
    letter-spacing: 0.02em;
    line-height: 1.4;
}
.nd-pill.neutral {
    background: var(--vscode-badge-background, rgba(255,255,255,0.08));
    color:      var(--vscode-badge-foreground, var(--nd-fg-mute));
    border-color: var(--nd-border);
}
.nd-pill.success { background: rgba(78,201,139,0.12); color: var(--nd-success); border-color: rgba(78,201,139,0.32); }
.nd-pill.warning { background: rgba(226,183,59,0.12); color: var(--nd-warning); border-color: rgba(226,183,59,0.32); }
.nd-pill.danger  { background: rgba(241,76,76,0.12);  color: var(--nd-danger);  border-color: rgba(241,76,76,0.32); }

/* ── Buttons ──────────────────────────────────────────────────── */
.nd-btn, .dismiss-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--nd-sp-2);
    font-family: var(--nd-font);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: var(--nd-r-sm);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    line-height: 1.4;
}
.nd-btn.primary, .dismiss-btn {
    background: var(--vscode-button-background);
    color:      var(--vscode-button-foreground);
}
.nd-btn.primary:hover, .dismiss-btn:hover {
    background: var(--vscode-button-hoverBackground);
}
.nd-btn.secondary {
    background: transparent;
    color: var(--nd-fg);
    border-color: var(--nd-border);
}
.nd-btn.secondary:hover {
    background: var(--nd-bg-soft);
    border-color: var(--nd-accent);
    color: var(--nd-fg-strong);
}
.nd-btn.ghost {
    background: transparent;
    color: var(--nd-fg-mute);
}
.nd-btn.ghost:hover {
    color: var(--nd-fg);
    background: var(--nd-bg-soft);
}

/* ── Code & syntax tokens ─────────────────────────────────────── */
code {
    font-family: var(--nd-font-mono);
    font-size: 0.92em;
    background: var(--nd-bg-code);
    color: var(--vscode-symbolIcon-propertyForeground, var(--nd-fg-strong));
    padding: 1px 6px;
    border-radius: var(--nd-r-sm);
}

pre.codeblock {
    background: var(--nd-bg-code);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    padding: var(--nd-sp-3) var(--nd-sp-4);
    margin: var(--nd-sp-2) 0 var(--nd-sp-4);
    overflow-x: auto;
    position: relative;
}
pre.codeblock::before {
    content: attr(data-lang);
    position: absolute; top: 6px; right: 12px;
    font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--nd-fg-mute);
    font-family: var(--nd-font);
}
pre.codeblock code {
    background: none;
    padding: 0;
    border-radius: 0;
    white-space: pre;
    display: block;
    font-family: var(--nd-font-mono);
    font-size: 12px;
    color: var(--vscode-editor-foreground, #d4d4d4);
}

/* Syntax highlight tokens (used by SdkExplainPanel) */
.hl-kw  { color: var(--vscode-symbolIcon-keywordForeground, #c586c0); }
.hl-str { color: var(--vscode-debugTokenExpression-string, #ce9178); }
.hl-cmt { color: var(--vscode-editorLineNumber-foreground, #6a9955); font-style: italic; }
.hl-num { color: var(--vscode-debugTokenExpression-number, #b5cea8); }
.hl-fn  { color: var(--vscode-symbolIcon-functionForeground, #dcdcaa); }
.hl-dec { color: var(--vscode-symbolIcon-colorForeground, #4fc1ff); }

/* ── Links ────────────────────────────────────────────────────── */
a {
    color: var(--nd-link);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s, color 0.15s;
}
a:hover {
    color: var(--nd-link-hi);
    border-bottom-color: currentColor;
}

/* ── API / command header ─────────────────────────────────────── */
.api-header {
    padding: var(--nd-sp-3) var(--nd-sp-4);
    border-left: 3px solid var(--nd-accent);
    background: var(--nd-bg-soft);
    border-radius: 0 var(--nd-r-md) var(--nd-r-md) 0;
    margin-bottom: var(--nd-sp-5);
}
.api-id {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--nd-fg-mute);
    font-family: var(--nd-font-mono);
    margin-bottom: var(--nd-sp-2);
}
.api-tags {
    display: flex; flex-wrap: wrap; gap: var(--nd-sp-1);
}

/* Function / usage signature */
.fn-sig {
    font-family: var(--nd-font-mono);
    font-size: 13.5px;
    padding: var(--nd-sp-2) var(--nd-sp-3);
    background: var(--nd-bg-code);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    margin: var(--nd-sp-3) 0 var(--nd-sp-4);
}
.fn-kw   { color: var(--vscode-symbolIcon-keywordForeground, #c586c0); }
.fn-name { color: var(--vscode-symbolIcon-functionForeground, #dcdcaa); font-weight: 700; }

/* ── Property / item lists ────────────────────────────────────── */
ul.props {
    list-style: none;
    padding: 0;
    margin: var(--nd-sp-2) 0 var(--nd-sp-3);
}
ul.props li {
    padding: var(--nd-sp-2) 0 var(--nd-sp-2) var(--nd-sp-3);
    border-bottom: 1px solid var(--nd-border-soft);
    font-size: 12px;
    position: relative;
    line-height: 1.5;
}
ul.props li:last-child { border-bottom: none; }
ul.props li::before {
    content: "▸";
    position: absolute; left: 0; top: 8px;
    color: var(--nd-accent);
    font-size: 9px;
}
ul.props li.nested { margin-left: var(--nd-sp-5); }
ul.props li.nested::before { content: "◦"; }

.cont       { font-size: 11px; color: var(--nd-fg-mute); margin-top: 2px; }
.pname      { color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe); font-weight: 600; }
.req        { font-size: 10px; color: #f48771; margin-left: 3px; }
.opt        { font-size: 10px; color: var(--nd-fg-mute); margin-left: 3px; }
.ptype      { font-family: var(--nd-font-mono); color: var(--vscode-symbolIcon-typeParameterForeground, #b5cea8); font-size: 12px; }
.param-name {
    font-family: var(--nd-font-mono);
    font-size: 14px; font-weight: 700;
    color: var(--vscode-symbolIcon-variableForeground, #9cdcfe);
    margin: var(--nd-sp-4) 0 var(--nd-sp-1);
}
.type-name {
    font-family: var(--nd-font-mono);
    font-size: 12px;
    color: var(--vscode-symbolIcon-classForeground, #4ec9b0);
    margin-bottom: var(--nd-sp-1);
}

h3.ex-title {
    font-size: 14px; font-weight: 600;
    color: var(--nd-fg-strong);
    margin: var(--nd-sp-5) 0 var(--nd-sp-1);
}
h4.props-h {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--nd-fg-mute);
    margin: var(--nd-sp-3) 0 var(--nd-sp-1);
}

/* Parameter type expression (e.g. Acl<keyof Tables, 'record' | 'processor' | string>) */
.type-expr {
    font-family: var(--nd-font-mono);
    font-size: 12px;
    color: var(--nd-fg-strong);
    background: var(--nd-bg-code);
    border-radius: var(--nd-r-sm);
    padding: var(--nd-sp-2) var(--nd-sp-3);
    margin: 2px 0 var(--nd-sp-1);
    white-space: normal;
    word-break: break-word;
    line-height: 1.5;
}
.param-desc {
    font-size: 12px;
    color: var(--nd-fg-mute);
    margin: 0 0 var(--nd-sp-2);
}

/* Discriminated-union condition labels (e.g. "When Type extends ...:", "Otherwise:") */
.variant-cond {
    display: inline-block;
    font-size: 11px;
    font-style: italic;
    color: var(--nd-accent-hi);
    border-left: 2px solid var(--nd-accent);
    padding: 2px var(--nd-sp-2);
    margin: var(--nd-sp-3) 0 var(--nd-sp-1);
}

/* Markdown tables that appear inline in guide docs */
table.nd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: var(--nd-sp-2) 0 var(--nd-sp-4);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md);
    overflow: hidden;
}
table.nd-table th {
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--nd-fg-mute);
    background: rgba(129,181,161,0.07);
    padding: var(--nd-sp-2) var(--nd-sp-3);
    border-bottom: 1px solid var(--nd-border);
}
table.nd-table td {
    padding: var(--nd-sp-2) var(--nd-sp-3);
    border-bottom: 1px solid var(--nd-border-soft);
    color: var(--nd-fg);
    vertical-align: top;
}
table.nd-table tbody tr:last-child td { border-bottom: none; }
table.nd-table tbody tr:nth-child(even) td { background: rgba(255,255,255,0.025); }

.file-label {
    display: inline-block;
    font-family: var(--nd-font-mono);
    font-size: 11px;
    color: var(--nd-fg-mute);
    background: var(--nd-bg-code);
    padding: 2px 8px;
    border-radius: var(--nd-r-sm);
    margin: var(--nd-sp-3) 0 2px;
}

/* ── Loading & error states ───────────────────────────────────── */
.loading, .error-msg {
    padding: var(--nd-sp-8) 0;
    font-size: 13px;
    color: var(--nd-fg-mute);
}
.error-msg { color: var(--nd-danger); }

@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
    }
}

body.vscode-high-contrast .nd-card,
body.vscode-high-contrast .nd-callout,
body.vscode-high-contrast pre.codeblock,
body.vscode-high-contrast .api-header,
body.vscode-high-contrast .fn-sig {
    border-color: var(--vscode-contrastBorder, var(--nd-border));
    box-shadow: none;
}

@media (forced-colors: active) {
    .nd-btn,
    .dismiss-btn,
    pre.codeblock,
    .nd-card {
        border: 1px solid ButtonText;
    }
}
`;
}
