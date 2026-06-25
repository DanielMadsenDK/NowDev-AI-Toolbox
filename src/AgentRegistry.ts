import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';

export interface AgentManifest {
    filename: string;       // e.g. 'NowDev-AI.agent.md'
    name: string;           // from frontmatter name:
    shortName: string;      // display-friendly (strips 'NowDev-AI-' prefix)
    description: string;
    baseTools: string[];    // tools as listed in the bundled file
    userInvocable: boolean; // true = visible in the agent picker
    disableModelInvocation: boolean;
    argumentHint: string;
    model: string | string[];
    target: string;
    subAgentNames: string[];
    handoffAgentNames: string[];
    mcpServers: string[];
    hooks: unknown;
    rawFrontmatter: Record<string, unknown>;
    declaredFields: string[];
}

const AGENTS_REL = path.join('agents', 'github-copilot');

/**
 * Scans the extension's bundled agent files and returns a parsed manifest for
 * each one. The manifest reflects the baseline state of the file — the
 * WorkspaceAgentManager applies per-user overrides on top when writing to the
 * workspace.
 */
export function loadAgentRegistry(extensionPath: string): AgentManifest[] {
    const agentsDir = path.join(extensionPath, AGENTS_REL);
    const manifests: AgentManifest[] = [];

    try {
        const files = fs.readdirSync(agentsDir)
            .filter(f => /^[\w.-]+\.agent\.md$/.test(f))
            .sort();

        for (const file of files) {
            try {
                const agentPath = resolveInside(agentsDir, file);
                if (!agentPath) { continue; }
                const content = fs.readFileSync(agentPath, 'utf-8');
                const manifest = parseFrontmatter(file, content);
                if (manifest) { manifests.push(manifest); }
            } catch { /* skip unreadable files */ }
        }
    } catch { /* agents dir not found */ }

    return manifests;
}

function resolveInside(root: string, child: string): string | undefined {
    const resolved = path.resolve(root, child);
    const relative = path.relative(root, resolved);
    return relative.startsWith('..') || path.isAbsolute(relative) ? undefined : resolved;
}

function parseFrontmatter(filename: string, content: string): AgentManifest | null {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) { return null; }
    const fm = fmMatch[1];
    const parsed = parseYamlFrontmatter(fm);

    const name = asString(parsed.name) || filename.replace('.agent.md', '');
    const description = asString(parsed.description);
    const userInvocable = asBoolean(parsed['user-invocable'], true);
    const disableModelInvocation = asBoolean(parsed['disable-model-invocation'], false);
    const argumentHint = asString(parsed['argument-hint']);
    const model = asStringArrayOrScalar(parsed.model);
    const target = asString(parsed.target);
    const baseTools = asStringArray(parsed.tools);
    const subAgentNames = asStringArray(parsed.agents);
    const handoffAgentNames = extractHandoffAgentNames(parsed.handoffs);
    const mcpServers = asStringArray(parsed['mcp-servers']);
    const hooks = parsed.hooks;
    const shortName = name.replace(/^NowDev-AI-?/, '') || name;
    const declaredFields = Object.keys(parsed);

    return { filename, name, shortName, description, baseTools, userInvocable, disableModelInvocation, argumentHint, model, target, subAgentNames, handoffAgentNames, mcpServers, hooks, rawFrontmatter: parsed, declaredFields };
}

function parseYamlFrontmatter(fm: string): Record<string, unknown> {
    try {
        const parsed = parseYaml(stripTemplateControlLines(fm));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function stripTemplateControlLines(fm: string): string {
    return fm
        .split(/\r?\n/)
        .filter(line => !/^\s*\{\{[#/]agent:[^}]+\}\}\s*$/.test(line))
        .join('\n');
}

function asString(value: unknown): string {
    if (typeof value === 'string') { return value; }
    if (typeof value === 'number' || typeof value === 'boolean') { return String(value); }
    return '';
}

function asBoolean(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') { return value; }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') { return true; }
        if (value.toLowerCase() === 'false') { return false; }
    }
    return defaultValue;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) { return []; }
    return value.map(asString).map(item => item.trim()).filter(Boolean);
}

function asStringArrayOrScalar(value: unknown): string | string[] {
    if (Array.isArray(value)) { return asStringArray(value); }
    return asString(value);
}

function extractHandoffAgentNames(value: unknown): string[] {
    if (!Array.isArray(value)) { return []; }
    const names: string[] = [];
    for (const handoff of value) {
        if (handoff && typeof handoff === 'object' && !Array.isArray(handoff)) {
            const agent = asString((handoff as Record<string, unknown>).agent).trim();
            if (agent) { names.push(agent); }
        }
    }
    return names;
}
