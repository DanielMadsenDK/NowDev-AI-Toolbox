---
name: servicenow-now-assist
user-invocable: false
description: Build NowAssist Skill configurations using the Fluent SDK NowAssistSkillConfig API. Covers the two-argument skill definition pattern, input/output typing, tool graph construction (Script, InlineScript, FlowAction, Subflow, WebSearch, Decision), LLM provider and prompt configuration with versioning, security controls (MANDATORY), and deployment settings. Use when creating AI-powered skills that appear in the Now Assist Panel, UI Actions, or as reusable Flow Actions.
---

# ServiceNow NowAssist Skill Configuration — Fluent SDK

## Overview

`NowAssistSkillConfig` defines a skill that the Now LLM Service (or external AI providers) can execute in response to user requests. Skills combine:
- **Inputs** — data the skill receives (from the user or the system)
- **Tools** — intermediate steps that gather data or take action
- **Providers** — LLM configurations with prompt templates
- **Outputs** — structured data the skill produces

Import from `@servicenow/sdk/core`:

```typescript
import { NowAssistSkillConfig } from '@servicenow/sdk/core'
```

---

## Two-Argument Signature

`NowAssistSkillConfig` takes two separate arguments to ensure correct TypeScript inference:

```typescript
NowAssistSkillConfig(
    definition,     // Arg 1: metadata, inputs, outputs, tools, security
    promptConfig,   // Arg 2: providers with prompt templates
)
```

The split exists because TypeScript resolves function arguments left-to-right. Keeping tool and input definitions in Arg 1 ensures `p.tool.*` and `p.input.*` IntelliSense works in the prompt functions defined in Arg 2.

---

## Minimal Skill

```typescript
NowAssistSkillConfig(
    {
        $id: Now.ID['my_skill'],
        name: 'My Skill',
        securityControls: {
            userAccess: {
                $id: Now.ID['my_skill_acl'],
                type: 'authenticated',
            },
            roleRestrictions: ['sys_id_of_itil_role'],
        },
        inputs: [
            {
                $id: Now.ID['input_query'],
                name: 'query',
                description: 'The user question',
                mandatory: true,
                dataType: 'string',
            },
        ],
        outputs: [
            {
                $id: Now.ID['output_answer'],
                name: 'answer',
                description: 'The generated response',
                dataType: 'string',
            },
        ],
    },
    {
        providers: [
            {
                provider: 'Now LLM Service',
                prompts: [
                    {
                        name: 'Answer Question',
                        versions: [
                            {
                                $id: Now.ID['prompt_v1'],
                                model: 'llm_generic_small_v2',
                                temperature: 0.2,
                                prompt: (p) => `Answer this question concisely: ${p.input['query']}`,
                                promptState: 'draft',
                            },
                        ],
                    },
                ],
            },
        ],
    }
)
```

---

## Security Controls (MANDATORY)

Every skill **must** include `securityControls`. This is a hard platform requirement.

```typescript
securityControls: {
    userAccess: {
        $id: Now.ID['skill_acl'],
        type: 'authenticated',   // or 'roles' to restrict to specific roles
        roles: ['sys_id_of_role_1', 'sys_id_of_role_2'],  // required when type is 'roles'
    },
    roleRestrictions: ['sys_id_of_role'],   // Roles the skill can inherit during execution
},
```

---

## Input Data Types

| `dataType` | Description |
|------------|-------------|
| `'string'` | Free text |
| `'boolean'` | True/false |
| `'numeric'` | Number |
| `'glide_record'` | ServiceNow record — requires `tableName` + `tableSysId` |
| `'json_object'` | Structured JSON object |
| `'json_array'` | Array of JSON objects |
| `'simple_array'` | Array of strings |

**Truncation:** Set `truncate: true` on an input to truncate its value. Only valid for `string`, `numeric`, `boolean`, `glide_record`. NOT supported for `simple_array`, `json_object`, `json_array`.

For `glide_record` inputs, always specify both required properties:

```typescript
{
    $id: Now.ID['input_incident'],
    name: 'incident record',
    dataType: 'glide_record',
    tableName: 'incident',
    tableSysId: 'sys_id_of_the_record',
    mandatory: false,
}
```

---

## Output Attributes

If omitted or empty, the 5 standard outputs (`response`, `provider`, `errorcode`, `status`, `error`) are auto-generated. Custom outputs can be added alongside standard outputs.

---

## Tool Graph

Tools run before the LLM prompt and provide data the prompt can reference. Define tools using the builder pattern.

