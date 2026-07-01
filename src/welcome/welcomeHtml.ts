import * as vscode from 'vscode';

    /** Render a single SDK command card. */
export function sdkCard(opts: {
        name: string;
        tagline: string;
        statusId: string;
        helpCmd?: string;
        optsId?: string;
        optsHtml?: string;
        extraBtns?: string[];
        runCmd: string;
        runTitle?: string;
        afterHtml?: string;
    }): string {
        const helpBtn = opts.helpCmd
            ? `<button class="sdk-help-btn" data-cmd="${opts.helpCmd}" aria-label="Show help for ${opts.name}" title="${opts.name} help">?</button>`
            : '';
        const optsBtn = opts.optsId
            ? `<button class="sdk-opts-btn" data-opts="${opts.optsId}" aria-label="Toggle options for ${opts.name}" title="${opts.name} options">&#9881;</button>`
            : '';
        const extraBtns = (opts.extraBtns || []).join('');
        const optsPanel = opts.optsId && opts.optsHtml
            ? `<div class="sdk-cmd-opts" id="${opts.optsId}">${opts.optsHtml}</div>`
            : '';
        return `
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">${opts.name}</span>
                        <span class="sdk-cmd-tagline">${opts.tagline}</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        ${helpBtn}${optsBtn}${extraBtns}
                        <button class="fix-btn sdk-run-btn" data-cmd="${opts.runCmd}"${opts.runTitle ? ` title="${opts.runTitle}"` : ''}>Run</button>
                    </div>
                </div>
                ${optsPanel}
                <div class="sdk-cmd-status" id="${opts.statusId}" aria-live="polite"></div>
                ${opts.afterHtml ?? ''}
            </div>`;
    }

    /** Render a compact side-by-side pair of minimal SDK command cards. */
export function sdkCardMini(cards: Array<{ name: string; tagline: string; statusId: string; runCmd: string; runTitle?: string; helpCmd?: string; extra?: string }>): string {
        const inner = cards.map(c => {
            const helpBtn = c.helpCmd
                ? `<button class="sdk-help-btn" data-cmd="${c.helpCmd}" aria-label="Show help for ${c.name}" title="${c.name} help">?</button>`
                : '';
            const extra = c.extra || '';
            return `
                <div class="sdk-cmd-card">
                    <div class="sdk-cmd-row">
                        <span class="sdk-cmd-name">${c.name}</span>
                        <div class="sdk-cmd-actions">${helpBtn}${extra}<button class="fix-btn sdk-run-btn" data-cmd="${c.runCmd}"${c.runTitle ? ` title="${c.runTitle}"` : ''}>Run</button></div>
                    </div>
                    <div class="sdk-cmd-tagline sdk-cmd-tagline-mt">${c.tagline}</div>
                    <div class="sdk-cmd-status" id="${c.statusId}" aria-live="polite"></div>
                </div>`;
        }).join('');
        return `<div class="sdk-cmd-pair">${inner}</div>`;
    }

