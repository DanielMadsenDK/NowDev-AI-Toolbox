---
name: servicenow-instance-scan
context: fork
user-invocable: false
description: Create Instance Scan checks using the Fluent SDK to detect security vulnerabilities, deprecated API usage, performance anti-patterns, and data quality issues across a ServiceNow instance. Covers four check types: ColumnTypeCheck (scan columns by content type), LinterCheck (code linting rules), ScriptOnlyCheck (standalone scripts), and TableCheck (record-level condition or script scanning). Use when building automated governance rules that run as part of instance health checks. Trigger this skill whenever the user mentions instance scan, automated governance checks, instance health rules, code linting for ServiceNow, or building checks that detect security or quality issues across an instance.
---

# ServiceNow Instance Scan — Fluent SDK

## Overview

Instance Scan lets you define automated checks that inspect your ServiceNow instance for problems — security risks, deprecated patterns, performance anti-patterns, and data quality issues. When a scan runs, each check produces **findings** that appear in the scan results dashboard.

Four check types are available, all imported from `@servicenow/sdk/core`:

| Function | Record Table | What It Inspects |
|----------|-------------|-----------------|
| `ColumnTypeCheck` | `scan_column_type_check` | All columns of a specific content type (e.g., all script columns) |
| `LinterCheck` | `scan_linter_check` | Code patterns across scripts instance-wide |
| `ScriptOnlyCheck` | `scan_script_only_check` | Arbitrary logic — no table binding required |
| `TableCheck` | `scan_table_check` | Records in a specific table, filtered by condition or advanced script |

---

## Shared Properties

All four check types share a common set of required and optional properties:

### Required

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique metadata identifier |
| `name` | string | Unique name shown in scan admin and results |
| `category` | `ScanCategory` | Check classification (see below) |
| `priority` | `ScanPriority` | Severity level affecting score impact |
| `shortDescription` | string | One-line summary shown in scan results |

### Optional (all types)

| Property | Type | Description |
|----------|------|-------------|
| `active` | boolean | Whether this check runs. Defaults to `true` |
| `description` | string | Full explanation of what the check evaluates |
| `resolutionDetails` | string | Guidance on how to fix findings |
| `documentationUrl` | string | Link to external docs for this check |
| `script` | string | Server-side check script |
| `runCondition` | string | Encoded query that must be true for the check to run |
| `scoreMin` | number | Minimum findings before scoring applies |
| `scoreMax` | number | Maximum findings for scoring calculation |
| `scoreScale` | number | Multiplier applied to the finding count |
| `findingType` | unknown | Table where findings are stored. Defaults to `scan_finding` |

### Categories

| Value | What It Covers |
|-------|---------------|
| `'security'` | Vulnerabilities, access control weaknesses |
| `'performance'` | Slow patterns, resource-heavy operations |
| `'upgradability'` | Deprecated APIs, customisations that block upgrades |
| `'manageability'` | Orphaned records, hygiene, data quality |
| `'user_experience'` | Accessibility, UI patterns, user-facing issues |

### Priorities

| Value | Severity |
|-------|---------|
| `'1'` | Critical |
| `'2'` | High |
| `'3'` | Moderate |
| `'4'` | Low |

---

## Script Signatures by Check Type

| Check Type | Signature | Key Objects |
|-----------|-----------|-------------|
| TableCheck (advanced) | `(function(engine, current) {...})(engine, current)` | `engine.finding`, `current` (filtered record) |
| ScriptOnlyCheck | `(function(finding) {...})(finding)` or `(function(engine) {...})(engine)` | `finding` / `engine.finding` |
| ColumnTypeCheck | `(function(engine, current, columnValue) {...})(engine, current, columnValue)` | `engine.finding`, `current`, `columnValue` |
| LinterCheck | `(function(engine) {...})(engine)` | `engine.finding`, `engine.rootNode` (AST root) |

### Finding API

