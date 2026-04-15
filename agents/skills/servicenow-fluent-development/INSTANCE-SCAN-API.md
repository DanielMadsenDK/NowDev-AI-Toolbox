# Instance Scan API

Defines instance scan checks that evaluate a ServiceNow instance for upgradability, performance, security, manageability, and user experience issues. Four check types are available: `TableCheck`, `LinterCheck`, `ColumnTypeCheck`, and `ScriptOnlyCheck`.

```ts
import { TableCheck, LinterCheck, ColumnTypeCheck, ScriptOnlyCheck } from '@servicenow/sdk/core'
```

---

## Check Type Selection

| Use Case | Check Type | Key Property |
|----------|-----------|-------------|
| Scan records in a table by condition only | TableCheck | `conditions` (encoded query) |
| Filter records then evaluate with script | TableCheck | `conditions` + `advanced: true` + `script` |
| Lint code across the instance | LinterCheck | (base properties only) |
| Scan columns of a content type | ColumnTypeCheck | `columnType: 'script' \| 'xml' \| 'html'` |
| Standalone script check, no table binding | ScriptOnlyCheck | `script` (inline) |
| Scope findings to upgrade changes | TableCheck | `useManifest: true` |

---

## Categories

All check types require a `category` value classifying what aspect of the instance the check evaluates:

| Category | Description |
|----------|-------------|
| `'security'` | Security vulnerabilities, hardcoded credentials, injection risks |
| `'upgradability'` | Deprecated APIs, patterns that break on upgrade |
| `'performance'` | Large records, slow queries, resource-intensive patterns |
| `'manageability'` | Orphaned records, stale data, configuration drift |
| `'user_experience'` | Accessibility issues, UI anti-patterns |

---

## Shared Properties (All Check Types)

These properties are available on all four check types:

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID using `Now.ID['id']` format |
| `name` | String | Unique name identifying this check |
| `category` | `ScanCategory` | Category classifying the check (`'security'`, `'upgradability'`, `'performance'`, `'manageability'`, `'user_experience'`) |
| `priority` | `ScanPriority` | Severity level: `'1'` = Critical, `'2'` = High, `'3'` = Moderate, `'4'` = Low |
| `shortDescription` | String | Brief summary displayed in scan results |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `active` | Boolean | `true` | Controls whether this check runs during scans |
| `description` | String | N/A | Full explanation of what this check evaluates and why |
| `documentationUrl` | String | N/A | Link to external documentation for this check |
| `findingType` | unknown | `scan_finding` | Table where findings are stored |
| `resolutionDetails` | String | N/A | Guidance on how to remediate findings from this check |
| `runCondition` | String | N/A | Encoded query condition that must be met before this check runs |
| `scoreMin` | Number | `0` | Minimum number of findings before scoring applies |
| `scoreMax` | Number | `100` | Maximum number of findings for scoring calculation |
| `scoreScale` | Number | `1` | Multiplier applied to the finding count for scoring |
| `script` | String | N/A | Server-side script executed when the check runs |

---

## TableCheck

Creates a table check that scans records in a specific table (`scan_table_check`).

Supports three modes:
- **Condition-only**: use `conditions` to filter records — every match is a finding
- **Script-only**: set `advanced: true` and provide a `script`
- **Combined**: set `advanced: true` with both `conditions` and `script`

### Additional Properties (TableCheck-specific)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `table` | `keyof Tables` | Yes | Table to scan |
| `advanced` | Boolean | No | Enables custom script mode instead of condition-based scanning |
| `conditions` | String | No | Encoded query filtering which records to evaluate |
| `useManifest` | Boolean | No | Uses the upgrade manifest to scope findings to changed records |

### How Conditions and Scripts Work Together

| Aspect | Condition-Only Mode | Advanced Mode |
|--------|-------------------|---------------|
| When to use | Every matching record is a finding | Need custom logic per record |
| Configuration | `conditions: 'encoded_query'` | `conditions` + `advanced: true` + `script` |
| Script required | No | Yes |
| Flow | conditions → all matches = findings | conditions → filter → script per record → `finding.increment()` |

