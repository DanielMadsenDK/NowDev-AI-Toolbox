import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { extractScriptDependencies, checkLocalStatus } from './ScriptDependencyAnalyzer';

/**
 * DependencyGraphPanel
 *
 * Opens a full-width webview panel that visualises the dependency graph for all
 * ServiceNow scripts in the workspace. Nodes represent both local script files
 * (Business Rules, Client Scripts, Script Includes, etc.) and the Script Include
 * artifacts they reference. Edges point from calling script to called artifact.
 *
 * Node colours:
 *   Blue  — local workspace file (any script type)
 *   Green — dependency available in local @types/servicenow/
 *   Orange — dependency missing from workspace (fetch from instance)
 */

interface GraphNode {
    id: string;
    label: string;
    /** 'file' = workspace JS/TS file, 'available' = found in @types, 'missing' = not found */
    kind: 'file' | 'available' | 'missing';
    filePath?: string;   // absolute path — for 'file' nodes
    depName?: string;    // Script Include name — for 'available'/'missing' nodes
}

interface GraphEdge {
    from: string;  // node id
    to: string;    // node id
    /** 'import' = TypeScript/JS relative import, 'dep' = Script Include reference */
    kind: 'import' | 'dep';
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.vscode', 'out', 'build', 'dist', 'media']);

let _panel: vscode.WebviewPanel | undefined;

export function showDependencyGraphPanel(context: vscode.ExtensionContext): void {
    if (_panel) { _panel.reveal(undefined, false); return; }

    const panel = vscode.window.createWebviewPanel(
        'nowdev.dependencyGraph',
        'Script Dependency Graph',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        }
    );
    _panel = panel;
    panel.onDidDispose(() => { _panel = undefined; });

    const controller = new GraphController(panel, context);
    void controller.refresh();
}

