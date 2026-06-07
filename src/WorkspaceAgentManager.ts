import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AgentManifest } from './AgentRegistry';

export interface AgentOverride {
    enabled: boolean;        // false → file not written to workspace
    disabledTools: string[]; // tools to strip from the base list
}

export interface McpIntegrationConfig {
    /** 'all' injects servername/*, 'custom' injects only the listed methods */
    mode: 'all' | 'custom';
    allowedMethods?: string[];
}

/** Unified documentation source configuration for a single documentation category. */
export interface DocSource {
    /** How this category's docs are accessed. */
    sourceType: 'llms-txt' | 'mcp' | 'none';
    // llms-txt fields
    llmsUrl?: string;
    llmsMode?: 'remote' | 'local'; // meaningful only for productDocs
    localPath?: string;            // resolved at runtime from global VS Code setting + release
    lastSynced?: string;           // ISO timestamp
    // mcp fields
    mcpServer?: string;
    mcpLibraryHint?: string;
}

export interface AllDocSources {
    /** ServiceNow platform docs (release-specific). Also used for general reference by orchestration agents. */
    productDocs: DocSource & { release?: string };
    /** ServiceNow SDK / Fluent SDK docs. */
    sdkDocs: DocSource;
    /** Classic scripting API docs (GlideRecord, Business Rules, Client Scripts, …). */
    classicScripting: DocSource;
}

export const DEFAULT_ALL_DOC_SOURCES: AllDocSources = {
    productDocs:      { sourceType: 'llms-txt', llmsMode: 'remote', llmsUrl: 'https://www.servicenow.com/llms.txt', release: '', mcpLibraryHint: '' },
    sdkDocs:          { sourceType: 'none',     llmsUrl: 'https://servicenow.github.io/sdk/llms.txt',              mcpLibraryHint: '' },
    classicScripting: { sourceType: 'none',     llmsUrl: 'https://www.servicenow.com/llms.txt',                    mcpLibraryHint: '' },
};

export interface DevOpsConfig {
    /** Whether the DevOps integration agent is enabled */
    enabled: boolean;
    /** MCP server name to inject into the DevOps agent's tools list */
    mcpServer: string;
    /** Resolved custom instructions text to inject into the agent body */
    customInstructions: string;
}

export const DEFAULT_DEVOPS_CONFIG: DevOpsConfig = {
    enabled: false,
    mcpServer: '',
    customInstructions: '',
};

// Newest first; supplemented at runtime by GitHub API fetch
export const SERVICENOW_RELEASES: string[] = [
    'Yokohama', 'Xanadu', 'Washington DC', 'Vancouver', 'Utah',
    'Tokyo', 'San Diego', 'Rome', 'Quebec', 'Paris',
];

export interface WorkspaceAgentSyncConfig {
    mcpIntegrations: string[];
    mcpIntegrationConfigs?: Record<string, McpIntegrationConfig>;
    agentOverrides: Record<string, AgentOverride>;
    allDocSources: AllDocSources;
    autoUpdate: boolean;
    devopsConfig?: DevOpsConfig;
    /** Agent names suppressed by the active profile — not written and hidden from the Agents tab. */
    profileSuppressedAgents?: ReadonlySet<string>;
    /** Text injected at {{PROFILE_INSTRUCTIONS}} in agent bodies. Empty string removes the token. */
    profileInstructions?: string;
    /** Stored in the state hash so profile switches trigger file regeneration. */
    activeProfileId?: string;
}

const AGENTS_SRC       = path.join('agents', 'github-copilot');
const AGENTS_OUT       = path.join('.github', 'agents');
const HASH_TAG         = '# nowdev-hash:';
const MANAGED_TAG      = '# nowdev-managed: true';

const DEVOPS_AGENT_NAME = 'NowDev-AI-DevOps';

/** Agents that are always written and cannot be disabled by the user. */
export const LOCKED_AGENT_NAMES: ReadonlySet<string> = new Set([
    'NowDev AI Agent',
    'NowDev-AI-Refinement',
    'NowDev-AI-Reviewer',
    'NowDev-AI-Release-Expert',
    'NowDev-AI-Assistant',
]);

/**
 * Groups of agents that must be enabled/disabled as a unit because they have
 * hard handoff dependencies on each other.  Disabling one member of a bundle
 * without disabling the others would silently break coordinator delegation.
 */
