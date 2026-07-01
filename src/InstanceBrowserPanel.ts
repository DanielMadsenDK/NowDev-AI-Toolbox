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
import {
    SOURCES,
    buildQuery,
    scoreRecord,
    normalizeRecord,
    getDisplay,
    unique,
    stripHtml,
} from './instanceBrowser/sources';
import { markup, styles, script } from './instanceBrowser/webview';

type BrowserMode = 'browse' | 'discover' | 'guidelines' | 'current';

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