export function renderHomeTab(): string {
        return `
    <!-- ═══════════ TAB: Home ═══════════ -->
    <div id="tab-home" class="tab-content active" role="tabpanel" aria-labelledby="tab-btn-home">

        <!-- At-a-glance workspace status (rendered by main.js) -->
        <div id="workspaceStatus" class="workspace-status" aria-live="polite"></div>

        <div id="onboardingSummary" class="onboarding-summary" aria-live="polite"></div>

        <section class="home-command-center">
            <div class="home-profile-card">
                <div class="section-title">Agent Profile</div>
                <div class="profile-select-row">
                    <select id="activeProfile" class="profile-select" aria-label="Active agent profile"></select>
                    <button class="mcp-doc-source-gear" id="profileToneGear" title="Customize tone instructions" aria-label="Customize tone instructions" aria-controls="profileTonePanel" aria-expanded="false">&#9881;</button>
                </div>
                <div class="field-desc nd-mt-1" id="profileDescription"></div>
                <div class="mcp-doc-source-panel" id="profileTonePanel">
                    <div class="field-label nd-mb-1">Tone &amp; style instructions</div>
                    <div class="field-desc" style="margin-bottom:8px;">Injected into all agents for this profile. Customizations survive extension upgrades.</div>
                    <textarea id="profileInstructionsInput" rows="8" class="profile-tone-textarea" aria-label="Tone and style instructions" placeholder="Instructions injected into all agents for this profile..."></textarea>
                    <button class="fix-btn nd-mt-1 nd-hidden" id="resetProfileInstructions">Reset to default</button>
                </div>
            </div>
            <div class="home-launch-grid">
                <button class="launch-card launch-primary" id="openChat" title="Open Copilot Chat (Ctrl+Shift+I)">
                    <span class="launch-title">Start Agent Chat</span>
                    <span class="launch-desc">Use NowDev AI Agent for orchestration</span>
                </button>
                <button class="launch-card" id="openInstanceBrowserHome" title="Browse dependencies and live instance context">
                    <span class="launch-title">Instance Browser</span>
                    <span class="launch-desc">Browse records and discover context</span>
                </button>
                <button class="launch-card" id="openGuidelinesBrowserHome" title="Select KB articles as agent guidelines">
                    <span class="launch-title">Agent Guidelines</span>
                    <span class="launch-desc">Attach KB articles as live guidance</span>
                </button>
            </div>
        </section>

        <!-- Prerequisites Status -->
        <div class="section">
            <div class="section-title">
                <span>Configuration Status</span>
                <button class="fix-all-btn nd-hidden" id="fixAll" title="Enable all required Copilot settings automatically">Auto-configure</button>
            </div>
            <div id="allGood" class="all-good nd-hidden">All prerequisites configured.</div>
            <div id="checks">
                <div class="check-row" data-key="subAgents">
                    <span class="check-icon fail" aria-hidden="true">&#10005;</span>
                    <span class="check-label">Sub-agent invocations</span>
                    <button class="fix-btn">Enable</button>
                </div>
                <div class="check-row" data-key="memory">
                    <span class="check-icon fail" aria-hidden="true">&#10005;</span>
                    <span class="check-label">Memory tool</span>
                    <button class="fix-btn">Enable</button>
                </div>
                <div class="check-row" data-key="customAgentHooks">
                    <span class="check-icon fail" aria-hidden="true">&#10005;</span>
                    <span class="check-label">Agent-scoped hooks</span>
                    <button class="fix-btn">Enable</button>
                </div>
                <div class="check-row" data-key="browserTools">
                    <span class="check-icon fail" aria-hidden="true">&#10005;</span>
                    <span class="check-label">Browser tools</span>
                    <button class="fix-btn">Enable</button>
                </div>
            </div>
        </div>

        <!-- Session Artifacts (shown only when artifacts exist) -->
        <div id="artifactsSection" class="nd-hidden">
            <div class="section-title artifacts-section-title" id="artifactsSectionHeader">
                <span>Session Artifacts <span id="artifactCount" class="nd-pill"></span></span>
                <div class="nd-btn-group">
                    <button class="fix-btn" id="openArtifactState" title="Open the workspace artifact state JSON">Open State</button>
                    <button class="fix-btn" id="resetArtifactState" title="Clear the current artifact registry without deleting generated files">Reset</button>
                </div>
            </div>
            <div id="artifactsView" class="artifacts-home-body"></div>
        </div>
    </div>`;
    }

