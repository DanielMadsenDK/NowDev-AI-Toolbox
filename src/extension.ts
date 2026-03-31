import * as vscode from 'vscode';
import { WelcomeViewProvider } from './WelcomeViewProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register the sidebar welcome webview
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WelcomeViewProvider.viewType, welcomeProvider, {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('nowdev-ai-toolbox.openCopilotChat', () => {
            vscode.commands.executeCommand('workbench.action.chat.open');
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.refreshStatus', () => {
            welcomeProvider.refreshStatus();
        })
    );
    // Enable ask-chat-location so Copilot questions appear in the chat view
    const askChatConfig = vscode.workspace.getConfiguration('workbench.commandPalette.experimental');
    const askChatLocation = askChatConfig.get<string>('askChatLocation');
    
    if (askChatLocation !== 'chatView') {
        askChatConfig.update('askChatLocation', 'chatView', vscode.ConfigurationTarget.Global).then(() => {
            console.log('Set workbench.commandPalette.experimental.askChatLocation to chatView');
        }, (error: any) => {
            console.error('Failed to set askChatLocation:', error);
        });
    }

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

    // Enable the memory tool for persistent context across agent sessions
    const memoryConfig = vscode.workspace.getConfiguration('github.copilot.chat.tools.memory');
    const memoryEnabled = memoryConfig.get<boolean>('enabled');

    if (memoryEnabled !== true) {
        memoryConfig.update('enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.tools.memory.enabled setting');
        }, (error: any) => {
            console.error('Failed to enable github.copilot.chat.tools.memory.enabled:', error);
        });
    }

    // Agents are now registered via package.json chatAgents contribution
    // No additional installation logic needed
}

export function deactivate() {}
