---
name: servicenow-ai-agent-studio
user-invocable: false
description: Build AI Agent definitions and Agentic Workflows for ServiceNow's AI Agent Studio using the Fluent SDK. Covers AiAgent (autonomous task agents with tools, triggers, and versioned instructions) and AiAgenticWorkflow (orchestrated multi-agent team workflows). Use when creating AI-powered automation in Now Assist Panel or Virtual Agent channels, or when building agent teams that coordinate across records, schedules, or business events. Trigger this skill whenever the user mentions AI agents, AiAgent, AiAgenticWorkflow, agent tools, Now Assist Panel automation, or building AI-powered workflows in ServiceNow, even if they don't explicitly mention the AI Agent Studio.
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

---

## AiAgent vs AiAgenticWorkflow

| Feature | AI Agent | AI Agentic Workflow |
|---------|----------|---------------------|
| Purpose | Single agent performing tasks | Multiple agents working as a team |
| Import | `AiAgent` from `@servicenow/sdk/core` | `AiAgenticWorkflow` from `@servicenow/sdk/core` |
| Configuration | `tools` array | `team: { $id, name, members: [...] }` |
| Version array | `versionDetails` | `versions` |
| Security | `securityAcl` (**mandatory**) | `securityAcl` (**mandatory**) |
| Run-as user | `runAsUser` | `runAs` |
| Execution mode | `executionMode` on tools | `executionMode` at workflow level |
| Trigger channel | `'nap'` / `'nap_and_va'` | `"Now Assist Panel"` (mandatory) |
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
| `securityAcl` | `SecurityAclUserAccessConfig` | **MANDATORY** — controls who can invoke the agent |

### Key Optional Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `active` | boolean | `true` | Whether the agent is active |
| `advancedMode` | boolean | `false` | Enables advanced configuration options |
| `agentLearning` | boolean | `false` | Enable agent learning from interactions |
| `agentType` | string | `'internal'` | `'internal'`, `'external'`, `'voice'`, or `'aia_internal'` |
| `channel` | string | `'nap_and_va'` | `'nap'` (Now Assist Panel only) or `'nap_and_va'` (Panel + Virtual Agent) |
| `compiledHandbook` | string | — | Compiled handbook content for the agent |
| `contextProcessingScript` | function/string | — | Server-side script for data enrichment before agent execution (not for behavioral guidance) |
| `dataAccess` | object | — | **Required when `runAsUser` not set** |
| `docUrl` | string | — | Documentation URL for the agent |
| `externalAgentConfiguration` | string/Record | — | Reference to `sn_aia_external_agent_configuration` (for external agents) |
| `iconUrl` | string | — | Icon URL for the agent in the UI |
| `memoryCategories` | array | — | Long-term memory: `'device_and_software'`, `'meetings_and_events'`, `'projects'`, `'workplace'` |
| `parent` | string/Record | — | Reference to parent AI Agent (`sn_aia_agent`) |
| `processingMessage` | string | — | Message displayed while agent is processing |
| `postProcessingMessage` | string | — | Message displayed after agent completes |
| `public` | boolean | `false` | Whether the agent is publicly accessible |
| `recordType` | string | `'template'` | Lifecycle stage: `'template'`, `'aia_internal'`, `'custom'`, or `'promoted'` |
| `runAsUser` | string/Record | — | User sys_id to always run as |
| `sourceId` | string/Record | — | Reference to source agent (for cloned agents) |
| `tools` | array | — | Array of tools the agent can use |
| `triggerConfig` | array | — | Array of trigger configurations |
| `versionDetails` | array | — | Array of version details with instructions |

---

## Version Management

Use `versionDetails` to manage agent instruction lifecycle:

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

**Version states:** `'draft'` (testing), `'committed'`, `'published'` (active), or `'withdrawn'`.

---

## Tools Configuration

Tools give the agent capabilities to act in the system. Declare them in the `tools` array. See **[TOOLS-REFERENCE.md](./TOOLS-REFERENCE.md)** for complete tool types, CRUD operations, reference-based tools, OOB tools, and script tool patterns.

**Quick overview:**

