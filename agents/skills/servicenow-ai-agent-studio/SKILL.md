---
name: servicenow-ai-agent-studio
user-invocable: false
description: Build AI Agent definitions and Agentic Workflows for ServiceNow's AI Agent Studio using the Fluent SDK. Covers AiAgent (autonomous task agents with tools, triggers, and versioned instructions) and AiAgenticWorkflow (orchestrated multi-agent team workflows). Use when creating AI-powered automation in Now Assist Panel or Virtual Agent channels, or when building agent teams that coordinate across records, schedules, or business events.
---

# ServiceNow AI Agent Studio — Fluent SDK

## Overview

The AI Agent Studio lets you define autonomous agents that can reason over ServiceNow data, invoke tools, and complete tasks on behalf of users. Two top-level SDK objects cover this domain:

| Object | Record Table | Purpose |
|--------|-------------|---------|
| `AiAgent` | `sn_aia_agent` | A single agent with a role, instructions, tools, and optional triggers |
| `AiAgenticWorkflow` | `sn_aia_usecase` | An orchestrated team of agents sharing a workflow objective |

Both are imported from `@servicenow/sdk/core`. Requires SDK 4.4.0 or higher.

---

## Workflow vs Single Agent Decision Tree

```
User Request
    |
Does it involve multiple tasks? (AND, THEN, followed by)
    | NO  -> USE SINGLE AI AGENT
    | YES
        |
    Do the tasks require DIFFERENT capability types?
    (e.g., search + summarize, fetch from table A + update table B)
        | NO  -> USE SINGLE AI AGENT (multiple tools, one agent)
        | YES -> USE AI AGENTIC WORKFLOW
```

**Pattern Recognition:**

| User Says | Type | Why |
|-----------|------|-----|
| "Fetch X AND do Y" (different capabilities) | Workflow | Different capability types working together |
| "Get data THEN process it" (different agents) | Workflow | Sequential operations needing different specializations |
| "Look up and update an incident" | Single Agent | Same table, same capability type (CRUD), multiple tools |
| "Search for incidents by priority" | Single Agent | Single task |

**Key distinction:** Multiple _tools_ on the same table or same capability type = single agent with multiple tools. Multiple _capability types_ requiring different specializations = workflow with multiple agents.

---

## AI Agent vs AI Agentic Workflow

| Feature | AI Agent | AI Agentic Workflow |
|---------|----------|---------------------|
| Purpose | Single agent performing tasks | Multiple agents working as a team |
| Import | `AiAgent` from `@servicenow/sdk/core` | `AiAgenticWorkflow` from `@servicenow/sdk/core` |
| Configuration | `tools` array | `team: { $id, name, members: [...] }` |
| Version array | `versionDetails` | `versions` |
| Record identity | `$id` (explicit ID) | `$id` (explicit ID) |
| Security | `securityAcl` (**mandatory**, auto-generates ACL) | `securityAcl` (**mandatory**, auto-generates ACL) |
| Run-as user | `runAsUser` | `runAs` |
| Execution mode | `executionMode` on tools | `executionMode` at workflow level (default: `'copilot'`) |
| Trigger channel | `'nap'` / `'nap_and_va'` (agent-level `channel`) | `"Now Assist Panel"` (trigger-level, mandatory) |
| Processing messages | `processingMessage`, `postProcessingMessage` | Not available |

---

## AiAgent — Core Structure

An agent definition requires five mandatory properties (`$id`, `name`, `description`, `agentRole`, `securityAcl`):

```typescript
import { AiAgent } from '@servicenow/sdk/core'

export const myAgent = AiAgent({
    $id: Now.ID['my_support_agent'],
    name: 'Support Agent',
    description: 'Assists users with common support requests',
    agentRole: 'IT support specialist',
    securityAcl: {
        $id: Now.ID['my_support_agent_acl'],
        type: 'Any authenticated user',
    },
    processingMessage: 'Analyzing your request...',
    postProcessingMessage: 'Task complete.',
    versionDetails: [
        {
            name: 'V1',
            number: 1,
            state: 'published',
            instructions: 'You are a helpful support specialist. Guide users through troubleshooting steps and escalate when needed.',
        },
    ],
})
```