### Script Signature (Advanced Mode)

```javascript
(function(engine, current) {
    // engine.finding — the Finding API object
    // current — the GlideRecord for the filtered record
    engine.finding.setCurrentSource(current);
    engine.finding.increment();
})(engine, current);
```

---

## LinterCheck

Creates a linter check that runs linting rules against instance code (`scan_linter_check`).

LinterCheck has **no additional properties** beyond the shared set. It uses the `script` property with the AST engine API.

### Script Signature

```javascript
(function(engine) {
    // engine.finding — the Finding API object
    // engine.rootNode — the AST root node
    engine.rootNode.visit(function(node) {
        // walk the AST tree
    });
})(engine);
```

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

Creates a column type check that scans columns of a specific content type (`scan_column_type_check`).

### Additional Properties (ColumnTypeCheck-specific)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `columnType` | `ColumnType` | Yes | Content type of columns to scan: `'script'`, `'xml'`, or `'html'` |

### Script Signature

```javascript
(function(engine, current, columnValue) {
    // engine.finding — the Finding API object
    // current — the GlideRecord containing the column
    // columnValue — the string content of the column being scanned
    engine.finding.increment();
})(engine, current, columnValue);
```

---

## ScriptOnlyCheck

Creates a script-only check that executes a standalone script with no table binding (`scan_script_only_check`).

ScriptOnlyCheck has **no additional properties** beyond the shared set. It relies on the `script` property for all logic.

### Script Signature

```javascript
(function(finding) {
    // finding — the Finding API object (direct access, no engine wrapper)
    finding.increment();
})(finding);
```

Or with engine wrapper:

```javascript
(function(engine) {
    // engine.finding — the Finding API object
    engine.finding.increment();
})(engine);
```

---

## Finding API

The Finding API is available inside scan scripts to register findings.

| Method | Description |
|--------|-------------|
| `engine.finding.increment()` | Register a finding |
| `engine.finding.setCurrentSource(record)` | Set the source GlideRecord |
| `engine.finding.setValue('finding_details', '...')` | Add descriptive text |
| `engine.finding.setValue('count', number)` | Set the finding count |

---

## Scoring Configuration

| Property | Default | Description |
|----------|---------|-------------|
| `scoreMin` | `0` | Minimum findings before scoring applies |
| `scoreMax` | `100` | Maximum findings for scoring |
| `scoreScale` | `1` | Multiplier applied to finding count |

**High-impact security check:** `scoreMin: 0, scoreMax: 50, scoreScale: 5`

**Low-impact informational check:** `scoreMin: 10, scoreMax: 500, scoreScale: 1`

---

## Examples

### Condition-Based TableCheck

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const inactiveUsersWithRoles = TableCheck({
  $id: Now.ID['check-inactive-users-roles'],
  name: 'Inactive Users with Roles',
  active: true,
  category: 'security',
  priority: '2',
  shortDescription: 'Finds inactive users that still have active role assignments',
  table: 'sys_user',
  conditions: 'active=false^roles!=',
  resolutionDetails: 'Remove role assignments from inactive user accounts.',
})
```

### Advanced Script-Based TableCheck

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const largeAttachmentCheck = TableCheck({
  $id: Now.ID['check-large-attachments'],
  name: 'Large Attachment Detector',
  active: true,
  category: 'performance',
  priority: '3',
  shortDescription: 'Identifies oversized attachments that impact performance',
  table: 'sys_attachment',
  advanced: true,
  script: `(function(engine, current) {
    var size = parseInt(current.getValue('size_bytes'), 10);
    if (size > 10485760) {
        engine.finding.setCurrentSource(current);
        engine.finding.increment();
    }
})(engine, current);`,
  resolutionDetails: 'Review large attachments and move to external storage.',
  useManifest: true,
})
```

