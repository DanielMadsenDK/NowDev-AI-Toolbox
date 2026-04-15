# Access Control List (ACL) API

The Access Control List API defines access control lists (`sys_security_acl`) that secure parts of an application using the ServiceNow Fluent SDK.

For general information about ACLs, refer to the ServiceNow Access Control List Rules documentation.

**Import from** `@servicenow/sdk/core`:

```ts
import { Acl, Role } from '@servicenow/sdk/core'
```

---

## Core Concepts

**ACLs must include one or more of the following:**
- `roles` — array of role references or sys_ids
- `securityAttribute` — pre-defined security conditions
- `condition` — filter query string
- `script` — custom JavaScript permission logic

An ACL can **allow** or **deny** access to a secured object. Each ACL secures **exactly one operation** on **exactly one object type**.

### Security Layer Hierarchy

| Layer | API | Purpose |
|-------|-----|--------|
| Roles | `Role()` | Define personas with permissions |
| ACLs | `Acl()` | Control access to objects/operations |
| Security Attributes | `Record` on `sys_security_attribute` | Reusable security predicates |
| Data Filters | `Record` on `sys_security_data_filter` | Row-level filtering |

1. **Start with Roles:** Define roles first — they are required by ACLs and referenced by Security Attributes.
2. **Then ACLs:** Create ACL rules to secure tables, fields, and resources. Each ACL secures one operation on one object.
3. **Use Security Attributes for reusable predicates:** When the same role/condition logic appears in multiple ACLs, extract it into a Security Attribute.
4. **Add Data Filters for row-level security:** When users should see only certain rows (not the whole table), add Security Data Filters paired with Deny ACLs.

### ACL Evaluation Order

1. Deny-Unless ACLs evaluate first — if any fail, access is denied
2. Allow-If ACLs evaluate second — at least one must pass to grant access
3. Within each ACL: roles, condition, and script ALL must pass (the “Trinity”)

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID for the metadata object (e.g., `Now.ID['acl_name']`). Hashed into a unique sys_id at build time. |
| `operation` | String | The operation this ACL secures. Each ACL can only secure one operation; create separate ACLs for multiple operations. |
| `type` | String | The type of object the ACL secures. Determines which operations are valid. |

### Operation Values

Valid `operation` values depend on `type`:

| Operation | Use Case | Valid for Types |
|-----------|----------|-----------------|
| `execute` | Allow users to execute scripts on records or UI pages | `client_callable_flow_object`, `client_callable_script_include`, `graphql`, `processor`, `rest_endpoint` |
| `create` | Allow users to insert new records into a table | `record`, `ux_data_broker` |
| `read` | Allow users to display records from a table | `record`, `ux_data_broker` |
| `write` | Allow users to update records in a table | `record`, `ux_data_broker` |
| `delete` | Allow users to remove records from a table | `record`, `ux_data_broker` |
| `conditional_table_query_range` | Enables partial ACL-access based on read ACLs | `record` |
| `data_fabric` | Allow Data Fabric connectors to access data | `record` |
| `query_match` | Allow match queries (`is`, `is not`, `is empty`) | `record` |
| `query_range` | Allow range queries (`starts with`, `ends with`, `contains`) and sorting | `record` |
| `edit_task_relations` | Allow users to extend the Task table | `record` |
| `edit_ci_relations` | Allow users to extend the Configuration Item table | `record` |
| `save_as_template` | Allow users to save a record as a template | `record` |
| `add_to_list` | Control column visibility and personalization in list views | `record` |
| `report_on` | Allow users to report on tables | `record` |
| `list_edit` | Allow users to update records from a list view | `record` |
| `report_view` | Allow users to report on field ACLs | `record` |
| `personalize_choices` | Allow users to configure tables or fields | `record` |

### Type Values

