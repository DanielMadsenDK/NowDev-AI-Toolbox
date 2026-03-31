# Best Practices — Server-Side Logic

## GlideSystem (gs) Best Practices

### User Context
```javascript
// Get current user information
var userId = gs.getUserID();     // sys_id
var userName = gs.getUser().getName();
var userEmail = gs.getUser().getEmail();
var userDept = gs.getUser().getDepartmentID();

// Check user roles
var user = gs.getUser();
if (user.hasRole('admin')) {
    // Admin only logic
}

// Impersonation (admin only)
var impersonate = new GlideImpersonate();
impersonate.loginAs('admin');
// Now running as admin
impersonate.back();
// Back to original user
```

### Logging Levels
```javascript
// INFO - general information
gs.info('Processing incident: ' + current.number);

// DEBUG - detailed diagnostic info
gs.debug('Field values', current); // Includes object details

// WARN - warning conditions
gs.warn('Record has missing data');

// ERROR - error conditions
gs.error('Failed to update: ' + error);

// Query logs in: System Logs > All Logs or Activity
```

### System Properties
```javascript
// Read properties
var timeout = gs.getProperty('system.timeout', '30000');
var isProduction = gs.getProperty('glide.install.type') === 'prod';

// Never hardcode values—use properties for configuration
var apiKey = gs.getProperty('integration.api_key', '');

// Get/set properties at runtime
gs.setProperty('custom.my_setting', 'value');
var value = gs.getProperty('custom.my_setting');
```

## Event Queue Management

### Event Publishing
```javascript
// Publish business event
gs.eventQueue('incident.priority_changed', current, oldCurrent, {
    priority: 'high'
});

// Other code can listen for this event:
// Business Rules, Workflow triggers, etc.

// Custom events
gs.eventQueue('custom.approval_required', current, null, {
    approver: 'admin_group',
    reason: 'high_value_transaction'
});
```

### Event Processing
```javascript
// Listen to events (in Business Rule)
if (gs.getEventName() === 'incident.state_changed') {
    var parm = gs.getEventParm1();
    gs.info('Event fired: ' + parm);
}
```

## Session Management

### Session Context
```javascript
// Get current session information
var sessionId = gs.getSessionID();
var domainId = gs.getDomainID();
var timeZoneId = gs.getTimeZoneID();

// Get locale
var locale = GlideLocale.get();
var datePattern = locale.getDatePattern();
var timePattern = locale.getTimePattern();
```

## String Utilities

### Safe String Operations
```javascript
var text = 'Hello World';

// String manipulation
var upper = text.toUpperCase();
var lower = text.toLowerCase();
var trimmed = text.trim();

// Check for content
if (!text || text.length === 0) {
    gs.error('Empty string');
}

// Use GlideStringUtil for complex operations
var util = new GlideStringUtil();
var encoded = util.urlEncode(text);
```

## Random Generation

### Secure Random Values
```javascript
// Generate random strings
var randomString = GlideSecureRandomUtil.getRandomString(16);

// Generate random integers
var randomInt = GlideSecureRandomUtil.getRandomInt(1, 100);

// Use for:
// - Temporary tokens
// - Session IDs
// - OTP codes
// - Unique identifiers
```

## Notifications

### Send Notifications
```javascript
var notification = new GlideNotification();
notification.send(targetUserId, 'Message text');

// More advanced - create custom notification
var noti = new GlideNotification();
noti.setTitle('Incident Escalated');
noti.setMessage('Your incident has been escalated');
noti.send(userId);
```

## Database Transactions

### Transaction Control
```javascript
// Explicit transaction management
gs.getSession().setSavePoint('before_update');

try {
    current.state = 'resolved';
    current.update();
    
    // Cascade updates
    var gr = new GlideRecord('incident');
    gr.addQuery('parent', current.sys_id);
    gr.query();
    while (gr.next()) {
        gr.state = 'resolved';
        gr.update();
    }
} catch (e) {
    // Rollback on error
    gs.getSession().setSavePoint('before_update');
    gs.error('Transaction rolled back: ' + e.getMessage());
}
```

## Variable Declarations

### Scoping Best Practices
```javascript
// ✓ CORRECT - var scopes to function
function processIncidents() {
    var incidents = new GlideRecord('incident');
    incidents.query();
}

// ✗ WRONG - globals pollute namespace
function processIncidents() {
    incidents = new GlideRecord('incident'); // Global!
    incidents.query();
}

// Use descriptive names
var grIncident = new GlideRecord('incident');
var aggTotals = new GlideAggregate('stats');
var utDatetime = new GlideDateTime();
```

## Forbidden Operations

### Never Use eval()
```javascript
// ✗ ABSOLUTELY FORBIDDEN - security risk
var code = "current.state = 'resolved'";
eval(code); // NEVER!

// ✓ CORRECT - direct assignment
current.state = 'resolved';

// For dynamic field access:
var fieldName = 'state';
current[fieldName] = 'resolved';

// Or use GlideScopedEvaluator for safe evaluation
var evaluator = new GlideScopedEvaluator();
var result = evaluator.evaluateScript(record, 'script_field', {});
```

### Avoid Synchronous AJAX
```javascript
// ✗ BLOCKS AND DEPRECATED
var answer = gs.getXMLWait();

// ✓ USE ASYNC
gs.getXMLAnswer(function(response) {
    // Process response
});

// Better: use server-side REST instead
var rest = new sn_ws.RESTMessageV2('API', 'GET');
var response = rest.execute();
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
    var gr = new GlideRecord('incident');
    gr.addQuery('sys_id', incidentId);
    gr.query();
    
    if (gr.next()) {
        // Process
    } else {
        gs.warn('Incident not found: ' + incidentId);
    }
} catch (e) {
    gs.error('Exception processing incident: ' + e.getMessage());
    // Handle gracefully
}
```

## Debugging Techniques

### Debug Output
```javascript
// gs.debug includes object details
gs.debug('Current record', current);

// Formatted debug output
var debugInfo = {
    userId: gs.getUserID(),
    timestamp: new GlideDateTime(),
    action: 'update'
};
gs.debug('Debug info', debugInfo);

// Check System Logs > All Logs for output
```

## Naming Conventions

```text
Variable Naming:
- gr* for GlideRecord: grIncident, grUser
- agg* for GlideAggregate: aggTotals
- ut* for Utility classes: utDateTime, utEncrypt
- map* for maps: mapUsers, mapConfig
- arr* for arrays: arrIncidents, arrIds

Function Naming:
- camelCase: processIncidents(), getUserDept()
- Descriptive: what it does, not how it does it

Constants:
- UPPER_CASE: MAX_RETRIES, DEBUG_MODE
```
