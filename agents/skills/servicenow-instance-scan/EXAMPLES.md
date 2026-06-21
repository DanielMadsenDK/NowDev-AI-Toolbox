# Instance Scan Examples

Use these examples as starting points after verifying current API details with:

```bash
now-sdk explain instance-scan-guide --format raw
now-sdk explain tablecheck-api --format raw
now-sdk explain lintercheck-api --format raw
now-sdk explain columntypecheck-api --format raw
now-sdk explain scriptonlycheck-api --format raw
```

## Security: Inactive Users With Roles

Use a `TableCheck` when a single table can express the finding.

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const inactiveUsersWithRoles = TableCheck({
    $id: Now.ID['scan_inactive_users_with_roles'],
    name: 'Inactive users with assigned roles',
    category: 'security',
    priority: '2',
    table: 'sys_user_has_role',
    conditions: 'user.active=false',
    shortDescription: 'Inactive users should not retain platform roles',
    description: 'Finds role assignments where the referenced user is inactive.',
    resolutionDetails: 'Remove roles from inactive users or reactivate the user only after access review.',
})
```

## Upgradability: Deprecated API Linter

Use a `LinterCheck` for script syntax patterns.

```typescript
import { LinterCheck } from '@servicenow/sdk/core'

export const deprecatedApiLinter = LinterCheck({
    $id: Now.ID['scan_deprecated_api_linter'],
    name: 'Deprecated API usage',
    category: 'upgradability',
    priority: '3',
    shortDescription: 'Detects deprecated script APIs',
    description: 'Flags calls to APIs that should be replaced before platform upgrades.',
    resolutionDetails: 'Replace deprecated APIs with supported equivalents from current ServiceNow documentation.',
    script: Now.include('./deprecated-api-linter.js'),
})
```

```javascript
// deprecated-api-linter.js
;(function(engine) {
    var deprecatedNames = ['gs.log'];
    engine.rootNode.visit(function(node) {
        if (node.getTypeName && node.getTypeName() === 'NAME') {
            var name = node.getNameIdentifier && node.getNameIdentifier();
            if (deprecatedNames.indexOf(name) >= 0) {
                engine.finding.increment();
                engine.finding.setValue('finding_details', 'Deprecated API found: ' + name);
            }
        }
    });
})(engine);
```

## Performance: Script Columns With GlideRecord In Loops

Use `ColumnTypeCheck` when scanning every script-like column across the instance.

```typescript
import { ColumnTypeCheck } from '@servicenow/sdk/core'

export const glideRecordLoopCheck = ColumnTypeCheck({
    $id: Now.ID['scan_gliderecord_in_loop'],
    name: 'GlideRecord inside loops',
    category: 'performance',
    priority: '2',
    columnType: 'script',
    shortDescription: 'Detects potential GlideRecord queries inside loops',
    description: 'Scans script fields for patterns that often indicate repeated queries in loops.',
    resolutionDetails: 'Move queries outside loops, batch record access, or use aggregate queries where possible.',
    script: Now.include('./gliderecord-loop-check.js'),
})
```

## Manageability: Missing Description On Script Includes

Use `TableCheck` for metadata hygiene checks.

```typescript
import { TableCheck } from '@servicenow/sdk/core'

export const scriptIncludeDescriptionCheck = TableCheck({
    $id: Now.ID['scan_script_include_description'],
    name: 'Script Include missing description',
    category: 'manageability',
    priority: '4',
    table: 'sys_script_include',
    conditions: 'descriptionISEMPTY^active=true',
    shortDescription: 'Active Script Includes should describe their purpose',
    description: 'Finds active Script Includes without descriptions.',
    resolutionDetails: 'Add a concise description covering ownership, purpose, and primary callers.',
})
```

## Multi-Table Governance: Admin Role Overuse

Use `ScriptOnlyCheck` when the logic spans tables or needs custom aggregation.

```typescript
import { ScriptOnlyCheck } from '@servicenow/sdk/core'

export const adminRoleOveruse = ScriptOnlyCheck({
    $id: Now.ID['scan_admin_role_overuse'],
    name: 'Admin role overuse',
    category: 'security',
    priority: '1',
    shortDescription: 'Flags excessive active admin role assignments',
    description: 'Counts active users with admin access and raises a finding when the threshold is exceeded.',
    resolutionDetails: 'Review admin users and replace broad access with least-privilege scoped roles.',
    script: Now.include('./admin-role-overuse.js'),
})
```

```javascript
// admin-role-overuse.js
;(function(finding) {
    var count = 0;
    var roles = new GlideRecord('sys_user_has_role');
    roles.addQuery('role.name', 'admin');
    roles.addQuery('user.active', true);
    roles.query();
    while (roles.next()) {
        count++;
    }
    if (count > 15) {
        finding.increment();
        finding.setValue('finding_details', 'Active admin users: ' + count);
    }
})(finding);
```

## Review Checklist

- [ ] Category and priority match the real risk.
- [ ] `shortDescription` is clear enough for scan results.
- [ ] `resolutionDetails` tells admins exactly what to do.
- [ ] Complex scripts are externalized with `Now.include()`.
- [ ] Checks avoid expensive unbounded queries.
- [ ] Findings include useful details for remediation.
