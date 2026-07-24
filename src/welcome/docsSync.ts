import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { githubGetJson, githubGetRaw, getDocsSyncTime, setDocsSyncTime } from './githubDocs';
import { resolveInside, isSafeRelativePath } from './welcomeUtils';
import { SERVICENOW_RELEASES } from '../WorkspaceAgentManager';

export interface DocsDownloadStatus {
    loading: boolean;
    downloaded?: number;
    total?: number;
    error?: string;
    cancelled?: boolean;
}

/** Host callbacks so DocsSyncController doesn't need to know about WelcomeViewProvider directly. */
export interface DocsSyncHost {
    getView(): vscode.WebviewView | undefined;
    getRelease(): string;
    getDocsGlobalPath(): string;
    resolveDestPath(release: string): string;
    onStatusChanged(): void;
    onDocsSynced(): void;
}

/**
 * Owns ServiceNow product-docs release discovery and batched GitHub
 * download/cancellation state — the orchestration layer on top of the plain
 * GitHub fetch helpers in githubDocs.ts.
 */
export class DocsSyncController {
    docsReleases: string[] = [...SERVICENOW_RELEASES];
    docsDownloadStatus: DocsDownloadStatus = { loading: false };
    private abortDownload = false;

    constructor(private readonly host: DocsSyncHost) {}

    requestCancel(): void {
        this.abortDownload = true;
    }

    getSyncTime(release: string): string {
        return getDocsSyncTime(this.host.getDocsGlobalPath(), release);
    }

    async fetchReleasesFromGitHub(): Promise<void> {
        try {
            const branches = await githubGetJson<Array<{ name: string }>>('/repos/ServiceNow/ServiceNowDocs/branches?per_page=100');
            if (!Array.isArray(branches)) { return; }
            const releases = branches
                .map(b => b.name)
                .filter(n => n && n !== 'main' && n !== 'HEAD' && !/^v\d/.test(n))
                .sort((a, b) => b.localeCompare(a));
            if (releases.length > 0) {
                this.docsReleases = releases;
                if (this.host.getView()) { this.host.onStatusChanged(); }
            }
        } catch { /* silent fallback — keep hardcoded list */ }
    }

    async downloadDocs(): Promise<void> {
        const release = this.host.getRelease();
        if (!release) {
            vscode.window.showErrorMessage('Select a ServiceNow release before downloading.');
            return;
        }
        const destPath = this.host.resolveDestPath(release);
        if (!destPath) {
            vscode.window.showErrorMessage('Set a central docs folder in Settings before downloading.');
            return;
        }

        this.abortDownload = false;
        this.docsDownloadStatus = { loading: true };
        this.host.onStatusChanged();

        try {
            // Fetch the git tree for the selected branch
            const tree = await githubGetJson<{ tree: Array<{ type: string; path: string }> }>(
                `/repos/ServiceNow/ServiceNowDocs/git/trees/${encodeURIComponent(release)}?recursive=1`
            );

            const mdFiles = (tree.tree ?? []).filter(
                (item) => item.type === 'blob' && item.path.endsWith('.md') && isSafeRelativePath(item.path)
            );
            const total = mdFiles.length;

            // Download in batches of 10, reporting progress after each batch
            const batchSize = 10;
            let downloaded = 0;
            for (let i = 0; i < total; i += batchSize) {
                if (this.abortDownload) { break; }
                const batch = mdFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    const raw = await githubGetRaw(
                        `/ServiceNow/ServiceNowDocs/${encodeURIComponent(release)}/${item.path}`
                    );
                    const dest = resolveInside(destPath, item.path);
                    if (!dest) { return; }
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    fs.writeFileSync(dest, raw, 'utf-8');
                }));
                downloaded = Math.min(i + batchSize, total);
                this.host.getView()?.webview.postMessage({ command: 'docsProgress', downloaded, total });
            }

            if (this.abortDownload) {
                this.docsDownloadStatus = { loading: false, cancelled: true, downloaded, total };
                this.host.onStatusChanged();
                return;
            }

            // Also try to fetch llms.txt from root of branch
            try {
                const llmsTxt = await githubGetRaw(
                    `/ServiceNow/ServiceNowDocs/${encodeURIComponent(release)}/llms.txt`
                );
                fs.writeFileSync(path.join(destPath, 'llms.txt'), llmsTxt, 'utf-8');
            } catch { /* llms.txt may not exist — not an error */ }

            setDocsSyncTime(this.host.getDocsGlobalPath(), release, new Date().toISOString());
            this.docsDownloadStatus = { loading: false };
            this.host.onDocsSynced();
            this.host.onStatusChanged();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.docsDownloadStatus = { loading: false, error: msg };
            this.host.onStatusChanged();
            vscode.window.showErrorMessage(`Failed to download docs: ${msg}`);
        }
    }
}
