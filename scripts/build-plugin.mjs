#!/usr/bin/env node
// Generates the GitHub Copilot plugin distribution of the NowDev AI Toolbox.
//
// The VS Code extension is the primary product and is NOT modified by this
// script. The plugin is a derivative artifact: it reuses the extension's own
// agent renderer (WorkspaceAgentManager.syncAllAgents) to produce the agent
// files, then applies the small set of transforms required for the files to
// work in the GitHub Copilot CLI and desktop app instead of VS Code.
//
// Transforms applied to the rendered agents:
//   1. Flag fix    — specialists keep `user-invocable: false` but get
//                    `disable-model-invocation: false` so the orchestrator can
//                    delegate to them (VS Code re-enables them via its
//                    `agents:` allow-list, which CLI/cloud ignore).
//   2. Tool mapping — VS Code tool IDs are mapped to the CLI tool aliases
//                    (read, edit, execute, search, web, todo, agent). Tools
//                    with no CLI equivalent (browser/*, vscode/*, MCP
//                    wildcards) are dropped. `agent` is always preserved for
//                    delegating agents.

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PLUGIN_DIR = path.join(repoRoot, 'plugins', 'nowdev-ai-toolbox');
const PLUGIN_AGENTS_DIR = path.join(PLUGIN_DIR, 'agents');
const PLUGIN_SKILLS_DIR = path.join(PLUGIN_DIR, 'skills');
const SKILLS_SRC_DIR = path.join(repoRoot, 'agents', 'skills');

// ── Tool mapping ────────────────────────────────────────────────────────────
// VS Code tool IDs are namespaced as `<group>/<member>`; the CLI exposes a
// single tool per group. Map by prefix and drop anything without a CLI peer.
const TOOL_GROUP_TO_CLI = {
    read: 'read',
    edit: 'edit',
    execute: 'execute',
    search: 'search',
    web: 'web',
    todo: 'todo',
    agent: 'agent',
};
// Preferred, stable ordering for the mapped tool list.
const CLI_TOOL_ORDER = ['read', 'search', 'edit', 'execute', 'web', 'todo', 'agent'];

function mapToolsToCli(tools) {
    const mapped = new Set();
    for (const tool of tools) {
        const group = tool.includes('/') ? tool.split('/')[0] : tool;
        const cli = TOOL_GROUP_TO_CLI[group];
        if (cli) { mapped.add(cli); }
    }
    return CLI_TOOL_ORDER.filter(t => mapped.has(t));
}

function formatInlineArray(items) {
    return `[${items.map(i => `'${i}'`).join(', ')}]`;
}

// ── Frontmatter transforms ─────────────────────────────────────────────────
function splitFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) { return null; }
    return { frontmatter: match[1], body: match[2] };
}

function transformAgentFile(content) {
    const parts = splitFrontmatter(content);
    if (!parts) { return content; }
    let { frontmatter } = parts;
    const { body } = parts;

    // 1. Flag fix: allow model/delegated invocation of hidden specialists.
    frontmatter = frontmatter.replace(
        /^disable-model-invocation:\s*true\s*$/m,
        'disable-model-invocation: false'
    );

    // 2. Tool mapping: rewrite the inline `tools: [...]` array to CLI aliases.
    frontmatter = frontmatter.replace(/^tools:\s*\[([^\]]*)\]\s*$/m, (full, inner) => {
        const tools = inner
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);
        const cliTools = mapToolsToCli(tools);
        // A delegating agent must keep `agent` even if it was only implied.
        if (/^agents:\s*\[[^\]]*\S[^\]]*\]/m.test(frontmatter) && !cliTools.includes('agent')) {
            cliTools.push('agent');
        }
        return `tools: ${formatInlineArray(cliTools)}`;
    });

    return `---\n${frontmatter}\n---\n${body}`;
}

// ── Filesystem helpers ──────────────────────────────────────────────────────
function rmrf(dir) {
    if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); }
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) { copyDir(s, d); }
        else if (entry.isFile()) { fs.copyFileSync(s, d); }
    }
}

// ── Build ───────────────────────────────────────────────────────────────────
function main() {
    console.log('[build-plugin] Compiling extension sources (tsc)…');
    execSync('npm run compile', { cwd: repoRoot, stdio: 'inherit' });

    const { loadAgentRegistry } = require(path.join(repoRoot, 'out', 'AgentRegistry.js'));
    const {
        syncAllAgents,
        DEFAULT_ALL_DOC_SOURCES,
        DEFAULT_DEVOPS_CONFIG,
    } = require(path.join(repoRoot, 'out', 'WorkspaceAgentManager.js'));

    console.log('[build-plugin] Loading agent registry…');
    const manifests = loadAgentRegistry(repoRoot);
    if (!manifests.length) {
        throw new Error('No agent manifests found under agents/github-copilot');
    }

    // Render every agent in a neutral configuration (Developer defaults, all
    // agents enabled, no MCP integrations, default doc sources) into a throwaway
    // staging workspace, then post-process the output.
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nowdev-plugin-'));
    try {
        const cfg = {
            mcpIntegrations: [],
            mcpIntegrationConfigs: {},
            agentOverrides: {},
            allDocSources: DEFAULT_ALL_DOC_SOURCES,
            autoUpdate: true,
            devopsConfig: DEFAULT_DEVOPS_CONFIG,
            profileSuppressedAgents: new Set(),
            profileInstructions: '',
            customInstructions: '',
            agentGuidelines: '',
            activeProfileId: 'developer',
        };

        console.log('[build-plugin] Rendering agents to staging workspace…');
        syncAllAgents(repoRoot, stagingRoot, manifests, cfg);

        const stagedAgentsDir = path.join(stagingRoot, '.github', 'agents');
        const stagedFiles = fs.existsSync(stagedAgentsDir)
            ? fs.readdirSync(stagedAgentsDir).filter(f => f.endsWith('.agent.md'))
            : [];
        if (!stagedFiles.length) {
            throw new Error('Renderer produced no agent files');
        }

        console.log('[build-plugin] Transforming agents for the Copilot CLI / app…');
        rmrf(PLUGIN_AGENTS_DIR);
        fs.mkdirSync(PLUGIN_AGENTS_DIR, { recursive: true });
        for (const file of stagedFiles) {
            const raw = fs.readFileSync(path.join(stagedAgentsDir, file), 'utf-8');
            const transformed = transformAgentFile(raw);
            // NowDev template tokens are uppercase identifiers or {{#agent:…}}
            // conditionals. Guard against `$` so legitimate GitHub Actions
            // `${{ secrets.* }}` expressions in agent bodies are not flagged.
            if (/(?<!\$)\{\{\s*(?:[A-Z_]+\s*\}\}|[#/]agent:)/.test(transformed)) {
                throw new Error(`Unresolved template token left in ${file}`);
            }
            fs.writeFileSync(path.join(PLUGIN_AGENTS_DIR, file), transformed, 'utf-8');
        }
        console.log(`[build-plugin]   wrote ${stagedFiles.length} agent file(s).`);
    } finally {
        rmrf(stagingRoot);
    }

    // Skills are already in the open Agent Skills format — copy verbatim.
    console.log('[build-plugin] Copying skills…');
    rmrf(PLUGIN_SKILLS_DIR);
    copyDir(SKILLS_SRC_DIR, PLUGIN_SKILLS_DIR);
    const skillCount = fs.readdirSync(PLUGIN_SKILLS_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory()).length;
    console.log(`[build-plugin]   copied ${skillCount} skill(s).`);

    console.log('[build-plugin] Done. Plugin built at plugins/nowdev-ai-toolbox');
}

main();
