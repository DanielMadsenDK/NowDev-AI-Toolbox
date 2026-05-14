import * as vscode from 'vscode';
import * as path from 'path';

/**
 * ChangeWatcher
 *
 * Watches the `@types/servicenow/` directory (populated by `now-sdk dependencies`)
 * for any changes to .d.ts files. When the type definitions update, fires a callback
 * so the Script Dependency Analyzer can re-analyze the active editor and the sidebar
 * can refresh its active-context display.
 *
 * Also maintains a status-bar item showing the last time the local type definitions
 * were refreshed, giving developers a quick visual indicator that their local
 * type definitions are in sync with the instance.
 */
export class ChangeWatcher {
    private readonly _statusBarItem: vscode.StatusBarItem;
    private _watchers: vscode.FileSystemWatcher[] = [];
    private _lastUpdated: Date | null = null;

    constructor(private readonly _context: vscode.ExtensionContext) {
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left, 10
        );
        this._statusBarItem.command = 'nowdev-ai-toolbox.openDependencyPicker';
        this._statusBarItem.tooltip =
            'NowDev: ServiceNow type definitions — refreshed after `now-sdk dependencies`.\n' +
            'Click to open Dependency Picker.';
        this._context.subscriptions.push(this._statusBarItem);
    }

    /**
     * Start watching `@types/servicenow/**\/*.d.ts` across all workspace folders.
     * @param onChanged Called whenever a type definition file is created, changed, or deleted.
     */
    start(onChanged: () => void): void {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { return; }

        for (const folder of folders) {
            // Watch both the standard @types/servicenow location and any nested paths
            for (const pattern of [
                '**/node_modules/@types/servicenow/**/*.d.ts',
                '**/@types/servicenow/**/*.d.ts',
            ]) {
                const watcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(folder, pattern)
                );
                const handleChange = () => {
                    this._lastUpdated = new Date();
                    this._refreshStatusBar();
                    onChanged();
                };
                watcher.onDidChange(handleChange);
                watcher.onDidCreate(handleChange);
                watcher.onDidDelete(() => {
                    this._refreshStatusBar();
                    onChanged();
                });
                this._watchers.push(watcher);
                this._context.subscriptions.push(watcher);
            }
        }

        this._refreshStatusBar();
        this._statusBarItem.show();
    }

    /** Force a status-bar refresh (call after a manual dependency sync). */
    notifyRefreshed(): void {
        this._lastUpdated = new Date();
        this._refreshStatusBar();
    }

    private _refreshStatusBar(): void {
        if (this._lastUpdated) {
            const time = this._lastUpdated.toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit',
            });
            this._statusBarItem.text = `$(symbol-namespace) SN Types · ${time}`;
            this._statusBarItem.backgroundColor = undefined;
        } else {
            this._statusBarItem.text = '$(symbol-namespace) SN Types';
            this._statusBarItem.backgroundColor = undefined;
        }
    }

    dispose(): void {
        for (const w of this._watchers) { w.dispose(); }
        this._watchers = [];
        this._statusBarItem.dispose();
    }
}