### Combined Conditions + Script TableCheck

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const staleIncidentCheck = TableCheck({
  $id: Now.ID['check-stale-incidents'],
  name: 'Stale Incident Detector',
  active: true,
  category: 'manageability',
  priority: '2',
  shortDescription: 'Finds incidents that are open and stale',
  table: 'incident',
  advanced: true,
  conditions: 'state!=6^state!=7',
  script: `(function(engine, current) {
    var lastUpdated = new GlideDateTime(current.sys_updated_on);
    var now = new GlideDateTime();
    var diff = GlideDateTime.subtract(lastUpdated, now);
    if (diff.getNumericValue() > 7776000000) {
        engine.finding.increment();
    }
})(current);`,
  resolutionDetails: 'Review stale incidents and close or reassign them.',
})
```

### ScriptOnlyCheck

```typescript
import { ScriptOnlyCheck } from '@servicenow/sdk/core'

export const adminRoleAudit = ScriptOnlyCheck({
  $id: Now.ID['check-admin-ratio'],
  name: 'Admin Role Ratio Check',
  active: true,
  category: 'security',
  priority: '1',
  shortDescription: 'Flags if admin users exceed 5% of total active users',
  script: `(function(finding) {
    var gr = new GlideRecord('sys_user_has_role');
    gr.addQuery('role.name', 'admin');
    gr.addQuery('user.active', true);
    gr.query();
    var adminCount = gr.getRowCount();

    var ga = new GlideAggregate('sys_user');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.query();
    ga.next();
    var total = parseInt(ga.getAggregate('COUNT'), 10);

    if (total > 0 && (adminCount / total) > 0.05) {
        finding.increment();
    }
})(finding);`,
  resolutionDetails: 'Review admin role assignments and reduce to minimum necessary.',
})
```

### LinterCheck

```typescript
import { LinterCheck } from '@servicenow/sdk/core'

export const evalUsageCheck = LinterCheck({
  $id: Now.ID['check-eval-usage'],
  name: 'Eval Usage Detector',
  active: true,
  category: 'security',
  priority: '1',
  shortDescription: 'Detects usage of eval() in scripts',
  script: `(function(engine) {
    var line_numbers = [];
    engine.rootNode.visit(function(node) {
        if (node.getTypeName() === 'NAME' &&
            node.getNameIdentifier() === 'eval' &&
            node.getParent().getTypeName() === 'CALL') {
            line_numbers.push(node.getLineNo() + 1);
        }
    });
    if (line_numbers.length == 0) return;
    engine.finding.setValue('finding_details', 'Found on lines: ' + line_numbers.join(', '));
    engine.finding.setValue('count', line_numbers.length);
    engine.finding.increment();
})(engine);`,
  resolutionDetails: 'Replace eval() with safer alternatives.',
})
```

### ColumnTypeCheck

```typescript
import { ColumnTypeCheck } from '@servicenow/sdk/core'

export const scriptPatternCheck = ColumnTypeCheck({
  $id: Now.ID['check-script-pattern'],
  name: 'Dangerous Script Pattern Detector',
  active: true,
  category: 'security',
  priority: '2',
  shortDescription: 'Scans script columns for dangerous patterns',
  columnType: 'script',
  script: `(function(engine, current, columnValue) {
    var skip_tables = ['sys_script_execution_history', 'scan_column_type_check'];
    if (current.getTableName && skip_tables.indexOf(current.getTableName()) > -1) return;

    var search_regex = /PATTERN_TO_FIND/;
    if (!search_regex.test(columnValue)) return;

    var comments_regex = /\\/\\*[\\s\\S]*?\\*\\/|([^:]|^)\\/\\/.*$/gm;
    var clean = columnValue.replace(comments_regex, '');
    if (clean.length == columnValue.length || search_regex.test(clean))
        engine.finding.increment();
})(engine, current, columnValue);`,
  resolutionDetails: 'Review and remediate flagged script patterns.',
})
```

### ColumnTypeCheck — HTML XSS Scanner

```typescript
import { ColumnTypeCheck } from '@servicenow/sdk/core'

export const htmlColumnXssCheck = ColumnTypeCheck({
  $id: Now.ID['html-column-xss'],
  name: 'HTML Column XSS Scanner',
  active: true,
  category: 'security',
  priority: '1',
  shortDescription: 'Detects potential cross-site scripting vulnerabilities in HTML columns',
  columnType: 'html',
})
```
