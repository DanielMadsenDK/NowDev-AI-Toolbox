# Script Action API

Create server-side script actions that execute when specific events occur in your ServiceNow application.

## Overview

The Script Action API defines script actions (`[sysevent_script_action]`) that run when an event is triggered. Script actions are server-side operations that execute in response to custom or platform events, enabling automation of business processes without requiring user interaction.

## Related Concepts

- **Event System**: See "Create an event" documentation for event creation
- **ServiceNow Fluent**: `.now.ts` metadata files using the ServiceNow SDK
- **ScriptAction Object**: The Fluent metadata object for defining script actions

## ScriptAction Properties Reference

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `$id` | String or Number | Unique ID for the metadata object (hashed to `sys_id` during build). Use `Now.ID['id']` format. **See [API-REFERENCE.md](API-REFERENCE.md) for ServiceNow Fluent language constructs.** | `Now.ID['sample-script-action']` |
| `name` | String | Unique human-readable name for the script action | `'SampleScriptAction'` |
| `script` | Script | Server-side script that executes when triggered. Supports function from JavaScript module, file reference via `Now.include()`, or inline JavaScript string/template literal | See [Script Content Options](#script-content-options) |
| `eventName` | String | Name of the event that triggers the script action | `'sample.event'` |

### Optional Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `active` | Boolean | `false` | Flag indicating if the script action is enabled | `true` |
| `description` | String | Empty | Description of the functionality and purpose | `'Insert an incident when event fires'` |
| `order` | Number | `100` | Execution sequence number. Multiple script actions on the same event run in order from lowest to highest | `100` |
| `conditionScript` | String | N/A | JavaScript conditional statement that must evaluate to `true` for the script to run. Supports `Now.include()` or inline script | `"gs.hasRole('my_role')"` |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property for controlling when metadata is installed | `{ installMethod: 'first install' }` |

### Property Details

**`script` Property Format:**

Script actions support three content delivery methods:

1. **JavaScript function import** (for server-side logic modules):
   ```typescript
   import { insertIncident } from '../server/scripts.js'
   script: insertIncident
   ```

2. **File reference with `Now.include()`** (enables two-way sync):
   ```typescript
   script: Now.include('./incident-handler.js')
   ```
   See [API-REFERENCE.md](API-REFERENCE.md#nowinclude) for details.

3. **Inline JavaScript** (for simple scripts):
   ```typescript
   script: 'var gr = new GlideRecord("incident"); gr.initialize(); gr.insert();'
   ```
   Or with template literals for multi-line code:
   ```typescript
   script: `
     var gr = new GlideRecord("incident");
     gr.initialize();
     gr.setValue("short_description", "Auto-created incident");
     gr.insert();
   `
   ```

**`conditionScript` Property Format:**

Conditional scripts must evaluate to `true` for the action to execute:

```typescript
// Inline condition
conditionScript: "gs.hasRole('incident_manager') && current.priority === '1'"

// File reference with two-way sync
conditionScript: Now.include('./condition-check.js')

// Note: Don't use this property if the condition is included in the main script property
```

**`$meta.installMethod` Valid Values:**

- `'first install'` — Metadata is installed only on initial application installation
- `'demo'` — Metadata is installed only when "Load demo data" option is selected during installation

---

## Complete Example

### Metadata Definition (.now.ts)

```typescript
import { ScriptAction } from '@servicenow/sdk/core'
import { insertIncident } from '../server/scripts.js'

export const sampleAction = ScriptAction({
    $id: Now.ID['sample-script-action'],
    name: 'SampleScriptAction',
    active: true,
    description: 'Insert an incident when the sample event is triggered',
    script: insertIncident,
    eventName: 'sample.event',
    order: 100,
    conditionScript: "gs.hasRole('incident_manager')"
})
```

### Handler Implementation (.server.js or .js)

```javascript
import { GlideRecord } from '@servicenow/glide'

export const insertIncident = () => {
    var gr = new GlideRecord('incident')
    gr.initialize()
    gr.setValue('short_description', 'New incident from event')
    gr.setValue('description', 'Auto-created via script action trigger')
    gr.setValue('urgency', '2')
    gr.setValue('impact', '2')

    var insertID = gr.insert()
    if (insertID) {
        gs.info('Incident created: ' + insertID)
    } else {
        gs.error('Failed to create incident')
    }
}
```

---

## Usage Patterns

### Pattern 1: Event-Driven Data Creation

Create records automatically when business events occur:

```typescript
import { ScriptAction } from '@servicenow/sdk/core'

export const createAuditLogAction = ScriptAction({
    $id: Now.ID['audit-log-create'],
    name: 'Create Audit Log Entry',
    active: true,
    eventName: 'incident.created',
    script: Now.include('./audit-handler.js'),
    order: 50
})
```

**Handler:**
```javascript
export const handleAuditLog = () => {
    var incident = gs.getSession().getCurrentRecord('incident')

    var audit = new GlideRecord('x_app_audit_log')
    audit.initialize()
    audit.setValue('table_name', 'incident')
    audit.setValue('record_id', incident.getUniqueValue())
    audit.setValue('action', 'INSERT')
    audit.setValue('user', gs.getUserID())
    audit.setValue('timestamp', new GlideDateTime().toString())
    audit.insert()
}
```

### Pattern 2: Conditional Escalation

Execute only when specific conditions are met:

```typescript
import { ScriptAction } from '@servicenow/sdk/core'

export const escalateHighPriority = ScriptAction({
    $id: Now.ID['escalate-priority-one'],
    name: 'Escalate Priority 1 Incidents',
    active: true,
    eventName: 'incident.priority.changed',
    script: Now.include('./escalation-handler.js'),
    conditionScript: "current.priority === '1' && current.state !== 'closed'",
    order: 10
})
```

### Pattern 3: Multi-Step Event Processing

Execute handlers in sequence with explicit ordering:

```typescript
// First handler — validation
export const validateIncident = ScriptAction({
    $id: Now.ID['validate-incident'],
    name: 'Validate Incident Data',
    eventName: 'incident.created',
    script: Now.include('./validators/incident-validation.js'),
    order: 10
})

// Second handler — assignment
export const assignIncident = ScriptAction({
    $id: Now.ID['assign-incident'],
    name: 'Auto-Assign Incident',
    eventName: 'incident.created',
    script: Now.include('./handlers/auto-assignment.js'),
    order: 20
})

// Third handler — notification
export const notifyAssigned = ScriptAction({
    $id: Now.ID['notify-assigned'],
    name: 'Notify Assignment Group',
    eventName: 'incident.created',
    script: Now.include('./handlers/notify-group.js'),
    order: 30
})
```

---

## Best Practices

### ✓ Do's

- ✓ **Use `Now.include()`** for external script files to enable two-way synchronization and IDE support
- ✓ **Set explicit `order`** values for multi-action events to ensure predictable execution
- ✓ **Use conditions** (`conditionScript`) to avoid unnecessary processing on every event
- ✓ **Log important operations** with `gs.info()` or `gs.error()` for debugging
- ✓ **Validate data** before inserting/updating records
- ✓ **Catch errors** when making GlideRecord operations to prevent silent failures
- ✓ **Use `active: false`** during development to prevent unintended side effects
- ✓ **Document event contract** (what data is available in the event payload)

### ✗ Don'ts

- ✗ **Don't use heavy processing** in script actions — they block the event system
- ✗ **Don't forget error handling** — uncaught exceptions can break event processing chains
- ✗ **Don't create recursive events** — avoid triggering events that activate your own script action
- ✗ **Don't assume record context** — query the record using `GlideRecord` instead of relying on implicit context
- ✗ **Don't hardcode sys_ids** — use field references or queries for flexibility
- ✗ **Don't ignore performance** — index frequently queried fields; avoid table scans in script actions

---

## Error Handling Example

```typescript
import { ScriptAction } from '@servicenow/sdk/core'
import { safeInsertIncident } from '../server/handlers.js'

export const incidentCreation = ScriptAction({
    $id: Now.ID['safe-incident-creation'],
    name: 'Safely Create Incident',
    active: true,
    eventName: 'incident.auto.create',
    script: safeInsertIncident
})
```

**Implementation with error handling:**
```javascript
import { GlideRecord } from '@servicenow/glide'

export const safeInsertIncident = () => {
    try {
        var gr = new GlideRecord('incident')
        gr.initialize()
        gr.setValue('short_description', 'Auto-created incident')

        var insertID = gr.insert()

        if (!insertID) {
            gs.error('ScriptAction [incident_creation]: Insert failed, no ID returned')
            return false
        }

        gs.info('ScriptAction [incident_creation]: Incident ' + insertID + ' created successfully')
        return true
    } catch (error) {
        gs.error('ScriptAction [incident_creation]: Error - ' + error.message)
        return false
    }
}
```

---

## Installation Control

Use `$meta.installMethod` to control when script actions are installed:

```typescript
// Install only on first application install
export const initialSetupAction = ScriptAction({
    $id: Now.ID['initial-setup'],
    name: 'Initial Setup Action',
    eventName: 'app.setup',
    script: Now.include('./setup.js'),
    $meta: {
        installMethod: 'first install'
    }
})

// Install only with demo data
export const demoDataAction = ScriptAction({
    $id: Now.ID['demo-scenario'],
    name: 'Demo Data Scenario',
    eventName: 'demo.trigger',
    script: Now.include('./demo-handler.js'),
    $meta: {
        installMethod: 'demo'
    }
})
```

---

## Related References

- **[API-REFERENCE.md](API-REFERENCE.md)** — ScriptAction quick reference, Fluent language constructs (`Now.ID`, `Now.include`)
- **[ADVANCED-PATTERNS.md](ADVANCED-PATTERNS.md)** — GlideRecord patterns, server-side logging, error handling strategies
- **[EXAMPLES.md](EXAMPLES.md)** — Complete working examples of script actions in context

---

## Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Script action not firing | Event not published | Verify event name matches `eventName` property; check event creation |
| Wrong execution order | Missing or duplicate `order` values | Set explicit `order` property on all related script actions |
| Condition not evaluating | Syntax error or missing context | Test `conditionScript` in browser console; use `gs.info()` to log evaluated values |
| Performance degradation | Heavy processing in action | Move complex logic to Script Includes; use async patterns if possible |
| Silent failures | Uncaught exceptions | Add try-catch blocks and log to `gs.error()` |