export function renderProjectTab(): string {
        return `
    <!-- ═══════════ TAB: Project ═══════════ -->
    <div id="tab-project" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-project" hidden aria-hidden="true">

        <!-- ServiceNow Settings -->
        <div class="section">
            <div class="section-title">
                <span>ServiceNow Settings</span>
                <button class="fix-btn" id="openSettings" title="Open in VS Code Settings">Settings</button>
            </div>

            <div class="field">
                <label for="instanceUrl">Instance URL</label>
                <div class="field-desc">Used by agents for context (e.g. https://mydev.service-now.com)</div>
                <div class="instance-url-row">
                    <input type="text" id="instanceUrl" placeholder="https://instance.service-now.com" spellcheck="false">
                    <button class="fix-btn" id="testConnection" title="Test reachability of the configured instance">Test</button>
                </div>
                <div id="connectionStatus" class="connection-status" aria-live="polite"></div>
            </div>
        </div>

        <!-- Fluent App Info -->
        <div class="section nd-hidden" id="fluentAppSection">
            <div class="section-title">
                <span>Fluent App</span>
            </div>
            <div class="field-desc nd-mb-2">
                Detected from <code>now.config.json</code> in the workspace root.
            </div>
            <div class="app-info" id="fluentAppInfo"></div>
        </div>

        <hr id="fluentAppHr" class="nd-hidden">

        <!-- Initialize Fluent Project CTA (shown when no now.config.json) -->
        <div class="section" id="initFluentSection">
            <div class="section-title">
                <span>Fluent Project</span>
            </div>
            <div class="field-desc nd-mb-2">
                No <code>now.config.json</code> detected. Run <code>now-sdk init</code> to scaffold a new Fluent SDK project.
            </div>
            <button class="btn-secondary" id="initFluentProject">Initialize Fluent Project&hellip;</button>
        </div>

        <hr id="initFluentHr">

        <!-- Custom Instructions -->
        <div class="section">
            <div class="section-title">
                <span>Custom Instructions</span>
            </div>
            <div class="field-desc nd-mb-2">
                Select a .md or .txt file with instructions, or save Knowledge articles from the instance as live agent guidelines.
            </div>
            <div class="file-picker">
                <div class="file-picker-row">
                    <button class="btn-secondary" id="browseFile">Browse…</button>
                    <button class="btn-secondary" id="openGuidelinesBrowserBtn" title="Find Knowledge articles to use as agent guidelines">KB Guidelines…</button>
                    <button class="btn-clear nd-hidden" id="clearFile" aria-label="Remove instructions file" title="Remove instructions file">✕</button>
                </div>
                <div class="file-path nd-hidden" id="filePath"></div>
                <div class="file-path nd-hidden" id="guidelinesSummary"></div>
            </div>
        </div>

        <!-- MCP Integrations -->
        <div class="section">
            <div class="section-title">
                <span>MCP Integrations</span>
                <button class="fix-btn" id="rescanMcp" title="Re-scan for available MCP servers">Rescan</button>
            </div>
            <div class="field-desc nd-mb-2">
                Select MCP servers to expose as agent tools. Agent files are kept in sync automatically. Add servers via the Extensions view <code>@mcp</code>, in workspace <code>.mcp.json</code>, or in legacy <code>.vscode/mcp.json</code>.
            </div>
            <div id="mcpServersList">
                <div class="field-desc nd-placeholder">Scanning&hellip;</div>
            </div>
        </div>

        <!-- Work Item Integration (Azure DevOps, Jira, etc.) -->
        <div class="section">
            <div class="section-title">
                <span>Work Item Integration</span>
                <label class="tool-toggle" title="Enable the work-item workflow on the orchestrator">
                    <input type="checkbox" id="devopsEnabled" aria-label="Enable work item integration">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="field-desc nd-mb-2">
                Connect a project-management MCP server (e.g. Azure DevOps, Jira) so the orchestrator automatically reads task details before building, posts progress comments, and updates work-item status on completion.
            </div>
            <div id="devopsConfig" class="nd-hidden">
                <div class="field">
                    <label for="devopsMcpServer">MCP Server</label>
                    <div class="field-desc">Choose the MCP server that provides access to your project-management tool.</div>
                    <select id="devopsMcpServer">
                        <option value="">(select a server)</option>
                    </select>
                </div>
                <div class="field">
                    <label>Custom Instructions</label>
                    <div class="field-desc">Browse to a .md or .txt file describing your workflow: task structure, naming conventions, status values, etc.</div>
                    <div class="file-picker">
                        <div class="file-picker-row">
                            <button class="btn-secondary" id="browseDevopsFile">Browse file&hellip;</button>
                            <button class="btn-clear nd-hidden" id="clearDevopsFile" aria-label="Remove work item instructions file" title="Remove instructions file">&#10005;</button>
                        </div>
                        <div class="file-path nd-hidden" id="devopsFilePath"></div>
                    </div>
                </div>
            </div>
        </div>

    </div>`;
    }

