import * as os from 'os';
import { execSync } from 'child_process';

export interface ToolInfo {
    /** Whether the tool binary was found on the system */
    available: boolean;
    /** Whether the user has enabled this tool for agent use */
    enabled: boolean;
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
        command: 'now-sdk --version',
        versionCommand: 'now-sdk --version',
        label: 'ServiceNow SDK (now-sdk)',
        description: 'ServiceNow Fluent SDK CLI for build and deploy',
        impact: 'Required for Fluent development — cannot build or deploy .now.ts files without it',
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
    },
};

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

function tryExec(command: string, timeoutMs = 5000): string | null {
    try {
        const result = execSync(command, {
            timeout: timeoutMs,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return result.trim();
    } catch {
        return null;
    }
}

function extractVersion(raw: string): string {
    // Try to extract a semver-like version from the output
    const match = raw.match(/(\d+\.\d+[\w.-]*)/);
    return match ? match[1] : raw.substring(0, 40);
}

/**
 * Scans the system for available tools and environment information.
 * Each tool check is wrapped in try/catch so a single failure never crashes the scan.
 */
export function scanEnvironment(disabledTools: string[]): EnvironmentInfo {
    const tools: Record<string, ToolInfo> = {};

    for (const [key, def] of Object.entries(TOOL_DEFINITIONS)) {
        try {
            const raw = tryExec(def.versionCommand);
            const available = raw !== null;
            const userDisabled = disabledTools.includes(key);

            tools[key] = {
                available,
                enabled: available && !userDisabled,
                version: available && raw ? extractVersion(raw) : '',
                label: def.label,
                description: def.description,
                impact: def.impact,
            };
        } catch {
            tools[key] = {
                available: false,
                enabled: false,
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
