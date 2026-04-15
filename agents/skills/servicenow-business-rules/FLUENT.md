# Fluent SDK Business Rules (.now.ts)

Patterns for creating business rules in ServiceNow SDK projects using TypeScript definitions.

## Table of Contents

1. [Overview](#overview)
2. [Before Rules](#before-rules)
3. [After Rules](#after-rules)
4. [Async Rules](#async-rules)
5. [Display Rules](#display-rules)
6. [Best Practices](#best-practices)

---

## Overview

In SDK projects, business rules are defined using `.now.ts` files (metadata). JavaScript modules are the **preferred** approach for scripts — the BusinessRule `script` property accepts functions, giving you typed Glide API imports, code reuse, and full IDE support. `Now.include()` is the fallback for non-modular scripts.

### Key Fluent Language Constructs

- **`Now.ID['rule_id']`** — Assign a human-readable ID to the business rule (required for `$id`)
- **`Now.include('./file.server.js')`** — Link to external script file with two-way synchronization (recommended for maintainability)
- **`Now.ref('sys_user_role', { name: 'role_name' })`** — Reference a role from another application if needed

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

### File Structure

```
src/
├── fluent/
│   └── business-rules/
│       └── incident_before_rule.now.ts   # Metadata definition
└── server/
    └── business-rules/
        └── incident-before.js           # Module file (preferred)
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `string` | Unique ID via `Now.ID['rule_id']` (required) |
| `name` | `string` | Human-readable name (required) |
| `table` | `string` | Scoped table name (required) |
| `when` | `string` | Timing: `'before'`, `'after'`, `'async'`, `'display'` |
| `action` | `string[]` | Triggers: `'insert'`, `'update'`, `'delete'`, `'query'` |
| `script` | `string \| function` | Module import (preferred) or `Now.include()` |
| `filterCondition` | `string` | Encoded query — prefer over script guards |
| `condition` | `string` | JavaScript condition — use `filterCondition` instead when possible |
| `order` | `number` | Execution order (lower first, default 100) |
| `access` | `string` | Cross-scope: `''`, `'public'`, `'package_private'` |
| `protectionPolicy` | `string` | IP protection: `'read'` or `'protected'` |
| `roleConditions` | `array` | Roles required for execution |

---

## Before Rules

Run before database save, allowing you to modify the current record.

### Metadata Definition (.now.ts)

You have multiple options for providing the script and conditions:

**Option 1: Import JavaScript module with filterCondition** (preferred — typed Glide APIs, code reuse)

```typescript
import { BusinessRule } from '@servicenow/sdk/core'
import { beforeRuleHandler } from '../../server/business-rules/incident-before'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'priority=1^ORpriority=2',
    order: 100,
    script: beforeRuleHandler,
    active: true,
})
```

```javascript
// server/business-rules/incident-before.js
import { gs } from '@servicenow/glide'

export function beforeRuleHandler(current, previous) {
    if (current.priority === previous.priority) return;
    current.setValue('urgency', '1');
}
```

**Option 2: Use `Now.include()` for ServiceNow JavaScript** (recommended for two-way sync)

```typescript
import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'priority=1^ORpriority=2', // Filter query (optional)
    script: Now.include('./incident-before.server.js'),  // Two-way sync with external file
    order: 100,
    active: true,
})
```

**Option 3: Use inline condition property** (for JavaScript conditions)

```typescript
export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    condition: "current.priority == '1' || current.priority == '2'", // JavaScript condition
    script: Now.include('./incident-before.server.js'),
    active: true,
})
```

**Key differences:**
- **`filterCondition`** — ServiceNow encoded query format (string), evaluated efficiently in the database layer
- **`condition`** — JavaScript conditional statement, evaluated in the application layer
- **Do NOT use both** — choose one or the other, never both
- **`Now.include()`** enables two-way synchronization: changes in the UI sync back to your source file, and edits to your `.server.js` file sync back to the instance

### Handler Implementation (.server.js)

```javascript
(function executeRule(current, previous) {
    // Prevent recursive execution
    if (current.priority === previous.priority) {
        return;
    }

    // Auto-set urgency based on priority
    if (current.priority == '1') {
        current.urgency = '1';
        current.assignment_group = 'Critical Support';
    } else if (current.priority == '2') {
        current.urgency = '2';
        current.assignment_group = 'High Priority Support';
    }

    // Validate required fields
    if (!current.short_description || current.short_description.length < 10) {
        gs.addErrorMessage('Short description must be at least 10 characters');
        current.setAbortAction(true);
    }

})(current, previous);
```

### Before Rule with Validation and Message

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_validation_rule'],
    name: 'Complex Incident Validation',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    addMessage: true,
    message: '<p>Please ensure all required fields are properly filled.</p>',
    abortAction: false, // Set to true if you want to block invalid records
    order: 50,
    active: true,
    script: (current, previous) => {
        const errors = [];

        // Multi-step validation
        if (!current.short_description) {
            errors.push('Short description is required');
        } else if (current.short_description.length < 10) {
            errors.push('Short description must be at least 10 characters');
        }

        if (!current.category) {
            errors.push('Category is required');
        }

        // Validate date relationships
        if (current.start_date && current.end_date) {
            const startTime = new GlideDateTime(current.start_date).getNumericValue();
            const endTime = new GlideDateTime(current.end_date).getNumericValue();

            if (startTime >= endTime) {
                errors.push('End date must be after start date');
            }

            // Warn if duration is long
            const daysApart = (endTime - startTime) / (1000 * 60 * 60 * 24);
            if (daysApart > 30) {
                gs.addWarningMessage('Duration exceeds 30 days');
            }
        }

        // Apply validations
        if (errors.length > 0) {
            errors.forEach(error => gs.addErrorMessage(error));
            // Uncomment next line to prevent save if validation fails
            // current.setAbortAction(true);
            return;
        }

        gs.info('Validation passed for incident');
    }
})
```

