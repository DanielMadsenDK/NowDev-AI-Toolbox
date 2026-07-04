import { loadAgentRegistry, AgentManifest } from './AgentRegistry';
import { AGENT_TREE, AgentNode } from './AgentTopology';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

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
const TOOL_COUNT_WARNING_THRESHOLD = 120;

const WRITE_TOOLS = new Set([
    'edit/createDirectory',
    'edit/createFile',
    'edit/editFiles',
]);

const NO_WRITE_AGENT_PATTERNS = [
    /Reviewer$/,
    /Debugger$/,
    /Refinement$/,
];

interface ChatSkillContribution {
    path?: unknown;
    when?: unknown;
}

export function validateAgents(extensionPath: string): AgentValidationResult {
    const issues: AgentValidationIssue[] = [];
    const manifests = loadAgentRegistry(extensionPath);
    const manifestsByName = new Map(manifests.map(manifest => [manifest.name, manifest]));

    for (const manifest of manifests) {
        validateRequiredFrontmatter(manifest, issues);
        validateInvocationControls(manifest, issues);
        validateToolBoundaries(manifest, issues);
        validateModernAgentMetadata(manifest, issues);
    }

    validateAgentReferences(manifests, manifestsByName, issues);
    validateSubagentDepth(manifests, manifestsByName, issues);
    validateTopology(manifests, issues);
    validateBundledSkills(extensionPath, issues);
    validateContentReferences(extensionPath, manifests, issues);

    return { issues, agentCount: manifests.length };
}

// Directories whose markdown/TS content ships to users (directly or via the
// sync/plugin renderers) and must therefore only reference things that exist.
const CONTENT_SCAN_DIRS = [
    'agents',
    path.join('src', 'agentSync'),
];
const CONTENT_SCAN_EXTENSIONS = new Set(['.md', '.ts']);
const SKILL_PATH_PATTERN = /agents\/skills\/[A-Za-z0-9._-]+\/[A-Za-z0-9._\/-]*\.md/g;
const AGENT_NAME_PATTERN = /NowDev-AI(?:-[A-Za-z]+)+/g;
const AGENT_NAME_ALLOWLIST = new Set(['NowDev-AI-Toolbox']);

/**
 * Guards shipped content against reference rot: every `agents/skills/...` path
 * cited in bundled markdown or the token blocks must resolve to a real file,
 * and every `NowDev-AI-*` agent name must match a bundled agent.
 */
function validateContentReferences(extensionPath: string, manifests: AgentManifest[], issues: AgentValidationIssue[]): void {
    const knownAgentIds = new Set<string>();
    for (const manifest of manifests) {
        knownAgentIds.add(manifest.name);
        knownAgentIds.add(manifest.filename.replace(/\.agent\.md$/, ''));
    }

    for (const dir of CONTENT_SCAN_DIRS) {
        const absoluteDir = path.join(extensionPath, dir);
        if (!fs.existsSync(absoluteDir)) { continue; }
        for (const file of listContentFiles(absoluteDir)) {
            const relativeFile = toPackagePath(path.relative(extensionPath, file));
            const content = fs.readFileSync(file, 'utf-8');

            for (const match of content.matchAll(SKILL_PATH_PATTERN)) {
                if (!fs.existsSync(path.join(extensionPath, match[0]))) {
                    issues.push({ severity: 'error', file: relativeFile, message: `Reference to missing skill file: ${match[0]}.` });
                }
            }

            for (const match of content.matchAll(AGENT_NAME_PATTERN)) {
                const name = match[0];
                if (!AGENT_NAME_ALLOWLIST.has(name) && !knownAgentIds.has(name)) {
                    issues.push({ severity: 'error', file: relativeFile, message: `Reference to unknown agent: ${name}.` });
                }
            }
        }
    }
}

function listContentFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'workspace') { continue; }
            files.push(...listContentFiles(fullPath));
        } else if (CONTENT_SCAN_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

function validateModernAgentMetadata(manifest: AgentManifest, issues: AgentValidationIssue[]): void {
    if (manifest.baseTools.length > TOOL_COUNT_WARNING_THRESHOLD) {
        issues.push({ severity: 'warning', file: manifest.filename, agent: manifest.name, message: `Tool list has ${manifest.baseTools.length} entries and may approach VS Code's agent tool limit.` });
    }

    const modelValues = Array.isArray(manifest.model) ? manifest.model : manifest.model ? [manifest.model] : [];
    for (const model of modelValues) {
        if (typeof model !== 'string' || model.trim().length === 0) {
            issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'Model entries must be non-empty strings.' });
        }
    }

    if (manifest.rawFrontmatter.handoffs !== undefined) {
        if (!Array.isArray(manifest.rawFrontmatter.handoffs)) {
            issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'handoffs must be an array.' });
        } else {
            for (const [index, handoff] of manifest.rawFrontmatter.handoffs.entries()) {
                if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
                    issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `handoffs[${index}] must be an object.` });
                    continue;
                }
                const entry = handoff as Record<string, unknown>;
                for (const field of ['label', 'agent', 'prompt']) {
                    if (typeof entry[field] !== 'string' || !entry[field]) {
                        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `handoffs[${index}].${field} must be a non-empty string.` });
                    }
                }
                if (entry.send !== undefined && typeof entry.send !== 'boolean') {
                    issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: `handoffs[${index}].send must be a boolean when declared.` });
                }
            }
        }
    }

    if (manifest.hooks !== undefined && (!manifest.hooks || typeof manifest.hooks !== 'object')) {
        issues.push({ severity: 'error', file: manifest.filename, agent: manifest.name, message: 'hooks must be an object or array when declared.' });
    }
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

