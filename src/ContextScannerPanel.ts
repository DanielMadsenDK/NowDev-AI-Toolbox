import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { getShell } from './shellConfig';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { InstanceClient } from './InstanceClient';
import {
    NowConfigPackage,
    findNowConfigs,
    addDependencies,
    reloadConfig,
} from './NowConfigManager';
import { extractScriptDependencies, checkLocalStatus } from './ScriptDependencyAnalyzer';

interface ScanTableDef {
    sdkKey: string;
    table: string;
    label: string;
    nameField: string;
    descFields: string[];
    hasScript: boolean;
}

const SCAN_TABLES: Record<string, ScanTableDef> = {
    script_includes: {
        sdkKey: 'sys_script_include',
        table: 'sys_script_include',
        label: 'Script Includes',
        nameField: 'name',
        descFields: ['short_description', 'description'],
        hasScript: true,
    },
    business_rules: {
        sdkKey: 'sys_script',
        table: 'sys_script',
        label: 'Business Rules',
        nameField: 'name',
        descFields: ['description'],
        hasScript: true,
    },
    client_scripts: {
        sdkKey: 'sys_script_client',
        table: 'sys_script_client',
        label: 'Client Scripts',
        nameField: 'name',
        descFields: ['description'],
        hasScript: true,
    },
    knowledge: {
        sdkKey: 'kb_knowledge',
        table: 'kb_knowledge',
        label: 'Knowledge Articles',
        nameField: 'short_description',
        descFields: ['text'],
        hasScript: false,
    },
    ui_actions: {
        sdkKey: 'sys_ui_action',
        table: 'sys_ui_action',
        label: 'UI Actions',
        nameField: 'name',
        descFields: ['short_description', 'description'],
        hasScript: true,
    },
    flows: {
        sdkKey: 'sys_hub_flow',
        table: 'sys_hub_flow',
        label: 'Flows',
        nameField: 'name',
        descFields: ['description'],
        hasScript: false,
    },
    scheduled_scripts: {
        sdkKey: 'sysauto_script',
        table: 'sysauto_script',
        label: 'Scheduled Scripts',
        nameField: 'name',
        descFields: ['description'],
        hasScript: true,
    },
};

let _panel: vscode.WebviewPanel | undefined;

export function showContextScannerPanel(context: vscode.ExtensionContext): void {
    if (_panel) { _panel.reveal(undefined, false); return; }

    const panel = vscode.window.createWebviewPanel(
        'nowdev.contextScanner',
        'Instance Context Scanner',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        }
    );
    _panel = panel;
    panel.onDidDispose(() => { _panel = undefined; });

    const client = new InstanceClient(context.secrets);
    const controller = new ScannerController(panel, client, context);
    void controller.init();
}

