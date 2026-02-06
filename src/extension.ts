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

    // Agents are now registered via package.json chatAgents contribution
    // No additional installation logic needed
}

export function deactivate() {}
