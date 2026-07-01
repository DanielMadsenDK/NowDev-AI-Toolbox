import * as vscode from 'vscode';

export function buildArtifactHookManifest(): string {
        return JSON.stringify({
                hooks: {
                        Stop: [{
                                type: 'command',
                                command: 'node .vscode/nowdev-ai-hooks/merge-artifact-manifest.js',
                                windows: 'powershell -NoProfile -ExecutionPolicy Bypass -File .vscode\\nowdev-ai-hooks\\merge-artifact-manifest.ps1',
                                linux: 'bash .vscode/nowdev-ai-hooks/merge-artifact-manifest.sh',
                                osx: 'bash .vscode/nowdev-ai-hooks/merge-artifact-manifest.sh',
                                timeout: 15,
                        }],
                },
        }, null, 2) + '\n';
}

export function buildArtifactMergeHookScript(): string {
        return `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readStdin() {
    return fs.readFileSync(0, 'utf8');
}

function parseHookInput(input) {
    try {
        const parsed = JSON.parse(input);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
}

function resolveInside(root, relativePath) {
    if (typeof relativePath !== 'string' || relativePath.includes('..')) { return undefined; }
    const resolved = path.resolve(root, relativePath);
    const rel = path.relative(root, resolved);
    return rel.startsWith('..') || path.isAbsolute(rel) ? undefined : resolved;
}

function artifactStatePath(workspaceRoot) {
    const configPath = path.join(workspaceRoot, '.vscode', 'nowdev-ai-config.json');
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.artifactState && typeof config.artifactState.path === 'string') {
            return resolveInside(workspaceRoot, config.artifactState.path);
        }
    } catch (_) {}
    return resolveInside(workspaceRoot, '.vscode/nowdev-ai-session/artifacts.json');
}

function collectText(value, output) {
    if (typeof value === 'string') { output.push(value); return; }
    if (Array.isArray(value)) { value.forEach(item => collectText(item, output)); return; }
    if (value && typeof value === 'object') { Object.values(value).forEach(item => collectText(item, output)); }
}

function readTranscriptContent(hookInput) {
    const transcriptPath = typeof hookInput.transcript_path === 'string' ? hookInput.transcript_path : '';
    if (!transcriptPath || !path.isAbsolute(transcriptPath)) { return ''; }
    try {
        const stat = fs.statSync(transcriptPath);
        if (!stat.isFile() || stat.size > 5 * 1024 * 1024) { return ''; }
        return fs.readFileSync(transcriptPath, 'utf8');
    } catch (_) {
        return '';
    }
}

function collectTranscriptText(content, output) {
    output.push(content);
    for (const line of content.split(/\\r?\\n/)) {
        if (!line.trim()) { continue; }
        try { collectText(JSON.parse(line), output); } catch (_) {}
    }
}

function extractManifests(input, hookInput) {
    const chunks = [];
    try { collectText(JSON.parse(input), chunks); } catch (_) { chunks.push(input); }
    const transcriptContent = readTranscriptContent(hookInput);
    if (transcriptContent) { collectTranscriptText(transcriptContent, chunks); }
    const manifests = [];
    const fence = String.fromCharCode(96, 96, 96);
    const manifestFence = new RegExp('Artifact Manifest[\\\\s\\\\S]*?' + fence + '(?:json)?\\\\s*([\\\\s\\\\S]*?)' + fence, 'gi');
    for (const chunk of chunks) {
        for (const match of chunk.matchAll(manifestFence)) {
            try {
                const parsed = JSON.parse(match[1].trim());
                if (parsed && Array.isArray(parsed.artifacts)) { manifests.push(parsed); }
            } catch (_) {}
        }
    }
    return manifests;
}

function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function asArray(value) {
    if (Array.isArray(value)) { return value.map(item => String(item || '').trim()).filter(Boolean); }
    return typeof value === 'string' && value.trim() ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
}

function normalizeArtifact(record, updatedAt) {
    if (!record || typeof record !== 'object') { return undefined; }
    const name = String(record.name || record.id || '').trim();
    const id = String(record.id || slugify(name)).trim();
    if (!id || !name) { return undefined; }
    return {
        id,
        name,
        type: String(record.type || '').trim(),
        files: asArray(record.files),
        ownerAgent: String(record.ownerAgent || '').trim(),
        exports: Array.isArray(record.exports) ? record.exports : asArray(record.exports),
        status: String(record.status || 'done').trim(),
        dependsOn: asArray(record.dependsOn),
        updatedAt,
    };
}

function emptyState() {
    return { version: 1, sessionId: 'session-' + Date.now().toString(36), updatedAt: new Date().toISOString(), artifacts: [] };
}

function readState(filePath) {
    try {
        if (!fs.existsSync(filePath)) { return emptyState(); }
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { ...emptyState(), ...parsed, artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [] };
    } catch (_) {
        return emptyState();
    }
}

const rawInput = readStdin();
const hookInput = parseHookInput(rawInput);
const workspaceRoot = typeof hookInput.cwd === 'string' && hookInput.cwd ? hookInput.cwd : process.cwd();
const statePath = artifactStatePath(workspaceRoot);
const manifests = extractManifests(rawInput, hookInput);
let merged = 0;
if (statePath && manifests.length > 0) {
    const state = readState(statePath);
    const byId = new Map(state.artifacts.map(artifact => [artifact.id, artifact]));
    const now = new Date().toISOString();
    for (const manifest of manifests) {
        for (const artifact of manifest.artifacts) {
            const normalized = normalizeArtifact(artifact, now);
            if (!normalized) { continue; }
            byId.set(normalized.id, { ...(byId.get(normalized.id) || {}), ...normalized });
            merged++;
        }
    }
    if (merged > 0) {
        state.version = 1;
        state.updatedAt = now;
        state.artifacts = Array.from(byId.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
        fs.mkdirSync(path.dirname(statePath), { recursive: true });
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\\n', 'utf8');
    }
}

process.stdout.write(JSON.stringify({ continue: true, merged }) + '\\n');
`;
}

export function buildArtifactMergeShellWrapper(): string {
        return '#!/usr/bin/env bash\nnode .vscode/nowdev-ai-hooks/merge-artifact-manifest.js\n';
}

export function buildArtifactMergePowerShellWrapper(): string {
        return 'node .vscode\\nowdev-ai-hooks\\merge-artifact-manifest.js\n';
}

export async function executeIfAvailable(command: string, unavailableMessage: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands(true);
    if (!commands.includes(command)) {
        vscode.window.showWarningMessage(unavailableMessage);
        return false;
    }

    await vscode.commands.executeCommand(command);
    return true;
}

export async function executeFirstAvailable(commandsToTry: string[], unavailableMessage: string): Promise<boolean> {
    const commands = await vscode.commands.getCommands(true);
    const command = commandsToTry.find(candidate => commands.includes(candidate));
    if (!command) {
        vscode.window.showWarningMessage(unavailableMessage);
        return false;
    }

    await vscode.commands.executeCommand(command);
    return true;
}
