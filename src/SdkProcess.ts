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
 * Quotes a single token for a PowerShell command line (single-quoted string,
 * with embedded single quotes doubled per PowerShell's escaping convention).
 *
 * On Windows the now-sdk/npm shims are `.cmd` files, which can't be spawned
 * directly with `shell:false` (EINVAL on patched Node), so we invoke them via
 * `powershell -Command`. PowerShell single-quoted strings treat "^", "$", and
 * backticks as literal characters, so this preserves paths containing a space
 * (a Windows username like "John Smith", or "C:\Program Files\nodejs\now-sdk.cmd").
 *
 * "^" needs separate handling — see quadrupleCaret.
 *
 * @param quadrupleCaret Quadruple any "^" in the token before quoting (see
 * needsCaretQuadrupling for why).
 */
export function quotePowerShellToken(token: string, quadrupleCaret: boolean): string {
    const value = quadrupleCaret ? String(token).replace(/\^/g, '^^^^') : String(token);
    return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Whether a Windows executable target is launched via an implicit cmd.exe
 * layer (batch files), as opposed to a real .exe the OS launches directly.
 *
 * PowerShell's single-quoted strings pass "^" through to CreateProcess as a
 * literal character. But .cmd/.bat files are batch scripts, and launching one
 * always goes through cmd.exe — and npm's generated shims (like now-sdk.cmd)
 * forward their arguments a *second* time via "%*" inside the script body,
 * which cmd.exe re-parses again. Each of those two cmd.exe passes treats "^"
 * as an escape character and collapses one level of doubling, so a literal
 * "^" (used to AND-chain ServiceNow encoded queries, e.g.
 * "active=true^ORDERBYname") must arrive as "^^^^" to survive both passes and
 * reach the wrapped Node process as a single "^". Verified empirically
 * against the real now-sdk.cmd shim — without this, any query with more than
 * one condition (^) or an ORDERBY silently returns zero records instead of
 * erroring, because cmd.exe strips the "^" rather than rejecting the query.
 *
 * A bare name with no extension (e.g. the "now-sdk" fallback in
 * AuthAliasScanner) resolves through PATHEXT, which for an npm CLI always
 * lands on the .cmd shim too — so only a literal ".exe" target is exempt.
 */
function needsCaretQuadrupling(executable: string): boolean {
    return !/\.exe$/i.test(executable);
}

/**
 * Builds the (command, args, shell) tuple used for both async (`spawn`) and sync
 * (`spawnSync`) invocations of a CLI shim.
 *
 * Windows: spawning a `.cmd` with `shell:false` throws EINVAL on patched Node, so
 * we invoke it through PowerShell instead of relying on `shell:true` (which would
 * delegate to cmd.exe via COMSPEC). We pre-build the full invocation ourselves with
 * every token quoted and pass it as a single `-Command` argument to `powershell.exe`
 * (a real executable, so `shell:false` is fine). This survives paths/usernames
 * containing spaces and preserves "^" in encoded queries (see needsCaretQuadrupling).
 *
 * Unix: the shim is directly executable, so we pass argv untouched with `shell:false`.
 */
export function buildShellInvocation(
    executable: string,
    args: string[]
): { command: string; args: string[]; shell: boolean } {
    if (isWindows) {
        const quadrupleCaret = needsCaretQuadrupling(executable);
        const commandLine = '& ' + [executable, ...args].map(t => quotePowerShellToken(t, quadrupleCaret)).join(' ');
        return { command: 'powershell', args: ['-NoProfile', '-NonInteractive', '-Command', commandLine], shell: false };
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
