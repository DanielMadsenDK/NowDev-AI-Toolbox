export interface ParsedArtifact {
    name: string;
    file: string;
    type: string;
    agent: string;
    exports: string;
    status: string;
    dependsOn: string;
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
