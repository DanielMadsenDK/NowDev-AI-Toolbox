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
 * Resolves how to invoke the now-sdk CLI.
 *
 * Empirically on Windows the now-sdk shim is a `.cmd` file: it cannot be spawned
 * with `shell:false` (EINVAL/ENOENT) and runs fastest when the full path is
 * resolved and executed through `shell:true` (cmd.exe). PowerShell also works
 * but is ~2.5x slower and hangs on commands that read stdin (e.g. `auth --list`).
 * On Unix the `now-sdk` shebang script is directly executable with `shell:false`.
 */
function resolveSdkInvocation(): { executable: string; shell: boolean } {
    if (isWindows) {
        return { executable: findNowSdkExecutable() ?? sdkExecutable, shell: true };
    }
    return { executable: sdkExecutable, shell: false };
}

export function spawnSdk(args: string[], options: SdkProcessOptions = {}): cp.ChildProcessWithoutNullStreams {
    const { executable, shell } = resolveSdkInvocation();
    const proc = cp.spawn(executable, args, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell,
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
    const proc = cp.spawn(executable, args, {
        cwd: options.cwd,
        timeout: options.timeout,
        shell: isWindows,
    });
    proc.stdin.end();
    return proc;
}
