---
name: nowdev-ai-toolbox-access-denied-explainer
user-invocable: true
description: Explains exactly why a ServiceNow user lacks access or permissions to view/edit a record, view/modify a field, or execute an action/UI Action, and provides a precise remedy. Triggers when the user mentions "I can't see/edit X", "insufficient rights", "why is this field read-only", "access denied", "user can't run this action/UI action", "ACL failure", "no write access", "cannot view", or similar permission and access restriction issues. It queries tables such as sys_security_acl, sys_security_acl_role, sys_user_has_role, sys_group_has_role, sys_user_grmember, and sys_user via 'now-sdk query' to trace ACL evaluations and identify failing roles or conditions.
---

# ServiceNow Access Denied Explainer

This skill provides a structured, live diagnostic tracing workflow to analyze, diagnose, and resolve access control list (ACL) failures and security permission issues on a ServiceNow instance (e.g., why a user gets "Access Denied", why a field is unexpectedly read-only, or why a record is hidden).

---

## Core Principles

1. **Strictly Read-Only:** NEVER perform write, update, delete, or credential-mutating operations on the instance. Only use the CLI query (`now-sdk query`) or schema explorer (`now-sdk explain`) to fetch structural information and roles.
2. **Deterministic Evaluation Trace:** Reconstruct ServiceNow's multi-tier ACL evaluation logic (Table-level security checks first, then Field-level check; check roles first, then evaluate condition and script criteria).
3. **No Direct Security Alteration:** Provide clear recommendations and exact snippets describing how to grant or modify permissions, but do not execute changes.

---

## Standard Diagnosing Workflow

Follow these steps precisely when diagnosing an access issue:

### Step 1: Identify Context & Scopes
1. **Identify Target Table & Field:** Determine the ServiceNow table (e.g., `incident` or `x_abc_app_my_table`) and the specific field (e.g., `short_description`) being accessed.
2. **Identify Operation:** Determine the requested operation: `read`, `write`, `create`, `delete`, or `execute`.
3. **Identify User Context:** Identify the target user. If a name or sys_id is provided, search for them. If none is listed, check if the current user context or default admin/agent needs to be evaluated.
4. **Identify Instance Credential Alias:** Check stored connections using `now-sdk auth --list`. Use the default alias (e.g., `PDI`) unless another is specified.

---

### Step 2: Query Live Instance Data
Execute `now-sdk query` in JSON output mode (`-o json`) with dual display-values (`--display-value all` or `--display-value true`) to pull all necessary credentials, roles, and definitions.

#### 1. Retrieve Affected User Details & Direct Roles
Query the user record to get their `sys_id` (if not known) and extract their directly assigned roles.
- **Query User `sys_id`:**
  `now-sdk query sys_user -q "user_name=<username_or_email>" -f "sys_id,name,active" -o json`
- **Query Direct Roles (`sys_user_has_role`):**
  `now-sdk query sys_user_has_role -q "user=<user_sys_id>^state=active" -f "role,inherited,user" --display-value all -o json`

#### 2. Retrieve Group-Inherited Roles (`sys_user_grmember` & `sys_group_has_role`)
If a role is not assigned directly, find user groups and roles assigned to those groups to determine group-inherited privileges.
- **Find User Groups (`sys_user_grmember`):**
  `now-sdk query sys_user_grmember -q "user=<user_sys_id>" -f "group,user" --display-value all -o json`
- **Find Group Roles (`sys_group_has_role`):**
  `now-sdk query sys_group_has_role -q "group.sys_idIN<comma_separated_group_sys_ids>" -f "role,group,inherits" --display-value all -o json`

#### 3. Query Table & Field ACL Definitions (`sys_security_acl`)
Find all active security rules matching the target table, wildcards (`*`), or extended parent tables (e.g., `task`).
- For a table-level check (e.g., read `incident` records), query `sys_security_acl` matching `incident` or `incident.None` or wildcard `*.None`:
  `now-sdk query sys_security_acl -q "active=true^operation=<operation>^name=incident^ORequivalent" -f "sys_id,name,operation,active,advanced,script,condition,admin_overrides,type" -o json`
- For a field-level check (e.g., edit `incident.short_description`), query ACLs looking for explicit matching, wildcard fields, or matching parent fields:
  `now-sdk query sys_security_acl -q "active=true^operation=<operation>^name=incident.short_description^ORname=incident.*^ORname=*.short_description^ORname=*.*" -f "sys_id,name,operation,active,advanced,script,condition,admin_overrides,type" -o json`

#### 4. Query Mapped Roles for the Discovered ACLs (`sys_security_acl_role`)
Match the ACL `sys_id`s found in the previous step with their required role settings to see which roles grant access.
- **Table:** `sys_security_acl_role`
- **Query:** `sys_security_acl.sys_idIN<comma_separated_acl_sys_ids>`
- **Cmd:** `now-sdk query sys_security_acl_role -q "sys_security_acl.sys_idIN<comma_separated_acl_sys_ids>" -f "sys_id,sys_security_acl,sys_user_role" --display-value all -o json`

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
- **Technical Safeguard:** KEEP technical system strings, ServiceNow table names (e.g., `sys_security_acl`), field names (e.g., `sys_updated_by`), role names (e.g., `itil`), Sys IDs, and query snippets in their technical English format to prevent command syntax breakages.