| Method | Description |
|--------|-------------|
| `engine.finding.increment()` | Register a finding |
| `engine.finding.setCurrentSource(record)` | Set the source GlideRecord |
| `engine.finding.setValue('finding_details', '...')` | Add descriptive text |
| `engine.finding.setValue('count', number)` | Set the finding count |

### LinterCheck Engine API

| Property / Method | Description |
|-------------------|-------------|
| `engine.rootNode` | The AST root node |
| `engine.rootNode.visit(callback)` | Walk the AST tree |
| `node.getTypeName()` | AST node type (`"NAME"`, `"CALL"`, `"FUNCTION"`) |
| `node.getNameIdentifier()` | Identifier name for NAME nodes |
| `node.getParent()` | Parent AST node |
| `node.getLineNo()` | Line number (0-based) |

---

## ColumnTypeCheck

Scans every column of a specific content type across the entire instance.

```typescript
import { ColumnTypeCheck } from '@servicenow/sdk/core'

export const scriptColumnCheck = ColumnTypeCheck({
    $id: Now.ID['check_script_columns'],
    name: 'Script Column Security Review',
    category: 'security',
    priority: '2',
    shortDescription: 'Scans all script-type columns for security anti-patterns',
    columnType: 'script',
    description: 'Inspects every script column across the instance for hardcoded credentials, unsafe eval usage, and SQL injection vectors.',
    resolutionDetails: 'Replace hardcoded values with system properties or credential records. Use parameterised queries instead of string concatenation.',
    scoreMin: 0,
    scoreMax: 100,
    scoreScale: 1,
})
```

`columnType` is required — specify the column content type to target (e.g., `'script'`, `'html'`, `'url'`).

---

## LinterCheck

Applies linting rules to scripts across the instance, flagging code that matches (or fails to match) a pattern.

```typescript
import { LinterCheck } from '@servicenow/sdk/core'

export const deprecatedApiLint = LinterCheck({
    $id: Now.ID['lint_deprecated_api'],
    name: 'Deprecated GlideRecord API',
    category: 'upgradability',
    priority: '3',
    shortDescription: 'Detects calls to deprecated GlideRecord and GlideSystem APIs',
    description: 'Scans server-side scripts for deprecated API calls that may be removed in future platform releases.',
    resolutionDetails: 'Replace deprecated calls with current equivalents as documented in the ServiceNow API reference.',
    script: Now.include('./lint-deprecated-api.js'),
})
```

Use `Now.include('./check.js')` to keep complex linting logic in a separate `.js` file for better IDE support.

---

## ScriptOnlyCheck

Runs a standalone script with no table binding. Use when the check logic needs to query multiple tables or implement complex reasoning.

```typescript
import { ScriptOnlyCheck } from '@servicenow/sdk/core'

export const adminOveruseCheck = ScriptOnlyCheck({
    $id: Now.ID['check_admin_overuse'],
    name: 'Admin Role Overuse',
    category: 'security',
    priority: '1',
    shortDescription: 'Flags instances where too many users hold the admin role',
    description: 'Counts active users with the admin role. Raises a finding when the count exceeds acceptable thresholds.',
    resolutionDetails: 'Review admin role assignments. Replace broad admin access with scoped roles wherever possible.',
    script: Now.include('./check-admin-overuse.js'),
    scoreMin: 0,
    scoreMax: 20,
    scoreScale: 5,
})
```

In the linked `.js` file, call `finding.increment()` to report each violation found:

```javascript
// check-admin-overuse.js
;(function checkAdminOveruse() {
    var gr = new GlideAggregate('sys_user_has_role');
    gr.addQuery('role.name', 'admin');
    gr.addQuery('user.active', true);
    gr.addAggregate('COUNT');
    gr.query();

    if (gr.next()) {
        var count = parseInt(gr.getAggregate('COUNT'));
        if (count > 15) {
            finding.increment();
        }
    }
})();
```

---

## TableCheck

Scans records in a specific table. Supports three modes:

