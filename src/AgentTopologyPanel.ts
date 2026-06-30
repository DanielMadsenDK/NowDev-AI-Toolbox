import * as vscode from 'vscode';
import { AgentManifest } from './AgentRegistry';
import { AgentOverride } from './WorkspaceAgentManager';
import { getSharedPanelStyles } from './SharedPanelStyles';

let _panel: vscode.WebviewPanel | undefined;

interface TreeNode {
    manifest: AgentManifest;
    children: TreeNode[];
    depth: number;
}

export function showAgentTopologyPanel(
    manifests: AgentManifest[],
    overrides: Record<string, AgentOverride>
): void {
    if (_panel) {
        _panel.reveal(vscode.ViewColumn.One);
        _panel.webview.html = buildHtml(manifests, overrides);
        return;
    }

    _panel = vscode.window.createWebviewPanel(
        'nowdev.agentTopology',
        'Agent Topology',
        { viewColumn: vscode.ViewColumn.One, preserveFocus: false },
        { enableScripts: false, localResourceRoots: [], retainContextWhenHidden: true }
    );

    _panel.onDidDispose(() => { _panel = undefined; });
    _panel.webview.html = buildHtml(manifests, overrides);
}

// ── Tree building ──────────────────────────────────────────────────────────────

function isAgentEnabled(name: string, overrides: Record<string, AgentOverride>): boolean {
    const override = overrides[name];
    return override === undefined || override.enabled !== false;
}

function buildTree(
    name: string,
    manifestMap: Map<string, AgentManifest>,
    overrides: Record<string, AgentOverride>,
    depth: number,
    visited: Set<string>
): TreeNode | null {
    if (visited.has(name)) { return null; }
    const manifest = manifestMap.get(name);
    if (!manifest) { return null; }

    visited.add(name);
    const children: TreeNode[] = [];

    for (const childName of manifest.subAgentNames) {
        if (!isAgentEnabled(childName, overrides)) { continue; }
        const child = buildTree(childName, manifestMap, overrides, depth + 1, visited);
        if (child) { children.push(child); }
    }

    return { manifest, children, depth };
}

// ── HTML generation ────────────────────────────────────────────────────────────

