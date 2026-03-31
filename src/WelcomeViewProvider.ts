import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nowdev-ai-toolbox.welcome';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'fixSetting':
                    await this._fixSetting(message.key);
                    this._updateStatus();
                    break;
                case 'fixAllSettings':
                    await this._fixAllSettings();
                    this._updateStatus();
                    break;
                case 'openCopilotChat':
                    vscode.commands.executeCommand('workbench.action.chat.open');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'nowdev-ai-toolbox');
                    break;
                case 'updateConfig': {
                    const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
                    await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
                    this._updateStatus();
                    break;
                }
                case 'browseFile': {
                    const uris = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { 'Instruction files': ['md', 'txt'] },
                        openLabel: 'Select Instructions File',
                    });
                    if (uris && uris.length > 0) {
                        const filePath = uris[0].fsPath;
                        const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
                        await config.update('customInstructionsFile', filePath, vscode.ConfigurationTarget.Global);
                        this._updateStatus();
                    }
                    break;
                }
                case 'clearInstructionsFile': {
                    const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
                    await config.update('customInstructionsFile', '', vscode.ConfigurationTarget.Global);
                    this._updateStatus();
                    break;
                }
                case 'refresh':
                    this._updateStatus();
                    break;
            }
        });

        vscode.workspace.onDidChangeConfiguration(() => {
            this._updateStatus();
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                // Small delay to ensure webview message listener is ready after re-show
                setTimeout(() => this._updateStatus(), 100);
            }
        });

        webviewView.webview.html = this._getHtml(webviewView.webview);

        setTimeout(() => this._updateStatus(), 200);
    }

    public refreshStatus() {
        this._updateStatus();
    }

    private _updateStatus() {
        if (!this._view) { return; }

        const checks: Record<string, boolean> = {
            subAgents: this._checkSetting('chat.subagents', 'allowInvocationsFromSubagents', true),
            memory: this._checkSetting('github.copilot.chat.tools.memory', 'enabled', true),
            askChatLocation: this._checkSetting('workbench.commandPalette.experimental', 'askChatLocation', 'chatView'),
            browserTools: this._checkSetting('workbench.browser', 'enableChatTools', true),
        };

        const toolboxConfig = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
        const customInstructionsFile = toolboxConfig.get<string>('customInstructionsFile', '');
        let customInstructionsContent = '';
        if (customInstructionsFile) {
            try {
                customInstructionsContent = fs.readFileSync(customInstructionsFile, 'utf-8');
            } catch (err) {
                console.error('Failed to read custom instructions file:', err);
            }
        }
        const settings = {
            instanceUrl: toolboxConfig.get<string>('instanceUrl', ''),
            preferredStyle: toolboxConfig.get<string>('preferredDevelopmentStyle', 'auto'),
            customInstructionsFile,
        };

        this._view.webview.postMessage({ command: 'updateStatus', checks, settings });
        this._writeConfigFile(settings, customInstructionsContent);
    }

    /**
     * Writes settings to .vscode/nowdev-ai-config.json in the workspace root
     * so that Copilot Chat agents can read them via the read_file tool.
     */
    private _writeConfigFile(settings: { instanceUrl: string; preferredStyle: string; customInstructionsFile: string }, customInstructionsContent: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }

        const vscodePath = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
        const configPath = path.join(vscodePath, 'nowdev-ai-config.json');

        const configData: Record<string, string> = {
            _comment: 'Auto-generated by NowDev AI Toolbox. Agents read this file for project context. Do not edit manually.',
            instanceUrl: settings.instanceUrl,
            preferredDevelopmentStyle: settings.preferredStyle,
        };

        if (customInstructionsContent) {
            configData.customInstructions = customInstructionsContent;
        }

        try {
            if (!fs.existsSync(vscodePath)) {
                fs.mkdirSync(vscodePath, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2) + '\n', 'utf-8');
        } catch (err) {
            console.error('Failed to write nowdev-ai-config.json:', err);
        }
    }

    private _checkSetting(section: string, key: string, expected: unknown): boolean {
        const config = vscode.workspace.getConfiguration(section);
        return config.get(key) === expected;
    }

    private async _fixSetting(key: string) {
        const settingsMap: Record<string, [string, string, unknown]> = {
            subAgents: ['chat.subagents', 'allowInvocationsFromSubagents', true],
            memory: ['github.copilot.chat.tools.memory', 'enabled', true],
            askChatLocation: ['workbench.commandPalette.experimental', 'askChatLocation', 'chatView'],
            browserTools: ['workbench.browser', 'enableChatTools', true],
        };

        const setting = settingsMap[key];
        if (setting) {
            const [section, prop, value] = setting;
            const config = vscode.workspace.getConfiguration(section);
            await config.update(prop, value, vscode.ConfigurationTarget.Global);
        }
    }

    private async _fixAllSettings() {
        const keys = ['subAgents', 'memory', 'askChatLocation', 'browserTools'];
        for (const key of keys) {
            await this._fixSetting(key);
        }
    }

    private _getHtml(webview: vscode.Webview): string {
        const ext = vscode.extensions.getExtension('DanielMadsenDK.nowdev-ai-toolbox');
        const version = ext?.packageJSON?.version ?? '0.0.0';

        const iconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'agent-icon.svg')
        );

        const nonce = getNonce();

        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style nonce="${nonce}">
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 16px 14px;
            line-height: 1.5;
        }

        /* Header */
        .header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
        }
        .header img {
            width: 36px;
            height: 36px;
            border-radius: 6px;
        }
        .header-text h1 {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .header-text .version {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        /* Sections */
        .section {
            margin-bottom: 16px;
        }
        .section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* Status checks */
        .check-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
            font-size: 12px;
        }
        .check-icon {
            flex-shrink: 0;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            line-height: 1;
        }
        .check-icon.ok {
            background: var(--vscode-testing-iconPassed, #388a34);
            color: #fff;
        }
        .check-icon.fail {
            background: var(--vscode-testing-iconFailed, #f14c4c);
            color: #fff;
        }
        .check-label {
            flex: 1;
            color: var(--vscode-foreground);
        }
        .fix-btn {
            font-size: 10px;
            padding: 1px 8px;
            border: 1px solid var(--vscode-button-border, var(--vscode-button-background));
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            cursor: pointer;
        }
        .fix-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .fix-all-btn {
            font-size: 10px;
            padding: 2px 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .fix-all-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .all-good {
            display: none;
            font-size: 11px;
            color: var(--vscode-testing-iconPassed, #388a34);
            padding: 4px 0;
        }

        /* Settings form */
        .field {
            margin-bottom: 10px;
        }
        .field label {
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 4px;
        }
        .field .field-desc {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        .field input[type="text"],
        .field select {
            width: 100%;
            padding: 4px 8px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
            border-radius: 3px;
            outline: none;
        }
        .field input[type="text"]:focus,
        .field select:focus {
            border-color: var(--vscode-focusBorder);
        }

        /* Primary button */
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            justify-content: center;
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        /* Info list */
        .info-list {
            list-style: none;
            padding: 0;
        }
        .info-list li {
            font-size: 12px;
            color: var(--vscode-foreground);
            padding: 3px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .info-list li::before {
            content: "\\2022";
            color: var(--vscode-descriptionForeground);
            font-weight: bold;
        }

        /* Links */
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
            color: var(--vscode-textLink-activeForeground);
        }

        /* Divider */
        hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
            margin: 14px 0;
        }

        /* Desc */
        .desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 14px;
        }

        /* File picker */
        .file-picker-row {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .btn-secondary {
            padding: 4px 12px;
            font-size: 11px;
            font-family: var(--vscode-font-family);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border, var(--vscode-button-secondaryBackground));
            border-radius: 3px;
            cursor: pointer;
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-clear {
            padding: 2px 6px;
            font-size: 12px;
            background: none;
            color: var(--vscode-descriptionForeground);
            border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
            border-radius: 3px;
            cursor: pointer;
            line-height: 1;
        }
        .btn-clear:hover {
            color: var(--vscode-errorForeground);
            border-color: var(--vscode-errorForeground);
        }
        .file-path {
            margin-top: 6px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            word-break: break-all;
            padding: 4px 6px;
            background: var(--vscode-input-background);
            border-radius: 3px;
            border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        }

    </style>
</head>
<body>

    <!-- Header -->
    <div class="header">
        <img src="${iconUri}" alt="NowDev AI">
        <div class="header-text">
            <h1>NowDev AI Toolbox</h1>
            <span class="version">v${version}</span>
        </div>
    </div>

    <p class="desc">
        AI-powered multi-agent system for ServiceNow development in VS Code Copilot Chat.
    </p>

    <!-- Quick Action -->
    <div class="section">
        <button class="btn-primary" id="openChat">Open Copilot Chat (Ctrl+Shift+I)</button>
    </div>

    <hr>

    <!-- Prerequisites Status -->
    <div class="section">
        <div class="section-title">
            <span>Configuration Status</span>
            <button class="fix-all-btn" id="fixAll" title="Enable all required settings">Fix All</button>
        </div>
        <div id="allGood" class="all-good">All prerequisites are configured correctly.</div>
        <div id="checks">
            <div class="check-row" data-key="subAgents">
                <span class="check-icon fail">&#10005;</span>
                <span class="check-label">Sub-agent invocations</span>
                <button class="fix-btn">Enable</button>
            </div>
            <div class="check-row" data-key="memory">
                <span class="check-icon fail">&#10005;</span>
                <span class="check-label">Memory tool</span>
                <button class="fix-btn">Enable</button>
            </div>
            <div class="check-row" data-key="askChatLocation">
                <span class="check-icon fail">&#10005;</span>
                <span class="check-label">Ask Chat Location</span>
                <button class="fix-btn">Enable</button>
            </div>
            <div class="check-row" data-key="browserTools">
                <span class="check-icon fail">&#10005;</span>
                <span class="check-label">Browser tools</span>
                <button class="fix-btn">Enable</button>
            </div>
        </div>
    </div>

    <hr>

    <!-- ServiceNow Settings -->
    <div class="section">
        <div class="section-title">
            <span>ServiceNow Settings</span>
            <button class="fix-btn" id="openSettings" title="Open in VS Code Settings">Settings</button>
        </div>

        <div class="field">
            <label for="instanceUrl">Instance URL</label>
            <div class="field-desc">Used by agents for context (e.g. https://mydev.service-now.com)</div>
            <input type="text" id="instanceUrl" placeholder="https://instance.service-now.com" spellcheck="false">
        </div>

        <div class="field">
            <label for="devStyle">Development Style</label>
            <div class="field-desc">How agents should generate ServiceNow code</div>
            <select id="devStyle">
                <option value="auto">Auto (agents decide)</option>
                <option value="classic">Classic (Script Includes, Business Rules)</option>
                <option value="fluent">Fluent SDK (.now.ts TypeScript)</option>
            </select>
        </div>
    </div>

    <hr>

    <!-- Custom Instructions -->
    <div class="section">
        <div class="section-title">
            <span>Custom Instructions</span>
        </div>
        <div class="field-desc" style="margin-bottom: 8px;">
            Select a .md or .txt file with instructions for the AI agents. These are treated as high-priority directives.
        </div>
        <div class="file-picker">
            <div class="file-picker-row">
                <button class="btn-secondary" id="browseFile">Browse…</button>
                <button class="btn-clear" id="clearFile" title="Remove instructions file" style="display:none;">✕</button>
            </div>
            <div class="file-path" id="filePath" style="display:none;"></div>
        </div>
    </div>

    <hr>

    <!-- Links -->
    <div class="section">
        <div class="section-title">Resources</div>
        <ul class="info-list">
            <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox">GitHub Repository</a></li>
            <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox#readme">Documentation</a></li>
            <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox/issues">Report an Issue</a></li>
        </ul>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();

            // -- Buttons --
            document.getElementById('openChat').addEventListener('click', () => {
                vscode.postMessage({ command: 'openCopilotChat' });
            });
            document.getElementById('openSettings').addEventListener('click', () => {
                vscode.postMessage({ command: 'openSettings' });
            });
            document.getElementById('fixAll').addEventListener('click', () => {
                vscode.postMessage({ command: 'fixAllSettings' });
            });

            // -- Fix buttons on individual check rows --
            document.querySelectorAll('#checks .check-row .fix-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.closest('.check-row').dataset.key;
                    vscode.postMessage({ command: 'fixSetting', key });
                });
            });

            // -- Config inputs with debounce --
            let debounceTimers = {};
            function debounceUpdate(key, value) {
                clearTimeout(debounceTimers[key]);
                debounceTimers[key] = setTimeout(() => {
                    vscode.postMessage({ command: 'updateConfig', key, value });
                }, 600);
            }

            document.getElementById('instanceUrl').addEventListener('input', (e) => {
                debounceUpdate('instanceUrl', e.target.value.trim());
            });
            document.getElementById('devStyle').addEventListener('change', (e) => {
                vscode.postMessage({ command: 'updateConfig', key: 'preferredDevelopmentStyle', value: e.target.value });
            });

            // -- File picker --
            document.getElementById('browseFile').addEventListener('click', () => {
                vscode.postMessage({ command: 'browseFile' });
            });
            document.getElementById('clearFile').addEventListener('click', () => {
                vscode.postMessage({ command: 'clearInstructionsFile' });
            });

            // -- Receive status from extension --
            window.addEventListener('message', (event) => {
                const msg = event.data;
                if (msg.command === 'updateStatus') {
                    updateChecks(msg.checks);
                    updateSettings(msg.settings);
                }
            });

            function updateChecks(checks) {
                let allOk = true;
                document.querySelectorAll('#checks .check-row').forEach(row => {
                    const key = row.dataset.key;
                    const ok = checks[key];
                    const icon = row.querySelector('.check-icon');
                    const btn = row.querySelector('.fix-btn');
                    if (ok) {
                        icon.className = 'check-icon ok';
                        icon.innerHTML = '\\u2713';
                        btn.style.display = 'none';
                    } else {
                        icon.className = 'check-icon fail';
                        icon.innerHTML = '\\u2717';
                        btn.style.display = '';
                        allOk = false;
                    }
                });
                document.getElementById('allGood').style.display = allOk ? 'block' : 'none';
                document.getElementById('fixAll').style.display = allOk ? 'none' : '';
            }

            function updateSettings(settings) {
                const urlInput = document.getElementById('instanceUrl');
                const styleSelect = document.getElementById('devStyle');
                if (document.activeElement !== urlInput) {
                    urlInput.value = settings.instanceUrl || '';
                }
                if (document.activeElement !== styleSelect) {
                    styleSelect.value = settings.preferredStyle || 'auto';
                }
                // Update file picker display
                const filePathEl = document.getElementById('filePath');
                const clearBtn = document.getElementById('clearFile');
                if (settings.customInstructionsFile) {
                    filePathEl.textContent = settings.customInstructionsFile;
                    filePathEl.style.display = 'block';
                    clearBtn.style.display = '';
                } else {
                    filePathEl.style.display = 'none';
                    clearBtn.style.display = 'none';
                }
            }
        })();
    </script>

</body>
</html>`;
    }
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