### Tool Output Access in Prompts

| Tool Type | Access Pattern |
|-----------|----------------|
| `t.Script()` / `t.InlineScript()` | `${p.tool.ToolName.output}` |
| `t.WebSearch()` / `t.Skill()` | `${p.tool.ToolName.response}` |
| `t.FlowAction()` / `t.Subflow()` | `${p.tool.ToolName.outputName}` |

### Required Identifiers per Tool Type

| Tool Type | `$id` | `$capabilityId` | `output.$id` | Per-input `$id` | Per-output `$id` |
|-----------|:-----:|:---------------:|:------------:|:---------------:|:----------------:|
| `t.InlineScript()` | Yes | No | No | No | No |
| `t.Script()` | Yes | Yes | Yes | Yes | No |
| `t.WebSearch()` | Yes | No | No | No | No |
| `t.Skill()` | Yes | No | No | No | No |
| `t.FlowAction()` | Yes | Yes | No | Yes | Yes |
| `t.Subflow()` | Yes | Yes | No | Yes | Yes |
| `t.Decision()` | Yes | No | No | No | No |

Define tools using the builder pattern:

```typescript
tools: (t) => {
    const searchResult = t.WebSearch('FindKBArticles', {
        $id: Now.ID['tool_kb_search'],
        query: t.input['query'],
        numResults: 5,
    })

    const caseDetails = t.Script('GetCaseDetails', {
        $id: Now.ID['tool_case_details'],
        $capabilityId: Now.ID['tool_case_cap'],
        scriptId: 'sys_id_of_script_include',
        scriptFunctionName: 'getCaseDetails',
        inputs: [
            { $id: Now.ID['tool_input_1'], name: 'caseId', value: t.input['case record'] },
        ],
    })

    // Return handles to enable type-safe access in prompts
    return { searchResult, caseDetails }
},
```

### Tool Types

| Builder Method | What It Does |
|---------------|-------------|
| `t.Script(name, config)` | Calls a Script Include method |
| `t.InlineScript(name, config)` | Runs an inline JavaScript function |
| `t.FlowAction(name, config)` | Executes a Flow Action |
| `t.Subflow(name, config)` | Runs a Subflow |
| `t.WebSearch(name, config)` | Web search and scraping |
| `t.Decision(name, config)` | Conditional branching (routes execution to named targets) |
| `t.Skill(name, config)` | Uses another NowAssist skill as a tool |

### Skill Tool (`t.Skill()`)

Call another published NowAssist skill as a tool. The referenced skill must already be published in the target instance via the Skill Builder UI.

```typescript
t.Skill('KnowledgeSearch', {
    $id: Now.ID['tool_knowledge_skill'],
    skillId: '<sys_id_of_published_skill>',
    inputs: [
        {
            definitionAttributeId: '<input_attribute_sys_id>',
            value: t.input['user query'],
        },
    ],
    outputs: {
        provider: { definitionAttributeId: '<provider_attr_id>' },
        response: { definitionAttributeId: '<response_attr_id>', truncate: true },
        error: { definitionAttributeId: '<error_attr_id>' },
        errorcode: { definitionAttributeId: '<errorcode_attr_id>' },
        status: { definitionAttributeId: '<status_attr_id>' },
    },
    depends: [previousTool],
})
```

### Decision Routing

Use `t.Decision` to branch execution based on prior tool output:

```typescript
t.Decision('Route', {
    $id: Now.ID['tool_route'],
    depends: [classifyResult],
    targets: ['ApproveAction', 'EscalateAction'] as const,
    branches: (targets) => [
        {
            name: 'Auto Approve',
            to: targets.ApproveAction,
            condition: { field: classifyResult.output, operator: 'is', value: 'approved' },
        },
    ],
    default: (targets) => targets.EscalateAction,
})
```

### Tool Dependencies

Use `depends` to sequence tools explicitly — otherwise they may run in parallel:

```typescript
const step2 = t.Script('Step2', {
    $id: Now.ID['tool_step2'],
    depends: [step1],   // waits for step1 to finish
    ...
})
```

---

## Provider and Model Configuration

The GenAI configuration follows a **3-level hierarchy**: Provider → Provider API → Model.

### Default Recommendation

Use **Now LLM Service** with **Now LLM Generic** provider API and `llm_generic_small_v2` model.

### Known Providers

`'Now LLM Service'`, `'Azure OpenAI'`, `'Open AI'`, `'Google Gemini'`, `'AWS Claude'`, `'IBM Watson'`, `'Perplexity'`, `'Aleph Alpha'`, `'Custom LLM Provider'`

