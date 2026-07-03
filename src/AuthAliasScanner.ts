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
let cachedAliases: AuthAlias[] | undefined;

/**
 * Cached across the extension host session — the underlying scan spawns a
 * process and can take seconds. Every UI surface
 * (Welcome tab, Instance Browser) shares this cache so only the first caller
 * pays the scan cost; pass forceRefresh after credentials change.
 */
export function scanAuthAliases(forceRefresh = false): AuthAlias[] {
    if (!forceRefresh && cachedAliases !== undefined) { return cachedAliases; }
    let result: AuthAlias[] = [];
    for (const raw of collectAuthListOutputs()) {
        if (raw.includes('Listing all credentials') || /^\s*\*?\[.+\]\s*$/m.test(raw)) {
            const aliases = parseAuthListOutput(raw);
            if (aliases.length > 0) { result = aliases; break; }
        }
    }
    cachedAliases = result;
    return result;
}

function pickDefaultHost(aliases: AuthAlias[]): string {
    return aliases.find(a => a.isDefault)?.host ?? aliases[0]?.host ?? '';
}

/**
 * The instance URL for the alias `now-sdk` currently treats as default
 * (`now-sdk auth --use <alias>`), falling back to the first alias if none is
 * flagged default. This is the single source of truth for "the instance" —
 * every view that needs an instance URL should derive it from here instead
 * of asking the user to enter one separately. Triggers a scan (and its
 * process-spawn cost) if the alias list hasn't been read yet this session;
 * only call this from explicit user actions, not passive status refreshes —
 * use getCachedDefaultInstanceHost() for those.
 */
export function getDefaultInstanceHost(): string {
    return pickDefaultHost(scanAuthAliases());
}

/**
 * Same as getDefaultInstanceHost(), but never triggers a scan — returns ''
 * until some other surface (SDK tab, Instance Browser, a rescan) has
 * populated the cache. Safe to call from frequent/passive status refreshes.
 */
export function getCachedDefaultInstanceHost(): string {
    return cachedAliases ? pickDefaultHost(cachedAliases) : '';
}

/**
 * Runs `now-sdk auth --list` and yields stdout+stderr for each strategy.
 *
 * On Windows, buildShellInvocation resolves the now-sdk `.cmd` shim to the real
 * node.exe + .js entry point it wraps and invokes Node directly (no cmd.exe or
 * PowerShell involved), so this works even when script hosts are locked down by
 * Group Policy. Stdin must still be closed — an open stdin pipe hangs the CLI
 * (ETIMEDOUT) regardless of invocation strategy. We resolve the shim by full path
 * so detection survives a stripped PATH in GUI-launched VS Code, then fall back to
 * a bare `now-sdk` on PATH (buildShellInvocation falls back to a quoted cmd.exe
 * invocation in that case, since there's no shim file to parse).
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
                // stdin pipe when run non-interactively (ETIMEDOUT).
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
