---
name: servicenow-script-server-logic
user-invokable: false
description: General server-side operations including system interactions, user session management, event queuing, and utility functions. Covers GlideSystem (gs) methods, logging, system properties, and background job coordination. Use for system-level tasks, user context operations, event publishing, or when performing administrative functions not specific to data manipulation, flows, or security.
---

# General Server Logic

## Quick start

**System operations**:

```javascript
// Get current user
var userId = gs.getUserID();
var userName = gs.getUser().getName();
var userEmail = gs.getUser().getEmail();

// Logging
gs.info('Information message');
gs.warn('Warning message');
gs.error('Error message');
gs.debug('Debug message', myObject);

// System properties
var timeout = gs.getProperty('system.timeout', '30000');
var isProduction = gs.getProperty('glide.install.type') === 'prod';
```

**Event queue management**:

```javascript
// Queue a business event
gs.eventQueue('my.custom.event', current, oldCurrent, {
    priority: 1
});

// Publish event for other listeners
gs.eventQueue('incident.priority.updated', current, oldCurrent);
```

**Session management**:

```javascript
// Current session context
var domainId = gs.getDomainID();
var sessionID = gs.getSessionID();
var timezoneID = gs.getTimeZoneID();
```

**Impersonation** (admin only):

```javascript
var impersonate = new GlideImpersonate();
impersonate.loginAs('admin');
// Now running as admin
impersonate.back();
// Back to original user
```

## Common patterns

**Scoped evaluation**:

```javascript
var evaluator = new GlideScopedEvaluator();
var result = evaluator.evaluateScript(grRecord, 'script_field', {});
```

**Locale and formatting**:

```javascript
var locale = GlideLocale.get();
var datePattern = locale.getDatePattern();
var timePattern = locale.getTimePattern();
```

**Secure random generation**:

```javascript
var random = GlideSecureRandomUtil.getRandomString(16);
var randomInt = GlideSecureRandomUtil.getRandomInt(1, 100);
```

**User preferences** (per-user key-value store, no custom table needed):

```javascript
// Save a preference for the current user
var user = gs.getUser();
user.savePreference('my_app.my_key', JSON.stringify({ lastTable: 'incident' }));

// Read it back
var raw = user.getPreference('my_app.my_key');
var pref = raw ? JSON.parse(raw) : null;

// Remove a preference
user.savePreference('my_app.my_key', null);
```

> **Naming:** Prefix the key with your app scope (`x_scope.key_name`) to avoid collisions.
> Values are stored as strings — serialize objects with `JSON.stringify` / `JSON.parse`.
> Preferences are stored in `sys_user_preference` and are scoped to the current user.

## Best practices

- Use descriptive variable names (`grIncident` for GlideRecord)
- Use PascalCase for classes, camelCase for functions
- Never use `eval()` or dynamic code execution
- Never hardcode `sys_id`s; use System Properties
- Avoid global synchronous calls like `getXMLWait()`
- Log important actions for audit trails
- Use domain context for multi-tenant operations
- Queue async work instead of waiting for results
- Follow IIFE pattern for Script Includes
- Test thoroughly on sub-production first

## Key APIs

| API | Purpose |
|-----|---------|
| GlideSystem (gs) | Core system operations |
| GlideUser (gs.getUser()) | Current user context + preference storage |
| GlideLocale | Locale and formatting |
| GlideScopedEvaluator | Safe script evaluation |
| GlideImpersonate | Admin user context switching |

## Reference

For advanced patterns, debugging techniques, and best practices, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
