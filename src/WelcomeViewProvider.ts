import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { scanEnvironment, EnvironmentInfo } from './ToolScanner';
import { scanMcpServers, McpServer } from './MCPScanner';
import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { syncAllAgents, AgentOverride, McpDocSources, McpDocSource, DEFAULT_MCP_DOC_SOURCES, DevOpsConfig, DEFAULT_DEVOPS_CONFIG, ProductDocsConfig, DEFAULT_PRODUCT_DOCS_CONFIG, SERVICENOW_RELEASES } from './WorkspaceAgentManager';
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
    private _devopsConfig: DevOpsConfig = { ...DEFAULT_DEVOPS_CONFIG };
    private _productDocsConfig: ProductDocsConfig = { ...DEFAULT_PRODUCT_DOCS_CONFIG };
    private _docsReleases: string[] = [...SERVICENOW_RELEASES];
    private _docsDownloadStatus: { loading: boolean; error?: string } = { loading: false };

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

    /** Returns the currently loaded agent manifests (for topology panel). */
    public getAgentManifests(): AgentManifest[] {
        return this._agentManifests;
    }

    /** Returns the current agent overrides map (for topology panel). */
    public getAgentOverrides(): Record<string, AgentOverride> {
        return this._agentOverrides;
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
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openCopilotChat');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'nowdev-ai-toolbox');
                    break;
                case 'collectCopilotDiagnostics':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.collectCopilotDiagnostics');
                    break;
                case 'showCopilotChatLogs':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.showCopilotChatLogs');
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
                case 'updateDevopsEnabled': {
                    this._devopsConfig = { ...this._devopsConfig, enabled: message.enabled as boolean };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateDevopsMcp': {
                    this._devopsConfig = { ...this._devopsConfig, mcpServer: message.server as string };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'browseDevopsInstructionsFile': {
                    const uris = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { 'Instruction files': ['md', 'txt'] },
                        openLabel: 'Select DevOps Instructions File',
                    });
                    if (uris && uris.length > 0) {
                        try {
                            const content = fs.readFileSync(uris[0].fsPath, 'utf-8');
                            this._devopsConfig = { ...this._devopsConfig, customInstructions: content };
                            this._syncWorkspaceAgents();
                            this._updateStatus();
                            this._view?.webview.postMessage({ command: 'updateDevopsConfig', devopsConfig: this._devopsConfig });
                        } catch { /* ignore read errors */ }
                    }
                    break;
                }
                case 'clearDevopsInstructions': {
                    this._devopsConfig = { ...this._devopsConfig, customInstructions: '' };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._view?.webview.postMessage({ command: 'updateDevopsConfig', devopsConfig: this._devopsConfig });
                    break;
                }
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
                case 'showAgentTopology':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.showAgentTopology');
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
                case 'openDependencyPicker':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openDependencyPicker');
                    break;
                case 'openContextScanner':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openContextScanner');
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
                    } else if (tab === 'docs' && !this._initializedTabs.has('docs')) {
                        this._initializedTabs.add('docs');
                        this._fetchDocsReleasesFromGitHub().catch(() => {});
                    }
                    break;
                }
                case 'updateProductDocsRelease': {
                    this._productDocsConfig = { ...this._productDocsConfig, release: message.release as string };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateProductDocsMode': {
                    this._productDocsConfig = { ...this._productDocsConfig, mode: message.mode as 'remote' | 'local' };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateProductDocsRemoteUrl': {
                    this._productDocsConfig = { ...this._productDocsConfig, remoteUrl: message.url as string };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'browseDocsLocalPath': {
                    const folderUris = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: 'Select Central Docs Folder',
                    });
                    if (folderUris && folderUris.length > 0) {
                        await vscode.workspace.getConfiguration('nowdev-ai-toolbox').update(
                            'docsLocalPath', folderUris[0].fsPath, vscode.ConfigurationTarget.Global
                        ); // triggers onDidChangeConfiguration → _syncWorkspaceAgents + _updateStatus
                        // _updateStatus fires via onDidChangeConfiguration
                    }
                    break;
                }
                case 'syncProductDocs': {
                    await this._downloadServiceNowDocs();
                    break;
                }
                case 'fetchDocsReleases': {
                    await this._fetchDocsReleasesFromGitHub();
                    break;
                }
            }
        });

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nowdev-ai-toolbox.docsLocalPath')) {
                this._syncWorkspaceAgents();
            }
            this._updateStatus();
        });

        // Watch for now.config.json changes to refresh Fluent App info
        const nowConfigWatcher = vscode.workspace.createFileSystemWatcher('**/now.config.json');
        nowConfigWatcher.onDidChange(() => this._updateStatus());
        nowConfigWatcher.onDidCreate(() => this._updateStatus());
        nowConfigWatcher.onDidDelete(() => this._updateStatus());

        // Watch for workspace MCP file changes to refresh detected servers.
        // `.mcp.json` is the current VS Code location; `.vscode/mcp.json` is
        // watched as a legacy fallback for existing workspaces.
        const mcpJsonWatchers = [
            vscode.workspace.createFileSystemWatcher('**/.mcp.json'),
            vscode.workspace.createFileSystemWatcher('**/.vscode/mcp.json'),
        ];
        const refreshMcpServers = () => { this._mcpServers = scanMcpServers(); this._updateStatus(); };
        for (const watcher of mcpJsonWatchers) {
            watcher.onDidChange(refreshMcpServers);
            watcher.onDidCreate(refreshMcpServers);
            watcher.onDidDelete(refreshMcpServers);
        }

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

        const docsRelease = this._productDocsConfig.release;
        this._view.webview.postMessage({ command: 'updateStatus', checks, settings, fluentApp, environment: this._environmentInfo, sdkStatus: this._sdkStatus, mcpServers: this._mcpServers, selectedMcp: this._selectedMcp, mcpDocSources: this._mcpDocSources, devopsConfig: this._devopsConfig, productDocsConfig: this._productDocsConfig, docsReleases: this._docsReleases, docsDownloadStatus: this._docsDownloadStatus, docsGlobalPath: this._getDocsGlobalPath(), docsLastSynced: this._getDocsSyncTime(docsRelease) });
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

            // Load DevOps integration config
            if (config.devopsConfig && typeof config.devopsConfig === 'object') {
                this._devopsConfig = { ...DEFAULT_DEVOPS_CONFIG, ...(config.devopsConfig as Partial<DevOpsConfig>) };
            }

            // Load product documentation config — localPath and lastSynced are global, not restored from file
            if (config.productDocumentation && typeof config.productDocumentation === 'object') {
                const saved = config.productDocumentation as Partial<ProductDocsConfig>;
                this._productDocsConfig = {
                    ...DEFAULT_PRODUCT_DOCS_CONFIG,
                    mode:      saved.mode      ?? DEFAULT_PRODUCT_DOCS_CONFIG.mode,
                    release:   saved.release   ?? DEFAULT_PRODUCT_DOCS_CONFIG.release,
                    remoteUrl: saved.remoteUrl ?? DEFAULT_PRODUCT_DOCS_CONFIG.remoteUrl,
                };
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
        const { release } = this._productDocsConfig;
        const resolvedProductDocsConfig = {
            ...this._productDocsConfig,
            localPath: this._getResolvedDocsPath(release),
            lastSynced: this._getDocsSyncTime(release),
        };
        syncAllAgents(
            this._extensionUri.fsPath,
            workspaceFolders[0].uri.fsPath,
            this._agentManifests,
            { mcpIntegrations: this._selectedMcp, agentOverrides: this._agentOverrides, mcpDocSources: this._mcpDocSources, autoUpdate, devopsConfig: this._devopsConfig, productDocsConfig: resolvedProductDocsConfig }
        );
    }

    private async _fetchDocsReleasesFromGitHub(): Promise<void> {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.github.com',
                path: '/repos/ServiceNow/ServiceNowDocs/branches?per_page=100',
                headers: {
                    'User-Agent': 'NowDev-AI-Toolbox',
                    'Accept': 'application/vnd.github+json',
                },
            };
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const branches = JSON.parse(data) as Array<{ name: string }>;
                        if (!Array.isArray(branches)) { resolve(); return; }
                        const releases = branches
                            .map(b => b.name)
                            .filter(n => n && n !== 'main' && n !== 'HEAD' && !/^v\d/.test(n))
                            .sort((a, b) => b.localeCompare(a));
                        if (releases.length > 0) {
                            this._docsReleases = releases;
                            if (this._view) { this._updateStatus(); }
                        }
                    } catch { /* ignore parse errors — keep hardcoded list */ }
                    resolve();
                });
            });
            req.on('error', () => resolve()); // silent fallback
            req.end();
        });
    }

    private async _downloadServiceNowDocs(): Promise<void> {
        const { release } = this._productDocsConfig;
        if (!release) {
            vscode.window.showErrorMessage('Select a ServiceNow release before downloading.');
            return;
        }
        const destPath = this._getResolvedDocsPath(release);
        if (!destPath) {
            vscode.window.showErrorMessage('Set a central docs folder in Settings before downloading.');
            return;
        }

        this._docsDownloadStatus = { loading: true };
        this._updateStatus();

        try {
            // Fetch the git tree for the selected branch
            const tree = await this._githubGet<{ tree: Array<{ type: string; path: string }> }>(
                `/repos/ServiceNow/ServiceNowDocs/git/trees/${encodeURIComponent(release)}?recursive=1`
            );

            const mdFiles = (tree.tree ?? []).filter(
                (item) => item.type === 'blob' && item.path.endsWith('.md')
            );

            // Download in batches of 10
            const batchSize = 10;
            for (let i = 0; i < mdFiles.length; i += batchSize) {
                const batch = mdFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    const raw = await this._rawGithubGet(
                        `/ServiceNow/ServiceNowDocs/${encodeURIComponent(release)}/${item.path}`
                    );
                    const dest = path.join(destPath, item.path);
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    fs.writeFileSync(dest, raw, 'utf-8');
                }));
            }

            // Also try to fetch llms.txt from root of branch
            try {
                const llmsTxt = await this._rawGithubGet(
                    `/ServiceNow/ServiceNowDocs/${encodeURIComponent(release)}/llms.txt`
                );
                fs.writeFileSync(path.join(destPath, 'llms.txt'), llmsTxt, 'utf-8');
            } catch { /* llms.txt may not exist — not an error */ }

            this._setDocsSyncTime(release, new Date().toISOString());
            this._docsDownloadStatus = { loading: false };
            this._syncWorkspaceAgents();
            this._updateStatus();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._docsDownloadStatus = { loading: false, error: msg };
            this._updateStatus();
            vscode.window.showErrorMessage(`Failed to download docs: ${msg}`);
        }
    }

    private _githubGet<T>(apiPath: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: apiPath,
                headers: {
                    'User-Agent': 'NowDev-AI-Toolbox',
                    'Accept': 'application/vnd.github+json',
                },
            };
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
                res.on('end', () => {
                    try { resolve(JSON.parse(data) as T); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    private _rawGithubGet(rawPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'raw.githubusercontent.com',
                path: rawPath,
                headers: { 'User-Agent': 'NowDev-AI-Toolbox' },
            };
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk: string) => { data += chunk; });
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.end();
        });
    }

    private _getDocsGlobalPath(): string {
        return vscode.workspace.getConfiguration('nowdev-ai-toolbox').get<string>('docsLocalPath', '').trim();
    }

    private _getResolvedDocsPath(release: string): string {
        const base = this._getDocsGlobalPath();
        return base && release ? path.join(base, release) : '';
    }

    private _getDocsSyncTime(release: string): string {
        const base = this._getDocsGlobalPath();
        if (!base || !release) { return ''; }
        const syncFile = path.join(base, '.nowdev-sync.json');
        try {
            if (!fs.existsSync(syncFile)) { return ''; }
            const map = JSON.parse(fs.readFileSync(syncFile, 'utf-8')) as Record<string, string>;
            return map[release] ?? '';
        } catch { return ''; }
    }

    private _setDocsSyncTime(release: string, time: string): void {
        const base = this._getDocsGlobalPath();
        if (!base || !release) { return; }
        const syncFile = path.join(base, '.nowdev-sync.json');
        let map: Record<string, string> = {};
        try {
            if (fs.existsSync(syncFile)) {
                map = JSON.parse(fs.readFileSync(syncFile, 'utf-8')) as Record<string, string>;
            }
        } catch { /* start fresh */ }
        map[release] = time;
        try { fs.writeFileSync(syncFile, JSON.stringify(map, null, 2) + '\n', 'utf-8'); } catch { /* ignore */ }
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

        // DevOps integration config
        configData.devopsConfig = this._devopsConfig;

        // Product documentation config — localPath and lastSynced are derived from the global
        // setting and the central sync file, not stored per-workspace
        const docRelease = this._productDocsConfig.release;
        configData.productDocumentation = {
            ...this._productDocsConfig,
            localPath: this._getResolvedDocsPath(docRelease),
            lastSynced: this._getDocsSyncTime(docRelease),
        };

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

    // ── HTML generation helpers ────────────────────────────────────

    /** Render a single SDK command card. */
    private _sdkCard(opts: {
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
                <div class="sdk-cmd-status" id="${opts.statusId}"></div>
                ${opts.afterHtml ?? ''}
            </div>`;
    }

    /** Render a compact side-by-side pair of minimal SDK command cards. */
    private _sdkCardMini(cards: Array<{ name: string; tagline: string; statusId: string; runCmd: string; runTitle?: string; helpCmd?: string; extra?: string }>): string {
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
                    <div class="sdk-cmd-status" id="${c.statusId}"></div>
                </div>`;
        }).join('');
        return `<div class="sdk-cmd-pair">${inner}</div>`;
    }

    private _renderHomeTab(): string {
        return `
    <!-- ═══════════ TAB: Home ═══════════ -->
    <div id="tab-home" class="tab-content active">

        <!-- At-a-glance workspace status (rendered by main.js) -->
        <div id="workspaceStatus" class="workspace-status"></div>

        <div id="onboardingSummary" class="onboarding-summary"></div>

        <!-- Quick Action -->
        <div class="section">
            <button class="btn-primary" id="openChat" title="Open Copilot Chat (Ctrl+Shift+I)">Open Copilot Chat</button>
            <div class="chat-picker-hint">Pick <strong>NowDev AI Agent</strong> from the agent picker.</div>
        </div>

        <!-- Prerequisites Status -->
        <div class="section">
            <div class="section-title">
                <span>Configuration Status</span>
                <button class="fix-all-btn nd-hidden" id="fixAll" title="Enable all required Copilot settings automatically">Auto-configure</button>
            </div>
            <div id="allGood" class="all-good nd-hidden">All prerequisites configured.</div>
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

        <!-- Session Artifacts (shown only when artifacts exist) -->
        <div id="artifactsSection" class="nd-hidden">
            <div class="section-title artifacts-section-title" id="artifactsSectionHeader">
                Session Artifacts <span id="artifactCount" class="nd-pill"></span>
            </div>
            <div id="artifactsView" class="artifacts-home-body"></div>
        </div>
    </div>`;
    }

    private _renderProjectTab(): string {
        return `
    <!-- ═══════════ TAB: Project ═══════════ -->
    <div id="tab-project" class="tab-content">

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
                Select a .md or .txt file with instructions for the AI agents. These are treated as high-priority directives.
            </div>
            <div class="file-picker">
                <div class="file-picker-row">
                    <button class="btn-secondary" id="browseFile">Browse…</button>
                    <button class="btn-clear nd-hidden" id="clearFile" aria-label="Remove instructions file" title="Remove instructions file">✕</button>
                </div>
                <div class="file-path nd-hidden" id="filePath"></div>
            </div>
        </div>
    </div>`;
    }

    private _renderSdkTab(): string {
        return `
    <!-- ═══════════ TAB: SDK ═══════════ -->
    <div id="tab-sdk" class="tab-content">

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
            <div class="section-title">SDK Commands</div>
            <div class="sdk-auth-row">
                <label for="sdkCmdAuth" class="sdk-auth-label">Auth alias</label>
                <select id="sdkCmdAuth">
                    <option value="">(SDK default)</option>
                </select>
            </div>

            ${this._sdkCard({
                name: 'Build', tagline: 'Compile source files',
                statusId: 'sdkStatus-build', runCmd: 'build',
                helpCmd: 'build', optsId: 'opts-build',
                optsHtml: '<label class="sdk-opt"><input type="checkbox" id="buildFrozenKeys"> <code>--frozenKeys</code> <span class="sdk-opt-hint">validate keys.ts — use in CI</span></label>',
            })}
            ${this._sdkCard({
                name: 'Install', tagline: 'Deploy to instance',
                statusId: 'sdkStatus-install', runCmd: 'install',
                helpCmd: 'install', optsId: 'opts-install',
                optsHtml: `<label class="sdk-opt"><input type="checkbox" id="installReinstall"> <code>--reinstall</code> <span class="sdk-opt-hint">uninstall first</span></label>
                    <label class="sdk-opt"><input type="checkbox" id="installOpenBrowser"> <code>--open-browser</code> <span class="sdk-opt-hint">open app record after install</span></label>`,
                extraBtns: ['<button class="fix-btn" id="installInfoBtn" title="Check last deployment status (--info)">Status</button>'],
                afterHtml: '<div id="installInfoPanel" class="install-info-panel nd-hidden"></div>',
            })}
            ${this._sdkCard({
                name: 'Transform', tagline: 'Sync instance → source',
                statusId: 'sdkStatus-transform', runCmd: 'transform',
                helpCmd: 'transform', optsId: 'opts-transform',
                optsHtml: '<label class="sdk-opt"><input type="checkbox" id="transformPreview"> <code>--preview</code> <span class="sdk-opt-hint">show output without saving</span></label>',
                extraBtns: ['<button class="fix-btn" id="transformFromXmlBtn" title="Transform a local XML file or folder (--from)">From XML&hellip;</button>'],
            })}
            ${this._sdkCard({
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
                    '<button class="fix-btn" id="openDepPickerBtn" title="Browse instance and add dependencies">Browse&hellip;</button>',
                    '<button class="fix-btn" id="openContextScannerBtn" title="Scan instance for relevant scripts and knowledge articles">Scan for Context&hellip;</button>',
                ],
            })}
            ${this._sdkCard({
                name: 'Download', tagline: 'Fetch metadata from instance',
                statusId: 'sdkStatus-download', runCmd: 'download',
                helpCmd: 'download', optsId: 'opts-download',
                optsHtml: '<label class="sdk-opt"><input type="checkbox" id="downloadIncremental" checked> <code>--incremental</code> <span class="sdk-opt-hint">only changed records</span></label>',
                extraBtns: ['<button class="fix-btn" id="checkChangesBtn" title="Count incremental changes on instance without downloading">Check</button>'],
                afterHtml: '<div id="checkChangesStatus" class="changes-status nd-hidden"></div>',
            })}
            ${this._sdkCardMini([
                { name: 'Sync', tagline: 'Download → Transform', statusId: 'sdkStatus-sync', runCmd: 'sync', runTitle: 'Incremental download then transform' },
                { name: 'Move', tagline: 'Global metadata → Fluent', statusId: 'sdkStatus-move', runCmd: 'move', runTitle: 'Transform global metadata into local Fluent code' },
            ])}
            ${this._sdkCardMini([
                { name: 'Clean', tagline: 'Remove build artifacts', statusId: 'sdkStatus-clean', runCmd: 'clean', helpCmd: 'clean' },
                { name: 'Pack',  tagline: 'Package into ZIP',        statusId: 'sdkStatus-pack',  runCmd: 'pack',  helpCmd: 'pack'  },
            ])}
        </div>

        <!-- Explain API -->
        <div class="section">
            <div class="section-title">Explain API</div>
            <div class="field-desc nd-mb-2">Open documentation for a ServiceNow Fluent API</div>
            <div class="sdk-explain-row">
                <input type="text" id="explainApiInput" placeholder="e.g. UiPage, Table, Acl" spellcheck="false">
                <button class="fix-btn" id="runExplain">Explain</button>
            </div>
        </div>

    </div>`;
    }

    private _renderAgentsTab(): string {
        return `
    <!-- ═══════════ TAB: Agents ═══════════ -->
    <div id="tab-agents" class="tab-content">
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
                <button class="fix-btn" id="showCopilotChatLogs" title="Open the Copilot chat log view">Chat Logs</button>
                <button class="fix-btn" id="collectCopilotDiagnostics" title="Collect diagnostics for Copilot support and troubleshooting">Diagnostics</button>
            </div>
            <div id="agentCards"></div>
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

            <div class="field-label nd-section-sublabel">ServiceNow Documentation Sources</div>
            <div class="field-desc nd-mb-2">
                Choose which MCP server agents use to look up ServiceNow API docs. Click the gear to configure each source. When set to <em>none</em>, agents fall back to built-in skill knowledge.
            </div>
            <div id="mcpDocSourcesList">
                <!-- rendered by main.js updateMcpDocSources() -->
            </div>
        </div>

        <!-- DevOps Integration -->
        <div class="section">
            <div class="section-title">
                <span>DevOps Integration</span>
                <label class="tool-toggle" title="Enable/disable DevOps agent">
                    <input type="checkbox" id="devopsEnabled">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="field-desc nd-mb-2">
                Connect a project management MCP server (e.g. Azure DevOps, Jira) so agents can read tasks, update status, and post progress comments automatically.
            </div>
            <div id="devopsConfig" class="nd-hidden">
                <div class="field">
                    <label for="devopsMcpServer">MCP Server</label>
                    <div class="field-desc">Choose the MCP server that provides access to your project management tool.</div>
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
                            <button class="btn-clear nd-hidden" id="clearDevopsFile" aria-label="Remove DevOps instructions file" title="Remove instructions file">&#10005;</button>
                        </div>
                        <div class="file-path nd-hidden" id="devopsFilePath"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    }

    private _renderToolsTab(): string {
        return `
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
    </div>`;
    }

    private _renderDocsTab(): string {
        return `
    <!-- ═══════════ TAB: Docs ═══════════ -->
    <div id="tab-docs" class="tab-content">

        <div class="section">
            <div class="section-title">
                <span>ServiceNow Release</span>
                <button class="fix-btn" id="fetchDocsReleases" title="Fetch latest branches from GitHub">Refresh</button>
            </div>
            <div class="field-desc nd-mb-2">Select the release you are targeting in this project.</div>
            <div class="field">
                <select id="docsRelease">
                    <option value="">(select a release)</option>
                </select>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Documentation Source</div>
            <div class="field docs-mode-field">
                <label class="docs-mode-label">
                    <input type="radio" name="docsMode" value="remote" id="docsModeRemote" class="docs-mode-radio">
                    <span>Remote (llms.txt URL)</span>
                </label>
                <div class="field-desc docs-mode-hint">Agents fetch documentation live from the configured URL.</div>
                <label class="docs-mode-label">
                    <input type="radio" name="docsMode" value="local" id="docsModeLocal" class="docs-mode-radio">
                    <span>Local (downloaded copy)</span>
                </label>
                <div class="field-desc docs-mode-hint">Download docs from GitHub for the selected release. Agents read from the local folder.</div>
            </div>
        </div>

        <div id="docsRemoteSection">
            <div class="section">
                <div class="section-title">llms.txt URL</div>
                <div class="field-desc nd-mb-2">The URL agents will use to discover documentation. Defaults to the official ServiceNow endpoint.</div>
                <div class="field">
                    <input type="text" id="docsRemoteUrl"
                           placeholder="https://www.servicenow.com/llms.txt"
                           spellcheck="false" autocomplete="off">
                </div>
            </div>
        </div>

        <div id="docsLocalSection" class="nd-hidden">
            <div class="section">
                <div class="section-title">Central Docs Folder</div>
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
            <div class="section">
                <div class="section-title">
                    <span>Sync Documentation</span>
                    <button class="fix-btn" id="syncProductDocs">Download / Update</button>
                </div>
                <div id="docsDownloadStatus" class="field-desc"></div>
            </div>
        </div>

    </div>`;
    }

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
        <button class="header-chat-btn" id="openChatHeader" aria-label="Open Copilot Chat" title="Open Copilot Chat (Ctrl+Shift+I)">Chat &rsaquo;</button>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar">
        <button class="tab-btn active" data-tab="home">Home</button>
        <button class="tab-btn" data-tab="project">Project</button>
        <button class="tab-btn" data-tab="sdk">SDK</button>
        <button class="tab-btn" data-tab="agents">Agents</button>
        <button class="tab-btn" data-tab="tools">Tools</button>
        <button class="tab-btn" data-tab="docs">Docs</button>
    </div>

    ${this._renderHomeTab()}
    ${this._renderProjectTab()}
    ${this._renderSdkTab()}
    ${this._renderAgentsTab()}
    ${this._renderToolsTab()}
    ${this._renderDocsTab()}

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
