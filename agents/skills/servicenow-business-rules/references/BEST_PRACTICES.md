# Best Practices — Business Rules

## Execution Timing Deep Dive

### Before Rules
- **Best for**: Field transformations, data validation, setting defaults
- **Gotchas**: Cannot use `current.update()` - fields are auto-saved
- **Access**: Full `current` record, `previous` is null for new records

```javascript
(function executeRule(current, previous) {
    // ✓ CORRECT
    current.state = 3; // Auto-saved
    
    // ✗ WRONG - causes infinite loop
    // current.update();
})(current, previous);
```

### After Rules
- **Best for**: Triggering updates to related tables after main record saves
- **Key constraint**: Cannot modify `current` directly—it's already saved
- **Common use**: Updating parent records, syncing related data

```javascript
// ✓ Update a DIFFERENT record after current saves
var parent = new GlideRecord('parent_table');
if (parent.get(current.parent_id)) {
    parent.last_modified = new GlideDateTime();
    parent.update();
}
```

### Async Rules
- **Best for**: Integrations, heavy calculations, email notifications
- **Advantage**: Non-blocking—won't delay form submission
- **Limitation**: `previous` is null; no access to old values
- **Error handling**: Failures don't prevent main transaction

```javascript
// ✓ Send email asynchronously
var noti = new GlideNotification();
noti.send(current.assigned_to, 'Task assigned to you');
```

### Display Rules
- **Best for**: Computing derived fields, passing data to client
- **Read-only**: Cannot modify records
- **Use case**: Populate `g_scratchpad` for client-side access

```javascript
// Display BR - passes data to client without extra calls
g_scratchpad.vip_customer = (current.account_value > 100000);
```

## Anti-Patterns to Avoid

### 1. Global Variable Pollution
```javascript
// ✗ BAD - pollutes global namespace
myVar = 'test';

// ✓ CORRECT - use IIFE wrapper
(function executeRule(current, previous) {
    var myVar = 'test';
})(current, previous);
```

### 2. Infinite Recursion
```javascript
// ✗ BAD - triggers BR again (After rule)
(function executeRule(current, previous) {
    current.state = 'closed';
    current.update(); // THIS TRIGGERS THE RULE AGAIN
})(current, previous);

// ✓ CORRECT - use flag in field to prevent
if (current.state !== 'closed') {
    current.state = 'closed';
    current.update();
}
```

### 3. Hardcoded sys_ids
```javascript
// ✗ WRONG - breaks when moved to production
var group = new GlideRecord('sys_user_group');
group.get('e2d43cc513c221009861e12d6e79e7c9');

// ✓ CORRECT - use System Properties
var groupId = gs.getProperty('incident.default_group', '');
var group = new GlideRecord('sys_user_group');
group.get(groupId);
```

## Common Mistakes

### Missing Recursion Check
```javascript
// Problem: Rule fires on every update
(function executeRule(current, previous) {
    if (current.state === 'assigned') {
        current.assigned_by = gs.getUserID();
        current.update(); // ← FIRES RULE AGAIN
    }
})(current, previous);
```

### Not Testing Condition
```javascript
// Better to check in Condition field first
// Condition: state != resolved
// THEN create rule to avoid unnecessary execution
```

### Expensive Queries in Rules
```javascript
// ✗ SLOW - queries every record
(function executeRule(current, previous) {
    var gr = new GlideRecord('incident');
    gr.query(); // Queries ALL incidents
    while (gr.next()) {
        // Process...
    }
})(current, previous);

// ✓ BETTER - limit with addQuery
var gr = new GlideRecord('incident');
gr.addQuery('assigned_to', current.assigned_to);
gr.addQuery('state', 'open');
gr.setLimit(100);
gr.query();
```

## Performance Optimization

### Use `getValue()` Instead of Dot-Walk
```javascript
// ✗ SLOWER - triggers dot-walk
var assignedName = current.assigned_to.name;

// ✓ FASTER - gets pre-fetched value
var assignedName = current.getDisplayValue('assigned_to');
```

### Batch Updates
```javascript
// ✗ Multiple updates = multiple table writes
var gr = new GlideRecord('incident');
gr.query();
while (gr.next()) {
    gr.state = 'resolved';
    gr.update(); // Each update writes to DB
}

// ✓ Consider scheduled job or Script Include for bulk operations
```

## Debugging Tips

### Enable Debug Logging
```javascript
gs.debug('Before: ' + current.state, current);
gs.info('After: ' + current.getDisplayValue('assigned_to'));
gs.error('Error condition: ' + errorVar);

// Check logs in System Logs > All Logs
```

### Use Breakpoints (Scoped Only)
- Scoped apps support breakpoint debugging during business rule execution
- Global scope: Use gs.log() and check sys_log table

### Test Condition Formula First
```javascript
// Test condition in BR form before writing code
// Example condition:
// state == 'new' && priority <= 2
```

## Security Considerations

### ACL Checks
```javascript
// Respect field-level ACLs
if (gs.getUser().canRead('incident', 'description')) {
    var desc = current.getValue('description');
}
```

### Never hardcode API Keys
```javascript
// ✗ WRONG
var apiKey = 'sk-1234567890abcdef';

// ✓ CORRECT
var apiKey = gs.getProperty('integration.api_key', '');
```

### Validate External Input
```javascript
// If data comes from external source or user input
if (!current.description || current.description.trim() === '') {
    gs.addErrorMessage('Description required');
    current.setAbortAction(true);
}
```

## Testing Strategy

1. **Unit test**: Create test record and verify BR fires
2. **Recursion test**: Verify rule doesn't trigger infinitely
3. **Sub-production test**: Test with realistic data volume
4. **Performance test**: Monitor execution time on large datasets
5. **Condition test**: Verify condition formula excludes unnecessary executions
