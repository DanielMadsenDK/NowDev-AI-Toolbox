import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const OVERRIDE_REL = path.join('.github', 'agents', 'NowDev-AI.agent.md');
const BUNDLED_REL = path.join('agents', 'github-copilot', 'NowDev-AI.agent.md');
const GITIGNORE_ENTRY = '.github/agents/NowDev-AI.agent.md';

const HASH_TAG  = '# nowdev-source-hash:';
const MCP_TAG   = '# nowdev-mcp:';
const MANAGED_TAG = '# nowdev-managed: true';

/**
 * Keeps the workspace agent override file in sync with the bundled template
 * and the user's MCP server selection.
 *
 * The override is a copy of the bundled NowDev-AI.agent.md with the selected
 * MCP server wildcards prepended to the tools: list. Three metadata comments
 * are stamped into the YAML frontmatter so the manager can detect staleness:
 *
 *   # nowdev-managed: true
 *   # nowdev-source-hash: <sha256 of bundled template>
 *   # nowdev-mcp: <JSON array of sorted server names>
 *
 * On the next activation after an extension update the hash changes, causing
 * silent regeneration so the user always runs the latest agent logic while
 * keeping their MCP selection intact.
 *
 * @param extensionPath  Filesystem path to the installed extension root
 * @param workspaceRoot  Filesystem path to the open workspace root folder
 * @param selectedMcp    MCP server names the user wants agents to access
 * @param autoUpdate     When false an existing override file is never overwritten
 */
export function syncAgentOverride(
    extensionPath: string,
    workspaceRoot: string,
    selectedMcp: string[],
    autoUpdate: boolean
): void {
    const overridePath = path.join(workspaceRoot, OVERRIDE_REL);
    const bundledPath  = path.join(extensionPath,  BUNDLED_REL);

    if (!fs.existsSync(bundledPath)) { return; }

    // No servers selected → remove override so the bundled agent is used directly
    if (selectedMcp.length === 0) {
        if (fs.existsSync(overridePath)) {
            try { fs.unlinkSync(overridePath); } catch { /* ignore */ }
        }
        return;
    }

    const bundledContent = fs.readFileSync(bundledPath, 'utf-8');
    const currentHash    = crypto.createHash('sha256').update(bundledContent).digest('hex');
    const currentMcpStr  = JSON.stringify([...selectedMcp].sort());

    // Respect the opt-out setting: never touch an existing file when disabled
    if (!autoUpdate && fs.existsSync(overridePath)) { return; }

    // Skip generation when the file is already up to date
    if (fs.existsSync(overridePath)) {
        const existing = fs.readFileSync(overridePath, 'utf-8');
        if (
            extractTag(existing, HASH_TAG) === currentHash &&
            extractTag(existing, MCP_TAG)  === currentMcpStr
        ) {
            return;
        }
    }

    const content = buildOverrideContent(bundledContent, currentHash, currentMcpStr, selectedMcp);
    fs.mkdirSync(path.dirname(overridePath), { recursive: true });
    fs.writeFileSync(overridePath, content, 'utf-8');

    // The generated file is per-developer (not team config) — ensure it is gitignored
    ensureGitignoreEntry(workspaceRoot, GITIGNORE_ENTRY);
}

function buildOverrideContent(
    bundled: string,
    hash: string,
    mcpStr: string,
    selectedMcp: string[]
): string {
    // Prepend wildcard tool entries for each selected MCP server
    const mcpTools = selectedMcp.map(s => `'${s}/*'`).join(', ');

    // Inject tools at the start of the tools: array in YAML frontmatter
    let content = bundled.replace(/^(tools:\s*\[)/m, `$1${mcpTools}, `);

    // Stamp management metadata right after the opening ---
    const stamp = `${MANAGED_TAG}\n${HASH_TAG} ${hash}\n${MCP_TAG} ${mcpStr}`;
    content = content.replace(/^---\n/, `---\n${stamp}\n`);

    return content;
}

function extractTag(content: string, tag: string): string {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = content.match(new RegExp(`^${escaped}\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
}

function ensureGitignoreEntry(workspaceRoot: string, entry: string): void {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    try {
        let content = '';
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, 'utf-8');
            if (content.split(/\r?\n/).map(l => l.trim()).includes(entry)) { return; }
        }
        const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
        fs.appendFileSync(gitignorePath, `${separator}${entry}\n`, 'utf-8');
    } catch { /* ignore */ }
}
