---
name: nowdev-ai-toolbox-instance-grounded-plan
user-invocable: false
description: Expert planning skill for producing structured ServiceNow implementation structures and plans. Use whenever a user asks to plan, scope, estimate, design, architect, or detail a ServiceNow enhancement. It delegates read-only `now-sdk` grounding to `nowdev-ai-toolbox-servicenow-sdk` before story refinement.
---

# ServiceNow Instance-Grounded Implementation Planner

This skill dictates the process for transforming natural language ServiceNow feature requests into highly structured, technically accurate implementation plans. 

The defining characteristic of this planner is **Grounding**: before a plan is finalized, every referenced platform entity must be verified against the live ServiceNow instance through read-only `now-sdk` retrieval delegated to `nowdev-ai-toolbox-servicenow-sdk`.

---

## 1. Strictly Read-Only Safeguard

You must operate in a strictly **read-only** manner during the planning process.
- **DO NOT** create, mutate, update, or delete any records on the ServiceNow instance.
- **DO NOT** install, build, deploy, or change local metadata files.
- Use `now-sdk` only for read-only schema, data, and installed-documentation retrieval.
- Load `nowdev-ai-toolbox-servicenow-sdk` first; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.

---

## 2. Grounding Verification Workflow (Mandatory First Step)

As soon as a feature request is presented, **do not write the plan immediately.** First ask the canonical SDK skill to perform small, field-minimized retrievals against the live instance.

Inspect the following directories/tables to anchor your scoping:

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `sys_db_object` | Name or label contains domain keywords | `name,label,sys_id` | 10 best matches |
| `sys_dictionary` | Exact table plus element or column label matching requested concepts | `name,element,column_label,internal_type,sys_id` | 15 best matches |
| `sys_user_role` | Role name contains proposed role keywords | `name,description,sys_id` | 10 best matches |
| `sys_script` | Business Rule collection matches the target table or name matches domain keywords | `name,collection,active,sys_id` | 10 best matches |
| `sys_hub_flow` | Name or internal name matches domain keywords | `name,internal_name,sys_id` | 10 best matches |
| `sys_rest_message` | Name matches integration keywords | `name,sys_id` | 10 best matches |

---

## 3. Implementation Plan Structure

Once all query results have been collected, analyzed, and cited, draft the structured plan using the exact template blocks below.

### Output Formatting Template

```markdown
# ServiceNow Technical Implementation Plan: [Feature Name]

## Grounding Query Reference
*Cite the actual queries ran and the live ServiceNow ids/records discovered during the grounding step.*
- **System Tables Queried**: (e.g., `sys_db_object`, `sys_dictionary`, `sys_user_role`)
- **Discovered Records/Details**:
  - Table `[name]` (sys_id: `[sys_id]`) - Label: `[label]`
  - Role `[name]` (sys_id: `[sys_id]`)
  - Integration `[name]` (sys_id: `[sys_id]`)

---

## Required Artifacts
*Provide a table enumerating all physical and logical artifacts required. Do not propose duplicate tables/fields discovered during the grounding phase; instead, flag them as **REUSING**.*

| State | Artifact Type | Programmatic Name | Purpose | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **[NEW / REUSING]** | (e.g., Table, Field, Role, client script, flow, business rule) | (e.g., `x_scope_my_table`) | Detiled technical purpose and connection to requirements | (Low / Medium / High) |

---

## Dependencies & Prerequisites
- List any tables, plugins, or configurations that must exist before this plan can be deployed.
- Cite specific roles or security credentials needed.

## Technical Risks & Mitigations
- Cite potential conflicts with existing logic discovered during queries.
- Identify performance considerations (e.g., synchronous queries on large tables, lack of indexes).
- Highlight security/ACL implications of reused or new tables.

## Acceptance Criteria
- Set clear, objectively testable criteria for measuring feature completeness. Be specific about testing fields, roles, system events, and data conditions.
```

---

## 4. Grounding Principles & Best Practices
- **Do not guess name prefixes:** Use the active scope namespace prefix for all **NEW** artifacts.
- **Always provide sys_ids:** Any REUSING artifact must cite its live `sys_id` found via the query results.
- **Keep retrieval narrow:** Always provide explicit filter intent and a bounded limit intent. Avoid bulky payloads; report only parsed relevant fields.
