import { spawnSync } from 'child_process';
import { findNowSdkExecutable, buildShellInvocation } from './SdkProcess';

export interface AuthAlias {
    alias: string;
    host: string;
    type: string;
    isDefault: boolean;
}

/**
 * Reads auth aliases configured with `now-sdk auth --add`.
 * SDK 4.3.0+ stores credentials in the OS keychain via @napi-rs/keyring.
 * We parse the output of `now-sdk auth --list` rather than touching the keychain directly.
 *
 * Example output:
 *   [now-sdk] Listing all credentials:
 *   *[PDI]
 *         host = https://dev123.service-now.com
 *         type = oauth
 *         default = Yes
 */
export function scanAuthAliases(): AuthAlias[] {
    for (const raw of collectAuthListOutputs()) {
        if (raw.includes('Listing all credentials') || /^\s*\*?\[.+\]\s*$/m.test(raw)) {
            const aliases = parseAuthListOutput(raw);
            if (aliases.length > 0) { return aliases; }
        }
    }
    return [];
}

/**
 * Runs `now-sdk auth --list` and yields stdout+stderr for each strategy.
 *
 * On Windows the now-sdk shim is a `.cmd`, so it must run through cmd.exe
 * (shell:true) with a closed stdin — an open stdin pipe hangs the CLI (ETIMEDOUT).
 * We resolve the shim by full path so detection survives a stripped PATH in
 * GUI-launched VS Code, then fall back to a bare `now-sdk` on PATH. The full path
 * (and the bare name) are routed through buildShellInvocation so they are quoted:
 * without quoting, a path containing a space (e.g. a username like "John Smith")
 * makes cmd.exe fail with "'C:\\Users\\John' is not recognized".
 */
function collectAuthListOutputs(): string[] {
    const outputs: string[] = [];

    // Build the ordered list of executables to try.
    const executables: string[] = [];
    if (process.platform === 'win32') {
        const shim = findNowSdkExecutable();
        if (shim) { executables.push(shim); }
        executables.push('now-sdk');
    } else {
        executables.push('now-sdk');
    }

    for (const exe of executables) {
        try {
            const { command, args, shell } = buildShellInvocation(exe, ['auth', '--list']);
            const result = spawnSync(command, args, {
                timeout: 30000,
                encoding: 'utf-8',
                // stdin must be closed: now-sdk hangs waiting for input on an open
                // stdin pipe when run non-interactively (ETIMEDOUT). On Windows the
                // shim is a .cmd that requires a shell (cmd) to execute.
                stdio: ['ignore', 'pipe', 'pipe'],
                shell,
                windowsHide: true,
            });
            outputs.push(String(result.stdout ?? '') + String(result.stderr ?? ''));
        } catch (err: any) {
            outputs.push(String(err?.stdout ?? '') + String(err?.stderr ?? ''));
        }
    }
    return outputs;
}

function parseAuthListOutput(raw: string): AuthAlias[] {
    const aliases: AuthAlias[] = [];
    const lines = raw.split(/\r?\n/);
    let current: Partial<AuthAlias> | null = null;

    for (const line of lines) {
        // Match alias line: optional leading * (= default), then [ALIAS_NAME]
        const aliasMatch = line.match(/^\s*(\*)?\[(.+?)\]\s*$/);
        if (aliasMatch) {
            if (current?.alias !== undefined) {
                aliases.push(current as AuthAlias);
            }
            current = {
                alias: aliasMatch[2],
                isDefault: aliasMatch[1] === '*',
                host: '',
                type: '',
            };
            continue;
        }

        if (current) {
            const kvMatch = line.match(/^\s+(\w+)\s*=\s*(.+?)\s*$/);
            if (kvMatch) {
                const key = kvMatch[1].toLowerCase();
                const val = kvMatch[2];
                if (key === 'host') { current.host = val; }
                else if (key === 'type') { current.type = val; }
                else if (key === 'default') { current.isDefault = val.toLowerCase() === 'yes'; }
            }
        }
    }

    if (current?.alias !== undefined) {
        aliases.push(current as AuthAlias);
    }

    return aliases;
}
