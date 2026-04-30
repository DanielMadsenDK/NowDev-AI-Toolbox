import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AgentManifest } from './AgentRegistry';

export interface AgentOverride {
    enabled: boolean;        // false → file not written to workspace
    disabledTools: string[]; // tools to strip from the base list
}

export interface WorkspaceAgentSyncConfig {
    mcpIntegrations: string[];
    agentOverrides: Record<string, AgentOverride>;
    autoUpdate: boolean;
}

const AGENTS_SRC       = path.join('agents', 'github-copilot');
const AGENTS_OUT       = path.join('.github', 'agents');
const HASH_TAG         = '# nowdev-hash:';
const MANAGED_TAG      = '# nowdev-managed: true';
const ORCHESTRATOR_NAME = 'NowDev AI Agent'; // always written — cannot be disabled

/**
 * Writes every bundled agent file into `.github/agents/` in the workspace,
 * applying per-user configuration on top:
 *
 *  - MCP server wildcards are prepended to `tools:` for user-invocable agents.
 *  - Disabled tools are stripped from the `tools:` list.
 *  - `agent` tool is auto-added to any agent that lists sub-agents.
 *  - Disabled agents are not written (existing file is deleted). The
 *    orchestrator (NowDev AI Agent) is always written and cannot be disabled.
 *  - The `agents:` list in each written file is pruned to remove any
 *    disabled agent names so the orchestrator never tries to invoke a
 *    non-existent agent.
 *
 * Each written file is stamped with a hash of the inputs so that stale files
 * are silently regenerated after an extension update or config change.
 */
export function syncAllAgents(
    extensionPath: string,
    workspaceRoot: string,
    manifests: AgentManifest[],
    cfg: WorkspaceAgentSyncConfig
): void {
    const outDir = path.join(workspaceRoot, AGENTS_OUT);

    // Build the set of disabled agent names up-front so every written file
    // can have them removed from its own agents: list.
    const disabledAgentNames = new Set<string>(
        manifests
            .filter(m => m.name !== ORCHESTRATOR_NAME && (cfg.agentOverrides[m.name]?.enabled === false))
            .map(m => m.name)
    );

    for (const manifest of manifests) {
        const srcPath = path.join(extensionPath, AGENTS_SRC, manifest.filename);
        const outPath = path.join(outDir, manifest.filename);

        if (!fs.existsSync(srcPath)) { continue; }

        const override      = cfg.agentOverrides[manifest.name];
        const enabled       = manifest.name === ORCHESTRATOR_NAME || (override?.enabled ?? true);
        const disabledTools = new Set(override?.disabledTools ?? []);

        // Disabled agents: remove any existing file, do not write a new one
        if (!enabled) {
            if (fs.existsSync(outPath)) { fs.rmSync(outPath); }
            continue;
        }

        // MCP wildcards only for top-level (user-invocable) agents — sub-agents
        // receive context from the orchestrator, they don't need direct MCP access.
        const mcpTools: string[] = manifest.userInvocable
            ? cfg.mcpIntegrations.map(s => `${s.toLowerCase()}/*`)
            : [];

        // Effective tools: MCP first, then base minus disabled
        const effectiveTools: string[] = [
            ...mcpTools,
            ...manifest.baseTools.filter(t => !disabledTools.has(t)),
        ];

        // Guarantee 'agent' is present whenever the file delegates to sub-agents
        if (manifest.subAgentNames.length > 0 && !effectiveTools.includes('agent')) {
            effectiveTools.push('agent');
        }

        const bundledContent = fs.readFileSync(srcPath, 'utf-8');

        // Build a stable hash that captures all inputs that affect the output
        const stateKey = JSON.stringify({
            srcHash:       crypto.createHash('sha256').update(bundledContent).digest('hex'),
            mcpTools:      [...mcpTools].sort(),
            disabledTools: [...disabledTools].sort(),
            disabledAgents: [...disabledAgentNames].sort(),
        });
        const combinedHash = crypto.createHash('sha256').update(stateKey).digest('hex');

        // Respect opt-out: if the file exists and auto-update is off, leave it alone
        if (!cfg.autoUpdate && fs.existsSync(outPath)) { continue; }

        // Skip regeneration when nothing has changed
        if (fs.existsSync(outPath)) {
            const existing = fs.readFileSync(outPath, 'utf-8');
            if (readTag(existing, HASH_TAG) === combinedHash) { continue; }
        }

        const newContent = buildContent(bundledContent, effectiveTools, disabledAgentNames, combinedHash);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, newContent, 'utf-8');
        addToGitignore(workspaceRoot, `.github/agents/${manifest.filename}`);
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildContent(
    bundled: string,
    effectiveTools: string[],
    disabledAgents: Set<string>,
    hash: string
): string {
    // Rewrite the tools: [...] line (always single-line in these files)
    const toolsLine = `tools: [${effectiveTools.map(t => `'${t}'`).join(', ')}]`;
    let content = bundled.replace(/^tools:\s*\[.*?\]$/m, toolsLine);

    // Filter disabled agent names from the agents: [...] list so the
    // orchestrator never tries to delegate to a non-existent file.
    if (disabledAgents.size > 0) {
        content = content.replace(/^(agents:\s*\[)([^\]]*)\]$/m, (_match, prefix, inner) => {
            const names = inner
                .split(',')
                .map((s: string) => s.trim().replace(/^['"`]|['"`]$/g, ''))
                .filter((n: string) => n && !disabledAgents.has(n));
            return `${prefix}${names.map((n: string) => `'${n}'`).join(', ')}]`;
        });
    }

    // Remove any stale stamp, then insert a fresh one after the opening ---
    content = content.replace(/\n# nowdev-managed: true\n# nowdev-hash: [^\n]+\n/g, '\n');
    content = content.replace(/^---\n/, `---\n${MANAGED_TAG}\n${HASH_TAG} ${hash}\n`);

    return content;
}

function readTag(content: string, tag: string): string {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = content.match(new RegExp(`^${escaped}\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
}

function addToGitignore(workspaceRoot: string, entry: string): void {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    try {
        let existing = '';
        if (fs.existsSync(gitignorePath)) {
            existing = fs.readFileSync(gitignorePath, 'utf-8');
            if (existing.split(/\r?\n/).map(l => l.trim()).includes(entry)) { return; }
        }
        const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
        fs.appendFileSync(gitignorePath, `${sep}${entry}\n`, 'utf-8');
    } catch { /* ignore */ }
}
