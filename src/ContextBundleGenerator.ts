import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { extractScriptDependencies, checkLocalStatus } from './ScriptDependencyAnalyzer';

/**
 * ContextBundleGenerator
 *
 * Scans workspace ServiceNow script files (JS/TS), detects their Script Include
 * dependencies (regardless of whether the file is a Business Rule, Client Script,
 * UI Action, or Script Include itself), and assembles everything into a Markdown
 * "context bundle" suitable for pasting into an AI agent conversation.
 */

// Tables whose scripts we want to include by default
const SCRIPT_EXTENSIONS = ['.js', '.ts'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.vscode', 'out', 'build', 'dist', 'media']);

interface ScriptFile {
    filePath: string;
    relPath: string;
    content: string;
    deps: Array<{ name: string; status: 'available' | 'missing' }>;
}

function collectScriptFiles(dir: string, root: string, results: string[]): void {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) { continue; }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectScriptFiles(full, root, results);
        } else if (
            entry.isFile() &&
            SCRIPT_EXTENSIONS.some(ext => entry.name.endsWith(ext)) &&
            !entry.name.endsWith('.d.ts') &&
            !entry.name.endsWith('.d.now.ts')
        ) {
            results.push(full);
        }
    }
}

export async function generateContextBundle(context: vscode.ExtensionContext): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    // Collect all candidate script files
    const root = folders[0].uri.fsPath;
    const allFiles: string[] = [];
    for (const folder of folders) {
        collectScriptFiles(folder.uri.fsPath, folder.uri.fsPath, allFiles);
    }

    if (allFiles.length === 0) {
        vscode.window.showWarningMessage('No JavaScript or TypeScript files found in workspace.');
        return;
    }

    // Present multi-select QuickPick
    const items: vscode.QuickPickItem[] = allFiles.map(f => ({
        label: path.relative(root, f),
        description: f,
        picked: true,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Select scripts to include  (${allFiles.length} found)`,
        title: 'Generate ServiceNow Script Context Bundle',
    });
    if (!selected || selected.length === 0) { return; }

    // Analyse selected files
    const scriptFiles: ScriptFile[] = [];
    const allMissing = new Set<string>();

    for (const item of selected) {
        const filePath = item.description!;
        const relPath = item.label;
        let content = '';
        try { content = fs.readFileSync(filePath, 'utf-8'); } catch { continue; }

        const depNames = extractScriptDependencies(content);
        const deps = depNames.map(name => {
            const status = checkLocalStatus(name, filePath);
            if (status === 'missing') { allMissing.add(name); }
            return { name, status };
        });

        scriptFiles.push({ filePath, relPath, content, deps });
    }

    // Build Markdown
    const lines: string[] = [];
    lines.push('# ServiceNow Script Context Bundle');
    lines.push('');
    lines.push(`> Generated: ${new Date().toLocaleString()}`);
    lines.push(`> Files: ${scriptFiles.length}`);
    lines.push('');
    lines.push('---');

    // Quick summary table
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| File | Script Dependencies |');
    lines.push('|------|---------------------|');
    for (const sf of scriptFiles) {
        const depSummary = sf.deps.length === 0
            ? '—'
            : sf.deps.map(d => `\`${d.name}\`${d.status === 'missing' ? ' ⚠' : ' ✓'}`).join(', ');
        lines.push(`| \`${sf.relPath}\` | ${depSummary} |`);
    }
    lines.push('');
    lines.push('---');

    // Per-file sections
    for (const sf of scriptFiles) {
        lines.push('');
        lines.push(`## \`${sf.relPath}\``);
        lines.push('');

        if (sf.deps.length > 0) {
            const available = sf.deps.filter(d => d.status === 'available').map(d => `\`${d.name}\``);
            const missing = sf.deps.filter(d => d.status === 'missing').map(d => `\`${d.name}\``);
            if (available.length) {
                lines.push(`**Dependencies (available locally):** ${available.join(', ')}`);
            }
            if (missing.length) {
                lines.push(`**Dependencies (⚠ missing — fetch from instance):** ${missing.join(', ')}`);
            }
            lines.push('');
        }

        const ext = path.extname(sf.filePath).replace('.', '') || 'javascript';
        lines.push('```' + ext);
        lines.push(sf.content);
        lines.push('```');
        lines.push('');
    }

    // Missing-deps summary
    if (allMissing.size > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## ⚠ Missing Dependencies');
        lines.push('');
        lines.push(
            'These Script Includes were referenced by the scripts above but are not available ' +
            'locally. Use the **Instance Context Scanner** or **Dependency Picker** to fetch them.'
        );
        lines.push('');
        for (const name of [...allMissing].sort()) {
            lines.push(`- \`${name}\``);
        }
        lines.push('');
    }

    const markdown = lines.join('\n');
    const doc = await vscode.workspace.openTextDocument({
        content: markdown,
        language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
}
