import * as vscode from 'vscode';

const GLOBAL_STATE_KEY = 'nowdev-ai-toolbox.welcomeShownForVersion';
const PANEL_TYPE = 'nowdev.welcomePanel';

let _panel: vscode.WebviewPanel | undefined;

export function showWelcomePanelIfNeeded(context: vscode.ExtensionContext): void {
    const current = context.extension.packageJSON.version as string;
    const shown = context.globalState.get<string>(GLOBAL_STATE_KEY);
    if (shown === current) { return; }
    _openPanel(context, current);
}

export function showWelcomePanel(context: vscode.ExtensionContext): void {
    const current = context.extension.packageJSON.version as string;
    _openPanel(context, current);
}

function _openPanel(context: vscode.ExtensionContext, version: string): void {
    if (_panel) {
        _panel.reveal(vscode.ViewColumn.One, true);
        return;
    }

    _panel = vscode.window.createWebviewPanel(
        PANEL_TYPE,
        `What's New — NowDev AI Toolbox`,
        { viewColumn: vscode.ViewColumn.One, preserveFocus: true },
        { enableScripts: true, localResourceRoots: [], retainContextWhenHidden: false }
    );

    _panel.webview.html = _buildHtml(version);

    _panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'dismiss') {
            context.globalState.update(GLOBAL_STATE_KEY, version);
            _panel?.dispose();
        }
    });

    _panel.onDidDispose(() => { _panel = undefined; });
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const LOGO_SVG = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#81B5A1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#293E40;stop-opacity:1" />
    </linearGradient>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <line x1="64" y1="32" x2="64" y2="15" stroke="#1C2B2D" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="12" r="6" fill="#CDDC39" stroke="#1C2B2D" stroke-width="2"/>
  <rect x="24" y="30" width="80" height="70" rx="16" fill="url(#bodyGrad)" stroke="#1C2B2D" stroke-width="2"/>
  <rect x="34" y="45" width="60" height="40" rx="8" fill="#152021" stroke="#000" stroke-width="1"/>
  <g stroke="#00ff41" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#neonGlow)">
    <path d="M 46 58 L 38 65 L 46 72" />
    <line x1="68" y1="56" x2="56" y2="74" stroke="#00ff41" />
    <path d="M 80 58 L 88 65 L 80 72" />
  </g>
  <rect x="18" y="55" width="6" height="20" rx="2" fill="#81B5A1" stroke="#1C2B2D" stroke-width="1"/>
  <rect x="104" y="55" width="6" height="20" rx="2" fill="#81B5A1" stroke="#1C2B2D" stroke-width="1"/>
