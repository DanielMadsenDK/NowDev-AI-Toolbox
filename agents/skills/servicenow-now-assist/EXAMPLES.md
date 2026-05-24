# NowAssist Skill Config — Examples

## Complete Example: Incident Summarizer

A realistic skill with a Script tool, knowledge search, and a prompt that combines both outputs.

```typescript
import { NowAssistSkillConfig } from '@servicenow/sdk/core'

export const incidentSummarizer = NowAssistSkillConfig(
    {
        $id: Now.ID['incident_summarizer'],
        name: 'Incident Summarizer',
        securityControls: {
            userAccess: {
                $id: Now.ID['incident_summarizer_acl'],
                type: 'authenticated',
            },
            roleMap: ['itil'],   // ZP10/AP3+; use roleRestrictions with sys_ids on older instances
        },
        inputs: [
            {
                $id: Now.ID['input_incident'],
                name: 'incident',
                description: 'The incident record to summarize',
                mandatory: true,
                dataType: 'glide_record',
                tableName: 'incident',
                tableSysId: 'current_record_sys_id',
            },
            {
                $id: Now.ID['input_query'],
                name: 'query',
                description: 'What the user wants to know about the incident',
                mandatory: false,
                dataType: 'string',
            },
        ],
        tools: (t) => {
            const getDetails = t.Script('GetIncidentDetails', {
                $id: Now.ID['tool_get_details'],
                $capabilityId: Now.ID['tool_get_details_cap'],
                scriptInclude: 'IncidentSummarizerHelper',
                method: 'getDetails',
                inputs: [
                    {
                        $id: Now.ID['tool_input_sys_id'],
                        name: 'sys_id',
                        value: t.input['incident'],
                    },
                ],
                output: {
                    $id: Now.ID['tool_output_details'],
                    name: 'details',
                    dataType: 'string',
                },
            })

            const kbSearch = t.WebSearch('FindRelatedKB', {
                $id: Now.ID['tool_kb_search'],
                query: t.input['query'] ?? `incident summary ${t.input['incident']}`,
                numResults: 3,
                depends: [getDetails],
            })

            return { getDetails, kbSearch }
        },
        deploymentSettings: {
            nowAssistPanel: {
                enabled: true,
                roles: ['itil'],
            },
            flowAction: true,
        },
    },
    {
        providers: [
            {
                provider: 'Now LLM Service',
                prompts: [
                    {
                        name: 'Summarize Incident',
                        versions: [
                            {
                                $id: Now.ID['prompt_summarize_v1'],
                                version: 1,
                                model: 'llm_generic_small_v2',
                                temperature: 0.2,
                                promptState: 'draft',
                                prompt: (p) => `
You are an IT support specialist. Summarize the following incident clearly and concisely.

Incident details:
${p.tool.getDetails.output}

Related knowledge articles:
${p.tool.kbSearch.response}

User's question: ${p.input['query'] ?? 'Provide a general summary.'}

Provide:
1. A one-sentence summary of the incident
2. Current status and impact
3. Recommended next action
`,
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

## t.Skill() — Calling Another Published Skill as a Tool

Use `t.Skill()` when you want to reuse a skill that is already published via the Skill Builder UI.

```typescript
tools: (t) => {
    const knowledgeSearch = t.Skill('KnowledgeSearch', {
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
    })

    return { knowledgeSearch }
}
```

> The referenced skill must already be **published** on the target instance via the Skill Builder UI — it cannot be referenced by name alone.

---

## t.Decision() — Conditional Branching

Use `t.Decision()` to route execution to named targets based on a prior tool's output.

```typescript
tools: (t) => {
    const classifyResult = t.Script('ClassifyRequest', {
        $id: Now.ID['tool_classify'],
        $capabilityId: Now.ID['tool_classify_cap'],
        scriptInclude: 'RequestClassifier',
        method: 'classify',
        inputs: [{ $id: Now.ID['classify_input'], name: 'request', value: t.input['query'] }],
        output: { $id: Now.ID['classify_output'], name: 'output', dataType: 'string' },
    })

    const route = t.Decision('Route', {
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

    const approve = t.Script('ApproveAction', {
        $id: Now.ID['tool_approve'],
        $capabilityId: Now.ID['tool_approve_cap'],
        scriptInclude: 'ApprovalHandler',
        method: 'approve',
        inputs: [],
        output: { $id: Now.ID['approve_output'], name: 'output', dataType: 'string' },
        depends: [route],
    })

    const escalate = t.Script('EscalateAction', {
        $id: Now.ID['tool_escalate'],
        $capabilityId: Now.ID['tool_escalate_cap'],
        scriptInclude: 'EscalationHandler',
        method: 'escalate',
        inputs: [],
        output: { $id: Now.ID['escalate_output'], name: 'output', dataType: 'string' },
        depends: [route],
    })

    return { classifyResult, route, approve, escalate }
}
```

---

## Tool Dependencies — Explicit Sequencing

Without `depends`, tools may run in parallel. Use `depends` to enforce ordering.

```typescript
tools: (t) => {
    const fetchData = t.Script('FetchData', {
        $id: Now.ID['tool_fetch'],
        $capabilityId: Now.ID['tool_fetch_cap'],
        scriptInclude: 'DataFetcher',
        method: 'fetch',
        inputs: [{ $id: Now.ID['fetch_input'], name: 'id', value: t.input['record_id'] }],
        output: { $id: Now.ID['fetch_output'], name: 'output', dataType: 'string' },
    })

    // enrichData will wait for fetchData to finish
    const enrichData = t.Script('EnrichData', {
        $id: Now.ID['tool_enrich'],
        $capabilityId: Now.ID['tool_enrich_cap'],
        depends: [fetchData],
        scriptInclude: 'DataEnricher',
        method: 'enrich',
        inputs: [{ $id: Now.ID['enrich_input'], name: 'raw', value: fetchData.output }],
        output: { $id: Now.ID['enrich_output'], name: 'output', dataType: 'string' },
    })

    return { fetchData, enrichData }
}
```
