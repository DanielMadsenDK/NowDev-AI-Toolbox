# Security Guide — Fluent SDK (Security Attributes & Data Filters)

Covers the two security layer components not in the ACL or Role API files:  
**Security Attributes** (`sys_security_attribute`) and **Security Data Filters** (`sys_security_data_filter`).

For the full ACL reference, see [ACL-API.md](./ACL-API.md).  
For the full Role reference, see [ROLE-API.md](./ROLE-API.md).

---

## Overall Security Model

The layered security model has four components, applied in this order:

| Layer | API / Table | Purpose |
|-------|-------------|---------|
| 1. Roles | `Role()` | Define personas with permissions |
| 2. ACLs | `Acl()` | Control access to objects and operations |
| 3. Security Attributes | Record on `sys_security_attribute` | Reusable security predicates referenced by ACLs |
| 4. Data Filters | Record on `sys_security_data_filter` | Row-level filtering (hide specific records) |

**Build order:** Define Roles first → create ACLs → define Security Attributes → add Data Filters.

---

## ACL Evaluation Order

1. Deny-Unless ACLs evaluate first — if any fail, access is denied
2. Allow-If ACLs evaluate second — at least one must pass to grant access
3. Within each ACL: roles, condition, and script ALL must pass (the "Trinity")

---

## Security Attributes (`sys_security_attribute`)

Security Attributes define **reusable security predicates** that can be referenced in multiple ACLs and Data Filters. Prefer `compound` type — it is the only type that can be referenced in ACLs and Data Filters.

### Security Attribute Types

| Type | Condition / Script | Cacheable |
|------|--------------------|-----------|
| `compound` | Role/group conditions via encoded query | Yes (set `is_dynamic: false`) |
| `true\|false` | Complex boolean logic via script | No |
| `string` / `integer` / `list` | Value calculations | No |

### Key Rules

- Use the `condition` field for `compound` types with encoded query syntax (e.g., `"Role=manager^ORRole=admin"`)
- **NEVER** use `current` in security attribute scripts — no record context available
- Set `is_dynamic: false` for role/group checks that can be cached per session
- Only `compound` type Security Attributes can be referenced in ACLs and Data Filters

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique attribute name |
| `type` | string | `'compound'`, `'true\|false'`, `'string'`, `'integer'`, `'list'` |
| `label` | string | Display label |
| `description` | string | Purpose description |
| `condition` | string | Encoded query (compound type only) |
| `script` | string | JavaScript logic (true\|false type only) |
| `is_dynamic` | boolean | If `false`, result is cached per session |

### Examples

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

// Compound type (RECOMMENDED — cacheable, referenceable in ACLs and Data Filters)
export const hasManagerRole = Record({
  $id: Now.ID['has-manager-role'],
  table: 'sys_security_attribute',
  data: {
    name: 'HasManagerRole',
    type: 'compound',
    label: 'Has Manager Role',
    description: 'Checks if the current user has the manager role',
    condition: 'Role=manager',  // Encoded query syntax
    is_dynamic: false,           // Cache per session
  }
})

// Compound with OR logic
export const hasManagerOrAdmin = Record({
  $id: Now.ID['has-manager-or-admin'],
  table: 'sys_security_attribute',
  data: {
    name: 'HasManagerOrAdminRole',
    type: 'compound',
    label: 'Has Manager or Admin Role',
    condition: 'Role=manager^ORRole=admin',
    is_dynamic: false,
  }
})

// Boolean script type (for complex logic not expressible as encoded query)
export const hasFinanceRole = Record({
  $id: Now.ID['has-finance-role'],
  table: 'sys_security_attribute',
  data: {
    name: 'HasFinanceRole',
    type: 'true|false',
    label: 'Has Finance Role',
    script: 'answer = gs.hasRole("finance") || gs.getUser().isMemberOf("finance_users");',
    is_dynamic: false,
  }
})
```

---

## Security Data Filters (`sys_security_data_filter`)

Security Data Filters implement **row-level security** — they restrict which records a user can see on a table. They must always be paired with Deny ACLs — Data Filters alone do not provide complete security.

### How Data Filters Work

1. A **Deny ACL** blocks access to the table unless the user meets a condition
2. The **Data Filter** adds a query condition to limit which rows are returned
3. The `security_attribute` (must be `compound` type) determines which users the filter applies to

### Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `description` | string | Yes | — | Descriptive name for the filter |
| `table_name` | string | Yes | — | Target table (e.g., `'incident'`) |
| `mode` | string | Yes | — | `'if'` (filter when condition met) or `'unless'` (filter unless condition met) |
| `security_attribute` | reference | Yes | — | Reference to a `compound` Security Attribute variable |
| `filter` | string | No | — | Encoded query condition (use dynamic conditions where possible) |
| `active` | boolean | No | `true` | Whether the filter is active |

### Key Rules

- `security_attribute` is required — always reference a `compound` Security Attribute
- Use dynamic conditions (e.g., `fieldnameDYNAMIC<sys_id>` for current user) instead of hardcoded values
- Use indexed columns in filters for performance
- **NEVER** rely on Data Filters alone — always pair with Deny ACLs
- `mode: 'if'` = apply filter when the attribute is true; `mode: 'unless'` = apply filter unless attribute is true

### Example: Row-Level Security for High-Value Finance Records

```typescript
import '@servicenow/sdk/global'
import { Record, Acl, Role } from '@servicenow/sdk/core'

// 1. Define the role
const financeRole = Role({
  $id: Now.ID['finance-role'],
  name: 'x_my_app.finance',
})

// 2. Define a compound Security Attribute
export const hasFinanceRoleAttribute = Record({
  $id: Now.ID['has-finance-attribute'],
  table: 'sys_security_attribute',
  data: {
    name: 'HasFinanceRole',
    type: 'compound',
    label: 'Has Finance Role',
    condition: 'Role=x_my_app.finance',
    is_dynamic: false,
  }
})

// 3. Add a Deny ACL to block the table unless user has finance role
export const financeDenyAcl = Acl({
  $id: Now.ID['finance-deny-acl'],
  type: 'record',
  table: 'finance_transaction',
  operation: 'read',
  decisionType: 'deny',
  roles: [financeRole],
})

// 4. Add an Allow ACL to grant access
export const financeAllowAcl = Acl({
  $id: Now.ID['finance-allow-acl'],
  type: 'record',
  table: 'finance_transaction',
  operation: 'read',
  decisionType: 'allow',
  roles: [financeRole],
})

// 5. Add a Data Filter to limit rows returned (only high-value or confidential)
export const filterFinancialRecords = Record({
  $id: Now.ID['filter-financial-records'],
  table: 'sys_security_data_filter',
  data: {
    description: 'Restrict high-value transactions to authorized personnel',
    table_name: 'finance_transaction',
    mode: 'unless',  // Apply filter UNLESS user has finance role
    security_attribute: hasFinanceRoleAttribute,
    filter: 'amount>10000^ORclassification=confidential',
  }
})
```

---

## Avoidance

- **NEVER** create roles without scope prefix — use `x_scope.role_name` format
- **NEVER** use scripts in ACLs for simple role checks — use the `roles` property
- **NEVER** rely on Data Filters alone — always pair with Deny ACLs
- **NEVER** use `current` in Security Attribute scripts — no record context available
- **NEVER** hardcode user IDs or names in ACL scripts or Data Filter conditions
- **NEVER** use non-compound Security Attributes in ACLs — only `compound` type is supported
- **NEVER** create a `string`, `integer`, or `list` type Security Attribute if you need it in an ACL or Data Filter — use `compound`
