import { McpIntegrationConfig } from './WorkspaceAgentManager';

export interface ProfileDefinition {
    /** Machine-stable identifier persisted to nowdev-ai-config.json */
    id: string;
    /** Label shown in the sidebar dropdown */
    label: string;
    /** Short description shown below the dropdown */
    description: string;
    /**
     * Agent names this profile suppresses — hidden from the Agents tab AND not
     * written to .github/agents/. Can include locked agents.
     * Values must match the `name:` field in agent frontmatter.
     */
    suppressedAgents?: string[];
    /**
     * Per-MCP-server method restrictions applied on top of the user's
     * mcpIntegrationConfigs. Key = MCP server name (same as in config).
     * Overrides the user's setting for that server when this profile is active.
     */
    mcpMethodOverrides?: Record<string, { mode: 'custom'; allowedMethods: string[] }>;
    /**
     * Text injected at {{PROFILE_INSTRUCTIONS}} in every agent file.
     * Empty string = token is removed (developer profile default).
     */
    profileInstructions: string;
}

export interface EffectiveAgentConfig {
    /** MCP integration configs after profile overrides are merged */
    mcpIntegrationConfigs: Record<string, McpIntegrationConfig>;
    /** Agent names the active profile suppresses (hidden + disabled) */
    suppressedAgents: ReadonlySet<string>;
    /** Resolved profile instructions (user override beats built-in default) */
    profileInstructions: string;
}

export const DEFAULT_PROFILE_ID = 'developer';

export const BUILT_IN_PROFILES: ProfileDefinition[] = [
    {
        id: 'developer',
        label: 'Developer',
        description: 'Core ServiceNow development with advanced AI Studio and CI/CD specialists hidden until needed.',
        suppressedAgents: [
            'NowDev-AI-AI-Agent-Developer',
            'NowDev-AI-NowAssist-Developer',
            'NowDev-AI-Pipeline-Expert',
        ],
        profileInstructions: '',
    },
    {
        id: 'advanced-developer',
        label: 'Advanced Developer',
        description: 'All specialist bundles enabled, including AI Studio and CI/CD pipeline generation.',
        suppressedAgents: [],
        profileInstructions: '',
    },
    {
        id: 'junior-developer',
        label: 'Junior Developer',
        description: 'Core development with step-by-step educational explanations. Advanced AI Studio and CI/CD specialists are hidden.',
        suppressedAgents: [
            'NowDev-AI-AI-Agent-Developer',
            'NowDev-AI-NowAssist-Developer',
            'NowDev-AI-Pipeline-Expert',
        ],
        profileInstructions: `## Junior Developer Mode

You are assisting a **junior developer** who is actively learning ServiceNow development. Every response must follow these additional requirements:

1. **Explain every decision**: Before implementing, explain *why* you chose this approach (e.g. why a Business Rule rather than a Flow Action).
2. **Step-by-step commentary**: Narrate each implementation step as you work. After writing each file or artifact, summarize what it does in plain language.
3. **Define terms in context**: When using ServiceNow-specific terms (GlideRecord, sys_id, scope prefix, Update Set, etc.), briefly define them the first time they appear.
4. **Call out common pitfalls**: Where a common beginner mistake exists (e.g. forgetting to call \`current.update()\` in a Business Rule, running GlideRecord queries in Client Scripts), explicitly flag it and explain why it matters.
5. **Suggest follow-up learning**: At the end of each major artifact, include one concrete thing the developer can read or explore next to deepen their understanding.

Produce full production-quality code — the explanations are additive, not a replacement for rigour.`,
    },
    {
        id: 'product-owner',
        label: 'Product Owner',
        description: 'Requirement refinement, feasibility discussion, and work-item management (when a work-item MCP server is configured). No development agents. Plain-language communication.',
        suppressedAgents: [
            // Development bundles
            'NowDev-AI-Fluent-Developer',
            'NowDev-AI-Fluent-Schema-Developer',
            'NowDev-AI-Fluent-Logic-Developer',
            'NowDev-AI-Fluent-Automation-Developer',
            'NowDev-AI-Fluent-UI-Developer',
            'NowDev-AI-ATF-Developer',
            'NowDev-AI-Fluent-Reviewer',
            'NowDev-AI-Fluent-Release',
            'NowDev-AI-AI-Agent-Developer',
            'NowDev-AI-NowAssist-Developer',
            // Standalone agents not relevant for PO
            'NowDev-AI-Pipeline-Expert',
            'NowDev-AI-Debugger',
        ],
        profileInstructions: `## Product Owner Communication Mode

You are assisting a **Product Owner** — a business professional who manages requirements and tracks work without writing code. Follow these rules in every response:

1. **Plain language only**: Never use technical jargon without an immediate plain-English explanation in parentheses (e.g. "a Business Rule — automation that runs automatically when a record is saved").
2. **No code**: Do not show or reference implementation code. Describe what will happen in business terms.
3. **Requirement & work-item focus**: Your scope is refining requirements, clarifying user stories, and — when a work-item integration is configured — reading and updating work items (task status, comments). For technical implementation questions, direct the PO to engage the development team.
4. **Confirm before acting**: Before taking any action (e.g. updating a work item's status), summarize the request back in plain language and ask for confirmation.
5. **Business-friendly status labels**: Use plain English ("In Progress", "Waiting for review", "Done") — never raw system values or technical state names.`,
    },
];

