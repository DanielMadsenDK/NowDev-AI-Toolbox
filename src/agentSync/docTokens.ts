import { McpIntegrationConfig, DocSource, AllDocSources, DevOpsConfig } from './types';

export function getMcpToolEntries(serverName: string, config?: McpIntegrationConfig): string[] {
    const lower = serverName.toLowerCase();
    if (!config || config.mode === 'all' || !config.allowedMethods?.length) {
        return [`${lower}/*`];
    }
    return config.allowedMethods.map(m => `${lower}/${m.trim()}`).filter(Boolean);
}

/**
 * Collects the unique MCP server wildcards from all doc source categories.
 * Returns an empty array when no MCP servers are configured.
 */
export function buildDocServerWildcards(sources: AllDocSources): string[] {
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
 * Always-present block appended to every agent file that can run terminal commands.
 * Points at the now-sdk skill instead of restating its contents, so the CLI
 * mechanics (flags, safety notes, full command surface) can't drift out of sync
 * with agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md.
 */
export const SDK_QUERY_BLOCK =
`## now-sdk CLI Reference

Before running any \`now-sdk\` command, load the \`nowdev-ai-toolbox-servicenow-sdk\` skill (\`agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md\`, via \`read/skill\` or \`read/readFile\`) for current CLI mechanics — flags, the \`--peek\`/\`--format raw\` discipline, and safety notes. It covers every subcommand: \`explain\` (SDK/API docs), \`query\` (live instance data — sys_ids, schema, property values, existing records, without asking the user), \`auth\`, \`init\`, \`download\`, \`build\`, \`install\`, \`dependencies\`, \`transform\`, \`clean\`, and \`pack\`. Never guess a flag or restate CLI syntax from memory — the skill reflects the installed SDK version.`;

/**
 * Always-present block injected into Fluent SDK agent files via {{FLUENT_SDK_EXPLAIN}}.
 * Points at the now-sdk skill instead of restating its contents — see SDK_QUERY_BLOCK.
 */
export const FLUENT_SDK_EXPLAIN_BLOCK =
`## Fluent SDK Documentation

Before writing or reviewing Fluent SDK code, load the \`nowdev-ai-toolbox-servicenow-sdk\` skill (\`agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md\`, via \`read/skill\` or \`read/readFile\`) and use \`now-sdk explain\` as the first source for API signatures, constructor properties, examples, guides, and architecture notes — it is local, works offline, and is tied to the installed SDK version. The skill also covers \`query\` and every other subcommand (\`auth\`, \`init\`, \`download\`, \`build\`, \`install\`, \`dependencies\`, \`transform\`, \`clean\`, \`pack\`) in case the task needs them.

Do not treat local NowDev skills as Fluent SDK API reference. Use them only for NowDev workflow conventions, project-specific guardrails, and opinionated patterns that the installed SDK documentation does not cover.

For general ServiceNow platform knowledge that is not Fluent-specific (admin/config, best practices across the platform), use the configured product docs source.`;

export function applyFluentSdkExplainToken(content: string): string {
    if (!content.includes('{{FLUENT_SDK_EXPLAIN}}')) { return content; }
    return content.replace(/\{\{FLUENT_SDK_EXPLAIN\}\}\n?/g, FLUENT_SDK_EXPLAIN_BLOCK + '\n\n');
}

/**
 * Substitutes the {{DEVOPS_PREAMBLE}} orchestrator token with a work-item
 * integration mandate when a work-item MCP server is configured and enabled.
 * When disabled (or for any agent that does not carry the token) the token is
 * simply removed. The workflow is driven entirely through the configured MCP
 * server — no dedicated agent is involved.
 */
export function applyDevOpsPreambleToken(content: string, devops?: DevOpsConfig): string {
    if (!content.includes('{{DEVOPS_PREAMBLE}}')) { return content; }

    if (!devops?.enabled || !devops.mcpServer) {
        return content.replace(/\{\{DEVOPS_PREAMBLE\}\}\n?/g, '');
    }

    const customInstructions = devops.customInstructions.trim()
        ? `\n**Team work-item conventions:**\n\n${devops.customInstructions.trim()}\n`
        : '';

    const preamble = `## Work Item Integration Mandate

**This workspace has a work-item / project-management integration configured via the \`${devops.mcpServer}\` MCP server.** Use its tools directly (you have them in your tool list). Follow these rules for every full-project request:

1. **Before starting any full-project request** — call the \`${devops.mcpServer}\` tools to read the referenced task, work item, or user story. Pass the task ID or reference the user provided. Treat the returned details (title, description, acceptance criteria, current status) as the authoritative source of truth for what needs to be built.
2. **After each major sub-agent completes its artifact** — use the \`${devops.mcpServer}\` tools to post a progress comment on the work item.
3. **After all development is complete** — use the \`${devops.mcpServer}\` tools to update the work item status to done and add a completion comment summarizing what was built.

If the user does not provide a task reference, ask them for one before proceeding. If they confirm there is no work item to link, proceed with normal orchestration and skip the work-item updates.
${customInstructions}
`;

    return content.replace(/\{\{DEVOPS_PREAMBLE\}\}\n?/g, preamble + '\n');
}

/**
 * Replaces a single inline doc-source token with the appropriate reference text.
 * - mcp + hint:    "<hint> (fall back to <skill> if unavailable)"
 * - mcp only:      "the <server> MCP server (fall back to <skill> if unavailable)"
 * - llms-txt:      "<url> (fall back to <skill> if unavailable)"
 * - none / unset:  "<skill>" — agents rely entirely on built-in knowledge
 */
export function applyInlineDocToken(content: string, token: string, src: DocSource, fallback: string): string {
    if (!content.includes(token)) { return content; }
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'g');
    let value: string;
    if (src.sourceType === 'mcp' && src.mcpServer) {
        const ref = src.mcpLibraryHint ? src.mcpLibraryHint : `the ${src.mcpServer} MCP server`;
        value = `${ref} — prefer this for current, authoritative content; fall back to ${fallback} only if unavailable (bundled docs may not reflect the latest SDK or platform changes)`;
    } else if (src.sourceType === 'llms-txt' && src.llmsUrl) {
        value = `${src.llmsUrl} — prefer this for current, authoritative content; fall back to ${fallback} only if unavailable (bundled docs may not reflect the latest SDK or platform changes)`;
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
export function applyAllDocSourceTokens(content: string, sources: AllDocSources): string {
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
export function applyProfileInstructionsToken(content: string, instructions: string | undefined, customInstructions: string | undefined, agentGuidelines: string | undefined): string {
    if (!content.includes('{{PROFILE_INSTRUCTIONS}}')) { return content; }
    const blocks: string[] = [];
    if (customInstructions?.trim()) {
        blocks.push(`## Workspace Guidelines\n\n${customInstructions.trim()}`);
    }
    if (agentGuidelines?.trim()) {
        blocks.push(`## Instance-Backed Guidelines\n\n${agentGuidelines.trim()}`);
    }
    if (instructions?.trim()) {
        blocks.push(instructions.trim());
    }
    const value = blocks.length > 0 ? blocks.join('\n\n') + '\n\n' : '';
    return content.replace(/\{\{PROFILE_INSTRUCTIONS\}\}\n?/g, value);
}

/**
 * Processes {{#agent:NAME}}...{{/agent:NAME}} conditional blocks.
 * Blocks whose NAME matches a disabled agent are removed (markers + content).
 * Blocks whose NAME is enabled: content is kept, markers are stripped.
 */
export function applyAgentConditionals(content: string, disabledAgents: Set<string>): string {
    return content.replace(
        /\{\{#agent:([^\}]+)\}\}\n?([\s\S]*?)\{\{\/agent:[^\}]+\}\}\n?/g,
        (_, name, inner) => disabledAgents.has(name.trim()) ? '' : inner
    );
}
