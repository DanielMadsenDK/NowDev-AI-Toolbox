---
name: nowdev-ai-toolbox-environment-drift-audit
user-invocable: true
description: Safely and systematically audits configuration drift between two or more ServiceNow environments/instances that share the same Fluent application scope. Use this skill for environment comparison, drift audits, alignment checks, or pre-deployment safety checks. It delegates read-only `now-sdk` retrieval to `nowdev-ai-toolbox-servicenow-sdk` and aggregates configuration differences into high, medium, and low risk categories.
---

# ServiceNow Environment Drift Audit

This skill provides a systematic workflow to audit, analyze, and report configuration drift between two or more ServiceNow environments/instances. Drift occurs when out-of-band updates, missing migrations, or environment-specific alterations cause configuration files (like Business Rules, ACLs, Roles, System Properties, Flows, or Scheduled Jobs) to diverge between instances.

---

## Core Principles

1. **Strictly Read-Only:** NEVER perform write, update, or delete operations on any ServiceNow instance while using this skill. Use `now-sdk` only for read-only retrieval.
2. **SDK Authority:** Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
3. **Deterministic Comparisons:** Compare configuration properties across instances using unique identifiers (`sys_id` for aligned Git/Fluent applications, or natural keys like `name` or `element` if sys_ids differ).
4. **Risk-Aware Categorization:** Group all detected discrepancies strictly by their deployment risk levels: **HIGH**, **MEDIUM**, and **LOW**.

---

## The Audit Workflow

Follow these steps precisely whenever triggered to audit drift:

### Step 1: Detect Scope and Target Instances
1. Read `now.config.json` or `package.json` in the workspace to retrieve the current scoped application's scope name (e.g. `x_abc_scope` or `x_123456_my_app`).
2. Ask the canonical SDK skill to resolve available connections.
3. Identify the target instances to compare. Use user-specified targets; otherwise ask the user to confirm the intended environments before retrieval.

### Step 2: Retrieve Critical Configuration
Ask `nowdev-ai-toolbox-servicenow-sdk` to perform the following read-only retrievals against every selected instance. Each retrieval must cover all records in scope; use deliberate pagination and report incomplete coverage.

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `sys_script` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,active,table,when,action_insert,action_update,action_delete,script,condition,sys_updated_on,sys_updated_by` | Complete scoped population |
| `sys_security_acl` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,operation,active,advanced,script,condition,sys_updated_on,sys_updated_by` | Complete scoped population |
| `sys_security_acl_role` | ACL belongs to the discovered application scope | `sys_id,sys_security_acl,sys_user_role` | Complete scoped population |
| `sys_user_role` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,description,sys_updated_on,sys_updated_by` | Complete scoped population |
| `sys_properties` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,suffix,value,type,write_roles,read_roles,description,sys_updated_on,sys_updated_by` | Complete scoped population |
| `sys_hub_flow` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,active,category,sys_updated_on,sys_updated_by` | Complete scoped population |
| `sysauto_script` | `sys_scope.scope` equals the discovered application scope | `sys_id,name,active,run_type,run_time,sys_updated_on,sys_updated_by` | Complete scoped population |

---

## Step 3: Compare Captured Data & Categorize Risk
Extract the JSON results and compare entries across the matched instances. Map records by `sys_id` when possible, checking for:
- Missing records (present in Environment A but absent in Environment B, indicating un-deployed or deleted artifacts).
- Value discrepancies (different active states, code scripts, operational fields, or configurations).

Assign each discovered difference to one of the three specified risk categories:

### HIGH RISK: Security and Access Control Alterations
High-risk differences represent direct security changes or properties that control access. Any mismatch here could leave production exposed, lock out users, or alter operations dangerously.
- **ACL Definitions (`sys_security_acl`):** Active state mismatches, script changes, advanced condition differences.
- **ACL Role Assignments (`sys_security_acl_role`):** Added or removed role-to-ACL associations, role-to-table grants.
- **Roles (`sys_user_role`):** Addition or removal of custom application roles.
- **Properties (`sys_properties`):** System property value changes (especially security/authentication properties, or those altering role privileges).

### MEDIUM RISK: Core Business Logic and Automations
Medium-risk differences represent logic, flows, or automated jobs that run silently in the background and can degrade process integrity.
- **Business Rules (`sys_script`):** Active/inactive state differences, script / timing condition differences, trigger field changes.
- **Flow Designer & Subflows (`sys_hub_flow`):** Active state differences (e.g. Active in dev but Draft on prod).
- **Scheduled script executions (`sysauto_script`):** Active state differences or scheduling/interval disagreements.
- **Automation artifacts:** Entirely missing/extra business rules, flows, or scheduled jobs in one of the compared environments.

### LOW RISK: Cosmetic and Meta-Information Differences
Low-risk differences have zero operational/security runtime effect but are descriptive.
- **Labels & Descriptions:** Form/field/property descriptions or role description differences.
- **Comments/formatting:** Comment updates inside script boxes, empty line spacing, or indentation differences that do not modify logic.
- **Timestamps:** Standard system fields like `sys_updated_on` or `sys_updated_by` differing (this is expected and should be highlighted simply as meta-drift, not high risk).

---

## Step 4: Generate the Environment Drift Report
Compile the comparison results into a structured Markdown format with tables. Always follow this template:

```markdown
# ServiceNow Application Environmental Drift Report
*Audited Application Scope: [scope_name]*
*Environments Compared: [alias_A_name] vs. [alias_B_name] (vs. others)*
*Audit Timestamp: [current_date_time]*

