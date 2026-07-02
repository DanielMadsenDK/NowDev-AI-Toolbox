export interface SourceDef {
    key: string;
    sdkKey: string;
    table: string;
    label: string;
    nameField: string;
    labelField?: string;
    fields: string[];
    searchFields: string[];
    previewFields?: string[];
    baseQuery?: string;
    discover: boolean;
    guideline: boolean;
    hasPreview: boolean;
}

export const SOURCES: SourceDef[] = [
    source('tables', 'tables', 'sys_db_object', 'Tables', 'name', 'label', ['sys_id', 'name', 'label', 'sys_scope'], ['name', 'label'], false, false),
    source('roles', 'roles', 'sys_user_role', 'Roles', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
    source('acls', 'sys_security_acl', 'sys_security_acl', 'ACLs', 'name', 'operation', ['sys_id', 'name', 'operation', 'type', 'sys_scope'], ['name', 'operation', 'type'], false, false),
    source('choices', 'sys_choice', 'sys_choice', 'Choices', 'name', 'label', ['sys_id', 'name', 'element', 'label', 'value', 'sys_scope'], ['name', 'element', 'label', 'value'], false, false),
    source('script_includes', 'sys_script_include', 'sys_script_include', 'Script Includes', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description', 'script'], true, false, ['script']),
    source('business_rules', 'sys_script', 'sys_script', 'Business Rules', 'name', 'collection', ['sys_id', 'name', 'collection', 'when', 'sys_scope'], ['name', 'collection', 'description', 'script'], true, false, ['script']),
    source('client_scripts', 'sys_script_client', 'sys_script_client', 'Client Scripts', 'name', 'table', ['sys_id', 'name', 'table', 'type', 'sys_scope'], ['name', 'table', 'description', 'script'], true, false, ['script']),
    source('ui_actions', 'sys_ui_action', 'sys_ui_action', 'UI Actions', 'name', 'table', ['sys_id', 'name', 'table', 'sys_scope'], ['name', 'table', 'short_description', 'description', 'script'], true, false, ['script']),
    source('ui_policies', 'sys_ui_policy', 'sys_ui_policy', 'UI Policies', 'short_description', 'table', ['sys_id', 'short_description', 'table', 'sys_scope'], ['short_description', 'table'], false, false),
    source('knowledge', 'kb_knowledge', 'kb_knowledge', 'Knowledge Articles', 'number', 'short_description', ['sys_id', 'number', 'short_description', 'workflow_state', 'sys_updated_on', 'kb_knowledge_base', 'sys_scope'], ['number', 'short_description', 'text'], true, true, ['text']),
    source('knowledge_bases', 'kb_knowledge_base', 'kb_knowledge_base', 'Knowledge Bases', 'title', 'description', ['sys_id', 'title', 'description', 'sys_scope'], ['title', 'description'], false, true),
    source('flows', 'sys_hub_flow', 'sys_hub_flow', 'Flows', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], true, false),
    source('scheduled_scripts', 'sysauto_script', 'sysauto_script', 'Scheduled Scripts', 'name', 'run_type', ['sys_id', 'name', 'run_type', 'sys_scope'], ['name', 'description', 'script'], true, false, ['script']),
    source('rest_messages', 'sys_rest_message', 'sys_rest_message', 'REST Messages', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
    source('catalog_items', 'sc_cat_item', 'sc_cat_item', 'Catalog Items', 'name', 'short_description', ['sys_id', 'name', 'short_description', 'sys_scope'], ['name', 'short_description'], false, false),
    source('properties', 'sys_properties', 'sys_properties', 'System Properties', 'name', 'description', ['sys_id', 'name', 'description', 'sys_scope'], ['name', 'description'], false, false),
];

export function source(key: string, sdkKey: string, table: string, label: string, nameField: string, labelField: string | undefined, fields: string[], searchFields: string[], discover: boolean, guideline: boolean, previewFields?: string[]): SourceDef {
    return { key, sdkKey, table, label, nameField, labelField, fields, searchFields, previewFields, discover, guideline, hasPreview: !!previewFields?.length || guideline };
}

export function unique(values: string[]): string[] {
    return values.filter((v, index, all) => v && all.indexOf(v) === index);
}

export function buildQuery(def: SourceDef, scope: string, terms: string[], extra: string[] = []): string {
    const filters: string[] = [];
    const cleaned = terms.map(t => String(t ?? '').trim().replace(/\^/g, '')).filter(Boolean);
    if (cleaned.length) {
        const fragments: string[] = [];
        for (const term of cleaned) {
            for (const field of def.searchFields) { fragments.push(`${field}LIKE${term}`); }
        }
        filters.push(fragments.join('^OR'));
    }
    if (scope && scope !== '*') { filters.push(`sys_scope.scope=${scope}`); }
    if (def.baseQuery) { filters.push(def.baseQuery); }
    filters.push(...extra);
    return filters.join('^');
}

export function getDisplay(record: any, field: string): string {
    const value = record[field];
    if (value && typeof value === 'object' && 'display_value' in value) { return String(value.display_value ?? value.value ?? ''); }
    return String(value ?? '');
}

export function getValue(record: any, field: string): string {
    const value = record[field];
    if (value && typeof value === 'object' && 'value' in value) { return String(value.value ?? ''); }
    return String(value ?? '');
}

export function normalizeRecord(record: any, def: SourceDef, score: number): any {
    const scope = getDisplay(record, 'sys_scope');
    return {
        source: def.key,
        table: def.table,
        label: def.label,
        sysId: getValue(record, 'sys_id') || getDisplay(record, 'sys_id'),
        name: getDisplay(record, def.nameField),
        subtitle: def.labelField ? getDisplay(record, def.labelField) : '',
        scope,
        score,
        hasPreview: def.hasPreview,
    };
}

export function scoreRecord(record: any, def: SourceDef, keywords: string[]): number {
    const text = [def.nameField, ...def.searchFields].map(f => getDisplay(record, f)).join(' ').toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
        const lower = keyword.toLowerCase();
        if (!lower) { continue; }
        if (getDisplay(record, def.nameField).toLowerCase().includes(lower)) { score += 5; }
        if (text.includes(lower)) { score += 1; }
    }
    return score;
}

export function stripHtml(value: string): string {
    return value.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