### Provider API (Optional)

To specify a Provider API explicitly:

```typescript
providers: [{
    provider: 'Now LLM Service',
    providerAPI: {
        type: 'sys_hub_flow',
        id: '<provider_implementation_sys_id>'
    },
    prompts: [/* ... */]
}]
```

Valid `providerAPI.type` values: `'sys_hub_flow'`, `'sys_hub_action_type_definition'`, `'sys_script_include'`, `'one_api_system_executor'`.

---

## Prompt Configuration (Arg 2)

Reference tool outputs and inputs using the `p` accessor in prompt arrow functions:

```typescript
prompt: (p) => `
Context: ${p.tool.GetCaseDetails.output}
Search results: ${p.tool.FindKBArticles.response}
User asked: ${p.input['query']}

Provide a resolution recommendation.
`,
```

### Prompt Version Properties

| Property | Description |
|----------|-------------|
| `$id` | Unique ID |
| `version` | Version number (integer) |
| `model` | LLM model ID (e.g., `'llm_generic_small_v2'`) |
| `temperature` | Creativity (0.0–1.0) |
| `maxTokens` | Maximum response length |
| `prompt` | Arrow function or string template |
| `promptState` | `'draft'` or `'published'` |

**Always set `promptState: 'draft'`** — publish versions from the Skill Builder UI. Other values may cause validation errors in code.

---

## Deployment Settings

Control where the skill appears:

```typescript
deploymentSettings: {
    uiAction: { $id: Now.ID['skill_uiaction'], table: 'incident' },  // Adds a UI Action on the incident form
    nowAssistPanel: {
        enabled: true,
        roles: ['itil', 'sn_hr_core.manager'],
    },
    flowAction: true,                        // Makes skill available as a Flow Action
    skillFamily: 'sys_id_of_skill_family',   // Groups related skills
},
```

**Note:** Once enabled, `deploymentSettings` should not be removed — the platform does not allow disabling deployment options once configured.

---

## Skill Settings

Add pre/post-processing scripts that run around every LLM call:

```typescript
skillSettings: {
    providers: [
        {
            $id: Now.ID['preprocessor'],
            name: 'Enrich Context',
            preprocessor: `(function(payload) {
                payload.context = payload.context || {};
                payload.context.timestamp = new GlideDateTime().getDisplayValue();
                return payload;
            })(payload);`,
        },
    ],
},
```

---

## Critical Rules

| Rule | Why |
|------|-----|
| `securityControls` is **always required** | Platform enforces it — skills without it fail validation |
| Every tool, input, and output needs a unique `$id: Now.ID['...']` | Required for stable metadata identity |
| Return tool handles from `tools()` for type-safe `p.tool.*` access in prompts | TypeScript cannot infer handle names without the return value |
| Use `depends` to sequence tools that must run in order | Without `depends`, tools may run concurrently |
| Set `promptState: 'draft'` on prompt versions | Always use `'draft'` — publish from the Skill Builder UI, not in code |
| Use `$capabilityId: Now.ID['...']` on Script, Subflow, and FlowAction tools | Required for proper capability registration |
| Use `$id` on `uiAction` in `deploymentSettings` | Required for stable metadata identity |

---

## Build Placement

NowAssist skills are Logic-layer artifacts. Place them alongside Script Includes in your Fluent project:

```
src/
  fluent/
    logic/
      now-assist/
        incident-summarizer.now.ts    ← NowAssistSkillConfig definition
      script-includes/
        incident-helpers.now.ts       ← Script Include called by skill tools
```

---

## Limitations

### Supported Tool Types

Script, InlineScript, FlowAction, Subflow, Skill, WebSearch, and Decision are fully supported.

### Unsupported Tool Types

DocumentIntelligence, PredictIntelligence, and Retriever are **not supported** in the current release.

> **Important:** If any unsupported tool type is added to a skill configuration, **all tools in the skill will be converted to recordAPI format**. This is a fallback mechanism but may result in different runtime behavior. Ensure your skill only uses supported tool types.

### Other Constraints

- A skill can have at most **one** input of type `glide_record`
- `glide_record` inputs are NOT accessible inside tools — they can only be referenced in prompts via `p.input.recordName.fieldName`
- The `maint` role is NOT allowed in `roleRestrictions`
- Skill names must be 40 characters or fewer
- The referenced skill in `t.Skill()` must already be published on the target instance via Skill Builder UI