class ScannerController {
    private currentAlias: string | undefined;
    private currentPackage: NowConfigPackage | undefined;
    private connected = false;
    private cancelled = false;

    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly client: InstanceClient,
        private readonly context: vscode.ExtensionContext
    ) {
        panel.webview.html = this.html();
        panel.webview.onDidReceiveMessage(async (msg) => {
            try { await this.handle(msg); }
            catch (err: any) {
                this.post({ type: 'error', message: err?.message ?? String(err) });
            }
        }, undefined, context.subscriptions);
    }

    async init(): Promise<void> {
        const aliases = this.client.listAliases();
        this.currentAlias = aliases.find(a => a.isDefault)?.alias ?? aliases[0]?.alias;
        const configs = findNowConfigs();
        this.currentPackage = configs[0];
        this.post({
            type: 'init',
            aliases: aliases.map(a => ({ alias: a.alias, host: a.host, isDefault: a.isDefault })),
            currentAlias: this.currentAlias,
            tables: Object.entries(SCAN_TABLES).map(([key, def]) => ({ key, label: def.label })),
        });
    }

    private post(msg: any): void {
        this.panel.webview.postMessage(msg);
    }

    private async handle(msg: any): Promise<void> {
        switch (msg.type) {
            case 'selectAlias':
                this.currentAlias = msg.alias;
                this.connected = false;
                this.post({ type: 'connectionStatus', connected: false });
                return;
            case 'connect': {
                if (!this.currentAlias) { return; }
                const result = await this.client.testConnection(this.currentAlias);
                this.connected = result.ok;
                this.post({ type: 'connectionStatus', connected: result.ok, error: result.error });
                if (result.ok) { await this.loadScopes(); }
                return;
            }
            case 'forgetCredentials': {
                if (!this.currentAlias) { return; }
                await this.client.clearCredentials(this.currentAlias);
                this.connected = false;
                this.post({ type: 'connectionStatus', connected: false, error: 'Credentials cleared' });
                return;
            }
            case 'nextToConfigure': {
                const keywords = extractKeywords(msg.task ?? '');
                this.post({ type: 'keywords', keywords });
                return;
            }
            case 'runScan': {
                await this.runScan(msg.tables, msg.keywords, msg.scope, msg.limit ?? 30);
                return;
            }
            case 'cancelScan': {
                this.cancelled = true;
                return;
            }
            case 'previewScript': {
                await this.previewScript(msg.sys_id, msg.table);
                return;
            }
            case 'findCallers': {
                await this.findCallers(String(msg.name ?? ''));
                return;
            }
            case 'addSelected': {
                await this.addSelected(msg.scope, msg.items);
                return;
            }
        }
    }

    private async loadScopes(): Promise<void> {
        if (!this.currentAlias) { return; }
        try {
            const res = await this.client.query(this.currentAlias, 'sys_scope', {
                fields: ['sys_id', 'name', 'scope'],
                limit: 500,
                query: 'scopeISNOTEMPTY^ORDERBYscope',
            });
            const seen = new Set<string>();
            const scopes: { sys_id: string; name: string; scope: string }[] = [];
            for (const r of res.result as any[]) {
                const scope = String(r.scope ?? '').trim();
                if (!scope || seen.has(scope)) { continue; }
                seen.add(scope);
                scopes.push({ sys_id: String(r.sys_id ?? ''), name: String(r.name ?? scope), scope });
            }
            scopes.sort((a, b) => a.scope.localeCompare(b.scope));
            if (!seen.has('global')) {
                scopes.unshift({ sys_id: '', name: 'Global', scope: 'global' });
            } else {
                const idx = scopes.findIndex(s => s.scope === 'global');
                if (idx > 0) { const [g] = scopes.splice(idx, 1); scopes.unshift(g); }
            }
            this.post({ type: 'scopes', scopes });
        } catch (err: any) {
            this.post({ type: 'error', message: `Failed to load scopes: ${err.message ?? err}` });
        }
    }

    private async runScan(tableKeys: string[], keywords: string[], scope: string, limit: number): Promise<void> {
        if (!this.currentAlias) { return; }
        this.cancelled = false;

        const allResults: any[] = [];

        for (const key of tableKeys) {
            if (this.cancelled) { break; }
            const def = SCAN_TABLES[key];
            if (!def) { continue; }

            this.post({ type: 'scanProgress', table: key, tableLabel: def.label, status: 'running' });

            try {
                const filters: string[] = [];
                const kwFragments: string[] = [];
                for (const kw of keywords) {
                    const safe = kw.replace(/\^/g, '');
                    kwFragments.push(`${def.nameField}LIKE${safe}`);
                    for (const df of def.descFields) {
                        kwFragments.push(`${df}LIKE${safe}`);
                    }
                }
                if (kwFragments.length) { filters.push(kwFragments.join('^OR')); }
                if (scope && scope !== '*') { filters.push(`sys_scope.scope=${scope}`); }

                const fields = ['sys_id', def.nameField, 'sys_scope', ...def.descFields].filter((v, i, a) => a.indexOf(v) === i);

                const res = await this.client.query(this.currentAlias!, def.table, {
                    query: filters.join('^'),
                    fields,
                    limit,
                    displayValue: 'all',
                });

                if (this.cancelled) { break; }

                const get = (r: any, field: string) => {
                    const v = r[field];
                    if (v && typeof v === 'object' && 'display_value' in v) {
                        return { display: String(v.display_value ?? ''), value: String(v.value ?? '') };
                    }
                    return { display: String(v ?? ''), value: String(v ?? '') };
                };

                const scored = (res.result as any[]).map(r => {
                    const nameText = get(r, def.nameField).display.toLowerCase();
                    const descText = def.descFields.map(df => get(r, df).display).join(' ').toLowerCase();
                    let nameHits = 0;
                    let descHits = 0;
                    for (const kw of keywords) {
                        const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        nameHits += (nameText.match(re) ?? []).length;
                        descHits += (descText.match(re) ?? []).length;
                    }
                    const rawScore = nameHits * 3 + descHits;
                    const scopeField = get(r, 'sys_scope');
                    return {
                        sys_id: get(r, 'sys_id').value || get(r, 'sys_id').display,
                        tableKey: key,
                        table: def.table,
                        tableLabel: def.label,
                        sdkKey: def.sdkKey,
                        hasScript: def.hasScript,
                        name: get(r, def.nameField).display,
                        description: def.descFields.map(df => get(r, df).display).filter(Boolean).join(' — '),
                        scope: scopeField.display,
                        scopeValue: scopeField.value,
                        rawScore,
                        nameHits,
                        descHits,
                    };
                }).filter(r => r.rawScore > 0);

                allResults.push(...scored);
                this.post({ type: 'scanProgress', table: key, tableLabel: def.label, status: 'done', count: scored.length });
            } catch (err: any) {
                this.post({ type: 'scanProgress', table: key, tableLabel: def.label, status: 'error', error: err.message ?? String(err) });
            }
        }

        if (this.cancelled) { return; }

        const maxRaw = allResults.reduce((m, r) => Math.max(m, r.rawScore), 1);
        const results = allResults
            .map(r => ({ ...r, score: Math.round((r.rawScore / maxRaw) * 100) }))
            .sort((a, b) => b.score - a.score);

        this.post({ type: 'scanResults', results, totalHits: results.length });
    }

    private async previewScript(sysId: string, table: string): Promise<void> {
        if (!this.currentAlias) { return; }
        try {
            const res = await this.client.query(this.currentAlias, table, {
                query: `sys_id=${sysId}`,
                fields: ['sys_id', 'script', 'text'],
                limit: 1,
            });
            const r = (res.result as any[])[0];
            if (!r) { return; }
            const script = String(r.script ?? r.text ?? '');

            // Detect Script Include (and other callable artifact) references
            // in the script body — works regardless of the calling script type
            // (Business Rules, Client Scripts, UI Actions, etc. all use the same
            // `new ClassName()` / `ClassName.method()` calling conventions).
            const depNames = extractScriptDependencies(script);
            const anchorPath = this.currentPackage?.configPath ??
                (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '');
            const scriptDeps = depNames.map(name => ({
                name,
                status: checkLocalStatus(name, anchorPath),
            }));

            this.post({ type: 'scriptPreview', sys_id: sysId, script, scriptDeps });
        } catch (err: any) {
            this.post({ type: 'error', message: `Preview failed: ${err.message ?? err}` });
        }
    }

    /**
     * Cross-reference inspector (Feature 4) — queries the instance for all
     * scripts of any type that reference the given Script Include name.
     * Covers: Script Includes, Business Rules, Client Scripts, UI Actions,
     * UI Scripts, and Scheduled Scripts.
     */
    private async findCallers(name: string): Promise<void> {
        if (!this.currentAlias || !name) { return; }

        const CALLER_TABLES = [
            { table: 'sys_script_include', nameField: 'name', label: 'Script Include' },
            { table: 'sys_script',         nameField: 'name', label: 'Business Rule' },
            { table: 'sys_script_client',  nameField: 'name', label: 'Client Script' },
            { table: 'sys_ui_action',      nameField: 'name', label: 'UI Action' },
            { table: 'sys_ui_script',      nameField: 'name', label: 'UI Script' },
            { table: 'sysauto_script',     nameField: 'name', label: 'Scheduled Script' },
        ];

        const callers: Array<{ tableLabel: string; name: string; sys_id: string }> = [];
        // Sanitise: only allow safe identifier chars to avoid injection into query string
        const safeName = name.replace(/[^A-Za-z0-9_]/g, '');
        if (!safeName) { return; }

        for (const def of CALLER_TABLES) {
            try {
                const res = await this.client.query(this.currentAlias, def.table, {
                    query: `scriptLIKE${safeName}`,
                    fields: ['sys_id', def.nameField],
                    limit: 25,
                });
                for (const r of (res.result as any[])) {
                    const sys_id = String((r.sys_id as any)?.value ?? r.sys_id ?? '');
                    const rname  = String((r[def.nameField] as any)?.display_value ??
                                          r[def.nameField] ?? '');
                    if (sys_id) {
                        callers.push({ tableLabel: def.label, name: rname, sys_id });
                    }
                }
            } catch { /* skip tables that fail */ }
        }

        this.post({ type: 'callersResult', name, callers });
    }

    private async addSelected(scope: string, items: { tableKey: string; sysId: string }[]): Promise<void> {
        if (!this.currentPackage) {
            const configs = findNowConfigs();
            this.currentPackage = configs[0];
        }
        if (!this.currentPackage) {
            vscode.window.showWarningMessage('No now.config.json found in the workspace. Initialize a Fluent project first.');
            return;
        }

        const buckets = new Map<string, string[]>();
        for (const item of items) {
            const def = SCAN_TABLES[item.tableKey];
            if (!def) { continue; }
            const arr = buckets.get(def.sdkKey) ?? [];
            if (!arr.includes(item.sysId)) { arr.push(item.sysId); }
            buckets.set(def.sdkKey, arr);
        }

        for (const [sdkKey, sysIds] of buckets) {
            try {
                addDependencies(this.currentPackage, scope, sdkKey, sysIds);
                this.currentPackage = reloadConfig(this.currentPackage);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`Failed to update now.config.json: ${msg}`);
                this.post({ type: 'addResult', ok: false, error: msg });
                return;
            }
        }

        const cwd = path.dirname(this.currentPackage.configPath);
        const args = ['dependencies'];
        if (this.currentAlias) { args.push('--auth', this.currentAlias); }
        const label = `${items.length} item(s)`;
        const chan = vscode.window.createOutputChannel('NowDev: SDK Dependencies');
        chan.show(true);
        chan.appendLine(`✓ Updated now.config.json — added ${label} (scope: ${scope}).`);
        chan.appendLine(`\n> now-sdk ${args.join(' ')}\n`);
        const proc = cp.spawn('now-sdk', args, { cwd, shell: getShell() });
        proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
        proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
        proc.on('close', (code) => {
            if (code === 0) {
                chan.appendLine(`\n✓ Dependencies downloaded successfully.`);
            } else {
                chan.appendLine(`\n✗ now-sdk dependencies failed (exit ${code}). The entries were saved to now.config.json — run 'now-sdk dependencies' manually to download.`);
            }
            this.post({ type: 'addResult', ok: true, count: items.length, scope });
        });
    }

    private html(): string {
        const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Instance Context Scanner</title>
<style>${getSharedPanelStyles()}${PANEL_STYLES}</style>
</head>
<body>
${PANEL_HTML}
<script>${PANEL_SCRIPT}</script>
</body>
</html>`;
    }
}

function extractKeywords(text: string): string[] {
    const STOP_WORDS = new Set([
        'a','an','the','is','are','was','were','be','been','being','have','has','had',
        'do','does','did','will','would','could','should','may','might','shall','must',
        'i','we','you','they','it','this','that','these','those','my','your','our','their',
        'in','on','at','to','for','of','with','by','from','up','about','into','through','over',
        'and','or','but','not','no','so','then','if','when','where','how','what','why','who',
        'build','create','make','add','get','set','use','need','want','write','update','run',
        'new','existing','based','using','like','just','also','only','all','some','any','each',
        'can','already','after','before','during','while','since','there','here','its','our',
        'servicenow','instance','now','script','record','table','field','value','item','list',
        'form','page','view','type','data','user','system','service','process',
    ]);

    const tokens = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !STOP_WORDS.has(t));

    // Deduplicate preserving first-occurrence order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of tokens) {
        if (!seen.has(t)) { seen.add(t); unique.push(t); }
    }

    // Score: longer tokens first (more specific), bounded by position bonus
    const scored = unique.map((t, i) => ({ t, score: t.length * 2 - i * 0.1 }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 8).map(s => s.t);

    // Re-sort by original order
    top.sort((a, b) => unique.indexOf(a) - unique.indexOf(b));
    return top;
}

// ── Inline UI assets ────────────────────────────────────────────────────────

const PANEL_STYLES = `
body { padding: 18px clamp(16px, 4vw, 32px); max-width: 1200px; }
h1 { font-size: 20px; margin-bottom: 4px; color: var(--nd-fg-strong); }
.subtitle { color: var(--nd-fg-mute); margin-bottom: 18px; font-size: 12px; }

.toolbar {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-md); padding: 10px 12px; margin-bottom: 14px;
}
.toolbar label { font-size: 11px; font-weight: 600; color: var(--nd-fg-mute); margin-right: 4px; }
.toolbar select, .toolbar input[type=text] {
    background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 4px 8px; font-size: 12px; font-family: var(--nd-font);
}

