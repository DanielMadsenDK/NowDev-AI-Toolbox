import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

/**
 * GitHub API/raw-content helpers and local docs sync-time bookkeeping for the
 * ServiceNow product documentation download feature.
 */

export function githubGetJson<T>(apiPath: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: apiPath,
            headers: {
                'User-Agent': 'NowDev-AI-Toolbox',
                'Accept': 'application/vnd.github+json',
            },
        };
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data) as T); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

export function githubGetRaw(rawPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'raw.githubusercontent.com',
            path: rawPath,
            headers: { 'User-Agent': 'NowDev-AI-Toolbox' },
        };
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
    });
}

const SYNC_FILE_NAME = '.nowdev-sync.json';

export function getDocsSyncTime(basePath: string, release: string): string {
    if (!basePath || !release) { return ''; }
    const syncFile = path.join(basePath, SYNC_FILE_NAME);
    try {
        if (!fs.existsSync(syncFile)) { return ''; }
        const map = JSON.parse(fs.readFileSync(syncFile, 'utf-8')) as Record<string, string>;
        return map[release] ?? '';
    } catch { return ''; }
}

export function setDocsSyncTime(basePath: string, release: string, time: string): void {
    if (!basePath || !release) { return; }
    const syncFile = path.join(basePath, SYNC_FILE_NAME);
    let map: Record<string, string> = {};
    try {
        if (fs.existsSync(syncFile)) {
            map = JSON.parse(fs.readFileSync(syncFile, 'utf-8')) as Record<string, string>;
        }
    } catch { /* start fresh */ }
    map[release] = time;
    try { fs.writeFileSync(syncFile, JSON.stringify(map, null, 2) + '\n', 'utf-8'); } catch { /* ignore */ }
}
