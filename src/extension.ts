import * as vscode from 'vscode';
import { WelcomeViewProvider } from './WelcomeViewProvider';
import { showAgentTopologyPanel } from './AgentTopologyPanel';
import { ensureGitignoreEntry, executeIfAvailable, executeFirstAvailable } from './extensionUtils';
import { registerInitFluentProject } from './commands/initFluentProject';
import { registerSdkCommands } from './commands/sdkCommands';

// ?? Extension activation ???????????????????????????????????????????????????

export function activate(context: vscode.ExtensionContext) {
    // Ensure sensitive/generated workspace files are listed in .gitignore
    ensureGitignoreEntry('.vscode/nowdev-ai-config.json');
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

    // Enable agentic browser tools (v1.110+)
    const browserConfig = vscode.workspace.getConfiguration('workbench.browser');
    const chatToolsEnabled = browserConfig.get<boolean>('enableChatTools');

    if (chatToolsEnabled !== true) {
        browserConfig.update('enableChatTools', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled workbench.browser.enableChatTools setting');
        }, (error: any) => {
            console.error('Failed to enable workbench.browser.enableChatTools:', error);
        });
    }

    // Enable sub-agent invocations from sub-agents (required for multi-tier agent routing)
    const subagentsConfig = vscode.workspace.getConfiguration('chat.subagents');
    const subagentsEnabled = subagentsConfig.get<boolean>('allowInvocationsFromSubagents');

    if (subagentsEnabled !== true) {
        subagentsConfig.update('allowInvocationsFromSubagents', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled chat.subagents.allowInvocationsFromSubagents setting');
        }, (error: any) => {
            console.error('Failed to enable chat.subagents.allowInvocationsFromSubagents:', error);
        });
    }

    // Memory is preview and may be disabled by organization policy. The sidebar
    // reports availability and offers enablement only when VS Code allows it.

    // Enable dedicated skill context isolation (v1.118+) — prevents skill content flooding main agent context
    const skillToolConfig = vscode.workspace.getConfiguration('github.copilot.chat');
    if (skillToolConfig.get<boolean>('skillTool.enabled') !== true) {
        skillToolConfig.update('skillTool.enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.skillTool.enabled');
        }, (error: any) => {
            console.error('Failed to enable skillTool:', error);
        });
    }

    // Enable background todo agent (v1.119+) — offloads todo tracking from main model in multi-tier sessions
    const todoAgentConfig = vscode.workspace.getConfiguration('github.copilot.chat.agent');
    if (todoAgentConfig.get<boolean>('backgroundTodoAgent.enabled') !== true) {
        todoAgentConfig.update('backgroundTodoAgent.enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.agent.backgroundTodoAgent.enabled');
        }, (error: any) => {
            console.error('Failed to enable backgroundTodoAgent:', error);
        });
    }

    // Agents are delivered as generated .github/agents/*.agent.md files, synced
    // by WorkspaceAgentManager via the welcome view — no registration step here.

}

export function deactivate() {}
