import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { spawnSdk } from './SdkProcess';
import { GuidelineArticleRef } from './WorkspaceAgentManager';
import { scanAuthAliases } from './AuthAliasScanner';
import {
    NowConfigPackage,
    addDependencies,
    findNowConfigs,
    getDependencies,
    reloadConfig,
    removeDependency,
} from './NowConfigManager';

type BrowserMode = 'browse' | 'discover' | 'guidelines' | 'current';

interface SourceDef {
    key: string;
    sdkKey: string;
    table: string;
    label: string;
    nameField: string;
    labelField?: string;
    fields: string[];
    searchFields: string[];
    previewFields?: string[];
    baseQuery?: string;
    discover: boolean;
    guideline: boolean;
    hasPreview: boolean;
}

interface SdkQueryOptions {
    query?: string;
    fields?: string[];
    limit?: number;
    offset?: number;
    displayValue?: 'true' | 'false' | 'all';
}

interface SdkQueryEnvelope {
    ok: boolean;
    records?: Record<string, unknown>[];
    error?: { message?: string };
}

const SOURCES: SourceDef[] = [
    source('tables', 'tables', 'sys_db_object', 'Tables', 'name', 'label', ['sys_id', 'name', 'label', 'sys_scope'], ['name', 'label'], false, false),
    source('roles', 'roles', 'sys_user_role', 'Roles', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
    source('acls', 'sys_security_acl', 'sys_security_acl', 'ACLs', 'name', 'operation', ['sys_id', 'name', 'operation', 'type', 'sys_scope'], ['name', 'operation', 'type'], false, false),
    source('choices', 'sys_choice', 'sys_choice', 'Choices', 'name', 'label', ['sys_id', 'name', 'element', 'label', 'value', 'sys_scope'], ['name', 'element', 'label', 'value'], false, false),
    source('script_includes', 'sys_script_include', 'sys_script_include', 'Script Includes', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description', 'script'], true, false, ['script']),
    source('business_rules', 'sys_script', 'sys_script', 'Business Rules', 'name', 'collection', ['sys_id', 'name', 'collection', 'when', 'sys_scope'], ['name', 'collection', 'description', 'script'], true, false, ['script']),
    source('client_scripts', 'sys_script_client', 'sys_script_client', 'Client Scripts', 'name', 'table', ['sys_id', 'name', 'table', 'type', 'sys_scope'], ['name', 'table', 'description', 'script'], true, false, ['script']),
    source('ui_actions', 'sys_ui_action', 'sys_ui_action', 'UI Actions', 'name', 'table', ['sys_id', 'name', 'table', 'sys_scope'], ['name', 'table', 'short_description', 'description', 'script'], true, false, ['script']),
    source('ui_policies', 'sys_ui_policy', 'sys_ui_policy', 'UI Policies', 'short_description', 'table', ['sys_id', 'short_description', 'table', 'sys_scope'], ['short_description', 'table'], false, false),
    source('knowledge', 'kb_knowledge', 'kb_knowledge', 'Knowledge Articles', 'number', 'short_description', ['sys_id', 'number', 'short_description', 'workflow_state', 'sys_updated_on', 'kb_knowledge_base', 'sys_scope'], ['number', 'short_description', 'text'], true, true, ['text']),
    source('knowledge_bases', 'kb_knowledge_base', 'kb_knowledge_base', 'Knowledge Bases', 'title', 'description', ['sys_id', 'title', 'description', 'sys_scope'], ['title', 'description'], false, true),
    source('flows', 'sys_hub_flow', 'sys_hub_flow', 'Flows', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], true, false),
    source('scheduled_scripts', 'sysauto_script', 'sysauto_script', 'Scheduled Scripts', 'name', 'run_type', ['sys_id', 'name', 'run_type', 'sys_scope'], ['name', 'description', 'script'], true, false, ['script']),
    source('rest_messages', 'sys_rest_message', 'sys_rest_message', 'REST Messages', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
    source('catalog_items', 'sc_cat_item', 'sc_cat_item', 'Catalog Items', 'name', 'short_description', ['sys_id', 'name', 'short_description', 'sys_scope'], ['name', 'short_description'], false, false),
    source('properties', 'sys_properties', 'sys_properties', 'System Properties', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
];

let _panel: vscode.WebviewPanel | undefined;
let _controller: InstanceBrowserController | undefined;

export function showInstanceBrowserPanel(context: vscode.ExtensionContext, initialMode: BrowserMode = 'browse'): void {
    if (_panel && _controller) {
        _panel.reveal(undefined, false);
        _controller.setMode(initialMode);
        return;
    }

    const panel = vscode.window.createWebviewPanel(
        'nowdev.instanceBrowser',
        'Instance Browser',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        }
    );
    _panel = panel;
    _controller = new InstanceBrowserController(panel, context, initialMode);
    panel.onDidDispose(() => { _panel = undefined; _controller = undefined; });
    void _controller.init();
}

class InstanceBrowserController {
    private currentAlias: string | undefined;
    private currentPackage: NowConfigPackage | undefined;
    private mode: BrowserMode;
    private watcher: vscode.FileSystemWatcher | undefined;

    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext,
        initialMode: BrowserMode
    ) {
        this.mode = initialMode;
        panel.webview.html = this.html();
        panel.webview.onDidReceiveMessage(async (msg) => {
            try { await this.handle(msg); }
            catch (err: any) { this.post({ type: 'error', message: err?.message ?? String(err) }); }
        }, undefined, context.subscriptions);

        this.watcher = vscode.workspace.createFileSystemWatcher('**/now.config.json');
        this.watcher.onDidChange(() => this.sendCurrentDeps());
        this.watcher.onDidCreate(() => this.sendCurrentDeps());
        this.watcher.onDidDelete(() => this.sendCurrentDeps());
        panel.onDidDispose(() => this.watcher?.dispose());
    }

    async init(): Promise<void> {
        const aliases = scanAuthAliases();
        this.currentAlias = aliases.find(a => a.isDefault)?.alias ?? aliases[0]?.alias;
        const configs = findNowConfigs();
        this.currentPackage = configs[0];
        this.post({
            type: 'init',
            mode: this.mode,
            aliases: aliases.map(a => ({ alias: a.alias, host: a.host, isDefault: a.isDefault })),
            currentAlias: this.currentAlias,
            packages: configs.map(c => ({ path: c.configPath, name: c.config.name ?? path.basename(c.packageDir), scope: c.config.scope ?? '' })),
            currentPackage: this.currentPackage?.configPath,
            savedGuidelines: this.readSavedGuidelines(),
            sources: SOURCES.map(({ key, label, table, discover, guideline }) => ({ key, label, table, discover, guideline })),
        });
        this.sendCurrentDeps();
        if (this.currentAlias) { void this.loadScopes(); }
    }

    setMode(mode: BrowserMode): void {
        this.mode = mode;
        this.post({ type: 'setMode', mode });
    }

    private post(msg: any): void {
        this.panel.webview.postMessage(msg);
    }

    private async handle(msg: any): Promise<void> {
        switch (msg.type) {
            case 'selectAlias':
                this.currentAlias = msg.alias;
                this.post({ type: 'aliasSelected', alias: this.currentAlias });
                if (this.currentAlias) { await this.loadScopes(); }
                return;
            case 'selectPackage': {
                const all = findNowConfigs();
                this.currentPackage = all.find(p => p.configPath === msg.path) ?? all[0];
                this.sendCurrentDeps();
                return;
            }
            case 'search':
                await this.search(msg.source, msg.scope, msg.term, msg.offset ?? 0);
                return;
            case 'discover':
                await this.discover(msg.sources, msg.scope, msg.keywords, msg.limit ?? 30);
                return;
            case 'preview':
                await this.preview(msg.source, msg.sysId, msg.previewId);
                return;
            case 'addSelected':
                await this.addSelected(msg.scope, msg.items);
                return;
            case 'saveGuidelines':
                await this.saveGuidelines(msg.items ?? []);
                return;
            case 'clearGuidelines':
                await this.clearGuidelines();
                return;
            case 'removeDependency':
                if (this.currentPackage) {
                    removeDependency(this.currentPackage, msg.scope, msg.table, msg.sysId);
                    this.currentPackage = reloadConfig(this.currentPackage);
                    this.sendCurrentDeps();
                }
                return;
            case 'runDependenciesCmd':
                vscode.commands.executeCommand('nowdev-ai-toolbox.sdkDependencies', { auth: this.currentAlias });
                return;
            case 'openConfigFile':
                if (this.currentPackage) {
                    const doc = await vscode.workspace.openTextDocument(this.currentPackage.configPath);
                    await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
                }
                return;
            case 'refreshCurrent':
                this.sendCurrentDeps();
                return;
        }
    }

    private async loadScopes(): Promise<void> {
        if (!this.currentAlias) { return; }
        this.post({ type: 'busy', target: 'scopes', message: 'Loading scopes...' });
        let records: Record<string, unknown>[] = [];
        try {
            records = await this.runQuery('sys_scope', {
                fields: ['sys_id', 'name', 'scope'],
                limit: 500,
                query: 'scopeISNOTEMPTY^ORDERBYscope',
            });
        } catch (err: any) {
            this.post({ type: 'busy', target: 'scopes', message: '' });
            this.post({ type: 'error', message: `Failed to load scopes with now-sdk query: ${err?.message ?? err}` });
            return;
        }
        const seen = new Set<string>();
        const scopes: { sys_id: string; name: string; scope: string }[] = [];
        for (const rec of records as any[]) {
            const scopeName = String(rec.scope ?? '').trim();
            if (!scopeName || seen.has(scopeName)) { continue; }
            seen.add(scopeName);
            scopes.push({ sys_id: String(rec.sys_id ?? ''), name: String(rec.name ?? scopeName), scope: scopeName });
        }
        scopes.sort((a, b) => a.scope.localeCompare(b.scope));
        scopes.unshift({ sys_id: '', name: 'All Scopes', scope: '*' });
        if (!seen.has('global')) { scopes.splice(1, 0, { sys_id: '', name: 'Global', scope: 'global' }); }
        this.post({ type: 'busy', target: 'scopes', message: '' });
        this.post({ type: 'scopes', scopes });
    }

    private async search(sourceKey: string, scope: string, term: string, offset: number): Promise<void> {
        if (!this.currentAlias) { return; }
        const def = SOURCES.find(s => s.key === sourceKey);
        if (!def) { return; }
        const query = buildQuery(def, scope, [term]);
        const fields = unique(['sys_id', ...def.fields]);
        this.post({ type: 'busy', target: 'browse', message: `Searching ${def.label}...` });
        try {
            const records = await this.runQuery(def.table, { query, fields, limit: 50, offset, displayValue: 'all' });
            this.post({ type: 'results', mode: 'browse', items: (records as any[]).map(r => normalizeRecord(r, def, 0)) });
        } finally {
            this.post({ type: 'busy', target: 'browse', message: '' });
        }
    }

    private async discover(sourceKeys: string[], scope: string, keywords: string[], limit: number): Promise<void> {
        if (!this.currentAlias) { return; }
        const cleaned = keywords.map(k => k.trim()).filter(Boolean).slice(0, 12);
        const all: any[] = [];
        this.post({ type: 'busy', target: 'discover', message: 'Discovering related context...' });
        for (const key of sourceKeys) {
            const def = SOURCES.find(s => s.key === key && s.discover);
            if (!def) { continue; }
            this.post({ type: 'progress', source: key, label: def.label, status: 'running' });
            try {
                const fields = unique(['sys_id', ...def.fields, ...def.searchFields, ...(def.previewFields ?? [])]);
                const queryRecords = await this.runQuery(def.table, { query: buildQuery(def, scope, cleaned), fields, limit, displayValue: 'all' });
                const records = (queryRecords as any[]).map(r => normalizeRecord(r, def, scoreRecord(r, def, cleaned))).filter(r => r.score > 0);
                all.push(...records);
                this.post({ type: 'progress', source: key, label: def.label, status: 'done', count: records.length });
            } catch (err: any) {
                this.post({ type: 'progress', source: key, label: def.label, status: 'error', error: err?.message ?? String(err) });
            }
        }
        all.sort((a, b) => b.score - a.score);
        this.post({ type: 'results', mode: 'discover', items: all });
        this.post({ type: 'busy', target: 'discover', message: '' });
    }

    private async preview(sourceKey: string, sysId: string, previewId?: string): Promise<void> {
        if (!this.currentAlias) { return; }
        const def = SOURCES.find(s => s.key === sourceKey);
        if (!def) { return; }
        const bodyFields = def.previewFields ?? ['description', 'short_description', 'text', 'script'];
        const queryFields = unique(['sys_id', def.nameField, ...bodyFields]);
        this.post({ type: 'previewLoading', previewId });
        try {
            const records = await this.runQuery(def.table, { query: `sys_id=${sysId}`, fields: queryFields, limit: 1 });
            const record = (records as any[])[0];
            const body = bodyFields.map(f => String(record?.[f] ?? '')).find(Boolean) ?? '';
            this.post({ type: 'preview', sysId, previewId, body: stripHtml(body) });
        } catch (err: any) {
            this.post({ type: 'preview', sysId, previewId, body: `Preview failed: ${err?.message ?? err}` });
        }
    }

    private async addSelected(scope: string, items: { source: string; sysId: string }[]): Promise<void> {
        if (!this.currentPackage) {
            this.currentPackage = findNowConfigs()[0];
        }
        if (!this.currentPackage) {
            vscode.window.showWarningMessage('No now.config.json found in the workspace. Initialize a Fluent project first.');
            return;
        }
        const buckets = new Map<string, string[]>();
        for (const item of items) {
            const def = SOURCES.find(s => s.key === item.source);
            if (!def) { continue; }
            const bucket = buckets.get(def.sdkKey) ?? [];
            if (!bucket.includes(item.sysId)) { bucket.push(item.sysId); }
            buckets.set(def.sdkKey, bucket);
        }
        for (const [sdkKey, sysIds] of buckets) {
            addDependencies(this.currentPackage, scope, sdkKey, sysIds);
            this.currentPackage = reloadConfig(this.currentPackage);
        }
        this.sendCurrentDeps();
        await this.runDependencies(Array.from(buckets.keys()).join(', '), items.length);
    }

    private async saveGuidelines(items: { source: string; sysId: string }[]): Promise<void> {
        if (!this.currentAlias) { return; }
        const ids = items.filter(item => item.source === 'knowledge').map(item => item.sysId).filter(Boolean);
        if (!ids.length) { return; }
        this.post({ type: 'busy', target: 'guidelines', message: 'Saving selected KB articles...' });
        const articles: GuidelineArticleRef[] = [];
        try {
            for (const sysId of ids) {
                const records = await this.runQuery('kb_knowledge', {
                    query: `sys_id=${sysId}`,
                    fields: ['sys_id', 'number', 'short_description', 'workflow_state', 'sys_updated_on'],
                    limit: 1,
                    displayValue: 'all',
                });
                const record = (records as any[])[0];
                if (!record) { continue; }
                articles.push({
                    sysId,
                    number: getDisplay(record, 'number'),
                    title: getDisplay(record, 'short_description') || sysId,
                    state: getDisplay(record, 'workflow_state'),
                    updatedOn: getDisplay(record, 'sys_updated_on'),
                });
            }
            const configPath = this.getWorkspaceConfigPath();
            if (!configPath) { return; }
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
            const existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
            existing.guidelines = {
                enabled: true,
                instanceAlias: this.currentAlias,
                selectedArticles: articles,
                lastSynced: new Date().toISOString(),
            };
            fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
            this.post({ type: 'guidelinesSaved', count: articles.length, articles });
            vscode.window.showInformationMessage(`Saved ${articles.length} KB article(s) as agent guidelines.`);
        } finally {
            this.post({ type: 'busy', target: 'guidelines', message: '' });
        }
    }

    private async clearGuidelines(): Promise<void> {
        const configPath = this.getWorkspaceConfigPath();
        if (!configPath || !fs.existsSync(configPath)) { return; }
        this.post({ type: 'busy', target: 'guidelines', message: 'Clearing saved guidelines...' });
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        existing.guidelines = { enabled: false, selectedArticles: [], lastSynced: new Date().toISOString() };
        fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
        this.post({ type: 'guidelinesCleared' });
        this.post({ type: 'busy', target: 'guidelines', message: '' });
        vscode.window.showInformationMessage('Cleared KB-backed agent guidelines.');
    }

    private getWorkspaceConfigPath(): string | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        return workspaceFolder ? path.join(workspaceFolder, '.vscode', 'nowdev-ai-config.json') : undefined;
    }

    private runQuery(table: string, options: SdkQueryOptions): Promise<Record<string, unknown>[]> {
        return new Promise((resolve, reject) => {
            if (!this.currentAlias) {
                reject(new Error('No now-sdk auth alias selected.'));
                return;
            }
            const args = ['query', table, '-o', 'json', '--auth', this.currentAlias];
            if (options.query) { args.push('--query', options.query); }
            if (options.fields?.length) { args.push('--fields', options.fields.join(',')); }
            if (options.limit !== undefined) { args.push('--limit', String(options.limit)); }
            if (options.offset !== undefined && options.offset > 0) { args.push('--offset', String(options.offset)); }
            if (options.displayValue) { args.push('--display-value', options.displayValue); }

            const proc = spawnSdk(args, { timeout: 30000 });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data: Buffer) => { stdout += data.toString('utf-8'); });
            proc.stderr.on('data', (data: Buffer) => { stderr += data.toString('utf-8'); });
            proc.on('error', (err) => reject(err));
            proc.on('close', (code) => {
                const raw = stdout.trim();
                const jsonStart = raw.indexOf('{');
                if (code !== 0 || jsonStart < 0) {
                    reject(new Error((stderr || stdout || `now-sdk query failed with exit ${code}`).trim()));
                    return;
                }
                try {
                    const envelope = JSON.parse(raw.slice(jsonStart)) as SdkQueryEnvelope;
                    if (!envelope.ok) {
                        reject(new Error(envelope.error?.message ?? 'now-sdk query returned ok:false'));
                        return;
                    }
                    resolve(envelope.records ?? []);
                } catch (err: any) {
                    reject(new Error(`Could not parse now-sdk query output: ${err?.message ?? err}`));
                }
            });
        });
    }

    private readSavedGuidelines(): GuidelineArticleRef[] {
        const configPath = this.getWorkspaceConfigPath();
        if (!configPath || !fs.existsSync(configPath)) { return []; }
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const selected = config.guidelines?.selectedArticles;
            return Array.isArray(selected) ? selected : [];
        } catch {
            return [];
        }
    }

    private runDependencies(label: string, count: number): Promise<void> {
        return new Promise(resolve => {
            if (!this.currentPackage) { resolve(); return; }
            const cwd = path.dirname(this.currentPackage.configPath);
            const args = ['dependencies'];
            if (this.currentAlias) { args.push('--auth', this.currentAlias); }
            const chan = vscode.window.createOutputChannel('NowDev: SDK Dependencies');
            chan.show(true);
            chan.appendLine(`Updated now.config.json — added ${count} item(s) for ${label}.`);
            chan.appendLine(`\n> now-sdk ${args.join(' ')}\n`);
            const proc = spawnSdk(args, { cwd });
            proc.stdout.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.stderr.on('data', (d: Buffer) => chan.append(d.toString()));
            proc.on('close', (code) => {
                chan.appendLine(code === 0 ? '\nDependencies downloaded successfully.' : `\nnow-sdk dependencies failed (exit ${code}). Entries remain saved in now.config.json.`);
                this.post({ type: 'addResult', ok: code === 0, count });
                resolve();
            });
        });
    }

    private sendCurrentDeps(): void {
        if (this.currentPackage) {
            try { this.currentPackage = reloadConfig(this.currentPackage); }
            catch { /* keep previous */ }
        }
        const entries = this.currentPackage ? getDependencies(this.currentPackage.config) : [];
        this.post({ type: 'currentDependencies', entries });
    }

    private html(): string {
        const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`;
        return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Instance Browser</title><style>${getSharedPanelStyles()}${styles()}</style></head><body>${markup()}<script>${script()}</script></body></html>`;
    }
}

