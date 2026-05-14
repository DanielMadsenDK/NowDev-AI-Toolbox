import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ScriptDependencyAnalyzer
 *
 * Scans open ServiceNow script files for references to Script Includes and
 * other external artifacts, then:
 *  - Pushes VS Code Diagnostics (warning) for references not found locally
 *  - Provides Code Lenses with "Fetch from instance" labels
 *  - Provides Code Action quick-fixes to open the Context Scanner
 *  - Fires an event so the sidebar can display active-file context
 */

// ── Built-in Glide / JS classes to exclude from detection ──────────────────

const BUILTIN_CLASSES = new Set([
    // JavaScript built-ins
    'Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError',
    'Float32Array', 'Float64Array', 'Function', 'Int8Array', 'Int16Array',
    'Int32Array', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise',
    'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set',
    'String', 'Symbol', 'SyntaxError', 'TypeError', 'URIError', 'Uint8Array',
    'Uint16Array', 'Uint32Array', 'WeakMap', 'WeakRef', 'WeakSet',
    // ServiceNow Glide core
    'GlideRecord', 'GlideRecordSecure', 'GlideRecordUtil',
    'GlideDateTime', 'GlideDate', 'GlideDuration', 'GlideTime',
    'GlideCalendarDateTime', 'GlideSchedule', 'GlideScheduleDateTime',
    'GlideScheduleTimeMap',
    'GlideElement', 'GlideElementDescriptor',
    'GlideSystem', 'GlideUser',
    'GlideForm', 'GlideQueryCondition', 'GlideAggregate',
    'GlideAjax', 'GlideScopedEvaluator', 'GlideStringUtil',
    'GlideEncrypter', 'GlideDigest', 'GlideCertificateEncryption',
    'GlideTableHierarchy', 'GlideTableDescriptor',
    'GlideServletRequest', 'GlideServletResponse',
    'GlideSysAttachment', 'GlideExcelParser', 'GlideEmailOutbound',
    'GlideAbstractNowScript', 'GlidePluginManager', 'GlideSecureRandomUtil',
    'GlideAppProperties',
    // ServiceNow REST / SOAP
    'RESTAPIRequest', 'RESTAPIResponse', 'RESTAPIRequestBody',
    'RESTMessageV2', 'RESTResponseV2', 'SOAPMessageV2', 'SOAPResponseV2',
    // Flow Designer
    'FlowAPI', 'FlowScriptAPI', 'Action', 'Subflow',
    // XML / misc
    'XMLDocument2', 'XMLNode', 'XMLNodeIterator',
    'AbstractAjaxProcessor', 'Class',
    // Namespaces (lowercase, but guard against user typos)
    'gs', 'current', 'previous', 'answer', 'action', 'workflow',
    'sn_ws', 'sn_sc', 'sn_fd', 'sn_notify', 'sn_pdfgenerator',
    'sn_cs', 'sn_auth', 'sn_cmdbapi', 'sn_devstudio', 'sn_hr_core',
    // TypeScript / React common names
    'React', 'Component', 'useState', 'useEffect', 'useRef',
    'console', 'process', 'Buffer', 'URL', 'URLSearchParams',
    // ServiceNow SDK Fluent types (imported via #now: — handled separately)
    'Now',
]);

// ── Public types ────────────────────────────────────────────────────────────

export type LocalStatus = 'available' | 'missing';

export interface ScriptReference {
    name: string;
    line: number;
    col: number;
    context: 'instantiation' | 'static-call' | 'glideajax' | 'include';
    localStatus: LocalStatus;
}

// ── Extraction helpers ──────────────────────────────────────────────────────

