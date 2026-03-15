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

In SDK projects, business rules are defined using `.now.ts` files (metadata) with handler functions in accompanying `.server.js` files.

### File Structure

```
src/
├── rules/
│   ├── incident_before_rule.now.ts      # Metadata definition
│   └── handlers/
│       └── incident-before.server.js    # Execution code
```

---

## Before Rules

Run before database save, allowing you to modify the current record.

### Metadata Definition (.now.ts)

```typescript
import { BusinessRule } from '@servicenow/sdk/core'
import { beforeRuleHandler } from '../handlers/incident-before.server.js'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    active: true,
    table: 'incident',
    when: 'before',
    filter: "priority=1ORpriority=2", // Condition (optional)
    script: beforeRuleHandler,
})
```

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

### Complex Validation

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_validation_rule'],
    name: 'Complex Incident Validation',
    active: true,
    table: 'incident',
    when: 'before',
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
            current.setAbortAction(true);
            return;
        }

        gs.info('Validation passed for incident');
    }
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
    active: true,
    table: 'incident',
    when: 'after',
    script: afterRuleHandler,
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
    active: true,
    table: 'incident',
    when: 'async',
    filter: "priority=1", // Only run for critical incidents
    script: asyncRuleHandler,
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
    active: true,
    table: 'incident',
    when: 'display',
    script: displayRuleHandler,
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

✓ **Separate metadata from logic** - `.now.ts` file defines; `.server.js` implements
✓ **Use filters in metadata** - Add conditions in the rule definition to avoid unnecessary executions
✓ **Handle errors gracefully** - Use try-catch, log to system, don't break user workflow
✓ **Prevent recursion** - Check if field actually changed before modifying related records
✓ **Use g_scratchpad for display** - Pass data from business rule to client scripts
✓ **Call update() in After rules** - Changes won't persist without explicit `update()` call
✓ **Keep logic focused** - Complex business logic should live in Script Includes
✓ **Log operations** - Use `gs.info()` and `gs.error()` for debugging and audit trails
✓ **Test thoroughly** - Validate rule execution on sub-production before production

---

## Key APIs

| API | Purpose |
|-----|---------|
| `BusinessRule()` | SDK function to define a business rule |
| `$id` | Unique identifier for this rule |
| `name` | Display name in ServiceNow UI |
| `table` | Table name this rule applies to |
| `when` | Execution timing: 'before', 'after', 'async', 'display' |
| `filter` | Optional condition for when to run (encoded query format) |
| `script` | Handler function or imported handler |
| `current` | GlideRecord being processed |
| `previous` | Snapshot before changes |
| `g_scratchpad` | Global object to pass data to client scripts |

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