---

## 🚦 Overall Verdict
- **[CRITICAL DRIFT DETECTED / WARNING / SAFE TO DEPLOY]**
- *Brief summary of the safety risk or action needed before moving changes.*

---

## 🔥 HIGH RISK: Security & Access Differences
> Discrepancies in ACLs, Roles, or Security Properties. Review these before deployment!

| Environment | Table / Object | Record Name / ID | Property / Difference | Impact & Recommendation |
|---|---|---|---|---|
| [Alias] | sys_security_acl | [ACL Name] | [e.g. Active=false on Prod, Active=true on Dev] | Security bypass check required. |
| [Alias] | sys_security_acl_role | [ACL-Role Map] | [Role mapping missing on Prod] | Lock-out/Permission mismatch. |

*(If no HIGH risk differences, print "No high-risk configuration drift detected.")*

---

## ⚡ MEDIUM RISK: Logic, Flow & Automation Differences
> Discrepancies in Business Rules, Flows, or Scheduled Scripts.

| Environment | Table | Record Name | Difference / Trigger | Impact & Recommendation |
|---|---|---|---|---|
| [Alias] | sys_script | [BR Name] | [Active=true on Dev, Active=false on Prod] | Workflow will fail to process on Prod. |

*(If no MEDIUM risk differences, print "No medium-risk business logic drift detected.")*

---

## 📝 LOW RISK: Cosmetic & Metadata Differences
> Discrepancies in labels, descriptions, and metadata.

*(Short summary of any cosmetic discrepancies or matching alignment)*

---

## 📋 Recommended Action Items Checklist
- [ ] Align High-risk ACL permissions across all environments.
- [ ] Sync Business Rule/Flow active state differences.
- [ ] Verification complete.
```

---

## Summary of Guidelines for Agents Using This Skill
- Use `now-sdk` only for read-only retrieval; do not install, initialize, deploy, or mutate authentication. Delegate all mechanics to `nowdev-ai-toolbox-servicenow-sdk`.
- Resolve target connections before retrieval and ask the user when the intended instances are ambiguous.
- Request reference display values only when needed to interpret roles or ACLs; the canonical SDK skill determines output mechanics.
- Compare with both `sys_id` and `name` as identifiers.
- Ensure the overall verdict column is accurate and highlights the exact status.
