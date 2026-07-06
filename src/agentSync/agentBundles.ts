import * as path from 'path';

export const AGENTS_SRC       = path.join('agents', 'github-copilot');
export const AGENTS_OUT       = path.join('.github', 'agents');
export const INSTRUCTIONS_OUT = path.join('.github', 'instructions', 'nowdev-ai.instructions.md');
export const PROMPTS_OUT      = path.join('.github', 'prompts');
export const HASH_TAG         = '# nowdev-hash:';
export const MANAGED_TAG      = '# nowdev-managed: true';

/** The orchestrator agent that carries the work-item integration workflow. */
export const ORCHESTRATOR_AGENT_NAME = 'NowDev AI Agent';

/**
 * Agents that receive direct access to the configured Work Item Integration
 * MCP server (tool wildcard + Work Item Integration Mandate preamble) when
 * that integration is enabled. Every other agent relies on context relayed
 * by the orchestrator instead of calling the MCP server directly.
 */
export const WORK_ITEM_MCP_AGENT_NAMES: ReadonlySet<string> = new Set([
    ORCHESTRATOR_AGENT_NAME,
    'NowDev-AI-Refinement',
    'NowDev-AI-Assistant',
]);

/** Agents that are always written and cannot be disabled by the user. */
export const LOCKED_AGENT_NAMES: ReadonlySet<string> = new Set([
    'NowDev AI Agent',
    'NowDev-AI-Refinement',
    'NowDev-AI-Fluent-Reviewer',
    'NowDev-AI-Fluent-Release',
    'NowDev-AI-Assistant',
]);

/**
 * Groups of agents that must be enabled/disabled as a unit because they have
 * hard handoff dependencies on each other.  Disabling one member of a bundle
 * without disabling the others would silently break coordinator delegation.
 */
export const AGENT_BUNDLES: Readonly<Record<string, readonly string[]>> = {
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