### Required Properties

| Property | Type | Purpose |
|----------|------|---------|
| `$id` | `Now.ID[...]` | Unique metadata identifier |
| `name` | string | Display name in UI |
| `description` | string | What the agent does and when to use it |
| `agentRole` | string | Short role label (e.g., `'HR onboarding guide'`) |
| `securityAcl` | `SecurityAclUserAccessConfig` | **MANDATORY** — controls who can invoke the agent; auto-generates `sys_security_acl` and `sys_security_acl_role` records |

### Optional Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `active` | boolean | `true` | Whether the agent is active |
| `advancedMode` | boolean | `false` | Enables advanced configuration options |
| `agentLearning` | boolean | `false` | Enable agent learning from interactions |
| `agentType` | string | `'internal'` | `'internal'`, `'external'`, `'voice'`, or `'aia_internal'` |
| `channel` | string | `'nap_and_va'` | `'nap'` (Now Assist Panel only) or `'nap_and_va'` (Panel + Virtual Agent) |
| `contextProcessingScript` | function/string | — | Server-side script to transform or enrich context before execution |
| `dataAccess` | object | — | Data access controls (**required when `runAsUser` not set**) |
| `iconUrl` | string | — | Icon URL for the agent in the UI |
| `memoryCategories` | array | — | Long-term memory categories: `'device_and_software'`, `'meetings_and_events'`, `'projects'`, `'workplace'` |
| `postProcessingMessage` | string | — | Message displayed after agent completes |
| `processingMessage` | string | — | Message displayed while agent is processing |
| `public` | boolean | `false` | Whether the agent is publicly accessible |
| `recordType` | string | `'template'` | `'template'`, `'custom'`, `'aia_internal'`, or `'promoted'` |
| `runAsUser` | string/Record | — | User sys_id to always run as; when set, `dataAccess` is optional |
| `tools` | array | — | Array of tools the agent can use |
| `triggerConfig` | array | — | Array of trigger configurations |
| `versionDetails` | array | — | Array of version details with instructions |

### Channel Availability

| Value | Where the agent appears |
|-------|------------------------|
| `'nap'` | Now Assist Panel only |
| `'nap_and_va'` | Both Now Assist Panel and Virtual Agent (default) |

---

## Version Management

Use `versionDetails` to manage agent instruction lifecycle. Multiple versions allow A/B testing and gradual rollouts:

```typescript
versionDetails: [
    {
        name: 'V1',
        number: 1,
        state: 'draft',
        instructions: 'Initial instructions...',
    },
    {
        name: 'V2',
        number: 2,
        state: 'published',
        condition: 'priority=1',       // Optional — activates conditionally
        instructions: 'Refined instructions with more detail...',
    },
],
```

**Version states:** `'draft'` (testing), `'committed'`, `'published'` (active), or `'withdrawn'`. Only one published version is active at a time.

---

## Tools Configuration

