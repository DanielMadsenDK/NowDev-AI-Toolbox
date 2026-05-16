import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';
import * as https from 'https';
import { URL } from 'url';
import { WelcomeViewProvider } from './WelcomeViewProvider';
import { showSdkExplainPanel } from './SdkExplainPanel';
import { showAgentTopologyPanel } from './AgentTopologyPanel';
import { showDependencyPickerPanel } from './DependencyPickerPanel';
import { showContextScannerPanel } from './ContextScannerPanel';
import { InstanceClient } from './InstanceClient';
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
                { hostname: parsed.hostname, port: parsed.port || 443, path: '/api/now/ping', method: 'GET', timeout: 10000 },
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

function getWorkspaceFolder(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function executeIfAvailable(command: string, unavailableMessage: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(command)) {
        vscode.window.showWarningMessage(unavailableMessage);
        return false;
    }

    await vscode.commands.executeCommand(command);
    return true;
}

// ── Extension activation ───────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
    // Ensure sensitive/generated workspace files are listed in .gitignore
    ensureGitignoreEntry('.vscode/nowdev-ai-config.json');
    // Register the sidebar welcome webview
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri);

    // Scan for available tools/environment on activation
    welcomeProvider.scanTools();
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
        vscode.commands.registerCommand('nowdev-ai-toolbox.refreshStatus', () => {
            welcomeProvider.refreshStatus();
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.showAgentTopology', () => {
            showAgentTopologyPanel(welcomeProvider.getAgentManifests(), welcomeProvider.getAgentOverrides());
        }),
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
                const aliases = (new InstanceClient(context.secrets)).listAliases();
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

            // Build the now-sdk init command
            const args = [
                `--appName "${appName.trim()}"`,
                `--packageName "${packageName.trim()}"`,
                `--scopeName "${scopeName.trim()}"`,
                `--template ${templatePick.label}`,
            ];
            if (fromValue) {
                // Use double quotes for paths/sys_ids that may contain spaces
                args.push(`--from "${fromValue.replace(/"/g, '\\"')}"`);
            }
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
    ): Promise<boolean> {
        const chan = vscode.window.createOutputChannel(`NowDev: SDK ${label}`);
        chan.show(true);
        chan.appendLine(`> now-sdk ${cmdArgs.join(' ')}\n`);

        return Promise.resolve(vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `NowDev SDK: ${label}`,
                cancellable: true,
            },
            (_progress, token) => new Promise<boolean>((resolve) => {
                const proc = cp.spawn('now-sdk', cmdArgs, { cwd, shell: getShell() });
                let cancelled = false;
                token.onCancellationRequested(() => {
                    cancelled = true;
                    chan.appendLine(`\n[cancelled by user]`);
                    try { proc.kill('SIGTERM'); } catch { /* ignore */ }
                    setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* ignore */ } }, 2000);
                });
                proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
                proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
                proc.on('close', (code: number | null) => {
                    const ok = !cancelled && code === 0;
                    if (ok) {
                        chan.appendLine(`\n✓ ${label} completed successfully.`);
                        onSuccess?.();
                    } else if (cancelled) {
                        chan.appendLine(`\n✗ ${label} cancelled.`);
                    } else {
                        chan.appendLine(`\n✗ ${label} failed (exit code ${code}).`);
                    }
                    const message = ok
                        ? `${label} succeeded`
                        : cancelled ? `${label} cancelled` : `Failed (exit ${code})`;
                    welcomeProvider.setSdkCommandStatus(statusKey, ok, message);
                    resolve(ok);
                });
            })
        ));
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

        // Deploy (Build then Install)
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkDeploy', async (args: { reinstall?: boolean; openBrowser?: boolean; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            welcomeProvider.setSdkCommandStatus('deploy', true, 'Building…');
            const buildArgs = ['build', '.'];
            if (args.auth) { buildArgs.push('--auth', args.auth); }
            const buildOk = await spawnSdkCmd('Build', buildArgs, cwd, 'build');
            if (!buildOk) {
                welcomeProvider.setSdkCommandStatus('deploy', false, 'Deploy failed — Build error');
                return;
            }
            welcomeProvider.setSdkCommandStatus('deploy', true, 'Build succeeded · Installing…');
            const installArgs = ['install'];
            if (args.reinstall) { installArgs.push('--reinstall'); }
            if (args.openBrowser) { installArgs.push('--open-browser'); }
            if (args.auth) { installArgs.push('--auth', args.auth); }
            const installOk = await spawnSdkCmd('Install', installArgs, cwd, 'install');
            welcomeProvider.setSdkCommandStatus('deploy', installOk, installOk ? 'Deployed successfully' : 'Deploy failed — Install error');
        }),

        // Transform (with preview → virtual document; supports --from <path> for local XML)
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkTransform', async (args: { preview?: boolean; auth?: string; from?: string; pickFrom?: boolean } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }

            let fromPath = args.from;
            if (args.pickFrom && !fromPath) {
                const picked = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Select XML file or folder to transform',
                });
                if (!picked || picked.length === 0) { return; }
                fromPath = picked[0].fsPath;
            }

            const cmdArgs = ['transform'];
            if (fromPath) { cmdArgs.push('--from', fromPath); }
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

            const cmdArgs = ['auth', '--add', instance.trim(), '--type', typePick.label];
            if (alias?.trim()) { cmdArgs.push('--alias', alias.trim()); }

            if (typePick.label === 'oauth') {
                // OAuth requires interactive stdin so the user can paste the authorization
                // code from the browser. An Output Channel is read-only, so we open a
                // real VS Code terminal instead.
                const terminal = vscode.window.createTerminal({ name: 'NowDev: SDK Auth Add (OAuth)' });
                terminal.show();
                terminal.sendText(`now-sdk ${cmdArgs.join(' ')}`);
                const listener = vscode.window.onDidCloseTerminal(t => {
                    if (t === terminal) {
                        listener.dispose();
                        welcomeProvider.refreshAuthAliases();
                    }
                });
            } else {
                const chan = vscode.window.createOutputChannel('NowDev: SDK Auth Add');
                chan.show(true);
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
            }
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
        }),

        // Open the dedicated Dependency Picker panel
        vscode.commands.registerCommand('nowdev-ai-toolbox.openDependencyPicker', () => {
            showDependencyPickerPanel(context);
        }),

        // Open the Instance Context Scanner panel
        vscode.commands.registerCommand('nowdev-ai-toolbox.openContextScanner', () => {
            showContextScannerPanel(context);
        }),

        // Clear stored REST credentials for an auth alias
        vscode.commands.registerCommand('nowdev-ai-toolbox.clearAliasCredentials', async (alias?: string) => {
            const client = new InstanceClient(context.secrets);
            let target = alias;
            if (!target) {
                const aliases = client.listAliases();
                const pick = await vscode.window.showQuickPick(
                    aliases.map(a => ({ label: a.alias, description: a.host })),
                    { placeHolder: 'Forget REST credentials for which alias?' }
                );
                if (!pick) { return; }
                target = pick.label;
            }
            await client.clearCredentials(target);
            vscode.window.showInformationMessage(`Cleared stored REST credentials for "${target}".`);
        }),

        // Move — transform global-scope metadata XML into local Fluent code
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkMove', async (args: { ids?: string[]; auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            let ids = args.ids;
            if (!ids || ids.length === 0) {
                const idsInput = await vscode.window.showInputBox({
                    prompt: 'Comma-separated sys_ids of global metadata to move',
                    placeHolder: '9f4e7402317d470da09ac34c0693d02d,c4e34f348b1843899ca5efb2a31666f0',
                    validateInput: (v) => (!v.trim() ? 'At least one sys_id is required' : undefined),
                });
                if (!idsInput) { return; }
                ids = idsInput.split(',').map(s => s.trim()).filter(Boolean);
            }
            const cmdArgs = ['move', '--ids', ids.join(',')];
            if (args.auth) { cmdArgs.push('--auth', args.auth); }
            spawnSdkCmd('Move', cmdArgs, cwd, 'move');
        }),

        // Sync — incremental download then transform in one click
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkSync', async (args: { auth?: string } = {}) => {
            const cwd = getWorkspaceFolder();
            if (!cwd) { vscode.window.showErrorMessage('No workspace folder open.'); return; }
            const downloadDir = path.join(cwd, 'metadata');
            const downloadArgs = ['download', downloadDir, '--incremental'];
            if (args.auth) { downloadArgs.push('--auth', args.auth); }
            const downloadOk = await spawnSdkCmd('Download', downloadArgs, cwd, 'download');
            if (!downloadOk) {
                welcomeProvider.setSdkCommandStatus('sync', false, 'Sync stopped: download failed');
                return;
            }
            const transformArgs = ['transform'];
            if (args.auth) { transformArgs.push('--auth', args.auth); }
            const transformOk = await spawnSdkCmd('Transform', transformArgs, cwd, 'transform');
            welcomeProvider.setSdkCommandStatus('sync', transformOk, transformOk ? 'Sync completed' : 'Sync stopped: transform failed');
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

    // Enable model details badge in agent responses (v1.119+) — shows model name and cost multiplier
    if (todoAgentConfig.get<boolean>('modelDetails.enabled') !== true) {
        todoAgentConfig.update('modelDetails.enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.agent.modelDetails.enabled');
        }, (error: any) => {
            console.error('Failed to enable modelDetails:', error);
        });
    }

    // Enable stable symbol caching (v1.118+) — reduces latency for repeated skill/agent invocations
    const cacheConfig = vscode.workspace.getConfiguration('chat.experimental');
    if (cacheConfig.get<boolean>('symbolTools.cacheStable') !== true) {
        cacheConfig.update('symbolTools.cacheStable', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled chat.experimental.symbolTools.cacheStable');
        }, (error: any) => {
            console.error('Failed to enable symbolTools cache:', error);
        });
    }

    // Agents are now registered via package.json chatAgents contribution
    // No additional installation logic needed

}

function ensureGitignoreEntry(entry: string): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const gitignorePath = path.join(rootPath, '.gitignore');

    try {
        let content = '';
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, 'utf-8');
            if (content.split(/\r?\n/).map(l => l.trim()).includes(entry)) { return; }
        }
        const suffix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
        fs.appendFileSync(gitignorePath, `${suffix}${entry}\n`, 'utf-8');
    } catch (err) {
        console.error('Failed to update .gitignore:', err);
    }
}

export function deactivate() {}
