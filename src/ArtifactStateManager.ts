import * as fs from 'fs';
import * as path from 'path';
import { ParsedArtifact, parseArtifactsJson, parseArtifactsMarkdown } from './ArtifactParser';

const STALE_IN_PROGRESS_MS = 4 * 60 * 60 * 1000;

export interface ArtifactStateReadResult {
    artifacts: ParsedArtifact[];
    sessionActive: boolean;
    errors: string[];
}

export interface ArtifactStateRecord {
    id: string;
    name: string;
    type: string;
    files: string[];
    ownerAgent: string;
    exports: unknown[];
    status: string;
    dependsOn: string[];
    updatedAt: string;
}

export interface ArtifactManifest {
    artifacts: Partial<ArtifactStateRecord>[];
}

export interface ArtifactStateMergeResult extends ArtifactStateReadResult {
    merged: number;
    path: string;
}

interface ArtifactStateDocument {
    version?: unknown;
    sessionId?: unknown;
    artifacts?: unknown;
}

interface WritableArtifactStateDocument {
    version: 1;
    sessionId: string;
    updatedAt: string;
    artifacts: ArtifactStateRecord[];
}

export function readArtifactStateFile(filePath: string, workspaceRoot?: string): ArtifactStateReadResult {
    if (!fs.existsSync(filePath)) {
        return { artifacts: [], sessionActive: false, errors: [] };
    }

    let content = '';
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        return { artifacts: [], sessionActive: false, errors: [`Unable to read artifact state: ${formatError(error)}`] };
    }

    const trimmed = content.trim();
    if (!trimmed) {
        return { artifacts: [], sessionActive: true, errors: ['Artifact state file is empty.'] };
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return readJsonArtifactState(trimmed, workspaceRoot);
    }

    return {
        artifacts: parseArtifactsMarkdown(content),
        sessionActive: true,
        errors: ['Using legacy markdown artifact state. Rebuild artifacts.json when convenient.'],
    };
}

export function extractArtifactManifests(content: string): ArtifactManifest[] {
    const manifests: ArtifactManifest[] = [];
    const manifestFence = /Artifact Manifest[\s\S]*?```(?:json)?\s*([\s\S]*?)```/gi;
    for (const match of content.matchAll(manifestFence)) {
        const parsed = parseManifestJson(match[1]);
        if (parsed) { manifests.push(parsed); }
    }
    return manifests;
}

export function mergeArtifactManifestContent(filePath: string, content: string): ArtifactStateMergeResult {
    const manifests = extractArtifactManifests(content);
    return mergeArtifactManifests(filePath, manifests);
}

export function mergeArtifactManifests(filePath: string, manifests: ArtifactManifest[]): ArtifactStateMergeResult {
    const existing = loadWritableState(filePath);
    const byId = new Map(existing.artifacts.map(artifact => [artifact.id, artifact]));
    const now = new Date().toISOString();
    let merged = 0;

    for (const manifest of manifests) {
        for (const artifact of Array.isArray(manifest.artifacts) ? manifest.artifacts : []) {
            const normalized = normalizeArtifactRecord(artifact, now);
            if (!normalized) { continue; }
            byId.set(normalized.id, { ...byId.get(normalized.id), ...normalized });
            merged++;
        }
    }

    if (merged > 0) {
        existing.updatedAt = now;
        existing.artifacts = Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
        writeArtifactStateFile(filePath, existing);
    }

    const readResult = readArtifactStateFile(filePath);
    return { ...readResult, merged, path: filePath };
}

export function writeArtifactStateFile(filePath: string, document: WritableArtifactStateDocument): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

function readJsonArtifactState(content: string, workspaceRoot?: string): ArtifactStateReadResult {
    try {
        const parsed = JSON.parse(content) as ArtifactStateDocument | unknown[];
        const errors = validateArtifactStateDocument(parsed, workspaceRoot);
        return {
            artifacts: parseArtifactsJson(content, workspaceRoot),
            sessionActive: true,
            errors,
        };
    } catch (error) {
        return { artifacts: [], sessionActive: true, errors: [`Invalid artifact state JSON: ${formatError(error)}`] };
    }
}

function loadWritableState(filePath: string): WritableArtifactStateDocument {
    if (!fs.existsSync(filePath)) {
        return createEmptyState();
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const trimmed = content.trim();
    if (!trimmed) {
        return createEmptyState();
    }

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const artifacts = parseArtifactsMarkdown(content).map((artifact, index) => normalizeParsedArtifact(artifact, index));
        return { ...createEmptyState(), artifacts };
    }

    try {
        const parsed = JSON.parse(trimmed) as ArtifactStateDocument | Partial<ArtifactStateRecord>[];
        const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.artifacts) ? parsed.artifacts : [];
        const now = new Date().toISOString();
        const existingSessionId = (parsed as ArtifactStateDocument).sessionId;
        return {
            version: 1,
            sessionId: typeof existingSessionId === 'string' ? existingSessionId : createSessionId(),
            updatedAt: now,
            artifacts: records.map(record => normalizeArtifactRecord(record as Partial<ArtifactStateRecord>, now)).filter(isArtifactStateRecord),
        };
    } catch {
        return createEmptyState();
    }
}