button {
    background: var(--nd-bg-soft); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 5px 10px; font-size: 12px; cursor: pointer;
    font-family: var(--nd-font);
}
button:hover { background: var(--nd-border-soft); }
button.primary { background: var(--nd-accent-lo); color: #fff; border-color: var(--nd-accent-lo); }
button.primary:hover { background: var(--nd-accent); }
button:disabled { opacity: 0.45; cursor: not-allowed; }

.badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: var(--nd-r-pill); font-size: 11px; font-weight: 600;
}
.badge.ok { background: rgba(78,201,139,0.15); color: var(--nd-success); }
.badge.bad { background: rgba(241,76,76,0.15); color: var(--nd-danger); }
.badge.idle { background: var(--nd-bg-soft); color: var(--nd-fg-mute); }

.error-banner {
    background: rgba(241,76,76,0.1); border: 1px solid var(--nd-danger);
    color: var(--nd-danger); padding: 8px 12px; border-radius: var(--nd-r-sm);
    margin-bottom: 12px; font-size: 12px;
}
.hint { color: var(--nd-fg-mute); font-size: 11px; }
hr { border: none; border-top: 1px solid var(--nd-border-soft); margin: 12px 0; }

/* Steps */
.step { display: none; }
.step.active { display: block; }

/* Step nav */
.step-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.step-dot {
    width: 24px; height: 24px; border-radius: 50%; display: inline-flex;
    align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
    background: var(--nd-bg-soft); color: var(--nd-fg-mute); border: 1px solid var(--nd-border);
}
.step-dot.done { background: rgba(78,201,139,0.15); color: var(--nd-success); border-color: var(--nd-success); }
.step-dot.active { background: var(--nd-accent-lo); color: #fff; border-color: var(--nd-accent-lo); }
.step-label { font-size: 12px; font-weight: 600; color: var(--nd-fg-mute); }
.step-label.active { color: var(--nd-fg-strong); }
.step-sep { color: var(--nd-border); font-size: 14px; }

/* Textarea */
textarea {
    width: 100%; box-sizing: border-box;
    background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-md); padding: 10px 12px; font-size: 13px; font-family: var(--nd-font);
    resize: vertical; min-height: 110px; margin-bottom: 12px;
}
textarea:focus { outline: none; border-color: var(--nd-accent); }

