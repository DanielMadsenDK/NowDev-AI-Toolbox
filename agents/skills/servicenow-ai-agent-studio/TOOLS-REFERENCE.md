# AI Agent Tools — Full Reference

## Tool Selection Priority

1. **OOB tools** when available (e.g., Web Search, RAG, Knowledge Graph)
2. **Reference-based tools** (action, subflow, capability, catalog, topic)
3. **CRUD tools** for database operations
4. **Script tools** only when no other tool type fits

Never use CRUD tools for journal fields (`work_notes`, `comments`). Always use Script tools with `GlideRecordSecure`.

| Need | Tool Type | Why |
|------|-----------|-----|
| Read/search records | CRUD (`lookup`) | Direct table query |
| Create new records | CRUD (`create`) | Maps inputs to columns |
| Modify records | CRUD (`update`) | Query + field update |
| Custom logic | Script | Full JavaScript control |
| Web information | OOB (`web_automation`) | Auto-linked OOB tool |
| Knowledge retrieval | OOB (`rag`) | RAG Search Retrieval |
| Graph-based search | OOB (`knowledge_graph`) | Knowledge Graph tool |
| File ingestion | OOB (`file_upload`) | File Uploader tool |
| In-depth research | OOB (`deep_research`) | Deep Research tool |
| Desktop tasks | OOB (`desktop_automation`) | Desktop Automation tool |
| MCP integration | OOB (`mcp`) | MCP tool |
| Flow Designer action | Reference (`action`) | Triggers existing flows |
| Now Assist skill | Reference (`capability`) | Links to skills |

---

## Tool Types

| Type | Required Extra Field | Description |
|------|----------------------|-------------|
| `crud` | `inputs: ToolInputType` | Database CRUD operations (script is auto-generated) |
| `script` | `script` | Custom server-side script |
| `capability` | `capabilityId` | Now Assist skill |
| `subflow` | `subflowId` | Flow Designer flow |
| `action` | `flowActionId` | Flow Designer action |
| `catalog` | `catalogItemId` | Service Catalog item |
| `topic` | `virtualAgentId` | Virtual Agent topic |
| `topic_block` | `virtualAgentId` | Virtual Agent topic block |
| `web_automation` | _(none)_ | OOB Web Search tool |
| `knowledge_graph` | _(none)_ | OOB Knowledge Graph tool |
| `file_upload` | _(none)_ | OOB File Uploader tool |
| `rag` | _(none)_ | OOB RAG Search Retrieval tool |
| `deep_research` | _(none)_ | Deep Research tool |
| `desktop_automation` | _(none)_ | Desktop Automation tool |
| `mcp` | _(none)_ | MCP tool |

Every tool **must** have `name` and `type`. `preMessage` and `postMessage` are strongly recommended. Every agent **must** have `processingMessage` and `postProcessingMessage` (not available on workflows).

---

## `inputs` Format by Tool Type

| Tool type | `inputs` format | Has `script` field? |
|-----------|-----------------|---------------------|
| `crud` | **Object** (`ToolInputType`) with `operationName`, `table`, `inputFields`, etc. | No (auto-generated) |
| `script` | **Array** of `[{ name, description, mandatory, value? }]` | Yes |
| Reference types | Omit (platform resolves at runtime) | No |
| OOB types | Omit (plugin provides defaults) | No |

---

## CRUD Operations

| Operation | Required Fields |
|-----------|----------------|
| `create` | `table`, `inputFields` with `mappedToColumn` |
| `lookup` | `table`, `queryCondition`, `returnFields` (mandatory) |
| `update` | `table`, `queryCondition`, `inputFields` with `mappedToColumn` |
| `delete` | `table`, `queryCondition` |

`queryCondition` syntax: `"column_name=={{input_field_name}}"`. For reference fields in `returnFields`, include `referenceConfig`: `{ table: "sys_user", field: "name" }`.

### CRUD Example

```typescript
tools: [
    {
        name: 'Look Up Incident',
        type: 'crud',
        executionMode: 'autopilot',
        recordType: 'custom',
        preMessage: 'Searching for the incident...',
        postMessage: 'Incident details retrieved.',
        inputs: {
            operationName: 'lookup',
            table: 'incident',
            inputFields: [
                { name: 'number', description: 'Incident number to look up', mandatory: true, mappedToColumn: 'number' },
            ],
            queryCondition: 'number={{number}}',
            returnFields: [
                { name: 'number' },
                { name: 'short_description' },
                { name: 'state' },
            ],
        },
    },
]
```

---

## Reference-Based Tools

Each requires a type-specific reference field containing the target record's sys_id. Do NOT add `inputs`.

| Tool Type | Required Field | Target Table |
|-----------|----------------|---------------|
| `action` | `flowActionId` | `sys_hub_action_type_definition` |
| `capability` | `capabilityId` | `sn_nowassist_skill_config` |
| `subflow` | `subflowId` | `sys_hub_flow` |
| `catalog` | `catalogItemId` | `sc_cat_item` |
| `topic` | `virtualAgentId` | `sys_cs_topic` |
| `topic_block` | `virtualAgentId` | `sys_cs_topic` |

---

## OOB Tools

OOB tools only require `type` and `name`. The plugin auto-links to the existing OOB tool record:

```typescript
{
    type: 'web_automation',
    name: 'AIA Web Search',
    preMessage: 'Searching the web...',
    postMessage: 'Web search results retrieved.'
}
```

Other OOB types: `'rag'`, `'knowledge_graph'`, `'file_upload'`, `'deep_research'`, `'desktop_automation'`, `'mcp'`.

---

## Script Tools

All script inputs are **strings** at runtime. Parse with `parseInt()`, `JSON.parse()`, etc. The `inputs` field is a **simple array** (unlike CRUD tools which use an object). `inputSchema` is auto-generated from `inputs` — do not specify it manually.

- Always use `GlideRecordSecure` (not `GlideRecord`)
- Do NOT add CDATA tags (plugin handles automatically)
- Use module imports for server-side script files (or `Now.include()` for legacy scripts)

---

## Execution Modes

| Mode | Behaviour |
|------|-----------|
| `'autopilot'` | Agent runs the tool automatically |
| `'copilot'` | Agent proposes the action; a human must approve it |

---

## Subflow Example

```typescript
{
    name: 'Run Resolution Flow',
    type: 'subflow',
    subflowId: 'sys_id_of_subflow',
    executionMode: 'copilot',     // Requires human approval before running
}
```
