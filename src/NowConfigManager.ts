import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads, writes, and watches `now.config.json` for dependency management.
 *
 * Per the SDK CLI `dependencies --add` command, dependencies are stored under
 * `dependencies[<scope>][<table>]` as an array of sys_ids (or the wildcard
 * string `"*"`). The SDK CLI has no `--remove` flag, so removals are written
 * directly to the JSON file by this module.
 */

export interface NowConfig {
    name?: string;
    scope?: string;
    scopeId?: string;
    version?: string;
    dependencies?: Record<string, Record<string, string[] | '*'>>;
    [key: string]: unknown;
}

export interface DependencyEntry {
    scope: string;
    table: string;
    sysIds: string[];
    /** true when the entry is the wildcard `"*"`. */
    wildcard: boolean;
}

export interface NowConfigPackage {
    /** Absolute path to the now.config.json file. */
    configPath: string;
    /** Absolute path to the directory containing the file. */
    packageDir: string;
    config: NowConfig;
}

/** Locates all `now.config.json` files in the workspace. */
export function findNowConfigs(): NowConfigPackage[] {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return []; }
    const found: NowConfigPackage[] = [];
    for (const folder of folders) {
        walk(folder.uri.fsPath, found, 0);
    }
    return found;
}

function walk(dir: string, out: NowConfigPackage[], depth: number): void {
    if (depth > 4) { return; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    const file = entries.find(e => e.isFile() && e.name === 'now.config.json');
    if (file) {
        const configPath = path.join(dir, 'now.config.json');
        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            out.push({ configPath, packageDir: dir, config: JSON.parse(raw) });
        } catch { /* ignore parse errors */ }
        // Don't descend into a package once we found its config — its node_modules etc. are not interesting.
        return;
    }

    for (const e of entries) {
        if (!e.isDirectory()) { continue; }
        if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'out' || e.name === 'build') { continue; }
        walk(path.join(dir, e.name), out, depth + 1);
    }
}

/**
 * Picks the active package. If only one config exists, returns it directly.
 * If multiple exist, prompts the user via QuickPick. Returns undefined on cancel.
 */
export async function pickNowConfig(): Promise<NowConfigPackage | undefined> {
    const all = findNowConfigs();
    if (all.length === 0) {
        vscode.window.showWarningMessage('No now.config.json found in the workspace. Initialize a Fluent project first.');
        return undefined;
    }
    if (all.length === 1) { return all[0]; }
    const pick = await vscode.window.showQuickPick(
        all.map(p => ({
            label: p.config.name ?? path.basename(p.packageDir),
            description: p.config.scope ?? '',
            detail: p.configPath,
            pkg: p,
        })),
        { placeHolder: 'Select the package to manage dependencies for' }
    );
    return pick?.pkg;
}

/** Returns flattened dependency entries for the given config. */
export function getDependencies(config: NowConfig): DependencyEntry[] {
    const out: DependencyEntry[] = [];
    const deps = config.dependencies ?? {};
    for (const [scope, tables] of Object.entries(deps)) {
        if (!tables || typeof tables !== 'object') { continue; }
        for (const [table, value] of Object.entries(tables)) {
            if (value === '*') {
                out.push({ scope, table, sysIds: [], wildcard: true });
            } else if (Array.isArray(value)) {
                out.push({ scope, table, sysIds: value.slice(), wildcard: false });
            }
        }
    }
    return out;
}

/**
 * Removes a single sys_id (or the entire wildcard) from a dependency bucket.
 * If the bucket becomes empty, the table key is deleted; if the scope becomes
 * empty, the scope key is deleted as well.
 */
export function removeDependency(pkg: NowConfigPackage, scope: string, table: string, sysId: string | '*'): void {
    const config = pkg.config;
    const deps = config.dependencies;
    if (!deps?.[scope]?.[table]) { return; }
    const bucket = deps[scope][table];
    if (sysId === '*' || bucket === '*') {
        delete deps[scope][table];
    } else if (Array.isArray(bucket)) {
        const idx = bucket.indexOf(sysId);
        if (idx >= 0) { bucket.splice(idx, 1); }
        if (bucket.length === 0) { delete deps[scope][table]; }
    }
    if (deps[scope] && Object.keys(deps[scope]).length === 0) {
        delete deps[scope];
    }
    if (Object.keys(deps).length === 0) {
        delete config.dependencies;
    }
    writeConfig(pkg);
}

/** Persists the in-memory config back to disk with stable formatting. */
export function writeConfig(pkg: NowConfigPackage): void {
    const json = JSON.stringify(pkg.config, null, 2) + '\n';
    fs.writeFileSync(pkg.configPath, json, 'utf-8');
}

/** Re-reads the config file from disk into the package. */
export function reloadConfig(pkg: NowConfigPackage): NowConfigPackage {
    const raw = fs.readFileSync(pkg.configPath, 'utf-8');
    return { ...pkg, config: JSON.parse(raw) };
}