### Before Rule with Role Conditions

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_role_specific_rule'],
    name: 'Admin-Only Field Validation',
    table: 'incident',
    when: 'before',
    action: ['update'],
    roleConditions: [admin, auditor], // Only runs if user has these roles
    filterCondition: 'type=incident', // Apply to specific records
    script: `
        (function executeRule(current, previous) {
            if (current.se_impersonated) {
                gs.addErrorMessage('Security: Cannot modify sensitive fields');
                current.setAbortAction(true);
            }
        })(current, previous);
    `,
    order: 75,
    active: true,
})
```

### Before Rule with Field Value Setting

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_auto_assign_rule'],
    name: 'Auto-Assign High Priority Incidents',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'priority=1^ORpriority=2', // Only high/medium priority
    setFieldValue: 'assignment_group=critical_support^urgency=1',
    script: Now.include('./auto-assign.server.js'),
    description: 'Automatically assigns critical incidents to the appropriate support group',
    protectionPolicy: 'read', // Prevent instance-level modifications
    order: 25,
    active: true,
})
```

---

## After Rules

Run after database save, allowing you to update related records.

### Metadata Definition

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_after_rule'],
    name: 'Update Related Change Request',
    table: 'incident',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    script: afterRuleHandler,
    order: 100,
    active: true,
    addMessage: false,
    description: 'Updates related change requests when incident status changes',
})
```

### Handler Implementation

```javascript
(function executeAfterRule(current, previous) {
    // After rule: current is already saved

    // Only on state change
    if (current.state === previous.state) {
        return;
    }

    // Update related change request
    if (current.change_request && current.state == 'closed') {
        const change = new GlideRecord('change_request');
        if (change.get(current.change_request)) {
            change.status = 'closed';
            change.update(); // Required to persist
            gs.info('Change request updated for: ' + current.number);
        }
    }

    // Check parent incident status
    if (current.parent_incident && current.state == 'resolved') {
        const unresolved = new GlideRecord('incident');
        unresolved.addQuery('parent_incident', current.parent_incident);
        unresolved.addQuery('state', '!=', 'resolved');
        unresolved.query();

        if (unresolved.getRowCount() === 0) {
            // All children resolved, close parent
            const parent = new GlideRecord('incident');
            if (parent.get(current.parent_incident)) {
                parent.state = 'resolved';
                parent.update();
            }
        }
    }

})(current, previous);
```

---

## Async Rules

Run asynchronously after database commit, perfect for notifications and heavy operations.

### Metadata Definition

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_async_rule'],
    name: 'Send Notification on High Priority',
    table: 'incident',
    when: 'async',
    action: ['insert', 'update'],
    filterCondition: 'priority=1', // Only run for critical incidents
    script: asyncRuleHandler,
    order: 100,
    active: true,
    addMessage: false,
    description: 'Sends notifications to managers for critical priority incidents',
})
```

