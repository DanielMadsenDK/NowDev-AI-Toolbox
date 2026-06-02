import * as child_process from 'child_process';
import * as https from 'https';
import * as http from 'http';
import { McpServerConfig } from './MCPScanner';

const TIMEOUT_MS = 10_000;

/**
 * Discovers the tool names exposed by an MCP server using the MCP protocol.
 *
 * For stdio servers: spawns the process, performs the initialize handshake,
 * sends tools/list, and kills the process when done.
 *
 * For HTTP servers: sends an HTTP POST with the tools/list JSON-RPC request.
 *
 * Returns an empty array on any error or timeout.
 */
export async function discoverMcpServerTools(config: McpServerConfig): Promise<string[]> {
    if (config.kind === 'stdio') {
        return discoverStdioTools(config);
    }
    return discoverHttpTools(config);
}

// ── Stdio ──────────────────────────────────────────────────────────────────

function discoverStdioTools(config: { command: string; args: string[]; env: Record<string, string>; cwd?: string }): Promise<string[]> {
    return new Promise((resolve) => {
        let proc: child_process.ChildProcess;
        let settled = false;

        const done = (tools: string[]) => {
            if (settled) { return; }
            settled = true;
            clearTimeout(timer);
            try { proc?.kill(); } catch { /* ignore */ }
            resolve(tools);
        };

        const timer = setTimeout(() => done([]), TIMEOUT_MS);

        try {
            proc = child_process.spawn(config.command, config.args, {
                env: { ...process.env, ...config.env },
                cwd: config.cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch {
            return done([]);
        }

        let buffer = '';
        let initDone = false;

        const send = (obj: object) => {
            try { proc.stdin?.write(JSON.stringify(obj) + '\n'); } catch { /* ignore */ }
        };

        proc.stdout?.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            // Process all complete newline-delimited JSON messages in the buffer
            let nl: number;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line) { continue; }
                try {
                    const msg = JSON.parse(line) as {
                        id?: number | string;
                        result?: { tools?: Array<{ name: string }> };
                        error?: unknown;
                    };
                    if (msg.id === 1 && !initDone) {
                        // initialize response — send initialized notification then tools/list
                        initDone = true;
                        send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
                        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
                    } else if (msg.id === 2) {
                        // tools/list response
                        const tools = (msg.result?.tools ?? []).map((t) => t.name);
                        done(tools);
                    }
                } catch { /* malformed JSON — skip */ }
            }
        });

        proc.on('error', () => done([]));
        proc.on('close', () => done([]));

        // Kick off the MCP handshake
        send({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                clientInfo: { name: 'vscode-nowdev-toolbox', version: '1.0.0' },
            },
        });
    });
}

// ── HTTP / SSE ─────────────────────────────────────────────────────────────

function discoverHttpTools(config: { url: string; headers: Record<string, string> }): Promise<string[]> {
    return new Promise((resolve) => {
        const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
        let parsed: URL;
        try { parsed = new URL(config.url); } catch { return resolve([]); }

        const isHttps = parsed.protocol === 'https:';
        const options: http.RequestOptions = {
            hostname: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port, 10) : (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...config.headers,
            },
        };

        const req = (isHttps ? https : http).request(options, (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            res.on('end', () => {
                try {
                    const msg = JSON.parse(data) as { result?: { tools?: Array<{ name: string }> } };
                    resolve((msg.result?.tools ?? []).map((t) => t.name));
                } catch { resolve([]); }
            });
            res.on('error', () => resolve([]));
        });

        req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve([]); });
        req.on('error', () => resolve([]));
        req.write(body);
        req.end();
    });
}