export function renderSdkTab(): string {
        return `
    <!-- ═══════════ TAB: SDK ═══════════ -->
    <div id="tab-sdk" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-sdk" hidden aria-hidden="true">

        <!-- Auth Aliases -->
        <div class="section">
            <div class="section-title">
                <span>Auth Aliases</span>
                <div class="nd-btn-group">
                    <button class="fix-btn" id="rescanAuthAliases" title="Re-scan auth aliases">Rescan</button>
                    <button class="fix-btn" id="sdkAuthAdd" title="Add a new auth alias">Add&hellip;</button>
                </div>
            </div>
            <div class="field-desc nd-mb-2">
                Credentials stored by <code class="nd-code-sm">now-sdk auth --add</code>
            </div>
            <div id="authAliasesList">
                <div class="field-desc nd-placeholder">Scanning&hellip;</div>
            </div>
        </div>

        <!-- SDK Commands -->
        <div class="section">
            <div class="section-title">Build &amp; Instance Commands</div>
            <div class="sdk-auth-row">
                <label for="sdkCmdAuth" class="sdk-auth-label">Auth alias</label>
                <select id="sdkCmdAuth">
                    <option value="">(SDK default)</option>
                </select>
            </div>

            <!-- Quick Actions -->
            <div class="sdk-quick-actions">
                <button class="fix-btn sdk-run-btn sdk-deploy-btn" data-cmd="deploy" title="Build then Install — stops if Build fails">Deploy (Build &rarr; Install)</button>
                <div class="sdk-cmd-status" id="sdkStatus-deploy" aria-live="polite"></div>
                <button class="fix-btn sdk-run-btn sdk-sync-btn" data-cmd="sync" title="Incremental download from instance, then transform XML to Fluent source">Sync (Download &rarr; Transform)</button>
                <div class="sdk-cmd-status" id="sdkStatus-sync" aria-live="polite"></div>
            </div>

            ${sdkCard({
                name: 'Build', tagline: 'Compile source files',
                statusId: 'sdkStatus-build', runCmd: 'build',
                helpCmd: 'build', optsId: 'opts-build',
                optsHtml: '<label class="sdk-opt"><input type="checkbox" id="buildFrozenKeys"> <code>--frozenKeys</code> <span class="sdk-opt-hint">validate keys.ts — use in CI</span></label>',
            })}
            ${sdkCard({
                name: 'Install', tagline: 'Deploy to instance',
                statusId: 'sdkStatus-install', runCmd: 'install',
                helpCmd: 'install', optsId: 'opts-install',
                optsHtml: `<label class="sdk-opt"><input type="checkbox" id="installReinstall"> <code>--reinstall</code> <span class="sdk-opt-hint">uninstall first</span></label>
                    <label class="sdk-opt"><input type="checkbox" id="installOpenBrowser"> <code>--open-browser</code> <span class="sdk-opt-hint">open app record after install</span></label>`,
                extraBtns: ['<button class="fix-btn" id="installInfoBtn" title="Check last deployment status (--info)">Status</button>'],
                afterHtml: '<div id="installInfoPanel" class="install-info-panel nd-hidden"></div>',
            })}
            ${sdkCard({
                name: 'Transform', tagline: 'Sync instance → source',
                statusId: 'sdkStatus-transform', runCmd: 'transform',
                helpCmd: 'transform', optsId: 'opts-transform',
                optsHtml: `<label class="sdk-opt"><input type="checkbox" id="transformPreview"> <code>--preview</code> <span class="sdk-opt-hint">show output without saving</span></label>
                    <div class="sdk-opt-row"><label class="sdk-auth-label">Metadata folder</label><input type="text" id="transformMetadataFolder" value="metadata" placeholder="metadata" style="flex:1;min-width:0"></div>`,
                extraBtns: ['<button class="fix-btn" id="transformFromXmlBtn" title="Transform a local XML file or folder (--from)">From XML&hellip;</button>'],
            })}
            ${sdkCard({
                name: 'Dependencies', tagline: 'Download type definitions',
                statusId: 'sdkStatus-dependencies', runCmd: 'dependencies',
                helpCmd: 'dependencies', optsId: 'opts-deps',
                optsHtml: `<div class="sdk-opt-row"><label class="sdk-auth-label">Scope</label>
                    <select id="depsMode">
                        <option value="all">All (scripts + Fluent)</option>
                        <option value="script">Scripts only</option>
                        <option value="fluent">Fluent only</option>
                    </select></div>`,
                extraBtns: [
                    '<button class="fix-btn" id="openDepPickerBtn" title="Open Instance Browser in dependency browsing mode">Instance Browser&hellip;</button>',
                    '<button class="fix-btn" id="openContextScannerBtn" title="Open Instance Browser in task discovery mode">Discover Context&hellip;</button>',
                ],
            })}
            ${sdkCard({
                name: 'Download', tagline: 'Fetch metadata from instance',
                statusId: 'sdkStatus-download', runCmd: 'download',
                helpCmd: 'download', optsId: 'opts-download',
                optsHtml: '<label class="sdk-opt"><input type="checkbox" id="downloadIncremental" checked> <code>--incremental</code> <span class="sdk-opt-hint">only changed records</span></label>',
                extraBtns: ['<button class="fix-btn" id="checkChangesBtn" title="Count incremental changes on instance without downloading">Check</button>'],
                afterHtml: '<div id="checkChangesStatus" class="changes-status nd-hidden"></div>',
            })}
            ${sdkCardMini([
                { name: 'Move', tagline: 'Global metadata → Fluent', statusId: 'sdkStatus-move', runCmd: 'move', runTitle: 'Transform global metadata into local Fluent code' },
            ])}
            ${sdkCardMini([
                { name: 'Clean', tagline: 'Remove build artifacts', statusId: 'sdkStatus-clean', runCmd: 'clean', helpCmd: 'clean' },
                { name: 'Pack',  tagline: 'Package into ZIP',        statusId: 'sdkStatus-pack',  runCmd: 'pack',  helpCmd: 'pack'  },
            ])}
        </div>

        <!-- SDK Documentation -->
        <div class="section">
            <div class="section-title">SDK Documentation</div>
            <div class="field-desc nd-mb-2">Open current Fluent SDK documentation with <code>now-sdk explain</code></div>
            <div class="sdk-explain-row">
                <input type="text" id="explainApiInput" aria-label="SDK API to explain" placeholder="e.g. UiPage, Table, Acl" spellcheck="false">
                <button class="fix-btn" id="runExplain">Explain</button>
            </div>
        </div>

        <!-- Instance Query -->
        <div class="section">
            <div class="section-title">Instance Query</div>
            <div class="field-desc nd-mb-2">Query live instance data with <code>now-sdk query</code></div>
            <div class="field-row">
                <label class="field-label" for="queryTable">Table</label>
                <input type="text" id="queryTable" placeholder="e.g. incident, sys_user" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label" for="queryFilter">Query</label>
                <input type="text" id="queryFilter" placeholder="e.g. active=true^priority=1" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label" for="queryFields">Fields</label>
                <input type="text" id="queryFields" placeholder="e.g. sys_id,name (optional)" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label" for="queryDisplayValue">Display value</label>
                <select id="queryDisplayValue" class="field-select">
                    <option value="true">Human-readable (true)</option>
                    <option value="false">Raw sys values (false)</option>
                    <option value="all">Both (all)</option>
                </select>
            </div>
            <div class="sdk-explain-row">
                <input type="number" id="queryLimit" aria-label="Query result limit" placeholder="Limit (default 100)" min="1" max="10000" style="width:160px">
                <button class="fix-btn" id="runQuery">Query</button>
            </div>
        </div>


    </div>`;
    }

