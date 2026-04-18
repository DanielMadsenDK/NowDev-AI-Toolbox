# AI Agent Triggers, Enums & Validation

## Trigger Flow Definition Types

| Type | When it fires |
|------|--------------|
| `record_create` | New record created |
| `record_update` | Existing record updated |
| `record_create_or_update` | Either event |
| `email` | Incoming email |
| `scheduled` | Cron-style schedule |
| `daily` / `weekly` / `monthly` | Time-based recurrence |
| `ui_action` (workflows only) | From a UI action button |

---

## Key Differences: Agent vs Workflow Triggers

| Property | Agent trigger | Workflow trigger |
|----------|--------------|------------------|
| `channel` | `"nap"` or `"nap_and_va"` | `"Now Assist Panel"` (mandatory) |
| `triggerCondition` | Optional | Mandatory for record-based |
| `objectiveTemplate` | Required (defaults to `""`) | Optional |

---

## Scheduled Trigger Fields

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

---

## Run-As Configuration for Triggers

For record-based triggers, use one of:
- `runAs: "<column_name>"` — column-based (column on the target table holding the user reference)
- `runAsUser: "<sys_id>"` — run as a specific user
- `runAsScript` — a script returning a user sys_id for dynamic resolution

---

## Valid Enums

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

## Required Fields by Entity

| Entity | Mandatory Fields |
|--------|-----------------|
| AI Agent | `$id`, `name`, `description`, `agentRole`, `securityAcl` |
| AI Agentic Workflow | `$id`, `name`, `description`, `securityAcl`, `team.$id` |
| CRUD tool | `name`, `type`, `inputs.operationName`, `inputs.table`, `inputs.inputFields` |
| Script tool | `name`, `type`, `script` |

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
