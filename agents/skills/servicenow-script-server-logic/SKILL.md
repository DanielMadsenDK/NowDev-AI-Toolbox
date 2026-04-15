---
name: servicenow-script-server-logic
user-invocable: false
description: General server-side operations including Script Includes, JavaScript modules, system interactions, user session management, and utility functions. Covers two approaches: (1) Classic Script Includes using Class.create() for existing instances, and (2) Fluent SDK Script Includes and modules for SDK projects. Use for reusable utilities, system-level tasks, user context operations, and event publishing via gs.eventQueue(). JavaScript modules are the preferred approach for new server-side logic in Fluent projects — Script Includes remain necessary for GlideAjax, cross-scope APIs, and extension points. Use the module bridging pattern when logic lives in a module but must be accessible via Script Include. For event-triggered automation, see servicenow-fluent-development: SCRIPT-ACTION-API.md.
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

> **Related:** Events published via `gs.eventQueue()` trigger **Script Actions** defined in Fluent applications. See servicenow-fluent-development: [SCRIPT-ACTION-API.md](../servicenow-fluent-development/SCRIPT-ACTION-API.md) for creating event-triggered automation.

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

## JavaScript Modules vs Script Includes

In Fluent projects, JavaScript modules are the **preferred** approach for new server-side logic. However, Script Includes are still required for:

- **GlideAjax** — client-side code calls script includes by name
- **Cross-scope APIs** — other scoped apps access script includes by name
- **Extension points** — platform features that expect script include names
- **Dynamic reference qualifiers / condition scripts** — platform expects script includes

### Module vs Script Include Rules

| File Type | Import Glide APIs? | Why |
|-----------|-------------------|-----|
| **Module files** (normal functions) | **YES** — `import { gs } from '@servicenow/glide'` | Glide APIs NOT auto-available |
| **Script Include class files** (`Class.create`) | **NO** — do NOT import Glide APIs | Glide APIs ARE auto-available |

When your logic lives in a module but needs to be accessible via one of the mechanisms above, use the **module bridging pattern**: create a thin Script Include wrapper that uses `require()` to load the module. See servicenow-fluent-development: [MODULE-GUIDE.md](../servicenow-fluent-development/MODULE-GUIDE.md) for the full pattern.

## Detailed Patterns

Choose the pattern that matches your implementation context:

- **[CLASSIC.md](./CLASSIC.md)** — Instance-based Script Includes (JavaScript, Class.create())
  - Class-based and function-based utilities
  - Database operations and queries
  - System operations and logging
  - Audit trails and error handling

- **[FLUENT.md](./FLUENT.md)** — SDK-based Script Includes (TypeScript, ES6 classes)
  - Metadata-driven script definitions
  - Modern ES6+ syntax
  - Type-safe utilities
  - Version-controlled scripts

- **[EXAMPLES.md](./EXAMPLES.md)** — Quick reference showing both approaches

## Decision Matrix: Which Approach to Use

| Situation | Classic | Fluent | Rationale |
|-----------|---------|--------|-----------|
| Existing instance utilities | ✓ | - | No SDK setup needed |
| New SDK project | - | ✓ | Use modern TypeScript |
| Need Class.create() | ✓ | - | Legacy pattern |
| Type safety needed | - | ✓ | TypeScript compiler |
| Version control | - | ✓ | Git tracking |
| Quick utility function | ✓ | - | Simple syntax |
| Team knows TypeScript | - | ✓ | Leverage expertise |

## Reference

For advanced patterns, debugging techniques, and best practices, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
