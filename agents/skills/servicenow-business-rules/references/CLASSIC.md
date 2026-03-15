# Classic Business Rules (Instance-Based)

Patterns for creating business rules directly in ServiceNow instances using the Business Rules UI.

## Table of Contents

1. [Execution Timing](#execution-timing)
2. [Before Rules](#before-rules)
3. [After Rules](#after-rules)
4. [Async Rules](#async-rules)
5. [Recursion Prevention](#recursion-prevention)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Execution Timing

| Type | When It Runs | Can Modify `current`? | Key Constraint |
|------|--------------|----------------------|-----------------|
| **Before** | Before database save | Yes, direct assignment | Do NOT use `current.update()` |
| **After** | After database save | Yes, with `update()` call | Changes trigger cascading updates |
| **Async** | Background, post-save | Limited (read-only) | Perfect for notifications & heavy ops |
| **Display** | When form loads | No | Read-only, use `g_scratchpad` |

---

## Before Rules

Used for field validation and auto-population before database save.

### Basic Validation Pattern

```javascript
(function executeRule(current, previous) {
    // Prevent global variable pollution with IIFE

    // ✓ Validate required fields
    if (!current.short_description || current.short_description.length < 10) {
        gs.addErrorMessage('Short description must be at least 10 characters');
        current.setAbortAction(true); // Blocks the save
        return;
    }

    // ✓ Validate field relationships
    if (current.priority == '1' && !current.assignment_group) {
        gs.addErrorMessage('Critical incidents must have an assignment group');
        current.setAbortAction(true);
        return;
    }

    // ✓ Direct assignment (auto-saved in Before rule)
    if (current.priority == '1') {
        current.urgency = '1';
    }

})(current, previous);
```

### Field Auto-Population

```javascript
(function executeRule(current, previous) {
    // Only on insert
    if (!current.isNewRecord()) {
        return;
    }

    // Auto-populate category based on keywords
    var description = current.short_description.toLowerCase();

    if (description.indexOf('email') > -1) {
        current.category = 'email';
    } else if (description.indexOf('printer') > -1) {
        current.category = 'hardware';
    } else if (description.indexOf('password') > -1) {
        current.category = 'access';
    }

    // Set defaults
    if (!current.urgency) {
        current.urgency = '3';
    }

})(current, previous);
```

### Cross-Field Validation

```javascript
(function executeRule(current, previous) {
    var errors = [];

    // Check required fields
    if (!current.short_description) {
        errors.push('Short description is required');
    }

    if (!current.category) {
        errors.push('Category is required');
    }

    // Validate date logic
    if (current.start_date && current.end_date) {
        var startTime = new GlideDateTime(current.start_date).getNumericValue();
        var endTime = new GlideDateTime(current.end_date).getNumericValue();

        if (startTime >= endTime) {
            errors.push('End date must be after start date');
        }

        // Warn if duration exceeds threshold
        var daysApart = (endTime - startTime) / (1000 * 60 * 60 * 24);
        if (daysApart > 30) {
            gs.addWarningMessage('Duration exceeds 30 days');
        }
    }

    // Validate assignment
    if (current.priority == '1' && !current.assignment_group) {
        errors.push('Critical incidents must be assigned');
    }

    // Apply validation results
    if (errors.length > 0) {
        errors.forEach(function(error) {
            gs.addErrorMessage(error);
        });
        current.setAbortAction(true);
        return;
    }

})(current, previous);
```

---

## After Rules

Used for updating related records after the main record is saved.

### Related Record Updates

```javascript
(function executeRule(current, previous) {
    // After rule: current is saved to DB before this runs

    // Only on state change
    if (current.state === previous.state) {
        return;
    }

    // Update related change request
    if (current.change_request && current.state == 'closed') {
        var change = new GlideRecord('change_request');
        if (change.get(current.change_request)) {
            change.status = 'closed';
            change.update(); // Required in After rule
        }
    }

    // Update parent incident if this is a child
    if (current.parent_incident && current.state == 'resolved') {
        // Check if all children are resolved
        var unresolved = new GlideRecord('incident');
        unresolved.addQuery('parent_incident', current.parent_incident);
        unresolved.addQuery('state', '!=', 'resolved');
        unresolved.query();

        if (unresolved.getRowCount() === 0) {
            // All children resolved, close parent
            var parent = new GlideRecord('incident');
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

Used for notifications, integrations, and heavy processing after record is saved.

### Send Notifications

```javascript
(function executeAsyncRule(current, previous) {
    // Async rule: runs in background, after DB commit

    if (current.priority == '1') {
        try {
            // Get assignment group and send notification
            var group = new GlideRecord('sys_user_group');
            if (group.get(current.assignment_group)) {
                var managerEmail = group.manager.getDisplayValue();

                // Send email
                var email = new GlideEmailOutbound();
                email.setTo(managerEmail);
                email.setSubject('High Priority Incident: ' + current.number);
                email.setBody('A high priority incident has been created.\n' +
                    'Number: ' + current.number + '\n' +
                    'Description: ' + current.short_description);
                email.send();

                gs.info('Notification sent for: ' + current.number);
            }
        } catch (error) {
            gs.error('Error sending notification: ' + error.message);
        }
    }

})(current, previous);
```

### Create Audit Trail

```javascript
(function executeAsyncRule(current, previous) {
    try {
        // Log audit record
        var audit = new GlideRecord('incident_update');
        audit.initialize();
        audit.incident = current.sys_id;
        audit.update_type = 'Business Rule Execution';
        audit.comments = 'Record processed by business rule';
        audit.insert();

        // Log to system
        gs.info('Audit record created for: ' + current.number);
    } catch (error) {
        gs.error('Error creating audit record: ' + error.message);
    }

})(current, previous);
```

---

## Recursion Prevention

### Strategy 1: Check if Field Changed

```javascript
(function executeRule(current, previous) {
    // Only execute if the trigger field actually changed
    if (current.priority === previous.priority) {
        return;
    }

    // Now it's safe to modify related fields
    current.urgency = current.priority;

})(current, previous);
```

### Strategy 2: Use a Flag Field

```javascript
(function executeRule(current, previous) {
    // Check if rule already executed on this change
    if (current.u_rule_executed) {
        current.u_rule_executed = false; // Reset for next change
        return;
    }

    // Set flag to prevent recursion
    current.u_rule_executed = true;

    // Your business logic
    current.urgency = current.priority;

})(current, previous);
```

### Strategy 3: Track in GlideSystem Properties

```javascript
(function executeRule(current, previous) {
    var execKey = 'incident_rule_' + current.sys_id + '_priority';

    if (gs.getProperty(execKey) === 'true') {
        return;
    }

    // Set execution marker
    gs.setProperty(execKey, 'true');

    try {
        // Your business logic
        current.urgency = current.priority;
    } finally {
        // Always clean up
        gs.setProperty(execKey, 'false');
    }

})(current, previous);
```

---

## Error Handling

### Graceful Error Handling

```javascript
(function executeRule(current, previous) {
    try {
        // Main business logic
        if (current.priority == '1') {
            var group = new GlideRecord('sys_user_group');
            group.get(current.assignment_group);
            current.escalation_group = group.manager;
        }
    } catch (error) {
        // Log but don't block
        gs.error('Business rule error: ' + error.message);

        // Optionally notify admin
        gs.addErrorMessage('An error occurred in business rule processing');
        current.setAbortAction(true);
    }

})(current, previous);
```

---

## Best Practices

✓ **Use IIFE wrapper** - Always wrap code in `(function() { })()` to avoid global pollution
✓ **Check field changes** - Use `current.priority === previous.priority` to prevent unnecessary logic
✓ **Avoid update() in Before** - Just assign: `current.field = value;`
✓ **Always use update() in After** - Changes won't persist without calling `update()`
✓ **Handle errors gracefully** - Use try-catch, log issues, don't break user workflow
✓ **Set recursion guards** - Prevent infinite loops with change detection or flags
✓ **Keep rules focused** - If logic exceeds 20 lines, move to Script Include
✓ **Log important operations** - Use `gs.info()` for audit trails and debugging
✓ **Test on sub-production first** - Always validate recursion prevention before production

---

## Key APIs

| API | Purpose |
|-----|---------|
| `current` | GlideRecord being processed |
| `previous` | Snapshot of record before changes |
| `gs.addErrorMessage()` | Show error to user, can block save |
| `gs.addWarningMessage()` | Show warning to user, doesn't block |
| `current.setAbortAction(true)` | Cancel the database transaction |
| `current.isNewRecord()` | Check if this is an insert operation |
| `gs.info()` | Log informational message |
| `gs.error()` | Log error message |
| `current.update()` | Required to persist changes in After rule |
| `gs.getProperty()` / `gs.setProperty()` | Global flags for recursion prevention |

---

## When to Use Classic Business Rules

- ✓ Existing ServiceNow instances
- ✓ Instance-based customizations
- ✓ Field validation and auto-population
- ✓ Related record updates (After rules)
- ✓ Notifications (Async rules)
- ✓ Maximum compatibility with legacy code

For SDK-based projects, see [FLUENT.md](FLUENT.md) for TypeScript `.now.ts` business rule definitions.