export function renderAgentsTab(): string {
        return `
    <!-- ═══════════ TAB: Agents ═══════════ -->
    <div id="tab-agents" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-agents" hidden aria-hidden="true">
        <div class="section">
            <div class="section-title">
                <span>Agent Configuration</span>
                <div class="nd-btn-group">
                    <button class="fix-btn" id="showAgentTopology" title="Open agent hierarchy diagram in a new tab">Topology</button>
                    <button class="fix-btn" id="resyncAgents" title="Regenerate all workspace agent files">Resync</button>
                </div>
            </div>
            <div class="field-desc agents-desc">
                Agent files are written to <code>.github/agents/</code>. Disabled agents are not written to the workspace and are removed from orchestration routing.
            </div>
            <div class="agents-actions">
                <button class="fix-btn" id="applyModelPresets" title="Apply role-aware model presets using available VS Code chat models">Apply Model Presets</button>
                <button class="fix-btn" id="showCopilotChatLogs" title="Open the Copilot chat log view">Chat Logs</button>
            </div>
            <div id="agentCards"></div>
        </div>

    </div>`;
    }

export function renderToolsTab(): string {
        return `
    <!-- ═══════════ TAB: Tools ═══════════ -->
    <div id="tab-tools" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-tools" hidden aria-hidden="true">
        <div class="section">
            <div class="section-title">
                <span>Environment &amp; Tools</span>
                <button class="fix-btn" id="rescanTools" title="Re-scan for available tools">Rescan</button>
            </div>
            <div id="envSummary" class="env-summary"></div>
            <div id="toolsList"></div>
        </div>
    </div>`;
    }

