import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { getShell } from './shellConfig';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { InstanceClient } from './InstanceClient';
import {
    NowConfigPackage,
    findNowConfigs,
    pickNowConfig,
    getDependencies,
    addDependencies,
    removeDependency,
    reloadConfig,
} from './NowConfigManager';

/**
 * Dependency Picker — dedicated webview panel that lets users browse a
 * ServiceNow instance, select records by table, and persist them directly to
 * `now.config.json` (the SDK CLI has no `--add` flag; the documented workflow
 * is to edit the JSON file then run `now-sdk dependencies` to download). Also
 * has no `--remove` flag).
 */

interface CategoryDef {
    /** Table the SDK CLI expects (e.g. `tables`, `roles`, `sys_security_acl`). */
    sdkKey: string;
    /** Underlying instance table to query for the picker. */
    table: string;
    /** Display label. */
    label: string;
    /** Fields to fetch. */
    fields: string[];
    /** Field used as primary display name (falls back to sys_id). */
    nameField: string;
    /** Optional secondary label field. */
    labelField?: string;
    /** Encoded query fragment to filter for relevant records. */
    baseQuery?: string;
}

const CATEGORIES: Record<string, CategoryDef> = {
    tables: {
        sdkKey: 'tables',
        table: 'sys_db_object',
        label: 'Tables',
        fields: ['sys_id', 'name', 'label', 'sys_scope'],
        nameField: 'name',
        labelField: 'label',
    },
    roles: {
        sdkKey: 'roles',
        table: 'sys_user_role',
        label: 'Roles',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    acls: {
        sdkKey: 'sys_security_acl',
        table: 'sys_security_acl',
        label: 'ACLs',
        fields: ['sys_id', 'name', 'operation', 'type', 'sys_scope'],
        nameField: 'name',
        labelField: 'operation',
    },
    ui_views: {
        sdkKey: 'sys_ui_view',
        table: 'sys_ui_view',
        label: 'UI Views',
        fields: ['sys_id', 'name', 'title', 'sys_scope'],
        nameField: 'name',
        labelField: 'title',
    },
    choices: {
        sdkKey: 'sys_choice',
        table: 'sys_choice',
        label: 'Choices',
        fields: ['sys_id', 'name', 'element', 'label', 'value', 'sys_scope'],
        nameField: 'name',
        labelField: 'label',
    },
    groups: {
        sdkKey: 'sys_user_group',
        table: 'sys_user_group',
        label: 'User Groups',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    catalog_items: {
        sdkKey: 'sc_cat_item',
        table: 'sc_cat_item',
        label: 'Catalog Items',
        fields: ['sys_id', 'name', 'short_description', 'sys_scope'],
        nameField: 'name',
        labelField: 'short_description',
    },
    catalog_categories: {
        sdkKey: 'sc_category',
        table: 'sc_category',
        label: 'Catalog Categories',
        fields: ['sys_id', 'title', 'description', 'sys_scope'],
        nameField: 'title',
        labelField: 'description',
    },
    catalogs: {
        sdkKey: 'sc_catalog',
        table: 'sc_catalog',
        label: 'Catalogs',
        fields: ['sys_id', 'title', 'description', 'sys_scope'],
        nameField: 'title',
        labelField: 'description',
    },
    knowledge: {
        sdkKey: 'kb_knowledge',
        table: 'kb_knowledge',
        label: 'Knowledge Articles',
        fields: ['sys_id', 'number', 'short_description', 'sys_scope'],
        nameField: 'number',
        labelField: 'short_description',
    },
    knowledge_bases: {
        sdkKey: 'kb_knowledge_base',
        table: 'kb_knowledge_base',
        label: 'Knowledge Bases',
        fields: ['sys_id', 'title', 'description', 'sys_scope'],
        nameField: 'title',
        labelField: 'description',
    },
    business_rules: {
        sdkKey: 'sys_script',
        table: 'sys_script',
        label: 'Business Rules',
        fields: ['sys_id', 'name', 'collection', 'when', 'sys_scope'],
        nameField: 'name',
        labelField: 'collection',
    },
    script_includes: {
        sdkKey: 'sys_script_include',
        table: 'sys_script_include',
        label: 'Script Includes',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    client_scripts: {
        sdkKey: 'sys_script_client',
        table: 'sys_script_client',
        label: 'Client Scripts',
        fields: ['sys_id', 'name', 'table', 'type', 'sys_scope'],
        nameField: 'name',
        labelField: 'table',
    },
    ui_policies: {
        sdkKey: 'sys_ui_policy',
        table: 'sys_ui_policy',
        label: 'UI Policies',
        fields: ['sys_id', 'short_description', 'table', 'sys_scope'],
        nameField: 'short_description',
        labelField: 'table',
    },
    ui_actions: {
        sdkKey: 'sys_ui_action',
        table: 'sys_ui_action',
        label: 'UI Actions',
        fields: ['sys_id', 'name', 'table', 'sys_scope'],
        nameField: 'name',
        labelField: 'table',
    },
    ui_pages: {
        sdkKey: 'sys_ui_page',
        table: 'sys_ui_page',
        label: 'UI Pages',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    properties: {
        sdkKey: 'sys_properties',
        table: 'sys_properties',
        label: 'System Properties',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    dictionary: {
        sdkKey: 'sys_dictionary',
        table: 'sys_dictionary',
        label: 'Dictionary Entries',
        fields: ['sys_id', 'name', 'element', 'column_label', 'sys_scope'],
        nameField: 'element',
        labelField: 'column_label',
    },
    notifications: {
        sdkKey: 'sysevent_email_action',
        table: 'sysevent_email_action',
        label: 'Email Notifications',
        fields: ['sys_id', 'name', 'collection', 'sys_scope'],
        nameField: 'name',
        labelField: 'collection',
    },
    scheduled_jobs: {
        sdkKey: 'sysauto_script',
        table: 'sysauto_script',
        label: 'Scheduled Jobs',
        fields: ['sys_id', 'name', 'run_type', 'sys_scope'],
        nameField: 'name',
        labelField: 'run_type',
    },
    workflows: {
        sdkKey: 'wf_workflow',
        table: 'wf_workflow',
        label: 'Workflows',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    flows: {
        sdkKey: 'sys_hub_flow',
        table: 'sys_hub_flow',
        label: 'Flows',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    rest_messages: {
        sdkKey: 'sys_rest_message',
        table: 'sys_rest_message',
        label: 'REST Messages',
        fields: ['sys_id', 'name', 'description', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
    update_sets: {
        sdkKey: 'sys_update_set',
        table: 'sys_update_set',
        label: 'Update Sets',
        fields: ['sys_id', 'name', 'description', 'state', 'sys_scope'],
        nameField: 'name',
        labelField: 'description',
    },
};

let _panel: vscode.WebviewPanel | undefined;

export function showDependencyPickerPanel(context: vscode.ExtensionContext): void {
    if (_panel) { _panel.reveal(undefined, false); return; }

    const panel = vscode.window.createWebviewPanel(
        'nowdev.dependencyPicker',
        'Instance Dependencies',
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
    const controller = new PanelController(panel, client, context);
    void controller.init();
}

class PanelController {
    private currentAlias: string | undefined;
    private currentPackage: NowConfigPackage | undefined;
    private connected = false;
    private nowConfigWatcher: vscode.FileSystemWatcher | undefined;

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

        const watcher = vscode.workspace.createFileSystemWatcher('**/now.config.json');
        watcher.onDidChange(() => this.sendCurrentDeps());
        watcher.onDidCreate(() => this.sendCurrentDeps());
        watcher.onDidDelete(() => this.sendCurrentDeps());
        this.nowConfigWatcher = watcher;
        panel.onDidDispose(() => watcher.dispose());
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
            packages: configs.map(c => ({ path: c.configPath, name: c.config.name ?? path.basename(c.packageDir), scope: c.config.scope ?? '' })),
            currentPackage: this.currentPackage?.configPath,
            categories: Object.entries(CATEGORIES).map(([key, def]) => ({ key, label: def.label })),
        });
        this.sendCurrentDeps();
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
            case 'selectPackage': {
                const all = findNowConfigs();
                this.currentPackage = all.find(p => p.configPath === msg.path) ?? all[0];
                this.sendCurrentDeps();
                return;
            }
            case 'connect': {
                if (!this.currentAlias) { return; }
                const result = await this.client.testConnection(this.currentAlias);
                this.connected = result.ok;
                this.post({
                    type: 'connectionStatus',
                    connected: result.ok,
                    error: result.error,
                });
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
            case 'search': {
                if (!this.currentAlias) { return; }
                await this.runSearch(msg.category, msg.scope, msg.term, msg.offset ?? 0);
                return;
            }
            case 'addSelected': {
                await this.addSelected(msg.scope, msg.items);
                return;
            }
            case 'addWildcard': {
                await this.addWildcard(msg.scope, msg.table);
                return;
            }
            case 'removeDependency': {
                if (!this.currentPackage) { return; }
                removeDependency(this.currentPackage, msg.scope, msg.table, msg.sysId);
                this.currentPackage = reloadConfig(this.currentPackage);
                this.sendCurrentDeps();
                return;
            }
            case 'runDependenciesCmd': {
                vscode.commands.executeCommand('nowdev-ai-toolbox.sdkDependencies', { auth: this.currentAlias });
                return;
            }
            case 'refreshCurrent':
                this.sendCurrentDeps();
                return;
            case 'openConfigFile': {
                if (!this.currentPackage) { return; }
                const doc = await vscode.workspace.openTextDocument(this.currentPackage.configPath);
                await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
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
            // Always offer "global" as the first option even if not present.
            if (!seen.has('global')) {
                scopes.unshift({ sys_id: '', name: 'Global', scope: 'global' });
            } else {
                // Move global to the top.
                const idx = scopes.findIndex(s => s.scope === 'global');
                if (idx > 0) { const [g] = scopes.splice(idx, 1); scopes.unshift(g); }
            }
            this.post({ type: 'scopes', scopes });
        } catch (err: any) {
            this.post({ type: 'error', message: `Failed to load scopes: ${err.message ?? err}` });
        }
    }

    private async runSearch(categoryKey: string, scope: string, term: string, offset: number): Promise<void> {
        if (!this.currentAlias) { return; }
        const def = CATEGORIES[categoryKey];
        if (!def) { return; }

        const filters: string[] = [];
        if (term?.trim()) {
            // ServiceNow's encoded query parser does NOT support parentheses,
            // so we OR fragments at the top level. Strip ^ from user input.
            const safe = term.trim().replace(/\^/g, '');
            const fragments = [`${def.nameField}LIKE${safe}`];
            if (def.labelField) { fragments.push(`${def.labelField}LIKE${safe}`); }
            filters.push(fragments.join('^OR'));
        }
        if (scope && scope !== '*') {
            filters.push(`sys_scope.scope=${scope}`);
        }
        if (def.baseQuery) { filters.push(def.baseQuery); }

        try {
            const res = await this.client.query(this.currentAlias, def.table, {
                query: filters.join('^'),
                fields: def.fields,
                limit: 50,
                offset,
                displayValue: 'all',
            });
            this.post({
                type: 'searchResults',
                category: categoryKey,
                scope,
                term,
                offset,
                items: res.result.map((r: any) => normalizeRecord(r, def)),
            });
        } catch (err: any) {
            this.post({ type: 'error', message: `Search failed: ${err.message ?? err}` });
        }
    }

    private async addSelected(scope: string, items: { category: string; sysId: string }[]): Promise<void> {
        if (!this.currentPackage) {
            vscode.window.showErrorMessage('No now.config.json package selected.');
            return;
        }
        // Group by SDK table key.
        const buckets = new Map<string, string[]>();
        for (const item of items) {
            const def = CATEGORIES[item.category];
            if (!def) { continue; }
            const arr = buckets.get(def.sdkKey) ?? [];
            if (!arr.includes(item.sysId)) { arr.push(item.sysId); }
            buckets.set(def.sdkKey, arr);
        }
        for (const [sdkKey, sysIds] of buckets) {
            await this.runDependenciesAdd(scope, sdkKey, sysIds);
        }
        // Reload after writes.
        if (this.currentPackage) { this.currentPackage = reloadConfig(this.currentPackage); }
        this.sendCurrentDeps();
    }

    private async addWildcard(scope: string, sdkKey: string): Promise<void> {
        await this.runDependenciesAdd(scope, sdkKey, ['*']);
        if (this.currentPackage) { this.currentPackage = reloadConfig(this.currentPackage); }
        this.sendCurrentDeps();
    }

    private runDependenciesAdd(scope: string, sdkKey: string, ids: string[]): Promise<void> {
        return new Promise((resolve) => {
            if (!this.currentPackage) { resolve(); return; }
            // Step 1: write the entries directly into now.config.json.
            // The SDK CLI has no `--add` flag; the documented workflow is to
            // edit the file manually and then run `now-sdk dependencies` to
            // download the TypeScript definitions.
            try {
                addDependencies(this.currentPackage, scope, sdkKey, ids);
                this.currentPackage = reloadConfig(this.currentPackage);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`Failed to update now.config.json: ${msg}`);
                resolve();
                return;
            }

            // Step 2: run `now-sdk dependencies` so the SDK downloads the
            // TypeScript definitions for the newly-added entries.
            const cwd = path.dirname(this.currentPackage.configPath);
            const args = ['dependencies'];
            if (this.currentAlias) { args.push('--auth', this.currentAlias); }
            const label = ids.length === 1 && ids[0] === '*' ? 'wildcard' : `${ids.length} item(s)`;
            const chan = vscode.window.createOutputChannel('NowDev: SDK Dependencies');
            chan.show(true);
            chan.appendLine(`✓ Updated now.config.json — added ${label} to ${sdkKey} (scope: ${scope}).`);
            chan.appendLine(`\n> now-sdk ${args.join(' ')}\n`);
            const proc = cp.spawn('now-sdk', args, { cwd, shell: getShell() });
            proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.on('close', (code) => {
                if (code === 0) {
                    chan.appendLine(`\n✓ Dependencies downloaded successfully.`);
                    this.post({ type: 'addResult', ok: true, sdkKey, count: ids.length, scope });
                } else {
                    chan.appendLine(`\n✗ now-sdk dependencies failed (exit ${code}). The entries were saved to now.config.json — run 'now-sdk dependencies' manually to download.`);
                    // Still report success for the JSON write; only the download step failed.
                    this.post({ type: 'addResult', ok: true, sdkKey, count: ids.length, scope });
                }
                resolve();
            });
        });
    }

    private sendCurrentDeps(): void {
        // Re-read in case the file changed externally.
        if (this.currentPackage) {
            try { this.currentPackage = reloadConfig(this.currentPackage); }
            catch { /* keep previous */ }
        }
        const entries = this.currentPackage ? getDependencies(this.currentPackage.config) : [];
        this.post({ type: 'currentDependencies', entries });
    }

    private html(): string {
        const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Instance Dependencies</title>
<style>${getSharedPanelStyles()}${PANEL_STYLES}</style>
</head>
<body>
${PANEL_HTML}
<script>${PANEL_SCRIPT}</script>
</body>
</html>`;
    }
}

function normalizeRecord(r: any, def: CategoryDef): any {
    // Display values mode returns { display_value, value } per field.
    const get = (field: string) => {
        const v = r[field];
        if (v && typeof v === 'object' && 'display_value' in v) {
            return { display: String(v.display_value ?? ''), value: String(v.value ?? '') };
        }
        return { display: String(v ?? ''), value: String(v ?? '') };
    };
    const sysId = get('sys_id').value || get('sys_id').display;
    const name = def.nameField ? get(def.nameField).display : '';
    const label = def.labelField ? get(def.labelField).display : '';
    const scopeField = get('sys_scope');
    return { sys_id: sysId, name, label, scope: scopeField.display, scopeValue: scopeField.value };
}

// ── Inline UI assets ────────────────────────────────────────────────────────

const PANEL_STYLES = `
body { padding: 18px clamp(16px, 4vw, 32px); max-width: 1400px; }
h1 { font-size: 20px; margin-bottom: 4px; color: var(--nd-fg-strong); }
.subtitle { color: var(--nd-fg-mute); margin-bottom: 18px; font-size: 12px; }
.toolbar {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-md); padding: 10px 12px; margin-bottom: 14px;
}
.toolbar label { font-size: 11px; font-weight: 600; color: var(--nd-fg-mute); margin-right: 4px; }
.toolbar select, .toolbar input {
    background: var(--nd-bg-input); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 4px 8px; font-size: 12px; font-family: var(--nd-font);
}
.toolbar input[type=text] { min-width: 220px; }
button {
    background: var(--nd-bg-soft); color: var(--nd-fg); border: 1px solid var(--nd-border);
    border-radius: var(--nd-r-sm); padding: 5px 10px; font-size: 12px; cursor: pointer;
    font-family: var(--nd-font);
}
button:hover { background: var(--nd-border-soft); }
button.primary { background: var(--nd-accent-lo); color: #fff; border-color: var(--nd-accent-lo); }
button.primary:hover { background: var(--nd-accent); }
button.danger { color: var(--nd-danger); }
.badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: var(--nd-r-pill); font-size: 11px; font-weight: 600;
}
.badge.ok { background: rgba(78,201,139,0.15); color: var(--nd-success); }
.badge.bad { background: rgba(241,76,76,0.15); color: var(--nd-danger); }
.badge.idle { background: var(--nd-bg-soft); color: var(--nd-fg-mute); }
.tabs { display: flex; border-bottom: 1px solid var(--nd-border); margin-bottom: 14px; }
.tab-btn {
    background: transparent; border: none; border-bottom: 2px solid transparent;
    padding: 8px 14px; cursor: pointer; color: var(--nd-fg-mute); font-size: 12px; font-weight: 600;
}
.tab-btn.active { color: var(--nd-fg-strong); border-bottom-color: var(--nd-accent); }
.tab-content { display: none; }
.tab-content.active { display: block; }
.list {
    background: var(--nd-bg-card); border: 1px solid var(--nd-border-soft);
    border-radius: var(--nd-r-md); max-height: 480px; overflow-y: auto;
}
.list-row {
    display: grid; grid-template-columns: 24px 1fr auto; gap: 10px;
    padding: 8px 12px; border-bottom: 1px solid var(--nd-border-soft); align-items: center;
}
.list-row:last-child { border-bottom: none; }
.list-row .name { font-weight: 600; color: var(--nd-fg-strong); }
.list-row .sub { font-size: 11px; color: var(--nd-fg-mute); }
.list-row .scope-chip {
    display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: var(--nd-r-pill);
    background: var(--nd-bg-soft); color: var(--nd-fg-mute); margin-left: 6px;
}
.actions-bar {
    display: flex; gap: 8px; align-items: center; padding: 10px 0; flex-wrap: wrap;
}
.empty { padding: 24px; text-align: center; color: var(--nd-fg-mute); font-size: 12px; }
.tree-scope {
    border: 1px solid var(--nd-border-soft); border-radius: var(--nd-r-md);
    margin-bottom: 10px; background: var(--nd-bg-card);
}
.tree-scope-h { padding: 8px 12px; font-weight: 700; border-bottom: 1px solid var(--nd-border-soft); }
.tree-table-h { padding: 6px 12px; font-size: 11px; color: var(--nd-fg-mute); text-transform: uppercase; letter-spacing: 0.05em; background: var(--nd-bg-soft); }
.tree-entry { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-top: 1px solid var(--nd-border-soft); }
.tree-entry code { font-family: var(--nd-font-mono); font-size: 11px; color: var(--nd-fg-mute); }
.error-banner {
    background: rgba(241,76,76,0.1); border: 1px solid var(--nd-danger);
    color: var(--nd-danger); padding: 8px 12px; border-radius: var(--nd-r-sm);
    margin-bottom: 12px; font-size: 12px;
}
.hint { color: var(--nd-fg-mute); font-size: 11px; }
hr { border: none; border-top: 1px solid var(--nd-border-soft); margin: 12px 0; }
.filter-bar {
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.filter-bar input {
    flex: 1; background: var(--nd-bg-input); color: var(--nd-fg);
    border: 1px solid var(--nd-border); border-radius: var(--nd-r-sm);
    padding: 4px 8px; font-size: 12px; font-family: var(--nd-font);
}
`;

const PANEL_HTML = `
<h1>Instance Dependencies</h1>
<div class="subtitle">Browse a ServiceNow instance and add tables, roles, ACLs, and other records to <code>now.config.json</code>.</div>

<div id="errorBanner" class="error-banner" style="display:none;"></div>

<div class="toolbar">
    <label for="aliasSelect">Auth alias</label>
    <select id="aliasSelect"></select>
    <span id="hostHint" class="hint"></span>
    <button id="connectBtn" class="primary">Connect</button>
    <button id="forgetBtn" title="Forget stored credentials for this alias">Forget</button>
    <span id="connBadge" class="badge idle">Not connected</span>
    <span style="flex:1;"></span>
    <label for="packageSelect">Package</label>
    <select id="packageSelect"></select>
    <button id="openConfigBtn" title="Open now.config.json">Open file</button>
</div>

<div class="tabs">
    <button class="tab-btn active" data-tab="browse">Browse &amp; Add</button>
    <button class="tab-btn" data-tab="current">Current Dependencies</button>
</div>

<div id="tab-browse" class="tab-content active">
    <div class="toolbar">
        <label for="categorySelect">Category</label>
        <select id="categorySelect"></select>
        <label for="scopeSelect">Scope</label>
        <select id="scopeSelect"><option value="global">global</option></select>
        <input type="text" id="searchInput" placeholder="Search by name or label…">
        <button id="searchBtn">Search</button>
        <span id="searchStatus" class="hint"></span>
    </div>
    <div class="actions-bar">
        <button id="addSelectedBtn" class="primary" disabled>Add Selected to now.config.json</button>
        <button id="addWildcardBtn" title="Add the * wildcard for the current category + scope">Add wildcard (*)</button>
        <span id="selCount" class="hint">No items selected</span>
    </div>
    <div class="filter-bar">
        <input type="text" id="filterInput" placeholder="Quick filter loaded results…" autocomplete="off">
        <span id="filterCount" class="hint"></span>
    </div>
    <div id="resultsList" class="list"><div class="empty">Connect to an instance and search to begin.</div></div>
</div>

<div id="tab-current" class="tab-content">
    <div class="actions-bar">
        <button id="refreshCurrentBtn">Refresh</button>
        <button id="runDepsBtn" class="primary">Run <code>now-sdk dependencies</code></button>
        <span class="hint">Generates type definitions in <code>@types/servicenow/fluent</code>.</span>
    </div>
    <div id="currentList"></div>
</div>
`;

const PANEL_SCRIPT = `
(function () {
    const vscode = acquireVsCodeApi();
    const $ = (id) => document.getElementById(id);
    const state = {
        aliases: [], categories: [], scopes: [], packages: [],
        results: [], selected: new Map(), currentDeps: [], connected: false,
    };

    function post(msg) { vscode.postMessage(msg); }
    function showError(msg) {
        const el = $('errorBanner');
        if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
        el.style.display = 'block'; el.textContent = msg;
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + btn.dataset.tab));
            if (btn.dataset.tab === 'current') { post({ type: 'refreshCurrent' }); }
        });
    });

    $('aliasSelect').addEventListener('change', (e) => {
        post({ type: 'selectAlias', alias: e.target.value });
        const a = state.aliases.find(x => x.alias === e.target.value);
        $('hostHint').textContent = a ? a.host : '';
        setConnection(false, '');
    });
    $('packageSelect').addEventListener('change', (e) => {
        post({ type: 'selectPackage', path: e.target.value });
    });
    $('connectBtn').addEventListener('click', () => post({ type: 'connect' }));
    $('forgetBtn').addEventListener('click', () => post({ type: 'forgetCredentials' }));
    $('openConfigBtn').addEventListener('click', () => post({ type: 'openConfigFile' }));
    $('refreshCurrentBtn').addEventListener('click', () => post({ type: 'refreshCurrent' }));
    $('runDepsBtn').addEventListener('click', () => post({ type: 'runDependenciesCmd' }));

    let searchTimer;
    function triggerSearch() {
        if (!state.connected) { showError('Connect to an instance first.'); return; }
        showError('');
        const category = $('categorySelect').value;
        const scope = $('scopeSelect').value;
        const term = $('searchInput').value;
        $('searchStatus').textContent = 'Searching…';
        $('filterInput').value = '';
        post({ type: 'search', category, scope, term });
    }
    $('searchBtn').addEventListener('click', triggerSearch);
    $('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(triggerSearch, 350);
    });
    $('categorySelect').addEventListener('change', triggerSearch);
    $('scopeSelect').addEventListener('change', triggerSearch);

    let filterTimer;
    $('filterInput').addEventListener('input', () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(renderResults, 150);
    });

    $('addSelectedBtn').addEventListener('click', () => {
        const scope = $('scopeSelect').value || 'global';
        const items = Array.from(state.selected.values());
        if (items.length === 0) { return; }
        post({ type: 'addSelected', scope, items });
        state.selected.clear();
        renderResults();
    });
    $('addWildcardBtn').addEventListener('click', () => {
        const scope = $('scopeSelect').value || 'global';
        const category = $('categorySelect').value;
        const cat = state.categories.find(c => c.key === category);
        if (!cat) { return; }
        if (confirm('Add wildcard (*) for ' + cat.label + ' in scope "' + scope + '"? This pulls every record from that table.')) {
            post({ type: 'addWildcard', scope, table: category });
        }
    });

    function setConnection(ok, err) {
        state.connected = ok;
        const el = $('connBadge');
        if (ok) { el.className = 'badge ok'; el.textContent = '\u2713 Connected'; }
        else if (err) { el.className = 'badge bad'; el.textContent = err; }
        else { el.className = 'badge idle'; el.textContent = 'Not connected'; }
    }

    function renderResults() {
        const list = $('resultsList');
        if (!state.results.length) {
            list.innerHTML = '<div class="empty">No results. Try a different search.</div>';
            $('addSelectedBtn').disabled = true;
            $('selCount').textContent = 'No items selected';
            $('filterCount').textContent = '';
            return;
        }
        const q = ($('filterInput').value || '').toLowerCase().trim();
        const visible = q
            ? state.results.filter(r =>
                (r.name || '').toLowerCase().includes(q) ||
                (r.label || '').toLowerCase().includes(q) ||
                (r.sys_id || '').toLowerCase().includes(q))
            : state.results;
        $('filterCount').textContent = q ? visible.length + ' of ' + state.results.length : '';
        if (!visible.length) {
            list.innerHTML = '<div class="empty">No results match "' + esc(q) + '".</div>';
            $('addSelectedBtn').disabled = true;
            return;
        }
        list.innerHTML = visible.map(r => {
            const key = state.currentCategory + ':' + r.sys_id;
            const checked = state.selected.has(key) ? 'checked' : '';
            return '<label class="list-row">' +
                '<input type="checkbox" data-key="' + esc(key) + '" data-sysid="' + esc(r.sys_id) + '" data-name="' + esc(r.name) + '" ' + checked + '>' +
                '<div>' +
                    '<div class="name">' + esc(r.name || r.sys_id) +
                    (r.scope ? '<span class="scope-chip">' + esc(r.scope) + '</span>' : '') + '</div>' +
                    (r.label ? '<div class="sub">' + esc(r.label) + '</div>' : '') +
                    '<div class="sub"><code>' + esc(r.sys_id) + '</code></div>' +
                '</div>' +
                '<span></span>' +
            '</label>';
        }).join('');
        list.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.key;
                if (cb.checked) {
                    const idToUse = (state.currentCategory === 'tables' && cb.dataset.name) ? cb.dataset.name : cb.dataset.sysid;
                    state.selected.set(key, { category: state.currentCategory, sysId: idToUse });
                } else {
                    state.selected.delete(key);
                }
                $('addSelectedBtn').disabled = state.selected.size === 0;
                $('selCount').textContent = state.selected.size === 0 ? 'No items selected' : state.selected.size + ' selected';
            });
        });
        $('addSelectedBtn').disabled = state.selected.size === 0;
        $('selCount').textContent = state.selected.size === 0 ? 'No items selected' : state.selected.size + ' selected';
    }

    function renderCurrent() {
        const list = $('currentList');
        if (!state.currentDeps.length) {
            list.innerHTML = '<div class="empty">No dependencies declared in <code>now.config.json</code>.</div>';
            return;
        }
        const byScope = {};
        state.currentDeps.forEach(d => {
            byScope[d.scope] = byScope[d.scope] || {};
            byScope[d.scope][d.table] = d;
        });
        list.innerHTML = Object.keys(byScope).sort().map(scope => {
            const tables = byScope[scope];
            const tableHtml = Object.keys(tables).sort().map(t => {
                const d = tables[t];
                if (d.wildcard) {
                    return '<div class="tree-table-h">' + esc(t) + '</div>' +
                        '<div class="tree-entry"><code>* (wildcard \u2014 all records)</code>' +
                            '<button class="danger" data-scope="' + esc(scope) + '" data-table="' + esc(t) + '" data-sysid="*">Remove</button>' +
                        '</div>';
                }
                const rows = d.sysIds.map(id =>
                    '<div class="tree-entry"><code>' + esc(id) + '</code>' +
                        '<button class="danger" data-scope="' + esc(scope) + '" data-table="' + esc(t) + '" data-sysid="' + esc(id) + '">Remove</button>' +
                    '</div>'
                ).join('');
                return '<div class="tree-table-h">' + esc(t) + ' (' + d.sysIds.length + ')</div>' + rows;
            }).join('');
            return '<div class="tree-scope">' +
                '<div class="tree-scope-h">' + esc(scope) + '</div>' + tableHtml +
            '</div>';
        }).join('');
        list.querySelectorAll('button.danger').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!confirm('Remove ' + btn.dataset.sysid + ' from ' + btn.dataset.table + '?')) { return; }
                post({ type: 'removeDependency', scope: btn.dataset.scope, table: btn.dataset.table, sysId: btn.dataset.sysid });
            });
        });
    }

    function esc(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
            case 'init': {
                state.aliases = msg.aliases;
                state.categories = msg.categories;
                state.packages = msg.packages;
                $('aliasSelect').innerHTML = msg.aliases.map(a =>
                    '<option value="' + esc(a.alias) + '"' + (a.alias === msg.currentAlias ? ' selected' : '') + '>' + esc(a.alias) + (a.isDefault ? ' (default)' : '') + '</option>'
                ).join('') || '<option>No aliases — add one in Setup</option>';
                $('packageSelect').innerHTML = msg.packages.map(p =>
                    '<option value="' + esc(p.path) + '"' + (p.path === msg.currentPackage ? ' selected' : '') + '>' + esc(p.name) + (p.scope ? ' [' + esc(p.scope) + ']' : '') + '</option>'
                ).join('') || '<option value="">No now.config.json found</option>';
                $('categorySelect').innerHTML = msg.categories.map(c =>
                    '<option value="' + esc(c.key) + '">' + esc(c.label) + '</option>'
                ).join('');
                state.currentCategory = msg.categories[0]?.key;
                $('categorySelect').addEventListener('change', () => { state.currentCategory = $('categorySelect').value; });
                const a = msg.aliases.find(x => x.alias === msg.currentAlias);
                $('hostHint').textContent = a ? a.host : '';
                break;
            }
            case 'connectionStatus':
                setConnection(msg.connected, msg.error);
                if (msg.connected) {
                    $('searchStatus').textContent = '';
                    state.currentCategory = $('categorySelect').value;
                    triggerSearch();
                }
                break;
            case 'scopes':
                state.scopes = msg.scopes;
                $('scopeSelect').innerHTML = msg.scopes.map(s =>
                    '<option value="' + esc(s.scope) + '"' + (s.scope === 'global' ? ' selected' : '') + '>' + esc(s.scope) + '</option>'
                ).join('');
                break;
            case 'searchResults':
                state.results = msg.items;
                state.currentCategory = msg.category;
                $('searchStatus').textContent = msg.items.length + ' result' + (msg.items.length === 1 ? '' : 's');
                renderResults();
                break;
            case 'currentDependencies':
                state.currentDeps = msg.entries;
                renderCurrent();
                break;
            case 'addResult':
                if (!msg.ok) { showError('Add failed: ' + (msg.error ?? 'unknown')); }
                break;
            case 'error':
                showError(msg.message);
                $('searchStatus').textContent = '';
                break;
        }
    });
})();
`;
