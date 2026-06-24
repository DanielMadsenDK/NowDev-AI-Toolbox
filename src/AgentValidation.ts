import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { AGENT_TREE, AgentNode } from './AgentTopology';

export type AgentValidationSeverity = 'error' | 'warning';

export interface AgentValidationIssue {
    severity: AgentValidationSeverity;
    file?: string;
    agent?: string;
    message: string;
}

export interface AgentValidationResult {
    issues: AgentValidationIssue[];
    agentCount: number;
}

const MAIN_AGENT_FILENAME = 'NowDev-AI.agent.md';
const MAIN_AGENT_NAME = 'NowDev AI Agent';
const MAX_SUBAGENT_DEPTH = 5;

const WRITE_TOOLS = new Set([
    'edit/createDirectory',
    'edit/createFile',
    'edit/editFiles',
]);

const NO_WRITE_AGENT_PATTERNS = [
    /Reviewer$/,
    /Debugger$/,
    /Release-Expert$/,
    /Refinement$/,
];

export function validateAgents(extensionPath: string): AgentValidationResult {
    const issues: AgentValidationIssue[] = [];
    const manifests = loadAgentRegistry(extensionPath);
    const manifestsByName = new Map(manifests.map(manifest => [manifest.name, manifest]));

    for (const manifest of manifests) {
        validateRequiredFrontmatter(manifest, issues);
        validateInvocationControls(manifest, issues);
        validateToolBoundaries(manifest, issues);
    }

    validateAgentReferences(manifests, manifestsByName, issues);
    validateSubagentDepth(manifests, manifestsByName, issues);
    validateTopology(manifests, issues);

    return { issues, agentCount: manifests.length };
}

function validateRequiredFrontmatter(manifest: AgentManifest, issues: AgentValidationIssue[]): void {
    for (const field of ['name', 'description', 'tools', 'user-invocable']) {
        if (!manifest.declaredFields.includes(field)) {
            issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `Missing required frontmatter field: ${field}.` });
        }
    }

    if (manifest.filename !== MAIN_AGENT_FILENAME && !manifest.declaredFields.includes('agents')) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Internal agents must declare an explicit agents array. Use agents: [] for leaf agents.' });
    }
}

function validateInvocationControls(manifest: AgentManifest, issues: AgentValidationIssue[]): void {
    if (manifest.name === MAIN_AGENT_NAME) {
        return;
    }

    if (manifest.userInvocable) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Only the main NowDev AI Agent should be user-invocable.' });
    }

    if (!manifest.disableModelInvocation) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Internal agents must set disable-model-invocation: true.' });
    }

    const hasAgentTool = manifest.baseTools.includes('agent');
    if (manifest.subAgentNames.length > 0 && !hasAgentTool) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Agents with subagents must include the agent tool.' });
    }

    if (manifest.subAgentNames.length === 0 && hasAgentTool) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Leaf agents must not include the agent tool.' });
    }
}

function validateToolBoundaries(manifest: AgentManifest, issues: AgentValidationIssue[]): void {
    if (!NO_WRITE_AGENT_PATTERNS.some(pattern => pattern.test(manifest.name))) {
        return;
    }

    const writeTools = manifest.baseTools.filter(tool => WRITE_TOOLS.has(tool));
    if (writeTools.length > 0) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `This agent should not have write tools: ${writeTools.join(', ')}.` });
    }
}

function validateAgentReferences(manifests: AgentManifest[], manifestsByName: Map<string, AgentManifest>, issues: AgentValidationIssue[]): void {
    for (const manifest of manifests) {
        for (const subAgentName of manifest.subAgentNames) {
            if (!manifestsByName.has(subAgentName)) {
                issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `Unknown subagent reference: ${subAgentName}.` });
            }
        }

        for (const handoffAgentName of manifest.handoffAgentNames) {
            if (!manifestsByName.has(handoffAgentName)) {
                issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `Unknown handoff agent reference: ${handoffAgentName}.` });
            }
        }
    }
}

function validateSubagentDepth(manifests: AgentManifest[], manifestsByName: Map<string, AgentManifest>, issues: AgentValidationIssue[]): void {
    for (const manifest of manifests) {
        walkSubagentGraph(manifest, manifestsByName, [], issues);
    }
}

function walkSubagentGraph(
    manifest: AgentManifest,
    manifestsByName: Map<string, AgentManifest>,
    pathSoFar: string[],
    issues: AgentValidationIssue[]
): void {
    const nextPath = [...pathSoFar, manifest.name];
    if (nextPath.length > MAX_SUBAGENT_DEPTH) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `Subagent nesting exceeds depth ${MAX_SUBAGENT_DEPTH}: ${nextPath.join(' -> ')}.` });
        return;
    }

    for (const subAgentName of manifest.subAgentNames) {
        if (nextPath.includes(subAgentName)) {
            issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `Circular subagent reference: ${[...nextPath, subAgentName].join(' -> ')}.` });
            continue;
        }

        const subAgent = manifestsByName.get(subAgentName);
        if (subAgent) {
            walkSubagentGraph(subAgent, manifestsByName, nextPath, issues);
        }
    }
}

function validateTopology(manifests: AgentManifest[], issues: AgentValidationIssue[]): void {
    const sourceIds = new Set<string>();
    for (const manifest of manifests) {
        sourceIds.add(manifest.name);
        sourceIds.add(manifest.filename.replace(/\.agent\.md$/, ''));
    }

    const topologyNodes = flattenAgentTree(AGENT_TREE);
    for (const node of topologyNodes) {
        if (!sourceIds.has(node.id)) {
            issues.push({ severity: 'error', agent: node.id, message: 'AgentTopology contains a node that does not match a bundled agent name or filename.' });
        }
    }

    const topologyIds = new Set(topologyNodes.map(node => node.id));
    const mainAgent = manifests.find(manifest => manifest.name === MAIN_AGENT_NAME);
    if (mainAgent) {
        for (const subAgentName of mainAgent.subAgentNames) {
            if (!topologyIds.has(subAgentName)) {
                issues.push({ severity: 'error', file: mainAgent.filename, agent: mainAgent.name, message: `Top-level subagent is missing from AgentTopology: ${subAgentName}.` });
            }
        }
    }
}

function flattenAgentTree(root: AgentNode): AgentNode[] {
    return [root, ...root.children.flatMap(child => flattenAgentTree(child))];
}

