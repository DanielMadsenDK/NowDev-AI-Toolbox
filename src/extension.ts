import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { WelcomeViewProvider } from './WelcomeViewProvider';

export function activate(context: vscode.ExtensionContext) {
    // Ensure .vscode/nowdev-ai-config.json is listed in .gitignore
    ensureGitignoreEntry();
    // Register the sidebar welcome webview
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri);

    // Scan for available tools/environment on activation
    welcomeProvider.scanTools();

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
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.initFluentProject', async () => {
            // Step 1: App display name
            const appName = await vscode.window.showInputBox({
                prompt: 'Application display name',
                placeHolder: 'My ServiceNow App',
                validateInput: (v) => (!v.trim() ? 'App name is required' : undefined),
            });
            if (!appName) { return; }

            // Step 2: npm package name
            const packageName = await vscode.window.showInputBox({
                prompt: 'Package name (npm-compatible, lowercase letters, numbers, hyphens)',
                placeHolder: 'my-servicenow-app',
                validateInput: (v) => {
                    if (!v.trim()) { return 'Package name is required'; }
                    if (!/^[a-z0-9][a-z0-9._-]*$/.test(v.trim())) {
                        return 'Must start with a letter/digit and contain only lowercase letters, digits, hyphens, underscores, or dots';
                    }
                    return undefined;
                },
            });
            if (!packageName) { return; }

            // Step 3: Scope name
            const scopeName = await vscode.window.showInputBox({
                prompt: 'Application scope (must start with x_, max 18 characters)',
                placeHolder: 'x_snc_myapp',
                validateInput: (v) => {
                    if (!v.trim()) { return 'Scope name is required'; }
                    if (!v.trim().startsWith('x_')) { return 'Scope must start with x_'; }
                    if (v.trim().length > 18) { return 'Scope must be 18 characters or fewer'; }
                    return undefined;
                },
            });
            if (!scopeName) { return; }

            // Step 4: Template
            const templatePick = await vscode.window.showQuickPick(
                [
                    { label: 'typescript.react', description: 'TypeScript + React (recommended)' },
                    { label: 'typescript.basic', description: 'TypeScript only' },
                    { label: 'javascript.react', description: 'JavaScript + React' },
                    { label: 'javascript.basic', description: 'JavaScript only' },
                    { label: 'base', description: 'Minimal base structure' },
                ],
                { placeHolder: 'Select a project template' }
            );
            if (!templatePick) { return; }

            // Step 5: Auth alias (optional — uses SDK default if blank)
            const authAlias = await vscode.window.showInputBox({
                prompt: 'Auth alias (optional — leave blank to use default credentials)',
                placeHolder: 'devuser1',
            });

            // Step 6: Target directory (defaults to a subfolder named after the package)
            const defaultDir = path.join(
                vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.env.HOME ?? '~',
                packageName.trim()
            );
            const targetDir = await vscode.window.showInputBox({
                prompt: 'Directory in which to create the project',
                value: defaultDir,
                validateInput: (v) => (!v.trim() ? 'Directory is required' : undefined),
            });
            if (!targetDir) { return; }

            // Build the now-sdk init command
            const args = [
                `--appName "${appName.trim()}"`,
                `--packageName "${packageName.trim()}"`,
                `--scopeName "${scopeName.trim()}"`,
                `--template ${templatePick.label}`,
            ];
            if (authAlias?.trim()) {
                args.push(`--auth ${authAlias.trim()}`);
            }

            const resolvedTargetDir = targetDir.trim();
            const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const isCurrentFolder = currentWorkspace && path.resolve(currentWorkspace) === path.resolve(resolvedTargetDir);

            const outputChannel = vscode.window.createOutputChannel('NowDev: Init Fluent Project');
            outputChannel.show(true);
            outputChannel.appendLine(`Initialising project in ${resolvedTargetDir}...`);
            outputChannel.appendLine(`> now-sdk init ${args.join(' ')}\n`);

            fs.mkdirSync(resolvedTargetDir, { recursive: true });

            const proc = cp.spawn('now-sdk', ['init', ...args.flatMap(a => a.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [a])], {
                cwd: resolvedTargetDir,
                shell: true,
            });

            proc.stdout.on('data', (data: Buffer) => outputChannel.append(data.toString()));
            proc.stderr.on('data', (data: Buffer) => outputChannel.append(data.toString()));

            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    outputChannel.appendLine('\n✓ Project initialised successfully.');
                    outputChannel.appendLine('\nRunning npm install...\n');

                    const npmProc = cp.spawn('npm', ['install'], {
                        cwd: resolvedTargetDir,
                        shell: true,
                    });

                    npmProc.stdout.on('data', (data: Buffer) => outputChannel.append(data.toString()));
                    npmProc.stderr.on('data', (data: Buffer) => outputChannel.append(data.toString()));

                    npmProc.on('close', (npmCode: number | null) => {
                        if (npmCode === 0) {
                            outputChannel.appendLine('\n✓ npm install completed. Project is ready.');
                        } else {
                            outputChannel.appendLine(`\n✗ npm install failed with exit code ${npmCode}.`);
                            vscode.window.showWarningMessage(`npm install failed (exit code ${npmCode}). See the output channel for details.`);
                        }
                        welcomeProvider.refreshStatus();
                        if (!isCurrentFolder) {
                            vscode.window.showInformationMessage(
                                `"${appName.trim()}" initialised in ${resolvedTargetDir}. Open the folder?`,
                                'Open Folder',
                                'Open in New Window'
                            ).then((choice) => {
                                if (choice === 'Open Folder') {
                                    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(resolvedTargetDir), false);
                                } else if (choice === 'Open in New Window') {
                                    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(resolvedTargetDir), true);
                                }
                            });
                        }
                    });
                } else {
                    outputChannel.appendLine(`\n✗ now-sdk init failed with exit code ${code}.`);
                    vscode.window.showErrorMessage(`now-sdk init failed (exit code ${code}). See the output channel for details.`);
                }
            });
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

function ensureGitignoreEntry() {
    const entry = '.vscode/nowdev-ai-config.json';
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const gitignorePath = path.join(rootPath, '.gitignore');

    try {
        let content = '';
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, 'utf-8');
            const lines = content.split(/\r?\n/).map(l => l.trim());
            if (lines.includes(entry)) {
                return;
            }
        }

        const suffix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
        fs.appendFileSync(gitignorePath, `${suffix}${entry}\n`, 'utf-8');
        console.log(`Added ${entry} to .gitignore`);
    } catch (err) {
        console.error('Failed to update .gitignore:', err);
    }
}

export function deactivate() {}