const PATTERNS = [
    // new ScriptIncludeName( or new ScriptIncludeName.something(
    { re: /\bnew\s+([A-Z][A-Za-z0-9_]*)\s*(?:\.\s*[A-Za-z0-9_]+\s*)?\(/g, context: 'instantiation' as const },
    // ScriptIncludeName.someMethod( — only triggers on identifiers starting uppercase
    // Negative lookbehind for . to avoid `Foo.Bar.baz(` double-matching
    { re: /(?<![.\w])([A-Z][A-Za-z0-9_]+)\.[a-z_$][A-Za-z0-9_$]*\s*\(/g, context: 'static-call' as const },
    // new GlideAjax('ScriptIncludeName')
    { re: /\bnew\s+GlideAjax\s*\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"](?:\s*,|\s*\))/g, context: 'glideajax' as const },
    // gs.include('ScriptIncludeName')
    { re: /\bgs\s*\.\s*include\s*\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"](?:\s*,|\s*\))/g, context: 'include' as const },
];

function extractReferences(text: string, lines: string[]): Array<Omit<ScriptReference, 'localStatus'>> {
    const seen = new Map<string, Omit<ScriptReference, 'localStatus'>>();

    for (const { re, context } of PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const name = m[1];
            if (!name || BUILTIN_CLASSES.has(name)) { continue; }
            // Skip all-uppercase names (constants like MAX_SIZE)
            if (name === name.toUpperCase()) { continue; }
            // Skip single-char names
            if (name.length < 2) { continue; }
            // Record first occurrence only (deduplicate)
            if (seen.has(name)) { continue; }
            // Calculate line/col
            const offset = m.index;
            let charsSeen = 0;
            let lineIdx = 0;
            for (let i = 0; i < lines.length; i++) {
                if (charsSeen + lines[i].length + 1 > offset) { lineIdx = i; break; }
                charsSeen += lines[i].length + 1;
            }
            const col = offset - charsSeen;
            seen.set(name, { name, line: lineIdx, col, context });
        }
    }
    return [...seen.values()];
}

// ── Public extraction helper ────────────────────────────────────────────────

/**
 * Extracts the names of Script Includes (and other callable artifacts) referenced
 * in a ServiceNow script body. Works regardless of the calling artifact type —
 * Business Rules, Client Scripts, UI Actions, and other Script Includes all
 * use the same `new ClassName()` / `ClassName.method()` patterns.
 *
 * @returns Array of unique artifact names, built-ins excluded.
 */
export function extractScriptDependencies(script: string): string[] {
    const lines = script.split('\n');
    const refs = extractReferences(script, lines);
    return [...new Set(refs.map(r => r.name))];
}

// ── Local availability check ────────────────────────────────────────────────

/**
 * Tries to determine if a Script Include is available in the local workspace.
 * Checks, in order:
 *  1. `@types/servicenow/script-includes.server.d.ts`  (after `now-sdk dependencies --type-defs-only`)
 *  2. Any workspace `.d.ts` file under `@types/servicenow/` that declares the name
 */
export function checkLocalStatus(name: string, fromFilePath: string): LocalStatus {
    // Walk up to find the project root (containing @types/servicenow or package.json)
    const root = findProjectRoot(fromFilePath);
    if (!root) { return 'missing'; }

    const typesDir = path.resolve(root, '@types', 'servicenow');
    // Guard: typesDir must be a subdirectory of root (prevent path traversal)
    if (!typesDir.startsWith(path.resolve(root) + path.sep)) { return 'missing'; }
    if (!fs.existsSync(typesDir)) { return 'missing'; }

    // Check the primary file first
    const primaryFile = path.resolve(typesDir, 'script-includes.server.d.ts');
    if (primaryFile.startsWith(typesDir + path.sep) && fs.existsSync(primaryFile)) {
        try {
            const content = fs.readFileSync(primaryFile, 'utf-8');
            if (containsDeclaration(content, name)) { return 'available'; }
        } catch { /* ignore */ }
    }

    // Walk @types/servicenow for any .d.ts that declares the name
    try {
        for (const entry of fs.readdirSync(typesDir, { withFileTypes: true })) {
            if (!entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.now.ts')) { continue; }
            // Sanitize: entry.name must not contain path separators or dot-dot segments
            if (entry.name.includes('/') || entry.name.includes('\\') || entry.name.includes('..')) { continue; }
            const filePath = path.resolve(typesDir, entry.name);
            // Guard: filePath must remain inside typesDir
            if (!filePath.startsWith(typesDir + path.sep)) { continue; }
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                if (containsDeclaration(content, name)) { return 'available'; }
            } catch { /* ignore */ }
        }
    } catch { /* ignore */ }

    return 'missing';
}

function containsDeclaration(content: string, name: string): boolean {
    // Matches: declare class Name, declare var Name, declare const Name,
    //          declare function Name, interface Name, type Name =
    return new RegExp(
        `(?:declare\\s+(?:class|var|const|function|namespace)|interface|type)\\s+${escapeRegex(name)}\\b`
    ).test(content);
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findProjectRoot(filePath: string): string | undefined {
    let dir = path.resolve(path.dirname(filePath));
    for (let i = 0; i < 10; i++) {
        const pkg = path.resolve(dir, 'package.json');
        const cfg = path.resolve(dir, 'now.config.json');
        if (
            (pkg.startsWith(dir + path.sep) || pkg === dir) &&
            (cfg.startsWith(dir + path.sep) || cfg === dir) &&
            (fs.existsSync(pkg) || fs.existsSync(cfg))
        ) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
    }
    // Fall back to first workspace folder
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function isServiceNowScript(doc: vscode.TextDocument): boolean {
    if (doc.uri.scheme !== 'file') { return false; }
    const lang = doc.languageId;
    if (lang !== 'javascript' && lang !== 'typescript') { return false; }
    // Skip obviously non-ServiceNow files
    const p = doc.uri.fsPath;
    if (p.includes('node_modules')) { return false; }
    if (p.endsWith('.test.ts') || p.endsWith('.spec.ts') ||
        p.endsWith('.test.js') || p.endsWith('.spec.js')) { return false; }
    // VS Code extension files
    if (p.includes('extensions') && p.includes('github.copilot')) { return false; }
    return true;
}

// ── Code Lens provider ──────────────────────────────────────────────────────

export class ScriptDepCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(private readonly _analyzer: ScriptDependencyAnalyzer) {
        _analyzer.onContextChanged(() => this._onDidChangeCodeLenses.fire());
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        if (!isServiceNowScript(document)) { return []; }
        const refs = this._analyzer.getCachedRefs(document.uri);
        const lenses: vscode.CodeLens[] = [];
        for (const ref of refs) {
            if (ref.localStatus !== 'missing') { continue; }
            const line = document.lineAt(ref.line);
            const range = new vscode.Range(ref.line, 0, ref.line, line.text.length);
            lenses.push(new vscode.CodeLens(range, {
                title: `$(cloud-download) "${ref.name}" — not in workspace · Fetch from instance`,
                command: 'nowdev-ai-toolbox.fetchScriptDependency',
                arguments: [ref.name],
                tooltip: `Open Instance Context Scanner to fetch "${ref.name}" from your ServiceNow instance`,
            }));
        }
        return lenses;
    }
}

// ── Code Action provider ────────────────────────────────────────────────────

const DIAG_CODE = 'missing-script-dep';

export class ScriptDepCodeActionProvider implements vscode.CodeActionProvider {
    constructor(private readonly _analyzer: ScriptDependencyAnalyzer) {}

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        for (const diag of context.diagnostics) {
            if ((diag.code as any)?.value !== DIAG_CODE) { continue; }
            const match = diag.message.match(/"([^"]+)"/);
            const name = match?.[1];
            if (!name) { continue; }
            const fix = new vscode.CodeAction(
                `$(cloud-download) Fetch "${name}" from instance`,
                vscode.CodeActionKind.QuickFix
            );
            fix.command = {
                title: `Fetch "${name}" from instance`,
                command: 'nowdev-ai-toolbox.fetchScriptDependency',
                arguments: [name],
            };
            fix.diagnostics = [diag];
            fix.isPreferred = true;
            actions.push(fix);
        }
        return actions;
    }
}

// ── Main analyzer class ─────────────────────────────────────────────────────

export class ScriptDependencyAnalyzer implements vscode.Disposable {
    private readonly _diagnostics: vscode.DiagnosticCollection;
    private readonly _refCache = new Map<string, ScriptReference[]>();
    private readonly _subs: vscode.Disposable[] = [];

    private readonly _onContextChanged = new vscode.EventEmitter<{
        uri: vscode.Uri;
        refs: ScriptReference[];
        fileName: string;
    }>();
    readonly onContextChanged = this._onContextChanged.event;

    constructor(context: vscode.ExtensionContext) {
        this._diagnostics = vscode.languages.createDiagnosticCollection('nowdev-script-deps');
        context.subscriptions.push(this._diagnostics, this._onContextChanged);

        const selector: vscode.DocumentSelector = [
            { language: 'javascript' },
            { language: 'typescript' },
        ];

        const codeLensProvider = new ScriptDepCodeLensProvider(this);
        const codeActionProvider = new ScriptDepCodeActionProvider(this);

        this._subs.push(
            vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
            vscode.languages.registerCodeActionsProvider(selector, codeActionProvider, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
            }),
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) { this.analyzeDocument(editor.document); }
                else { this._onContextChanged.fire({ uri: vscode.Uri.parse(''), refs: [], fileName: '' }); }
            }),
            vscode.workspace.onDidSaveTextDocument(doc => this.analyzeDocument(doc)),
            vscode.workspace.onDidOpenTextDocument(doc => this.analyzeDocument(doc)),
        );

        context.subscriptions.push(...this._subs);

        // Analyze the current active editor on activation
        if (vscode.window.activeTextEditor) {
            setTimeout(() => {
                if (vscode.window.activeTextEditor) {
                    this.analyzeDocument(vscode.window.activeTextEditor.document);
                }
            }, 500);
        }
    }

    /** Run analysis on a document and update diagnostics + cache. */
    analyzeDocument(doc: vscode.TextDocument): ScriptReference[] {
        if (!isServiceNowScript(doc)) {
            // Clear diagnostics for non-script files
            this._diagnostics.delete(doc.uri);
            return [];
        }

        const text = doc.getText();
        const lines = text.split('\n');
        const rawRefs = extractReferences(text, lines);

        const refs: ScriptReference[] = rawRefs.map(r => ({
            ...r,
            localStatus: checkLocalStatus(r.name, doc.uri.fsPath),
        }));

        this._refCache.set(doc.uri.toString(), refs);

        // Build diagnostics for missing references
        const diags: vscode.Diagnostic[] = [];
        for (const ref of refs) {
            if (ref.localStatus !== 'missing') { continue; }
            const lineText = doc.lineAt(ref.line).text;
            const nameIdx = lineText.indexOf(ref.name, ref.col > 0 ? ref.col - 1 : 0);
            const startCol = nameIdx >= 0 ? nameIdx : ref.col;
            const range = new vscode.Range(ref.line, startCol, ref.line, startCol + ref.name.length);

            const diag = new vscode.Diagnostic(
                range,
                `Script Include "${ref.name}" is not available locally. Fetch it from the instance to enable type checking and richer agent context.`,
                vscode.DiagnosticSeverity.Warning
            );
            diag.source = 'NowDev';
            diag.code = { value: DIAG_CODE, target: vscode.Uri.parse('https://github.com/DanielMadsenDK/NowDev-AI-Toolbox') };
            diags.push(diag);
        }
        this._diagnostics.set(doc.uri, diags);

        this._onContextChanged.fire({
            uri: doc.uri,
            refs,
            fileName: path.basename(doc.uri.fsPath),
        });
        return refs;
    }

    /** Returns cached analysis results for a URI (from last analyzeDocument call). */
    getCachedRefs(uri: vscode.Uri): ScriptReference[] {
        return this._refCache.get(uri.toString()) ?? [];
    }

    dispose(): void {
        for (const d of this._subs) { d.dispose(); }
        this._diagnostics.dispose();
        this._onContextChanged.dispose();
    }
}