Tools give the agent capabilities to act in the system. Declare them in the `tools` array:

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
    {
        name: 'Run Resolution Flow',
        type: 'subflow',
        subflowId: 'sys_id_of_subflow',
        executionMode: 'copilot',     // Requires human approval before running
    },
]
```

### Tool Selection Priority

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

### Tool Types

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

### `inputs` Format by Tool Type

| Tool type | `inputs` format | Has `script` field? |
|-----------|-----------------|---------------------|
| `crud` | **Object** (`ToolInputType`) with `operationName`, `table`, `inputFields`, etc. | No (auto-generated) |
| `script` | **Array** of `[{ name, description, mandatory, value? }]` | Yes |
| Reference types | Omit (platform resolves at runtime) | No |
| OOB types | Omit (plugin provides defaults) | No |

### CRUD Operations

| Operation | Required Fields |
|-----------|----------------|
| `create` | `table`, `inputFields` with `mappedToColumn` |
| `lookup` | `table`, `queryCondition`, `returnFields` (mandatory) |
| `update` | `table`, `queryCondition`, `inputFields` with `mappedToColumn` |
| `delete` | `table`, `queryCondition` |

`queryCondition` syntax: `"column_name=={{input_field_name}}"`. For reference fields in `returnFields`, include `referenceConfig`: `{ table: "sys_user", field: "name" }`.

### Reference-Based Tools

Each requires a type-specific reference field containing the target record's sys_id. Do NOT add `inputs`.

| Tool Type | Required Field | Target Table |
|-----------|----------------|---------------|
| `action` | `flowActionId` | `sys_hub_action_type_definition` |
| `capability` | `capabilityId` | `sn_nowassist_skill_config` |
| `subflow` | `subflowId` | `sys_hub_flow` |
| `catalog` | `catalogItemId` | `sc_cat_item` |
| `topic` | `virtualAgentId` | `sys_cs_topic` |
| `topic_block` | `virtualAgentId` | `sys_cs_topic` |

### OOB Tools

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

### Script Tools

All script inputs are **strings** at runtime. Parse with `parseInt()`, `JSON.parse()`, etc. The `inputs` field is a **simple array** (unlike CRUD tools which use an object). `inputSchema` is auto-generated from `inputs` — do not specify it manually.

- Always use `GlideRecordSecure` (not `GlideRecord`)
- Do NOT add CDATA tags (plugin handles automatically)
- Use module imports for server-side script files (or `Now.include()` for legacy scripts)

### Execution Modes

| Mode | Behaviour |
|------|-----------|
| `'autopilot'` | Agent runs the tool automatically |
| `'copilot'` | Agent proposes the action; a human must approve it |

---

## Trigger Configuration

Agents can activate automatically based on record events or schedules:

```typescript
triggerConfig: [
    {
        name: 'High Priority Incident',
        channel: 'nap',
        targetTable: 'incident',
        triggerFlowDefinitionType: 'record_create',
        triggerCondition: 'priority=1',
        objectiveTemplate: 'Resolve incident ${number}',
        active: false,         // Set true to enable
    },
],
```

### Trigger Flow Definition Types

| Type | When it fires |
|------|--------------|
| `record_create` | New record created |
| `record_update` | Existing record updated |
| `record_create_or_update` | Either event |
| `email` | Incoming email |
| `scheduled` | Cron-style schedule |
| `daily` / `weekly` / `monthly` | Time-based recurrence |
| `ui_action` (workflows only) | From a UI action button |

### Key Differences: Agent vs Workflow Triggers

| Property | Agent trigger | Workflow trigger |
|----------|--------------|------------------|
| `channel` | `"nap"` or `"nap_and_va"` | `"Now Assist Panel"` (mandatory) |
| `triggerCondition` | Optional | Mandatory for record-based |
| `objectiveTemplate` | Required (defaults to `""`) | Optional |

### Scheduled Trigger Fields

The `schedule` object is used when `triggerFlowDefinitionType` is `'scheduled'`, `'daily'`, `'weekly'`, or `'monthly'`.

| Type | Required Fields (inside `schedule` object) |
|------|---------------------------------------------|
| `daily` | `schedule.time` |
| `weekly` | `schedule.runDayOfWeek` (1=Sun to 7=Sat), `schedule.time` |
| `monthly` | `schedule.runDayOfMonth` (1-31), `schedule.time` |
| `scheduled` | `schedule.repeatInterval` (e.g., `'1970-01-05 12:00:00'` = every 5 days) |

Time format: `"1970-01-01 HH:MM:SS"`.

The `schedule.triggerStrategy` field controls repeat behavior. Values differ by entity type:

| Entity | Valid `triggerStrategy` values |
|--------|-------------------------------|
| AI Agent | `'every'`, `'once'`, `'unique_changes'`, `'always'` |
| AI Agentic Workflow | `'every'`, `'immediate'`, `'manual'`, `'once'`, `'repeat_every'`, `'unique_changes'` |

### Run-As Configuration for Triggers

For record-based triggers, use one of:
- `runAs: "<column_name>"` — column-based (column on the target table holding the user reference)
- `runAsUser: "<sys_id>"` — run as a specific user
- `runAsScript` — a script returning a user sys_id for dynamic resolution

---

## Security ACL (`securityAcl`)

`securityAcl` is **mandatory** on both `AiAgent` and `AiAgenticWorkflow`. It controls **who can invoke** the agent/workflow and auto-generates the `sys_security_acl` and `sys_security_acl_role` records. It is a discriminated union on the `type` field — each variant also requires a `$id` to identify the generated ACL record.

### Access Types

| `type` | Who can invoke | Extra fields |
|--------|----------------|--------------|
| `'Any authenticated user'` | Any logged-in user | None |
| `'Specific role'` | Only users with listed roles | `roles: [...]` (required) |
| `'Public'` | Anyone, no auth required | None |

```typescript
// Any authenticated user
securityAcl: {
    $id: Now.ID['my_agent_acl'],
    type: 'Any authenticated user',
}