function validateBundledSkills(extensionPath: string, issues: AgentValidationIssue[]): void {
    const skillsDir = path.join(extensionPath, 'agents', 'skills');
    if (!fs.existsSync(skillsDir)) { return; }

    const contributedSkillPaths = readContributedSkillPaths(extensionPath, issues);
    const discoveredSkillPaths = new Set<string>();

    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) { continue; }
        const skillDir = path.join(skillsDir, entry.name);
        const skillPath = path.join(skillDir, 'SKILL.md');
        const relativeFile = toPackagePath(path.join('agents', 'skills', entry.name, 'SKILL.md'));
        discoveredSkillPaths.add(relativeFile);
        if (!fs.existsSync(skillPath)) {
            issues.push({ severity: 'error', file: path.join('agents', 'skills', entry.name), message: 'Skill directory is missing SKILL.md.' });
            continue;
        }

        const content = fs.readFileSync(skillPath, 'utf-8').replace(/\r\n/g, '\n');
        const frontmatter = readSkillFrontmatter(content);
        if (!frontmatter) {
            issues.push({ severity: 'error', file: relativeFile, message: 'Skill is missing YAML frontmatter.' });
            continue;
        }

        const name = asString(frontmatter.name);
        if (!name) {
            issues.push({ severity: 'error', file: relativeFile, message: 'Skill is missing required frontmatter field: name.' });
        } else {
            if (name !== entry.name) {
                issues.push({ severity: 'error', file: relativeFile, message: `Skill name must match directory name (${entry.name}).` });
            }
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
                issues.push({ severity: 'error', file: relativeFile, message: 'Skill name must be kebab-case.' });
            }
        }

        const description = asString(frontmatter.description);
        if (!description) {
            issues.push({ severity: 'error', file: relativeFile, message: 'Skill is missing required frontmatter field: description.' });
        }

        validateOptionalBoolean(frontmatter, 'user-invocable', relativeFile, issues);
        validateOptionalBoolean(frontmatter, 'disable-model-invocation', relativeFile, issues);

        if (frontmatter['argument-hint'] !== undefined && !asString(frontmatter['argument-hint'])) {
            issues.push({ severity: 'error', file: relativeFile, message: 'argument-hint must be a non-empty string when declared.' });
        }

        if (frontmatter.context !== undefined && frontmatter.context !== 'fork') {
            issues.push({ severity: 'error', file: relativeFile, message: 'context must be "fork" when declared.' });
        }

        if (frontmatter.last_verified !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asString(frontmatter.last_verified))) {
            issues.push({ severity: 'error', file: relativeFile, message: 'last_verified must use YYYY-MM-DD format when declared.' });
        }
    }

    for (const contributedPath of contributedSkillPaths) {
        if (!discoveredSkillPaths.has(contributedPath)) {
            issues.push({ severity: 'error', file: contributedPath, message: 'package.json contributes.chatSkills references a missing bundled skill.' });
        }
    }

    for (const discoveredPath of discoveredSkillPaths) {
        if (!contributedSkillPaths.has(discoveredPath)) {
            issues.push({ severity: 'error', file: discoveredPath, message: 'Bundled skill is not listed in package.json contributes.chatSkills.' });
        }
    }
}

function readContributedSkillPaths(extensionPath: string, issues: AgentValidationIssue[]): Set<string> {
    const packagePath = path.join(extensionPath, 'package.json');
    const contributed = new Set<string>();
    try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as { contributes?: { chatSkills?: unknown } };
        const chatSkills = packageJson.contributes?.chatSkills;
        if (!Array.isArray(chatSkills)) {
            issues.push({ severity: 'error', file: 'package.json', message: 'contributes.chatSkills must be an array.' });
            return contributed;
        }

        for (const [index, entry] of chatSkills.entries()) {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                issues.push({ severity: 'error', file: 'package.json', message: `contributes.chatSkills[${index}] must be an object with a path field.` });
                continue;
            }
            const contribution = entry as ChatSkillContribution;
            for (const key of Object.keys(contribution)) {
                if (key !== 'path' && key !== 'when') {
                    issues.push({ severity: 'error', file: 'package.json', message: `contributes.chatSkills[${index}].${key} is not supported by VS Code. Use only path and optional when.` });
                }
            }
            const skillPath = asString(contribution.path);
            if (!skillPath) {
                issues.push({ severity: 'error', file: 'package.json', message: `contributes.chatSkills[${index}].path is required.` });
                continue;
            }
            if (contribution.when !== undefined && !asString(contribution.when)) {
                issues.push({ severity: 'error', file: 'package.json', message: `contributes.chatSkills[${index}].when must be a non-empty string when declared.` });
            }
            contributed.add(toPackagePath(skillPath));
        }
    } catch (error) {
        issues.push({ severity: 'error', file: 'package.json', message: `Unable to read package.json chatSkills: ${error instanceof Error ? error.message : String(error)}.` });
    }
    return contributed;
}

function toPackagePath(value: string): string {
    return value.replace(/^[.][\\/]/, '').replace(/\\/g, '/');
}

function readSkillFrontmatter(content: string): Record<string, unknown> | null {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) { return null; }
    try {
        const parsed = parseYaml(match[1]);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return null;
    }
}

function validateOptionalBoolean(frontmatter: Record<string, unknown>, key: string, file: string, issues: AgentValidationIssue[]): void {
    if (frontmatter[key] !== undefined && typeof frontmatter[key] !== 'boolean') {
        issues.push({ severity: 'error', file, message: `${key} must be a boolean when declared.` });
    }
}

function asString(value: unknown): string {
    if (typeof value === 'string') { return value.trim(); }
    if (typeof value === 'number' || typeof value === 'boolean') { return String(value); }
    return '';
}

function flattenAgentTree(root: AgentNode): AgentNode[] {
    return [root, ...root.children.flatMap(child => flattenAgentTree(child))];
}

