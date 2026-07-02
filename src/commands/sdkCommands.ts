import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WelcomeViewProvider } from '../WelcomeViewProvider';
import { spawnSdk } from '../SdkProcess';
import { showSdkExplainPanel } from '../SdkExplainPanel';
import { showSdkQueryPanel } from '../SdkQueryPanel';
import { showInstanceBrowserPanel } from '../InstanceBrowserPanel';
import { getDefaultInstanceHost } from '../AuthAliasScanner';
import {
    getWorkspaceFolder,
    captureSdkOutput,
    resolveWorkspaceChildPath,
    validateSdkCliValue,
    validateOptionalSdkAlias,
    checkInstanceReachability,
    listFilesRecursive,
} from '../extensionUtils';

export function registerSdkCommands(context: vscode.ExtensionContext, welcomeProvider: WelcomeViewProvider): void {
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
                const proc = spawnSdk(cmdArgs, { cwd });
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
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkTransform', async (args: { preview?: boolean; from?: string; pickFrom?: boolean; metadataFolder?: string } = {}) => {
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
            if (fromPath) {
                cmdArgs.push('--from', fromPath);
            } else {
                const metaFolder = args.metadataFolder?.trim() || 'metadata';
                const resolvedMetaFolder = resolveWorkspaceChildPath(cwd, metaFolder);
                if (!resolvedMetaFolder) {
                    vscode.window.showErrorMessage('Metadata folder must stay inside the workspace.');
                    return;
                }
                cmdArgs.push('--from', resolvedMetaFolder);
            }
            if (args.preview) { cmdArgs.push('--preview'); }

            if (args.preview) {
                const chan = vscode.window.createOutputChannel('NowDev: Transform Preview');
                chan.show(true);
                chan.appendLine(`> now-sdk ${cmdArgs.join(' ')}\n`);
                const result = await captureSdkOutput(cmdArgs, cwd);
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

        // Query — opens a webview panel showing live instance query results
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkQuery',
            (table: string, query: string, fields: string, limit: string, displayValue: string, offset: number = 0, page: number = 1) => {
                if (!table?.trim()) { return; }
                showSdkQueryPanel(table.trim(), query ?? '', fields ?? '', limit ?? '', displayValue ?? 'true', offset, page);
            }
        ),

        // Auth — Add
        vscode.commands.registerCommand('nowdev-ai-toolbox.sdkAuthAdd', async () => {
            const instance = await vscode.window.showInputBox({
                prompt: 'Instance URL or name to authenticate with',
                placeHolder: 'https://dev12345.service-now.com',
                validateInput: (v) => validateSdkCliValue(v, 'Instance'),
            });
            if (!instance) { return; }

            const alias = await vscode.window.showInputBox({
                prompt: 'Alias name for this credential (optional — leave blank to use instance name)',
                placeHolder: 'my-dev-instance',
                validateInput: validateOptionalSdkAlias,
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
                const terminal = vscode.window.createTerminal({
                    name: 'NowDev: SDK Auth Add (OAuth)',
                    shellPath: process.platform === 'win32' ? 'powershell.exe' : undefined,
                });
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

                const proc = spawnSdk(cmdArgs);
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
            const proc = spawnSdk(['auth', '--delete', alias]);
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
            const result = await captureSdkOutput(cmdArgs, cwd);
            const output = (result.stdout + result.stderr).trim();
            welcomeProvider.setInstallInfo({ loading: false, ok: result.code === 0, output, timestamp: new Date().toISOString() });
        }),

        // Connection health check
        vscode.commands.registerCommand('nowdev-ai-toolbox.checkConnection', async () => {
            const instanceUrl = getDefaultInstanceHost();
            welcomeProvider.refreshStatus();
            if (!instanceUrl) {
                vscode.window.showWarningMessage('No now-sdk auth alias configured. Add one in the NowDev SDK & Instance tab first.');
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
            const result = await captureSdkOutput(cmdArgs, cwd);
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
            const proc = spawnSdk(['auth', '--use', alias]);
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

        vscode.commands.registerCommand('nowdev-ai-toolbox.openInstanceBrowser', (mode?: 'browse' | 'discover' | 'guidelines') => {
            showInstanceBrowserPanel(context, mode ?? 'browse');
        }),

        vscode.commands.registerCommand('nowdev-ai-toolbox.openAgentGuidelines', () => {
            showInstanceBrowserPanel(context, 'guidelines');
        }),

        // Open Instance Browser in dependency browsing mode
        vscode.commands.registerCommand('nowdev-ai-toolbox.openDependencyPicker', () => {
            showInstanceBrowserPanel(context, 'browse');
        }),

        // Open Instance Browser in task discovery mode
        vscode.commands.registerCommand('nowdev-ai-toolbox.openContextScanner', () => {
            showInstanceBrowserPanel(context, 'discover');
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
            welcomeProvider.setSdkCommandStatus('sync', true, 'Downloading…');
            const downloadDir = path.join(cwd, 'metadata');
            const downloadArgs = ['download', downloadDir, '--incremental'];
            if (args.auth) { downloadArgs.push('--auth', args.auth); }
            const downloadOk = await spawnSdkCmd('Download', downloadArgs, cwd, 'download');
            if (!downloadOk) {
                welcomeProvider.setSdkCommandStatus('sync', false, 'Sync stopped: download failed');
                return;
            }
            welcomeProvider.setSdkCommandStatus('sync', true, 'Download succeeded · Transforming…');
            const transformArgs = ['transform', '--from', downloadDir];
            const transformOk = await spawnSdkCmd('Transform', transformArgs, cwd, 'transform');
            welcomeProvider.setSdkCommandStatus('sync', transformOk, transformOk ? 'Sync completed' : 'Sync stopped: transform failed');
        })
    );
}
