import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Enable GitHub Copilot Chat questions by default
    const config = vscode.workspace.getConfiguration('github.copilot.chat.askQuestions');
    const enabled = config.get<boolean>('enabled');
    
    if (enabled !== true) {
        config.update('enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.askQuestions.enabled setting');
        }, (error: any) => {
            console.error('Failed to enable github.copilot.chat.askQuestions.enabled:', error);
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

    // Agents are now registered via package.json chatAgents contribution
    // No additional installation logic needed
}

export function deactivate() {}
