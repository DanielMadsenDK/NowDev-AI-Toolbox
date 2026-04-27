import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import * as https from 'https';
import { URL } from 'url';
import { WelcomeViewProvider } from './WelcomeViewProvider';
import { showSdkExplainPanel } from './SdkExplainPanel';
import { getShell } from './shellConfig';

// ── Shared helpers ─────────────────────────────────────────────────────────

function captureSpawnOutput(
    cmd: string,
    args: string[],
    cwd: string
): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve) => {
        const proc = cp.spawn(cmd, args, { cwd, shell: getShell() });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('close', (code: number | null) => resolve({ stdout, stderr, code }));
        proc.on('error', () => resolve({ stdout, stderr, code: -1 }));
    });
}

function checkInstanceReachability(
    instanceUrl: string
): Promise<{ reachable: boolean; statusCode?: number; responseTime?: number; error?: string }> {
    return new Promise((resolve) => {
        if (!instanceUrl) {
            resolve({ reachable: false, error: 'No instance URL configured' });
            return;
        }
        let normalizedUrl = instanceUrl.trim();
        if (!normalizedUrl.startsWith('http')) { normalizedUrl = 'https://' + normalizedUrl; }
        const start = Date.now();
        try {
            const parsed = new URL(normalizedUrl + '/api/now/ping');
            const req = https.request(
                { hostname: parsed.hostname, port: parsed.port || 443, path: '/api/now/ping', method: 'GET', timeout: 10000, rejectUnauthorized: false },
                (res) => {
                    resolve({ reachable: true, statusCode: res.statusCode, responseTime: Date.now() - start });
                    res.resume();
                }
            );
            req.on('timeout', () => { req.destroy(); resolve({ reachable: false, error: 'Timed out (10s)' }); });
            req.on('error', (err: NodeJS.ErrnoException) => {
                const msg = err.code === 'ENOTFOUND' ? 'Host not found' :
                            err.code === 'ECONNREFUSED' ? 'Connection refused' : err.message;
                resolve({ reachable: false, error: msg });
            });
            req.end();
        } catch (err: any) {
            resolve({ reachable: false, error: err.message });
        }
    });
}

function listFilesRecursive(dir: string): string[] {
    const results: string[] = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) { results.push(...listFilesRecursive(fullPath)); }
            else { results.push(fullPath); }
        }
    } catch { /* ignore */ }
    return results;
}

