import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ToolInfo {
    /** Whether the tool binary was found on the system */
    available: boolean;
    /** Whether the user has enabled this tool for agent use */
    enabled: boolean;
    /** True when the user has manually force-enabled this tool (auto-detection was skipped) */
    manualOverride: boolean;
    /** Version string if detected */
    version: string;
    /** Human-readable label for the UI */
    label: string;
    /** What this tool is used for — shown in the sidebar */
    description: string;
    /** Impact description when the tool is missing */
    impact: string;
}

export interface EnvironmentInfo {
    os: string;
    osVersion: string;
    arch: string;
    shell: string;
    tools: Record<string, ToolInfo>;
}

interface ToolDefinition {
    /** Command to check existence (should return 0 on success) */
    command: string;
    /** Command to get version string */
    versionCommand: string;
    label: string;
    description: string;
    impact: string;
    /** Optional: validate the command output is meaningful (prevents false positives) */
    validateOutput?: (output: string) => boolean;
    /**
     * Optional: fully replace command-based detection with a custom function.
     * Return { version } on success, or null if not found.
     */
    detect?: () => { version: string } | null;
}

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
    node: {
        command: 'node --version',
        versionCommand: 'node --version',
        label: 'Node.js',
        description: 'JavaScript runtime for build tools and SDK',
        impact: 'Required for Fluent SDK (now-sdk) builds and npm packages',
    },
    npm: {
        command: 'npm --version',
        versionCommand: 'npm --version',
        label: 'npm',
        description: 'Node package manager',
        impact: 'Required for installing dependencies and Fluent SDK tooling',
    },
    'now-sdk': {
        // The now-sdk binary hangs on some Windows machines (ETIMEDOUT) so we never
        // invoke it. Instead we locate the package via the filesystem — no process
        // spawning needed, therefore no timeout risk.
        command: 'now-sdk --version',
        versionCommand: 'now-sdk --version',
        label: 'ServiceNow SDK (now-sdk)',
        description: 'ServiceNow Fluent SDK CLI for build and deploy',
        impact: 'Required for Fluent development — cannot build or deploy .now.ts files without it',
        detect: () => detectNpmGlobalPackage('now-sdk'),
    },
    git: {
        command: 'git --version',
        versionCommand: 'git --version',
        label: 'Git',
        description: 'Version control system',
        impact: 'Required for source control and deployment workflows',
    },
    python: {
        command: process.platform === 'win32' ? 'python --version' : 'python3 --version',
        versionCommand: process.platform === 'win32' ? 'python --version' : 'python3 --version',
        label: 'Python',
        description: 'Scripting language for automation and data tasks',
        impact: 'Agents can use Python for scripting, data processing, and automation tasks',
    },
    powershell: {
        command: process.platform === 'win32' ? 'powershell -Command "$PSVersionTable.PSVersion.ToString()"' : 'pwsh --version',
        versionCommand: process.platform === 'win32' ? 'powershell -Command "$PSVersionTable.PSVersion.ToString()"' : 'pwsh --version',
        label: 'PowerShell',
        description: 'Task automation and configuration management',
        impact: 'Agents can use PowerShell for system administration and automation scripts',
    },
    curl: {
        command: 'curl --version',
        versionCommand: 'curl --version',
        label: 'curl',
        description: 'Command-line HTTP client',
        impact: 'Agents can use curl for REST API testing and HTTP requests',
    },
    snc: {
        command: 'snc --version',
        versionCommand: 'snc --version',
        label: 'SNC CLI',
        description: 'ServiceNow CLI tool',
        impact: 'Alternative CLI for ServiceNow instance management',
        // Validate output to avoid false positives from Windows app execution aliases
        // or other programs named 'snc'. Require a real semver-style version number.
        validateOutput: (output: string) => /\d+\.\d+\.\d+/.test(output),
    },
};

/**
 * Detects a globally installed npm package by reading its package.json directly
 * from the filesystem — no process spawning, so it never hangs.
 *
 * Checks, in order:
 *   1. %APPDATA%\npm\node_modules\<pkg>  (Windows npm default global prefix)
 *   2. <npm_execpath>/../node_modules\<pkg>  (derived from npm's own location)
 *   3. ~/.npm-global/lib/node_modules/<pkg>  (common Unix custom prefix)
 *   4. /usr/local/lib/node_modules/<pkg>     (Unix system install)
 *   5. /usr/lib/node_modules/<pkg>           (Unix system install alt)
 */