export const AGENT_BUNDLES: Readonly<Record<string, readonly string[]>> = {
    'Classic Development': [
        'NowDev-AI-Classic-Developer',
        'NowDev-AI-Script-Developer',
        'NowDev-AI-BusinessRule-Developer',
        'NowDev-AI-Client-Developer',
        'NowDev-AI-Classic-Reviewer',
        'NowDev-AI-Classic-Release',
    ],
    'Fluent Development': [
        'NowDev-AI-Fluent-Developer',
        'NowDev-AI-Fluent-Schema-Developer',
        'NowDev-AI-Fluent-Logic-Developer',
        'NowDev-AI-Fluent-Automation-Developer',
        'NowDev-AI-Fluent-UI-Developer',
        'NowDev-AI-ATF-Developer',
        'NowDev-AI-Fluent-Reviewer',
        'NowDev-AI-Fluent-Release',
    ],
    'AI Studio': [
        'NowDev-AI-AI-Studio-Developer',
        'NowDev-AI-AI-Agent-Developer',
        'NowDev-AI-NowAssist-Developer',
    ],
};

/** Returns the bundle name for a given agent, or undefined if it is not in any bundle. */
export function getAgentBundleName(agentName: string): string | undefined {
    for (const [bundleName, members] of Object.entries(AGENT_BUNDLES)) {
        if ((members as readonly string[]).includes(agentName)) {
            return bundleName;
        }
    }
    return undefined;
}

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

function getMcpToolEntries(serverName: string, config?: McpIntegrationConfig): string[] {
    const lower = serverName.toLowerCase();
    if (!config || config.mode === 'all' || !config.allowedMethods?.length) {
        return [`${lower}/*`];
    }
    return config.allowedMethods.map(m => `${lower}/${m.trim()}`).filter(Boolean);
}

