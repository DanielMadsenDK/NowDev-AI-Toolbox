# Cross-Scope Privilege API

The Cross-Scope Privilege API defines cross-scope privileges (`sys_scope_privilege`) for runtime access tracking in ServiceNow Fluent SDK applications.

**Runtime access tracking** allows administrators to manage script access to application resources by creating a list of script operations and targets that the system authorizes to run. This provides granular control over what operations scripts can perform on resources in other application scopes.

**Import from** `@servicenow/sdk/core`:

```ts
import { CrossScopePrivilege } from '@servicenow/sdk/core'
```

For general information about cross-scope privileges, refer to the [Cross-scope privilege record](https://docs.servicenow.com/bundle/washoe-platform-administration/page/administer/security/concept_cross_scope_privilege.html) documentation.

---

## Core Concepts

Cross-scope privileges define which **script operations** and **targets** the system authorizes to run in your application. Each privilege specifies:

- **Target Type**: The resource being accessed (table, script include, or script object)
- **Target Scope**: Which application scope the resource belongs to
- **Operation**: What the script is allowed to do (read, write, create, delete, or execute)
- **Status**: Authorization state (requested, allowed, or denied)

---

## Properties Reference

### Required Properties

| Property | Type | Description | Valid Values |
|----------|------|-------------|---------------|
| `$id` | String or Number | Unique ID for the metadata object using `Now.ID[]` format. Hashed into a unique sys_id at build time. | `Now.ID['privilege_name']` |
| `status` | String | Authorization state for this privilege. | `'requested'`, `'allowed'`, `'denied'` |
| `operation` | String | The script operation to authorize on the target. | `'create'`, `'delete'`, `'read'`, `'write'`, `'execute'` |
| `targetName` | String | Name of the table, script include, or script object being requested. | Table name, script include name, or script object name |
| `targetScope` | String | Application scope from which the resource is requested. | Application scope ID (e.g., `'x_snc_example'`) |
| `targetType` | String | Type of resource being accessed. | `'sys_script_include'`, `'scriptable'`, `'sys_db_object'` |

### Optional Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `$meta` | Object | Installation metadata with `installMethod` property. | `{ installMethod: 'first install' }` |

---

## Valid Values

### `operation` Values

The operation determines what action the script is authorized to perform. The valid operations depend on the `targetType`:

**Tables** (`sys_db_object`):
- `'read'` — Query/display table records
- `'write'` — Update existing table records
- `'create'` — Insert new table records
- `'delete'` — Remove table records

**Script Includes** (`sys_script_include`):
- `'execute'` — Call and execute the script include

**Script Objects** (`scriptable`):
- `'execute'` — Call and execute the script object

### `status` Values

- `'requested'` — Privilege request pending approval
- `'allowed'` — Privilege is authorized and active
- `'denied'` — Privilege is explicitly denied

### `targetType` Values

- `'sys_db_object'` — Target is a database table
- `'sys_script_include'` — Target is a script include
- `'scriptable'` — Target is a script object

### `$meta.installMethod` Values

- `'first install'` — Install only on initial application installation
- `'demo'` — Install with demo data when "Load demo data" option is selected

---

## Basic Example

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow executing a script include from another scope
export const executeScriptPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_execute_script'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'ScriptIncludeName',
    targetScope: 'x_snc_example',
    targetType: 'sys_script_include',
})
```

---

## Common Patterns

### Grant Table Access for Reading

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow reading records from a table in another scope
export const readTablePrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_read_incidents'],
    status: 'allowed',
    operation: 'read',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})
```

### Grant Table Access for Writing

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow updating records in a table in another scope
export const writeTablePrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_write_incidents'],
    status: 'allowed',
    operation: 'write',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})
```

### Grant Table Access for Creating Records

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow creating records in a table in another scope
export const createTablePrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_create_incidents'],
    status: 'allowed',
    operation: 'create',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})
```

### Grant Table Access for Deletion

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow deleting records from a table in another scope
export const deleteTablePrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_delete_incidents'],
    status: 'allowed',
    operation: 'delete',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})
```

### Execute Script Object

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow executing a script object from another scope
export const executeScriptObjectPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_execute_script_object'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'ScriptObjectName',
    targetScope: 'x_snc_example',
    targetType: 'scriptable',
})
```

---

## Installation Metadata

Use `$meta.installMethod` to control when privileges are installed:

```typescript
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Install only on first application install
export const demoPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_demo_privilege'],
    status: 'allowed',
    operation: 'read',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
    $meta: {
        installMethod: 'first install'
    }
})
```

---

## Key Differences: ACLs vs Cross-Scope Privileges

| Aspect | ACLs | Cross-Scope Privileges |
|--------|------|------------------------|
| **Purpose** | Control user access to resources | Control script access across application scopes |
| **Granularity** | User roles, attributes, conditions | Script operations and targets |
| **Scope** | Within same or referenced application | Across different application scopes |
| **Use Case** | Secure UI, data, and operations for users | Allow scripts in one app to safely access resources in another |
| **Who Approves** | Configured by administrators | Requested and approved during runtime |

---

## When to Use Cross-Scope Privileges

✓ **Do use** when:
- Your script needs to access tables, script includes, or script objects in another application scope
- You want to explicitly document and control which cross-scope resources your application uses
- Administrators need to review and approve which external resources your scripts access

✗ **Don't use** for:
- User-level access control (use ACLs instead)
- Protecting resources within your own application scope
- General security policies (use Roles and ACLs)

---

## Approval Workflow

Cross-scope privileges follow a request-approval workflow:

1. **Requested** — Administrator requests the privilege during application setup
2. **Approved** — ServiceNow administrator (or automated process) reviews and approves
3. **Active** — Privilege status changes to `'allowed'` and becomes enforceable
4. **Denied** — Administrator can deny the request, blocking script access

---

## Best Practices

✓ **Be specific** — Request only the operations and targets your scripts actually need

✓ **Use descriptive IDs** — Make `$id` values clear about what resource is being accessed

✓ **Document dependencies** — Note in comments why your application needs each privilege

✓ **Start with `'requested'`** — Request privileges and let administrators approve rather than auto-allowing

✓ **Review regularly** — Audit your privileges to remove unused cross-scope access

✓ **Follow least privilege** — Only grant the minimum operations needed (e.g., `read` instead of `write` if possible)

---

## References

- [ServiceNow Cross-Scope Privilege Records](https://docs.servicenow.com/bundle/washoe-platform-administration/page/administer/security/concept_cross_scope_privilege.html)
- [Access Control List API](./ACL-API.md)
- [Fluent Language Constructs](./API-REFERENCE.md)