/* Keywords */
.keyword-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
.kw-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: rgba(129,181,161,0.12); color: var(--nd-accent-hi);
    border: 1px solid rgba(129,181,161,0.3); border-radius: var(--nd-r-pill);
    padding: 2px 8px; font-size: 12px;
}
.kw-chip button {
    background: none; border: none; padding: 0 0 0 2px; cursor: pointer;
    color: var(--nd-fg-mute); font-size: 12px; line-height: 1;
}
.kw-chip button:hover { color: var(--nd-danger); }
.kw-add { background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-pill); padding: 2px 10px; font-size: 12px; font-family: var(--nd-font); width: 140px; }
.kw-add:focus { outline: none; border-color: var(--nd-accent); }

/* Checklist */
.check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; margin-bottom: 14px; }
.check-item {
    display: flex; align-items: center; gap: 8px;
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-md); padding: 8px 10px; cursor: pointer; font-size: 12px;
}
.check-item input[type=checkbox] { cursor: pointer; }
.check-item .sub { font-size: 10px; color: var(--nd-fg-mute); font-family: var(--nd-font-mono); }

/* Progress list */
.progress-list { margin-bottom: 16px; }
.progress-row {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 0; border-bottom: 1px solid var(--nd-border-soft); font-size: 12px;
}
.progress-row:last-child { border-bottom: none; }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--nd-border);
    border-top-color: var(--nd-accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.progress-bar-wrap { height: 4px; background: var(--nd-bg-soft); border-radius: 2px; margin-bottom: 14px; }
.progress-bar { height: 4px; background: var(--nd-accent); border-radius: 2px; transition: width 0.3s; }

/* Results */
.results-list {
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-md); max-height: 540px; overflow-y: auto;
}
.result-row { padding: 10px 12px; border-bottom: 1px solid var(--nd-border-soft); }
.result-row:last-child { border-bottom: none; }
.result-header { display: flex; align-items: flex-start; gap: 8px; }
.result-score-bar { width: 4px; border-radius: 2px; align-self: stretch; min-height: 36px; flex-shrink: 0; }
.result-check { flex-shrink: 0; margin-top: 2px; cursor: pointer; }
.result-meta { flex: 1; min-width: 0; }
.result-name { font-weight: 600; color: var(--nd-fg-strong); font-size: 13px; }
.result-desc { font-size: 11px; color: var(--nd-fg-mute); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-chips { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
.chip {
    display: inline-block; font-size: 10px; padding: 1px 7px; border-radius: var(--nd-r-pill);
    background: var(--nd-bg-soft); color: var(--nd-fg-mute); border: 1px solid var(--nd-border-soft);
}
.chip.table-chip { background: rgba(129,181,161,0.1); color: var(--nd-accent-hi); border-color: rgba(129,181,161,0.25); }
.preview-toggle { font-size: 11px; color: var(--nd-link); cursor: pointer; background: none; border: none; padding: 0; font-family: var(--nd-font); }
.preview-toggle:hover { color: var(--nd-link-hi); }
.preview-wrap { display: none; margin-top: 8px; }
.script-preview {
    background: var(--nd-bg-code); border: 1px solid var(--nd-border-soft); border-radius: var(--nd-r-sm);
    padding: 10px; font-family: var(--nd-font-mono); font-size: 11px; color: var(--nd-fg);
    white-space: pre-wrap; word-break: break-all; max-height: 260px; overflow-y: auto;
}
/* Feature 8: script dependency badges */
.script-deps {
    border-top: 1px solid var(--nd-border-soft); padding: 6px 8px; margin-top: 0;
    background: var(--nd-bg-soft);
}
.deps-label {
    font-size: 10px; font-weight: 700; color: var(--nd-fg-mute); text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 5px;
}
.deps-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.dep-chip {
    display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px;
    border-radius: var(--nd-r-pill); font-size: 11px; font-family: var(--nd-font-mono);
    border: 1px solid var(--nd-border-soft);
}
.dep-chip.dep-available { background: rgba(78,201,139,0.1); border-color: rgba(78,201,139,0.3); }
.dep-chip.dep-missing   { background: rgba(232,148,78,0.12); border-color: rgba(232,148,78,0.35); }
.dep-status-dot { font-size: 9px; }
.dep-available .dep-status-dot { color: var(--nd-success); }
.dep-missing .dep-status-dot   { color: var(--nd-warning); }
/* Feature 4: callers section */
.find-callers-btn {
    background: none; border: none; font-size: 10px; color: var(--nd-link);
    cursor: pointer; padding: 0 3px; font-family: var(--nd-font);
}
.find-callers-btn:hover { color: var(--nd-link-hi); text-decoration: underline; }
.callers-section {
    display: none; border-top: 1px solid var(--nd-border-soft); padding: 7px 8px;
    background: var(--nd-bg-soft);
}
.callers-header { font-size: 11px; font-weight: 600; color: var(--nd-fg-mute); margin-bottom: 5px; }
.caller-row {
    display: flex; align-items: center; gap: 6px; padding: 3px 0;
    border-bottom: 1px solid var(--nd-border-soft); font-size: 11px;
}
.caller-row:last-child { border-bottom: none; }
.caller-name { color: var(--nd-fg); font-weight: 500; }
.actions-bar {
    display: flex; gap: 8px; align-items: center; padding: 10px 0; flex-wrap: wrap;
}
.empty { padding: 24px; text-align: center; color: var(--nd-fg-mute); font-size: 12px; }
.scope-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; }
.scope-row label { color: var(--nd-fg-mute); font-weight: 600; }
.scope-row select {
    background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 4px 8px; font-size: 12px; font-family: var(--nd-font);
}
.limit-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 12px; }
.limit-row label { color: var(--nd-fg-mute); font-weight: 600; }
.limit-row select {
    background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 4px 8px; font-size: 12px; font-family: var(--nd-font);
}
.section-label { font-size: 11px; font-weight: 700; color: var(--nd-fg-mute); text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 8px; }
`;

const PANEL_HTML = `
<h1>Instance Context Scanner</h1>
<div class="subtitle">Describe your task, extract keywords, and scan the instance for relevant scripts and knowledge articles.</div>