| Mode | Config |
|------|--------|
| **Condition-only** | Provide `conditions` encoded query — no script needed |
| **Script-only** | Set `advanced: true` and provide `script` |
| **Combined** | Set `advanced: true` with both `conditions` and `script` |

### Condition-Only (simplest)

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const inactiveUsersWithRoles = TableCheck({
    $id: Now.ID['check_inactive_users_roles'],
    name: 'Inactive Users Retaining Roles',
    category: 'security',
    priority: '2',
    shortDescription: 'Finds inactive user accounts that still hold active role assignments',
    table: 'sys_user',
    conditions: 'active=false^roles!=',    // ServiceNow encoded query
    description: 'Deactivated user accounts with retained roles pose a security risk if ever reactivated.',
    resolutionDetails: 'Remove role assignments from inactive accounts, or document why the roles are intentionally retained.',
})
```

### Advanced Script Mode

```typescript
export const largeAttachmentCheck = TableCheck({
    $id: Now.ID['check_large_attachments'],
    name: 'Oversized Attachments',
    category: 'performance',
    priority: '3',
    shortDescription: 'Identifies attachments exceeding the recommended size threshold',
    table: 'sys_attachment',
    advanced: true,
    script: Now.include('./check-large-attachments.js'),
    useManifest: true,   // Scopes findings to records changed in the latest upgrade
})
```

In the script, `current` refers to each matching record — call `finding.increment()` for each violation:

```javascript
// check-large-attachments.js
;(function checkLargeAttachments(current) {
    var MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (parseInt(current.getValue('size_bytes')) > MAX_BYTES) {
        finding.increment();
    }
})(current);
```

### Combined Mode

```typescript
export const staleIncidents = TableCheck({
    $id: Now.ID['check_stale_incidents'],
    name: 'Stale Open Incidents',
    category: 'manageability',
    priority: '2',
    shortDescription: 'Finds incidents open for more than 90 days without activity',
    table: 'incident',
    advanced: true,
    conditions: 'state!=6^state!=7',     // Pre-filter: not Resolved or Closed
    script: Now.include('./check-stale-incidents.js'),
})
```

---

## Scoring

The scoring properties control how findings affect the overall instance health score:

```
score = min(finding_count, scoreMax) * scoreScale
```

Set `scoreMin` and `scoreMax` to normalise extreme finding counts. For binary checks (pass/fail), set `scoreMax: 1` and `scoreScale: 100`.

---

## Critical Rules

| Rule | Why |
|------|-----|
| Every check needs a unique `$id: Now.ID['...']` | Prevents duplicate check records on install |
| `finding.increment()` / `engine.finding.increment()` is the **only** way to report violations | Platform-provided variable injected into check scripts |
| Prefer inline scripts for check logic | Official guidance recommends inline scripts over `Now.include()` for scan checks |
| `advanced: true` is required to use a `script` in `TableCheck` | Without it, only `conditions` is evaluated |
| Set meaningful `resolutionDetails` | Appears in scan results to guide remediation |
| Test checks with `active: false` initially | Prevents noisy or incorrect findings in production |
| Use ES5 syntax in scripts | `var` (not `const`/`let`), `function() {}` (not arrow functions), no template literals, no `for...of` |

---

## Build Placement

Instance Scan checks are Logic-layer artifacts. They can be placed alongside Business Rules in your project:

```
src/
  fluent/
    logic/
      instance-scan/
        security-checks.now.ts        ← ColumnTypeCheck, ScriptOnlyCheck
        performance-checks.now.ts     ← LinterCheck, TableCheck
        scripts/
          check-admin-overuse.js      ← External script files (if needed)
          check-large-attachments.js
```

---

## Metadata

Control when checks are installed using `$meta.installMethod`:

```javascript
$meta: { installMethod: "demo" }          // Installed with "Load demo data"
$meta: { installMethod: "first install" } // Installed only on first app install
```

Omit `$meta` for checks that should always be installed.
