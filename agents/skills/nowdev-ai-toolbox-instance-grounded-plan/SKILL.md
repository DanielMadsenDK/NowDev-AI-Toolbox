---
name: nowdev-ai-toolbox-instance-grounded-plan
user-invocable: false
description: Expert planning skill for producing structured ServiceNow implementation structures and plans. Use this skill whenever a user asks to plan, scope, outline, estimate, design, architect, or detail a new feature, or asks "what would it take to build X," or wants to list required artifacts for a ServiceNow enhancement. This skill must be used prior to story refinement to ground all entities, tables, fields, roles, scripts, and flows against the live ServiceNow instance using now-sdk query.
---

# ServiceNow Instance-Grounded Implementation Planner

This skill dictates the process for transforming natural language ServiceNow feature requests into highly structured, technically accurate implementation plans. 

The defining characteristic of this planner is **Grounding**: before a plan is finalized, ever-referenced platform entities (tables, fields, roles, business rules, flows, etc.) must be verified against the live ServiceNow instance via `now-sdk query`. This eliminates guessing and prevents duplicate creations, ensuring exact technical names, fields, and dependencies are correctly reconciled.

---

## 1. Strictly Read-Only Safeguard

You must operate in a strictly **read-only** manner during the planning process.
- **DO NOT** create, mutate, update, or delete any records on the ServiceNow instance.
- **DO NOT** run `now-sdk install`, `now-sdk build`, or change any local metadata files.
- **ONLY** use `now-sdk query` to retrieve existing schema and data.
- **ONLY** use `now-sdk explain` to verify API shape, syntax, and options.

---

## 2. Grounding Verification Workflow (Mandatory First Step)

As soon as a feature request is presented, **do not write the plan immediately.** First, formulate and execute queries against the live instance using `now-sdk query` to explore what exists. Keep exploratory queries small and efficient by specifying explicit `--limit` (default 5–10) and requesting only needed `--fields` with `-o json`.

Inspect the following directories/tables to anchor your scoping:

### A. Checking for Existing Tables (`sys_db_object`)
Search for any existing custom or standard tables that match the domain of the request.
- **Common query pattern:**
  `now-sdk query sys_db_object -q "nameLIKE<keyword>^ORlabelLIKE<keyword>" -f name,label,sys_id -o json --limit 10`
- If a match is found, retrieve its exact schema details (see fields below).

### B. Checking for Existing Fields (`sys_dictionary`)
If a table already exists (e.g., `incident`, `change_request`, or a custom table), check if fields requested by the user are already present.
- **Common query pattern:**
  `now-sdk query sys_dictionary -q "name=<table_name>^elementLIKE<keyword>^ORcolumn_labelLIKE<keyword>" -f name,element,column_label,internal_type,sys_id -o json --limit 15`

### C. Checking for Existing User Roles (`sys_user_role`)
Verify whether proposed access roles already exist in the platform.
- **Common query pattern:**
  `now-sdk query sys_user_role -q "nameLIKE<keyword>" -f name,description,sys_id -o json --limit 10`

### D. Checking for Overlapping Logic & Integration endpoints
Check for existing scripts, flows, or integration configurations that could be reused or extended:
- **Business Rules:** `sys_script`
  `now-sdk query sys_script -q "collection=<table_name>^ORnameLIKE<keyword>" -f name,collection,active,sys_id -o json --limit 10`
- **Flow Designer / Workflows:** `sys_hub_flow`
  `now-sdk query sys_hub_flow -q "nameLIKE<keyword>^ORinternal_nameLIKE<keyword>" -f name,internal_name,sys_id -o json --limit 10`
- **Outbound HTTP/REST integrations:** `sys_rest_message`
  `now-sdk query sys_rest_message -q "nameLIKE<keyword>" -f name,sys_id -o json --limit 10`

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
- **Keep queries narrow:** Never query without an encoded query (`-q`) or without limits. Avoid pulling bulky raw payloads in front of the user; highlight only the parsed relevant fields.
