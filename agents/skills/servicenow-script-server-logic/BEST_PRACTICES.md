# Best Practices — Server-Side Logic

## GlideSystem (gs) Best Practices

### User Context
```javascript
// Get current user information
var userId = gs.getUserID();     // sys_id
var userName = gs.getUser().getName();
var userEmail = gs.getUser().getEmail();
var userGr = new GlideRecord('sys_user');
userGr.get(gs.getUserID());
var userDept = userGr.getValue('department');

// Check user roles
var user = gs.getUser();
if (user.hasRole('admin')) {
    // Admin only logic
}

// Impersonation (admin only, Global scope)
var impersonate = new GlideImpersonate();
// impersonate() takes a sys_id, not a username
var previousUser = impersonate.impersonate('6816f79cc0a8016401c5a33be04be441');
// Now running as the impersonated user
// previousUser contains the sys_id of the original user
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
// Signature: gs.eventQueue(name, instance, parm1, parm2, queue)
// parm1/parm2 are optional Strings saved with the event
gs.eventQueue('incident.priority_changed', current, current.getValue('priority'), current.getValue('state'));

// Other code can listen for this event:
// Business Rules, Workflow triggers, etc.

// Custom events
gs.eventQueue('custom.approval_required', current, 'admin_group', 'high_value_transaction');
```

### Event Processing
```javascript
// Listen to events in a Script Action
// In Script Actions, event parameters are available via the 'event' object:
var parm1 = event.parm1;
var parm2 = event.parm2;
gs.info('Event fired with parm1: ' + parm1);
```

## Session Management

### Session Context
```javascript
// Get current session information
var sessionId = gs.getSessionID();
var domainId = gs.getSession().getCurrentDomainID();
var timeZoneName = gs.getSession().getTimeZoneName();

// Get locale
var locale = GlideLocale.get();
var groupingSep = locale.getGroupingSeparator();  // e.g. ','
var decimalSep = locale.getDecimalSeparator();    // e.g. '.'
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
var randomString = GlideSecureRandomUtil.getSecureRandomString(16);

// Generate random integers
var randomInt = GlideSecureRandomUtil.getSecureRandomIntBound(100); // 0 to 99

// Use for:
// - Temporary tokens
// - Session IDs
// - OTP codes
// - Unique identifiers
```

## Notifications

### Send Notifications
```javascript
// Use gs.eventQueue() to trigger email notifications
// Register a notification in ServiceNow tied to the event name
gs.eventQueue('incident.escalated', current, current.getValue('assigned_to'), 'Incident has been escalated');

// For direct email (e.g., in a mail script or async business rule context):
var escalationEmail = new GlideEmailOutbound();
escalationEmail.addAddress('to', recipientEmail);
escalationEmail.setSubject('Incident Escalated');
escalationEmail.setBody('Your incident has been escalated.');
```

## Error Handling in Business Rules

### Abort and Revert Pattern
```javascript
// ServiceNow manages database transactions automatically.
// To prevent a save on error, use setAbortAction in Before rules:
try {
    current.state = 'resolved';
    // In Before rules, direct assignment is auto-saved — no update() call needed

    // Cascade updates to child records
    var childIncidentGr = new GlideRecord('incident');
    childIncidentGr.addQuery('parent', current.sys_id);
    childIncidentGr.query();
    while (childIncidentGr.next()) {
        childIncidentGr.state = 'resolved';
        childIncidentGr.update();
    }
} catch (e) {
    // Block the save on error
    current.setAbortAction(true);
    gs.addErrorMessage('Error processing record: ' + e.getMessage());
    gs.error('Transaction error: ' + e.getMessage());
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
// ✗ BLOCKS AND DEPRECATED — getXMLWait() is a GlideAjax method, never use it
// var ga = new GlideAjax('MyScriptInclude');
// ga.getXMLWait(); // Synchronous, blocks the browser!

// ✓ USE ASYNC GlideAjax
var ga = new GlideAjax('MyScriptInclude');
ga.addParam('sysparm_name', 'myMethod');
ga.getXMLAnswer(function(answer) {
    // Process response asynchronously
});

// Better: use server-side REST instead
var rest = new sn_ws.RESTMessageV2('API', 'GET');
var response = rest.execute();
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
    var incidentGr = new GlideRecord('incident');
    incidentGr.addQuery('sys_id', incidentId);
    incidentGr.query();
    
    if (incidentGr.next()) {
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
