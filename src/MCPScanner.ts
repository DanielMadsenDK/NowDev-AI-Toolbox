import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface McpServer {
    name: string;
    source: 'settings' | 'file';
    type?: string;
}

/**
 * Scans for installed MCP servers from VS Code settings and the workspace
 * .vscode/mcp.json file (supported since VS Code 1.118).
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
            servers.push({ name, source: 'settings', type: srv['type'] as string | undefined });
        }
    }

    // 2. Workspace .vscode/mcp.json (VS Code 1.118+)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const mcpJsonPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'mcp.json');
        try {
            if (fs.existsSync(mcpJsonPath)) {
                const raw = fs.readFileSync(mcpJsonPath, 'utf-8');
                const data = JSON.parse(raw) as Record<string, unknown>;
                const fileServers = (data['servers'] ?? {}) as Record<string, Record<string, unknown>>;
                for (const name of Object.keys(fileServers)) {
                    if (!seen.has(name)) {
                        seen.add(name);
                        const srv = fileServers[name];
                        servers.push({ name, source: 'file', type: srv['type'] as string | undefined });
                    }
                }
            }
        } catch { /* ignore parse/read errors */ }
    }

    return servers;
}
