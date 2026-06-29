import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { scanEnvironment, EnvironmentInfo } from './ToolScanner';
import { scanMcpServers, McpServer } from './MCPScanner';
import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { syncAllAgents, syncWorkspaceInstructionsFile, syncWorkspacePromptFiles, AgentOverride, McpIntegrationConfig, DocSource, AllDocSources, DEFAULT_ALL_DOC_SOURCES, DevOpsConfig, DEFAULT_DEVOPS_CONFIG, SERVICENOW_RELEASES, LOCKED_AGENT_NAMES, AGENT_BUNDLES, getAgentBundleName, GuidelinesConfig } from './WorkspaceAgentManager';
import { BUILT_IN_PROFILES, DEFAULT_PROFILE_ID, getProfileById, getEffectiveAgentConfig } from './ProfileManager';
import { readArtifactStateFile, writeArtifactStateFile } from './ArtifactStateManager';
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

interface AvailableAgentModel {
    label: string;
    value: string;
}

type PrerequisiteStatusKind = 'enabled' | 'disabled-by-user' | 'disabled-by-policy' | 'unknown';

interface PrerequisiteStatus {
    id: string;
    label: string;
    setting: string;
    ok: boolean;
    status: PrerequisiteStatusKind;
    fixable: boolean;
    managedByPolicy: boolean;
    preview?: boolean;
    optional?: boolean;
    message: string;
}

interface RequiredSetting {
    section: string;
    prop: string;
    expected: unknown;
    label: string;
    preview?: boolean;
    optional?: boolean;
}

type InspectWithPolicy = { policyValue?: unknown };

function normalizeModelOverride(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? item.trim() : '').find(Boolean) ?? '';
    }
    if (typeof value === 'string') {
        return value.split(/[\n,]/).map(item => item.trim()).find(Boolean) ?? '';
    }
    return '';
}

function resolveInside(root: string, child: string): string | undefined {
    if (!isSafeRelativePath(child)) {
        return undefined;
    }
    const relative = child.split('/').filter(segment => segment && segment !== '.').join(path.sep);
    return `${root.endsWith(path.sep) ? root : `${root}${path.sep}`}${relative}`;
}

function isSafeRelativePath(value: string): boolean {
    return !!value && !value.includes('..') && !path.isAbsolute(value) && /^[\w .\-/]+$/.test(value);
}

/**
 * MCP servers matching any of these patterns are automatically added to the
 * active integration list the first time they are detected — unless the user
 * has explicitly dismissed them via the toggle.
 */
