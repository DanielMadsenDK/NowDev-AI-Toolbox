import * as fs from 'fs';
import * as path from 'path';

export interface AgentManifest {
    filename: string;       // e.g. 'NowDev-AI.agent.md'
    name: string;           // from frontmatter name:
    shortName: string;      // display-friendly (strips 'NowDev-AI-' prefix)
    description: string;
    baseTools: string[];    // tools as listed in the bundled file
    userInvocable: boolean; // true = visible in the agent picker
    disableModelInvocation: boolean;
    argumentHint: string;
    model: string;
    target: string;
    subAgentNames: string[];
    handoffAgentNames: string[];
    mcpServers: string[];
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

    const name = extractScalar(fm, 'name') ?? filename.replace('.agent.md', '');
    const description = extractScalar(fm, 'description') ?? '';
    const userInvocableStr = extractScalar(fm, 'user-invocable');
    const userInvocable = userInvocableStr !== 'false';
    const disableModelInvocation = extractScalar(fm, 'disable-model-invocation') === 'true';
    const argumentHint = extractScalar(fm, 'argument-hint') ?? '';
    const model = extractScalar(fm, 'model') ?? '';
    const target = extractScalar(fm, 'target') ?? '';
    const baseTools = extractArray(fm, 'tools');
    const subAgentNames = extractArray(fm, 'agents');
    const handoffAgentNames = extractNestedScalars(fm, 'handoffs', 'agent');
    const mcpServers = extractArray(fm, 'mcp-servers');
    const shortName = name.replace(/^NowDev-AI-?/, '') || name;
    const declaredFields = extractDeclaredFields(fm);

    return { filename, name, shortName, description, baseTools, userInvocable, disableModelInvocation, argumentHint, model, target, subAgentNames, handoffAgentNames, mcpServers, declaredFields };
}

function extractDeclaredFields(fm: string): string[] {
    return fm.split(/\r?\n/)
        .map(line => line.match(/^([A-Za-z0-9_-]+):/)?.[1])
        .filter((field): field is string => Boolean(field));
}

function extractScalar(fm: string, key: string): string | undefined {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!m) { return undefined; }
    return m[1].trim().replace(/^['"](.*)['"]$/, '$1');
}

function extractArray(fm: string, key: string): string[] {
    // Tools lists are always on a single line in these files
    const m = fm.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, 'm'));
    if (!m) { return []; }
    return m[1]
        .split(',')
        .map(s => s.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);
}

function extractNestedScalars(fm: string, blockKey: string, nestedKey: string): string[] {
    const lines = fm.split(/\r?\n/);
    const start = lines.findIndex(line => line.trim() === `${blockKey}:`);
    if (start < 0) { return []; }
    const values: string[] = [];
    for (let index = start + 1; index < lines.length; index++) {
        const line = lines[index];
        if (/^\S/.test(line)) { break; }
        const match = line.match(new RegExp(`^\\s+${nestedKey}:\\s*(.+)$`));
        if (match) {
            values.push(match[1].trim().replace(/^['"](.*)['"]$/, '$1'));
        }
    }
    return values;
}