function source(key: string, sdkKey: string, table: string, label: string, nameField: string, labelField: string | undefined, fields: string[], searchFields: string[], discover: boolean, guideline: boolean, previewFields?: string[]): SourceDef {
    return { key, sdkKey, table, label, nameField, labelField, fields, searchFields, previewFields, discover, guideline, hasPreview: !!previewFields?.length || guideline };
}

function unique(values: string[]): string[] {
    return values.filter((v, index, all) => v && all.indexOf(v) === index);
}

function buildQuery(def: SourceDef, scope: string, terms: string[]): string {
    const filters: string[] = [];
    const cleaned = terms.map(t => String(t ?? '').trim().replace(/\^/g, '')).filter(Boolean);
    if (cleaned.length) {
        const fragments: string[] = [];
        for (const term of cleaned) {
            for (const field of def.searchFields) { fragments.push(`${field}LIKE${term}`); }
        }
        filters.push(fragments.join('^OR'));
    }
    if (scope && scope !== '*') { filters.push(`sys_scope.scope=${scope}`); }
    if (def.baseQuery) { filters.push(def.baseQuery); }
    return filters.join('^');
}

function getDisplay(record: any, field: string): string {
    const value = record[field];
    if (value && typeof value === 'object' && 'display_value' in value) { return String(value.display_value ?? value.value ?? ''); }
    return String(value ?? '');
}