export function syncAllAgents(
    extensionPath: string,
    workspaceRoot: string,
    manifests: AgentManifest[],
    cfg: WorkspaceAgentSyncConfig
): void {
    const outDir = path.join(workspaceRoot, AGENTS_OUT);
    const devops = cfg.devopsConfig ?? DEFAULT_DEVOPS_CONFIG;

    const profileSuppressed = cfg.profileSuppressedAgents ?? new Set<string>();

    // Build the set of disabled agent names up-front so every written file
    // can have them removed from its own agents: list.
    // Profile suppression takes absolute priority; locked agents can be suppressed by a profile.
    // The DevOps agent is treated as disabled unless devopsConfig.enabled === true.
    const disabledAgentNames = new Set<string>(
        manifests
            .filter(m => {
                if (profileSuppressed.has(m.name)) { return true; }
                if (LOCKED_AGENT_NAMES.has(m.name)) { return false; }
                if (m.name === DEVOPS_AGENT_NAME) { return !devops.enabled; }
                return cfg.agentOverrides[m.name]?.enabled === false;
            })
            .map(m => m.name)
    );

    for (const manifest of manifests) {
        const srcPath = path.join(extensionPath, AGENTS_SRC, manifest.filename);
        const outPath = path.join(outDir, manifest.filename);

        if (!fs.existsSync(srcPath)) { continue; }

        const isDevOpsAgent = manifest.name === DEVOPS_AGENT_NAME;
        const override      = cfg.agentOverrides[manifest.name];
        // Profile suppression overrides the locked-agent guarantee.
        const enabled       = !profileSuppressed.has(manifest.name) && (
                              LOCKED_AGENT_NAMES.has(manifest.name) ||
                              (isDevOpsAgent ? devops.enabled : (override?.enabled ?? true)));
        const disabledTools = new Set(override?.disabledTools ?? []);

        // Disabled agents: remove any existing file, do not write a new one
        if (!enabled) {
            if (fs.existsSync(outPath)) { fs.rmSync(outPath); }
            continue;
        }

        // MCP tool entries only for top-level (user-invocable) agents — sub-agents
        // receive context from the orchestrator, they don't need direct MCP access.
        // Exception: DevOps agent gets its own dedicated MCP server entry.
        let mcpTools: string[] = manifest.userInvocable
            ? cfg.mcpIntegrations.flatMap(s => getMcpToolEntries(s, cfg.mcpIntegrationConfigs?.[s]))
            : [];

        if (isDevOpsAgent && devops.mcpServer) {
            for (const entry of getMcpToolEntries(devops.mcpServer, cfg.mcpIntegrationConfigs?.[devops.mcpServer])) {
                if (!mcpTools.includes(entry)) { mcpTools = [...mcpTools, entry]; }
            }
        }

        // Effective tools: MCP first, then base minus disabled.
        // Replace any hardcoded 'io.github.upstash/context7/*' in the base tools
        // with the user-configured doc-source server wildcards (or keep as-is if none set).
        const docServerWildcards = buildDocServerWildcards(cfg.allDocSources);
        const baseToolsReplaced = manifest.baseTools.map(t => {
            if (t === 'io.github.upstash/context7/*') {
                return docServerWildcards.length > 0 ? null : t; // null = expand below
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
            allDocSources: cfg.allDocSources,
            mcpIntegrationConfigs: cfg.mcpIntegrationConfigs,
            devopsConfig:  isDevOpsAgent ? devops : undefined,
            activeProfileId: cfg.activeProfileId ?? '',
            profileInstructions: cfg.profileInstructions ?? '',
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
            cfg.allDocSources,
            isDevOpsAgent ? devops : undefined,
            devops,
            cfg.profileInstructions
        );
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
    hash: string,
    allDocSources: AllDocSources,
    devopsAgentConfig?: DevOpsConfig,
    orchestratorDevopsConfig?: DevOpsConfig,
    profileInstructions?: string
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

    // Substitute DevOps agent body tokens ({{DEVOPS_CUSTOM_INSTRUCTIONS}})
    if (devopsAgentConfig) {
        const instructions = devopsAgentConfig.customInstructions.trim()
            ? devopsAgentConfig.customInstructions.trim()
            : '_No custom workflow instructions configured. Use your best judgement based on the available MCP tools._';
        content = content.replace(/\{\{DEVOPS_CUSTOM_INSTRUCTIONS\}\}/g, instructions);
    }

    // Substitute orchestrator preamble token ({{DEVOPS_PREAMBLE}})
    if (orchestratorDevopsConfig?.enabled) {
        const preamble = `## DevOps Integration Mandate

**This workspace has a DevOps/project management integration configured.** Follow these rules for every full-project request:

1. **Before starting any full-project request** — delegate to \`NowDev-AI-DevOps\` first. Pass the task ID, work item reference, or description the user provided. The DevOps agent will return structured task details (title, description, acceptance criteria, current status). Treat these details as the authoritative source of truth for what needs to be built.
2. **After each major sub-agent completes its artifact** — delegate to \`NowDev-AI-DevOps\` to post a progress comment on the task in the project management system.
3. **After all development is complete** — delegate to \`NowDev-AI-DevOps\` to update the task status to done and add a completion comment summarizing what was built.

If the user does not provide a task reference, ask them for one before proceeding. If they confirm there is no task to link, proceed with normal orchestration and skip DevOps delegation.

`;
        content = content.replace(/\{\{DEVOPS_PREAMBLE\}\}\n/g, preamble);
    } else {
        // DevOps not configured — remove the token entirely
        content = content.replace(/\{\{DEVOPS_PREAMBLE\}\}\n/g, '');
    }

    // Substitute all documentation source tokens
    content = applyAllDocSourceTokens(content, allDocSources);

    // Substitute profile instructions token
    content = applyProfileInstructionsToken(content, profileInstructions);

    // Remove content that belongs to disabled agents
    content = applyAgentConditionals(content, disabledAgents);

    // Remove any stale stamp, then insert a fresh one after the opening ---
    content = content.replace(/\n# nowdev-managed: true\n# nowdev-hash: [^\n]+\n/g, '\n');
    content = content.replace(/^---\n/, `---\n${MANAGED_TAG}\n${HASH_TAG} ${hash}\n`);

    return content;
}

/**
 * Collects the unique MCP server wildcards from all doc source categories.
 * Returns an empty array when no MCP servers are configured (caller keeps
 * the original Context7 tool entry in that case).
 */
function buildDocServerWildcards(sources: AllDocSources): string[] {
    const wildcards: string[] = [];
    for (const src of [sources.productDocs, sources.sdkDocs, sources.classicScripting]) {
        if (src.sourceType === 'mcp' && src.mcpServer) {
            const w = `${src.mcpServer.toLowerCase()}/*`;
            if (!wildcards.includes(w)) { wildcards.push(w); }
        }
    }
    return wildcards;
}

/**
 * Replaces a single inline doc-source token with the appropriate reference text.
 * - mcp + hint:    "<hint> (fall back to <skill> if unavailable)"
 * - mcp only:      "the <server> MCP server (fall back to <skill> if unavailable)"
 * - llms-txt:      "<url> (fall back to <skill> if unavailable)"
 * - none / unset:  "<skill>" — agents rely entirely on built-in knowledge
 */
function applyInlineDocToken(content: string, token: string, src: DocSource, fallback: string): string {
    if (!content.includes(token)) { return content; }
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'g');
    let value: string;
    if (src.sourceType === 'mcp' && src.mcpServer) {
        const ref = src.mcpLibraryHint ? src.mcpLibraryHint : `the ${src.mcpServer} MCP server`;
        value = `${ref} (fall back to ${fallback} if unavailable)`;
    } else if (src.sourceType === 'llms-txt' && src.llmsUrl) {
        value = `${src.llmsUrl} (fall back to ${fallback} if unavailable)`;
    } else {
        value = fallback;
    }
    return content.replace(pattern, value);
}

/**
 * Replaces all documentation source tokens in agent body text.
 *
 * Inline tokens (replaced with a short reference phrase):
 *   {{SDK_DOCS_CONTEXT}}         — Fluent SDK / now-sdk docs
 *   {{CLASSIC_SCRIPTING_DOCS}}   — Classic scripting API docs
 *   {{GENERAL_DOCS}}             — Delegates to productDocs (same source, used by orchestration agents)
 *
 * Block token (replaced with a multi-line instructions block or empty string):
 *   {{PRODUCT_DOCS_CONTEXT}}     — ServiceNow platform / release docs
 */
function applyAllDocSourceTokens(content: string, sources: AllDocSources): string {
    // Inline tokens
    content = applyInlineDocToken(content, '{{SDK_DOCS_CONTEXT}}',       sources.sdkDocs,          'the servicenow-fluent-development skill');
    content = applyInlineDocToken(content, '{{CLASSIC_SCRIPTING_DOCS}}', sources.classicScripting,  'the servicenow-* skill');
    content = applyInlineDocToken(content, '{{GENERAL_DOCS}}',           sources.productDocs,       'built-in skills');

    // Block token — product docs context
    if (!content.includes('{{PRODUCT_DOCS_CONTEXT}}')) { return content; }

    const pd = sources.productDocs;
    let value = '';
    if (pd.release) {
        if (pd.sourceType === 'mcp' && pd.mcpServer) {
            const ref = pd.mcpLibraryHint || `the ${pd.mcpServer} MCP server`;
            value =
                `## Product Documentation Context\n\n` +
                `**ServiceNow Release:** ${pd.release}\n\n` +
                `Product documentation is available via the ${pd.mcpServer} MCP server.\n\n` +
                `When verifying platform behavior or release-specific APIs for **${pd.release}**:\n` +
                `Use ${ref} to look up documentation. Prefer this over generic web search for ServiceNow platform questions.`;
        } else if (pd.sourceType === 'llms-txt') {
            if (pd.llmsMode === 'local' && pd.localPath) {
                value =
                    `## Product Documentation Context\n\n` +
                    `**ServiceNow Release:** ${pd.release}\n` +
                    `**Local docs path:** ${pd.localPath}\n\n` +
                    `When verifying platform behavior or release-specific APIs for **${pd.release}**:\n` +
                    `1. Use \`read/readFile\` on \`${pd.localPath}/llms.txt\` to discover available files.\n` +
                    `2. Read individual .md files from \`${pd.localPath}/\` for specific questions.\n` +
                    `3. These docs are authoritative for the ${pd.release} release.`;
            } else if (pd.llmsUrl) {
                value =
                    `## Product Documentation Context\n\n` +
                    `**ServiceNow Release:** ${pd.release}\n\n` +
                    `Product documentation is indexed at: ${pd.llmsUrl}\n\n` +
                    `When verifying platform behavior or release-specific APIs for **${pd.release}**:\n` +
                    `1. Use the \`web\` tool to fetch \`${pd.llmsUrl}\` to get the doc index.\n` +
                    `2. Follow individual links from that index as needed.\n` +
                    `3. Prefer this index over generic web search for ServiceNow platform questions.`;
            }
        }
    }

    return content.replace(/\{\{PRODUCT_DOCS_CONTEXT\}\}\n/g, value ? value + '\n\n' : '');
}

/**
 * Replaces the {{PROFILE_INSTRUCTIONS}} token with the active profile's
 * instructions text. Empty/absent instructions remove the token silently,
 * making this a no-op for the default developer profile.
 */
function applyProfileInstructionsToken(content: string, instructions: string | undefined): string {
    if (!content.includes('{{PROFILE_INSTRUCTIONS}}')) { return content; }
    const value = instructions?.trim() ? instructions.trim() + '\n\n' : '';
    return content.replace(/\{\{PROFILE_INSTRUCTIONS\}\}\n?/g, value);
}

/**
 * Processes {{#agent:NAME}}...{{/agent:NAME}} conditional blocks.
 * Blocks whose NAME matches a disabled agent are removed (markers + content).
 * Blocks whose NAME is enabled: content is kept, markers are stripped.
 */
function applyAgentConditionals(content: string, disabledAgents: Set<string>): string {
    return content.replace(
        /\{\{#agent:([^\}]+)\}\}\n?([\s\S]*?)\{\{\/agent:[^\}]+\}\}\n?/g,
        (_, name, inner) => disabledAgents.has(name.trim()) ? '' : inner
    );
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