// ── Extension activation ───────────────────────────────────────────────────

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
                shell: getShell(),
            });

            proc.stdout.on('data', (data: Buffer) => outputChannel.append(data.toString()));
            proc.stderr.on('data', (data: Buffer) => outputChannel.append(data.toString()));

            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    outputChannel.appendLine('\n✓ Project initialised successfully.');
                    outputChannel.appendLine('\nRunning npm install...\n');

                    const npmProc = cp.spawn('npm', ['install'], {
                        cwd: resolvedTargetDir,
                        shell: getShell(),
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

    // ── SDK CLI commands ──────────────────────────────────────────

    function getWorkspaceFolder(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    function spawnSdkCmd(
        label: string,
        cmdArgs: string[],
        cwd: string,
        statusKey: string,
        onSuccess?: () => void
    ): void {
        const chan = vscode.window.createOutputChannel(`NowDev: SDK ${label}`);
        chan.show(true);
        chan.appendLine(`> now-sdk ${cmdArgs.join(' ')}\n`);

        const proc = cp.spawn('now-sdk', cmdArgs, { cwd, shell: getShell() });
        proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
        proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
        proc.on('close', (code: number | null) => {
            const ok = code === 0;
            if (ok) {
                chan.appendLine(`\n✓ ${label} completed successfully.`);
                onSuccess?.();
            } else {
                chan.appendLine(`\n✗ ${label} failed (exit code ${code}).`);
            }
            welcomeProvider.setSdkCommandStatus(statusKey, ok, ok ? `${label} succeeded` : `Failed (exit ${code})`);
        });
    }

    context.subscriptions.push(
        // Build
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkBuild', (args: { frozenKeys?: boolean } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const cmdArgs = ['build', '.'];
            if (args.frozenKeys) { cmdArgs.push('--frozenKeys', 'true'); }
            spawnSdkCmd('Build', cmdArgs, cwd, 'build');
        }),

        // Install
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkInstall', (args: { reinstall?: boolean; openBrowser?: boolean; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const cmdArgs = ['install'];
            if (args.reinstall) { cmdArgs.push('--reinstall'); }
            if (args.openBrowser) { cmdArgs.push('--open-browser'); }
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            spawnSdkCmd('Install', cmdArgs, cwd, 'install');
        }),

        // Transform (with preview → virtual document)
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkTransform', async (args: { preview?: boolean; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const cmdArgs = ['transform'];
            if (args.preview) { cmdArgs.push('--preview'); }
            if (args.auth) { cmdArgs.push('--auth', args.auth); }

            if (args.preview) {
                const chan = vscode.window.createOutputChannel('NowDev: Transform Preview');
                chan.show(true);
                chan.appendLine(`> now-sdk ${cmdArgs.join(' ')}\n`);
                const result = await captureSpawnOutput('now-sdk', cmdArgs, cwd);
                const output = (result.stdout + result.stderr).trim();
                chan.appendLine(output);
                const ok = result.code === 0;
                chan.appendLine(ok ? '\n✓ Preview complete.' : `\n✗ Preview failed (exit ${result.code}).`);
                welcomeProvider.setSdkCommandStatus('transform', ok, ok ? 'Preview completed' : `Failed (exit ${result.code})`);
                if (ok && output.length > 0) {
                    try {
                        const tmpFile = path.join(os.tmpdir(), 'nowdev-transform-preview.ts');
                        fs.writeFileSync(tmpFile, output, 'utf-8');
                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(tmpFile));
                        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
                    } catch { /* output channel is sufficient fallback */ }
                }
                return;
            }
            spawnSdkCmd('Transform', cmdArgs, cwd, 'transform');
        }),

        // Dependencies
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkDependencies', (args: { mode?: string; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const cmdArgs = ['dependencies'];
            if (args.mode === 'script') { cmdArgs.push('--type-defs-only'); }
            else if (args.mode === 'fluent') { cmdArgs.push('--fluent-only'); }
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            spawnSdkCmd('Dependencies', cmdArgs, cwd, 'dependencies');
        }),

        // Clean
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkClean', () => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            spawnSdkCmd('Clean', ['clean', '.'], cwd, 'clean');
        }),

        // Pack
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkPack', () => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            spawnSdkCmd('Pack', ['pack', '.'], cwd, 'pack');
        }),

        // Download
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkDownload', (args: { incremental?: boolean; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const downloadDir = path.join(cwd, 'metadata');
            const cmdArgs = ['download', downloadDir];
            if (args.incremental !== false) { cmdArgs.push('--incremental'); }
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            spawnSdkCmd('Download', cmdArgs, cwd, 'download');
        }),

        // Explain — opens a formatted webview panel with the API docs
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkExplain', (api: string) => {
            if (!api?.trim()) { return; }
            showSdkExplainPanel(api.trim());
        }),

        // Auth — Add
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkAuthAdd', async () => {
            const instance = await vscode.window.showInputBox({
                prompt: 'Instance URL or name to authenticate with',
                placeHolder: 'https://dev12345.service-now.com',
                validateInput: (v) => v.trim() ? undefined : 'Instance is required',
            });
            if (!instance) { return; }

            const alias = await vscode.window.showInputBox({
                prompt: 'Alias name for this credential (optional — leave blank to use instance name)',
                placeHolder: 'my-dev-instance',
            });

            const typePick = await vscode.window.showQuickPick(
                [
                    { label: 'oauth', description: 'OAuth 2.0 (recommended)' },
                    { label: 'basic', description: 'Username / Password' },
                ],
                { placeHolder: 'Select authentication type' }
            );
            if (!typePick) { return; }

            const chan = vscode.window.createOutputChannel('NowDev: SDK Auth Add');
            chan.show(true);
            const cmdArgs = ['auth', '--add', instance.trim(), '--type', typePick.label];
            if (alias?.trim()) { cmdArgs.push('--alias', alias.trim()); }
            chan.appendLine(`> now-sdk ${cmdArgs.join(' ')}\n`);

            const proc = cp.spawn('now-sdk', cmdArgs, { shell: getShell() });
            proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    chan.appendLine('\n✓ Auth alias added.');
                    welcomeProvider.refreshAuthAliases();
                } else {
                    chan.appendLine(`\n✗ Auth add failed (exit code ${code}).`);
                }
            });
        }),

        // Auth — Remove
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkAuthRemove', async (alias: string) => {
            const confirm = await vscode.window.showWarningMessage(
                `Delete auth alias "${alias}"?`,
                { modal: true },
                'Delete'
            );
            if (confirm !== 'Delete') { return; }

            const chan = vscode.window.createOutputChannel('NowDev: SDK Auth Remove');
            chan.show(true);
            chan.appendLine(`> now-sdk auth --delete ${alias}\n`);
            const proc = cp.spawn('now-sdk', ['auth', '--delete', alias], { shell: getShell() });
            proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    chan.appendLine('\n✓ Auth alias removed.');
                    welcomeProvider.refreshAuthAliases();
                } else {
                    chan.appendLine(`\n✗ Auth remove failed (exit code ${code}).`);
                }
            });
        }),

        // Install Info — last deployment status (no install)
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkInstallInfo', async (args: { auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            welcomeProvider.setInstallInfo({ loading: true, ok: false, output: '', timestamp: new Date().toISOString() });
            const cmdArgs = ['install', '--info'];
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            const result = await captureSpawnOutput('now-sdk', cmdArgs, cwd);
            const output = (result.stdout + result.stderr).trim();
            welcomeProvider.setInstallInfo({ loading: false, ok: result.code === 0, output, timestamp: new Date().toISOString() });
        }),

        // Connection health check
        vscode.commands.registerCommand('nowdev-ai-toolbox.checkConnection', async () => {
            const config = vscode.workspace.getConfiguration('nowdev-ai-toolbox');
            const instanceUrl = config.get<string>('instanceUrl', '');
            if (!instanceUrl) {
                vscode.window.showWarningMessage('No instance URL configured. Set it in the NowDev Setup tab first.');
                return;
            }
            welcomeProvider.setConnectionStatus({ checking: true, reachable: false, timestamp: new Date().toISOString() });
            const result = await checkInstanceReachability(instanceUrl);
            welcomeProvider.setConnectionStatus({ checking: false, ...result, timestamp: new Date().toISOString() });
        }),

        // Check for instance changes via incremental download to temp dir
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkCheckChanges', async (args: { auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            welcomeProvider.setCheckChangesResult({ checking: true, ok: false, count: 0, timestamp: new Date().toISOString() });
            const tmpDir = path.join(os.tmpdir(), `nowdev-changes-${Date.now()}`);
            try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (err: any) {
                welcomeProvider.setCheckChangesResult({ checking: false, ok: false, count: 0, error: err.message, timestamp: new Date().toISOString() });
                return;
            }
            const cmdArgs = ['download', tmpDir, '--incremental'];
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            const result = await captureSpawnOutput('now-sdk', cmdArgs, cwd);
            const files = listFilesRecursive(tmpDir);
            const count = files.length;
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
            const output = (result.stdout + result.stderr).trim();
            welcomeProvider.setCheckChangesResult({ checking: false, ok: result.code === 0, count, output, timestamp: new Date().toISOString() });
        }),

        // Auth — Set Default
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkAuthSetDefault', async (alias: string) => {
            const chan = vscode.window.createOutputChannel('NowDev: SDK Auth Default');
            chan.show(true);
            chan.appendLine(`> now-sdk auth --use ${alias}\n`);
            const proc = cp.spawn('now-sdk', ['auth', '--use', alias], { shell: getShell() });
            proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.on('close', (code: number | null) => {
                if (code === 0) {
                    chan.appendLine(`\n✓ "${alias}" set as default.`);
                    welcomeProvider.refreshAuthAliases();
                } else {
                    chan.appendLine(`\n✗ Failed to set default (exit code ${code}).`);
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
