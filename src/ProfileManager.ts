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
     * When true, the DevOps agent is enabled for this profile as long as a
     * DevOps MCP server has been configured — regardless of the global
     * devopsConfig.enabled toggle. Useful for the PO profile where DevOps is
     * the primary integration and should not require a separate manual enable.
     */
    devopsEnabledWhenConfigured?: boolean;
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
            'NowDev-AI-AI-Studio-Developer',
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
            'NowDev-AI-AI-Studio-Developer',
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
        description: 'Work item management and requirement refinement only. No development agents. Plain-language communication.',
        suppressedAgents: [
            // Development bundles
            'NowDev-AI-Classic-Developer',
            'NowDev-AI-Script-Developer',
            'NowDev-AI-BusinessRule-Developer',
            'NowDev-AI-Client-Developer',
            'NowDev-AI-Classic-Reviewer',
            'NowDev-AI-Classic-Release',
            'NowDev-AI-Fluent-Developer',
            'NowDev-AI-Fluent-Schema-Developer',
            'NowDev-AI-Fluent-Logic-Developer',
            'NowDev-AI-Fluent-Automation-Developer',
            'NowDev-AI-Fluent-UI-Developer',
            'NowDev-AI-ATF-Developer',
            'NowDev-AI-Fluent-Reviewer',
            'NowDev-AI-Fluent-Release',
            'NowDev-AI-AI-Studio-Developer',
            'NowDev-AI-AI-Agent-Developer',
            'NowDev-AI-NowAssist-Developer',
            // Standalone agents not relevant for PO
            'NowDev-AI-Pipeline-Expert',
            'NowDev-AI-Reviewer',
            'NowDev-AI-Release-Expert',
            'NowDev-AI-Debugger',
            // NowDev-AI-DevOps is intentionally NOT suppressed — the PO uses it for work items
        ],
        devopsEnabledWhenConfigured: true,
        profileInstructions: `## Product Owner Communication Mode

You are assisting a **Product Owner** — a business professional who manages requirements and tracks work without writing code. Follow these rules in every response:

1. **Plain language only**: Never use technical jargon without an immediate plain-English explanation in parentheses (e.g. "a Business Rule — automation that runs automatically when a record is saved").
2. **No code**: Do not show or reference implementation code. Describe what will happen in business terms.
3. **Work item and requirement focus**: Your scope is limited to reviewing, creating, and tracking work items and requirements. For technical implementation questions, direct the PO to engage the development team.
4. **Confirm before acting**: Before taking any action (creating a work item, updating status, etc.), summarize the request back in plain language and ask for confirmation.
5. **Business-friendly status labels**: Use plain English ("In Progress", "Waiting for review", "Done") — never raw system values or technical state names.`,
    },
];

export function getProfileById(id: string): ProfileDefinition | undefined {
    return BUILT_IN_PROFILES.find(p => p.id === id);
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
