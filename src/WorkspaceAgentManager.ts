import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AgentManifest } from './AgentRegistry';

import { WorkspaceAgentSyncConfig, AllDocSources, DevOpsConfig, DEFAULT_DEVOPS_CONFIG } from './agentSync/types';
import { AGENTS_SRC, AGENTS_OUT, INSTRUCTIONS_OUT, PROMPTS_OUT, HASH_TAG, MANAGED_TAG, ORCHESTRATOR_AGENT_NAME, LOCKED_AGENT_NAMES, WORK_ITEM_MCP_AGENT_NAMES } from './agentSync/agentBundles';
import { setFrontmatterField, formatInlineArray, applyFrontmatterModel, normalizeModelList, readTag } from './agentSync/frontmatter';
import { getMcpToolEntries, buildDocServerWildcards, applyDevOpsPreambleToken, applyFluentSdkExplainToken, applyAllDocSourceTokens, applyProfileInstructionsToken, applyAgentConditionals, SDK_QUERY_BLOCK } from './agentSync/docTokens';
import { buildWorkspaceInstructionsContent, buildWorkspacePrompts } from './agentSync/instructionsContent';

// Re-export the public surface so existing importers of './WorkspaceAgentManager' keep working.
export { AgentOverride, McpIntegrationConfig, DocSource, AllDocSources, DEFAULT_ALL_DOC_SOURCES, GuidelineArticleRef, GuidelinesConfig, DevOpsConfig, DEFAULT_DEVOPS_CONFIG, SERVICENOW_RELEASES, WorkspaceAgentSyncConfig } from './agentSync/types';
export { LOCKED_AGENT_NAMES, AGENT_BUNDLES, getAgentBundleName } from './agentSync/agentBundles';

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
 *  - Managed output files that no longer correspond to bundled agents are
 *    removed so VS Code does not discover stale custom agents.
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
    const devops = cfg.devopsConfig ?? DEFAULT_DEVOPS_CONFIG;

    pruneStaleManagedAgentOutputs(outDir, manifests);

    const profileSuppressed = cfg.profileSuppressedAgents ?? new Set<string>();

    // Build the set of disabled agent names up-front so every written file
    // can have them removed from its own agents: list.
    // Profile suppression takes absolute priority; locked agents can be suppressed by a profile.
    const disabledAgentNames = new Set<string>(
        manifests
            .filter(m => {
                if (profileSuppressed.has(m.name)) { return true; }
                if (LOCKED_AGENT_NAMES.has(m.name)) { return false; }
                return cfg.agentOverrides[m.name]?.enabled === false;
            })
            .map(m => m.name)
    );

    for (const manifest of manifests) {
        if (!/^[\w.-]+\.agent\.md$/.test(manifest.filename)) { continue; }
        const srcPath = path.join(extensionPath, AGENTS_SRC, manifest.filename);
        const outPath = path.join(outDir, manifest.filename);
        if (!isPathInside(path.join(extensionPath, AGENTS_SRC), srcPath) || !isPathInside(outDir, outPath)) { continue; }

        if (!fs.existsSync(srcPath)) { continue; }

        const override      = cfg.agentOverrides[manifest.name];
        const isOrchestrator = manifest.name === ORCHESTRATOR_AGENT_NAME;
        const isWorkItemAware = WORK_ITEM_MCP_AGENT_NAMES.has(manifest.name);
        // Profile suppression overrides the locked-agent guarantee.
        const enabled       = !profileSuppressed.has(manifest.name) && (
                              LOCKED_AGENT_NAMES.has(manifest.name) ||
                              (override?.enabled ?? true));
        const disabledTools = new Set(override?.disabledTools ?? []);

        // Disabled agents: remove any existing file, do not write a new one
        if (!enabled) {
            if (fs.existsSync(outPath)) { fs.rmSync(outPath); }
            continue;
        }

        // MCP tool entries only for top-level (user-invocable) agents — sub-agents
        // receive context from the orchestrator, they don't need direct MCP access.
        let mcpTools: string[] = manifest.userInvocable
            ? cfg.mcpIntegrations.flatMap(s => getMcpToolEntries(s, cfg.mcpIntegrationConfigs?.[s]))
            : [];

        // Work-item integration: inject the configured MCP server's tools into the
        // agents that need direct access (orchestrator, Refinement, Assistant) so
        // they can read/update tasks even if that server is not also selected in
        // the general MCP list.
        if (isWorkItemAware && devops.enabled && devops.mcpServer) {
            for (const entry of getMcpToolEntries(devops.mcpServer, cfg.mcpIntegrationConfigs?.[devops.mcpServer])) {
                if (!mcpTools.includes(entry)) { mcpTools = [...mcpTools, entry]; }
            }
        }

        // Effective tools: MCP first, then base minus disabled.
        // Replace any hardcoded 'io.github.upstash/context7/*' in the base tools
        // with the user-configured doc-source server wildcards (remove if none configured).
        const docServerWildcards = buildDocServerWildcards(cfg.allDocSources);
        const baseToolsReplaced = manifest.baseTools.map(t => {
            if (t === 'io.github.upstash/context7/*') {
                return null; // expand to configured MCP wildcards, or remove if none configured
            }
            return t;
        });
        const expandedBase: string[] = [];
        for (const t of baseToolsReplaced) {
            if (t === null) {
                for (const w of docServerWildcards) {
                    if (!expandedBase.includes(w)) { expandedBase.push(w); }
                }
            } else if (t !== undefined) {
                expandedBase.push(t);
            }
        }

        const effectiveTools: string[] = [
            ...mcpTools,
            ...expandedBase.filter(t => !disabledTools.has(t)),
        ];
        const canRunTerminalCommands = effectiveTools.some(t =>
            t === 'execute/runInTerminal' || t === 'execute/createAndRunTask'
        );

        // Guarantee 'agent' is present whenever the file delegates to sub-agents
        if (manifest.subAgentNames.length > 0 && !effectiveTools.includes('agent')) {
            effectiveTools.push('agent');
        }

        const bundledContent = fs.readFileSync(srcPath, 'utf-8').replace(/\r\n/g, '\n');

        // Build a stable hash that captures all inputs that affect the output
        const stateKey = JSON.stringify({
            srcHash:       crypto.createHash('sha256').update(bundledContent).digest('hex'),
            mcpTools:      [...mcpTools].sort(),
            disabledTools: [...disabledTools].sort(),
            model:         normalizeModelList(override?.model),
            disabledAgents: [...disabledAgentNames].sort(),
            allDocSources: cfg.allDocSources,
            mcpIntegrationConfigs: cfg.mcpIntegrationConfigs,
            devopsConfig:  isWorkItemAware ? devops : undefined,
            activeProfileId: cfg.activeProfileId ?? '',
            profileInstructions: cfg.profileInstructions ?? '',
            customInstructions: cfg.customInstructions ?? '',
            agentGuidelines: cfg.agentGuidelines ?? '',
        });
        const combinedHash = crypto.createHash('sha256').update(stateKey).digest('hex');

        // Respect opt-out: if the file exists and auto-update is off, leave it alone
        if (!cfg.autoUpdate && fs.existsSync(outPath)) { continue; }

        // Skip regeneration when nothing has changed
        if (fs.existsSync(outPath)) {
            const existing = fs.readFileSync(outPath, 'utf-8');
            if (readTag(existing, HASH_TAG) === combinedHash) { continue; }
        }

        const newContent = buildContent(
            bundledContent,
            effectiveTools,
            disabledAgentNames,
            combinedHash,
            override?.model,
            cfg.allDocSources,
            isWorkItemAware ? devops : undefined,
            cfg.profileInstructions,
            cfg.customInstructions,
            cfg.agentGuidelines,
            canRunTerminalCommands,
            manifest.subAgentNames
        );
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, newContent, 'utf-8');
        addToGitignore(workspaceRoot, `.github/agents/${manifest.filename}`);
    }
}

