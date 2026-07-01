import * as vscode from 'vscode';
import { AgentManifest } from './AgentRegistry';
import { AgentOverride } from './WorkspaceAgentManager';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { css } from './AgentTopologyStyles';

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