### Handler Implementation

```javascript
(function executeAsyncRule(current, previous) {
    // Async rule: runs in background, DB is committed

    try {
        // Send notification
        const group = new GlideRecord('sys_user_group');
        if (group.get(current.assignment_group)) {
            const managerEmail = group.manager.getDisplayValue();

            const email = new GlideEmailOutbound();
            email.setTo(managerEmail);
            email.setSubject(`Critical Incident: ${current.number}`);
            email.setBody(`
High Priority Incident Created:
- Number: ${current.number}
- Description: ${current.short_description}
- Priority: ${current.priority}
- Assigned To: ${current.assignment_group.getDisplayValue()}

Please respond immediately.
            `);
            email.send();

            gs.info(`Notification sent for incident: ${current.number}`);
        }
    } catch (error) {
        // Log errors but don't block
        gs.error(`Error in async rule: ${error.message}`);
    }

    // Create audit record
    try {
        const audit = new GlideRecord('incident_update');
        audit.initialize();
        audit.incident = current.sys_id;
        audit.update_type = 'Business Rule Async Execution';
        audit.comments = `Async rule executed for ${current.number}`;
        audit.insert();
    } catch (error) {
        gs.error(`Audit record creation failed: ${error.message}`);
    }

})(current, previous);
```

---

## Display Rules

Run when form loads, useful for UI initialization and passing data to display.