function parseManifestJson(content: string): ArtifactManifest | undefined {
    try {
        const parsed = JSON.parse(content.trim()) as ArtifactManifest;
        if (parsed && Array.isArray(parsed.artifacts)) {
            return parsed;
        }
    } catch {
        // Ignore non-manifest JSON fences.
    }
    return undefined;
}

function normalizeArtifactRecord(record: Partial<ArtifactStateRecord>, updatedAt: string): ArtifactStateRecord | undefined {
    if (!record || typeof record !== 'object') { return undefined; }
    const name = asText(record.name) || asText(record.id);
    const id = asText(record.id) || slugify(name);
    if (!id || !name) { return undefined; }
    return {
        id,
        name,
        type: asText(record.type),
        files: asTextArray(record.files),
        ownerAgent: asText(record.ownerAgent),
        exports: Array.isArray(record.exports) ? record.exports : asText(record.exports) ? [asText(record.exports)] : [],
        status: asText(record.status) || 'done',
        dependsOn: asTextArray(record.dependsOn),
        updatedAt,
    };
}

function normalizeParsedArtifact(artifact: ParsedArtifact, index: number): ArtifactStateRecord {
    const now = new Date().toISOString();
    const name = artifact.name || `artifact-${index + 1}`;
    return {
        id: slugify(name) || `artifact-${index + 1}`,
        name,
        type: artifact.type,
        files: splitList(artifact.file),
        ownerAgent: artifact.agent,
        exports: splitList(artifact.exports),
        status: artifact.status || 'done',
        dependsOn: splitList(artifact.dependsOn),
        updatedAt: now,
    };
}

function validateArtifactStateDocument(document: ArtifactStateDocument | unknown[], workspaceRoot?: string): string[] {
    const errors: string[] = [];
    if (Array.isArray(document)) {
        errors.push('Artifact state uses legacy array JSON; expected an object with version and artifacts.');
        return errors;
    }

    if (document.version !== 1) {
        errors.push('Artifact state version is missing or unsupported; expected version 1.');
    }

    if (!Array.isArray(document.artifacts)) {
        errors.push('Artifact state must contain an artifacts array.');
        return errors;
    }

    const seenIds = new Set<string>();
    const dependencies: Array<{ id: string; dependsOn: string[] }> = [];
    for (const [index, artifact] of document.artifacts.entries()) {
        if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
            errors.push(`artifacts[${index}] must be an object.`);
            continue;
        }
        const record = artifact as Record<string, unknown>;
        const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : '';
        if (!id) {
            errors.push(`artifacts[${index}].id is required.`);
        } else if (seenIds.has(id)) {
            errors.push(`Duplicate artifact id: ${id}.`);
        } else {
            seenIds.add(id);
        }
        if (record.files !== undefined && !Array.isArray(record.files)) {
            errors.push(`artifacts[${index}].files must be an array when declared.`);
        } else if (workspaceRoot && Array.isArray(record.files)) {
            for (const file of record.files.map(asText).filter(Boolean)) {
                if (!sourceFileExists(workspaceRoot, file)) {
                    errors.push(`Artifact ${id || index} references missing source file ${file}.`);
                }
            }
        }
        if (record.dependsOn !== undefined && !Array.isArray(record.dependsOn)) {
            errors.push(`artifacts[${index}].dependsOn must be an array when declared.`);
        } else if (Array.isArray(record.dependsOn) && id) {
            dependencies.push({ id, dependsOn: record.dependsOn.map(asText).filter(Boolean) });
        }
        if (record.status !== undefined && typeof record.status !== 'string') {
            errors.push(`artifacts[${index}].status must be a string when declared.`);
        }
        const status = asText(record.status).toLowerCase();
        const updatedAt = asText(record.updatedAt);
        if ((status.includes('progress') || status.includes('🏗')) && isStaleTimestamp(updatedAt)) {
            errors.push(`Artifact ${id || index} is still in progress but has not been updated recently.`);
        }
    }

    for (const dependency of dependencies) {
        for (const requiredId of dependency.dependsOn) {
            if (!seenIds.has(requiredId)) {
                errors.push(`Artifact ${dependency.id} depends on missing artifact ${requiredId}.`);
            }
        }
    }

    return errors;
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function createEmptyState(): WritableArtifactStateDocument {
    return { version: 1, sessionId: createSessionId(), updatedAt: new Date().toISOString(), artifacts: [] };
}

function createSessionId(): string {
    return `session-${Date.now().toString(36)}`;
}

function asText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function asTextArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(asText).filter(Boolean);
    }
    return splitList(asText(value));
}

function splitList(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean).filter(item => item !== '-' && item !== '—');
}

function slugify(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isArtifactStateRecord(value: ArtifactStateRecord | undefined): value is ArtifactStateRecord {
    return !!value;
}

function isStaleTimestamp(value: string): boolean {
    if (!value) { return false; }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && Date.now() - timestamp > STALE_IN_PROGRESS_MS;
}

function sourceFileExists(workspaceRoot: string, file: string): boolean {
    const resolved = path.resolve(workspaceRoot, file);
    const root = path.resolve(workspaceRoot);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) { return false; }
    return fs.existsSync(resolved);
}