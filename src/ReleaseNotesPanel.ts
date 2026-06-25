import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as cp from 'child_process';
import { getSharedPanelStyles } from './SharedPanelStyles';
import { spawnSdk } from './SdkProcess';
import { AllDocSources, GuidelinesConfig } from './WorkspaceAgentManager';

export interface ReleaseNotesOptions {
    auth?: string;
    targetRelease: string;
    includePlugins: boolean;
    includeStoreApps: boolean;
    includeScopes: boolean;
    allDocSources: AllDocSources;
    guidelinesConfig: GuidelinesConfig;
}

interface QuerySpec {
    key: keyof ReleaseNotesInventory['sources'];
    label: string;
    table: string;
    fields: string[];
    query?: string;
    limit: number;
    enabled: boolean;
}

interface SourceResult {
    label: string;
    table: string;
    records: Record<string, unknown>[];
    warning?: string;
}

interface QueryPageResult {
    records: Record<string, unknown>[];
    hasMore: boolean;
    nextOffset?: number;
    warning?: string;
}

interface ReleaseNotesInventory {
    capturedAt: string;
    targetRelease: string;
    authAlias?: string;
    sources: {
        properties: SourceResult;
        plugins: SourceResult;
        storeApps: SourceResult;
        scopes: SourceResult;
    };
    warnings: string[];
}

interface RunState {
    runDir: string;
    inventory?: ReleaseNotesInventory;
    markdown: string;
    generationStatus: 'starting' | 'collecting' | 'generating' | 'complete' | 'fallback' | 'cancelled' | 'error';
    error?: string;
}

let _panel: vscode.WebviewPanel | undefined;
let _controller: ReleaseNotesController | undefined;

export function showReleaseNotesPanel(context: vscode.ExtensionContext, options?: ReleaseNotesOptions): void {
    if (!_panel || !_controller) {
        _panel = vscode.window.createWebviewPanel(
            'nowdev.releaseNotes',
            'Release Notes',
            vscode.ViewColumn.Active,
            { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] }
        );
        _controller = new ReleaseNotesController(_panel, context);
        _panel.onDidDispose(() => { _panel = undefined; _controller = undefined; });
    } else {
        _panel.reveal(undefined, false);
    }

    if (options) {
        void _controller.generate(options);
    } else {
        _controller.showIdle();
    }
}