function detectNpmGlobalPackage(pkgName: string): { version: string } | null {
    const candidates: string[] = [];

    // Strategy 1: scan PATH directories for the binary shim (.cmd on Windows, plain file on Unix).
    // The shim is always placed in the npm prefix directory, and node_modules lives alongside it.
    // This works regardless of what npm prefix the user has configured.
    const pathEnv = process.env.PATH || process.env.Path || '';
    const shimName = process.platform === 'win32' ? `${pkgName}.cmd` : pkgName;
    for (const dir of pathEnv.split(path.delimiter)) {
        if (!dir) { continue; }
        try {
            if (fs.existsSync(path.join(dir, shimName))) {
                // npm puts node_modules alongside the shim (e.g. C:\Program Files\nodejs\node_modules)
                candidates.push(path.join(dir, 'node_modules', pkgName));
                // Some setups use lib/node_modules (Unix-style prefix under the same dir)
                candidates.push(path.join(dir, '..', 'lib', 'node_modules', pkgName));
            }
        } catch { /* skip unreadable dirs */ }
    }

    // Strategy 2: well-known fallback locations (in case the shim search misses anything)
    if (process.env.APPDATA) {
        candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', pkgName));
    }
    if (process.env.npm_config_prefix) {
        candidates.push(path.join(process.env.npm_config_prefix, 'lib', 'node_modules', pkgName));
        candidates.push(path.join(process.env.npm_config_prefix, 'node_modules', pkgName));
    }
    // Windows system Node.js installs
    candidates.push(path.join('C:\\Program Files\\nodejs', 'node_modules', pkgName));
    candidates.push(path.join('C:\\Program Files (x86)\\nodejs', 'node_modules', pkgName));
    // Unix common locations
    candidates.push(path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', pkgName));
    candidates.push(path.join('/usr', 'local', 'lib', 'node_modules', pkgName));
    candidates.push(path.join('/usr', 'lib', 'node_modules', pkgName));

    // Deduplicate
    const seen = new Set<string>();
    const deduped = candidates.filter(c => { const n = path.normalize(c); return seen.has(n) ? false : (seen.add(n), true); });

    for (const candidate of deduped) {
        try {
            const pkgJson = path.join(candidate, 'package.json');
            if (fs.existsSync(pkgJson)) {
                const version = JSON.parse(fs.readFileSync(pkgJson, 'utf-8')).version ?? '';
                return { version: String(version) };
            }
        } catch {
            // ignore and try next candidate
        }
    }
    return null;
}

function detectShell(): string {
    try {
        if (process.platform === 'win32') {
            // Check COMSPEC for default shell
            return process.env.COMSPEC || 'cmd.exe';
        }
        return process.env.SHELL || '/bin/sh';
    } catch {
        return 'unknown';
    }
}

function tryExec(command: string, timeoutMs = 10000): string | null {
    const opts = {
        timeout: timeoutMs,
        encoding: 'utf-8' as const,
        stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'],
    };

    // Some CLIs exit with a non-zero code but still write the version string to stdout.
    // execSync throws in that case but attaches the output to the error object.
    function execAndCapture(cmd: string): string | null {
        try {
            return execSync(cmd, opts).trim();
        } catch (err: any) {
            // Only capture stdout — Windows shell error messages (e.g. "not recognized")
            // go to stderr, so ignoring stderr avoids false positives for missing tools.
            const stdout = ((err?.stdout as string | undefined) || '').trim();
            return stdout || null;
        }
    }

    const direct = execAndCapture(command);
    if (direct !== null) {
        return direct;
    }

    // On Windows, the extension process may have a different PATH than an interactive
    // CMD or PowerShell session (e.g. npm global bin dir added via user profile).
    // Try progressively broader shell invocations as fallbacks.
    if (process.platform === 'win32') {
        // Attempt 1: explicit cmd /c — resolves .cmd/.bat extensions and uses system PATH
        const cmdResult = execAndCapture(`cmd /c ${command}`);
        if (cmdResult !== null) {
            return cmdResult;
        }

        // Attempt 2: PowerShell so npm-global PATH entries from user profile are loaded
        const psResult = execAndCapture(`powershell -Command "& { ${command} }"`);
        if (psResult !== null) {
            return psResult;
        }

        // Attempt 3: Explicitly prepend the npm global bin directory (%APPDATA%\npm) to
        // PATH before running via cmd.
        const appdata = process.env.APPDATA || '';
        if (appdata) {
            return execAndCapture(`cmd /c "set PATH=${appdata}\\npm;%PATH% && ${command}"`);
        }

        return null;
    }

    return null;
}

function extractVersion(raw: string): string {
    // Try to extract a semver-like version from the output
    const match = raw.match(/(\d+\.\d+[\w.-]*)/);
    return match ? match[1] : raw.substring(0, 40);
}

/**
 * Scans the system for available tools and environment information.
 * Each tool check is wrapped in try/catch so a single failure never crashes the scan.
 * @param disabledTools Tool keys the user has explicitly disabled.
 * @param enabledTools Tool keys the user has manually force-enabled (auto-detection skipped).
 */
export function scanEnvironment(disabledTools: string[], enabledTools: string[]): EnvironmentInfo {
    const tools: Record<string, ToolInfo> = {};

    for (const [key, def] of Object.entries(TOOL_DEFINITIONS)) {
        try {
            // If the user has manually force-enabled this tool, skip detection entirely.
            if (enabledTools.includes(key)) {
                tools[key] = {
                    available: false,
                    enabled: true,
                    manualOverride: true,
                    version: '',
                    label: def.label,
                    description: def.description,
                    impact: def.impact,
                };
                continue;
            }

            const userDisabled = disabledTools.includes(key);

            // If the tool has a custom detect() function, use it instead of spawning a process.
            if (def.detect) {
                const result = def.detect();
                tools[key] = {
                    available: result !== null,
                    enabled: result !== null && !userDisabled,
                    manualOverride: false,
                    version: result?.version ?? '',
                    label: def.label,
                    description: def.description,
                    impact: def.impact,
                };
                continue;
            }

            const raw = tryExec(def.versionCommand);
            const outputValid = raw !== null && (def.validateOutput ? def.validateOutput(raw) : true);
            const available = outputValid;

            tools[key] = {
                available,
                enabled: available && !userDisabled,
                manualOverride: false,
                version: available && raw ? extractVersion(raw) : '',
                label: def.label,
                description: def.description,
                impact: def.impact,
            };
        } catch {
            tools[key] = {
                available: false,
                enabled: false,
                manualOverride: false,
                version: '',
                label: def.label,
                description: def.description,
                impact: def.impact,
            };
        }
    }

    let osVersion = '';
    try {
        osVersion = os.release();
    } catch {
        // ignore
    }

    return {
        os: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux',
        osVersion,
        arch: os.arch(),
        shell: detectShell(),
        tools,
    };
}