// Specific roles only
securityAcl: {
    $id: Now.ID['my_agent_acl'],
    type: 'Specific role',
    roles: [
        '282bf1fac6112285017366cb5f867469',  // itil role sys_id
        'b05926fa0a0a0aa7000130023e0bde98',  // user role sys_id
    ]
}
```

> **Important distinction:** `securityAcl` controls *who can invoke* the agent. `runAsUser` (agent) / `runAs` (workflow) and `dataAccess` are separate — they control *which user identity the agent runs under* when executing.

### Common Role sys_ids

| Role | sys_id |
|------|--------|
| admin | `2831a114c611228501d4ea6c309d626d` |
| itil | `282bf1fac6112285017366cb5f867469` |
| user | `b05926fa0a0a0aa7000130023e0bde98` |

---

## Data Access Control

### Execution Identity (`runAsUser` / `dataAccess`)

Set **either** `runAsUser` (agent) / `runAs` (workflow) or `dataAccess` — not both:

- **`runAsUser`** (agent) / **`runAs`** (workflow) — always runs as the specified sys_user regardless of invoker
- **`dataAccess.roleList`** — agent/workflow runs as the invoking user, restricted to the listed roles. **Required when `runAsUser`/`runAs` is not set.**

```typescript
// Option A — fixed service account (agent)
runAsUser: 'sys_id_of_service_account',

// Option B — dynamic identity (caller's permissions, restricted to listed roles)
dataAccess: {
    roleList: ['282bf1fac6112285017366cb5f867469'],  // itil role sys_id
    description: 'Restrict to itil role',
},
```

---

## AiAgenticWorkflow — Multi-Agent Teams

An agentic workflow coordinates a **team** of agents toward a shared goal. The team members are `AiAgent` sys_ids or `Record` references.

```typescript
import { AiAgenticWorkflow, Record } from '@servicenow/sdk/core'

const triageAgent = Record({ table: 'sn_aia_agent', $id: Now.ID['triage_agent'], data: { name: 'Triage Agent' } })
const resolutionAgent = Record({ table: 'sn_aia_agent', $id: Now.ID['resolution_agent'], data: { name: 'Resolution Agent' } })

