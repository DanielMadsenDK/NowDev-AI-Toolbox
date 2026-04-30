import * as vscode from 'vscode';
import * as https from 'https';
import { URL } from 'url';
import { scanAuthAliases, AuthAlias } from './AuthAliasScanner';

/**
 * REST client for browsing a ServiceNow instance.
 *
 * Credentials for REST calls are stored in VS Code SecretStorage keyed by
 * auth alias name. The host (instance URL) is read from the SDK's
 * `now-sdk auth --list` output via {@link scanAuthAliases}; the SDK keychain
 * stores the password but does not expose it, so we manage our own credential
 * pair in SecretStorage. Independent from the SDK CLI keychain.
 *
 * Authentication is HTTP Basic. Username + password (or PAT used as password)
 * are entered once and persisted encrypted across VS Code restarts. Users can
 * clear them per-alias.
 */

const SECRET_NS = 'nowdev-ai-toolbox.instance';

export type AuthMode = 'basic' | 'bearer';

export interface InstanceCredentials {
    host: string;
    mode: AuthMode;
    /** Present for Basic auth. */
    username?: string;
    /** Password for Basic; access token for Bearer. */
    password: string;
}

export interface QueryOptions {
    /** ServiceNow encoded query, e.g. `nameLIKEincident^ORlabelLIKEincident`. */
    query?: string;
    /** Comma-separated list of fields to return. Use `sys_id,name,label` etc. */
    fields?: string[];
    limit?: number;
    offset?: number;
    /** Display values (`true`/`false`/`all`). Defaults to `false`. */
    displayValue?: boolean | 'all';
}

export interface QueryResult<T = Record<string, any>> {
    result: T[];
    /** Total record count if returned via X-Total-Count header. */
    total?: number;
}

export class InstanceClient {
    constructor(private readonly secrets: vscode.SecretStorage) {}

    /** Returns alias metadata from the SDK CLI. */
    listAliases(): AuthAlias[] {
        return scanAuthAliases();
    }

    /** Resolves the host for the given alias from `now-sdk auth --list`. */
    private getHost(alias: string): string | undefined {
        const aliases = scanAuthAliases();
        return aliases.find(a => a.alias === alias)?.host;
    }

    /**
     * Returns stored credentials for the alias, or undefined if none are
     * stored. Does not prompt.
     */
    async peekCredentials(alias: string): Promise<InstanceCredentials | undefined> {
        const host = this.getHost(alias);
        if (!host) { return undefined; }
        const password = await this.secrets.get(this.passKey(alias));
        if (!password) { return undefined; }
        const mode = ((await this.secrets.get(this.modeKey(alias))) as AuthMode) || 'basic';
        const username = await this.secrets.get(this.userKey(alias));
        if (mode === 'basic' && !username) { return undefined; }
        return { host, mode, username, password };
    }

    /**
     * Returns credentials for the alias. Prompts the user if not stored.
     * Returns undefined if the user cancels the prompt.
     */
    async getCredentials(alias: string): Promise<InstanceCredentials | undefined> {
        const existing = await this.peekCredentials(alias);
        if (existing) { return existing; }

        const host = this.getHost(alias);
        if (!host) {
            vscode.window.showErrorMessage(`Auth alias "${alias}" not found in now-sdk. Run "now-sdk auth --add" first.`);
            return undefined;
        }

        const modePick = await vscode.window.showQuickPick(
            [
                { label: '$(person) Basic auth', description: 'Username + password', value: 'basic' as const },
                { label: '$(key) Bearer token (OAuth / PAT)', description: 'Paste an OAuth access token. Generate one in System OAuth → Application Registry on the instance.', value: 'bearer' as const },
            ],
            { placeHolder: `Authentication method for ${host}`, ignoreFocusOut: true }
        );
        if (!modePick) { return undefined; }
        const mode = modePick.value;

        let username: string | undefined;
        if (mode === 'basic') {
            username = await vscode.window.showInputBox({
                title: `Connect to ${host}`,
                prompt: `Username for "${alias}"`,
                placeHolder: 'admin',
                ignoreFocusOut: true,
                validateInput: (v) => v.trim() ? undefined : 'Username is required',
            });
            if (!username) { return undefined; }
        }

        const password = await vscode.window.showInputBox({
            title: `Connect to ${host}`,
            prompt: mode === 'basic' ? `Password for "${username}"` : `Bearer access token for "${alias}"`,
            password: true,
            ignoreFocusOut: true,
            validateInput: (v) => v ? undefined : (mode === 'basic' ? 'Password is required' : 'Token is required'),
        });
        if (!password) { return undefined; }

        await this.secrets.store(this.modeKey(alias), mode);
        if (username) { await this.secrets.store(this.userKey(alias), username.trim()); }
        await this.secrets.store(this.passKey(alias), password);
        return { host, mode, username: username?.trim(), password };
    }