<div id="errorBanner" class="error-banner" style="display:none;"></div>

<div class="step-nav">
    <span class="step-dot active" id="dot1">1</span>
    <span class="step-label active" id="lbl1">Describe</span>
    <span class="step-sep">›</span>
    <span class="step-dot" id="dot2">2</span>
    <span class="step-label" id="lbl2">Configure</span>
    <span class="step-sep">›</span>
    <span class="step-dot" id="dot3">3</span>
    <span class="step-label" id="lbl3">Results</span>
</div>

<!-- Step 1: Describe -->
<div id="step-describe" class="step active">
    <div class="toolbar">
        <label for="aliasSelect">Auth alias</label>
        <select id="aliasSelect"></select>
        <span id="hostHint" class="hint"></span>
        <button id="connectBtn" class="primary">Connect</button>
        <button id="forgetBtn" title="Forget stored credentials">Forget</button>
        <span id="connBadge" class="badge idle">Not connected</span>
    </div>
    <div class="section-label">Describe your task</div>
    <textarea id="taskInput" placeholder="Describe the task or feature you're building — e.g. 'approval workflow for change requests that notifies the change manager when a ticket enters pending approval state'…"></textarea>
    <div class="actions-bar">
        <button id="nextBtn" class="primary" disabled>Next: Configure Scan ›</button>
        <span class="hint" id="nextHint">Connect to an instance and enter a task description to continue.</span>
    </div>
</div>

<!-- Step 2: Configure -->
<div id="step-configure" class="step">
    <div class="section-label">Keywords</div>
    <div class="keyword-row" id="keywordRow">
        <input type="text" class="kw-add" id="kwAddInput" placeholder="Add keyword…">
    </div>

    <div class="section-label" style="margin-top:14px;">Artifact types to scan</div>
    <div class="check-grid" id="tableChecklist"></div>

    <div class="scope-row">
        <label for="scopeSelect">Scope</label>
        <select id="scopeSelect"><option value="*">All Scopes</option></select>
    </div>
    <div class="limit-row">
        <label for="limitSelect">Results per type</label>
        <select id="limitSelect">
            <option value="10">10</option>
            <option value="30" selected>30</option>
            <option value="50">50</option>
            <option value="100">100</option>
        </select>
    </div>
    <div class="actions-bar">
        <button id="backToDescribeBtn">‹ Back</button>
        <button id="runScanBtn" class="primary" disabled>Run Scan ›</button>
        <span class="hint" id="scanHint">Add at least one keyword to scan.</span>
    </div>