export const reviewWorkflow = AiAgenticWorkflow({
    $id: Now.ID['incident_review_workflow'],
    name: 'Incident Review Workflow',
    description: 'Coordinates triage and resolution agents for incident management',
    securityAcl: {
        $id: Now.ID['incident_review_workflow_acl'],
        type: 'Specific role',
        roles: ['282bf1fac6112285017366cb5f867469'],  // itil
    },
    runAs: 'service_account_sys_id',
    executionMode: 'copilot',
    team: {
        $id: Now.ID['incident_review_team'],
        name: 'Incident Review Team',
        members: [triageAgent, resolutionAgent],
    },
    versions: [{ name: 'V1', number: 1, state: 'published', instructions: 'Triage then resolve incidents.' }],
})
```

### Required Workflow Properties

| Property | Type | Purpose |
|----------|------|---------|
| `$id` | `Now.ID[...]` | Unique metadata identifier |
| `name` | string | Display name |
| `description` | string | Workflow purpose |
| `securityAcl` | `SecurityAclUserAccessConfig` | **MANDATORY** — controls who can invoke the workflow; auto-generates ACL records |

### Optional Workflow Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `active` | boolean | `true` | Whether the workflow is active |
| `contextProcessingScript` | function/string | — | Server-side context enrichment before execution |
| `dataAccess` | object | — | Data access controls (**required when `runAs` not set**) |
| `executionMode` | string | `'copilot'` | `'copilot'` or `'autopilot'` |
| `memoryScope` | string | `'global'` | Shared memory scope across team members |
| `recordType` | string | `'template'` | `'custom'`, `'template'`, or `'aia_internal'` |
| `runAs` | string | — | User sys_id to run as; when set, `dataAccess` is optional |
| `sysDomain` | string | `'global'` | Domain ID |
| `team` | object | — | `{ $id, name, members: [...] }` — team configuration |
| `triggerConfig` | array | — | Scheduled or record-based activation |
| `versions` | array | — | Named versions with optional conditions and instructions |

### Team Configuration

- **`team.$id`** is mandatory when creating a team
- **`team.name`** — team name
- **`team.description`** — auto-populated from workflow `description`; do not set it
- **`team.members`** — array of agent sys_ids or `Record` references

Using the `Record` API is recommended for portability across instances. Agents **must** be deployed before creating workflows.

### Workflow Triggers

Workflows support the same trigger types as agents, plus `schedule` for recurring execution:

```typescript
triggerConfig: [
    {
        name: 'Weekly Review',
        channel: 'Now Assist Panel',
        targetTable: 'incident',
        triggerFlowDefinitionType: 'scheduled',
        objectiveTemplate: 'Review all open incidents for the week',
        schedule: {
            triggerStrategy: 'every',
            runDayOfWeek: 2,              // Monday
            time: '1970-01-01 09:00:00',  // 9:00 AM
        },
    },
],
```

---

## Critical Rules

| Rule | Why |
|------|-----|
| Every `AiAgent` and `AiAgenticWorkflow` needs a unique `$id: Now.ID['...']` | Prevents duplicate records on install |
| Use `constant.$id` (not `Now.ID[...]`) when referencing your own exported agents | Fluent cross-reference pattern |
| `securityAcl` is **mandatory** on all agents and workflows | Auto-generates ACL records; prevents open execution by any user |
| `runAsUser` and `dataAccess.roleList` are mutually exclusive — use one or the other | Platform constraint |
| Set triggers `active: false` initially; enable after testing | Prevents accidental execution during development |
| Keep instructions in `versionDetails` — never hardcode behaviour in `contextProcessingScript` | `contextProcessingScript` is for data enrichment, not behavioural guidance |

---

## Instructions Authoring

### Three Key Fields

| Field | Purpose | Answers |
|-------|---------|---------|
| `description` | Scope | "What problem does this agent solve?" |
| `agentRole` | Identity (agents only) | "Who am I?" |
| `instructions` | Behavior | "How should I act and use my tools?" |

### Writing Principles

- **Actionable steps**: Every step must bind to a tool action or concrete output
- **Explicit tool references**: Name tools explicitly in instructions
- **Contingencies**: Handle failures with gates: `"DO NOT PROCEED if details are missing"`
- **Trigger context**: Use "from the task" or "from the context" — NOT "from the triggering record"

### Scaling by Complexity

| Complexity | Tools/Agents | Instructions Length |
|------------|--------------|---------------------|
| Simple | 1-2 tools | 5-10 lines |
| Moderate | 3-4 tools | 10-20 lines |
| Complex | 5+ tools | 20-30 lines |
| Workflow | 2-10 agents | 15-30 lines |

If instructions exceed ~30 lines, split into multiple agents orchestrated by a workflow.

---

## Validation and Enums

### Required Fields

| Entity | Mandatory Fields |
|--------|-----------------|
| AI Agent | `$id`, `name`, `description`, `agentRole`, `securityAcl` |
| AI Agentic Workflow | `$id`, `name`, `description`, `securityAcl`, `team.$id` |
| CRUD tool | `name`, `type`, `inputs.operationName`, `inputs.table`, `inputs.inputFields` |
| Script tool | `name`, `type`, `script` |

### Valid Enums

| Property | Valid Values |
|----------|-------------|
| `recordType` (agent) | `"custom"`, `"template"`, `"aia_internal"`, `"promoted"` (default: `"template"`) |
| `recordType` (workflow) | `"custom"`, `"template"`, `"aia_internal"` (default: `"template"`) |
| `executionMode` (tool) | `"autopilot"`, `"copilot"` |
| `executionMode` (workflow) | `"autopilot"`, `"copilot"` (default: `"copilot"`) |
| `state` (version) | `"draft"`, `"committed"`, `"published"`, `"withdrawn"` (default: `"draft"`) |
| `tool.type` | `"script"`, `"crud"`, `"capability"`, `"subflow"`, `"action"`, `"catalog"`, `"topic"`, `"topic_block"`, `"web_automation"`, `"rag"`, `"knowledge_graph"`, `"file_upload"`, `"deep_research"`, `"desktop_automation"`, `"mcp"` |
| `securityAcl.type` | `'Any authenticated user'`, `'Specific role'`, `'Public'` |
| `agentType` | `"internal"`, `"external"`, `"voice"`, `"aia_internal"` |
| `channel` (agent) | `"nap"`, `"nap_and_va"` (default: `"nap_and_va"`) |
| `schedule.triggerStrategy` (agent) | `"every"`, `"once"`, `"unique_changes"`, `"always"` |
| `schedule.triggerStrategy` (workflow) | `"every"`, `"immediate"`, `"manual"`, `"once"`, `"repeat_every"`, `"unique_changes"` |
| `outputTransformationStrategy` | `"abstract_summary"`, `"custom"`, `"none"`, `"paraphrase"`, `"summary"`, `"summary_for_search_results"` |

---

## Common Hallucinations to Avoid

| Wrong | Correct |
|-------|---------|
| `acl: "..."` | `securityAcl: { $id, type, roles? }` (mandatory object for both agents and workflows) |
| Missing `securityAcl` on workflows | `securityAcl` is mandatory for workflows too, not just agents |
| `versions` (for agents) | `versionDetails` |
| `versionDetails` (for workflows) | `versions` |
| `runAs` (for agents) | `runAsUser` |
| `"nap"` (for workflow triggers) | `"Now Assist Panel"` |
| `"standard"` | `"custom"` (recordType) |
| `"automatic"` | `"autopilot"` (executionMode) |
| `"active"` | `"published"` (state) |
| `"database"` | `"crud"` (tool.type) |
| `processingMessage` on workflows | Agent-only field — not valid on `AiAgenticWorkflow` |
| `postProcessingMessage` on workflows | Agent-only field — not valid on `AiAgenticWorkflow` |
| `team.description` set manually | Auto-populated from workflow `description` — do not set |
| Manual `inputSchema` | Auto-generated from `inputs` — never set manually |
| `inputs: {...}` for script tools | `inputs: [...]` (array, not object) for script tools |
| `dataAccess` omitted when `runAs` absent | `dataAccess` is mandatory when `runAsUser`/`runAs` is not set |

---

## Error Recovery

| Error Pattern | Category | Resolution |
|---------------|----------|------------|
| `dataAccess.roleList is mandatory` | Missing roles | Add `dataAccess.roleList` with role sys_ids (required when `runAsUser`/`runAs` is not set) |
| `Table not found` | Bad table name | Query `sys_db_object` to verify |
| `Record not found` / `Invalid reference` | Bad sys_id | Query appropriate table for correct sys_id |
| `Duplicate name` | Name collision | Query both `sn_aia_agent` and `sn_aia_usecase` |
| ACL / permission error | ACL misconfiguration | Verify `securityAcl` is set correctly |

---

## Deployment Order

1. Create and deploy AI Agents (with `securityAcl`)
2. Get agent sys_ids from `sn_aia_agent`
3. Create and deploy workflow with `securityAcl` and agent sys_ids
4. Verify with `run_query` on `sn_aia_usecase`

---

## Build Placement

AI Agent Studio artifacts belong in the **Logic layer** of your Fluent project — alongside Script Includes and Business Rules, after Schema (Tables, Roles, ACLs) is established.

Typical file layout:

```
src/
  fluent/
    agents/
      support-agent.now.ts        ← AiAgent definition
      review-workflow.now.ts      ← AiAgenticWorkflow definition
    logic/
      script-includes/
        agent-helpers.now.ts      ← Script Includes called by agent tools
```