| Type | Description | Required Operation | Required Extra Fields |
|------|-------------|-------------------|----------------------|
| `record` | Secures table records and field-level access | Any except `execute` | `table`; optionally `field` |
| `rest_endpoint` | Secures REST API endpoints | `execute` | `name` |
| `ui_page` | Secures UI pages | `execute` | `name` |
| `processor` | Secures processors | `execute` | `name` |
| `graphql` | Secures GraphQL operations | `execute` | `name` |
| `pd_action` | Secures Performance Diagnostics actions | `execute` | `name` |
| `ux_data_broker` | Secures UX data broker operations | `create`, `read`, `write`, `delete` | `table` |
| `ux_page` | Secures UX pages | N/A | `table` |
| `ux_route` | Secures UX routes | N/A | `table` |
| `client_callable_flow_object` | Secures callable flow objects | `execute` | `name` |
| `client_callable_script_include` | Secures callable script includes | `execute` | `name` |

**Default:** `record`

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `active` | Boolean | `true` | Whether the ACL rule is enforced. |
| `adminOverrides` | Boolean | `true` | Whether users with the `admin` role automatically pass this ACL check. Note: the `nobody` role takes precedence. |
| `script` | Script | — | Custom JavaScript that defines permissions. Must evaluate to or return `true`/`false`. Supports function imports, `Now.include()`, or inline code. |
| `description` | String | — | Description of what this ACL secures. |
| `localOrExisting` | String | `Local` | Security attribute type: `'Local'` (condition-based, saved only in this ACL) or `'Existing'` (pre-defined attribute reference). |
| `decisionType` | String | `allow` | `'allow'` to grant access, `'deny'` to block access. |
| `condition` | String | — | Filter query string specifying fields and values that must be true for access. |
| `roles` | Array | — | Array of Role constants or role name strings that a user must have. Users with the `admin` role always pass this check. |
| `securityAttribute` | Reference or String | — | Security attribute reference or pre-defined condition. Accepts a `Record<'sys_security_attribute'>` reference, or the built-in values `'user_is_authenticated'` or `'has_admin_role'`. Use when `localOrExisting` is `'Existing'`. |
| `table` | String | — | **Required** if `type` is `record`, `ux_data_broker`, `ux_page`, `ux_route`, or `pd_action`. Table name to secure. |
| `field` | String | — | **Optional** field name on the table to secure. Use `"*"` to secure all fields. Only applies when `type` is `record`. |
| `appliesTo` | String | — | Additional filter to specify which records this ACL applies to. Only applies when `type` is `record`. |
| `name` | String | — | **Required** if `type` is `rest_endpoint`, `ui_page`, `processor`, `graphql`, `client_callable_flow_object`, or `client_callable_script_include`. The ACL name. |
| `protectionPolicy` | String | — | Intellectual property protection: `'read'` (read-only when installed) or `'protected'` (encrypted, customers can't see contents). |
| `$meta` | Object | — | Metadata including `installMethod`: `'demo'` or `'first install'`. Controls when the ACL is installed. |

---

## Script Property

The `script` property defines custom permission logic. Scripts can:

1. **Return a boolean:**
   ```ts
   script: `return current.created_by === gs.getUserID();`
   ```

2. **Use an `answer` variable:**
   ```ts
   script: `answer = current.priority < 2 && gs.hasRole('itil');`
   ```

3. **Evaluate to a boolean expression:**
   ```ts
   script: `current.state === 'open' && !gs.isInteractive();`
   ```

4. **Reference a function from a module:**
   ```ts
   import { checkPermission } from '../server/permissions.js'

   Acl({
     $id: Now.ID['custom_perm'],
     type: 'record',
     table: 'incident',
     operation: 'write',
     script: checkPermission,  // imported function
   })
   ```

5. **Use `Now.include()` to reference external scripts:**
   ```ts
   Acl({
     $id: Now.ID['complex_acl'],
     type: 'record',
     table: 'incident',
     operation: 'write',
     script: Now.include('./acl-logic.js'),
   })
   ```

**Script Context:**
- Access `current` — the record being evaluated
- Access `previous` — the record's previous state (for update ACLs)
- Use global variables and system properties
- For related list evaluations, `current` points to the related item, not the parent record

---

## Examples

### Basic Record ACL with Roles

```ts
import '@servicenow/sdk/global'
import { Acl, Role } from '@servicenow/sdk/core'

export const adminRole = Role({
  $id: Now.ID['admin_role'],
  name: 'x_snc_example.admin'
})

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_snc_example.manager',
  containsRoles: [adminRole]
})

// Allow admins and managers to delete task descriptions
export const taskDeleteAcl = Acl({
  $id: Now.ID['task_delete_acl'],
  active: true,
  adminOverrides: true,
  type: 'record',
  table: 'task',
  field: 'description',
  operation: 'delete',
  roles: [adminRole, managerRole],
})
```

### Record ACL with Condition

```ts
export const highPriorityWriteAcl = Acl({
  $id: Now.ID['high_priority_write'],
  type: 'record',
  table: 'incident',
  operation: 'write',
  condition: 'priority=1^ORpriority=2',  // High and Medium priority
  roles: ['itil_admin'],
  description: 'Allow ITIL admins to write high-priority incidents',
})
```

### Record ACL with Custom Script

```ts
export const ownerEditAcl = Acl({
  $id: Now.ID['owner_edit'],
  type: 'record',
  table: 'incident',
  operation: 'write',
  script: `return current.assigned_to === gs.getUserID() || gs.hasRole('admin');`,
  description: 'Allow assigned users or admins to edit incidents',
})
```

### Field-Level ACL

```ts
export const sensitiveFieldReadAcl = Acl({
  $id: Now.ID['sensitive_field_read'],
  type: 'record',
  table: 'sys_user',
  field: 'password',
  operation: 'read',
  roles: ['security_admin'],
  description: 'Only security admins can read password field',
})
```

### REST API Endpoint ACL

```ts
export const apiExecuteAcl = Acl({
  $id: Now.ID['api_execute'],
  active: true,
  type: 'rest_endpoint',
  operation: 'execute',
  name: 'my_api',
  roles: ['api_user', 'integration_user'],
  description: 'Allow API users and integration accounts to execute the endpoint',
})
```

### GraphQL Operation ACL

```ts
export const graphqlAcl = Acl({
  $id: Now.ID['graphql_acl'],
  type: 'graphql',
  operation: 'execute',
  name: 'incident_graphql',
  roles: ['admin'],
  script: `return gs.hasRole('admin') && !gs.isImpersonating();`,
  description: 'Only non-impersonated admins can execute GraphQL',
})
```

### Client-Callable Script Include ACL

```ts
export const clientCallableAcl = Acl({
  $id: Now.ID['client_callable'],
  type: 'client_callable_script_include',
  operation: 'execute',
  name: 'MyClientCallable',
  roles: ['end_user'],
  description: 'Allow end users to call the client-callable script include',
})
```

### Deny ACL

```ts
export const blockedTableAcl = Acl({
  $id: Now.ID['block_table_access'],
  type: 'record',
  table: 'cmdb_ci',
  operation: 'delete',
  decisionType: 'deny',
  roles: ['contractor'],
  description: 'Contractors cannot delete configuration items',
})
```

### UX Data Broker ACL

```ts
export const uxDataBrokerAcl = Acl({
  $id: Now.ID['ux_data_broker'],
  type: 'ux_data_broker',
  table: 'incident',
  operation: 'read',
  roles: ['workspace_user'],
  description: 'Control UX data broker access to incidents',
})
```

### ACL with Security Attribute (Existing)

```ts
export const impersonationAcl = Acl({
  $id: Now.ID['impersonation_check'],
  type: 'record',
  table: 'sys_user',
  operation: 'read',
  localOrExisting: 'Existing',
  securityAttribute: 'is_impersonating',
  decisionType: 'deny',
  description: 'Block impersonated users from reading sensitive user data',
})
```

### Protection Policy (for Downloaded Script Includes)

```ts
export const protectedScriptAcl = Acl({
  $id: Now.ID['protected_include'],
  type: 'client_callable_script_include',
  operation: 'execute',
  name: 'ProtectedScript',
  roles: ['admin'],
  protectionPolicy: 'protected',  // Script content is encrypted when downloaded
  description: 'IP-protected script include',
})
```

### Install Method Metadata

```ts
export const demoOnlyAcl = Acl({
  $id: Now.ID['demo_acl'],
  type: 'record',
  table: 'x_app_demo_table',
  operation: 'read',
  roles: ['admin'],
  $meta: {
    installMethod: 'demo'  // Only installed with demo data
  },
  description: 'ACL for demo data only',
})
```

---

## Complex Permission Logic Example

```ts
import { Acl } from '@servicenow/sdk/core'

// Grant write access if: creator is user, status is open, AND not assigned
export const complexPermissionAcl = Acl({
  $id: Now.ID['complex_logic'],
  type: 'record',
  table: 'incident',
  operation: 'write',
  script: `
    const isCreator = current.created_by === gs.getUserID();
    const isOpen = current.state === 'open';
    const notAssigned = !current.assigned_to;

    return isCreator && isOpen && notAssigned;
  `,
  description: 'Only incident creators can edit unassigned open incidents',
})
```

---

## ACL Admin Override Behavior

The `adminOverrides` property controls whether `admin` role users bypass ACL checks:

- **`adminOverrides: true` (default):** Admin users automatically pass this ACL unless assigned the `nobody` role
- **`adminOverrides: false`:** Admins must meet all ACL conditions and role requirements

```ts
// Scenario: Role + admin override
Acl({
  $id: Now.ID['strict_acl'],
  type: 'record',
  table: 'sensitive_table',
  operation: 'read',
  roles: ['security_admin'],
  adminOverrides: false,  // Even admins must have security_admin role
})
```

---

## Best Practices

1. **Organize by object:** Create separate files for ACLs targeting each table or API endpoint
2. **Export constants:** Always export your `Acl` definitions and `Role` definitions for reuse
3. **Use descriptive IDs:** Make `$id` values meaningful (e.g., `acl_incident_write`, not `acl_1`)
4. **Document intent:** Use `description` to explain why the ACL exists
5. **Minimize scripts:** Use `condition` (query string) for simple filters; use `script` only for complex logic
6. **Test admin override:** Verify that `adminOverrides` behavior matches your security requirements
7. **One operation per ACL:** Create separate ACLs for create/read/write/delete, even if they use the same rules
8. **Reference roles:** Use imported `Role` constants rather than hardcoded role names to enable refactoring
9. **Consider Data Fabric:** Use `data_fabric` operation if Data Fabric connectors access your table
10. **Field-level security:** Use `field: '*'` for all fields or specify individual field names for fine-grained control

---

## Common Patterns

### Multi-Role Pattern

```ts
const adminRole = Role({ $id: Now.ID['admin'], name: 'x_app.admin' })
const editorRole = Role({ $id: Now.ID['editor'], name: 'x_app.editor' })
const viewerRole = Role({ $id: Now.ID['viewer'], name: 'x_app.viewer' })

export const readAcl = Acl({
  $id: Now.ID['read'],
  type: 'record',
  table: 'x_app_table',
  operation: 'read',
  roles: [adminRole, editorRole, viewerRole],
})

export const writeAcl = Acl({
  $id: Now.ID['write'],
  type: 'record',
  table: 'x_app_table',
  operation: 'write',
  roles: [adminRole, editorRole],
})

export const deleteAcl = Acl({
  $id: Now.ID['delete'],
  type: 'record',
  table: 'x_app_table',
  operation: 'delete',
  roles: [adminRole],
})
```

### CRUD ACL Set

```ts
const table = 'x_app_records'
const allowedRoles = [adminRole, appRole]

export const createAcl = Acl({ $id: Now.ID['c'], type: 'record', table, operation: 'create', roles: allowedRoles })
export const readAcl = Acl({ $id: Now.ID['r'], type: 'record', table, operation: 'read', roles: allowedRoles })
export const updateAcl = Acl({ $id: Now.ID['u'], type: 'record', table, operation: 'write', roles: allowedRoles })
export const deleteAcl = Acl({ $id: Now.ID['d'], type: 'record', table, operation: 'delete', roles: [adminRole] })
```

---

## Security Attributes

Security Attributes (`sys_security_attribute`) are reusable security predicates. Use the `Record` API to create them. **Only `compound` type** can be referenced in ACLs and Data Filters.

### Security Attribute Types

| Type | Use for | Can use in ACLs? |
|------|---------|------------------|
| `compound` | Role/group conditions via encoded query | Yes |
| `true\|false` | Complex boolean logic via script | No |
| `string` / `integer` / `list` | Value calculations | No |

### Key Rules

- Use `condition` field for compound types with encoded query syntax (e.g., `"Role=manager^ORRole=admin"`)
- Never use `current` in security attribute scripts — no record context available
- Set `is_dynamic: false` for role/group checks that can be cached per session

### Examples

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// Compound type (recommended — can be referenced in ACLs)
export const hasManagerRole = Record({
    $id: Now.ID['has-manager-role'],
    table: 'sys_security_attribute',
    data: {
        name: 'HasManagerRole',
        type: 'compound',
        label: 'Has Manager Role',
        description: 'Checks if the current user has the manager role',
        condition: 'Role=manager',
        is_dynamic: false
    }
})

// Boolean script type
export const hasFinanceRole = Record({
    $id: Now.ID['has-finance-role'],
    table: 'sys_security_attribute',
    data: {
        name: 'HasFinanceRole',
        type: 'true|false',
        label: 'Has Finance Role',
        script: 'answer = gs.hasRole("finance") || gs.getUser().isMemberOf("finance_users");',
        is_dynamic: false
    }
})
```

---

## Security Data Filters

Security Data Filters (`sys_security_data_filter`) provide row-level filtering. Use the `Record` API to create them. **Always pair with Deny ACLs** — Data Filters alone do not provide complete security.

### Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | String | Yes | Descriptive name. |
| `table_name` | String | Yes | Target table. |
| `mode` | String | Yes | `"if"` (filter when condition met) or `"unless"` (filter unless condition met). |
| `security_attribute` | Reference | Yes | Reference to `sys_security_attribute` (must be compound type). |
| `filter` | String | No | Encoded query condition. |
| `active` | Boolean | No | Default: `true`. |

### Key Rules

- `security_attribute` is required — always reference a compound Security Attribute
- Use dynamic conditions (e.g., `fieldnameDYNAMIC90d1921e5f510100a9ad2572f2b477fe` for current user) instead of hardcoded values
- Use indexed columns in filters for performance

### Example

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const filterFinancialRecords = Record({
    $id: Now.ID['filter-financial-records'],
    table: 'sys_security_data_filter',
    data: {
        description: 'Restrict high-value transactions to authorized personnel',
        table_name: 'finance_transaction',
        mode: 'unless',
        security_attribute: hasFinanceRoleAttribute,
        filter: 'amount>10000^ORclassification=confidential',
    }
})
```

---

## See Also

- [Role API — ServiceNow Fluent](../API-REFERENCE.md#role)
- [Applicability API — ServiceNow Fluent](../API-REFERENCE.md#applicability)
- [Access Control List Rules — ServiceNow Docs](https://docs.servicenow.com/en/bundle/washingtondc-platform-security/page/administer/security/concept/c_AccessControlListRules.html)
