import * as fs from 'fs';
import * as path from 'path';

export interface AgentManifest {
    filename: string;       // e.g. 'NowDev-AI.agent.md'
    name: string;           // from frontmatter name:
    shortName: string;      // display-friendly (strips 'NowDev-AI-' prefix)
    description: string;
    baseTools: string[];    // tools as listed in the bundled file
    userInvocable: boolean; // true = visible in the agent picker
    subAgentNames: string[];
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
            .filter(f => f.endsWith('.agent.md'))
            .sort();

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
                const manifest = parseFrontmatter(file, content);
                if (manifest) { manifests.push(manifest); }
            } catch { /* skip unreadable files */ }
        }
    } catch { /* agents dir not found */ }

    return manifests;
}

function parseFrontmatter(filename: string, content: string): AgentManifest | null {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) { return null; }
    const fm = fmMatch[1];

    const name = extractScalar(fm, 'name') ?? filename.replace('.agent.md', '');
    const description = extractScalar(fm, 'description') ?? '';
    const userInvocableStr = extractScalar(fm, 'user-invocable');
    const userInvocable = userInvocableStr !== 'false';
    const baseTools = extractArray(fm, 'tools');
    const subAgentNames = extractArray(fm, 'agents');
    const shortName = name.replace(/^NowDev-AI-?/, '') || name;

    return { filename, name, shortName, description, baseTools, userInvocable, subAgentNames };
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