class GraphController {
    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext
    ) {
        panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'openFile':
                    try {
                        await vscode.commands.executeCommand(
                            'vscode.open',
                            vscode.Uri.file(msg.filePath)
                        );
                    } catch { /* ignore */ }
                    break;
                case 'fetchDep':
                    vscode.commands.executeCommand(
                        'nowdev-ai-toolbox.fetchScriptDependency',
                        msg.name
                    );
                    break;
                case 'refresh':
                    void this.refresh();
                    break;
            }
        }, undefined, context.subscriptions);
    }

    async refresh(): Promise<void> {
        this.panel.webview.html = this.buildHtml([], []);  // Show loading state

        const { nodes, edges } = await this.buildGraph();
        this.panel.webview.html = this.buildHtml(nodes, edges);
    }

    private async buildGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return { nodes: [], edges: [] };
        }

        // Phase 1: collect every workspace script file path (all folders)
        const allFilePaths: string[] = [];
        const folderRoots: Map<string, string> = new Map(); // filePath -> folderRoot
        for (const folder of folders) {
            const files = collectScriptFiles(folder.uri.fsPath);
            for (const f of files) { folderRoots.set(f, folder.uri.fsPath); }
            allFilePaths.push(...files);
        }

        const nodes = new Map<string, GraphNode>();
        const edgesRaw: GraphEdge[] = [];

        // Phase 2: for each file detect relationships
        for (const filePath of allFilePaths) {
            let content: string;
            try { content = fs.readFileSync(filePath, 'utf-8'); } catch { continue; }

            const folderRoot = folderRoots.get(filePath) ?? folders[0].uri.fsPath;
            const relPath = path.relative(folderRoot, filePath);
            const fileNodeId = 'file:' + filePath;

            // Ensure file node exists
            if (!nodes.has(fileNodeId)) {
                nodes.set(fileNodeId, { id: fileNodeId, label: relPath, kind: 'file', filePath });
            }

            // ── TypeScript / JS relative imports ───────────────────────────
            // Covers: import ... from './foo', require('./foo'), export ... from './foo'
            const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]|require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
            let m: RegExpExecArray | null;
            while ((m = importRe.exec(content)) !== null) {
                const importSpec = m[1] ?? m[2];
                if (!importSpec) { continue; }
                const resolved = resolveImportPath(importSpec, filePath, allFilePaths);
                if (!resolved || resolved === filePath) { continue; }

                const targetNodeId = 'file:' + resolved;
                if (!nodes.has(targetNodeId)) {
                    const tRoot = folderRoots.get(resolved) ?? folderRoot;
                    nodes.set(targetNodeId, {
                        id: targetNodeId,
                        label: path.relative(tRoot, resolved),
                        kind: 'file',
                        filePath: resolved,
                    });
                }
                edgesRaw.push({ from: fileNodeId, to: targetNodeId, kind: 'import' });
            }

            // ── Script Include / callable artifact references ───────────────
            const depNames = extractScriptDependencies(content);
            for (const depName of depNames) {
                const status = checkLocalStatus(depName, filePath);
                const depNodeId = 'dep:' + depName;
                if (!nodes.has(depNodeId)) {
                    nodes.set(depNodeId, { id: depNodeId, label: depName, kind: status, depName });
                }
                edgesRaw.push({ from: fileNodeId, to: depNodeId, kind: 'dep' });
            }
        }

        // Phase 3: keep only nodes that participate in at least one edge
        const connectedIds = new Set<string>();
        for (const e of edgesRaw) { connectedIds.add(e.from); connectedIds.add(e.to); }

        const filteredNodes = [...nodes.values()].filter(n => connectedIds.has(n.id));
        // Deduplicate edges
        const edgeKeys = new Set<string>();
        const edges: GraphEdge[] = [];
        for (const e of edgesRaw) {
            const key = e.kind + '|' + e.from + '|' + e.to;
            if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push(e); }
        }

        return { nodes: filteredNodes, edges };
    }

    private buildHtml(nodes: GraphNode[], edges: GraphEdge[]): string {
        const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;

        const nodesJson = JSON.stringify(nodes);
        const edgesJson = JSON.stringify(edges);
        const hasData = nodes.length > 0;

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Script Dependency Graph</title>
<style>
${getSharedPanelStyles()}
body { margin: 0; padding: 0; overflow: hidden; background: var(--nd-bg); }
#toolbar {
    display: flex; align-items: center; gap: 10px; padding: 8px 16px;
    background: var(--nd-bg-card); border-bottom: 1px solid var(--nd-border-soft);
    font-size: 12px; z-index: 10; position: relative; flex-wrap: wrap;
}
#toolbar h1 { font-size: 14px; margin: 0; color: var(--nd-fg-strong); flex-shrink: 0; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--nd-fg-mute); }
.leg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.leg-line { width: 18px; height: 2px; flex-shrink: 0; }
.leg-file      { background: #4e9de8; }
.leg-available { background: #4ec98b; }
.leg-missing   { background: #e8944e; }
.leg-import-line { background: #6b9de8; }
.leg-dep-line    { background: #555; }
button {
    background: var(--nd-bg-soft); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 4px 10px; font-size: 11px; cursor: pointer;
    font-family: var(--nd-font); flex-shrink: 0;
}
button:hover { background: var(--nd-border-soft); }
#stats { margin-left: auto; color: var(--nd-fg-mute); font-size: 11px; flex-shrink: 0; }
#canvas { display: block; cursor: grab; }
#canvas:active { cursor: grabbing; }
#tooltip {
    position: fixed; display: none; pointer-events: none;
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-sm); padding: 6px 10px; font-size: 11px;
    color: var(--nd-fg); max-width: 320px; word-break: break-all;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 100;
}
#empty {
    display: flex; align-items: center; justify-content: center;
    height: calc(100vh - 45px); flex-direction: column; gap: 10px;
    color: var(--nd-fg-mute); font-size: 13px; text-align: center; padding: 24px;
}
</style>
</head>
<body>
<div id="toolbar">
    <h1>Script Dependency Graph</h1>
    <div class="legend">
        <div class="leg-item"><div class="leg-dot leg-file"></div> Workspace file</div>
        <div class="leg-item"><div class="leg-dot leg-available"></div> Dep — available</div>
        <div class="leg-item"><div class="leg-dot leg-missing"></div> Dep — missing</div>
        <div class="leg-item"><div class="leg-line leg-import-line"></div> TS import</div>
        <div class="leg-item"><div class="leg-line leg-dep-line"></div> Script Include ref</div>
    </div>
    <button id="refreshBtn">↻ Refresh</button>
    <button id="resetBtn">Reset view</button>
    <span id="stats"></span>
</div>
${hasData ? '<canvas id="canvas"></canvas>' : ''}
<div id="empty" style="display:${hasData ? 'none' : 'flex'}">
    No cross-file relationships detected.<br>
    <span style="font-size:11px;margin-top:4px;">
        The graph shows TypeScript imports between files and Script Include references.<br>
        Files with no detected relationships are hidden.
    </span>
</div>
<div id="tooltip"></div>

<script>
(function () {
    const vscode = acquireVsCodeApi();

    const NODES = ${nodesJson};
    const EDGES = ${edgesJson};

    document.getElementById('refreshBtn').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
    document.getElementById('resetBtn').addEventListener('click', () => {
        panOffset = { x: 0, y: 0 }; scale = 1; layoutNodes(); draw();
    });

    if (NODES.length === 0) { return; }

    const canvas = document.getElementById('canvas');
    const tooltip = document.getElementById('tooltip');
    const statsEl = document.getElementById('stats');
    const ctx = canvas.getContext('2d');

    const TOOLBAR_H = document.getElementById('toolbar').offsetHeight;
    let W = window.innerWidth;
    let H = window.innerHeight - TOOLBAR_H;
    canvas.width = W; canvas.height = H;

    // ── Layout ────────────────────────────────────────────────────────────
    // Group nodes: file-only nodes in left col, file nodes that are also
    // imported (targets of import edges) in a middle-ish position, dep nodes right.
    const importTargetIds = new Set(EDGES.filter(e => e.kind === 'import').map(e => e.to));
    const depNodes     = NODES.filter(n => n.kind !== 'file');
    const sourceFiles  = NODES.filter(n => n.kind === 'file' && !importTargetIds.has(n.id));
    const importedFiles = NODES.filter(n => n.kind === 'file' && importTargetIds.has(n.id));

    // Use up to 4 columns depending on what exists
    const cols = [];
    if (sourceFiles.length)  { cols.push(sourceFiles); }
    if (importedFiles.length) { cols.push(importedFiles); }
    if (depNodes.length)      { cols.push(depNodes); }
    const totalCols = Math.max(cols.length, 1);

    const NODE_H = 26;
    const ROW_GAP = 10;
    const COL_PAD = 60;
    const NODE_MIN_W = 110;

    let positions = {}; // nodeId -> {x, y, w, h}
    let isDragging = false, dragNode = null, panStart = null;
    let panOffset = { x: 0, y: 0 }, scale = 1;

    function layoutNodes() {
        const usableW = W - COL_PAD * 2;
        cols.forEach((colNodes, ci) => {
            const cx = COL_PAD + (usableW / Math.max(totalCols - 1, 1)) * ci;
            const totalH = colNodes.length * (NODE_H + ROW_GAP) - ROW_GAP;
            const startY = Math.max(20, (H - totalH) / 2);
            colNodes.forEach((n, i) => {
                const w = Math.max(NODE_MIN_W, ctx.measureText(n.label).width + 24);
                positions[n.id] = { x: cx - w / 2, y: startY + i * (NODE_H + ROW_GAP), w, h: NODE_H };
            });
        });
    }

    layoutNodes();

    const fileCount    = NODES.filter(n => n.kind === 'file').length;
    const availCount   = NODES.filter(n => n.kind === 'available').length;
    const missingCount = NODES.filter(n => n.kind === 'missing').length;
    const importCount  = EDGES.filter(e => e.kind === 'import').length;
    const depCount     = EDGES.filter(e => e.kind === 'dep').length;
    statsEl.textContent =
        fileCount + ' file(s) · ' +
        (availCount + missingCount) + ' dep(s) · ' +
        importCount + ' import(s) · ' +
        depCount + ' dep ref(s)';

    // ── Colors ────────────────────────────────────────────────────────────
    const NODE_COLORS = {
        file:      { fill: '#1a2f4a', stroke: '#4e9de8', text: '#a8d4ff' },
        available: { fill: '#1a3d2b', stroke: '#4ec98b', text: '#9be8c4' },
        missing:   { fill: '#3d2a15', stroke: '#e8944e', text: '#f4c490' },
    };
    const EDGE_COLORS = {
        import: '#4e78c4',
        dep:    '#555566',
    };

    // ── Draw ──────────────────────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(scale, scale);

        // Edges
        for (const edge of EDGES) {
            const fp = positions[edge.from], tp = positions[edge.to];
            if (!fp || !tp) { continue; }
            const fromX = fp.x + fp.w, fromY = fp.y + fp.h / 2;
            const toX   = tp.x,        toY   = tp.y + tp.h / 2;

            ctx.strokeStyle = EDGE_COLORS[edge.kind] ?? '#555';
            ctx.lineWidth = edge.kind === 'import' ? 1.5 : 1;

            if (edge.kind === 'import') {
                // Dashed blue for TypeScript imports
                ctx.setLineDash([4, 3]);
            } else {
                ctx.setLineDash([]);
            }

            const cpX = (fromX + toX) / 2;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.bezierCurveTo(cpX, fromY, cpX, toY, toX, toY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrowhead
            const angle = Math.atan2(toY - fromY, toX - fromX - 0.01);
            const len = 7;
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - len * Math.cos(angle - 0.4), toY - len * Math.sin(angle - 0.4));
            ctx.lineTo(toX - len * Math.cos(angle + 0.4), toY - len * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fillStyle = EDGE_COLORS[edge.kind] ?? '#555';
            ctx.fill();
        }

        // Nodes
        ctx.font = '11px monospace';
        for (const node of NODES) {
            const p = positions[node.id];
            if (!p) { continue; }
            const c = NODE_COLORS[node.kind];
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 5;
            ctx.fillStyle = c.fill; ctx.strokeStyle = c.stroke; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 4);
            ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = c.text; ctx.textBaseline = 'middle';
            let label = node.label;
            const maxW = p.w - 14;
            while (label.length > 4 && ctx.measureText(label).width > maxW) {
                label = label.slice(0, -4) + '…';
            }
            ctx.fillText(label, p.x + 7, p.y + p.h / 2);
        }
        ctx.restore();
    }

    draw();

    // ── Interaction ───────────────────────────────────────────────────────
    function hitTest(cx, cy) {
        const rx = (cx - panOffset.x) / scale, ry = (cy - panOffset.y) / scale;
        for (const n of NODES) {
            const p = positions[n.id];
            if (p && rx >= p.x && rx <= p.x + p.w && ry >= p.y && ry <= p.y + p.h) { return n; }
        }
        return null;
    }

    canvas.addEventListener('mousedown', (e) => {
        const node = hitTest(e.offsetX, e.offsetY);
        if (node) { dragNode = node; }
        else { panStart = { x: e.offsetX - panOffset.x, y: e.offsetY - panOffset.y }; }
        isDragging = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && dragNode) {
            const p = positions[dragNode.id];
            if (p) { p.x = (e.offsetX - panOffset.x) / scale - p.w / 2; p.y = (e.offsetY - panOffset.y) / scale - p.h / 2; draw(); }
        } else if (isDragging && panStart) {
            panOffset.x = e.offsetX - panStart.x; panOffset.y = e.offsetY - panStart.y; draw();
        }
        const hovered = hitTest(e.offsetX, e.offsetY);
        if (hovered) {
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY + 10) + 'px';
            const kindLabel = { file: 'Workspace file', available: '✓ Available in @types/servicenow', missing: '⚠ Missing — click to fetch' }[hovered.kind];
            tooltip.innerHTML = '<strong>' + esc(hovered.label) + '</strong><br><span style="opacity:0.7">' + kindLabel + '</span>';
            canvas.style.cursor = 'pointer';
        } else {
            tooltip.style.display = 'none';
            canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isDragging) { return; }
        const node = hitTest(e.offsetX, e.offsetY);
        if (node && (node === dragNode || !dragNode)) {
            if (node.kind === 'file' && node.filePath) {
                vscode.postMessage({ type: 'openFile', filePath: node.filePath });
            } else if (node.kind === 'missing' && node.depName) {
                vscode.postMessage({ type: 'fetchDep', name: node.depName });
            }
        }
        isDragging = false; dragNode = null; panStart = null;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false; dragNode = null; panStart = null;
        tooltip.style.display = 'none';
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(3, Math.max(0.15, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
        draw();
    }, { passive: false });

    window.addEventListener('resize', () => {
        W = window.innerWidth;
        H = window.innerHeight - document.getElementById('toolbar').offsetHeight;
        canvas.width = W; canvas.height = H;
        layoutNodes(); draw();
    });

    function esc(s) {
        return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
})();
</script>
</body>
</html>`;
    }
}

/**
 * Resolves a relative import specifier (e.g. `./utils` or `../shared/helpers`)
 * to an absolute file path that exists in allFilePaths, trying common extensions.
 */
function resolveImportPath(
    spec: string,
    fromFile: string,
    allFilePaths: string[]
): string | undefined {
    const dir = path.dirname(fromFile);
    const base = path.resolve(dir, spec);

    // Exact match first (spec already has extension)
    if (allFilePaths.includes(base)) { return base; }

    // Try known extensions in priority order
    const EXTS = ['.ts', '.js', '.now.ts', '.server.ts', '.server.js', '.d.ts'];
    for (const ext of EXTS) {
        const candidate = base + ext;
        if (allFilePaths.includes(candidate)) { return candidate; }
    }
    // Try index files
    for (const ext of EXTS) {
        const candidate = path.join(base, 'index' + ext);
        if (allFilePaths.includes(candidate)) { return candidate; }
    }
    return undefined;
}

function collectScriptFiles(dir: string): string[] {    const results: string[] = [];
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
    for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) { continue; }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectScriptFiles(full));
        } else if (
            entry.isFile() &&
            (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) &&
            !entry.name.endsWith('.d.ts') &&
            !entry.name.endsWith('.d.now.ts')
        ) {
            results.push(full);
        }
    }
    return results;
}