const AUTO_ENABLE_MCP_PATTERNS: RegExp[] = [
    /context7/i,   // io.github.upstash/context7, context7, github.com/upstash/context7, …
];

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
    private _mcpUserDismissed: string[] = [];   // servers the user explicitly toggled off — never auto-re-enabled
    private _mcpIntegrationConfigs: Record<string, McpIntegrationConfig> = {};
    private _allDocSources: AllDocSources = { ...DEFAULT_ALL_DOC_SOURCES, productDocs: { ...DEFAULT_ALL_DOC_SOURCES.productDocs }, sdkDocs: { ...DEFAULT_ALL_DOC_SOURCES.sdkDocs }, classicScripting: { ...DEFAULT_ALL_DOC_SOURCES.classicScripting } };
    private _agentManifests: AgentManifest[] = [];
    private _agentOverrides: Record<string, AgentOverride> = {};
    private _devopsConfig: DevOpsConfig = { ...DEFAULT_DEVOPS_CONFIG };
    private _guidelinesConfig: GuidelinesConfig = { enabled: false, selectedArticles: [] };
    private _activeProfileId: string = DEFAULT_PROFILE_ID;
    private _profileInstructionsOverrides: Record<string, string> = {};
    private _docsReleases: string[] = [...SERVICENOW_RELEASES];
    private _docsDownloadStatus: { loading: boolean; downloaded?: number; total?: number; error?: string; cancelled?: boolean } = { loading: false };
    private _policyBlockedSettings = new Set<string>();
    private _abortDownload = false;
    private _statusUpdateTimer: NodeJS.Timeout | undefined;
    private _agentSyncTimer: NodeJS.Timeout | undefined;
    private _chatModelListener?: vscode.Disposable;

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
        this._syncWorkspaceAgents(true);
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
        this._applyAutoEnableMcp();
        this._syncWorkspaceAgents();
        if (this._view) { this._updateStatus(); }
    }

    /**
     * Auto-enables any detected MCP server that matches AUTO_ENABLE_MCP_PATTERNS
     * and has not been explicitly dismissed by the user.
     * Returns true if the selection changed (caller should re-sync agents).
     */
    private _applyAutoEnableMcp(): boolean {
        let changed = false;
        for (const server of this._mcpServers) {
            if (
                AUTO_ENABLE_MCP_PATTERNS.some(p => p.test(server.name)) &&
                !this._selectedMcp.includes(server.name) &&
                !this._mcpUserDismissed.includes(server.name)
            ) {
                this._selectedMcp = [...this._selectedMcp, server.name];
                changed = true;
            }
        }
        return changed;
    }

    /**
     * Runs the environment scan, respecting user-disabled tools.
     * Called on activation and when the user toggles a tool.
     */
    public async scanTools(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
            const disabledTools = config.get<string[]>('disabledTools', []);
            const enabledTools = config.get<string[]>('enabledTools', []);
            this._environmentInfo = await scanEnvironment(disabledTools, enabledTools);
        } catch (err) {
            console.error('Environment scan failed:', err);
            this._environmentInfo = null;
        }
        if (this._view) { this._updateStatus(); }
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
                case 'openArtifactState':
                    await this._openArtifactStateFile();
                    break;
                case 'resetArtifactState':
                    await this._resetArtifactStateFile();
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
                case 'openGuidelinesBrowser':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openInstanceBrowser', 'guidelines');
                    break;
                case 'toggleMcp': {
                    const mcpName = message.name as string;
                    const nowEnabled = message.enabled as boolean;
                    if (nowEnabled) {
                        if (!this._selectedMcp.includes(mcpName)) {
                            this._selectedMcp = [...this._selectedMcp, mcpName];
                        }
                        // Re-enabling: remove from dismissed list so auto-enable keeps it on next scan
                        this._mcpUserDismissed = this._mcpUserDismissed.filter(n => n !== mcpName);
                    } else {
                        this._selectedMcp = this._selectedMcp.filter(n => n !== mcpName);
                        // Record explicit dismissal so auto-enable never re-adds it without user consent
                        if (!this._mcpUserDismissed.includes(mcpName)) {
                            this._mcpUserDismissed = [...this._mcpUserDismissed, mcpName];
                        }
                    }
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateMcpConfig': {
                    const serverName = message.server as string;
                    const mode       = message.mode as 'all' | 'custom';
                    const methods    = message.methods as string[] | undefined;
                    this._mcpIntegrationConfigs = {
                        ...this._mcpIntegrationConfigs,
                        [serverName]: { mode, allowedMethods: methods ?? [] },
                    };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'updateDocSource': {
                    const category = message.category as keyof AllDocSources;
                    const patch = message.patch as Partial<DocSource & { release?: string }>;
                    if (category in this._allDocSources) {
                        this._allDocSources = {
                            ...this._allDocSources,
                            [category]: { ...this._allDocSources[category], ...patch },
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
                case 'setActiveProfile': {
                    this._activeProfileId = message.profileId as string;
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._sendAgentData();
                    break;
                }
                case 'saveProfileInstructions': {
                    this._profileInstructionsOverrides = {
                        ...this._profileInstructionsOverrides,
                        [this._activeProfileId]: message.instructions as string,
                    };
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
                case 'resetProfileInstructions': {
                    const updated = { ...this._profileInstructionsOverrides };
                    delete updated[this._activeProfileId];
                    this._profileInstructionsOverrides = updated;
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    break;
                }
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
                    if (LOCKED_AGENT_NAMES.has(agentName)) { break; } // locked — silently ignore
                    const bundleName = getAgentBundleName(agentName);
                    const agentsToToggle = bundleName ? AGENT_BUNDLES[bundleName] : [agentName];
                    for (const name of agentsToToggle) {
                        const cur = this._agentOverrides[name] ?? { enabled: true, disabledTools: [] };
                        this._agentOverrides[name] = { ...cur, enabled: agentEnabled };
                    }
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._sendAgentData();
                    break;
                }
                case 'toggleBundle': {
                    const bundleName = message.bundle as string;
                    const bundleEnabled = message.enabled as boolean;
                    const members = AGENT_BUNDLES[bundleName];
                    if (!members) { break; }
                    for (const name of members) {
                        const cur = this._agentOverrides[name] ?? { enabled: true, disabledTools: [] };
                        this._agentOverrides[name] = { ...cur, enabled: bundleEnabled };
                    }
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
                case 'updateAgentModel': {
                    const agentName = message.agentName as string;
                    const model = normalizeModelOverride(message.model);
                    const cur: AgentOverride = this._agentOverrides[agentName] ?? { enabled: true, disabledTools: [] };
                    if (model) {
                        this._agentOverrides[agentName] = { ...cur, model };
                    } else {
                        const next: AgentOverride = { ...cur };
                        delete next.model;
                        if (next.enabled === true && next.disabledTools.length === 0) {
                            delete this._agentOverrides[agentName];
                        } else {
                            this._agentOverrides[agentName] = next;
                        }
                    }
                    this._syncWorkspaceAgents();
                    this._updateStatus();
                    this._sendAgentData();
                    break;
                }
                case 'resyncAgents':
                    this._syncWorkspaceAgents(true);
                    this._sendAgentData();
                    break;
                case 'applyModelPresets':
                    await this._applyModelPresets();
                    break;
                case 'openAgentFile': {
                    const agentFileName = message.filename as string;
                    const folders = vscode.workspace.workspaceFolders;
                    if (!folders || folders.length === 0) { break; }
                    if (!/^[\w.-]+\.agent\.md$/.test(agentFileName)) { break; }
                    const agentsDir = path.join(folders[0].uri.fsPath, '.github', 'agents');
                    const agentFilePath = resolveInside(agentsDir, agentFileName);
                    if (!agentFilePath) { break; }
                    if (!fs.existsSync(agentFilePath)) {
                        vscode.window.showInformationMessage(`Agent file not found. Run Resync to generate agent files.`);
                    } else {
                        const doc = await vscode.workspace.openTextDocument(agentFilePath);
                        vscode.window.showTextDocument(doc);
                    }
                    break;
                }
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
                    await this.scanTools();
                    break;
                }
                case 'rescanTools':
                    await this.scanTools();
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
                case 'openInstanceBrowser':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openInstanceBrowser');
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
                case 'sdkQuery':
                    vscode.commands.executeCommand(
                        'nowdev-ai-toolbox.sdkQuery',
                        message.table, message.query, message.fields,
                        message.limit, message.displayValue, 0, 1
                    );
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
                case 'cancelDocsDownload': {
                    this._abortDownload = true;
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
        const refreshMcpServers = () => {
            this._mcpServers = scanMcpServers();
            if (this._applyAutoEnableMcp()) { this._syncWorkspaceAgents(); }
            this._updateStatus();
        };
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
            this._chatModelListener?.dispose();
            this._chatModelListener = undefined;
        });

        if (!this._chatModelListener) {
            this._chatModelListener = vscode.lm.onDidChangeChatModels(() => {
                void this._sendAgentData();
            });
        }

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
        if (this._statusUpdateTimer) { clearTimeout(this._statusUpdateTimer); }
        this._statusUpdateTimer = setTimeout(() => {
            this._statusUpdateTimer = undefined;
            this._sendStatusNow();
        }, 120);
    }

    private _sendStatusNow() {
        if (!this._view) { return; }

        const checks = this._getPrerequisiteStatuses();

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

        const docsRelease = this._allDocSources.productDocs.release ?? '';
        const activeProfile = getProfileById(this._activeProfileId) ?? getProfileById(DEFAULT_PROFILE_ID)!;
        const hasCustomInstructions = Object.prototype.hasOwnProperty.call(this._profileInstructionsOverrides, this._activeProfileId);
        const currentInstructions = hasCustomInstructions
            ? this._profileInstructionsOverrides[this._activeProfileId]
            : activeProfile.profileInstructions;
        this._view.webview.postMessage({ command: 'updateStatus', checks, settings, fluentApp, environment: this._environmentInfo, sdkStatus: this._sdkStatus, mcpServers: this._mcpServers, selectedMcp: this._selectedMcp, mcpIntegrationConfigs: this._mcpIntegrationConfigs, allDocSources: this._allDocSources, devopsConfig: this._devopsConfig, guidelinesConfig: this._guidelinesConfig, docsReleases: this._docsReleases, docsDownloadStatus: this._docsDownloadStatus, docsGlobalPath: this._getDocsGlobalPath(), docsLastSynced: this._getDocsSyncTime(docsRelease), profiles: BUILT_IN_PROFILES.map(p => ({ id: p.id, label: p.label, description: p.description })), activeProfileId: this._activeProfileId, profileInstructions: currentInstructions, profileHasCustomInstructions: hasCustomInstructions });
        this._writeConfigFile(settings, customInstructionsContent, fluentApp);
    }

    private _sendAgentData() {
        if (!this._view) { return; }
        const profile = getProfileById(this._activeProfileId) ?? getProfileById(DEFAULT_PROFILE_ID)!;
        const suppressedAgents = new Set(profile.suppressedAgents ?? []);
        const enrichedManifests = this._agentManifests.map(m => ({
            ...m,
            locked: LOCKED_AGENT_NAMES.has(m.name),
            bundle: getAgentBundleName(m.name),
            profileSuppressed: suppressedAgents.has(m.name),
            model: this._agentOverrides[m.name]?.model ?? m.model ?? '',
        }));
        void this._getAvailableAgentModels().then(modelOptions => {
            this._view?.webview.postMessage({ command: 'updateAgents', manifests: enrichedManifests, overrides: this._agentOverrides, modelOptions });
        });
    }

    private async _getAvailableAgentModels(): Promise<AvailableAgentModel[]> {
        try {
            const chatModels = await vscode.lm.selectChatModels();
            return chatModels
                .map(model => ({
                    label: `${model.name} (${model.vendor})`,
                    value: `${model.name} (${model.vendor})`,
                }))
                .sort((left, right) => left.label.localeCompare(right.label));
        } catch {
            return [];
        }
    }

    private async _applyModelPresets(): Promise<void> {
        const modelOptions = await this._getAvailableAgentModels();
        const strongModels = this._selectPreferredModels(modelOptions, [
            /gpt-5/i,
            /claude.*(opus|sonnet)/i,
            /gemini.*2\.5.*pro/i,
            /o[34]/i,
        ]);
        const fastModels = this._selectPreferredModels(modelOptions, [
            /mini/i,
            /flash/i,
            /haiku/i,
            /nano/i,
        ]);

        if (strongModels.length === 0 && fastModels.length === 0) {
            vscode.window.showWarningMessage('No selectable chat models were reported by VS Code. Model presets were not applied.');
            return;
        }

        const plannerReviewerModels = this._uniqueModels([...strongModels, ...fastModels]).slice(0, 1);
        const routerModels = this._uniqueModels([...fastModels, ...strongModels]).slice(0, 1);
        const plannerReviewerAgents = new Set([
            'NowDev AI Agent',
            'NowDev-AI-Refinement',
            'NowDev-AI-Reviewer',
            'NowDev-AI-Classic-Reviewer',
            'NowDev-AI-Fluent-Reviewer',
        ]);
        const routerAgents = new Set([
            'NowDev-AI-Classic-Developer',
            'NowDev-AI-Fluent-Developer',
            'NowDev-AI-AI-Studio-Developer',
            'NowDev-AI-Release-Expert',
        ]);

        let updated = 0;
        for (const manifest of this._agentManifests) {
            const models = plannerReviewerAgents.has(manifest.name) ? plannerReviewerModels : routerAgents.has(manifest.name) ? routerModels : [];
            if (models.length === 0) { continue; }
            const cur = this._agentOverrides[manifest.name] ?? { enabled: true, disabledTools: [] };
            this._agentOverrides[manifest.name] = { ...cur, model: models[0] };
            updated++;
        }

        this._syncWorkspaceAgents();
        this._updateStatus();
        this._sendAgentData();
        vscode.window.showInformationMessage(`Applied model presets to ${updated} agent${updated === 1 ? '' : 's'}.`);
    }

    private _selectPreferredModels(modelOptions: AvailableAgentModel[], patterns: RegExp[]): string[] {
        const matches: string[] = [];
        for (const pattern of patterns) {
            for (const option of modelOptions) {
                if (pattern.test(option.value) && !matches.includes(option.value)) {
                    matches.push(option.value);
                }
            }
        }
        return matches;
    }

    private _uniqueModels(models: string[]): string[] {
        return [...new Set(models.map(model => model.trim()).filter(Boolean))];
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
        if (!this._artifactFilePath) {
            this._view.webview.postMessage({ command: 'updateArtifacts', artifacts: [], sessionActive: false, errors: [] });
            return;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const result = readArtifactStateFile(this._artifactFilePath, workspaceRoot);
        this._view.webview.postMessage({ command: 'updateArtifacts', artifacts: result.artifacts, sessionActive: result.sessionActive, errors: result.errors });
    }

    private async _openArtifactStateFile(): Promise<void> {
        if (!this._artifactFilePath) {
            vscode.window.showInformationMessage('Artifact state file has not been initialized yet.');
            return;
        }
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(this._artifactFilePath));
        await vscode.window.showTextDocument(doc);
    }

    private async _resetArtifactStateFile(): Promise<void> {
        if (!this._artifactFilePath) {
            vscode.window.showInformationMessage('Artifact state file has not been initialized yet.');
            return;
        }
        const confirmed = await vscode.window.showWarningMessage(
            'Reset the current NowDev artifact state? This clears the session artifact registry but leaves generated files untouched.',
            { modal: true },
            'Reset Artifact State'
        );
        if (confirmed !== 'Reset Artifact State') { return; }
        const document = {
            version: 1 as const,
            sessionId: `session-${Date.now().toString(36)}`,
            updatedAt: new Date().toISOString(),
            artifacts: [],
        };
        writeArtifactStateFile(this._artifactFilePath, document);
        this._sendArtifacts();
    }

    private _onConfigFileChanged(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }

        const configPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'nowdev-ai-config.json');
        try {
            if (!fs.existsSync(configPath)) { return; }
            const raw = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(raw);

            // Load persisted MCP selection
            if (Array.isArray(config.mcpIntegrations)) {
                this._selectedMcp = config.mcpIntegrations as string[];
            }

            // Load list of servers the user has explicitly disabled (so auto-enable doesn't fight them)
            if (Array.isArray(config.mcpUserDismissed)) {
                this._mcpUserDismissed = config.mcpUserDismissed as string[];
            }

            // Auto-enable any newly detected servers that match the pattern (e.g. context7)
            this._applyAutoEnableMcp();

            // Load per-MCP-server access configs
            if (config.mcpIntegrationConfigs && typeof config.mcpIntegrationConfigs === 'object') {
                this._mcpIntegrationConfigs = config.mcpIntegrationConfigs as Record<string, McpIntegrationConfig>;
            }

            // Load unified doc sources (new format)
            if (config.allDocSources && typeof config.allDocSources === 'object') {
                const saved = config.allDocSources as Partial<AllDocSources>;
                this._allDocSources = {
                    productDocs:      { ...DEFAULT_ALL_DOC_SOURCES.productDocs,      ...saved.productDocs },
                    sdkDocs:          { ...DEFAULT_ALL_DOC_SOURCES.sdkDocs,          ...saved.sdkDocs },
                    classicScripting: { ...DEFAULT_ALL_DOC_SOURCES.classicScripting, ...saved.classicScripting },
                };
            } else {
                // Migrate from legacy separate keys
                const legacyMcp = config.mcpDocSources as { classicScripting?: { server?: string; libraryHint?: string }; fluentSdk?: { server?: string } } | undefined;
                const legacyPd  = config.productDocumentation as { mode?: string; release?: string; remoteUrl?: string } | undefined;
                this._allDocSources = {
                    productDocs: {
                        ...DEFAULT_ALL_DOC_SOURCES.productDocs,
                        sourceType: 'llms-txt' as const,
                        llmsMode:   (legacyPd?.mode ?? 'remote') as 'remote' | 'local',
                        llmsUrl:    legacyPd?.remoteUrl ?? DEFAULT_ALL_DOC_SOURCES.productDocs.llmsUrl,
                        release:    legacyPd?.release ?? '',
                    },
                    sdkDocs: {
                        ...DEFAULT_ALL_DOC_SOURCES.sdkDocs,
                        sourceType: (legacyMcp?.fluentSdk?.server ? 'mcp' : 'none') as 'mcp' | 'none',
                        mcpServer:  legacyMcp?.fluentSdk?.server ?? '',
                        mcpLibraryHint: '',
                    },
                    classicScripting: {
                        ...DEFAULT_ALL_DOC_SOURCES.classicScripting,
                        sourceType: (legacyMcp?.classicScripting?.server ? 'mcp' : 'none') as 'mcp' | 'none',
                        mcpServer:  legacyMcp?.classicScripting?.server ?? '',
                        mcpLibraryHint: '',
                    },
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

            // Load instance-backed guideline references
            if (config.guidelines && typeof config.guidelines === 'object') {
                this._guidelinesConfig = {
                    enabled: false,
                    selectedArticles: [],
                    ...(config.guidelines as Partial<GuidelinesConfig>),
                };
            }

            // Load active profile
            if (typeof config.activeProfile === 'string' && getProfileById(config.activeProfile)) {
                this._activeProfileId = config.activeProfile;
            }

            // Load profile instructions overrides (user customizations that survive upgrades)
            if (config.profileInstructionsOverrides && typeof config.profileInstructionsOverrides === 'object') {
                this._profileInstructionsOverrides = config.profileInstructionsOverrides as Record<string, string>;
            }

            // Sync agents whenever config changes
            this._syncWorkspaceAgents();

            const resolvedPath = this._resolveArtifactStatePath(workspaceFolders[0].uri.fsPath, config);
            if (!resolvedPath) { return; }

            // Only re-setup if the path actually changed
            if (resolvedPath === this._artifactFilePath) { return; }

            this._setupArtifactWatcher(resolvedPath);
        } catch (err) {
            console.error('Failed to read nowdev-ai-config.json:', err);
        }
    }

    private _syncWorkspaceAgents(immediate = false): void {
        if (!immediate) {
            if (this._agentSyncTimer) { clearTimeout(this._agentSyncTimer); }
            this._agentSyncTimer = setTimeout(() => {
                this._agentSyncTimer = undefined;
                this._syncWorkspaceAgentsNow();
            }, 150);
            return;
        }
        if (this._agentSyncTimer) {
            clearTimeout(this._agentSyncTimer);
            this._agentSyncTimer = undefined;
        }
        this._syncWorkspaceAgentsNow();
    }

    private _syncWorkspaceAgentsNow(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }
        const cfg = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
        const autoUpdate = cfg.get<boolean>('autoUpdateAgentOverrides', true);

        const release = this._allDocSources.productDocs.release ?? '';
        const resolvedAllDocSources: AllDocSources = {
            ...this._allDocSources,
            productDocs: {
                ...this._allDocSources.productDocs,
                localPath: this._getResolvedDocsPath(release),
                lastSynced: this._getDocsSyncTime(release),
            },
        };

        const profile = getProfileById(this._activeProfileId) ?? getProfileById(DEFAULT_PROFILE_ID)!;
        const effective = getEffectiveAgentConfig(profile, this._mcpIntegrationConfigs, this._profileInstructionsOverrides);
        const customInstructions = this._readCustomInstructionsFile();
        const agentGuidelines = this._formatAgentGuidelines();

        // If the profile requests DevOps when configured, force-enable it whenever a server is set.
        // This lets the PO profile include the DevOps agent without requiring the user to manually
        // toggle the separate devopsConfig.enabled switch.
        const effectiveDevopsConfig =
            profile.devopsEnabledWhenConfigured && this._devopsConfig.mcpServer
                ? { ...this._devopsConfig, enabled: true }
                : this._devopsConfig;

        syncAllAgents(
            this._extensionUri.fsPath,
            workspaceFolders[0].uri.fsPath,
            this._agentManifests,
            {
                mcpIntegrations: this._selectedMcp,
                mcpIntegrationConfigs: effective.mcpIntegrationConfigs,
                agentOverrides: this._agentOverrides,
                allDocSources: resolvedAllDocSources,
                autoUpdate,
                devopsConfig: effectiveDevopsConfig,
                profileSuppressedAgents: effective.suppressedAgents,
                profileInstructions: effective.profileInstructions,
                customInstructions,
                agentGuidelines,
                activeProfileId: profile.id,
            }
        );
        syncWorkspaceInstructionsFile(workspaceFolders[0].uri.fsPath, {
            autoUpdate,
            activeProfileId: profile.id,
            profileInstructions: effective.profileInstructions,
            customInstructions,
            agentGuidelines,
        });
        syncWorkspacePromptFiles(workspaceFolders[0].uri.fsPath, autoUpdate);
    }

    private _formatAgentGuidelines(): string {
        const cfg = this._guidelinesConfig;
        if (!cfg.enabled || !cfg.selectedArticles.length) { return ''; }
        const ids = cfg.selectedArticles.map(a => a.sysId).filter(Boolean);
        const refs = cfg.selectedArticles
            .map(a => `- ${a.number ? `${a.number}: ` : ''}${a.title}${a.state ? ` (${a.state})` : ''}${a.updatedOn ? ` — updated ${a.updatedOn}` : ''}`)
            .join('\n');
        const query = ids.length > 0
            ? `now-sdk query kb_knowledge -q 'sys_idIN${ids.join(',')}' -f 'sys_id,number,short_description,text,workflow_state,sys_updated_on' -o json`
            : '';
        return `The workspace has selected ServiceNow Knowledge Base articles as agent guidelines. Treat them as project guidance and fetch live article content when details are needed.\n\nSelected articles:\n${refs}\n\n${query ? `Use this live lookup when guideline details are needed:\n\`${query}\`` : ''}`;
    }

    private _readCustomInstructionsFile(): string {
        const customInstructionsFile = vscode.workspace.getConfiguration('nowdev-ai-toolbox').get<string>('customInstructionsFile', '');
        if (!customInstructionsFile) { return ''; }
        try {
            return fs.readFileSync(customInstructionsFile, 'utf-8');
        } catch (err) {
            console.error('Failed to read custom instructions file:', err);
            return '';
        }
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
        const release = this._allDocSources.productDocs.release ?? '';
        if (!release) {
            vscode.window.showErrorMessage('Select a ServiceNow release before downloading.');
            return;
        }
        const destPath = this._getResolvedDocsPath(release);
        if (!destPath) {
            vscode.window.showErrorMessage('Set a central docs folder in Settings before downloading.');
            return;
        }

        this._abortDownload = false;
        this._docsDownloadStatus = { loading: true };
        this._updateStatus();

        try {
            // Fetch the git tree for the selected branch
            const tree = await this._githubGet<{ tree: Array<{ type: string; path: string }> }>(
                `/repos/ServiceNow/ServiceNowDocs/git/trees/${encodeURIComponent(release)}?recursive=1`
            );

            const mdFiles = (tree.tree ?? []).filter(
                (item) => item.type === 'blob' && item.path.endsWith('.md') && isSafeRelativePath(item.path)
            );
            const total = mdFiles.length;

            // Download in batches of 10, reporting progress after each batch
            const batchSize = 10;
            let downloaded = 0;
            for (let i = 0; i < total; i += batchSize) {
                if (this._abortDownload) { break; }
                const batch = mdFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    const raw = await this._rawGithubGet(
                        `/ServiceNow/ServiceNowDocs/${encodeURIComponent(release)}/${item.path}`
                    );
                    const dest = resolveInside(destPath, item.path);
                    if (!dest) { return; }
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    fs.writeFileSync(dest, raw, 'utf-8');
                }));
                downloaded = Math.min(i + batchSize, total);
                this._view?.webview.postMessage({ command: 'docsProgress', downloaded, total });
            }

            if (this._abortDownload) {
                this._docsDownloadStatus = { loading: false, cancelled: true, downloaded, total };
                this._updateStatus();
                return;
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
        if (!base || !release || !/^[\w .-]+$/.test(release)) { return ''; }
        return resolveInside(base, release) ?? '';
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

    private _resolveArtifactStatePath(workspaceRoot: string, config: Record<string, unknown>): string | undefined {
        const artifactState = config.artifactState as { path?: unknown } | undefined;
        if (artifactState && typeof artifactState.path === 'string') {
            return resolveInside(workspaceRoot, artifactState.path);
        }

        if (typeof config.artifactStateLocation === 'string') {
            return this._resolveArtifactLocation(workspaceRoot, config.artifactStateLocation);
        }

        if (typeof config.memoryLocation === 'string') {
            return this._resolveArtifactLocation(workspaceRoot, config.memoryLocation);
        }

        return undefined;
    }

    private _resolveArtifactLocation(workspaceRoot: string, location: string): string | undefined {
        if (/^[a-z][a-z0-9+.-]*:/i.test(location)) {
            try { return vscode.Uri.parse(location).fsPath; } catch { return undefined; }
        }
        return resolveInside(workspaceRoot, location);
    }

    private _ensureArtifactStateFile(workspaceRoot: string): { relativePath: string; absolutePath: string } {
        const relativePath = '.vscode/nowdev-ai-session/artifacts.json';
        const absolutePath = resolveInside(workspaceRoot, relativePath)!;
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            const initialState = {
                version: 1,
                sessionId: '',
                artifacts: [],
                updatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(absolutePath, JSON.stringify(initialState, null, 2) + '\n', 'utf-8');
        }
        return { relativePath, absolutePath };
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
        const artifactState = this._ensureArtifactStateFile(workspaceFolders[0].uri.fsPath);
        const configPath = path.join(vscodePath, 'nowdev-ai-config.json');

        const configData: Record<string, unknown> = {
            _comment: 'Auto-generated by NowDev AI Toolbox. Agents read this file for project context. Do not edit manually.',
            instanceUrl: settings.instanceUrl,
            preferredDevelopmentStyle: settings.preferredStyle,
            artifactState: {
                version: 1,
                storage: 'workspace',
                path: artifactState.relativePath,
            },
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

        // Servers the user explicitly disabled — preserved so auto-enable doesn't re-add them
        if (this._mcpUserDismissed.length > 0) {
            configData.mcpUserDismissed = this._mcpUserDismissed;
        }

        // Per-MCP-server access configs
        if (Object.keys(this._mcpIntegrationConfigs).length > 0) {
            configData.mcpIntegrationConfigs = this._mcpIntegrationConfigs;
        }

        // Unified documentation sources (localPath and lastSynced are derived at runtime, not persisted)
        configData.allDocSources = {
            ...this._allDocSources,
            productDocs: {
                ...this._allDocSources.productDocs,
                localPath: undefined,
                lastSynced: undefined,
            },
        };

        // DevOps integration config
        configData.devopsConfig = this._devopsConfig;

        // Instance-backed agent guidelines
        if (this._guidelinesConfig.enabled || this._guidelinesConfig.selectedArticles.length > 0) {
            configData.guidelines = this._guidelinesConfig;
        }

        // Per-agent overrides
        if (Object.keys(this._agentOverrides).length > 0) {
            configData.agentOverrides = this._agentOverrides;
        }

        // Active user profile
        configData.activeProfile = this._activeProfileId;

        // Profile instruction overrides — only written when the user has customized at least one profile.
        // Built-in defaults are never written here so user customizations survive extension upgrades.
        if (Object.keys(this._profileInstructionsOverrides).length > 0) {
            configData.profileInstructionsOverrides = this._profileInstructionsOverrides;
        }

        // Reserved for future user-defined custom profiles
        configData.customProfiles = [];

        // Preserve agent-written fields (e.g. memoryLocation) that should not be overwritten
        try {
            if (fs.existsSync(configPath)) {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (existing.memoryLocation) {
                    configData.memoryLocation = existing.memoryLocation;
                }
                if (existing.artifactState && typeof existing.artifactState === 'object') {
                    configData.artifactState = { ...existing.artifactState as Record<string, unknown>, ...configData.artifactState as Record<string, unknown> };
                }
                if (existing.guidelines && !configData.guidelines) {
                    configData.guidelines = existing.guidelines;
                }
            }
        } catch { /* ignore parse errors */ }

        try {
            if (!fs.existsSync(vscodePath)) {
                fs.mkdirSync(vscodePath, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2) + '\n', 'utf-8');
            if (this._artifactFilePath !== artifactState.absolutePath) {
                this._setupArtifactWatcher(artifactState.absolutePath);
            }
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

    private _getRequiredSettings(): Record<string, RequiredSetting> {
        return {
            subAgents: { section: 'chat.subagents', prop: 'allowInvocationsFromSubagents', expected: true, label: 'Sub-agent invocations' },
            memory: { section: 'github.copilot.chat.tools.memory', prop: 'enabled', expected: true, label: 'Memory tool', preview: true, optional: true },
            customAgentHooks: { section: 'chat', prop: 'useCustomAgentHooks', expected: true, label: 'Agent-scoped hooks', preview: true, optional: true },
            askChatLocation: { section: 'workbench.commandPalette.experimental', prop: 'askChatLocation', expected: 'chatView', label: 'Ask Chat Location' },
            browserTools: { section: 'workbench.browser', prop: 'enableChatTools', expected: true, label: 'Browser tools' },
        };
    }

    private _getPrerequisiteStatuses(): Record<string, PrerequisiteStatus> {
        const statuses: Record<string, PrerequisiteStatus> = {};
        for (const [id, setting] of Object.entries(this._getRequiredSettings())) {
            statuses[id] = this._getPrerequisiteStatus(id, setting);
        }
        return statuses;
    }

    private _getPrerequisiteStatus(id: string, setting: RequiredSetting): PrerequisiteStatus {
        const config = vscode.workspace.getConfiguration(setting.section);
        const actual = config.get(setting.prop);
        const ok = actual === setting.expected;
        const inspect = config.inspect(setting.prop) as InspectWithPolicy | undefined;
        const managedByPolicy = this._policyBlockedSettings.has(id) || (inspect?.policyValue !== undefined && inspect.policyValue !== setting.expected);
        const status: PrerequisiteStatusKind = ok ? 'enabled' : managedByPolicy ? 'disabled-by-policy' : actual === undefined ? 'unknown' : 'disabled-by-user';
        const fixable = !setting.optional && !ok && !managedByPolicy;
        const message = ok
            ? setting.optional ? 'Available.' : 'Configured.'
            : managedByPolicy
                ? 'Disabled or managed by your organization or administrator.'
                : setting.optional
                    ? 'Optional preview capability; the toolbox works without it.'
                    : 'Can be enabled automatically for this user.';

        return {
            id,
            label: setting.label,
            setting: `${setting.section}.${setting.prop}`,
            ok,
            status,
            fixable,
            managedByPolicy,
            preview: setting.preview,
            optional: setting.optional,
            message,
        };
    }

    private async _fixSetting(key: string) {
        const setting = this._getRequiredSettings()[key];
        if (!setting) { return; }

        const status = this._getPrerequisiteStatus(key, setting);
        if (!status.fixable) {
            if (status.managedByPolicy) {
                vscode.window.showInformationMessage(`${status.label} is disabled by your organization or administrator.`);
            }
            return;
        }

        const config = vscode.workspace.getConfiguration(setting.section);
        try {
            await config.update(setting.prop, setting.expected, vscode.ConfigurationTarget.Global);
        } catch (error) {
            this._policyBlockedSettings.add(key);
            console.warn(`NowDev AI Toolbox could not update ${status.setting}; it may be managed by policy.`, error);
        }
    }

    private async _fixAllSettings() {
        for (const key of Object.keys(this._getRequiredSettings())) {
            const setting = this._getRequiredSettings()[key];
            const status = this._getPrerequisiteStatus(key, setting);
            if (status.fixable) {
                await this._fixSetting(key);
            }
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

        <section class="home-command-center">
            <div class="home-profile-card">
                <div class="section-title">Agent Profile</div>
                <div class="profile-select-row">
                    <select id="activeProfile" class="profile-select"></select>
                    <button class="mcp-doc-source-gear" id="profileToneGear" title="Customize tone instructions">&#9881;</button>
                </div>
                <div class="field-desc nd-mt-1" id="profileDescription"></div>
                <div class="mcp-doc-source-panel" id="profileTonePanel">
                    <div class="field-label nd-mb-1">Tone &amp; style instructions</div>
                    <div class="field-desc" style="margin-bottom:8px;">Injected into all agents for this profile. Customizations survive extension upgrades.</div>
                    <textarea id="profileInstructionsInput" rows="8" class="profile-tone-textarea" placeholder="Instructions injected into all agents for this profile…"></textarea>
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
                    <span class="check-icon fail">&#10005;</span>
                    <span class="check-label">Sub-agent invocations</span>
                    <button class="fix-btn">Enable</button>
                </div>
                <div class="check-row" data-key="memory">
                    <span class="check-icon fail">&#10005;</span>
                    <span class="check-label">Memory tool</span>
                    <button class="fix-btn">Enable</button>
                </div>
                <div class="check-row" data-key="customAgentHooks">
                    <span class="check-icon fail">&#10005;</span>
                    <span class="check-label">Agent-scoped hooks</span>
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
                <div class="sdk-cmd-status" id="sdkStatus-deploy"></div>
                <button class="fix-btn sdk-run-btn sdk-sync-btn" data-cmd="sync" title="Incremental download from instance, then transform XML to Fluent source">Sync (Download &rarr; Transform)</button>
                <div class="sdk-cmd-status" id="sdkStatus-sync"></div>
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
                optsHtml: `<label class="sdk-opt"><input type="checkbox" id="transformPreview"> <code>--preview</code> <span class="sdk-opt-hint">show output without saving</span></label>
                    <div class="sdk-opt-row"><label class="sdk-auth-label">Metadata folder</label><input type="text" id="transformMetadataFolder" value="metadata" placeholder="metadata" style="flex:1;min-width:0"></div>`,
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
                    '<button class="fix-btn" id="openDepPickerBtn" title="Open Instance Browser in dependency browsing mode">Instance Browser&hellip;</button>',
                    '<button class="fix-btn" id="openContextScannerBtn" title="Open Instance Browser in task discovery mode">Discover Context&hellip;</button>',
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
                { name: 'Move', tagline: 'Global metadata → Fluent', statusId: 'sdkStatus-move', runCmd: 'move', runTitle: 'Transform global metadata into local Fluent code' },
            ])}
            ${this._sdkCardMini([
                { name: 'Clean', tagline: 'Remove build artifacts', statusId: 'sdkStatus-clean', runCmd: 'clean', helpCmd: 'clean' },
                { name: 'Pack',  tagline: 'Package into ZIP',        statusId: 'sdkStatus-pack',  runCmd: 'pack',  helpCmd: 'pack'  },
            ])}
        </div>

        <!-- SDK Documentation -->
        <div class="section">
            <div class="section-title">SDK Documentation</div>
            <div class="field-desc nd-mb-2">Open current Fluent SDK documentation with <code>now-sdk explain</code></div>
            <div class="sdk-explain-row">
                <input type="text" id="explainApiInput" placeholder="e.g. UiPage, Table, Acl" spellcheck="false">
                <button class="fix-btn" id="runExplain">Explain</button>
            </div>
        </div>

        <!-- Instance Query -->
        <div class="section">
            <div class="section-title">Instance Query</div>
            <div class="field-desc nd-mb-2">Query live instance data with <code>now-sdk query</code></div>
            <div class="field-row">
                <label class="field-label">Table</label>
                <input type="text" id="queryTable" placeholder="e.g. incident, sys_user" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label">Query</label>
                <input type="text" id="queryFilter" placeholder="e.g. active=true^priority=1" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label">Fields</label>
                <input type="text" id="queryFields" placeholder="e.g. sys_id,name (optional)" spellcheck="false">
            </div>
            <div class="field-row">
                <label class="field-label">Display value</label>
                <select id="queryDisplayValue" class="field-select">
                    <option value="true">Human-readable (true)</option>
                    <option value="false">Raw sys values (false)</option>
                    <option value="all">Both (all)</option>
                </select>
            </div>
            <div class="sdk-explain-row">
                <input type="number" id="queryLimit" placeholder="Limit (default 100)" min="1" max="10000" style="width:160px">
                <button class="fix-btn" id="runQuery">Query</button>
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
                <button class="fix-btn" id="applyModelPresets" title="Apply role-aware model presets using available VS Code chat models">Apply Model Presets</button>
                <button class="fix-btn" id="showCopilotChatLogs" title="Open the Copilot chat log view">Chat Logs</button>
            </div>
            <div id="agentCards"></div>
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
                    <div id="docsDownloadStatus" class="field-desc"></div>
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
    <div class="tab-bar">
        <button class="tab-btn active" data-tab="home">Home</button>
        <button class="tab-btn" data-tab="project">Setup</button>
        <button class="tab-btn" data-tab="sdk">SDK &amp; Instance</button>
        <button class="tab-btn" data-tab="agents">Agents</button>
        <button class="tab-btn" data-tab="tools">Environment</button>
        <button class="tab-btn" data-tab="docs">References</button>
    </div>

    ${this._renderHomeTab()}
    ${this._renderProjectTab()}
    ${this._renderSdkTab()}
    ${this._renderAgentsTab()}
    ${this._renderToolsTab()}
    ${this._renderDocsTab()}

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