function esc(s: string): string {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

type Role = 'orchestrator' | 'coordinator' | 'developer' | 'reviewer' | 'release' | 'support' | 'unknown';

function inferRole(manifest: AgentManifest): Role {
    const name = manifest.name.toLowerCase();
    const desc = manifest.description.toLowerCase();
    if (name.includes('nowdev ai agent') || desc.includes('orchestrat')) { return 'orchestrator'; }
    if (desc.includes('coordinator') || desc.includes('coordinates') || desc.includes('router') || desc.includes('routes')) { return 'coordinator'; }
    if (desc.includes('review')) { return 'reviewer'; }
    if (desc.includes('release') || desc.includes('deploy') || desc.includes('pipeline')) { return 'release'; }
    if (desc.includes('assistant') || desc.includes('refinement') || desc.includes('debug') || desc.includes('q&a') || desc.includes('lightweight')) { return 'support'; }
    return 'developer';
}

function roleLabel(role: Role): string {
    const labels: Record<Role, string> = {
        orchestrator: 'Orchestrator',
        coordinator: 'Coordinator',
        developer: 'Specialist',
        reviewer: 'Reviewer',
        release: 'Release',
        support: 'Support',
        unknown: 'Agent',
    };
    return labels[role];
}

function renderTier1Card(node: TreeNode): string {
    const role = inferRole(node.manifest);
    return `
<div class="card card-orchestrator" title="${esc(node.manifest.description)}">
    <div class="card-icon">&#xe9b0;</div>
    <div class="card-name">${esc(node.manifest.shortName || node.manifest.name)}</div>
    <div class="card-desc">${esc(node.manifest.description)}</div>
    <div class="card-tags">
        <span class="tag tag-${role}">${roleLabel(role)}</span>
        <span class="tag tag-planning">Planning</span>
        <span class="tag tag-delegation">Delegation</span>
    </div>
</div>`;
}

function renderTier2Card(node: TreeNode): string {
    const role = inferRole(node.manifest);
    const childCount = node.children.length;
    const childHint = childCount > 0 ? ` · ${childCount} sub-agent${childCount === 1 ? '' : 's'}` : '';
    return `
<div class="card card-tier2 card-role-${role}" title="${esc(node.manifest.description)}">
    <div class="card-icon-sm">${roleIcon(role)}</div>
    <div class="card-name-sm">${esc(node.manifest.shortName || node.manifest.name)}</div>
    <div class="card-sub">${esc(truncate(node.manifest.description, 60))}${esc(childHint)}</div>
</div>`;
}

function renderTier3Card(node: TreeNode): string {
    const role = inferRole(node.manifest);
    const childCount = node.children.length;
    const childHint = childCount > 0 ? ` · ${childCount} sub-agent${childCount === 1 ? '' : 's'}` : '';
    // Render any nested children (depth 4+) as smaller inline cards
    const nested = node.children.length > 0
        ? `<div class="t3-nested">${node.children.map(c => renderTier3Card(c)).join('')}</div>`
        : '';
    return `
<div class="card card-tier3 card-role-${role}" title="${esc(node.manifest.description)}">
    <div class="card-icon-sm">${roleIcon(role)}</div>
    <div class="card-name-sm">${esc(node.manifest.shortName || node.manifest.name)}</div>
    <div class="card-sub">${esc(truncate(node.manifest.description, 55))}${esc(childHint)}</div>
</div>
${nested}`;
}

function roleIcon(role: Role): string {
    const icons: Record<Role, string> = {
        orchestrator: '⚙',
        coordinator: '⬡',
        developer: '⟨/⟩',
        reviewer: '✔',
        release: '⬢',
        support: '◯',
        unknown: '·',
    };
    return icons[role];
}

function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildHtml(manifests: AgentManifest[], overrides: Record<string, AgentOverride>): string {
    const manifestMap = new Map<string, AgentManifest>();
    for (const m of manifests) {
        manifestMap.set(m.name, m);
    }

    // Find root (always the orchestrator that isn't disabled)
    const rootManifest = manifests.find(m =>
        m.name === 'NowDev AI Agent' || m.shortName === 'NowDev AI'
    );

    if (!rootManifest) {
        return noAgentsHtml();
    }

    const tree = buildTree(rootManifest.name, manifestMap, overrides, 0, new Set());
    if (!tree) { return noAgentsHtml(); }

    const tier2Nodes = tree.children;
    // Collect all depth-2+ nodes, grouped under their tier-2 parent
    const tier3Groups: Array<{ parent: TreeNode; nodes: TreeNode[] }> = [];
    for (const t2 of tier2Nodes) {
        if (t2.children.length > 0) {
            tier3Groups.push({ parent: t2, nodes: t2.children });
        }
    }

    const tier1Html = renderTier1Card(tree);
    const tier2Html = tier2Nodes.map(n => renderTier2Card(n)).join('');
    const tier3Html = tier3Groups.map(g =>
        `<div class="t3-group">
            <div class="t3-group-label">${esc((g.parent.manifest.shortName || g.parent.manifest.name).toUpperCase())}</div>
            <div class="t3-group-cards">${g.nodes.map(n => renderTier3Card(n)).join('')}</div>
        </div>`
    ).join('');

    const totalActive = countNodes(tree);
    const disabledCount = manifests.filter(m => !isAgentEnabled(m.name, overrides)).length;
    const statsHtml = `
<div class="stats">
    <span class="stat"><strong>${totalActive}</strong> active agents</span>
    ${disabledCount > 0 ? `<span class="stat stat-warn"><strong>${disabledCount}</strong> disabled</span>` : ''}
</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Topology</title>
<style>
${css()}
</style>
</head>
<body>
<div class="page">
    <div class="page-header">
        <div class="page-logo">
            <svg width="64" height="64" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#81B5A1;stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:#293E40;stop-opacity:1"/>
                </linearGradient>
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <line x1="64" y1="32" x2="64" y2="15" stroke="#1C2B2D" stroke-width="4" stroke-linecap="round"/>
              <circle cx="64" cy="12" r="6" fill="#CDDC39" stroke="#1C2B2D" stroke-width="2"/>
              <rect x="24" y="30" width="80" height="70" rx="16" fill="url(#bodyGrad)" stroke="#1C2B2D" stroke-width="2"/>
              <rect x="34" y="45" width="60" height="40" rx="8" fill="#152021" stroke="#000" stroke-width="1"/>
              <g stroke="#00ff41" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#neonGlow)">
                <path d="M 46 58 L 38 65 L 46 72"/>
                <line x1="68" y1="56" x2="56" y2="74" stroke="#00ff41"/>
                <path d="M 80 58 L 88 65 L 80 72"/>
              </g>
              <rect x="18" y="55" width="6" height="20" rx="2" fill="#81B5A1" stroke="#1C2B2D" stroke-width="1"/>
              <rect x="104" y="55" width="6" height="20" rx="2" fill="#81B5A1" stroke="#1C2B2D" stroke-width="1"/>
            </svg>
        </div>
        <h1 class="page-title">Agent Topology</h1>
        <p class="page-subtitle">Active agent hierarchy configured in this workspace</p>
        ${statsHtml}
    </div>

    <div class="topology">

        <!-- Tier 1 -->
        <div class="tier-label-row">TIER 1 &mdash; ORCHESTRATOR</div>
        <div class="tier tier-1">
            ${tier1Html}
        </div>

        <div class="connector-v"></div>

        <!-- Tier 2 -->
        <div class="tier-label-row">TIER 2 &mdash; DOMAIN COORDINATORS &amp; ROUTERS</div>
        <div class="tier tier-2">
            ${tier2Html}
        </div>

        ${tier3Groups.length > 0 ? `
        <div class="connector-v"></div>

        <!-- Tier 3 -->
        <div class="tier-label-row">TIER 3 &mdash; DEEP SPECIALISTS</div>
        <div class="tier tier-3">
            ${tier3Html}
        </div>` : ''}
    </div>
</div>
</body>
</html>`;
}

function countNodes(node: TreeNode): number {
    return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

function noAgentsHtml(): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>body{background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);font-family:var(--vscode-font-family);display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.msg{text-align:center;opacity:.6;}h2{margin-bottom:8px;}</style></head>
<body><div class="msg"><h2>No agents found</h2><p>No agent manifests are available. Try reopening the extension panel.</p></div></body></html>`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function css(): string {
    return `
${getSharedPanelStyles()}

/* ── Topology-specific layout ─────────────────────────────────────── */

body {
    padding: 0;
    max-width: none;
}

.page {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--nd-sp-6) var(--nd-sp-5) calc(var(--nd-sp-6) * 1.5);
}

.page-header {
    text-align: center;
    margin-bottom: calc(var(--nd-sp-6) * 1.25);
}

.page-logo { margin-bottom: var(--nd-sp-3); }
.page-logo svg {
    filter: drop-shadow(0 4px 14px rgba(129, 181, 161, 0.22));
}

.page-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 var(--nd-sp-2);
    color: var(--nd-fg);
    letter-spacing: -0.4px;
}

