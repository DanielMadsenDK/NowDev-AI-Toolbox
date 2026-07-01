import * as path from 'path';

export function normalizeModelOverride(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? item.trim() : '').find(Boolean) ?? '';
    }
    if (typeof value === 'string') {
        return value.split(/[\n,]/).map(item => item.trim()).find(Boolean) ?? '';
    }
    return '';
}

export function resolveInside(root: string, child: string): string | undefined {
    if (!isSafeRelativePath(child)) {
        return undefined;
    }
    const relative = child.split('/').filter(segment => segment && segment !== '.').join(path.sep);
    return `${root.endsWith(path.sep) ? root : `${root}${path.sep}`}${relative}`;
}

export function isSafeRelativePath(value: string): boolean {
    return !!value && !value.includes('..') && !path.isAbsolute(value) && /^[\w .\-/]+$/.test(value);
}

/**
 * MCP servers matching any of these patterns are automatically added to the
 * active integration list the first time they are detected — unless the user
 * has explicitly dismissed them via the toggle.
 */
export const AUTO_ENABLE_MCP_PATTERNS: RegExp[] = [
    /context7/i,   // io.github.upstash/context7, context7, github.com/upstash/context7, …
];

export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