```typescript
tools: [
    {
        name: 'Look Up Incident',
        type: 'crud',
        executionMode: 'autopilot',
        preMessage: 'Searching for the incident...',
        postMessage: 'Incident details retrieved.',
        inputs: {
            operationName: 'lookup',
            table: 'incident',
            inputFields: [
                { name: 'number', description: 'Incident number to look up', mandatory: true, mappedToColumn: 'number' },
            ],
            queryCondition: 'number={{number}}',
            returnFields: [{ name: 'number' }, { name: 'short_description' }, { name: 'state' }],
        },
    },
]
```

**Execution modes:** `'autopilot'` (agent runs automatically) or `'copilot'` (human must approve).

---

## Trigger Configuration

Agents can activate automatically based on record events or schedules. See **[TRIGGERS-AND-ENUMS.md](./TRIGGERS-AND-ENUMS.md)** for all trigger types, scheduled trigger fields, and `triggerStrategy` values.

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

---

## Security ACL (`securityAcl`)

`securityAcl` is **mandatory** on both `AiAgent` and `AiAgenticWorkflow`. Auto-generates `sys_security_acl` and `sys_security_acl_role` records.

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
    ]
}
```

**Common role sys_ids:** `admin` = `2831a114c611228501d4ea6c309d626d`, `itil` = `282bf1fac6112285017366cb5f867469`, `user` = `b05926fa0a0a0aa7000130023e0bde98`

> **Key distinction:** `securityAcl` controls *who can invoke* the agent. `runAsUser`/`runAs` and `dataAccess` control *which user identity the agent runs under*.

---

## Data Access Control

Set **either** `runAsUser` (agent) / `runAs` (workflow) **or** `dataAccess` — not both:

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

An agentic workflow coordinates a **team** of agents toward a shared goal:

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
        roles: ['282bf1fac6112285017366cb5f867469'],
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
| `securityAcl` | `SecurityAclUserAccessConfig` | **MANDATORY** |
| `team.$id` | `Now.ID[...]` | **MANDATORY** when `team` is set |

**Key notes:**
- `team.description` is auto-populated from workflow `description` — do not set it
- Agents **must** be deployed before creating workflows
- Use the `Record` API for agent references for portability across instances
- `versions` (not `versionDetails`) for workflows

---

## Critical Rules

| Rule | Why |
|------|-----|
| Every `AiAgent` and `AiAgenticWorkflow` needs a unique `$id: Now.ID['...']` | Prevents duplicate records on install |
| Use `constant.$id` (not `Now.ID[...]`) when referencing your own exported agents | Fluent cross-reference pattern |
| `securityAcl` is **mandatory** on all agents and workflows | Auto-generates ACL records |
| `runAsUser` and `dataAccess.roleList` are mutually exclusive | Platform constraint |
| Set triggers `active: false` initially; enable after testing | Prevents accidental execution during development |
| Keep instructions in `versionDetails` — never hardcode behaviour in `contextProcessingScript` | `contextProcessingScript` is for data enrichment, not behavioural guidance |

---

## Instructions Authoring

| Field | Purpose | Answers |
|-------|---------|---------|
| `description` | Scope | "What problem does this agent solve?" |
| `agentRole` | Identity (agents only) | "Who am I?" |
| `instructions` | Behavior | "How should I act and use my tools?" |

**Writing principles:**
- Name tools explicitly in instructions
- Add contingency gates: `"DO NOT PROCEED if details are missing"`
- Use "from the task" or "from the context" — NOT "from the triggering record"

| Complexity | Tools/Agents | Instructions Length |
|------------|--------------|---------------------|
| Simple | 1-2 tools | 5-10 lines |
| Moderate | 3-4 tools | 10-20 lines |
| Complex | 5+ tools | 20-30 lines |
| Workflow | 2-10 agents | 15-30 lines |

---

## Reference Files

| When you need... | Read this |
|------------------|-----------|
| Tool types, CRUD/OOB/script tool details, execution modes, tool examples | [TOOLS-REFERENCE.md](./TOOLS-REFERENCE.md) |
| Trigger types, scheduled trigger fields, all enum values, required fields, hallucinations to avoid, error recovery | [TRIGGERS-AND-ENUMS.md](./TRIGGERS-AND-ENUMS.md) |

---

## Deployment Order

1. Create and deploy AI Agents (with `securityAcl`)
2. Get agent sys_ids from `sn_aia_agent`
3. Create and deploy workflow with `securityAcl` and agent sys_ids
4. Verify with `run_query` on `sn_aia_usecase`

---

## Build Placement

AI Agent Studio artifacts belong in the **Logic layer**:

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
