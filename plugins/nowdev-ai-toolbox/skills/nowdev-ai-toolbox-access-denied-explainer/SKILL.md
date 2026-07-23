---
name: nowdev-ai-toolbox-access-denied-explainer
user-invocable: true
description: Explains exactly why a ServiceNow user lacks access or permissions to view/edit a record, view/modify a field, or execute an action/UI Action, and provides a precise remedy. Triggers when the user mentions "I can't see/edit X", "insufficient rights", "why is this field read-only", "access denied", "user can't run this action/UI action", "ACL failure", "no write access", "cannot view", or similar permission and access restriction issues. It uses read-only `now-sdk` retrieval delegated to `nowdev-ai-toolbox-servicenow-sdk` to trace ACL evaluations and identify failing roles or conditions.
---

# ServiceNow Access Denied Explainer

This skill provides a structured, live diagnostic tracing workflow to analyze, diagnose, and resolve access control list (ACL) failures and security permission issues on a ServiceNow instance (e.g., why a user gets "Access Denied", why a field is unexpectedly read-only, or why a record is hidden).

---

## Core Principles

1. **Strictly Read-Only:** NEVER perform write, update, delete, or credential-mutating operations on the instance. Use `now-sdk` only for read-only retrieval of structural information and roles.
2. **SDK Authority:** Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`. It is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
3. **Deterministic Evaluation Trace:** Reconstruct ServiceNow's multi-tier ACL evaluation logic (Table-level security checks first, then Field-level check; check roles first, then evaluate condition and script criteria).
4. **No Direct Security Alteration:** Provide clear recommendations and exact snippets describing how to grant or modify permissions, but do not execute changes.

---

## Standard Diagnosing Workflow

Follow these steps precisely when diagnosing an access issue:

### Step 1: Identify Context & Scopes
1. **Identify Target Table & Field:** Determine the ServiceNow table (e.g., `incident` or `x_abc_app_my_table`) and the specific field (e.g., `short_description`) being accessed.
2. **Identify Operation:** Determine the requested operation: `read`, `write`, `create`, `delete`, or `execute`.
3. **Identify User Context:** Identify the target user. If a name or sys_id is provided, search for them. If none is listed, check if the current user context or default admin/agent needs to be evaluated.
4. **Identify Target Instance:** Determine the intended connected instance. Delegate alias discovery and selection mechanics to `nowdev-ai-toolbox-servicenow-sdk`; if the target is ambiguous, ask the user before retrieval.

---

### Step 2: Retrieve Live Instance Data
Ask `nowdev-ai-toolbox-servicenow-sdk` to perform bounded, read-only retrievals from the intended instance using this specification. Resolve reference display names when needed for role analysis; the canonical SDK skill decides the CLI mechanics.

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `sys_user` | Match the supplied username, email, or known `sys_id` | `sys_id,name,active` | One exact user |
| `sys_user_has_role` | Active role grants for the affected user | `role,inherited,user` | All matching grants needed to establish direct roles |
| `sys_user_grmember` | Memberships for the affected user | `group,user` | All matching memberships needed for inheritance tracing |
| `sys_group_has_role` | Roles for the discovered group IDs | `role,group,inherits` | All matching role mappings for those groups |
| `sys_security_acl` | Active ACLs for the requested operation matching the target table, parent tables, and table wildcards such as `<table>`, `<table>.None`, and `*.None` | `sys_id,name,operation,active,advanced,script,condition,admin_overrides,type` | All applicable ACLs; paginate deliberately if the bounded response is incomplete |
| `sys_security_acl` | Active ACLs for the requested operation matching the exact field, parent-table field, and wildcard patterns such as `<table>.<field>`, `<table>.*`, `*.<field>`, and `*.*` | `sys_id,name,operation,active,advanced,script,condition,admin_overrides,type` | All applicable field ACLs; paginate deliberately if needed |
| `sys_security_acl_role` | ACL reference is in the discovered ACL ID set | `sys_id,sys_security_acl,sys_user_role` | All role mappings for the discovered ACLs |

---

### Step 3: Evaluate security rules & Trace failures
Once the data is retrieved, construct the evaluation tracing log:
1. **Aggregate User's Roles:** Build a unique set of all role display names (direct and group-inherited) belonging to the user.
2. **Execute Table-Level ACL Evaluation:**
   - Filter active ACLs targeting the table directly (e.g. `table` or `table.None` or `*.None`).
   - If multiple active ACLs match: **At least one ACL must pass (logical OR)** for table access.
   - For each matching ACL:
     - **Role Requirements Check:** Does the user have at least one of the roles mapped to this ACL in `sys_security_acl_role`? (If no roles are mapped to an ACL, it does not require a role, passing this step automatically).
     - **Condition Check:** Does the record/context satisfy the ACL's `condition`?
     - **Script Check:** Does the `script` evaluate to true?
     - If all three items (Roles AND Condition AND Script) match, this ACL passes.
   - If no table-level ACL passes, the operation fails at the table boundary.
3. **Execute Field-Level ACL Evaluation:**
   - Only execute this if table-level evaluation passed.
   - Map field-specific ACLs in order of specificity: `table.field` → `parent_table.field` → `*.field` → `table.*` → `parent_table.*` → `*.*`.
   - Each level must pass. If a matching ACL is found, the user must satisfy its configuration (Roles AND Condition AND Script).
   - If any applicable field-level constraint is failed, the operation fails.

---

### Step 4: Formulate the Explanation Report
Generate a detailed diagnostic report in the user's language containing the precise reasons and recommendations.

---

## Report Structure

When responding to the user, you must ALWAYS structure your output using the following layout (translated to the user's active language if non-English):

# 🔍 Access Diagnostic Report
**Affected User:** `[User Display Name or Sys ID]`
**Target Table/Element:** `[Table / Field Name]`
**Current Operation:** `[read / write / create / delete]`

---

## 🚦 Security Audit Summary
- **Verdict:** `[ACCESS GRANTED / ACCESS DENIED - Fail at Table-level / ACCESS DENIED - Fail at Field-level]`
- **Root Cause Summary:** `[Brief, concise sentence explaining exactly why the access was denied, e.g., "The user lacks the 'itil' role required by the table-level read ACL."]`

---

## 🧬 ACL Evaluation Trace
Construct a sequence showing which security rules were checked and their outcome:

| ACL Sys ID | Target/Name | Required Role(s) | Condition / Script Check | Status |
|---|---|---|---|---|
| `[Sys ID]` | `[e.g., incident.None]` | `[Required Roles list]` | `[Checked / Passed / Failed]` | `[❌ Fail (Role Missing) / Check condition / etc.]` |
| `[Sys ID]` | `[e.g., incident.short_description]` | `[Required Roles list]` | `[Checked / Not run]` | `[Skipped (Table-level failed)]` |

*(Clearly list all matching ACLs found and mark which evaluated first, and what failed).*

---

## 👥 Affected User's Active Roles
List the roles held by the target user that were discovered during evaluation:

- **Directly Assigned Roles:** `[comma-separated list of direct roles]`
- **Group-Inherited Roles:** `[comma-separated list of group-inherited roles and the groups they came from]`

---

## 🛠️ Recommended Corrective Actions
Provide technical, actionable, read-only remedies. Provide the exact path and sys_id of rules to adjust or roles to assign:

- **Action Option A (Grant User Privilege):** Assign the missing role (`[role_name]`) to the user directly, or add them to the assignment group `[group_name]` which inherits the role. This is the recommended secure pattern.
- **Action Option B (Modify ACL Rule):** Adjust the ACL script or conditions under `sys_security_acl.do?sys_id=[acl_id]` to allow the action.

---

## Language Alignment / Multilingual Support

- **ALWAYS** communicate with the user, draft the Access Diagnostic Report, and formulate response summaries in the exact language used by the user in their active prompt or conversation context.
- Translate standard layout headers appropriately so the report remains fully aligned and native to the user's language (e.g., in Spanish: `# 🔍 Reporte de Diagnóstico de Acceso` instead of `# 🔍 Access Diagnostic Report`, `## 🚦 Resumen de Auditoría de Seguridad` instead of `## 🚦 Security Audit Summary`, etc.).
- **Technical Safeguard:** KEEP technical system strings, ServiceNow table names (e.g., `sys_security_acl`), field names (e.g., `sys_updated_by`), role names (e.g., `itil`), Sys IDs, and filter intent in technical English to preserve precision.