function getValue(record: any, field: string): string {
    const value = record[field];
    if (value && typeof value === 'object' && 'value' in value) { return String(value.value ?? ''); }
    return String(value ?? '');
}

function normalizeRecord(record: any, def: SourceDef, score: number): any {
    const scope = getDisplay(record, 'sys_scope');
    return {
        source: def.key,
        table: def.table,
        label: def.label,
        sysId: getValue(record, 'sys_id') || getDisplay(record, 'sys_id'),
        name: getDisplay(record, def.nameField),
        subtitle: def.labelField ? getDisplay(record, def.labelField) : '',
        scope,
        score,
        hasPreview: def.hasPreview,
    };
}

function scoreRecord(record: any, def: SourceDef, keywords: string[]): number {
    const text = [def.nameField, ...def.searchFields].map(f => getDisplay(record, f)).join(' ').toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
        const lower = keyword.toLowerCase();
        if (!lower) { continue; }
        if (getDisplay(record, def.nameField).toLowerCase().includes(lower)) { score += 5; }
        if (text.includes(lower)) { score += 1; }
    }
    return score;
}

function stripHtml(value: string): string {
    return value.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function markup(): string {
    return `
<div class="ib-shell">
<header class="ib-hero">
    <div class="ib-title-block"><span class="eyebrow">ServiceNow context</span><h1>Instance Browser</h1><p>Find live records, add dependency metadata, and attach KB-backed guidelines without leaving VS Code.</p></div>
    <div class="ib-hero-actions"><div id="aliasBadge" class="badge idle">Auth alias</div><button id="openConfigBtn">Open config</button></div>
</header>
<section id="errorBanner" class="error-banner" style="display:none"></section>
<section id="busyBanner" class="busy-banner" style="display:none"><span class="spinner"></span><span id="busyText">Loading...</span></section>
<section class="connection-strip">
    <label>Instance <select id="aliasSelect"></select></label><span id="hostHint" class="hint"></span>
    <span class="grow"></span><label>Package <select id="packageSelect"></select></label>
</section>
<div class="ib-workbench">
<nav class="mode-tabs" aria-label="Instance Browser modes">
    <button data-mode="browse"><span>Browse</span><small>Find records</small></button><button data-mode="discover"><span>Discover</span><small>Search context</small></button><button data-mode="guidelines"><span>Guidelines</span><small>Save KB articles</small></button><button data-mode="current"><span>Current</span><small>Dependencies</small></button>
</nav>
<main class="ib-stage">
  <section id="mode-browse" class="mode-panel">
        <div class="panel-heading"><h2>Browse Records</h2><p>Search a source table, select records, and add them to dependency metadata.</p></div>
    <div class="toolbar"><label>Source <select id="browseSource"></select></label><label>Scope <select class="scopeSelect" id="browseScope"><option value="*">All Scopes</option></select></label><input id="browseTerm" placeholder="Search by name, label, or description"><button id="browseSearch" class="primary">Search</button></div>
    <div class="actions"><button id="addBrowse" class="primary" disabled>Add selected</button><span id="browseCount" class="hint">No items selected</span></div><div id="browseResults" class="results empty">Select an auth alias and search to begin.</div>
  </section>
  <section id="mode-discover" class="mode-panel">
        <div class="panel-heading"><h2>Discover Context</h2><p>Describe the work and scan related scripts, flows, policies, and KB articles.</p></div>
    <textarea id="taskText" placeholder="Describe the feature, issue, or project area to discover relevant scripts, flows, and knowledge articles..."></textarea>
    <div class="toolbar"><label>Keywords <input id="keywords" placeholder="approval, change, manager"></label><label>Scope <select class="scopeSelect" id="discoverScope"><option value="*">All Scopes</option></select></label><label>Limit <select id="discoverLimit"><option>10</option><option selected>30</option><option>50</option></select></label><button id="runDiscover" class="primary">Discover</button></div>
    <div id="discoverSources" class="check-grid"></div><div id="progress" class="hint"></div><div class="actions"><button id="addDiscover" class="primary" disabled>Add selected</button><span id="discoverCount" class="hint">No items selected</span></div><div id="discoverResults" class="results empty">Discovery results will appear here.</div>
  </section>
  <section id="mode-guidelines" class="mode-panel">
        <div class="panel-heading"><h2>KB Guidelines</h2><p>Search Knowledge articles that describe coding standards, review rules, release policies, or team conventions.</p></div>
        <div id="savedGuidelines" class="hint"></div>
    <div class="toolbar"><label>Search KB <input id="guidelineTerm" placeholder="AI guidelines, coding standards, review policy"></label><label>Scope <select class="scopeSelect" id="guidelineScope"><option value="*">All Scopes</option></select></label><button id="searchGuidelines" class="primary">Search</button></div>
    <div class="actions"><button id="addGuidelines" class="primary" disabled>Save as agent guidelines</button><button id="clearGuidelines">Clear saved guidelines</button><span id="guidelineCount" class="hint">No articles selected</span></div><div id="guidelineResults" class="results empty">Search for KB-backed guidelines.</div>
  </section>
    <section id="mode-current" class="mode-panel"><div class="panel-heading"><h2>Current Dependencies</h2><p>Review and remove dependency entries saved in the selected package configuration.</p></div><div class="actions"><button id="refreshCurrent">Refresh</button><button id="runDeps" class="primary">Download dependency types</button></div><div id="currentDeps" class="results empty">No package selected.</div></section>
</main>
</div>
</div>`;
}

function styles(): string {
    return `
body { padding: 0; max-width:none; background:linear-gradient(135deg, color-mix(in srgb, var(--nd-bg) 90%, var(--nd-accent) 10%) 0, var(--nd-bg) 360px); }
.ib-shell { width:min(1320px, calc(100vw - 36px)); margin:0 auto; padding:24px 0 32px; }
.ib-hero { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; margin-bottom:12px; padding:20px 22px; background:linear-gradient(135deg, color-mix(in srgb, var(--nd-bg-card) 82%, var(--nd-accent) 18%), color-mix(in srgb, var(--nd-bg-card) 94%, var(--nd-highlight) 6%)); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-2); }
.ib-title-block { max-width:720px; }
.eyebrow { display:inline-flex; margin-bottom:8px; color:var(--nd-accent-hi); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
h1 { margin:0 0 6px; font-size:28px; line-height:1.1; color:var(--nd-fg-strong); }
h2 { margin:0 0 4px; font-size:16px; color:var(--nd-fg-strong); }
p { margin:0; color:var(--nd-fg-mute); font-size:12px; }
.ib-hero-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
.connection-strip { display:flex; gap:10px; flex-wrap:wrap; align-items:center; padding:10px 12px; margin-bottom:14px; background:color-mix(in srgb, var(--nd-bg-card) 90%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); }
.ib-workbench { display:grid; grid-template-columns:minmax(180px, 220px) minmax(0, 1fr); gap:14px; align-items:start; }
.ib-stage { min-width:0; }
.panel-heading { margin-bottom:12px; padding:0 2px; }
.toolbar,.actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:10px 12px; margin-bottom:12px; background:color-mix(in srgb, var(--nd-bg-card) 92%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); }
.grow { flex:1; }
label { font-size:11px; font-weight:700; color:var(--nd-fg-mute); display:inline-flex; align-items:center; gap:6px; }
select,input,textarea { background:var(--nd-bg-input); color:var(--nd-fg); border:1px solid var(--nd-border); border-radius:var(--nd-r-sm); padding:5px 8px; font:12px var(--nd-font); }
input { min-width:220px; } textarea { box-sizing:border-box; width:100%; min-height:120px; resize:vertical; margin-bottom:12px; border-radius:var(--nd-r-md); padding:12px; }
button { background:var(--nd-bg-soft); color:var(--nd-fg); border:1px solid var(--nd-border); border-radius:var(--nd-r-sm); padding:5px 10px; font:12px var(--nd-font); cursor:pointer; }
button.primary { background:var(--nd-accent-lo); border-color:var(--nd-accent-lo); color:#fff; } button:disabled { opacity:.45; cursor:not-allowed; }
button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible { outline:2px solid color-mix(in srgb, var(--nd-accent) 72%, transparent); outline-offset:2px; }
.mode-tabs { position:sticky; top:18px; display:flex; flex-direction:column; gap:6px; padding:8px; background:color-mix(in srgb, var(--nd-bg-card) 88%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-1); }
.mode-tabs button { display:flex; flex-direction:column; align-items:flex-start; gap:2px; width:100%; background:transparent; border:1px solid transparent; border-radius:var(--nd-r-sm); color:var(--nd-fg-mute); font-weight:700; padding:10px 11px; text-align:left; }
.mode-tabs button span { color:inherit; }
.mode-tabs button small { font-size:10px; font-weight:600; color:var(--nd-fg-mute); }
.mode-tabs button.active { color:var(--nd-fg-strong); background:color-mix(in srgb, var(--nd-accent) 18%, transparent); border-color:color-mix(in srgb, var(--nd-accent) 30%, transparent); box-shadow:var(--nd-shadow-glow); }
.mode-panel { display:none; min-height:560px; padding:18px; background:color-mix(in srgb, var(--nd-bg-card) 94%, transparent); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-lg); box-shadow:var(--nd-shadow-1); } .mode-panel.active { display:block; }
.badge { display:inline-flex; padding:3px 9px; border-radius:var(--nd-r-pill); font-size:11px; font-weight:700; } .badge.ok { background:rgba(78,201,139,.15); color:var(--nd-success); } .badge.bad { background:rgba(241,76,76,.15); color:var(--nd-danger); } .badge.idle { background:var(--nd-bg-soft); color:var(--nd-fg-mute); }
.error-banner { color:var(--nd-danger); background:rgba(241,76,76,.1); border:1px solid var(--nd-danger); padding:8px 10px; border-radius:var(--nd-r-sm); margin-bottom:12px; font-size:12px; }
.busy-banner { display:flex; align-items:center; gap:8px; color:var(--nd-fg); background:color-mix(in srgb, var(--nd-bg-card) 82%, var(--nd-accent) 18%); border:1px solid var(--nd-border-strong); padding:8px 10px; border-radius:var(--nd-r-md); margin-bottom:12px; font-size:12px; }
.spinner { width:13px; height:13px; border:2px solid var(--nd-border); border-top-color:var(--nd-accent); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
@keyframes spin { to { transform:rotate(360deg); } }
.hint { color:var(--nd-fg-mute); font-size:11px; }
.check-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:8px; margin-bottom:12px; }
.source-option { display:grid; grid-template-columns:20px minmax(0,1fr); align-items:center; gap:8px; background:var(--nd-bg-card); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-sm); padding:8px 10px; cursor:pointer; }
.source-option:hover { border-color:var(--nd-border-strong); background:var(--nd-bg-soft); }
.source-option input { width:14px; height:14px; min-width:0; accent-color:var(--nd-accent); margin:0; }
.source-option span { color:var(--nd-fg); font-weight:600; white-space:normal; overflow-wrap:anywhere; }
.results { border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-md); background:color-mix(in srgb, var(--nd-bg-card) 88%, transparent); max-height:560px; overflow:auto; }
.empty { padding:24px; text-align:center; color:var(--nd-fg-mute); font-size:12px; }
.row { display:grid; grid-template-columns:32px minmax(0,1fr) auto; gap:10px; padding:12px; border-bottom:1px solid var(--nd-border-soft); align-items:start; transition:background .15s,border-color .15s; cursor:pointer; }
.row:hover { background:var(--nd-bg-soft); }
.select-cell { display:flex; align-items:flex-start; justify-content:center; padding-top:2px; }
.select-cell input[type="checkbox"] { width:16px; height:16px; min-width:0; margin:0; accent-color:var(--nd-accent); cursor:pointer; }
.row:last-child { border-bottom:none; } .name { font-weight:700; color:var(--nd-fg-strong); } .sub { color:var(--nd-fg-mute); font-size:11px; margin-top:2px; }
.chip { display:inline-block; margin:4px 4px 0 0; padding:1px 6px; border-radius:var(--nd-r-pill); background:var(--nd-bg-soft); color:var(--nd-fg-mute); font-size:10px; }
pre.preview { white-space:pre-wrap; word-break:break-word; max-height:260px; overflow:auto; margin:8px 0 0; padding:9px; background:var(--nd-bg-code); border:1px solid var(--nd-border-soft); border-radius:var(--nd-r-sm); font-size:11px; }
@media (max-width: 780px) { .ib-shell { width:calc(100vw - 24px); padding-top:12px; } .ib-hero,.connection-strip { flex-direction:column; align-items:stretch; } .ib-hero-actions { justify-content:flex-start; } .ib-workbench { grid-template-columns:1fr; } .mode-tabs { position:static; flex-direction:row; overflow-x:auto; } .mode-tabs button { min-width:132px; } }
@media (max-width: 560px) { .toolbar,.actions { align-items:flex-start; } .grow { display:none; } input { min-width:150px; } .mode-panel { padding:12px; } .row { grid-template-columns:28px minmax(0,1fr); } .row > div:last-child { grid-column:2; } }
`;
}

function script(): string {
    return `
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
const state = { sources: [], selected: new Map(), mode: 'browse', busy: {} };
function post(msg){ vscode.postMessage(msg); }
function showError(msg){ const el=$('errorBanner'); el.style.display=msg?'block':'none'; el.textContent=msg||''; }
function setBusy(target,message){ if(message) state.busy[target]=message; else delete state.busy[target]; const messages=Object.values(state.busy).filter(Boolean); const banner=$('busyBanner'); const text=$('busyText'); if(!banner||!text) return; banner.style.display=messages.length?'flex':'none'; text.textContent=messages[0]||''; }
function setMode(mode){ state.mode=mode; document.querySelectorAll('.mode-panel').forEach(p=>p.classList.toggle('active', p.id==='mode-'+mode)); document.querySelectorAll('.mode-tabs button').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode)); }
function setAliasBadge(alias){ const b=$('aliasBadge'); b.className='badge ok'; b.textContent=alias ? 'Alias: '+alias : 'Auth alias'; }
function selectedFor(prefix){ return [...state.selected.values()].filter(x=>x.bucket===prefix); }
function dependencyScope(selectId){ const value=$(selectId).value; return value === '*' ? 'global' : value; }
function updateButtons(){ const map={browse:['addBrowse','browseCount'],discover:['addDiscover','discoverCount'],guidelines:['addGuidelines','guidelineCount']}; Object.entries(map).forEach(([k,[btn,count]])=>{ const n=selectedFor(k).length; $(btn).disabled=n===0; $(count).textContent=n? n+' selected':'No items selected'; }); }
function renderSavedGuidelines(articles){ const el=$('savedGuidelines'); if(!el) return; if(!articles||!articles.length){ el.textContent='No KB-backed guidelines saved yet.'; return; } el.innerHTML='Saved guidelines: '+articles.map(a=>esc((a.number?a.number+': ':'')+(a.title||a.sysId))).join(' · '); }
function renderOptions(select, items, valueKey='key', labelKey='label'){ select.innerHTML=items.map(x=>'<option value="'+esc(x[valueKey])+'">'+esc(x[labelKey])+'</option>').join(''); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderRows(target, items, bucket){
    if(!items.length){ $(target).className='results empty'; $(target).textContent='No results.'; return; }
    $(target).className='results';
    $(target).innerHTML=items.map((item,i)=>'<div class="row" data-i="'+i+'"><label class="select-cell" title="Select"><input type="checkbox" data-bucket="'+bucket+'" data-i="'+i+'"></label><div><div class="name">'+esc(item.name||item.sysId)+'</div><div class="sub">'+esc(item.subtitle||'')+'</div><span class="chip">'+esc(item.label)+'</span><span class="chip">'+esc(item.scope||'no scope')+'</span>'+(item.score?'<span class="chip">score '+item.score+'</span>':'')+'<div id="preview-'+bucket+'-'+i+'"></div></div><div>'+(item.hasPreview?'<button data-preview="'+bucket+'" data-i="'+i+'">Preview</button>':'')+'</div></div>').join('');
    $(target).querySelectorAll('input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{ const item=items[Number(cb.dataset.i)]; const id=cb.dataset.bucket+':'+item.sysId; if(cb.checked) state.selected.set(id,{...item,bucket:cb.dataset.bucket}); else state.selected.delete(id); updateButtons(); }));
    $(target).querySelectorAll('.row').forEach(row=>row.addEventListener('click',(event)=>{ if(event.target.closest('button')||event.target.closest('input')) return; const cb=row.querySelector('input[type=checkbox]'); if(!cb) return; cb.checked=!cb.checked; cb.dispatchEvent(new Event('change',{bubbles:true})); }));
    $(target).querySelectorAll('button[data-preview]').forEach(btn=>btn.addEventListener('click',()=>{ const item=items[Number(btn.dataset.i)]; post({type:'preview',source:item.source,sysId:item.sysId,previewId:'preview-'+btn.dataset.preview+'-'+btn.dataset.i}); }));
}
function keywordsFromTask(){ const stop=new Set('the a an and or for to of in on with from this that need want create update build service servicenow instance record table field user'.split(' ')); return $('taskText').value.toLowerCase().replace(/[^a-z0-9_\s-]/g,' ').split(/\s+/).filter(x=>x.length>2&&!stop.has(x)).slice(0,10).join(', '); }
document.querySelectorAll('.mode-tabs button').forEach(b=>b.addEventListener('click',()=>{ setMode(b.dataset.mode); if(b.dataset.mode==='current') post({type:'refreshCurrent'}); }));
$('aliasSelect').addEventListener('change',e=>{ post({type:'selectAlias',alias:e.target.value}); const opt=e.target.selectedOptions[0]; $('hostHint').textContent=opt?.dataset.host||''; setAliasBadge(e.target.value); });
$('packageSelect').addEventListener('change',e=>post({type:'selectPackage',path:e.target.value})); $('openConfigBtn').onclick=()=>post({type:'openConfigFile'}); $('runDeps').onclick=()=>{ setBusy('current','Downloading dependency types...'); post({type:'runDependenciesCmd'}); }; $('refreshCurrent').onclick=()=>post({type:'refreshCurrent'});
$('browseSearch').onclick=()=>{ setBusy('browse','Searching records...'); post({type:'search',source:$('browseSource').value,scope:$('browseScope').value,term:$('browseTerm').value}); };
$('taskText').addEventListener('input',()=>{ if(!$('keywords').value) $('keywords').value=keywordsFromTask(); });
$('runDiscover').onclick=()=>{ setBusy('discover','Discovering related context...'); post({type:'discover',sources:[...document.querySelectorAll('#discoverSources input:checked')].map(x=>x.value),scope:$('discoverScope').value,keywords:$('keywords').value.split(',').map(x=>x.trim()).filter(Boolean),limit:Number($('discoverLimit').value)}); };
$('searchGuidelines').onclick=()=>{ setBusy('guidelines','Searching Knowledge articles...'); post({type:'search',source:'knowledge',scope:$('guidelineScope').value,term:$('guidelineTerm').value}); };
$('addBrowse').onclick=()=>{ setBusy('browse','Adding dependencies...'); post({type:'addSelected',scope:dependencyScope('browseScope'),items:selectedFor('browse').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('addDiscover').onclick=()=>{ setBusy('discover','Adding context dependencies...'); post({type:'addSelected',scope:dependencyScope('discoverScope'),items:selectedFor('discover').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('addGuidelines').onclick=()=>{ setBusy('guidelines','Saving selected KB articles as guidelines...'); post({type:'saveGuidelines',items:selectedFor('guidelines').map(x=>({source:x.source,sysId:x.sysId}))}); };
$('clearGuidelines').onclick=()=>{ setBusy('guidelines','Clearing saved guidelines...'); post({type:'clearGuidelines'}); };
window.addEventListener('message',ev=>{ const msg=ev.data; showError(''); if(msg.type==='error'){ setBusy('browse',''); setBusy('discover',''); setBusy('guidelines',''); setBusy('scopes',''); showError(msg.message); } if(msg.type==='init'){ state.sources=msg.sources; renderOptions($('browseSource'),msg.sources); const discover=msg.sources.filter(s=>s.discover); $('discoverSources').innerHTML=discover.map(s=>'<label class="source-option"><input type="checkbox" checked value="'+esc(s.key)+'"><span>'+esc(s.label)+'</span></label>').join(''); renderOptions($('aliasSelect'),msg.aliases.map(a=>({key:a.alias,label:a.alias,host:a.host}))); [...$('aliasSelect').options].forEach((o,i)=>o.dataset.host=msg.aliases[i]?.host||''); if(msg.currentAlias) $('aliasSelect').value=msg.currentAlias; setAliasBadge(msg.currentAlias); $('hostHint').textContent=$('aliasSelect').selectedOptions[0]?.dataset.host||''; renderOptions($('packageSelect'),msg.packages.map(p=>({key:p.path,label:p.name+' '+(p.scope?'('+p.scope+')':'')}))); if(msg.currentPackage) $('packageSelect').value=msg.currentPackage; renderSavedGuidelines(msg.savedGuidelines); setMode(msg.mode||'browse'); }
if(msg.type==='setMode') setMode(msg.mode); if(msg.type==='aliasSelected') setAliasBadge(msg.alias); if(msg.type==='busy') setBusy(msg.target,msg.message); if(msg.type==='scopes'){ setBusy('scopes',''); document.querySelectorAll('.scopeSelect').forEach(sel=>renderOptions(sel,msg.scopes,'scope','scope')); }
if(msg.type==='results'){ const bucket=msg.mode==='discover'?'discover':state.mode==='guidelines'?'guidelines':'browse'; setBusy(bucket,''); renderRows(bucket==='browse'?'browseResults':bucket==='discover'?'discoverResults':'guidelineResults',msg.items,bucket); }
if(msg.type==='progress') $('progress').textContent=(msg.label||msg.source)+' '+msg.status+(msg.count!==undefined?' ('+msg.count+')':''); if(msg.type==='previewLoading'){ const target=msg.previewId?$(msg.previewId):null; if(target) target.innerHTML='<pre class="preview"><span class="spinner"></span> Loading preview...</pre>'; } if(msg.type==='preview'){ const target=msg.previewId?$(msg.previewId):null; if(target) target.innerHTML='<pre class="preview">'+esc(msg.body||'No preview content.')+'</pre>'; }
if(msg.type==='currentDependencies'){ setBusy('current',''); renderCurrent(msg.entries); } if(msg.type==='addResult'){ setBusy('browse',''); setBusy('discover',''); state.selected.clear(); updateButtons(); post({type:'refreshCurrent'}); } if(msg.type==='guidelinesSaved'){ setBusy('guidelines',''); state.selected.clear(); updateButtons(); renderSavedGuidelines(msg.articles); $('guidelineResults').insertAdjacentHTML('afterbegin','<div class="empty">Saved '+msg.count+' KB article(s) as agent guidelines.</div>'); } if(msg.type==='guidelinesCleared'){ setBusy('guidelines',''); state.selected.clear(); updateButtons(); renderSavedGuidelines([]); $('guidelineResults').innerHTML='<div class="empty">KB-backed agent guidelines cleared.</div>'; } });
function renderCurrent(entries){ if(!entries.length){ $('currentDeps').className='results empty'; $('currentDeps').textContent='No dependencies in selected package.'; return; } $('currentDeps').className='results'; $('currentDeps').innerHTML=entries.map((e,i)=>'<div class="row"><span></span><div><div class="name">'+esc(e.table)+'</div><div class="sub">'+esc(e.scope)+' · '+(e.wildcard?'*':e.sysIds.join(', '))+'</div></div><button data-rm="'+i+'">Remove</button></div>').join(''); $('currentDeps').querySelectorAll('button[data-rm]').forEach(btn=>btn.addEventListener('click',()=>{ const e=entries[Number(btn.dataset.rm)]; post({type:'removeDependency',scope:e.scope,table:e.table,sysId:e.wildcard?'*':e.sysIds[0]}); })); }
`;
}