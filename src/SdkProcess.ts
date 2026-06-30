import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SdkProcessOptions {
    cwd?: string;
    timeout?: number;
}

export const sdkExecutable = 'now-sdk';

const isWindows = process.platform === 'win32';

/**
 * Locates the now-sdk shim on disk so it can be invoked by full path, bypassing
 * PATH issues in GUI-launched VS Code processes. Checks PATH dirs plus the npm
 * global prefix (%APPDATA%\npm) for now-sdk.cmd / .exe / .bat. Result is cached.
 */
let cachedShim: string | null | undefined;
export function findNowSdkExecutable(): string | undefined {
    if (cachedShim !== undefined) { return cachedShim ?? undefined; }
    const dirs: string[] = [];
    const pathEnv = process.env.PATH || process.env.Path || '';
    dirs.push(...pathEnv.split(path.delimiter).filter(Boolean));
    if (process.env.APPDATA) { dirs.push(path.join(process.env.APPDATA, 'npm')); }
    dirs.push('C:\\Program Files\\nodejs', 'C:\\Program Files (x86)\\nodejs');
    const names = isWindows ? ['now-sdk.cmd', 'now-sdk.exe', 'now-sdk.bat'] : ['now-sdk'];
    const seen = new Set<string>();
    for (const dir of dirs) {
        const norm = path.normalize(dir);
        if (seen.has(norm)) { continue; }
        seen.add(norm);
        for (const name of names) {
            const candidate = path.join(norm, name);
            try { if (fs.existsSync(candidate)) { cachedShim = candidate; return candidate; } } catch { /* skip */ }
        }
    }
    cachedShim = null;
    return undefined;
}

/**
 * Quotes a single token for a cmd.exe command line.
 *
 * On Windows the now-sdk/npm shims are `.cmd` files, so they must be spawned
 * through a shell (`shell:true`). Node does NOT quote the executable or arguments
 * when `shell:true` — it just joins them with spaces and hands the string to
 * cmd.exe. That breaks two ways:
 *   1. A path containing a space (a Windows username like "John Smith", or
 *      "C:\Program Files\nodejs\now-sdk.cmd") is split by cmd.exe, so the command
 *      is not found.
 *   2. cmd metacharacters in arguments are interpreted — notably the "^" used in
 *      ServiceNow encoded queries (active=true^ORDERBYname) is silently stripped.
 * Wrapping each token in double quotes (and doubling embedded quotes, the cmd.exe
 * convention) makes cmd.exe treat the token verbatim.
 */
export function quoteWindowsToken(token: string): string {
    return '"' + String(token).replace(/"/g, '""') + '"';
}

/**
 * Builds the (command, args, shell) tuple used for both async (`spawn`) and sync
 * (`spawnSync`) invocations of a CLI shim.
 *
 * Windows: spawning a `.cmd` with `shell:false` throws EINVAL on patched Node, so
 * we must use cmd.exe (`shell:true`). Because Node performs no quoting in that mode,
 * we pre-build the full command line ourselves with every token quoted and pass it
 * as a single string (with an empty args array). This is the only reliable way to
 * survive paths/usernames containing spaces and to preserve "^" in encoded queries.
 *
 * Unix: the shim is directly executable, so we pass argv untouched with `shell:false`.
 */
export function buildShellInvocation(
    executable: string,
    args: string[]
): { command: string; args: string[]; shell: boolean } {
    if (isWindows) {
        const commandLine = [executable, ...args].map(quoteWindowsToken).join(' ');
        return { command: commandLine, args: [], shell: true };
    }
    return { command: executable, args, shell: false };
}

/**
 * Resolves the now-sdk executable. On Windows we prefer the full shim path (so a
 * stripped PATH in GUI-launched VS Code still works); on Unix the `now-sdk` shebang
 * script is directly executable.
 */
function resolveSdkExecutable(): string {
    return isWindows ? findNowSdkExecutable() ?? sdkExecutable : sdkExecutable;
}

export function spawnSdk(args: string[], options: SdkProcessOptions = {}): cp.ChildProcessWithoutNullStreams {
    const { command, args: spawnArgs, shell } = buildShellInvocation(resolveSdkExecutable(), args);
    const proc = cp.spawn(command, spawnArgs, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell,
        windowsHide: true,
    });
    // now-sdk hangs (ETIMEDOUT) waiting on an open stdin when run non-interactively.
    // Close stdin immediately so the CLI sees EOF and proceeds.
    proc.stdin.end();
    return proc;
}

export function spawnNpm(args: string[], options: SdkProcessOptions = {}): cp.ChildProcessWithoutNullStreams {
    // npm ships as npm.cmd on Windows; spawning a .cmd requires a shell on
    // patched Node (shell:false throws EINVAL). Unix npm is directly executable.
    const executable = isWindows ? 'npm.cmd' : 'npm';
    const { command, args: spawnArgs, shell } = buildShellInvocation(executable, args);
    const proc = cp.spawn(command, spawnArgs, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell,
        windowsHide: true,
    });
    proc.stdin.end();
    return proc;
}
