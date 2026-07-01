import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WelcomeViewProvider } from '../WelcomeViewProvider';
import { spawnNpm, spawnSdk } from '../SdkProcess';
import { scanAuthAliases } from '../AuthAliasScanner';

export function registerInitFluentProject(context: vscode.ExtensionContext, welcomeProvider: WelcomeViewProvider): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('nowdev-ai-toolbox.initFluentProject', async () => {
            // Step 0: Choose mode — new, convert from instance, or convert from local directory
            const modePick = await vscode.window.showQuickPick(
                [
                    { label: '$(file-add) New empty Fluent project', detail: 'Scaffold a new application using a template', value: 'new' },
                    { label: '$(cloud-download) Convert existing app from instance', detail: 'now-sdk init --from <sys_id> — pulls a scoped app from the instance', value: 'fromInstance' },
                    { label: '$(folder-opened) Convert existing app from local directory', detail: 'now-sdk init --from <path> — adopts an existing local app folder', value: 'fromLocal' },
                ],
                { placeHolder: 'How would you like to initialize the Fluent project?' }
            );
            if (!modePick) { return; }
            const mode = modePick.value as 'new' | 'fromInstance' | 'fromLocal';

            let fromValue: string | undefined;
            if (mode === 'fromInstance') {
                const aliases = scanAuthAliases();
                if (aliases.length === 0) {
                    vscode.window.showErrorMessage('No auth aliases found. Add one via "SDK: Add Auth Alias" first.');
                    return;
                }
                const aliasPick = await vscode.window.showQuickPick(
                    aliases.map(a => ({ label: a.alias, description: a.host, detail: a.isDefault ? 'default' : undefined })),
                    { placeHolder: 'Select the auth alias for the source instance' }
                );
                if (!aliasPick) { return; }

                const sysIdInput = await vscode.window.showInputBox({
                    prompt: 'sys_id of the application on the instance',
                    placeHolder: 'dbce0f6a3b3fda107b45b5d355e45af6',
                    validateInput: (v) => (!v.trim() ? 'sys_id is required' : (/^[a-f0-9]{32}$/i.test(v.trim()) ? undefined : 'Must be a 32-char hex sys_id')),
                });
                if (!sysIdInput) { return; }
                fromValue = sysIdInput.trim();
                // Stash the selected alias for later — used when constructing the now-sdk init args.
                (modePick as any)._alias = aliasPick.label;
            } else if (mode === 'fromLocal') {
                const picked = await vscode.window.showOpenDialog({
                    canSelectFiles: false, canSelectFolders: true, canSelectMany: false,
                    openLabel: 'Select existing app directory',
                });
                if (!picked || picked.length === 0) { return; }
                fromValue = picked[0].fsPath;
            }

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
            const presetAlias = (modePick as any)._alias as string | undefined;
            const authAlias = presetAlias ?? await vscode.window.showInputBox({
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

            // Build the now-sdk init command as argv, not a shell string.
            const args = [
                'init',
                '--appName', appName.trim(),
                '--packageName', packageName.trim(),
                '--scopeName', scopeName.trim(),
                '--template', templatePick.label,
            ];
            if (fromValue) {
                args.push('--from', fromValue);
            }
            if (authAlias?.trim()) {
                args.push('--auth', authAlias.trim());
            }

            const resolvedTargetDir = targetDir.trim();
            const currentWorkspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const isCurrentFolder = currentWorkspace && path.resolve(currentWorkspace) === path.resolve(resolvedTargetDir);

            const outputChannel = vscode.window.createOutputChannel('NowDev: Init Fluent Project');
            outputChannel.show(true);
            outputChannel.appendLine(`Initialising project in ${resolvedTargetDir}...`);
            outputChannel.appendLine(`> now-sdk ${args.join(' ')}\n`);

            fs.mkdirSync(resolvedTargetDir, { recursive: true });

            const proc = spawnSdk(args, { cwd: resolvedTargetDir });

            proc.stdout.on('data', (data: Buffer) => outputChannel.append(data.toString()));
            proc.stderr.on('data', (data: Buffer) => outputChannel.append(data.toString()));

            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    outputChannel.appendLine('\n✓ Project initialised successfully.');
                    outputChannel.appendLine('\nRunning npm install...\n');

                    const npmProc = spawnNpm(['install'], { cwd: resolvedTargetDir });

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
}