</svg>`;

function _buildHtml(version: string): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${_styles()}</style>
</head>
<body>
  <div class="hero">
    <div class="hero-banner">
      <div class="hero-logo">${LOGO_SVG}</div>
      <div class="hero-text">
        <div class="hero-top">
          <span class="hero-title">NowDev AI Toolbox</span>
          <span class="hero-version">v${esc(version)}</span>
        </div>
        <div class="hero-sub">ServiceNow AI Agents for VS Code Copilot</div>
        <div class="hero-tagline">Your AI-powered development companion for the Now Platform</div>
        <div class="hero-author">
          <span class="hero-author-by">Made by</span>
          <a class="hero-author-link" href="https://www.linkedin.com/in/danielaagrenmadsen/" target="_blank">Daniel Aagren Seehartrai Madsen</a>
          <span class="hero-rising-star" title="ServiceNow Rising Star 2025">ServiceNow Rising Star 2025</span>
        </div>
      </div>
    </div>
  </div>

  <section>
    <h2 class="sec-h">What's New in v${esc(version)}</h2>
    <ul class="feature-list">
      <li>
        <span class="feat-title">SDK Explain Panel</span>
        <span class="feat-desc">Browse ServiceNow Fluent API documentation inline — powered by <code>now-sdk explain</code> with full syntax highlighting.</span>
      </li>
      <li>
        <span class="feat-title">AI Agent Studio — Extended Properties</span>
        <span class="feat-desc">The AI Agent Studio skill now documents the full set of <code>AiAgent</code> optional properties, including <code>agentType</code>, <code>memoryCategories</code>, <code>iconUrl</code>, <code>docUrl</code>, <code>externalAgentConfiguration</code>, <code>parent</code>, <code>compiledHandbook</code>, and more.</span>
      </li>
      <li>
        <span class="feat-title">Improved Skill Quality</span>
        <span class="feat-desc">Best practices across multiple skills now include a &ldquo;Why it matters&rdquo; column instead of bare rules. Skill descriptions tuned for more reliable Copilot triggering. <code>performancePolicy</code> property names corrected in the build reference.</span>
      </li>
      <li>
        <span class="feat-title">SDK Commands in Sidebar</span>
        <span class="feat-desc">Run <code>build</code>, <code>install</code>, <code>transform</code>, <code>pack</code>, <code>clean</code>, and <code>download</code> directly from the NowDev SDK tab without touching the terminal.</span>
      </li>
      <li>
        <span class="feat-title">Auth Alias Management</span>
        <span class="feat-desc">Add, remove, and set a default auth alias from within VS Code &mdash; no more manual CLI auth flows.</span>
      </li>
      <li>
        <span class="feat-title">Connection Status Checks</span>
        <span class="feat-desc">Verify that your ServiceNow instance is reachable before running SDK commands, with response time and HTTP status displayed.</span>
      </li>
      <li>
        <span class="feat-title">Terminal Shell Configuration</span>
        <span class="feat-desc">Choose the shell used for SDK CLI invocations: PowerShell, bash, zsh, cmd, or auto-detect.</span>
      </li>
      <li>
        <span class="feat-title">Install Info Retrieval</span>
        <span class="feat-desc">Inspect the last deployment status with <code>now-sdk install --info</code> directly from the sidebar.</span>
      </li>
    </ul>
  </section>

  <section>
    <h2 class="sec-h">Getting Started</h2>
    <ol class="step-list">
      <li>
        <strong>Configure your instance URL</strong>
        Open the NowDev sidebar (click the icon in the Activity Bar), go to the <em>Setup</em> tab, and enter your ServiceNow instance URL — e.g. <code>https://dev12345.service-now.com</code>. This enables connection checks and pre-fills SDK commands.
      </li>
      <li>
        <strong>Use AI Agents in Copilot Chat</strong>
        Open GitHub Copilot Chat and type <code>@NowDev</code> to invoke the main agent. Use <code>@NowDev-Fluent</code>, <code>@NowDev-Classic</code>, and other specialised agents for targeted help with your ServiceNow development.
      </li>
      <li>
        <strong>Use the SDK Tab</strong>
        Switch to the <em>SDK</em> tab in the NowDev sidebar to run SDK commands, manage auth aliases, and open the Explain panel for any Fluent API — all without leaving VS Code.
      </li>
    </ol>
  </section>

  <section>
    <h2 class="sec-h">SDK Setup</h2>
    <p class="guide-p">The ServiceNow SDK (<code>now-sdk</code>) is a separate CLI tool required for Fluent development. Install it globally via npm:</p>
    <pre class="codeblock"><code>npm install -g @servicenow/sdk</code></pre>
    <p class="guide-p">After installation, authenticate with your instance:</p>
    <pre class="codeblock"><code>now-sdk auth --add https://&lt;your-instance&gt;.service-now.com --type oauth</code></pre>
    <p class="guide-p">Full documentation, API reference, and setup guides:</p>
    <a class="ext-link" href="https://servicenow.github.io/sdk/" target="_blank">servicenow.github.io/sdk &rarr;</a>
  </section>

  <div class="footer">
    <button class="dismiss-btn" id="dismissBtn">Got it &mdash; don&rsquo;t show again</button>
    <span class="footer-note">This panel reappears when a new version is installed.</span>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('dismissBtn').addEventListener('click', function () {
      vscode.postMessage({ command: 'dismiss' });
    });
  </script>
</body>
</html>`;
}