### Metadata Definition

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_display_rule'],
    name: 'Load Related Information',
    table: 'incident',
    when: 'display',
    action: ['query'], // Display rules typically use 'query' action
    script: displayRuleHandler,
    order: 50,
    active: true,
    addMessage: false,
    description: 'Prepares related information for display on incident forms',
})
```

### Handler Implementation

```javascript
(function executeDisplayRule(current, previous) {
    // Display rule: read-only, use g_scratchpad to pass data to UI

    // Get related information
    const change = new GlideRecord('change_request');
    if (current.change_request) {
        change.get(current.change_request);
    }

    // Pass data to client scripts via g_scratchpad
    g_scratchpad.relatedChangeNumber = change.number;
    g_scratchpad.relatedChangeStatus = change.status;
    g_scratchpad.relatedChangeLink = change.getLink();

    // Calculate SLA information
    const created = new GlideDateTime(current.created_on);
    const now = new GlideDateTime();
    const ageHours = (now.getNumericValue() - created.getNumericValue()) / (1000 * 60 * 60);

    g_scratchpad.incidentAge = Math.round(ageHours * 10) / 10; // 1 decimal place

})(current, previous);
```

---

## Best Practices

✓ **Separate metadata from logic** — `.now.ts` file defines; `.server.js` implements
✓ **Use filters in metadata** — Add `filterCondition` or `condition` to avoid unnecessary executions
✓ **Choose the right condition type** — Use `filterCondition` for database-layer filtering (more efficient), `condition` for app-layer logic
✓ **Never use both conditions** — `filterCondition` and `condition` cannot be used together
✓ **Set explicit action array** — Always specify which actions trigger the rule: `['insert']`, `['update']`, `['delete']`, `['query']`
✓ **Handle errors gracefully** — Use try-catch, log to system, don't break user workflow
✓ **Prevent recursion** — Check if field actually changed before modifying related records
✓ **Use g_scratchpad for display** — Pass data from business rule to client scripts in display/after rules
✓ **Call update() in After rules** — Changes won't persist without explicit `update()` call
✓ **Use setFieldValue for auto-assignment** — Leverage `setFieldValue` property for automatic field population in before rules
✓ **Keep logic focused** — Complex business logic should live in Script Includes
✓ **Log operations** — Use `gs.info()` and `gs.error()` for debugging and audit trails
✓ **Set order wisely** — Use `order` to control execution sequence when multiple rules apply to the same table
✓ **Use roleConditions for security** — Restrict rule execution to specific user roles
✓ **Test thoroughly** — Validate rule execution on sub-production before production

---

## Key APIs

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String/Number | Yes | Unique ID for the metadata object. Format: `Now.ID['rule_id']` |
| `name` | String | Yes | Display name in ServiceNow UI |
| `table` | String | Yes | Table name this rule applies to |
| `when` | String | Yes | Execution timing: `'before'`, `'after'`, `'async'`, `'display'` |
| `action` | Array | Yes | Record operations: `['insert']`, `['update']`, `['delete']`, `['query']` — combine as needed |
| `script` | Function/String | Yes | Handler function, `Now.include()` reference, or inline JavaScript |
| `order` | Number | No | Execution sequence (lowest to highest). Default: 100 |
| `active` | Boolean | No | Enable/disable rule. Default: true |
| `filterCondition` | String | No | Encoded query for filtering (database-layer). Do not use with `condition` |
| `condition` | String | No | JavaScript conditional statement (app-layer). Do not use with `filterCondition` |
| `setFieldValue` | String | No | Encoded query for auto-setting field values (e.g., `'field=value^field2=value2'`) |
| `addMessage` | Boolean | No | Display message when rule runs. Default: false |
| `message` | String | No | HTML message to display (requires `addMessage: true`) |
| `abortAction` | Boolean | No | Abort transaction if condition met. Default: false |
| `roleConditions` | Array | No | List of role IDs/references — rule only runs if user has these roles |
| `description` | String | No | Description of what the rule does |
| `protectionPolicy` | String | No | IP protection: `'read'` (readonly on download) or `'protected'` (encrypted) |
| `$meta` | Object | No | Installation metadata: `{ installMethod: 'demo' \| 'first install' }` |

## Context Objects

| Variable | Purpose |
|----------|---------|
| `current` | GlideRecord being processed (can modify in before rules) |
| `previous` | GlideRecord snapshot before changes (read-only) |
| `gs` | GlideSystem object for logging and system operations |
| `g_scratchpad` | Global object to pass data from business rule to client scripts |

---

## Comparison: Classic vs Fluent

| Aspect | Classic | Fluent |
|--------|---------|--------|
| Definition | UI form in instance | TypeScript `.now.ts` file |
| Filter condition | UI conditional builder | Encoded query in metadata |
| Handler location | Inline in UI | Separate `.server.js` file |
| Type safety | None | Full TypeScript support |
| Version control | Manual export | Git tracking |
| Team collaboration | Single instance editing | Standard development workflow |
| IDE support | None | Full IDE intellisense |

---

## When to Use Fluent SDK Business Rules

- ✓ New SDK projects and applications
- ✓ Team uses TypeScript and version control
- ✓ Need type-safe business logic
- ✓ Full-stack SDK applications
- ✓ CI/CD and automated deployments
- ✓ Collaborative development teams

For instance-based customizations, see [CLASSIC.md](CLASSIC.md) for traditional business rule patterns.