class ReleaseNotesController {
    private state: RunState | undefined;
    private cancellation: vscode.CancellationTokenSource | undefined;
    private activeProcesses = new Set<cp.ChildProcessWithoutNullStreams>();

    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext
    ) {
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'copyMarkdown' && this.state?.markdown) {
                await vscode.env.clipboard.writeText(this.state.markdown);
                vscode.window.showInformationMessage('Release notes copied to clipboard.');
            }
            if (msg.command === 'openRunFolder' && this.state?.runDir) {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(this.state.runDir));
            }
            if (msg.command === 'stopGeneration') {
                this.cancelGeneration();
            }
        }, undefined, context.subscriptions);
        this.showIdle();
    }

    showIdle(): void {
        this.panel.webview.html = this.renderHtml({
            runDir: '',
            markdown: '',
            generationStatus: 'starting',
        });
    }

    async generate(options: ReleaseNotesOptions): Promise<void> {
        this.cancelGeneration();
        this.cancellation = new vscode.CancellationTokenSource();
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            this.panel.webview.html = this.renderHtml({ runDir: '', markdown: '', generationStatus: 'error', error: 'Open a workspace folder before generating release notes.' });
            return;
        }

        const runDir = this.createRunDir(workspaceRoot);
        this.state = { runDir, markdown: '', generationStatus: 'collecting' };
        this.panel.webview.html = this.renderHtml(this.state);

        try {
            this.throwIfCancelled();
            const inventory = await this.collectInventory(options);
            this.throwIfCancelled();
            this.state = { ...this.state, inventory, generationStatus: 'generating' };
            this.writeRunFile(runDir, 'inventory.json', JSON.stringify(inventory, null, 2));
            const prompt = this.buildPrompt(options, inventory);
            this.writeRunFile(runDir, 'generation-prompt.md', prompt);
            this.writeLatestPointer(workspaceRoot, runDir, options);
            this.panel.webview.html = this.renderHtml(this.state);

            const markdown = await this.generateMarkdown(prompt, inventory);
            this.throwIfCancelled();
            this.writeRunFile(runDir, 'release-notes.md', markdown);
            this.state = { ...this.state, markdown, generationStatus: 'complete' };
            this.panel.webview.html = this.renderHtml(this.state);
        } catch (err: any) {
            if (isCancellationError(err)) {
                this.state = { ...this.state, runDir, markdown: this.state?.markdown ?? '', generationStatus: 'cancelled', error: 'Generation stopped by user.' };
                this.panel.webview.html = this.renderHtml(this.state);
                return;
            }
            const fallback = this.state?.inventory ? this.buildFallbackMarkdown(this.state.inventory, err?.message ?? String(err)) : '';
            if (fallback) {
                this.writeRunFile(runDir, 'release-notes.md', fallback);
            }
            this.state = {
                runDir,
                inventory: this.state?.inventory,
                markdown: fallback,
                generationStatus: fallback ? 'fallback' : 'error',
                error: err?.message ?? String(err),
            };
            this.panel.webview.html = this.renderHtml(this.state);
        } finally {
            this.cancellation?.dispose();
            this.cancellation = undefined;
            this.activeProcesses.clear();
        }
    }

    private cancelGeneration(): void {
        this.cancellation?.cancel();
        for (const proc of this.activeProcesses) {
            try { proc.kill('SIGTERM'); } catch { /* ignore */ }
        }
        setTimeout(() => {
            for (const proc of this.activeProcesses) {
                try { proc.kill('SIGKILL'); } catch { /* ignore */ }
            }
        }, 1200);
    }

    private throwIfCancelled(): void {
        if (this.cancellation?.token.isCancellationRequested) {
            throw new CancellationError();
        }
    }

    private async collectInventory(options: ReleaseNotesOptions): Promise<ReleaseNotesInventory> {
        const specs: QuerySpec[] = [
            {
                key: 'properties',
                label: 'Instance properties',
                table: 'sys_properties',
                fields: ['name', 'value', 'description'],
                query: 'nameSTARTSWITHglide.war^ORnameSTARTSWITHglide.product^ORname=glide.servlet.uri',
                limit: 50,
                enabled: true,
            },
            {
                key: 'plugins',
                label: 'Installed plugins',
                table: 'sys_plugins',
                fields: ['id', 'name', 'title', 'active', 'version'],
                query: 'active=true',
                limit: 250,
                enabled: options.includePlugins,
            },
            {
                key: 'storeApps',
                label: 'Store applications',
                table: 'sys_store_app',
                fields: ['name', 'scope', 'version', 'assigned_version', 'latest_version', 'update_available', 'vendor', 'install_date', 'sys_updated_on'],
                query: 'sys_idISNOTEMPTY',
                limit: 250,
                enabled: options.includeStoreApps,
            },
            {
                key: 'scopes',
                label: 'Application scopes',
                table: 'sys_scope',
                fields: ['name', 'scope', 'version', 'vendor', 'sys_updated_on'],
                query: 'sys_idISNOTEMPTY',
                limit: 250,
                enabled: options.includeScopes,
            },
        ];

        const sources = {
            properties: await this.emptyResult('Instance properties', 'sys_properties'),
            plugins: await this.emptyResult('Installed plugins', 'sys_plugins'),
            storeApps: await this.emptyResult('Store applications', 'sys_store_app'),
            scopes: await this.emptyResult('Application scopes', 'sys_scope'),
        };

        const warnings: string[] = [];
        for (const spec of specs) {
            this.throwIfCancelled();
            if (!spec.enabled) {
                sources[spec.key] = { label: spec.label, table: spec.table, records: [], warning: 'Skipped by user option.' };
                continue;
            }
            const result = await this.query(spec, options.auth);
            sources[spec.key] = result;
            if (result.warning) { warnings.push(`${spec.label}: ${result.warning}`); }
        }

        return {
            capturedAt: new Date().toISOString(),
            targetRelease: options.targetRelease,
            authAlias: options.auth || undefined,
            sources,
            warnings,
        };
    }

    private async emptyResult(label: string, table: string): Promise<SourceResult> {
        return { label, table, records: [] };
    }

    private async query(spec: QuerySpec, auth?: string): Promise<SourceResult> {
        const records: Record<string, unknown>[] = [];
        let offset = 0;
        let pages = 0;

        while (true) {
            this.throwIfCancelled();
            const page = await this.queryPage(spec, auth, offset);
            records.push(...page.records);

            if (page.warning) {
                const suffix = records.length > 0 ? ` Retrieved ${records.length} record${records.length !== 1 ? 's' : ''} before paging stopped.` : '';
                return { label: spec.label, table: spec.table, records, warning: `${page.warning}${suffix}` };
            }

            pages++;
            if (!page.hasMore) {
                return { label: spec.label, table: spec.table, records };
            }

            const nextOffset = page.nextOffset ?? offset + spec.limit;
            if (nextOffset <= offset) {
                return { label: spec.label, table: spec.table, records, warning: `Paging stopped for ${spec.table} because now-sdk returned a non-advancing offset.` };
            }

            offset = nextOffset;
            if (pages >= 40) {
                return { label: spec.label, table: spec.table, records, warning: `Paging stopped for ${spec.table} after ${pages} pages to avoid an unbounded inventory query.` };
            }
        }
    }

    private queryPage(spec: QuerySpec, auth: string | undefined, offset: number): Promise<QueryPageResult> {
        return new Promise((resolve) => {
            const args = ['query', spec.table, '-q', spec.query || 'sys_idISNOTEMPTY', '-o', 'json', '--limit', String(spec.limit), '--offset', String(offset), '--display-value', 'true'];
            if (spec.fields.length > 0) { args.push('-f', spec.fields.join(',')); }
            if (auth) { args.push('-a', auth); }

            const proc = spawnSdk(args, { timeout: 30000 });
            this.activeProcesses.add(proc);
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf-8'); });
            proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf-8'); });
            proc.on('error', () => {
                this.activeProcesses.delete(proc);
                resolve({ records: [], hasMore: false, warning: 'Failed to run now-sdk.' });
            });
            proc.on('close', (code: number | null) => {
                this.activeProcesses.delete(proc);
                if (this.cancellation?.token.isCancellationRequested) {
                    resolve({ records: [], hasMore: false, warning: 'Query cancelled by user.' });
                    return;
                }
                const raw = stdout.trim();
                const jsonStart = raw.indexOf('{');
                if (!raw || jsonStart < 0) {
                    const output = (stderr.trim() || raw || `now-sdk query exited with ${code}`);
                    const warning = summarizeQueryWarning(output, spec.table);
                    resolve({ records: [], hasMore: false, warning });
                    return;
                }
                try {
                    const envelope = JSON.parse(raw.slice(jsonStart)) as { ok?: boolean; records?: Record<string, unknown>[]; hasMore?: boolean; nextOffset?: number; error?: { message?: string } };
                    if (envelope.ok === false) {
                        resolve({ records: [], hasMore: false, warning: envelope.error?.message ?? summarizeQueryWarning(stderr.trim(), spec.table) ?? 'Query returned ok: false.' });
                        return;
                    }
                    resolve({ records: envelope.records ?? [], hasMore: envelope.hasMore === true, nextOffset: envelope.nextOffset });
                } catch {
                    resolve({ records: [], hasMore: false, warning: `Could not parse now-sdk output: ${raw.slice(0, 250)}` });
                }
            });
        });
    }

    private async generateMarkdown(prompt: string, inventory: ReleaseNotesInventory): Promise<string> {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        const model = models[0] ?? (await vscode.lm.selectChatModels())[0];
        if (!model) {
            return this.buildFallbackMarkdown(inventory, 'No Copilot language model is available in this VS Code session.');
        }

        const response = await model.sendRequest([
            vscode.LanguageModelChatMessage.User(prompt),
        ], {}, this.cancellation?.token);
        let markdown = '';
        for await (const chunk of response.text) {
            this.throwIfCancelled();
            markdown += chunk;
            this.state = this.state ? { ...this.state, markdown, generationStatus: 'generating' } : this.state;
            if (this.state) { this.panel.webview.html = this.renderHtml(this.state); }
        }
        return markdown.trim() || this.buildFallbackMarkdown(inventory, 'The model returned an empty response.');
    }

    private buildPrompt(options: ReleaseNotesOptions, inventory: ReleaseNotesInventory): string {
        const productDocs = options.allDocSources.productDocs;
        const selectedArticles = options.guidelinesConfig.selectedArticles ?? [];
        const docsBranchUrl = `https://github.com/ServiceNow/ServiceNowDocs/tree/${encodeURIComponent(options.targetRelease)}`;
        const displayRelease = formatReleaseName(options.targetRelease);
        return `You are NowDev-AI-ReleaseNotes-Synthesizer. Generate instance-tailored ServiceNow upgrade release notes.\n\nTarget release branch: ${options.targetRelease}\nTarget release display name: ${displayRelease}\nAuthoritative target-release documentation branch: ${docsBranchUrl}\nDocumentation source repository: https://github.com/ServiceNow/ServiceNowDocs\nConfigured product docs release in workspace: ${productDocs.release || '(not selected)'}\nProduct docs source type: ${productDocs.sourceType}\nProduct docs MCP server: ${productDocs.mcpServer || '(none)'}\nProduct docs llms.txt URL: ${productDocs.llmsUrl || '(none)'}\nSelected guideline KB articles: ${selectedArticles.map(a => `${a.number}: ${a.title}`).join('; ') || '(none)'}\n\nRules:\n- Use the selected target release branch as the release-note target and use the display name in headings. Do not treat a different configured workspace docs release as evidence that the target is invalid or older.\n- If configured docs point at another release, mention it only in Sources And Confidence as a configuration note, not as the main conclusion.\n- Base factual inventory statements only on the JSON inventory below.\n- Clearly separate observed instance facts from inferred upgrade risks.\n- Tailor the report to installed plugins, Store apps, and scopes when present.\n- For Store applications, explicitly highlight records where update_available is true, comparing version or assigned_version to latest_version.\n- If the user selected Store apps but not plugins/scopes, focus the report on Store app update attention items rather than broad platform upgrade analysis.\n- If inventory is partial, summarize missing sources briefly without pasting CLI usage text.\n- Produce markdown with exactly these top-level section headings, each using ##: Executive Summary, What's New To Review, Upgrade Risks, Product And Plugin Notes, Validation Plan, Sources And Confidence.\n- Keep each section focused: 1-2 short paragraphs followed by bullets or tables where useful. Do not blend multiple sections into one long narrative.\n- Prefer bullets and concise tables. Avoid fenced markdown blocks unless showing literal commands or JSON.\n- Keep the tone concise, advisory, and suitable for a release manager.\n\nInventory JSON:\n\`\`\`json\n${JSON.stringify(inventory, null, 2)}\n\`\`\`\n`;
    }

    private buildFallbackMarkdown(inventory: ReleaseNotesInventory, reason: string): string {
        const pluginCount = inventory.sources.plugins.records.length;
        const storeAppCount = inventory.sources.storeApps.records.length;
        const scopeCount = inventory.sources.scopes.records.length;
        const warningLines = inventory.warnings.length > 0
            ? inventory.warnings.map(w => `- ${w}`).join('\n')
            : '- No inventory warnings were reported.';
        return `# ServiceNow Upgrade Release Notes\n\n## Executive Summary\n\nTarget release: **${inventory.targetRelease}**. Inventory was captured at ${inventory.capturedAt}. Direct AI synthesis was not completed: ${reason}\n\n## Instance Inventory\n\n- Installed plugins inspected: ${pluginCount}\n- Store applications inspected: ${storeAppCount}\n- Application scopes inspected: ${scopeCount}\n\n## Upgrade Risks\n\nUse the configured ServiceNow release documentation to review changes affecting installed plugins, Store apps, and custom scopes before upgrade testing. Treat this report as a starting point because model synthesis was unavailable.\n\n## Validation Plan\n\n- Review skipped or failed inventory queries below.\n- Confirm the target release documentation source is configured in the References tab.\n- Run smoke tests for custom scopes and Store apps after clone/upgrade preview.\n- Ask the Release Notes Synthesizer agent to regenerate this report from the run artifacts.\n\n## Sources And Confidence\n\n${warningLines}\n`;
    }

    private createRunDir(workspaceRoot: string): string {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const runDir = path.join(workspaceRoot, '.vscode', 'nowdev', 'release-notes', stamp);
        fs.mkdirSync(runDir, { recursive: true });
        return runDir;
    }

    private writeRunFile(runDir: string, fileName: string, content: string): void {
        fs.writeFileSync(path.join(runDir, fileName), content, 'utf-8');
    }

    private writeLatestPointer(workspaceRoot: string, runDir: string, options: ReleaseNotesOptions): void {
        const latestPath = path.join(workspaceRoot, '.vscode', 'nowdev', 'release-notes', 'latest.json');
        fs.mkdirSync(path.dirname(latestPath), { recursive: true });
        fs.writeFileSync(latestPath, JSON.stringify({ runDir, targetRelease: options.targetRelease, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
    }

    private renderHtml(state: RunState): string {
        const nonce = crypto.randomBytes(16).toString('base64');
        const inventory = state.inventory;
        const markdown = state.markdown || '';
        const title = inventory ? `${formatReleaseName(inventory.targetRelease)} release notes` : 'Release notes';
        const badges = inventory ? [
            `${inventory.sources.plugins.records.length} plugins`,
            `${inventory.sources.storeApps.records.length} Store apps`,
            `${inventory.sources.scopes.records.length} scopes`,
        ] : [];
        const warningHtml = inventory && inventory.warnings.length > 0
            ? `<div class="nd-callout release-warning"><strong>Partial inventory</strong><ul>${inventory.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>`
            : '';
        const isRunning = state.generationStatus === 'collecting' || state.generationStatus === 'generating';
        const body = markdown ? renderMarkdown(markdown) : this.renderProgress(state);
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>${getSharedPanelStyles()}${releaseNotesStyles()}</style>
</head>
<body class="nd-transient-panel release-notes-panel">
<header class="release-hero">
  <div>
    <div class="nd-eyebrow">ServiceNow upgrade intelligence</div>
    <h1>${esc(title)}</h1>
    <p>Instance-aware release notes generated from live SDK inventory and configured documentation references.</p>
  </div>
  <div class="release-actions">
        <button class="nd-btn secondary" id="stopGeneration" ${isRunning ? '' : 'disabled'}>Stop</button>
    <button class="nd-btn secondary" id="openRunFolder" ${state.runDir ? '' : 'disabled'}>Open Run Folder</button>
    <button class="nd-btn primary" id="copyMarkdown" ${markdown ? '' : 'disabled'}>Copy Markdown</button>
  </div>
</header>
${badges.length ? `<div class="release-badges">${badges.map(b => `<span class="nd-pill">${esc(b)}</span>`).join('')}</div>` : ''}
${state.error ? `<div class="nd-callout release-error"><strong>Generation note</strong><br>${esc(state.error)}</div>` : ''}
${warningHtml}
<main class="release-report">${body}</main>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
document.getElementById('copyMarkdown')?.addEventListener('click', () => vscode.postMessage({ command: 'copyMarkdown' }));
document.getElementById('openRunFolder')?.addEventListener('click', () => vscode.postMessage({ command: 'openRunFolder' }));
document.getElementById('stopGeneration')?.addEventListener('click', () => vscode.postMessage({ command: 'stopGeneration' }));
</script>
</body>
</html>`;
    }

    private renderProgress(state: RunState): string {
        const labels: Record<RunState['generationStatus'], string> = {
            starting: 'Ready to generate release notes.',
            collecting: 'Collecting installed products, plugins, Store apps, and scopes from the instance...',
            generating: 'Generating tailored release notes...',
            complete: 'Release notes complete.',
            fallback: 'Showing fallback report.',
            cancelled: 'Release note generation stopped.',
            error: 'Could not generate release notes.',
        };
        return `<section class="nd-card release-progress"><div class="release-spinner"></div><div><h2>${esc(labels[state.generationStatus])}</h2><p>This tab will update as inventory and synthesis complete.</p></div></section>`;
    }
}

function renderMarkdown(markdown: string): string {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let inOrderedList = false;
    let inCode = false;
    let sectionOpen = false;
    let codeBuffer: string[] = [];

    const closeLists = () => {
        if (inList) { html += '</ul>'; inList = false; }
        if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    };

    const closeCode = () => {
        if (!inCode) { return; }
        html += `<pre class="codeblock release-code"><code>${esc(codeBuffer.join('\n'))}</code></pre>`;
        codeBuffer = [];
        inCode = false;
    };

    const openSection = (title: string) => {
        closeLists();
        closeCode();
        if (sectionOpen) { html += '</section>'; }
        html += `<section class="release-section"><h2>${esc(title)}</h2>`;
        sectionOpen = true;
    };

    const ensureSection = () => {
        if (!sectionOpen) {
            html += '<section class="release-section release-section-preamble">';
            sectionOpen = true;
        }
    };

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (/^```/.test(line.trim())) {
            if (inCode) {
                closeCode();
            } else {
                closeLists();
                inCode = true;
                codeBuffer = [];
            }
        } else if (inCode) {
            codeBuffer.push(line);
        } else if (isMarkdownTableStart(lines, index)) {
            ensureSection();
            closeLists();
            const table = consumeTable(lines, index);
            html += table.html;
            index += table.linesConsumed - 1;
        } else if (/^###\s+/.test(line)) {
            ensureSection();
            closeLists();
            html += `<h3>${esc(line.replace(/^###\s+/, ''))}</h3>`;
        } else if (/^##\s+/.test(line)) {
            openSection(line.replace(/^##\s+/, ''));
        } else if (/^#\s+/.test(line)) {
            closeLists();
            html += `<h1 class="release-doc-title">${esc(line.replace(/^#\s+/, ''))}</h1>`;
        } else if (/^>\s?/.test(line)) {
            ensureSection();
            closeLists();
            html += `<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`;
        } else if (/^-\s+/.test(line)) {
            ensureSection();
            if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
            if (!inList) { html += '<ul class="release-list">'; inList = true; }
            html += `<li>${inlineMarkdown(line.replace(/^-\s+/, ''))}</li>`;
        } else if (/^\d+\.\s+/.test(line)) {
            ensureSection();
            if (inList) { html += '</ul>'; inList = false; }
            if (!inOrderedList) { html += '<ol class="release-list release-ordered-list">'; inOrderedList = true; }
            html += `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`;
        } else if (line.trim() === '') {
            closeLists();
        } else {
            ensureSection();
            closeLists();
            html += `<p>${inlineMarkdown(line)}</p>`;
        }
    }
    closeCode();
    closeLists();
    if (sectionOpen) { html += '</section>'; }
    return html;
}

function isMarkdownTableStart(lines: string[], index: number): boolean {
    const current = lines[index]?.trim() ?? '';
    const next = lines[index + 1]?.trim() ?? '';
    return current.startsWith('|') && current.endsWith('|') && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function consumeTable(lines: string[], start: number): { html: string; linesConsumed: number } {
    const tableLines: string[] = [];
    for (let index = start; index < lines.length; index++) {
        const line = lines[index].trim();
        if (!line.startsWith('|') || !line.endsWith('|')) { break; }
        tableLines.push(line);
    }
    const headers = splitTableRow(tableLines[0]);
    const rows = tableLines.slice(2).map(splitTableRow).filter(row => row.length > 0);
    const headHtml = headers.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join('');
    const bodyHtml = rows.map(row => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(row[index] ?? '')}</td>`).join('')}</tr>`).join('');
    return {
        html: `<div class="release-table-wrap"><table class="release-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
        linesConsumed: tableLines.length,
    };
}

function splitTableRow(line: string): string[] {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function inlineMarkdown(value: string): string {
    return esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
}

function releaseNotesStyles(): string {
    return `
.release-notes-panel { max-width: 1180px; }
.release-hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 16px; }
.release-hero h1 { font-size: 28px; line-height: 1.15; margin: 6px 0 8px; color: var(--nd-fg-strong); font-weight: 650; letter-spacing: 0; }
.release-hero p { color: var(--nd-fg-mute); max-width: 680px; }
.release-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.release-actions button:disabled { opacity: 0.45; cursor: default; }
.release-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.release-report { display: grid; gap: 18px; }
.release-section { display: grid; gap: 12px; padding: 18px 20px; border: 1px solid var(--nd-border); border-radius: var(--nd-r-md); background: color-mix(in srgb, var(--nd-bg-card) 94%, var(--nd-accent) 6%); box-shadow: var(--nd-shadow-1); }
.release-section h2 { margin: 0 0 2px; padding-bottom: 8px; border-bottom: 1px solid var(--nd-border-soft); color: var(--nd-fg-strong); font-size: 17px; line-height: 1.35; font-weight: 650; letter-spacing: 0; }
.release-section h3 { margin: 6px 0 0; color: var(--nd-fg-strong); font-size: 14px; line-height: 1.35; font-weight: 650; }
.release-section p { margin: 0; color: var(--nd-fg); }
.release-section-preamble { display: none; }
.release-list { margin: 0; padding-left: 24px; }
.release-list li + li { margin-top: 6px; }
.release-ordered-list { padding-left: 34px; }
.release-table-wrap { overflow-x: auto; border: 1px solid var(--nd-border); border-radius: var(--nd-r-md); background: var(--nd-bg-card); }
.release-table { width: 100%; border-collapse: collapse; min-width: 620px; }
.release-table th, .release-table td { text-align: left; vertical-align: top; padding: 9px 11px; border-bottom: 1px solid var(--nd-border-soft); }
.release-table th { color: var(--nd-fg-strong); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; background: color-mix(in srgb, var(--nd-bg-card) 84%, var(--nd-accent) 16%); }
.release-table tr:last-child td { border-bottom: 0; }
.release-table td { color: var(--nd-fg); }
.release-code { margin: 0; white-space: pre-wrap; }
blockquote { margin: 0; padding: 10px 14px; border-left: 3px solid var(--nd-accent); border-radius: 0 var(--nd-r-sm) var(--nd-r-sm) 0; color: var(--nd-fg); background: var(--nd-bg-elevated); }
.release-doc-title { display: none; }
.release-progress { display: flex; gap: 16px; align-items: center; padding: 20px; }
.release-progress h2 { font-size: 16px; margin-bottom: 4px; color: var(--nd-fg-strong); }
.release-progress p { color: var(--nd-fg-mute); }
.release-spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--nd-border); border-top-color: var(--nd-accent); animation: nd-spin 1s linear infinite; }
.release-warning ul { margin: 8px 0 0 18px; }
.release-error { border-left-color: var(--nd-warning); }
@keyframes nd-spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .release-hero { flex-direction: column; } .release-actions { justify-content: flex-start; } }
`;
}

class CancellationError extends Error {
    constructor() {
        super('Generation cancelled.');
    }
}

function isCancellationError(error: unknown): boolean {
    return error instanceof CancellationError || error instanceof vscode.CancellationError;
}

function summarizeQueryWarning(output: string, table: string): string {
    const clean = output.replace(/\s+/g, ' ').trim();
    if (!clean) { return `No data returned for ${table}.`; }
    if (/Query records from a ServiceNow table|Parameters:\s*table|Options:/i.test(clean)) {
        return `now-sdk returned the query help text for ${table}; the table may be unavailable on this instance, blocked by ACLs, or incompatible with the current query options.`;
    }
    return clean.slice(0, 240);
}

function formatReleaseName(branch: string): string {
    return branch
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function esc(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
