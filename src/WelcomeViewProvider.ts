import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { scanEnvironment, EnvironmentInfo } from './ToolScanner';
import { scanMcpServers, McpServer } from './MCPScanner';
import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { syncAllAgents, AgentOverride, McpDocSources, McpDocSource, DEFAULT_MCP_DOC_SOURCES } from './WorkspaceAgentManager';
import { parseArtifactsMarkdown } from './ArtifactParser';
import { scanAuthAliases, AuthAlias } from './AuthAliasScanner';
import { showSdkCommandHelpPanel } from './SdkCommandHelpPanel';

interface SdkCommandStatus {
    ok: boolean;
    timestamp: string;
    message: string;
}

interface InstallInfoState {
    loading: boolean;
    ok: boolean;
    output: string;
    timestamp: string;
}

interface ConnectionState {
    checking: boolean;
    reachable: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    timestamp: string;
}

interface CheckChangesState {
    checking: boolean;
    ok: boolean;
    count: number;
    output?: string;
    error?: string;
    timestamp: string;
}

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nowdev-ai-toolbox.welcome';
    private _view?: vscode.WebviewView;
    private _environmentInfo: EnvironmentInfo | null = null;
    private _artifactFilePath: string | null = null;
    private _sdkStatus: Record<string, SdkCommandStatus | null> = {};
    private _authAliases: AuthAlias[] = [];
    private _initializedTabs = new Set<string>();
    private _installInfo: InstallInfoState | null = null;
    private _connectionStatus: ConnectionState | null = null;
    private _checkChangesResult: CheckChangesState | null = null;
    private _mcpServers: McpServer[] = [];
    private _selectedMcp: string[] = [];
    private _mcpDocSources: McpDocSources = { ...DEFAULT_MCP_DOC_SOURCES };
    private _agentManifests: AgentManifest[] = [];
    private _agentOverrides: Record<string, AgentOverride> = {};

    constructor(private readonly _extensionUri: vscode.Uri) {}

    /** Called by extension.ts commands after SDK CLI operations complete. */
    public setSdkCommandStatus(cmd: string, ok: boolean, message: string): void {
        this._sdkStatus[cmd] = { ok, message, timestamp: new Date().toISOString() };
        this._updateStatus();
    }

    /** Re-scans auth aliases and pushes them to the webview. */
    public refreshAuthAliases(): void {
        this._sendSdkData();
    }

    public setInstallInfo(state: InstallInfoState): void {
        this._installInfo = state;
        if (this._view) {
            this._view.webview.postMessage({ command: 'updateInstallInfo', state });
        }
    }

    public setConnectionStatus(state: ConnectionState): void {
        this._connectionStatus = state;
        if (this._view) {
            this._view.webview.postMessage({ command: 'updateConnectionStatus', state });
        }
        if (!state.checking) {
            this._writeConnectionStatusToConfig(state);
        }
    }

    public setCheckChangesResult(state: CheckChangesState): void {
        this._checkChangesResult = state;
        if (this._view) {
            this._view.webview.postMessage({ command: 'updateCheckChanges', state });
        }
    }

    /** Loads the agent registry from bundled files and writes all agents to workspace. */
    public loadAgentRegistry(): void {
        this._agentManifests = loadAgentRegistry(this._extensionUri.fsPath);
        this._syncWorkspaceAgents();
    }

    /** Scans for available MCP servers and triggers an agent override sync. */
    public scanMcp(): void {
        this._mcpServers = scanMcpServers();
        this._syncWorkspaceAgents();
        if (this._view) { this._updateStatus(); }
    }

    /**
     * Runs the environment scan, respecting user-disabled tools.
     * Called on activation and when the user toggles a tool.
     */
    public scanTools(): void {
        try {
            const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
            const disabledTools = config.get<string[]>('disabledTools', []);
            const enabledTools = config.get<string[]>('enabledTools', []);
            this._environmentInfo = scanEnvironment(disabledTools, enabledTools);
        } catch (err) {
            console.error('Environment scan failed:', err);
            this._environmentInfo = null;
        }
    }

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
                case 'toggleMcp': {
                    const mcpName = message.name as string;
                    const nowEnabled = message.enabled as boolean;
                    if (nowEnabled) {
                        if (!this._selectedMcp.includes(mcpName)) {
                            this._selectedMcp = [...this._selectedMcp, mcpName];
                        }
                    } else {
                        this._selectedMcp = this._selectedMcp.filter(n => n !== mcpName);
                    }
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateMcpDocSource': {
                    const slot = message.slot as keyof McpDocSources;
                    const field = message.field as keyof McpDocSource;
                    const value = message.value as string;
                    if (slot in this._mcpDocSources) {
                        this._mcpDocSources = {
                            ...this._mcpDocSources,
                            [slot]: { ...this._mcpDocSources[slot], [field]: value },
                        };
                        this._syncWorkspaceAgents();
                        this._updateStatus();
                    }
                    break;
                }
                case 'rescanMcp':
                    this._mcpServers = scanMcpServers();
                    this._updateStatus();
                    break;
                case 'toggleAgent': {
                    const agentName = message.name as string;
                    const agentEnabled = message.enabled as boolean;
                    const curA = this._agentOverrides[agentName] ?? { enabled: true, disabledTools: [] };
                    this._agentOverrides[agentName] = { ...curA, enabled: agentEnabled };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._sendAgentData();
                    break;
                }
                case 'toggleAgentTool': {
                    const agentName = message.agentName as string;
                    const toolName  = message.toolName  as string;
                    const toolOn    = message.enabled   as boolean;
                    const curT = this._agentOverrides[agentName] ?? { enabled: true, disabledTools: [] };
                    const dt = new Set(curT.disabledTools);
                    if (toolOn) { dt.delete(toolName); } else { dt.add(toolName); }
                    this._agentOverrides[agentName] = { ...curT, disabledTools: [...dt] };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._sendAgentData();
                    break;
                }
                case 'resyncAgents':
                    this._syncWorkspaceAgents();
                    this._sendAgentData();
                    break;
                case 'toggleTool': {
                    const toolKey = message.key as string;
                    const nowEnabled = message.enabled as boolean;
                    const cfg = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
                    const disabled = cfg.get<string[]>('disabledTools', []).slice();
                    const forceEnabled = cfg.get<string[]>('enabledTools', []).slice();
                    const toolInfo = this._environmentInfo?.tools[toolKey];

                    if (nowEnabled) {
                        // Remove from disabled list
                        const di = disabled.indexOf(toolKey);
                        if (di >= 0) { disabled.splice(di, 1); }
                        // If the tool was not auto-detected, add a manual force-enable
                        if (!toolInfo?.available) {
                            if (!forceEnabled.includes(toolKey)) { forceEnabled.push(toolKey); }
                        }
                    } else {
                        // Remove from force-enabled list
                        const fi = forceEnabled.indexOf(toolKey);
                        if (fi >= 0) { forceEnabled.splice(fi, 1); }
                        // Only add to disabled list if the tool is auto-detectable (available)
                        if (toolInfo?.available) {
                            if (!disabled.includes(toolKey)) { disabled.push(toolKey); }
                        }
                    }

                    await cfg.update('disabledTools', disabled, vscode.ConfigurationTarget.Global);
                    await cfg.update('enabledTools', forceEnabled, vscode.ConfigurationTarget.Global);
                    this.scanTools();
                    this._updateStatus();
                    break;
                }
                case 'rescanTools':
                    this.scanTools();
                    this._updateStatus();
                    break;
                case 'refresh':
                    this._updateStatus();
                    break;
                case 'initFluentProject':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.initFluentProject');
                    break;
                case 'sdkCommand':
                    vscode.commands.executeCommand(`nowdev-ai-toolbox.sdk${capitalize(message.cmd)}`, message.args ?? {});
                    break;
                case 'sdkAuthAdd':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkAuthAdd');
                    break;
                case 'sdkAuthRemove':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkAuthRemove', message.alias);
                    break;
                case 'sdkAuthSetDefault':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkAuthSetDefault', message.alias);
                    break;
                case 'sdkExplain':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkExplain', message.api);
                    break;
                case 'sdkCommandHelp':
                    showSdkCommandHelpPanel(message.cmd);
                    break;
                case 'rescanAuthAliases':
                    this._sendSdkData();
                    break;
                case 'checkConnection':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.checkConnection');
                    break;
                case 'sdkInstallInfo':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkInstallInfo', { auth: message.auth });
                    break;
                case 'sdkCheckChanges':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.sdkCheckChanges', { auth: message.auth });
                    break;
                case 'tabActivated': {
                    const tab = message.tab as string;
                    if (tab === 'sdk' && !this._initializedTabs.has('sdk')) {
                        this._initializedTabs.add('sdk');
                        this._sendSdkData();
                    } else if (tab === 'agents') {
                        this._sendAgentData();
                    }
                    break;
                }
            }
        });

        vscode.workspace.onDidChangeConfiguration(() => {
            this._updateStatus();
        });

        // Watch for now.config.json changes to refresh Fluent App info
        const nowConfigWatcher = vscode.workspace.createFileSystemWatcher('**/now.config.json');
        nowConfigWatcher.onDidChange(() => this._updateStatus());
        nowConfigWatcher.onDidCreate(() => this._updateStatus());
        nowConfigWatcher.onDidDelete(() => this._updateStatus());

        // Watch for .vscode/mcp.json changes (VS Code 1.118+) to refresh detected servers
        const mcpJsonWatcher = vscode.workspace.createFileSystemWatcher('**/.vscode/mcp.json');
        mcpJsonWatcher.onDidChange(() => { this._mcpServers = scanMcpServers(); this._updateStatus(); });
        mcpJsonWatcher.onDidCreate(() => { this._mcpServers = scanMcpServers(); this._updateStatus(); });
        mcpJsonWatcher.onDidDelete(() => { this._mcpServers = scanMcpServers(); this._updateStatus(); });

        // Watch for nowdev-ai-config.json changes to pick up memoryLocation and mcpIntegrations
        const aiConfigWatcher = vscode.workspace.createFileSystemWatcher('**/.vscode/nowdev-ai-config.json');
        aiConfigWatcher.onDidChange(() => this._onConfigFileChanged());
        aiConfigWatcher.onDidCreate(() => this._onConfigFileChanged());

        webviewView.onDidDispose(() => {
            this._teardownArtifactWatcher();
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                setTimeout(() => this._updateStatus(), 100);
            }
        });

        webviewView.webview.html = this._getHtml(webviewView.webview);

        // Initial data pushes — load config first so _selectedMcp is ready before _updateStatus
        setTimeout(() => {
            this._onConfigFileChanged();
            this._updateStatus();
            this._sendArtifacts();
        }, 200);
    }

    public refreshStatus() {
        this._updateStatus();
    }

    // ── Data senders ───────────────────────────────────────────────

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

        const fluentApp = this._readNowConfig();

        this._view.webview.postMessage({ command: 'updateStatus', checks, settings, fluentApp, environment: this._environmentInfo, sdkStatus: this._sdkStatus, mcpServers: this._mcpServers, selectedMcp: this._selectedMcp, mcpDocSources: this._mcpDocSources });
        this._writeConfigFile(settings, customInstructionsContent, fluentApp);
    }

    private _sendAgentData() {
        if (!this._view) { return; }
        this._view.webview.postMessage({ command: 'updateAgents', manifests: this._agentManifests, overrides: this._agentOverrides });
    }

    private _sendSdkData(): void {
        if (!this._view) { return; }
        this._authAliases = scanAuthAliases();
        this._view.webview.postMessage({
            command: 'updateSdkData',
            authAliases: this._authAliases,
        });
    }

    private _sendArtifacts() {
        if (!this._view) { return; }
        const content = this._readArtifactsFile();
        if (content === null) {
            this._view.webview.postMessage({ command: 'updateArtifacts', artifacts: [], sessionActive: false });
        } else {
            const artifacts = parseArtifactsMarkdown(content);
            this._view.webview.postMessage({ command: 'updateArtifacts', artifacts, sessionActive: true });
        }
    }

    private _readArtifactsFile(): string | null {
        if (!this._artifactFilePath) { return null; }
        try {
            if (fs.existsSync(this._artifactFilePath)) {
                return fs.readFileSync(this._artifactFilePath, 'utf-8');
            }
        } catch {
            // File may not exist yet
        }
        return null;
    }

    private _onConfigFileChanged(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }

        const configPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'nowdev-ai-config.json');
        try {
            if (!fs.existsSync(configPath)) { return; }
            const raw = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(raw);

            // Load persisted MCP selection and sync the workspace agents
            if (Array.isArray(config.mcpIntegrations)) {
                this._selectedMcp = config.mcpIntegrations as string[];
            }

            // Load persisted doc-MCP sources
            if (config.mcpDocSources && typeof config.mcpDocSources === 'object') {
                const saved = config.mcpDocSources as Partial<McpDocSources>;
                this._mcpDocSources = {
                    classicScripting: { ...DEFAULT_MCP_DOC_SOURCES.classicScripting, ...saved.classicScripting },
                    fluentSdk:        { ...DEFAULT_MCP_DOC_SOURCES.fluentSdk,        ...saved.fluentSdk },
                    general:          { ...DEFAULT_MCP_DOC_SOURCES.general,          ...saved.general },
                };
            }

            // Load per-agent overrides
            if (config.agentOverrides && typeof config.agentOverrides === 'object') {
                this._agentOverrides = config.agentOverrides as Record<string, AgentOverride>;
            }

            // Sync agents whenever config changes
            this._syncWorkspaceAgents();

            const memoryLocation: string | undefined = config.memoryLocation;
            if (!memoryLocation) { return; }

            // Convert file:/// URI to filesystem path
            const resolvedPath = vscode.Uri.parse(memoryLocation).fsPath;

            // Only re-setup if the path actually changed
            if (resolvedPath === this._artifactFilePath) { return; }

            this._setupArtifactWatcher(resolvedPath);
        } catch (err) {
            console.error('Failed to read nowdev-ai-config.json:', err);
        }
    }

    private _syncWorkspaceAgents(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }
        const cfg = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
        const autoUpdate = cfg.get<boolean>('autoUpdateAgentOverrides', true);
        syncAllAgents(
            this._extensionUri.fsPath,
            workspaceFolders[0].uri.fsPath,
            this._agentManifests,
            { mcpIntegrations: this._selectedMcp, agentOverrides: this._agentOverrides, mcpDocSources: this._mcpDocSources, autoUpdate }
        );
    }

    private _setupArtifactWatcher(resolvedPath: string): void {
        this._teardownArtifactWatcher();
        this._artifactFilePath = resolvedPath;

        // Initial read
        this._sendArtifacts();

        // Use fs.watchFile (polling) — works even if file doesn't exist yet,
        // handles files outside the workspace, reliable across platforms including WSL2
        try {
            fs.watchFile(resolvedPath, { interval: 2000 }, (curr, prev) => {
                if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
                    this._sendArtifacts();
                }
            });
        } catch (err) {
            console.error('Failed to watch artifact file:', err);
        }
    }

    private _teardownArtifactWatcher(): void {
        if (this._artifactFilePath) {
            fs.unwatchFile(this._artifactFilePath);
        }
        this._artifactFilePath = null;
    }

    // ── Config helpers ─────────────────────────────────────────────

    private _readNowConfig(): { scope: string; scopeId: string; name: string; scopePrefix: string; numericScopeId: string } | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return null; }

        const configPath = path.join(workspaceFolders[0].uri.fsPath, 'now.config.json');
        try {
            if (!fs.existsSync(configPath)) { return null; }
            const raw = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(raw);
            if (!config.scope) { return null; }

            let scopePrefix = '';
            let numericScopeId = '';
            const scopeMatch = config.scope.match(/^(\w+?)_(\d+)_/);
            if (scopeMatch) {
                scopePrefix = scopeMatch[1];
                numericScopeId = scopeMatch[2];
            }

            return {
                scope: config.scope || '',
                scopeId: config.scopeId || '',
                name: config.name || '',
                scopePrefix,
                numericScopeId,
            };
        } catch (err) {
            console.error('Failed to read now.config.json:', err);
            return null;
        }
    }

    private _writeConfigFile(
        settings: { instanceUrl: string; preferredStyle: string; customInstructionsFile: string },
        customInstructionsContent: string,
        fluentApp: { scope: string; scopeId: string; name: string; scopePrefix: string; numericScopeId: string } | null
    ) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }

        const vscodePath = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
        const configPath = path.join(vscodePath, 'nowdev-ai-config.json');

        const configData: Record<string, unknown> = {
            _comment: 'Auto-generated by NowDev AI Toolbox. Agents read this file for project context. Do not edit manually.',
            instanceUrl: settings.instanceUrl,
            preferredDevelopmentStyle: settings.preferredStyle,
        };

        if (fluentApp) {
            configData.fluentApp = {
                scope: fluentApp.scope,
                scopeId: fluentApp.scopeId,
                name: fluentApp.name,
                scopePrefix: fluentApp.scopePrefix,
                numericScopeId: fluentApp.numericScopeId,
            };
        }

        if (customInstructionsContent) {
            configData.customInstructions = customInstructionsContent;
        }

        if (this._environmentInfo) {
            const env = this._environmentInfo;
            const enabledTools: Record<string, { version: string; label: string; description: string }> = {};
            for (const [key, tool] of Object.entries(env.tools)) {
                if (tool.enabled && (tool.available || tool.manualOverride)) {
                    enabledTools[key] = {
                        version: tool.version,
                        label: tool.label,
                        description: tool.description,
                    };
                }
            }
            configData.environment = {
                os: env.os,
                osVersion: env.osVersion,
                arch: env.arch,
                shell: env.shell,
                availableTools: enabledTools,
            };
        }

        // MCP server selection
        configData.mcpIntegrations = this._selectedMcp;

        // MCP documentation sources
        configData.mcpDocSources = this._mcpDocSources;

        // Per-agent overrides
        if (Object.keys(this._agentOverrides).length > 0) {
            configData.agentOverrides = this._agentOverrides;
        }

        // Preserve agent-written fields (e.g. memoryLocation) that should not be overwritten
        try {
            if (fs.existsSync(configPath)) {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (existing.memoryLocation) {
                    configData.memoryLocation = existing.memoryLocation;
                }
            }
        } catch { /* ignore parse errors */ }

        try {
            if (!fs.existsSync(vscodePath)) {
                fs.mkdirSync(vscodePath, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2) + '\n', 'utf-8');
        } catch (err) {
            console.error('Failed to write nowdev-ai-config.json:', err);
        }
    }

    private _writeConnectionStatusToConfig(state: ConnectionState): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }
        const configPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'nowdev-ai-config.json');
        try {
            if (!fs.existsSync(configPath)) { return; }
            const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            existing.instanceConnection = {
                reachable: state.reachable,
                statusCode: state.statusCode,
                responseTime: state.responseTime,
                error: state.error,
                checkedAt: state.timestamp,
            };
            fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
        } catch { /* ignore */ }
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

    // ── HTML generation ────────────────────────────────────────────

    private _getHtml(webview: vscode.Webview): string {
        const ext = vscode.extensions.getExtension('DanielMadsenDK.nowdev-ai-toolbox');
        const version = ext?.packageJSON?.version ?? '0.0.0';

        const iconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'agent-icon.svg')
        );
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'styles.css')
        );
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'webview', 'main.js')
        );

        const nonce = getNonce();

        return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>

    <!-- Header (always visible) -->
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

    <!-- Tab Bar -->
    <div class="tab-bar">
        <button class="tab-btn active" data-tab="setup">Setup</button>
        <button class="tab-btn" data-tab="sdk">SDK</button>
        <button class="tab-btn" data-tab="tools">Tools</button>
        <button class="tab-btn" data-tab="agents">Agents</button>
        <button class="tab-btn" data-tab="session">Session</button>
    </div>

    <!-- ═══════════ TAB: Setup ═══════════ -->
    <div id="tab-setup" class="tab-content active">

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
                <div class="instance-url-row">
                    <input type="text" id="instanceUrl" placeholder="https://instance.service-now.com" spellcheck="false">
                    <button class="fix-btn" id="testConnection" title="Test reachability of the configured instance">Test</button>
                </div>
                <div id="connectionStatus" class="connection-status"></div>
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

        <!-- Fluent App Info -->
        <div class="section" id="fluentAppSection" style="display:none;">
            <div class="section-title">
                <span>Fluent App</span>
            </div>
            <div class="field-desc" style="margin-bottom: 8px;">
                Detected from <code style="font-size:10px;">now.config.json</code> in the workspace root.
            </div>
            <div class="app-info" id="fluentAppInfo"></div>
        </div>

        <hr id="fluentAppHr" style="display:none;">

        <!-- Initialize Fluent Project CTA (shown when no now.config.json) -->
        <div class="section" id="initFluentSection">
            <div class="section-title">
                <span>Fluent Project</span>
            </div>
            <div class="field-desc" style="margin-bottom: 8px;">
                No <code style="font-size:10px;">now.config.json</code> detected. Run <code style="font-size:10px;">now-sdk init</code> in a terminal to create a new Fluent SDK project.
            </div>
            <button class="btn-secondary" id="initFluentProject">Initialize Fluent Project&hellip;</button>
        </div>

        <hr id="initFluentHr">

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
                    <button class="btn-secondary" id="browseFile">Browse\u2026</button>
                    <button class="btn-clear" id="clearFile" title="Remove instructions file" style="display:none;">\u2715</button>
                </div>
                <div class="file-path" id="filePath" style="display:none;"></div>
            </div>
        </div>

        <hr>

        <!-- MCP Integrations -->
        <div class="section">
            <div class="section-title">
                <span>MCP Integrations</span>
                <button class="fix-btn" id="rescanMcp" title="Re-scan for available MCP servers">Rescan</button>
            </div>
            <div class="field-desc" style="margin-bottom: 8px;">
                Select MCP servers to expose as agent tools. Agent files are automatically kept in sync when servers are toggled or the extension updates. Add servers via the Extensions view <code style="font-size:10px;">@mcp</code> or <code style="font-size:10px;">.vscode/mcp.json</code>.
            </div>
            <div id="mcpServersList">
                <div class="field-desc" style="font-style:italic;">Scanning&hellip;</div>
            </div>

            <div class="field-label" style="margin-top:12px;margin-bottom:6px;">ServiceNow Documentation Sources</div>
            <div class="field-desc" style="margin-bottom:8px;">
                Choose which MCP server agents should use to look up ServiceNow API docs, and optionally provide a library or topic hint. Click the gear icon to configure each source. When set to <em>none</em>, agents fall back to built-in skill knowledge.
            </div>
            <div id="mcpDocSourcesList">
                <!-- rendered by main.js updateMcpDocSources() -->
            </div>
        </div>

        <hr>

        <!-- Resources -->
        <div class="section">
            <div class="section-title">Resources</div>
            <ul class="info-list">
                <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox">GitHub Repository</a></li>
                <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox#readme">Documentation</a></li>
                <li><a href="https://github.com/DanielMadsenDK/NowDev-AI-Toolbox/issues">Report an Issue</a></li>
            </ul>
        </div>
    </div>

    <!-- ═══════════ TAB: SDK ═══════════ -->
    <div id="tab-sdk" class="tab-content">

        <!-- Auth Aliases -->
        <div class="section">
            <div class="section-title">
                <span>Auth Aliases</span>
                <div style="display:flex;gap:4px;">
                    <button class="fix-btn" id="rescanAuthAliases" title="Re-scan auth aliases">Rescan</button>
                    <button class="fix-btn" id="sdkAuthAdd" title="Add a new auth alias">Add&hellip;</button>
                </div>
            </div>
            <div class="field-desc" style="margin-bottom:8px;">
                Credentials stored by <code style="font-size:10px;">now-sdk auth --add</code>
            </div>
            <div id="authAliasesList">
                <div class="field-desc" style="font-style:italic;">Scanning&hellip;</div>
            </div>
        </div>

        <hr>

        <!-- SDK Commands -->
        <div class="section">
            <div class="section-title">SDK Commands</div>
            <div class="sdk-auth-row">
                <label for="sdkCmdAuth" style="font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;">Auth alias</label>
                <select id="sdkCmdAuth">
                    <option value="">(SDK default)</option>
                </select>
            </div>

            <!-- Build -->
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">Build</span>
                        <span class="sdk-cmd-tagline">Compile source files</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        <button class="sdk-help-btn" data-cmd="build" title="Build help">?</button>
                        <button class="sdk-opts-btn" data-opts="opts-build" title="Build options">&#9881;</button>
                        <button class="fix-btn sdk-run-btn" data-cmd="build">Run</button>
                    </div>
                </div>
                <div class="sdk-cmd-opts" id="opts-build">
                    <label class="sdk-opt"><input type="checkbox" id="buildFrozenKeys"> <code>--frozenKeys</code> <span class="sdk-opt-hint">validate keys.ts — use in CI</span></label>
                </div>
                <div class="sdk-cmd-status" id="sdkStatus-build"></div>
            </div>

            <!-- Install -->
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">Install</span>
                        <span class="sdk-cmd-tagline">Deploy to instance</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        <button class="sdk-help-btn" data-cmd="install" title="Install help">?</button>
                        <button class="sdk-opts-btn" data-opts="opts-install" title="Install options">&#9881;</button>
                        <button class="fix-btn" id="installInfoBtn" title="Check last deployment status (--info)">Status</button>
                        <button class="fix-btn sdk-run-btn" data-cmd="install">Run</button>
                    </div>
                </div>
                <div class="sdk-cmd-opts" id="opts-install">
                    <label class="sdk-opt"><input type="checkbox" id="installReinstall"> <code>--reinstall</code> <span class="sdk-opt-hint">uninstall first</span></label>
                    <label class="sdk-opt"><input type="checkbox" id="installOpenBrowser"> <code>--open-browser</code> <span class="sdk-opt-hint">open app record after install</span></label>
                </div>
                <div class="sdk-cmd-status" id="sdkStatus-install"></div>
                <div id="installInfoPanel" class="install-info-panel" style="display:none;"></div>
            </div>

            <!-- Transform -->
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">Transform</span>
                        <span class="sdk-cmd-tagline">Sync instance → source</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        <button class="sdk-help-btn" data-cmd="transform" title="Transform help">?</button>
                        <button class="sdk-opts-btn" data-opts="opts-transform" title="Transform options">&#9881;</button>
                        <button class="fix-btn sdk-run-btn" data-cmd="transform">Run</button>
                    </div>
                </div>
                <div class="sdk-cmd-opts" id="opts-transform">
                    <label class="sdk-opt"><input type="checkbox" id="transformPreview"> <code>--preview</code> <span class="sdk-opt-hint">show output without saving</span></label>
                </div>
                <div class="sdk-cmd-status" id="sdkStatus-transform"></div>
            </div>

            <!-- Dependencies -->
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">Dependencies</span>
                        <span class="sdk-cmd-tagline">Download type definitions</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        <button class="sdk-help-btn" data-cmd="dependencies" title="Dependencies help">?</button>
                        <button class="sdk-opts-btn" data-opts="opts-deps" title="Dependencies options">&#9881;</button>
                        <button class="fix-btn sdk-run-btn" data-cmd="dependencies">Run</button>
                    </div>
                </div>
                <div class="sdk-cmd-opts" id="opts-deps">
                    <div class="sdk-opt-row">
                        <label style="font-size:11px;font-weight:600;">Scope</label>
                        <select id="depsMode">
                            <option value="all">All (scripts + Fluent)</option>
                            <option value="script">Scripts only</option>
                            <option value="fluent">Fluent only</option>
                        </select>
                    </div>
                </div>
                <div class="sdk-cmd-status" id="sdkStatus-dependencies"></div>
            </div>

            <!-- Download -->
            <div class="sdk-cmd-card">
                <div class="sdk-cmd-row">
                    <div class="sdk-cmd-info">
                        <span class="sdk-cmd-name">Download</span>
                        <span class="sdk-cmd-tagline">Fetch metadata from instance</span>
                    </div>
                    <div class="sdk-cmd-actions">
                        <button class="sdk-help-btn" data-cmd="download" title="Download help">?</button>
                        <button class="sdk-opts-btn" data-opts="opts-download" title="Download options">&#9881;</button>
                        <button class="fix-btn" id="checkChangesBtn" title="Count incremental changes on instance without downloading">Check</button>
                        <button class="fix-btn sdk-run-btn" data-cmd="download">Run</button>
                    </div>
                </div>
                <div class="sdk-cmd-opts" id="opts-download">
                    <label class="sdk-opt"><input type="checkbox" id="downloadIncremental" checked> <code>--incremental</code> <span class="sdk-opt-hint">only changed records</span></label>
                </div>
                <div class="sdk-cmd-status" id="sdkStatus-download"></div>
                <div id="checkChangesStatus" class="changes-status" style="display:none;"></div>
            </div>

            <!-- Clean + Pack side by side -->
            <div style="display:flex;gap:6px;">
                <div class="sdk-cmd-card" style="flex:1;">
                    <div class="sdk-cmd-row">
                        <span class="sdk-cmd-name">Clean</span>
                        <div class="sdk-cmd-actions">
                            <button class="sdk-help-btn" data-cmd="clean" title="Clean help">?</button>
                            <button class="fix-btn sdk-run-btn" data-cmd="clean">Run</button>
                        </div>
                    </div>
                    <div class="sdk-cmd-tagline" style="margin-top:2px;">Remove build artifacts</div>
                    <div class="sdk-cmd-status" id="sdkStatus-clean"></div>
                </div>
                <div class="sdk-cmd-card" style="flex:1;">
                    <div class="sdk-cmd-row">
                        <span class="sdk-cmd-name">Pack</span>
                        <div class="sdk-cmd-actions">
                            <button class="sdk-help-btn" data-cmd="pack" title="Pack help">?</button>
                            <button class="fix-btn sdk-run-btn" data-cmd="pack">Run</button>
                        </div>
                    </div>
                    <div class="sdk-cmd-tagline" style="margin-top:2px;">Package into ZIP</div>
                    <div class="sdk-cmd-status" id="sdkStatus-pack"></div>
                </div>
            </div>
        </div>

        <hr>

        <!-- Explain API -->
        <div class="section">
            <div class="section-title">Explain API</div>
            <div class="field-desc" style="margin-bottom:8px;">Open documentation for a ServiceNow Fluent API</div>
            <div class="sdk-explain-row">
                <input type="text" id="explainApiInput" placeholder="e.g. UiPage, Table, Acl" spellcheck="false">
                <button class="fix-btn" id="runExplain">Explain</button>
            </div>
        </div>

    </div>

    <!-- ═══════════ TAB: Tools ═══════════ -->
    <div id="tab-tools" class="tab-content">
        <div class="section">
            <div class="section-title">
                <span>Environment &amp; Tools</span>
                <button class="fix-btn" id="rescanTools" title="Re-scan for available tools">Rescan</button>
            </div>
            <div id="envSummary" class="env-summary"></div>
            <div id="toolsList"></div>
        </div>
    </div>

    <!-- ═══════════ TAB: Agents ═══════════ -->
    <div id="tab-agents" class="tab-content">
        <div class="section">
            <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
                <span>Agent Configuration</span>
                <button class="fix-btn" id="resyncAgents" title="Regenerate all workspace agent files">Resync</button>
            </div>
            <div class="field-desc agents-desc">
                Agent files are written to <code>.github/agents/</code>. Disabled agents are not written to the workspace and are removed from orchestration routing.
            </div>
            <div id="agentCards"></div>
        </div>
    </div>

    <!-- ═══════════ TAB: Session ═══════════ -->
    <div id="tab-session" class="tab-content">
        <div class="section">
            <div class="section-title">Artifact Registry</div>
            <div id="artifactsView"></div>
        </div>
    </div>

    <script nonce="${nonce}" src="${jsUri}"></script>
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

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
