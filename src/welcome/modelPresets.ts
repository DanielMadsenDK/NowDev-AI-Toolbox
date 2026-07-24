import { AgentManifest } from '../AgentRegistry';
import { AgentOverride } from '../agentSync/types';
import { AvailableAgentModel } from './welcomeTypes';
import { withDefaultOverride } from './welcomeUtils';

const STRONG_MODEL_PATTERNS = [/gpt-5/i, /claude.*(opus|sonnet)/i, /gemini.*2\.5.*pro/i, /o[34]/i];
const FAST_MODEL_PATTERNS = [/mini/i, /flash/i, /haiku/i, /nano/i];

const PLANNER_REVIEWER_AGENTS = new Set([
    'NowDev AI Agent',
    'NowDev-AI-Refinement',
    'NowDev-AI-Fluent-Reviewer',
]);
const ROUTER_AGENTS = new Set([
    'NowDev-AI-Fluent-Developer',
]);

function selectPreferredModels(modelOptions: AvailableAgentModel[], patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
        for (const option of modelOptions) {
            if (pattern.test(option.value) && !matches.includes(option.value)) {
                matches.push(option.value);
            }
        }
    }
    return matches;
}

function uniqueModels(models: string[]): string[] {
    return [...new Set(models.map(model => model.trim()).filter(Boolean))];
}

/**
 * Assigns a strong model to planner/reviewer agents and a fast model to
 * router agents, mutating `agentOverrides` in place. Returns the number of
 * agents updated, or null if VS Code reported no selectable chat models.
 */
export function applyModelPresets(
    manifests: AgentManifest[],
    agentOverrides: Record<string, AgentOverride>,
    modelOptions: AvailableAgentModel[]
): number | null {
    const strongModels = selectPreferredModels(modelOptions, STRONG_MODEL_PATTERNS);
    const fastModels = selectPreferredModels(modelOptions, FAST_MODEL_PATTERNS);

    if (strongModels.length === 0 && fastModels.length === 0) {
        return null;
    }

    const plannerReviewerModels = uniqueModels([...strongModels, ...fastModels]).slice(0, 1);
    const routerModels = uniqueModels([...fastModels, ...strongModels]).slice(0, 1);

    let updated = 0;
    for (const manifest of manifests) {
        const models = PLANNER_REVIEWER_AGENTS.has(manifest.name) ? plannerReviewerModels : ROUTER_AGENTS.has(manifest.name) ? routerModels : [];
        if (models.length === 0) { continue; }
        agentOverrides[manifest.name] = { ...withDefaultOverride(agentOverrides, manifest.name), model: models[0] };
        updated++;
    }

    return updated;
}
