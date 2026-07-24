import * as vscode from 'vscode';
import { WelcomeViewProvider } from './WelcomeViewProvider';
import { showAgentTopologyPanel } from './AgentTopologyPanel';
import { ensureGitignoreEntry, ensureWorktreeIncludeFiles, executeIfAvailable, executeFirstAvailable } from './extensionUtils';
import { registerInitFluentProject } from './commands/initFluentProject';
import { registerSdkCommands } from './commands/sdkCommands';

// ?? Extension activation ???????????????????????????????????????????????????

export function activate(context: vscode.ExtensionContext) {
    // Ensure sensitive/generated workspace files are listed in .gitignore
    ensureGitignoreEntry('.vscode/nowdev-ai-config.json');
    // Ensure generated agents/instructions/prompts/config survive VS Code worktree creation
    ensureWorktreeIncludeFiles();
    // Register the sidebar welcome webview
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri, context.extension.id);

    // Scan for available tools/environment on activation (async; never blocks activation)
    void welcomeProvider.scanTools();
    welcomeProvider.scanMcp();
    welcomeProvider.loadAgentRegistry();

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WelcomeViewProvider.viewType, welcomeProvider, {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('nowdev-ai-toolbox.openCopilotChat', () => {
            vscode.commands.executeCommand('workbench.action.chat.open');
            vscode.window.setStatusBarMessage('Select NowDev AI Agent from the chat agent picker.', 5000);
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'nowdev-ai-toolbox');
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.collectCopilotDiagnostics', async () => {
            await executeIfAvailable(
                'github.copilot.debug.collectDiagnostics',
                'Collect Diagnostics is not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.showCopilotChatLogs', async () => {
            await executeIfAvailable(
                'github.copilot.debug.showChatLogView',
                'Chat logs are not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.openAgentCustomizations', async () => {
            await executeFirstAvailable(
                ['workbench.action.chat.openCustomizations', 'github.copilot.chat.openCustomizations'],
                'The Agent Customizations editor is not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.refreshStatus', () => {
            welcomeProvider.refreshStatus();
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.showAgentTopology', () => {
            showAgentTopologyPanel(welcomeProvider.getAgentManifests(), welcomeProvider.getAgentOverrides());
        }),
    );

    registerInitFluentProject(context, welcomeProvider);
    registerSdkCommands(context, welcomeProvider);

    // One-time nudges enabling VS Code/Copilot Chat settings this extension depends on.
    // Each is additive (never disables anything) and safe to re-check on every activation.
    enableSettingIfDisabled('workbench.browser', 'enableChatTools'); // Agentic browser tools (v1.110+)
    enableSettingIfDisabled('chat.subagents', 'allowInvocationsFromSubagents'); // Sub-agent invocations from sub-agents (multi-tier routing)
    // Memory is preview and may be disabled by organization policy. The sidebar
    // reports availability and offers enablement only when VS Code allows it.
    enableSettingIfDisabled('github.copilot.chat', 'skillTool.enabled'); // Skill context isolation (v1.118+)
    enableSettingIfDisabled('github.copilot.chat.agent', 'backgroundTodoAgent.enabled'); // Background todo agent (v1.119+)

    // Agents are delivered as generated .github/agents/*.agent.md files, synced
    // by WorkspaceAgentManager via the welcome view — no registration step here.

}

/** Sets a Global boolean setting to true if it isn't already, logging the outcome. */
function enableSettingIfDisabled(section: string, key: string): void {
    const config = vscode.workspace.getConfiguration(section);
    if (config.get<boolean>(key) === true) { return; }
    config.update(key, true, vscode.ConfigurationTarget.Global).then(() => {
        console.log(`Enabled ${section}.${key} setting`);
    }, (error: any) => {
        console.error(`Failed to enable ${section}.${key}:`, error);
    });
}

export function deactivate() {}
