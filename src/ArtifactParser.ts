import * as fs from 'fs';
import * as path from 'path';

export interface ParsedArtifact {
    id?: string;
    name: string;
    file: string;
    files?: string[];
    type: string;
    agent: string;
    exports: string;
    status: string;
    dependsOn: string;
    dependsOnIds?: string[];
    missingFiles?: string[];
}

interface ArtifactStateRecord {
    id?: string;
    name?: string;
    file?: string;
    files?: string[];
    type?: string;
    agent?: string;
    ownerAgent?: string;
    exports?: unknown;
    status?: string;
    dependsOn?: string[];
}

interface ArtifactStateDocument {
    artifacts?: ArtifactStateRecord[];
}

export function parseArtifactsContent(content: string): ParsedArtifact[] {
    const trimmed = content.trim();
    if (!trimmed) { return []; }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return parseArtifactsJson(trimmed);
    }

    return parseArtifactsMarkdown(content);
}

export function parseArtifactsJson(content: string, workspaceRoot?: string): ParsedArtifact[] {
    try {
        const parsed = JSON.parse(content) as ArtifactStateDocument | ArtifactStateRecord[];
        const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.artifacts) ? parsed.artifacts : [];
        return records.map(record => ({
            id: record.id || record.name || '',
            name: record.name || record.id || '',
            file: Array.isArray(record.files) ? record.files.join(', ') : record.file || '',
            files: normalizeFileList(record),
            type: record.type || '',
            agent: record.ownerAgent || record.agent || '',
            exports: formatArtifactValue(record.exports),
            status: record.status || '',
            dependsOn: Array.isArray(record.dependsOn) ? record.dependsOn.join(', ') : '',
            dependsOnIds: Array.isArray(record.dependsOn) ? record.dependsOn.filter(Boolean) : [],
            missingFiles: workspaceRoot ? findMissingFiles(workspaceRoot, normalizeFileList(record)) : [],
        })).filter(artifact => artifact.name || artifact.file);
    } catch {
        return [];
    }
}

function normalizeFileList(record: ArtifactStateRecord): string[] {
    if (Array.isArray(record.files)) {
        return record.files.filter(Boolean);
    }
    return record.file ? [record.file] : [];
}

function findMissingFiles(workspaceRoot: string, files: string[]): string[] {
    return files.filter(file => {
        const resolved = path.resolve(workspaceRoot, file);
        const root = path.resolve(workspaceRoot);
        if (resolved !== root && !resolved.startsWith(root + path.sep)) { return true; }
        return !fs.existsSync(resolved);
    });
}

function formatArtifactValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ');
    }
    if (typeof value === 'string') { return value; }
    if (value && typeof value === 'object') { return JSON.stringify(value); }
    return '';
}

/**
 * Parses the Session Artifact Registry markdown table produced by agents.
 *
 * Expected format:
 * | Artifact Name | File | Type | Agent | Exports | Status | Depends On |
 * |---------------|------|------|-------|---------|--------|------------|
 * | SomeUtil      | src/x.js | Script Include | Script-Dev | ... | Done | - |
 */
export function parseArtifactsMarkdown(content: string): ParsedArtifact[] {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    // Need at least header + separator + 1 data row
    if (lines.length < 3) { return []; }

    const artifacts: ParsedArtifact[] = [];
    // Skip header (index 0) and separator (index 1)
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length < 6) { continue; }
        artifacts.push({
            name: cells[0] || '',
            file: cells[1] || '',
            type: cells[2] || '',
            agent: cells[3] || '',
            exports: cells[4] || '',
            status: cells[5] || '',
            dependsOn: cells[6] || '',
        });
    }
    return artifacts;
}
