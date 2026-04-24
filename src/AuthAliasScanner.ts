import { execSync } from 'child_process';
import { getShell } from './shellConfig';

export interface AuthAlias {
    alias: string;
    host: string;
    type: string;
    isDefault: boolean;
}

/**
 * Reads auth aliases configured with `now-sdk auth --add`.
 * SDK 4.3.0+ stores credentials in the OS keychain via @napi-rs/keyring.
 * We parse the output of `now-sdk auth --list` rather than touching the keychain directly.
 *
 * Example output:
 *   [now-sdk] Listing all credentials:
 *   *[PDI]
 *         host = https://dev123.service-now.com
 *         type = oauth
 *         default = Yes
 */
export function scanAuthAliases(): AuthAlias[] {
    try {
        const raw = execSync('now-sdk auth --list', {
            timeout: 8000,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: getShell(),
        });
        return parseAuthListOutput(String(raw));
    } catch (err: any) {
        // now-sdk may write output to stderr on some platforms
        const combined = String(err?.stdout ?? '') + String(err?.stderr ?? '');
        if (combined.includes('Listing all credentials')) {
            return parseAuthListOutput(combined);
        }
        return [];
    }
}

function parseAuthListOutput(raw: string): AuthAlias[] {
    const aliases: AuthAlias[] = [];
    const lines = raw.split(/\r?\n/);
    let current: Partial<AuthAlias> | null = null;

    for (const line of lines) {
        // Match alias line: optional leading * (= default), then [ALIAS_NAME]
        const aliasMatch = line.match(/^\s*(\*)?\[(.+?)\]\s*$/);
        if (aliasMatch) {
            if (current?.alias !== undefined) {
                aliases.push(current as AuthAlias);
            }
            current = {
                alias: aliasMatch[2],
                isDefault: aliasMatch[1] === '*',
                host: '',
                type: '',
            };
            continue;
        }

        if (current) {
            const kvMatch = line.match(/^\s+(\w+)\s*=\s*(.+?)\s*$/);
            if (kvMatch) {
                const key = kvMatch[1].toLowerCase();
                const val = kvMatch[2];
                if (key === 'host') { current.host = val; }
                else if (key === 'type') { current.type = val; }
                else if (key === 'default') { current.isDefault = val.toLowerCase() === 'yes'; }
            }
        }
    }

    if (current?.alias !== undefined) {
        aliases.push(current as AuthAlias);
    }

    return aliases;
}