.page-subtitle {
    margin: 0 0 var(--nd-sp-3);
    color: var(--nd-fg-mute);
    font-size: 12.5px;
}

.stats {
    display: inline-flex;
    gap: var(--nd-sp-4);
    background: var(--nd-bg-elevated);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-pill);
    padding: var(--nd-sp-1) var(--nd-sp-4);
}

.stat {
    font-size: 11.5px;
    color: var(--nd-fg-mute);
}
.stat strong { color: var(--nd-fg); }
.stat-warn strong { color: var(--nd-warning); }

/* ─── Topology layout ────────────────────────── */

.topology {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
}

.tier-label-row {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--nd-fg-mute);
    text-align: center;
    margin: var(--nd-sp-1) 0 var(--nd-sp-3);
    text-transform: uppercase;
}

.connector-v {
    width: 1px;
    height: 36px;
    background: var(--nd-border);
    margin: var(--nd-sp-1) 0;
}

/* ─── Tiers ──────────────────────────────────── */

.tier {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--nd-sp-3);
    width: 100%;
}

/* ─── Tier 1 card (orchestrator) ─────────────── */

.card-orchestrator {
    background: linear-gradient(135deg,
        rgba(129,181,161,0.18) 0%,
        rgba(90,138,120,0.22) 100%);
    border: 1px solid rgba(168,212,196,0.50);
    border-radius: var(--nd-r-lg);
    padding: var(--nd-sp-6) calc(var(--nd-sp-6) * 1.2);
    text-align: center;
    min-width: 280px;
    max-width: 420px;
    cursor: default;
    transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.card-orchestrator:hover {
    box-shadow: 0 6px 28px rgba(129,181,161,0.28);
    border-color: var(--nd-accent-hi);
}

.card-icon {
    font-size: 26px;
    margin-bottom: var(--nd-sp-3);
    color: var(--nd-accent-hi);
}

.card-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: var(--nd-sp-2);
    color: var(--nd-fg);
}

.card-desc {
    font-size: 11.5px;
    color: var(--nd-fg-mute);
    line-height: 1.5;
    margin: 0 auto var(--nd-sp-3);
    max-width: 320px;
}

.card-tags {
    display: flex;
    gap: var(--nd-sp-2);
    justify-content: center;
    flex-wrap: wrap;
}