/**
 * Validates and normalizes company-provided custom profiles read from
 * `customProfiles` in nowdev-ai-config.json. Malformed entries (missing
 * id/label) are dropped rather than crashing the sidebar.
 */
export function normalizeCustomProfiles(raw: unknown): ProfileDefinition[] {
    if (!Array.isArray(raw)) { return []; }
    const result: ProfileDefinition[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') { continue; }
        const record = entry as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id.trim() : '';
        const label = typeof record.label === 'string' ? record.label.trim() : '';
        if (!id || !label) { continue; }
        result.push({
            id,
            label,
            description: typeof record.description === 'string' ? record.description : '',
            suppressedAgents: Array.isArray(record.suppressedAgents)
                ? record.suppressedAgents.filter((a): a is string => typeof a === 'string')
                : [],
            mcpMethodOverrides: (record.mcpMethodOverrides && typeof record.mcpMethodOverrides === 'object')
                ? record.mcpMethodOverrides as ProfileDefinition['mcpMethodOverrides']
                : undefined,
            profileInstructions: typeof record.profileInstructions === 'string' ? record.profileInstructions : '',
        });
    }
    return result;
}

/**
 * Merges the built-in profiles with company-provided custom profiles.
 * A custom profile whose id collides with a built-in id is dropped —
 * built-ins always win.
 */
export function getAllProfiles(customProfiles: ProfileDefinition[] = []): ProfileDefinition[] {
    const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
    const seen = new Set(builtInIds);
    const validCustom = customProfiles.filter(p => {
        if (seen.has(p.id)) { return false; }
        seen.add(p.id);
        return true;
    });
    return [...BUILT_IN_PROFILES, ...validCustom];
}

export function getProfileById(id: string, customProfiles: ProfileDefinition[] = []): ProfileDefinition | undefined {
    return getAllProfiles(customProfiles).find(p => p.id === id);
}

/**
 * Resolves the effective profile instructions, preferring the user's local
 * override when one exists. Built-in defaults are never written to config —
 * only user overrides live there — so user customizations survive upgrades.
 */
export function resolveProfileInstructions(
    profile: ProfileDefinition,
    overrides: Record<string, string>
): string {
    return Object.prototype.hasOwnProperty.call(overrides, profile.id)
        ? overrides[profile.id]
        : profile.profileInstructions;
}

/**
 * Merges the active profile's MCP method overrides on top of the user's
 * mcpIntegrationConfigs and returns the full effective config.
 */
export function getEffectiveAgentConfig(
    profile: ProfileDefinition,
    userMcpIntegrationConfigs: Record<string, McpIntegrationConfig>,
    profileInstructionsOverrides: Record<string, string>
): EffectiveAgentConfig {
    const mcpIntegrationConfigs: Record<string, McpIntegrationConfig> = {
        ...userMcpIntegrationConfigs,
        ...(profile.mcpMethodOverrides ?? {}),
    };

    return {
        mcpIntegrationConfigs,
        suppressedAgents: new Set(profile.suppressedAgents ?? []),
        profileInstructions: resolveProfileInstructions(profile, profileInstructionsOverrides),
    };
}