function pruneStaleManagedAgentOutputs(outDir: string, manifests: AgentManifest[]): void {
    if (!fs.existsSync(outDir)) { return; }

    const expectedFilenames = new Set(
        manifests
            .filter(manifest => /^[\w.-]+\.agent\.md$/.test(manifest.filename))
            .map(manifest => manifest.filename)
    );

    for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[\w.-]+\.agent\.md$/.test(entry.name)) { continue; }
        if (expectedFilenames.has(entry.name)) { continue; }

        const candidate = path.join(outDir, entry.name);
        if (!isPathInside(outDir, candidate)) { continue; }

        const content = fs.readFileSync(candidate, 'utf-8');
        if (content.includes(MANAGED_TAG)) {
            fs.rmSync(candidate);
        }
    }
}

export function syncWorkspaceInstructionsFile(
    workspaceRoot: string,
    cfg: Pick<WorkspaceAgentSyncConfig, 'autoUpdate' | 'activeProfileId' | 'profileInstructions' | 'customInstructions' | 'agentGuidelines'>
): void {
    const outPath = path.join(workspaceRoot, INSTRUCTIONS_OUT);
    const content = buildWorkspaceInstructionsContent(cfg);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (!cfg.autoUpdate && fs.existsSync(outPath)) { return; }
    if (fs.existsSync(outPath)) {
        const existing = fs.readFileSync(outPath, 'utf-8');
        if (readTag(existing, HASH_TAG) === hash) { return; }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content.replace(/^---\n/, `---\n${MANAGED_TAG}\n${HASH_TAG} ${hash}\n`), 'utf-8');
    addToGitignore(workspaceRoot, INSTRUCTIONS_OUT.replace(/\\/g, '/'));
}