export function renderDocsTab(): string {
        return `
    <!-- ═══════════ TAB: Docs ═══════════ -->
    <div id="tab-docs" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-docs" hidden aria-hidden="true">

        <!-- ── Product Docs ────────────────────────────────────────── -->
        <div class="section">
            <div class="section-title">
                <span>ServiceNow Product Docs</span>
                <button class="fix-btn" id="fetchDocsReleases" title="Fetch latest branches from GitHub">Refresh</button>
            </div>
            <div class="field-desc nd-mb-2">Platform and release-specific documentation for the ServiceNow release you are targeting.</div>
            <div class="field">
                <label for="docsRelease">Release</label>
                <select id="docsRelease">
                    <option value="">(select a release)</option>
                </select>
            </div>
            <!-- Source type + config rendered by main.js into #productDocsSourceConfig -->
            <div id="productDocsSourceConfig"></div>

            <!-- Local download UI — always present, shown/hidden by JS -->
            <div id="docsLocalSection" class="nd-hidden">
                <div class="field">
                    <label>Central Docs Folder</label>
                    <div class="field-desc nd-mb-2">
                        A single shared location for all releases, used across every workspace.
                        Set it once in Settings (<code>nowdev-ai-toolbox.docsLocalPath</code>) or browse below.
                    </div>
                    <div class="file-picker">
                        <div class="file-picker-row">
                            <button class="btn-secondary" id="browseDocsPath">Browse&hellip;</button>
                        </div>
                        <div class="file-path nd-hidden" id="docsGlobalPath"></div>
                    </div>
                    <div class="field-desc docs-subfolder-hint nd-hidden" id="docsSubfolder"></div>
                </div>
                <div class="field">
                    <div class="section-title" style="margin-bottom:4px;">
                        <span>Sync Documentation</span>
                        <button class="fix-btn" id="syncProductDocs">Download / Update</button>
                    </div>
                    <div id="docsDownloadStatus" class="field-desc" aria-live="polite"></div>
                </div>
            </div>
        </div>

        <!-- ── SDK Docs ────────────────────────────────────────────── -->
        <div class="section">
            <div class="section-title">ServiceNow SDK Docs</div>
            <div class="field-desc nd-mb-2">Fluent SDK documentation used by SDK development and ATF agents.</div>
            <div id="sdkDocsSourceConfig"></div>
        </div>

        <!-- ── Classic Scripting Docs ──────────────────────────────── -->
        <div class="section">
            <div class="section-title">Classic Scripting API Docs</div>
            <div class="field-desc nd-mb-2">GlideRecord, Business Rules, Script Includes, Client Scripts, and Classic Review agents.</div>
            <div id="classicScriptingSourceConfig"></div>
        </div>


    </div>`;
    }

export function buildWelcomeHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const ext = vscode.extensions.getExtension('DanielMadsenDK.nowdev-ai-toolbox');
        const version = ext?.packageJSON?.version ?? '0.0.0';

        const iconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'agent-icon.svg')
        );
        const cssFiles = ['base', 'layout', 'buttons', 'forms', 'tools-agents', 'artifacts', 'sdk-cards', 'instance', 'docs'];
        const cssLinks = cssFiles
            .map(name => `<link rel="stylesheet" href="${webview.asWebviewUri(
                vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'styles', `${name}.css`)
            )}">`)
            .join('\n    ');
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'main.js')
        );

        const nonce = getNonce();

        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${cssLinks}
</head>
<body>
<div class="nowdev-shell">

    <!-- Header (always visible) -->
    <div class="header">
        <img src="${iconUri}" alt="NowDev AI">
        <div class="header-text">
            <h1>NowDev AI Toolbox</h1>
            <span class="version">v${version}</span>
        </div>
        <button class="header-chat-btn" id="openChatHeader" aria-label="Open Copilot Chat" title="Open Copilot Chat (Ctrl+Shift+I)">Chat &rsaquo;</button>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar" role="tablist" aria-label="NowDev AI Toolbox sections">
        <button class="tab-btn active" id="tab-btn-home" data-tab="home" role="tab" aria-selected="true" aria-controls="tab-home">Home</button>
        <button class="tab-btn" id="tab-btn-project" data-tab="project" role="tab" aria-selected="false" aria-controls="tab-project" tabindex="-1">Setup</button>
        <button class="tab-btn" id="tab-btn-sdk" data-tab="sdk" role="tab" aria-selected="false" aria-controls="tab-sdk" tabindex="-1">SDK &amp; Instance</button>
        <button class="tab-btn" id="tab-btn-agents" data-tab="agents" role="tab" aria-selected="false" aria-controls="tab-agents" tabindex="-1">Agents</button>
        <button class="tab-btn" id="tab-btn-tools" data-tab="tools" role="tab" aria-selected="false" aria-controls="tab-tools" tabindex="-1">Environment</button>
        <button class="tab-btn" id="tab-btn-docs" data-tab="docs" role="tab" aria-selected="false" aria-controls="tab-docs" tabindex="-1">References</button>
    </div>

    ${renderHomeTab()}
    ${renderProjectTab()}
    ${renderSdkTab()}
    ${renderAgentsTab()}
    ${renderToolsTab()}
    ${renderDocsTab()}

</div>

    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