function _styles(): string {
    return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 32px 48px 48px;
    max-width: 960px;
    margin: 0 auto;
    line-height: 1.6;
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.hero {
    margin: -32px -48px 0;
    padding: 36px 48px 32px;
    background: var(--vscode-sideBar-background, var(--vscode-editorGroupHeader-tabsBackground, #1e1e1e));
    border-bottom: 1px solid var(--vscode-panel-border);
}
.hero-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
}
.hero-logo {
    width: 80px;
    height: 80px;
    filter: drop-shadow(0 0 10px rgba(0,255,65,0.18)) drop-shadow(0 4px 10px rgba(0,0,0,0.4));
}
.hero-logo svg { width: 80px; height: 80px; }
.hero-text { text-align: center; }
.hero-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}
.hero-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--vscode-foreground);
    letter-spacing: -0.01em;
}
.hero-version {
    display: inline-block;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 10px;
    border-radius: 10px;
    letter-spacing: 0.04em;
}
.hero-sub {
    margin-top: 5px;
    font-size: 14px;
    color: #81B5A1;
    font-weight: 500;
}
.hero-tagline {
    margin-top: 4px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
}
.hero-author {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--vscode-panel-border);
}
.hero-author-by {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
}
.hero-author-link {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    border-bottom: 1px solid currentColor;
    transition: opacity 0.15s;
}
.hero-author-link:hover { opacity: 0.75; }
.hero-rising-star {
    font-size: 11px;
    font-weight: 600;
    color: #CDDC39;
    background: rgba(205,220,57,0.12);
    border: 1px solid rgba(205,220,57,0.3);
    border-radius: 10px;
    padding: 1px 9px;
    letter-spacing: 0.02em;
}

/* ── Sections ─────────────────────────────────────────────────────────────── */
section {
    margin-top: 32px;
}
.sec-h {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 4px;
}

/* ── Feature list ─────────────────────────────────────────────────────────── */
.feature-list {
    list-style: none;
    margin-top: 4px;
}
.feature-list li {
    position: relative;
    padding: 10px 0 10px 22px;
    border-bottom: 1px solid var(--vscode-panel-border);
}
.feature-list li:last-child { border-bottom: none; }
.feature-list li::before {
    content: "✦";
    position: absolute;
    left: 2px;
    top: 12px;
    color: var(--vscode-textLink-foreground);
    font-size: 9px;
}
.feat-title {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
}
.feat-desc {
    display: block;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
}

/* ── Step list ────────────────────────────────────────────────────────────── */
.step-list {
    list-style: decimal;
    padding-left: 22px;
    margin-top: 4px;
}
.step-list li {
    font-size: 13px;
    padding: 8px 0 8px 6px;
    border-bottom: 1px solid var(--vscode-panel-border);
    color: var(--vscode-foreground);
}
.step-list li:last-child { border-bottom: none; }
.step-list strong { color: var(--vscode-foreground); }
.step-list em { color: var(--vscode-textLink-foreground); font-style: normal; font-weight: 500; }

/* ── Guide paragraph ──────────────────────────────────────────────────────── */
.guide-p {
    font-size: 13px;
    margin: 10px 0 6px;
    color: var(--vscode-foreground);
}

/* ── Inline code ──────────────────────────────────────────────────────────── */
code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    background: var(--vscode-textCodeBlock-background);
    color: var(--vscode-symbolIcon-propertyForeground, var(--vscode-foreground));
    padding: 1px 5px;
    border-radius: 3px;
}

/* ── Code block ───────────────────────────────────────────────────────────── */
.codeblock {
    background: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 10px 14px;
    margin: 6px 0 10px;
    overflow-x: auto;
}
.codeblock code {
    background: none;
    padding: 0;
    border-radius: 0;
    white-space: pre;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
}

/* ── External link ────────────────────────────────────────────────────────── */
.ext-link {
    display: inline-block;
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    border-bottom: 1px solid currentColor;
}
.ext-link:hover { opacity: 0.75; }

/* ── Footer / dismiss ─────────────────────────────────────────────────────── */
.footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--vscode-panel-border);
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}
.dismiss-btn {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 8px 18px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
}
.dismiss-btn:hover { background: var(--vscode-button-hoverBackground); }
.footer-note {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
}
`;
}