    /** Forgets stored credentials for the alias. */
    async clearCredentials(alias: string): Promise<void> {
        await this.secrets.delete(this.userKey(alias));
        await this.secrets.delete(this.passKey(alias));
        await this.secrets.delete(this.modeKey(alias));
    }

    /** Lightweight ping using `/api/now/ping` to verify creds + reachability. */
    async testConnection(alias: string): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
        const creds = await this.getCredentials(alias);
        if (!creds) { return { ok: false, error: 'No credentials' }; }
        try {
            const res = await this.requestRaw(creds, 'GET', '/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id');
            const ok = res.statusCode === 200;
            return { ok, statusCode: res.statusCode, error: ok ? undefined : `HTTP ${res.statusCode}` };
        } catch (err: any) {
            return { ok: false, error: err.message ?? String(err) };
        }
    }

    /** GETs records from a table. */
    async query<T = Record<string, any>>(alias: string, table: string, opts: QueryOptions = {}): Promise<QueryResult<T>> {
        const creds = await this.getCredentials(alias);
        if (!creds) { throw new Error('No credentials'); }

        const params = new URLSearchParams();
        if (opts.query) { params.set('sysparm_query', opts.query); }
        if (opts.fields?.length) { params.set('sysparm_fields', opts.fields.join(',')); }
        params.set('sysparm_limit', String(opts.limit ?? 50));
        if (opts.offset) { params.set('sysparm_offset', String(opts.offset)); }
        params.set('sysparm_display_value', String(opts.displayValue ?? false));
        params.set('sysparm_exclude_reference_link', 'true');

        const path = `/api/now/table/${encodeURIComponent(table)}?${params.toString()}`;
        const res = await this.requestRaw(creds, 'GET', path);
        if (res.statusCode !== 200) {
            const errPayload = this.tryParse(res.body)?.error?.message ?? `HTTP ${res.statusCode}`;
            throw new Error(errPayload);
        }
        const parsed = this.tryParse(res.body) ?? { result: [] };
        const total = res.headers['x-total-count'];
        return {
            result: (parsed.result ?? []) as T[],
            total: typeof total === 'string' ? parseInt(total, 10) : undefined,
        };
    }

    // ── internals ─────────────────────────────────────────────────

    private userKey(alias: string): string { return `${SECRET_NS}:${alias}:user`; }
    private passKey(alias: string): string { return `${SECRET_NS}:${alias}:pass`; }
    private modeKey(alias: string): string { return `${SECRET_NS}:${alias}:mode`; }

    private tryParse(body: string): any {
        try { return JSON.parse(body); } catch { return null; }
    }

    private requestRaw(
        creds: InstanceCredentials,
        method: string,
        path: string
    ): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }> {
        return new Promise((resolve, reject) => {
            let normalizedHost = creds.host.trim();
            if (!normalizedHost.startsWith('http')) { normalizedHost = 'https://' + normalizedHost; }
            normalizedHost = normalizedHost.replace(/\/+$/, '');
            const url = new URL(normalizedHost + path);
            const authHeader = creds.mode === 'bearer'
                ? `Bearer ${creds.password}`
                : `Basic ${Buffer.from(`${creds.username ?? ''}:${creds.password}`, 'utf-8').toString('base64')}`;
            const req = https.request(
                {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname + url.search,
                    method,
                    timeout: 20000,
                    rejectUnauthorized: false,
                    headers: {
                        Authorization: authHeader,
                        Accept: 'application/json',
                        'User-Agent': 'NowDev-AI-Toolbox',
                    },
                },
                (res) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (c: Buffer) => chunks.push(c));
                    res.on('end', () => resolve({
                        statusCode: res.statusCode ?? 0,
                        headers: res.headers as any,
                        body: Buffer.concat(chunks).toString('utf-8'),
                    }));
                }
            );
            req.on('timeout', () => { req.destroy(new Error('Request timed out (20s)')); });
            req.on('error', (err) => reject(err));
            req.end();
        });
    }
}
