import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
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

    // Enable agent-scoped hooks (preview feature required for hooks in .agent.md frontmatter)
    const hooksConfig = vscode.workspace.getConfiguration('chat');
    const customAgentHooksEnabled = hooksConfig.get<boolean>('useCustomAgentHooks');

    if (customAgentHooksEnabled !== true) {
        hooksConfig.update('useCustomAgentHooks', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled chat.useCustomAgentHooks setting');
        }, (error: any) => {
            console.error('Failed to enable chat.useCustomAgentHooks:', error);
        });
    }

    // Copy hook scripts to the user's workspace .github/hooks/ if not already present
    // Only applies to ServiceNow SDK workspaces (identified by now.config.json)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceRoot = workspaceFolders[0].uri;
        const nowConfigUri = vscode.Uri.joinPath(workspaceRoot, 'now.config.json');

        let isServiceNowWorkspace = false;
        try {
            await vscode.workspace.fs.stat(nowConfigUri);
            isServiceNowWorkspace = true;
        } catch {
            // now.config.json not found, not a ServiceNow workspace
        }

        if (isServiceNowWorkspace) {
            const srcHooksUri = vscode.Uri.joinPath(context.extensionUri, 'scripts', 'hooks');
            const destHooksUri = vscode.Uri.joinPath(workspaceRoot, '.github', 'hooks');

            try {
                const entries = await vscode.workspace.fs.readDirectory(srcHooksUri);
                await vscode.workspace.fs.createDirectory(destHooksUri);

                let installed = false;
                for (const [file, type] of entries) {
                    if (type === vscode.FileType.File) {
                        const destFileUri = vscode.Uri.joinPath(destHooksUri, file);
                        try {
                            await vscode.workspace.fs.stat(destFileUri);
                        } catch {
                            const srcFileUri = vscode.Uri.joinPath(srcHooksUri, file);
                            await vscode.workspace.fs.copy(srcFileUri, destFileUri, { overwrite: false });
                            console.log(`Copied hook script: ${file} -> .github/hooks/`);
                            installed = true;
                        }
                    }
                }

                if (installed) {
                    const action = await vscode.window.showInformationMessage(
                        'NowDev AI: Required files have been installed. Reload the window to activate them.',
                        'Reload Window'
                    );
                    if (action === 'Reload Window') {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            } catch (error) {
                console.error('Failed to copy hook scripts:', error);
            }
        }
    }

    // Agents are now registered via package.json chatAgents contribution
    // No additional installation logic needed
}

export function deactivate() {}
