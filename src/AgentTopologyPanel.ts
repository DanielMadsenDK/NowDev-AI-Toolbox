import * as vscode from 'vscode';
import { AgentManifest } from './AgentRegistry';
import { AgentOverride } from './WorkspaceAgentManager';

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
*, *::before, *::after { box-sizing: border-box; }

body {
    margin: 0;
    padding: 0;
    background: var(--vscode-editor-background, #1e1e2e);
    color: var(--vscode-editor-foreground, #cdd6f4);
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 13px;
    min-height: 100vh;
}

.page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 48px;
}

.page-header {
    text-align: center;
    margin-bottom: 40px;
}

.page-logo {
    margin-bottom: 12px;
}

.page-logo svg {
    filter: drop-shadow(0 4px 12px rgba(0, 255, 65, 0.18));
}

.page-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 6px;
    color: var(--vscode-editor-foreground, #cdd6f4);
    letter-spacing: -0.3px;
}

.page-subtitle {
    margin: 0 0 12px;
    opacity: 0.55;
    font-size: 12px;
}

.stats {
    display: inline-flex;
    gap: 16px;
    background: var(--vscode-badge-background, rgba(255,255,255,0.06));
    border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.08));
    border-radius: 20px;
    padding: 4px 14px;
}

.stat {
    font-size: 11.5px;
    opacity: 0.75;
}

.stat-warn strong {
    color: #f9b35a;
}

/* ─── Topology layout ────────────────────────── */

.topology {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
}

.tier-label-row {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: var(--vscode-descriptionForeground, #888);
    text-align: center;
    margin-bottom: 14px;
    margin-top: 4px;
    opacity: 0.7;
}

.connector-v {
    width: 1px;
    height: 36px;
    background: var(--vscode-widget-border, rgba(255,255,255,0.12));
    margin: 4px 0;
}

/* ─── Tiers ──────────────────────────────────── */

.tier {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    width: 100%;
}

/* ─── Tier 1 card ────────────────────────────── */

.card-orchestrator {
    background: linear-gradient(135deg, rgba(124,77,255,0.18) 0%, rgba(88,56,210,0.22) 100%);
    border: 1px solid rgba(124,77,255,0.45);
    border-radius: 14px;
    padding: 28px 36px;
    text-align: center;
    min-width: 280px;
    max-width: 420px;
    cursor: default;
    transition: box-shadow 0.15s ease;
}

.card-orchestrator:hover {
    box-shadow: 0 4px 24px rgba(124,77,255,0.25);
}

.card-icon {
    font-size: 26px;
    margin-bottom: 10px;
    opacity: 0.85;
    color: #a78bfa;
}

.card-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--vscode-editor-foreground, #e2e8f0);
}

.card-desc {
    font-size: 11.5px;
    opacity: 0.65;
    line-height: 1.5;
    margin-bottom: 14px;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
}

.card-tags {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
}

.tag {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15);
    opacity: 0.8;
}

.tag-orchestrator { color: #c4b5fd; border-color: rgba(167,139,250,0.4); background: rgba(124,77,255,0.12); }
.tag-coordinator  { color: #7dd3fc; border-color: rgba(125,211,252,0.3); background: rgba(14,165,233,0.08); }
.tag-developer    { color: #86efac; border-color: rgba(134,239,172,0.3); background: rgba(34,197,94,0.08); }
.tag-reviewer     { color: #6ee7b7; border-color: rgba(110,231,183,0.3); background: rgba(16,185,129,0.08); }
.tag-release      { color: #fdba74; border-color: rgba(253,186,116,0.3); background: rgba(249,115,22,0.08); }
.tag-support      { color: #cbd5e1; border-color: rgba(203,213,225,0.2); background: rgba(148,163,184,0.06); }
.tag-planning     { color: #93c5fd; border-color: rgba(147,197,253,0.25); background: rgba(59,130,246,0.06); }
.tag-delegation   { color: #c4b5fd; border-color: rgba(196,181,253,0.25); background: rgba(139,92,246,0.06); }
.tag-architecture { color: #f9a8d4; border-color: rgba(249,168,212,0.25); background: rgba(236,72,153,0.06); }
.tag-unknown      { color: #94a3b8; border-color: rgba(148,163,184,0.2); }

/* ─── Tier 2 cards ───────────────────────────── */

.card-tier2 {
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    padding: 16px 18px;
    min-width: 140px;
    max-width: 190px;
    text-align: center;
    background: var(--vscode-sideBar-background, rgba(255,255,255,0.03));
    cursor: default;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.card-tier2:hover {
    box-shadow: 0 2px 14px rgba(0,0,0,0.25);
}

.card-role-orchestrator { border-color: rgba(124,77,255,0.35); }
.card-role-coordinator  { border-color: rgba(14,165,233,0.35); }
.card-role-coordinator:hover { border-color: rgba(14,165,233,0.6); }
.card-role-developer    { border-color: rgba(34,197,94,0.3); }
.card-role-developer:hover { border-color: rgba(34,197,94,0.55); }
.card-role-reviewer     { border-color: rgba(16,185,129,0.35); }
.card-role-reviewer:hover { border-color: rgba(16,185,129,0.6); }
.card-role-release      { border-color: rgba(249,115,22,0.35); }
.card-role-release:hover { border-color: rgba(249,115,22,0.6); }
.card-role-support      { border-color: rgba(148,163,184,0.25); }
.card-role-support:hover { border-color: rgba(148,163,184,0.5); }
.card-role-unknown      { border-color: rgba(148,163,184,0.2); }

.card-icon-sm {
    font-size: 18px;
    margin-bottom: 7px;
    opacity: 0.7;
}

.card-name-sm {
    font-size: 12.5px;
    font-weight: 600;
    margin-bottom: 5px;
    color: var(--vscode-editor-foreground, #e2e8f0);
}

.card-sub {
    font-size: 10.5px;
    opacity: 0.5;
    line-height: 1.4;
}

/* ─── Tier 3 groups ──────────────────────────── */

.tier-3 {
    gap: 18px;
    align-items: flex-start;
}

.t3-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.t3-group-label {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.4;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    text-align: center;
}

/* ─── Tier 3 groups ──────────────────────────── */

.tier-3 {
    gap: 24px;
    align-items: flex-start;
}

.t3-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.t3-group-label {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.4;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
}

.t3-group-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
}

/* ─── Tier 3 cards ───────────────────────────── */

.card-tier3 {
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    padding: 12px 14px;
    min-width: 120px;
    max-width: 160px;
    text-align: center;
    background: var(--vscode-sideBar-background, rgba(255,255,255,0.03));
    cursor: default;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.card-tier3:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}

.card-tier3 .card-icon-sm {
    font-size: 15px;
    margin-bottom: 6px;
}

.card-tier3 .card-name-sm {
    font-size: 11.5px;
}

.card-tier3 .card-sub {
    font-size: 10px;
}

/* Nested depth-4+ cards inside a tier-3 card */
.t3-nested {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 10px;
}
`;
}
