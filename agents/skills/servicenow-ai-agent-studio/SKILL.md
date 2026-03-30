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
| `AiAgenticWorkflow` | `sn_aia_workflow` | An orchestrated team of agents sharing a workflow objective |

Both are imported from `@servicenow/sdk/core`.

---

## AiAgent — Core Structure

An agent definition requires four properties:

```typescript
import { AiAgent } from '@servicenow/sdk/core'

export const myAgent = AiAgent({
    $id: Now.ID['my_support_agent'],
    name: 'Support Agent',
    description: 'Assists users with common support requests',
    agentRole: 'IT support specialist',
    acl: '',                    // ACL sys_id, or '' for open access
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

### Access Control

Use `acl` to restrict who can invoke the agent:
- `acl: ''` — open to all authenticated users (use with `channel` and role restrictions)
- `acl: 'itil'` — role name string
- `acl: someAclConstant.$id` — reference to an `Acl()` defined in the same scope

Alternatively, restrict via `dataAccess.roleList` when not using a fixed `runAsUser`.

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

**Version states:** `'draft'` (testing) or `'published'` (active). Only one published version is active at a time.

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
        toolAttributes: {
            operationName: 'read',
            table: 'incident',
            inputFields: [
                { name: 'number', description: 'Incident number to look up', mandatory: true, mappedToColumn: 'number' },
            ],
        },
    },
    {
        name: 'Run Resolution Flow',
        type: 'subflow',
        executionMode: 'copilot',     // Requires human approval before running
        active: true,
    },
]
```

### Tool Types

| Type | Description |
|------|-------------|
| `crud` | Create, read, update, delete records on a table |
| `script` | Run a Script Include method |
| `action` | Execute a Flow Action |
| `subflow` | Run a Subflow |
| `rag` | Retrieve knowledge from a RAG (retrieval-augmented generation) source |
| `web_automation` | Search the web |
| `mcp` | Model Context Protocol integration |
| `topic` | Virtual Agent topic |
| `knowledge_graph` | Query a knowledge graph |
| `file_upload` | Allow file uploads |
| `capability` | Platform-defined capability |

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
        channel: 'now_assist_panel',
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

---

## Data Access Control

When the agent runs as a fixed user, set `runAsUser`. When running with dynamic identity (the requestor's permissions), omit `runAsUser` and provide `dataAccess.roleList`:

```typescript
// Option A — fixed service account
runAsUser: 'sys_id_of_service_account',

// Option B — dynamic identity (caller's permissions, restricted to listed roles)
dataAccess: {
    roleList: ['sys_id_of_itil_role'],
},
```

---

## AiAgenticWorkflow — Multi-Agent Teams

An agentic workflow coordinates a **team** of agents toward a shared goal. The team members are `AiAgent` sys_ids or constants.

```typescript
import { AiAgenticWorkflow } from '@servicenow/sdk/core'

export const reviewWorkflow = AiAgenticWorkflow({
    $id: Now.ID['incident_review_workflow'],
    name: 'Incident Review Workflow',
    description: 'Coordinates triage and resolution agents for incident management',
    acl: 'itil',
    runAs: 'service_account_sys_id',
    executionMode: 'copilot',
    team: {
        $id: Now.ID['incident_review_team'],
        members: ['sys_id_of_triage_agent', 'sys_id_of_resolution_agent'],
    },
    versions: [{ name: 'V1', number: 1 }],
})
```

### Key AiAgenticWorkflow Properties

| Property | Type | Purpose |
|----------|------|---------|
| `name` | string | Display name |
| `description` | string | Workflow purpose |
| `acl` | ACL ref | Access restriction |
| `runAs` | string | Dynamic user identity field name |
| `executionMode` | `'copilot'` \| `'autopilot'` | Human-in-the-loop or fully autonomous |
| `team` | object | `$id` + `members[]` array of agent sys_ids |
| `memoryScope` | string | Shared memory scope across team members |
| `contextProcessingScript` | string/function | Server-side context enrichment before execution |
| `triggerConfig` | array | Scheduled or record-based activation |
| `versions` | array | Named versions with optional conditions and instructions |

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
| `securityControls` / `acl` must be set for all production agents | Prevents open execution by any user |
| `runAsUser` and `dataAccess.roleList` are mutually exclusive — use one or the other | Platform constraint |
| Set triggers `active: false` initially; enable after testing | Prevents accidental execution during development |
| Keep instructions in `versionDetails` — never hardcode behaviour in `contextProcessingScript` | `contextProcessingScript` is for data enrichment, not behavioural guidance |

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
