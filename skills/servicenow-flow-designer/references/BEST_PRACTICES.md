# Best Practices — Flow Designer

## FlowAPI Execution Modes

### Foreground Execution
```javascript
// Use when you need results immediately
var result = sn_fd.FlowAPI.getRunner()
    .flow('global.my_flow')
    .inForeground()
    .withInputs({user_id: '123'})
    .run();

// When to use:
// - Need return values from flow
// - User waiting for result
// - Want synchronous behavior
// - Result data is essential
```

### Background Execution
```javascript
// Use for long-running flows
var result = sn_fd.FlowAPI.getRunner()
    .flow('global.long_process')
    .inBackground()
    .withInputs({batch_id: '456'})
    .run();

// When to use:
// - Heavy processing (>5 seconds)
// - User doesn't need immediate result
// - Job can run independently
// - Avoid async BR timeout issues
```

## Input/Output Handling

### Passing Complex Data
```javascript
var inputs = {};
inputs['sys_id'] = current.sys_id;
inputs['data'] = {
    name: current.name,
    priority: current.priority,
    nested: {
        field: current.field_value
    }
};

var result = sn_fd.FlowAPI.getRunner()
    .flow('my_app.process')
    .withInputs(inputs)
    .run();
```

### Retrieving Outputs
```javascript
var result = sn_fd.FlowAPI.getRunner()
    .flow('global.validate')
    .inForeground()
    .withInputs({data: myData})
    .run();

if (result.wasSuccessful()) {
    var outputs = result.getOutputs();
    var status = outputs['validation_status'];
    var message = outputs['message'];
} else {
    gs.error('Flow failed: ' + result.getErrorMessage());
}
```

## Domain-Separated Instances

### Multi-Domain Execution
```javascript
// Domain execution runs as System User in specified domain
var result = sn_fd.FlowAPI.getRunner()
    .action('global.markapproved')
    .inForeground()
    .inDomain('TOP/ACME')  // Scoped domain
    .withInputs({sys_id: current.sys_id})
    .run();

var domainId = result.getDomainId();
```

### Important Notes
- Flow runs as System User, not current user
- Flow can only access data in specified domain
- Useful for cross-domain orchestration
- Respect data isolation boundaries

## Subflows vs Actions

### Use Subflows For
- Reusable multi-step processes
- Complex business logic
- Shared workflows across flows
- Version-controlled procedures

### Use Actions For
- Atomic operations (send email, create record)
- Single-purpose tasks
- Quick integration points
- Library of utilities

## Error Handling

```javascript
function executeFlow() {
    try {
        var result = sn_fd.FlowAPI.getRunner()
            .flow('global.process_order')
            .inForeground()
            .withInputs({order_id: g_form.getValue('order_id')})
            .run();
        
        if (!result.wasSuccessful()) {
            var errorCode = result.getErrorCode();
            var errorMsg = result.getErrorMessage();
            gs.error('Flow error: ' + errorCode + ' - ' + errorMsg);
            return false;
        }
        
        var outputs = result.getOutputs();
        return outputs['success'];
        
    } catch (e) {
        gs.error('Exception in flow execution: ' + e.getMessage());
        return false;
    }
}
```

## Performance Optimization

### Avoid Async BR Calls
```javascript
// ✗ WRONG - async BR calling flow causes issues
(function executeRule(current, previous) {
    sn_fd.FlowAPI.getRunner()  // DON'T DO THIS IN ASYNC BR
        .flow('background_process').run();
})(current, previous);

// ✓ CORRECT - use scheduled job instead
// Create a scheduled job that runs the flow
```

### Flow Execution Context
```javascript
// Get context ID for tracking
var result = sn_fd.FlowAPI.getRunner()
    .flow('my_app.audit_process')
    .inForeground()
    .run();

var contextId = result.getContextId();
gs.info('Flow execution context: ' + contextId);

// Can query Execution History using contextId for debugging
```

## Testing Flows

### Pre-execution Checks
```javascript
// Check if flow is active before running
var flow = new GlideRecord('sys_flow');
if (flow.get('sys_name', 'global.my_flow')) {
    if (flow.active) {
        // Safe to run
    } else {
        gs.warn('Flow not active: global.my_flow');
    }
}
```

### Mock Testing
```javascript
// Test with sample data without flow
var testInputs = {
    sys_id: '123',
    data: {field: 'value'}
};

// Validate inputs before running
if (!testInputs.sys_id || testInputs.sys_id === '') {
    gs.error('Missing required input: sys_id');
    return;
}
```

## Builder Pattern Best Practices

### Method Chaining
```javascript
// ✓ Readable and chainable
var result = sn_fd.FlowAPI.getRunner()
    .action('global.notify_user')      // What to run
    .inForeground()                     // Execution mode
    .inDomain('DEFAULT')                // Domain (optional)
    .withInputs(buildInputs())          // Parameters
    .run();                             // Execute

// Helper function to build inputs
function buildInputs() {
    return {
        user: gs.getUser().getID(),
        message: 'Workflow approved',
        priority: 'high'
    };
}
```

## Flow Execution Lifecycle

1. **FlowAPI.getRunner()** - Initialize builder
2. **flow()/action()/subflow()** - Define what runs
3. **inForeground()/inBackground()** - Execution mode
4. **inDomain()** - Domain (optional)
5. **withInputs()** - Pass parameters
6. **run()** - Execute and return result
7. **result.getOutputs()** - Retrieve results

## Common Mistakes

### Missing Success Check
```javascript
// ✗ WRONG - assumes flow succeeded
var result = sn_fd.FlowAPI.getRunner().flow('process').run();
var data = result.getOutputs()['value']; // Could be null

// ✓ CORRECT - always check
if (result.wasSuccessful()) {
    var data = result.getOutputs()['value'];
}
```

### Hardcoded Flow Names
```javascript
// ✗ WRONG - breaks when moved
sn_fd.FlowAPI.getRunner()
    .flow('global.workflow123')
    .run();

// ✓ CORRECT - use properties
var flowName = gs.getProperty('workflow.process_name');
sn_fd.FlowAPI.getRunner()
    .flow(flowName)
    .run();
```

### Not Handling Timeouts
```javascript
// ✓ BETTER - foreground has timeout
var result = sn_fd.FlowAPI.getRunner()
    .flow('long_running')
    .inForeground()  // Has timeout
    .run();

// For very long processes, use background
sn_fd.FlowAPI.getRunner()
    .flow('very_long_process')
    .inBackground()  // No timeout
    .run();
```
