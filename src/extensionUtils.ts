import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { URL } from 'url';
import { spawnSdk } from './SdkProcess';

export function captureSdkOutput(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve) => {
        const proc = spawnSdk(args, { cwd });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('close', (code: number | null) => resolve({ stdout, stderr, code }));
        proc.on('error', () => resolve({ stdout, stderr, code: -1 }));
    });
}

export function resolveWorkspaceChildPath(workspaceRoot: string, relativeOrAbsolute: string): string | undefined {
    if (!/^[\w .\-/\\]+$/.test(relativeOrAbsolute) || relativeOrAbsolute.includes('..')) { return undefined; }
    const resolved = path.resolve(workspaceRoot, relativeOrAbsolute);
    const relative = path.relative(workspaceRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { return undefined; }
    return resolved;
}

export function validateSdkCliValue(value: string, label: string): string | undefined {
    if (!value.trim()) { return `${label} is required`; }
    if (/[\s;&|`$<>]/.test(value)) {
        return `${label} cannot contain whitespace or shell metacharacters.`;
    }
    return undefined;
}

export function validateOptionalSdkAlias(value: string): string | undefined {
    if (!value.trim()) { return undefined; }
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(value.trim())) {
        return 'Alias may only contain letters, numbers, dots, underscores, and hyphens.';
    }
    return undefined;
}

export function checkInstanceReachability(
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
            const parsed = new URL(normalizedUrl + '/login.do');
            const req = https.request(
                { hostname: parsed.hostname, port: parsed.port || 443, path: '/login.do', method: 'GET', timeout: 10000 },
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

export function listFilesRecursive(dir: string, root: string = dir): string[] {
    const results: string[] = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            const relative = path.relative(root, fullPath);
            if (relative.startsWith('..') || path.isAbsolute(relative)) { continue; }
            if (entry.isDirectory()) { results.push(...listFilesRecursive(fullPath, root)); }
            else { results.push(fullPath); }
        }
    } catch { /* ignore */ }
    return results;
}

export function getWorkspaceFolder(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function getArtifactStatePath(workspaceRoot: string): string | undefined {
    const configPath = path.join(workspaceRoot, '.vscode', 'nowdev-ai-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { artifactState?: { path?: unknown } };
            if (config.artifactState && typeof config.artifactState.path === 'string') {
                return resolveWorkspaceChildPath(workspaceRoot, config.artifactState.path);
            }
        }
    } catch {
        // Fall through to default workspace state path.
    }
    return resolveWorkspaceChildPath(workspaceRoot, '.vscode/nowdev-ai-session/artifacts.json');
}

export function ensureGitignoreEntry(entry: string): void {
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