export function syncWorkspacePromptFiles(workspaceRoot: string, autoUpdate: boolean): void {
    const prompts = buildWorkspacePrompts();
    const outDir = path.join(workspaceRoot, PROMPTS_OUT);
    fs.mkdirSync(outDir, { recursive: true });
    for (const prompt of prompts) {
        const outPath = path.join(outDir, prompt.filename);
        const hash = crypto.createHash('sha256').update(prompt.content).digest('hex');
        if (!autoUpdate && fs.existsSync(outPath)) { continue; }
        if (fs.existsSync(outPath)) {
            const existing = fs.readFileSync(outPath, 'utf-8');
            if (readTag(existing, HASH_TAG) === hash) { continue; }
        }
        fs.writeFileSync(outPath, prompt.content.replace(/^---\n/, `---\n${MANAGED_TAG}\n${HASH_TAG} ${hash}\n`), 'utf-8');
        addToGitignore(workspaceRoot, `${PROMPTS_OUT.replace(/\\/g, '/')}/${prompt.filename}`);
    }
}

function isPathInside(root: string, candidate: string): boolean {
    const relative = path.relative(root, candidate);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildContent(
    bundled: string,
    effectiveTools: string[],
    disabledAgents: Set<string>,
    hash: string,
    model: string | string[] | undefined,
    allDocSources: AllDocSources,
    devopsConfig?: DevOpsConfig,
    profileInstructions?: string,
    customInstructions?: string,
    agentGuidelines?: string,
    canRunTerminalCommands = false,
    subAgentNames: string[] = []
): string {
    let content = setFrontmatterField(bundled, 'tools', formatInlineArray(effectiveTools));

    content = applyFrontmatterModel(content, model);

    // Filter disabled agent names from the agents: [...] list so the
    // orchestrator never tries to delegate to a non-existent file.
    if (disabledAgents.size > 0) {
        const names = subAgentNames.filter(name => !disabledAgents.has(name));
        content = setFrontmatterField(content, 'agents', formatInlineArray(names));
    }

    // Substitute the work-item integration mandate token ({{DEVOPS_PREAMBLE}}).
    content = applyDevOpsPreambleToken(content, devopsConfig);

    // Substitute always-present Fluent SDK explain instructions
    content = applyFluentSdkExplainToken(content);

    // Substitute all documentation source tokens
    content = applyAllDocSourceTokens(content, allDocSources);

    // Substitute profile instructions token
    content = applyProfileInstructionsToken(content, profileInstructions, customInstructions, agentGuidelines);

    // Remove content that belongs to disabled agents
    content = applyAgentConditionals(content, disabledAgents);

    // Append SDK query guidance only to agents that can actually run terminal commands.
    if (canRunTerminalCommands && !content.includes('now-sdk query')) {
        content = content.trimEnd() + '\n\n' + SDK_QUERY_BLOCK + '\n';
    }

    // Remove any stale stamp, then insert a fresh one after the opening ---
    content = content.replace(/\n# nowdev-managed: true\n# nowdev-hash: [^\n]+\n/g, '\n');
    content = content.replace(/^---\n/, `---\n${MANAGED_TAG}\n${HASH_TAG} ${hash}\n`);

    return content;
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