</div>

<!-- Scanning screen -->
<div id="step-scanning" class="step">
    <div class="section-label">Scanning instance…</div>
    <div class="progress-bar-wrap"><div class="progress-bar" id="progressBar" style="width:0%"></div></div>
    <div class="progress-list" id="progressList"></div>
    <div class="actions-bar">
        <button id="cancelScanBtn">Cancel</button>
    </div>
</div>

<!-- Step 3: Results -->
<div id="step-results" class="step">
    <div class="actions-bar" style="margin-bottom:10px;">
        <button id="backToConfigureBtn">‹ Back to Configure</button>
        <button id="newScanBtn">New Scan</button>
        <span class="hint" id="resultSummary"></span>
    </div>
    <div class="scope-row">
        <label for="addScopeSelect">Add to scope</label>
        <select id="addScopeSelect"></select>
    </div>
    <div id="resultsList" class="results-list"><div class="empty">No results yet.</div></div>
    <div class="actions-bar" style="margin-top:10px;">
        <button id="addSelectedBtn" class="primary" disabled>Add Selected as Dependencies</button>
        <span class="hint" id="selCount">No items selected.</span>
    </div>
</div>
`;

const PANEL_SCRIPT = `
(function () {
    const vscode = acquireVsCodeApi();
    const $ = (id) => document.getElementById(id);

    const state = {
        aliases: [],
        scopes: [],
        keywords: [],
        tables: [],
        results: [],
        selected: new Map(),
        connected: false,
        progressMap: {},
        totalTables: 0,
        doneCount: 0,
        callersMap: {}, // depName -> preview idx (for routing callersResult back)
    };

    function post(msg) { vscode.postMessage(msg); }

    function showError(msg) {
        const el = $('errorBanner');
        if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
        el.style.display = 'block'; el.textContent = msg;
    }

    // ── Step navigation ──────────────────────────────────────────────────────
    function goStep(name) {
        ['step-describe','step-configure','step-scanning','step-results'].forEach(id => {
            const el = $(id);
            if (el) el.classList.toggle('active', id === name);
        });
        const stepNum = { 'step-describe': 1, 'step-configure': 2, 'step-scanning': 2, 'step-results': 3 }[name] || 1;
        [1,2,3].forEach(n => {
            $('dot' + n).className = 'step-dot' + (n < stepNum ? ' done' : n === stepNum ? ' active' : '');
            $('lbl' + n).className = 'step-label' + (n === stepNum ? ' active' : '');
        });
        showError('');
    }

    // ── Connection ──────────────────────────────────────────────────────────
    function setConnection(ok, err) {
        state.connected = ok;
        const el = $('connBadge');
        if (ok) { el.className = 'badge ok'; el.textContent = '✓ Connected'; }
        else if (err) { el.className = 'badge bad'; el.textContent = err; }
        else { el.className = 'badge idle'; el.textContent = 'Not connected'; }
        updateNextBtn();
    }

    function updateNextBtn() {
        const task = $('taskInput').value.trim();
        const ok = state.connected && task.length >= 20;
        $('nextBtn').disabled = !ok;
        $('nextHint').textContent = !state.connected ? 'Connect to an instance to continue.' :
            task.length < 20 ? 'Enter a longer task description to continue.' : '';
    }

    $('aliasSelect').addEventListener('change', (e) => {
        post({ type: 'selectAlias', alias: e.target.value });
        const a = state.aliases.find(x => x.alias === e.target.value);
        $('hostHint').textContent = a ? a.host : '';
        setConnection(false, '');
    });
    $('connectBtn').addEventListener('click', () => post({ type: 'connect' }));
    $('forgetBtn').addEventListener('click', () => post({ type: 'forgetCredentials' }));
    $('taskInput').addEventListener('input', updateNextBtn);

    $('nextBtn').addEventListener('click', () => {
        const task = $('taskInput').value.trim();
        post({ type: 'nextToConfigure', task });
    });

    // ── Step 2: Configure ───────────────────────────────────────────────────
    function renderChecklist() {
        const grid = $('tableChecklist');
        grid.innerHTML = state.tables.map(t =>
            '<label class="check-item">' +
            '<input type="checkbox" data-key="' + esc(t.key) + '" checked>' +
            '<div><div>' + esc(t.label) + '</div></div>' +
            '</label>'
        ).join('');
    }

    function renderKeywords() {
        const row = $('keywordRow');
        const addInput = $('kwAddInput');
        // Remove existing chips but keep the add input
        row.innerHTML = '';
        state.keywords.forEach((kw, i) => {
            const chip = document.createElement('span');
            chip.className = 'kw-chip';
            chip.innerHTML = esc(kw) + '<button data-idx="' + i + '" title="Remove">×</button>';
            chip.querySelector('button').addEventListener('click', (e) => {
                state.keywords.splice(parseInt(e.target.dataset.idx), 1);
                renderKeywords();
                updateRunScanBtn();
            });
            row.appendChild(chip);
        });
        row.appendChild(addInput);
        updateRunScanBtn();
    }

    function updateRunScanBtn() {
        const hasKw = state.keywords.length > 0;
        $('runScanBtn').disabled = !hasKw;
        $('scanHint').textContent = hasKw ? '' : 'Add at least one keyword to scan.';
    }

    $('kwAddInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = e.target.value.trim().replace(/,/g, '');
            if (val && !state.keywords.includes(val)) { state.keywords.push(val); renderKeywords(); }
            e.target.value = '';
        }
    });

    $('backToDescribeBtn').addEventListener('click', () => goStep('step-describe'));

    $('runScanBtn').addEventListener('click', () => {
        const tableKeys = Array.from($('tableChecklist').querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked).map(cb => cb.dataset.key);
        if (!tableKeys.length) { showError('Select at least one artifact type.'); return; }
        const scope = $('scopeSelect').value;
        const limit = parseInt($('limitSelect').value, 10);
        state.progressMap = {};
        state.totalTables = tableKeys.length;
        state.doneCount = 0;
        state.results = [];
        state.selected.clear();
        $('progressList').innerHTML = '';
        $('progressBar').style.width = '0%';
        goStep('step-scanning');
        post({ type: 'runScan', tables: tableKeys, keywords: state.keywords, scope, limit });
    });

    $('cancelScanBtn').addEventListener('click', () => {
        post({ type: 'cancelScan' });
        goStep('step-configure');
    });

    // ── Step 3: Results ─────────────────────────────────────────────────────
    $('backToConfigureBtn').addEventListener('click', () => goStep('step-configure'));
    $('newScanBtn').addEventListener('click', () => { state.results = []; state.selected.clear(); goStep('step-describe'); });

    $('addSelectedBtn').addEventListener('click', () => {
        const items = Array.from(state.selected.values());
        if (!items.length) { return; }
        const scope = $('addScopeSelect').value || 'global';
        post({ type: 'addSelected', scope, items });
        state.selected.clear();
        renderResults();
    });

    function scoreColor(score) {
        if (score >= 70) { return 'var(--nd-success)'; }
        if (score >= 40) { return 'var(--nd-warning)'; }
        return 'var(--nd-danger)';
    }

    function renderResults() {
        const list = $('resultsList');
        if (!state.results.length) {
            list.innerHTML = '<div class="empty">No matching artifacts found. Try broader keywords or more artifact types.</div>';
            $('addSelectedBtn').disabled = true;
            $('selCount').textContent = 'No items selected.';
            return;
        }
        list.innerHTML = state.results.map((r, idx) => {
            const key = r.tableKey + ':' + r.sys_id;
            const checked = state.selected.has(key) ? 'checked' : '';
            const color = scoreColor(r.score);
            return '<div class="result-row" id="row-' + idx + '">' +
                '<div class="result-header">' +
                    '<div class="result-score-bar" style="background:' + color + ';"></div>' +
                    '<input type="checkbox" class="result-check" data-key="' + esc(key) + '" data-idx="' + idx + '" ' + checked + '>' +
                    '<div class="result-meta">' +
                        '<div class="result-name">' + esc(r.name || r.sys_id) + '</div>' +
                        (r.description ? '<div class="result-desc">' + esc(r.description) + '</div>' : '') +
                        '<div class="result-chips">' +
                            '<span class="chip table-chip">' + esc(r.tableLabel) + '</span>' +
                            (r.scope ? '<span class="chip">' + esc(r.scope) + '</span>' : '') +
                            '<span class="chip">' + r.score + '% match</span>' +
                            (r.hasScript ? '<button class="preview-toggle" data-idx="' + idx + '" data-sysid="' + esc(r.sys_id) + '" data-table="' + esc(r.table) + '">Preview script</button>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="preview-wrap" id="pwrap-' + idx + '">' +
                    '<pre class="script-preview" id="preview-' + idx + '"></pre>' +
                    '<div class="script-deps" id="deps-' + idx + '" style="display:none;"></div>' +
                    '<div class="callers-section" id="callers-' + idx + '">' +
                        '<div class="callers-header" id="callers-hdr-' + idx + '">Callers on instance:</div>' +
                        '<div id="callers-list-' + idx + '"></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        list.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = parseInt(cb.dataset.idx, 10);
                const r = state.results[idx];
                if (cb.checked) {
                    state.selected.set(cb.dataset.key, { tableKey: r.tableKey, sysId: r.sys_id });
                } else {
                    state.selected.delete(cb.dataset.key);
                }
                $('addSelectedBtn').disabled = state.selected.size === 0;
                $('selCount').textContent = state.selected.size === 0 ? 'No items selected.' : state.selected.size + ' item(s) selected.';
            });
        });

        list.querySelectorAll('.preview-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.dataset.idx;
                const pwrapEl = $('pwrap-' + idx);
                const preEl = $('preview-' + idx);
                if (pwrapEl.style.display === 'block') {
                    pwrapEl.style.display = 'none';
                    btn.textContent = 'Preview script';
                    return;
                }
                if (preEl.textContent) {
                    pwrapEl.style.display = 'block';
                    btn.textContent = 'Hide script';
                    return;
                }
                btn.textContent = 'Loading…';
                post({ type: 'previewScript', sys_id: btn.dataset.sysid, table: btn.dataset.table });
            });
        });

        $('addSelectedBtn').disabled = state.selected.size === 0;
        $('selCount').textContent = state.selected.size === 0 ? 'No items selected.' : state.selected.size + ' item(s) selected.';
    }

    function esc(s) {
        return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Message handler ─────────────────────────────────────────────────────
    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
            case 'init': {
                state.aliases = msg.aliases;
                state.tables = msg.tables;
                $('aliasSelect').innerHTML = msg.aliases.map(a =>
                    '<option value="' + esc(a.alias) + '"' + (a.alias === msg.currentAlias ? ' selected' : '') + '>' +
                    esc(a.alias) + (a.isDefault ? ' (default)' : '') + '</option>'
                ).join('') || '<option>No aliases — add one in Setup</option>';
                const a = msg.aliases.find(x => x.alias === msg.currentAlias);
                $('hostHint').textContent = a ? a.host : '';
                renderChecklist();
                break;
            }
            case 'connectionStatus':
                setConnection(msg.connected, msg.error);
                break;
            case 'scopes': {
                state.scopes = msg.scopes;
                const opts = '<option value="*">All Scopes</option>' +
                    msg.scopes.map(s => '<option value="' + esc(s.scope) + '">' + esc(s.scope) + '</option>').join('');
                $('scopeSelect').innerHTML = opts;
                $('addScopeSelect').innerHTML = msg.scopes.map(s =>
                    '<option value="' + esc(s.scope) + '"' + (s.scope === 'global' ? ' selected' : '') + '>' + esc(s.scope) + '</option>'
                ).join('') || '<option value="global">global</option>';
                break;
            }
            case 'keywords': {
                state.keywords = msg.keywords;
                renderKeywords();
                goStep('step-configure');
                break;
            }
            case 'scanProgress': {
                const p = msg;
                state.progressMap[p.table] = p;
                if (p.status === 'done' || p.status === 'error') { state.doneCount++; }
                // Update or create row
                let row = $('prog-' + p.table);
                if (!row) {
                    row = document.createElement('div');
                    row.className = 'progress-row';
                    row.id = 'prog-' + p.table;
                    $('progressList').appendChild(row);
                }
                const icon = p.status === 'running' ? '<span class="spinner"></span>' :
                    p.status === 'done' ? '✓' : '✗';
                const countTxt = p.status === 'done' ? ' — ' + (p.count || 0) + ' match(es)' :
                    p.status === 'error' ? ' — ' + esc(p.error || 'error') : '';
                row.innerHTML = '<span>' + icon + '</span><span>' + esc(p.tableLabel) + countTxt + '</span>';
                const pct = Math.round((state.doneCount / Math.max(state.totalTables, 1)) * 100);
                $('progressBar').style.width = pct + '%';
                break;
            }
            case 'scanResults': {
                state.results = msg.results;
                $('resultSummary').textContent = msg.totalHits + ' result(s) found across all types.';
                renderResults();
                goStep('step-results');
                break;
            }
            case 'scriptPreview': {
                // Find the result by sys_id and show the preview
                const idx = state.results.findIndex(r => r.sys_id === msg.sys_id);
                if (idx < 0) { break; }
                const pwrapEl = $('pwrap-' + idx);
                const preEl   = $('preview-' + idx);
                const depsEl  = $('deps-' + idx);
                const btn = document.querySelector('.preview-toggle[data-idx="' + idx + '"]');
                if (preEl) {
                    // Strip HTML tags for knowledge articles
                    const cleaned = msg.script.replace(/<[^>]+>/g, '');
                    preEl.textContent = cleaned || '(empty)';
                    if (pwrapEl) { pwrapEl.style.display = 'block'; }
                    if (btn) { btn.textContent = 'Hide script'; }
                }
                // Feature 8: render detected script dependencies (any caller type)
                if (depsEl && msg.scriptDeps && msg.scriptDeps.length > 0) {
                    depsEl.style.display = 'block';
                    depsEl.innerHTML =
                        '<div class="deps-label">Dependencies detected in this script (' + msg.scriptDeps.length + '):</div>' +
                        '<div class="deps-chips">' +
                        msg.scriptDeps.map(d =>
                            '<span class="dep-chip dep-' + d.status + '">' +
                            '<span class="dep-status-dot">' + (d.status === 'available' ? '●' : '●') + '</span>' +
                            esc(d.name) +
                            // Feature 4: "Find callers" button on each dep
                            '<button class="find-callers-btn" data-name="' + esc(d.name) + '" data-idx="' + idx + '">' +
                            'callers ↗</button>' +
                            '</span>'
                        ).join('') +
                        '</div>';
                    // Bind find-callers buttons
                    depsEl.querySelectorAll('.find-callers-btn').forEach(fcBtn => {
                        fcBtn.addEventListener('click', () => {
                            const depName = fcBtn.dataset.name;
                            const i = parseInt(fcBtn.dataset.idx, 10);
                            const callersEl = $('callers-' + i);
                            const callersHdrEl = $('callers-hdr-' + i);
                            const callersListEl = $('callers-list-' + i);
                            if (callersEl) { callersEl.style.display = 'block'; }
                            if (callersHdrEl) {
                                callersHdrEl.innerHTML = 'Scripts calling <code>' + esc(depName) + '</code> on instance:';
                            }
                            if (callersListEl) {
                                callersListEl.innerHTML = '<span class="hint">Searching across Business Rules, Client Scripts, UI Actions…</span>';
                            }
                            state.callersMap[depName] = i;
                            post({ type: 'findCallers', name: depName });
                        });
                    });
                }
                break;
            }
            case 'callersResult': {
                const idx = state.callersMap[msg.name];
                if (idx === undefined) { break; }
                const callersListEl = $('callers-list-' + idx);
                if (!callersListEl) { break; }
                if (!msg.callers || msg.callers.length === 0) {
                    callersListEl.innerHTML = '<span class="hint">No callers found on instance for "' + esc(msg.name) + '".</span>';
                } else {
                    callersListEl.innerHTML = msg.callers.map(c =>
                        '<div class="caller-row">' +
                        '<span class="chip table-chip">' + esc(c.tableLabel) + '</span>' +
                        '<span class="caller-name">' + esc(c.name) + '</span>' +
                        '</div>'
                    ).join('');
                }
                break;
            }
            case 'addResult': {
                if (msg.ok) {
                    showError('');
                    $('selCount').textContent = msg.count + ' item(s) added to now.config.json.';
                } else {
                    showError('Add failed: ' + (msg.error || 'unknown error'));
                }
                break;
            }
            case 'error':
                showError(msg.message);
                break;
        }
    });
})();
`;