/* Unified mint-family role tags — single product family, subtle role hue */
.tag {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--nd-r-pill);
    letter-spacing: 0.4px;
    background: rgba(129,181,161,0.10);
    color: var(--nd-accent-hi);
    border: 1px solid rgba(129,181,161,0.32);
    text-transform: capitalize;
}
.tag-orchestrator { background: rgba(168,212,196,0.20); color: #c5e6d8; border-color: rgba(168,212,196,0.55); }
.tag-coordinator  { background: rgba(129,181,161,0.16); color: #a8d4c4; border-color: rgba(129,181,161,0.45); }
.tag-developer    { background: rgba(129,181,161,0.10); color: #b8dcc8; border-color: rgba(129,181,161,0.32); }
.tag-reviewer     { background: rgba(90,138,120,0.18); color: #9ec8b6; border-color: rgba(90,138,120,0.45); }
.tag-release      { background: rgba(205,220,57,0.10); color: #d8e26e; border-color: rgba(205,220,57,0.32); }
.tag-support      { background: rgba(148,163,184,0.10); color: #cbd5e1; border-color: rgba(148,163,184,0.30); }
.tag-planning     { background: rgba(129,181,161,0.10); color: #a8d4c4; border-color: rgba(129,181,161,0.30); }
.tag-delegation   { background: rgba(168,212,196,0.12); color: #b8dcc8; border-color: rgba(168,212,196,0.35); }
.tag-architecture { background: rgba(129,181,161,0.12); color: #a8d4c4; border-color: rgba(129,181,161,0.35); }
.tag-unknown      { background: var(--nd-bg-code); color: var(--nd-fg-mute); border-color: var(--nd-border); }

/* ─── Tier 2 cards ───────────────────────────── */

.card-tier2 {
    border-radius: var(--nd-r-md);
    border: 1px solid var(--nd-border);
    padding: var(--nd-sp-4) calc(var(--nd-sp-4) + 2px);
    min-width: 140px;
    max-width: 190px;
    text-align: center;
    background: var(--nd-bg-elevated);
    cursor: default;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.card-tier2:hover {
    box-shadow: 0 4px 18px rgba(0,0,0,0.30);
    transform: translateY(-1px);
}

/* All role borders share the mint family with subtle saturation steps */
.card-role-orchestrator { border-left: 3px solid rgba(168,212,196,0.55); }
.card-role-coordinator  { border-left: 3px solid rgba(129,181,161,0.50); }
.card-role-coordinator:hover { border-color: var(--nd-accent); }
.card-role-developer    { border-left: 3px solid rgba(129,181,161,0.40); }
.card-role-developer:hover { border-color: var(--nd-accent); }
.card-role-reviewer     { border-left: 3px solid rgba(90,138,120,0.55); }
.card-role-reviewer:hover { border-color: var(--nd-accent); }
.card-role-release      { border-left: 3px solid rgba(205,220,57,0.45); }
.card-role-release:hover { border-color: rgba(205,220,57,0.7); }
.card-role-support      { border-left: 3px solid rgba(148,163,184,0.40); }
.card-role-support:hover { border-color: rgba(148,163,184,0.65); }
.card-role-unknown      { border-left: 3px solid var(--nd-border); }

.card-icon-sm {
    font-size: 18px;
    margin-bottom: var(--nd-sp-2);
    color: var(--nd-accent-hi);
    opacity: 0.85;
}

.card-name-sm {
    font-size: 12.5px;
    font-weight: 600;
    margin-bottom: var(--nd-sp-1);
    color: var(--nd-fg);
}

.card-sub {
    font-size: 10.5px;
    color: var(--nd-fg-mute);
    line-height: 1.4;
}

/* ─── Tier 3 groups ──────────────────────────── */

.tier-3 {
    gap: var(--nd-sp-5);
    align-items: flex-start;
}

.t3-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--nd-sp-3);
}

.t3-group-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--nd-fg-mute);
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
}

.t3-group-cards {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nd-sp-3);
    justify-content: center;
}

/* ─── Tier 3 cards ───────────────────────────── */

.card-tier3 {
    border-radius: var(--nd-r-md);
    border: 1px solid var(--nd-border);
    padding: var(--nd-sp-3) var(--nd-sp-3);
    min-width: 120px;
    max-width: 160px;
    text-align: center;
    background: var(--nd-bg-elevated);
    cursor: default;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.card-tier3:hover {
    box-shadow: 0 3px 14px rgba(0,0,0,0.28);
    transform: translateY(-1px);
}

.card-tier3 .card-icon-sm { font-size: 15px; margin-bottom: var(--nd-sp-1); }
.card-tier3 .card-name-sm { font-size: 11.5px; }
.card-tier3 .card-sub { font-size: 10px; }

/* Nested depth-4+ cards inside a tier-3 card */
.t3-nested {
    display: flex;
    flex-wrap: wrap;
    gap: var(--nd-sp-2);
    justify-content: center;
    margin-top: var(--nd-sp-3);
}
`;
}
