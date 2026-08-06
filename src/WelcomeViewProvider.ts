import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { scanEnvironment, EnvironmentInfo } from './ToolScanner';
import { scanMcpServers, getAgentPluginRoots, McpServer } from './MCPScanner';
import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { syncAllAgents, syncWorkspaceInstructionsFile, syncWorkspacePromptFiles, AgentOverride, McpIntegrationConfig, DocSource, AllDocSources, DEFAULT_ALL_DOC_SOURCES, DevOpsConfig, DEFAULT_DEVOPS_CONFIG, LOCKED_AGENT_NAMES, AGENT_BUNDLES, getAgentBundleName, GuidelinesConfig } from './WorkspaceAgentManager';
import { DEFAULT_PROFILE_ID, getProfileById, getAllProfiles, normalizeCustomProfiles, getEffectiveAgentConfig, ProfileDefinition } from './ProfileManager';
import { scanAuthAliases, getCachedDefaultInstanceHost, AuthAlias } from './AuthAliasScanner';
import { showSdkCommandHelpPanel } from './SdkCommandHelpPanel';
import { SdkCommandStatus, InstallInfoState, ConnectionState, CheckChangesState, AvailableAgentModel } from './welcome/welcomeTypes';
import { normalizeModelOverride, resolveInside, capitalize, AUTO_ENABLE_MCP_PATTERNS, withDefaultOverride, readTextFileSafe } from './welcome/welcomeUtils';
import { buildWelcomeHtml } from './welcome/welcomeHtml';
import { readNowConfig, writeNowDevConfigFile, writeConnectionStatusToConfig, FluentAppInfo } from './welcome/configFile';
import { DocsSyncController } from './welcome/docsSync';
import { PrerequisiteChecker } from './welcome/prerequisites';
import { applyModelPresets } from './welcome/modelPresets';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'nowdev-ai-toolbox.welcome';
    private _view?: vscode.WebviewView;
    private _environmentInfo: EnvironmentInfo | null = null;
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
    private _customProfiles: ProfileDefinition[] = [];
    private _statusUpdateTimer: NodeJS.Timeout | undefined;
    private _agentSyncTimer: NodeJS.Timeout | undefined;
    private _chatModelListener?: vscode.Disposable;
    private readonly _prereqs = new PrerequisiteChecker();
    private readonly _docsSync = new DocsSyncController({
        getView: () => this._view,
        getRelease: () => this._allDocSources.productDocs.release ?? '',
        getDocsGlobalPath: () => this._getDocsGlobalPath(),
        resolveDestPath: (release) => this._getResolvedDocsPath(release),
        onStatusChanged: () => this._updateStatus(),
        onDocsSynced: () => this._syncWorkspaceAgents(),
    });

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _extensionId: string) {}

    /** Called by extension.ts commands after SDK CLI operations complete. */
    public setSdkCommandStatus(cmd: string, ok: boolean, message: string): void {
        this._sdkStatus[cmd] = { ok, message, timestamp: new Date().toISOString() };
        this._updateStatus();
    }

    /** Re-scans auth aliases and pushes them to the webview. */
    public refreshAuthAliases(): void {
        this._sendSdkData(true);
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
                    await this._prereqs.fixSetting(message.key);
                    this._updateStatus();
                    break;
                case 'fixAllSettings':
                    await this._prereqs.fixAllSettings();
                    this._updateStatus();
                    break;
                case 'openCopilotChat':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openCopilotChat');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.openSettings');
                    break;
                case 'collectCopilotDiagnostics':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.collectCopilotDiagnostics');
                    break;
                case 'showCopilotChatLogs':
                    vscode.commands.executeCommand('nowdev-ai-toolbox.showCopilotChatLogs');
                    break;
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
                    this._syncAndRefreshStatus();
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
                    this._syncAndRefreshStatus();
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
                        this._syncAndRefreshStatus();
                    }
                    break;
                }
                case 'rescanMcp':
                    this._mcpServers = scanMcpServers();
                    this._updateStatus();
                    break;
                case 'setActiveProfile': {
                    this._activeProfileId = message.profileId as string;
                    this._syncAndRefreshAgents();
                    break;
                }
                case 'saveProfileInstructions': {
                    this._profileInstructionsOverrides = {
                        ...this._profileInstructionsOverrides,
                        [this._activeProfileId]: message.instructions as string,
                    };
                    this._syncAndRefreshStatus();
                    break;
                }
                case 'resetProfileInstructions': {
                    const updated = { ...this._profileInstructionsOverrides };
                    delete updated[this._activeProfileId];
                    this._profileInstructionsOverrides = updated;
                    this._syncAndRefreshStatus();
                    break;
                }
                case 'updateDevopsEnabled': {
                    this._devopsConfig = { ...this._devopsConfig, enabled: message.enabled as boolean };
                    this._syncAndRefreshStatus();
                    break;
                }
                case 'updateDevopsMcp': {
                    this._devopsConfig = { ...this._devopsConfig, mcpServer: message.server as string };
                    this._syncAndRefreshStatus();
                    break;
                }
                case 'browseDevopsInstructionsFile': {
                    const uris = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        filters: { 'Instruction files': ['md', 'txt'] },
                        openLabel: 'Select Work Item Instructions File',
                    });
                    if (uris && uris.length > 0) {
                        try {
                            const content = fs.readFileSync(uris[0].fsPath, 'utf-8');
                            this._devopsConfig = { ...this._devopsConfig, customInstructions: content };
                            this._syncAndRefreshStatus();
                            this._view?.webview.postMessage({ command: 'updateDevopsConfig', devopsConfig: this._devopsConfig });
                        } catch { /* ignore read errors */ }
                    }
                    break;
                }
                case 'clearDevopsInstructions': {
                    this._devopsConfig = { ...this._devopsConfig, customInstructions: '' };
                    this._syncAndRefreshStatus();
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
                        const cur = withDefaultOverride(this._agentOverrides, name);
                        this._agentOverrides[name] = { ...cur, enabled: agentEnabled };
                    }
                    this._syncAndRefreshAgents();
                    break;
                }
                case 'toggleBundle': {
                    const bundleName = message.bundle as string;
                    const bundleEnabled = message.enabled as boolean;
                    const members = AGENT_BUNDLES[bundleName];
                    if (!members) { break; }
                    for (const name of members) {
                        const cur = withDefaultOverride(this._agentOverrides, name);
                        this._agentOverrides[name] = { ...cur, enabled: bundleEnabled };
                    }
                    this._syncAndRefreshAgents();
                    break;
                }
                case 'toggleAgentTool': {
                    const agentName = message.agentName as string;
                    const toolName  = message.toolName  as string;
                    const toolOn    = message.enabled   as boolean;
                    const curT = withDefaultOverride(this._agentOverrides, agentName);
                    const dt = new Set(curT.disabledTools);
                    if (toolOn) { dt.delete(toolName); } else { dt.add(toolName); }
                    this._agentOverrides[agentName] = { ...curT, disabledTools: [...dt] };
                    this._syncAndRefreshAgents();
                    break;
                }
                case 'updateAgentModel': {
                    const agentName = message.agentName as string;
                    const model = normalizeModelOverride(message.model);
                    const cur: AgentOverride = withDefaultOverride(this._agentOverrides, agentName);
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
                    this._syncAndRefreshAgents();
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
                    this._sendSdkData(true);
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
                        this._docsSync.fetchReleasesFromGitHub().catch(() => {});
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
                    await this._docsSync.downloadDocs();
                    break;
                }
                case 'cancelDocsDownload': {
                    this._docsSync.requestCancel();
                    break;
                }
                case 'fetchDocsReleases': {
                    await this._docsSync.fetchReleasesFromGitHub();
                    break;
                }
            }
        });

        webviewView.webview.html = this._getHtml(webviewView.webview);

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
        // Agent plugins live outside the workspace, so they need their own watchers.
        for (const root of getAgentPluginRoots()) {
            const rootUri = vscode.Uri.file(root);
            mcpJsonWatchers.push(
                vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootUri, 'installed.json')),
                vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootUri, '**/.mcp.json')),
            );
        }
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

        // Initial data pushes — load config first so _selectedMcp is ready before _updateStatus
        setTimeout(() => {
            this._onConfigFileChanged();
            this._updateStatus();
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

        const checks = this._prereqs.getStatuses();

        const toolboxConfig = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
        const customInstructionsFile = toolboxConfig.get<string>('customInstructionsFile', '');
        const customInstructionsContent = this._readCustomInstructionsFile();
        const settings = {
            instanceUrl: getCachedDefaultInstanceHost(),
            customInstructionsFile,
        };

        const fluentApp = this._readNowConfig();

        const docsRelease = this._allDocSources.productDocs.release ?? '';
        const activeProfile = getProfileById(this._activeProfileId, this._customProfiles) ?? getProfileById(DEFAULT_PROFILE_ID)!;
        const hasCustomInstructions = Object.prototype.hasOwnProperty.call(this._profileInstructionsOverrides, this._activeProfileId);
        const currentInstructions = hasCustomInstructions
            ? this._profileInstructionsOverrides[this._activeProfileId]
            : activeProfile.profileInstructions;
        this._view.webview.postMessage({ command: 'updateStatus', checks, settings, fluentApp, environment: this._environmentInfo, sdkStatus: this._sdkStatus, mcpServers: this._mcpServers, selectedMcp: this._selectedMcp, mcpIntegrationConfigs: this._mcpIntegrationConfigs, allDocSources: this._allDocSources, devopsConfig: this._devopsConfig, guidelinesConfig: this._guidelinesConfig, docsReleases: this._docsSync.docsReleases, docsDownloadStatus: this._docsSync.docsDownloadStatus, docsGlobalPath: this._getDocsGlobalPath(), docsLastSynced: this._docsSync.getSyncTime(docsRelease), profiles: getAllProfiles(this._customProfiles).map(p => ({ id: p.id, label: p.label, description: p.description })), activeProfileId: this._activeProfileId, profileInstructions: currentInstructions, profileHasCustomInstructions: hasCustomInstructions });
        this._writeConfigFile(settings, customInstructionsContent, fluentApp);
    }

    private _sendAgentData() {
        if (!this._view) { return; }
        const profile = getProfileById(this._activeProfileId, this._customProfiles) ?? getProfileById(DEFAULT_PROFILE_ID)!;
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
        const updated = applyModelPresets(this._agentManifests, this._agentOverrides, modelOptions);
        if (updated === null) {
            vscode.window.showWarningMessage('No selectable chat models were reported by VS Code. Model presets were not applied.');
            return;
        }
        this._syncAndRefreshAgents();
        vscode.window.showInformationMessage(`Applied model presets to ${updated} agent${updated === 1 ? '' : 's'}.`);
    }

    private _sendSdkData(forceRefresh = false): void {
        if (!this._view) { return; }
        this._authAliases = scanAuthAliases(forceRefresh);
        this._view.webview.postMessage({
            command: 'updateSdkData',
            authAliases: this._authAliases,
        });
        // The Setup tab's Instance URL and connection-check steps derive from
        // the default auth alias — refresh them now that the alias list changed.
        this._updateStatus();
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

            // Load work-item / DevOps integration config (backward compatible with existing configs)
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

            // Load company-provided custom profiles (extension seam alongside the built-in profiles)
            this._customProfiles = normalizeCustomProfiles(config.customProfiles);

            // Load active profile
            if (typeof config.activeProfile === 'string' && getProfileById(config.activeProfile, this._customProfiles)) {
                this._activeProfileId = config.activeProfile;
            }

            // Load profile instructions overrides (user customizations that survive upgrades)
            if (config.profileInstructionsOverrides && typeof config.profileInstructionsOverrides === 'object') {
                this._profileInstructionsOverrides = config.profileInstructionsOverrides as Record<string, string>;
            }

            // Sync agents whenever config changes
            this._syncWorkspaceAgents();
        } catch (err) {
            console.error('Failed to read nowdev-ai-config.json:', err);
        }
    }

    /** Re-syncs workspace agents and refreshes the Setup tab's status. */
    private _syncAndRefreshStatus(): void {
        this._syncWorkspaceAgents();
        this._updateStatus();
    }

    /** Re-syncs workspace agents and refreshes both the Setup tab and the Agents tab. */
    private _syncAndRefreshAgents(): void {
        this._syncWorkspaceAgents();
        this._updateStatus();
        this._sendAgentData();
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
                lastSynced: this._docsSync.getSyncTime(release),
            },
        };

        const profile = getProfileById(this._activeProfileId, this._customProfiles) ?? getProfileById(DEFAULT_PROFILE_ID)!;
        const effective = getEffectiveAgentConfig(profile, this._mcpIntegrationConfigs, this._profileInstructionsOverrides);
        const customInstructions = this._readCustomInstructionsFile();
        const agentGuidelines = this._formatAgentGuidelines();

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
                devopsConfig: this._devopsConfig,
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
        return customInstructionsFile ? readTextFileSafe(customInstructionsFile) : '';
    }

    private _getDocsGlobalPath(): string {
        return vscode.workspace.getConfiguration('nowdev-ai-toolbox').get<string>('docsLocalPath', '').trim();
    }

    private _getResolvedDocsPath(release: string): string {
        const base = this._getDocsGlobalPath();
        if (!base || !release || !/^[\w .-]+$/.test(release)) { return ''; }
        return resolveInside(base, release) ?? '';
    }

    // ── Config helpers ─────────────────────────────────────────────

    private _readNowConfig(): FluentAppInfo | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return null; }
        return readNowConfig(workspaceFolders[0].uri.fsPath);
    }

    private _writeConfigFile(
        settings: { instanceUrl: string; customInstructionsFile: string },
        customInstructionsContent: string,
        fluentApp: FluentAppInfo | null
    ) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }

        writeNowDevConfigFile(workspaceFolders[0].uri.fsPath, {
            settings,
            customInstructionsContent,
            fluentApp,
            environmentInfo: this._environmentInfo,
            selectedMcp: this._selectedMcp,
            mcpUserDismissed: this._mcpUserDismissed,
            mcpIntegrationConfigs: this._mcpIntegrationConfigs,
            allDocSources: this._allDocSources,
            devopsConfig: this._devopsConfig,
            guidelinesConfig: this._guidelinesConfig,
            agentOverrides: this._agentOverrides,
            activeProfileId: this._activeProfileId,
            profileInstructionsOverrides: this._profileInstructionsOverrides,
            customProfiles: this._customProfiles,
        });
    }

    private _writeConnectionStatusToConfig(state: ConnectionState): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) { return; }
        writeConnectionStatusToConfig(workspaceFolders[0].uri.fsPath, state);
    }

    private _getHtml(webview: vscode.Webview): string {
        return buildWelcomeHtml(webview, this._extensionUri, this._extensionId);
    }
}
