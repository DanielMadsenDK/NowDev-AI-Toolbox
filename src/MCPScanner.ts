import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface McpServer {
    name: string;
    source: 'settings' | 'file';
    type?: string;
    kind?: McpServerConfig['kind'];
    path?: string;
}

export interface McpStdioConfig {
    kind: 'stdio';
    command: string;
    args: string[];
    env: Record<string, string>;
    cwd?: string;
}

export interface McpHttpConfig {
    kind: 'http';
    url: string;
    headers: Record<string, string>;
}

export type McpServerConfig = McpStdioConfig | McpHttpConfig;

/** Parses a raw server record into a typed config, or undefined if unrecognisable. */
function parseServerEntry(entry: Record<string, unknown>): McpServerConfig | undefined {
    // HTTP / SSE — presence of `url` field
    if (typeof entry['url'] === 'string') {
        return {
            kind: 'http',
            url: entry['url'],
            headers: (entry['headers'] ?? {}) as Record<string, string>,
        };
    }
    // Stdio — presence of `command` field
    if (typeof entry['command'] === 'string') {
        return {
            kind: 'stdio',
            command: entry['command'],
            args: Array.isArray(entry['args']) ? (entry['args'] as string[]) : [],
            env: (entry['env'] ?? {}) as Record<string, string>,
            cwd: typeof entry['cwd'] === 'string' ? entry['cwd'] : undefined,
        };
    }
    return undefined;
}

interface McpFileEntry {
    folderPath: string;
    filePath: string;
    servers: Record<string, Record<string, unknown>>;
}

/**
 * Reads and parses every workspace MCP config file (current `.mcp.json` plus
 * legacy `.vscode/mcp.json`, across all workspace folders). Shared by
 * getMcpServerConfig and scanMcpServers so the same files are read once.
 */
function readWorkspaceMcpFiles(): McpFileEntry[] {
    const entries: McpFileEntry[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return entries; }
    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        for (const filePath of [
            path.join(folderPath, '.mcp.json'),
            path.join(folderPath, '.vscode', 'mcp.json'),
        ]) {
            try {
                if (!fs.existsSync(filePath)) { continue; }
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
                const servers = (data['servers'] ?? {}) as Record<string, Record<string, unknown>>;
                entries.push({ folderPath, filePath, servers });
            } catch { /* ignore */ }
        }
    }
    return entries;
}

/**
 * Returns the connection configuration for a named MCP server, or undefined
 * if the server is not found or its config cannot be parsed.
 */
export function getMcpServerConfig(serverName: string): McpServerConfig | undefined {
    // 1. VS Code mcp.servers setting
    const mcpCfg = vscode.workspace.getConfiguration('mcp');
    const settingsServers = mcpCfg.get<Record<string, Record<string, unknown>>>('servers', {});
    if (settingsServers[serverName]) {
        const cfg = parseServerEntry(settingsServers[serverName]);
        if (cfg) { return cfg; }
    }

    // 2. Workspace MCP files (.mcp.json and legacy .vscode/mcp.json)
    for (const entry of readWorkspaceMcpFiles()) {
        if (entry.servers[serverName]) {
            const cfg = parseServerEntry(entry.servers[serverName]);
            if (cfg) { return cfg; }
        }
    }
    return undefined;
}

/**
 * Scans for installed MCP servers from VS Code settings and workspace MCP files.
 *
 * VS Code 1.118 uses workspace-level `.mcp.json` files. We also keep legacy
 * support for `.vscode/mcp.json` so existing workspaces continue to work.
 *
 * Servers are deduplicated by name. Settings-level entries take precedence
 * over file-level entries so that user-profile servers are not shadowed.
 */
export function scanMcpServers(): McpServer[] {
    const servers: McpServer[] = [];
    const seen = new Set<string>();

    // 1. VS Code mcp.servers setting (user profile or workspace settings.json)
    const mcpCfg = vscode.workspace.getConfiguration('mcp');
    const settingsServers = mcpCfg.get<Record<string, object>>('servers', {});
    for (const name of Object.keys(settingsServers)) {
        if (!seen.has(name)) {
            seen.add(name);
            const srv = settingsServers[name] as Record<string, unknown>;
            servers.push({ name, source: 'settings', type: srv['type'] as string | undefined, kind: parseServerEntry(srv)?.kind });
        }
    }

    // 2. Workspace MCP files.
    // Prefer the current `.mcp.json` location, then fall back to legacy
    // `.vscode/mcp.json` for backwards compatibility.
    for (const entry of readWorkspaceMcpFiles()) {
        for (const name of Object.keys(entry.servers)) {
            if (!seen.has(name)) {
                seen.add(name);
                const srv = entry.servers[name];
                servers.push({ name, source: 'file', type: srv['type'] as string | undefined, kind: parseServerEntry(srv)?.kind, path: path.relative(entry.folderPath, entry.filePath).replace(/\\/g, '/') });
            }
        }
    }

    return servers;
}
