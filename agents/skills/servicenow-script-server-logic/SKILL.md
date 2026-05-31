---
name: servicenow-script-server-logic
context: fork
user-invocable: false
description: >-
  General server-side operations including Script Includes, JavaScript modules, system interactions, user session management, and utility functions. Covers two approaches: (1) Classic Script Includes using Class.create() for existing instances, and (2) Fluent SDK Script Includes and modules for SDK projects. Use for reusable server-side utilities, gs.* system operations, user context, and event publishing via gs.eventQueue(). Trigger this skill whenever the user needs to write a Script Include, create reusable server-side logic, use gs.* APIs, manage user sessions or preferences, queue events, or implement impersonation. JavaScript modules are preferred for new Fluent projects; Script Includes remain required for GlideAjax and cross-scope APIs.
last_verified: "2026-05-18"
---

# General Server Logic

## Scoped App Restrictions

> **Critical:** Several `gs.*` methods are **not available in scoped applications**. The most common pitfall:
>
> | Blocked in scoped apps | Use instead |
> |------------------------|-------------|
> | `gs.nowDateTime()` | `new GlideDateTime().getDisplayValue()` |
> | `gs.log()` (two-arg form) | `gs.info()` |
> | `GlideRecord` without scope prefix on table name | Always use fully-qualified table names |
>
> When writing code for a scoped app, default to the replacements above.

## Quick start

**System operations**:

```javascript
// Get current user
var userId = gs.getUserID();
var userName = gs.getUser().getName();
var userEmail = gs.getUser().getEmail();

// Logging (works in both global and scoped apps)
gs.info('Information message');
gs.warn('Warning message');
gs.error('Error message');
gs.debug('Debug message', myObject);

// Current timestamp — use GlideDateTime in scoped apps (gs.nowDateTime() is blocked)
var now = new GlideDateTime().getDisplayValue();

// System properties
var timeout = gs.getProperty('system.timeout', '30000');
var isProduction = gs.getProperty('glide.install.type') === 'prod';
```

**Event queue management**:

```javascript
// Queue a business event
// Signature: gs.eventQueue(name, instance, parm1, parm2, queue)
// parm1/parm2 are optional Strings saved with the event
gs.eventQueue('my.custom.event', current, current.getValue('sys_id'), 'additional_info');

// Publish event for other listeners
gs.eventQueue('incident.priority.updated', current, current.getValue('priority'), current.getValue('state'));
```

> **Related:** Events published via `gs.eventQueue()` trigger **Script Actions** defined in Fluent applications. See servicenow-fluent-development: [SCRIPT-ACTION-API.md](../servicenow-fluent-development/SCRIPT-ACTION-API.md) for creating event-triggered automation.

**Session management**:

```javascript
// Current session context
var domainId = gs.getSession().getCurrentDomainID();
var sessionID = gs.getSessionID();
var timezoneName = gs.getSession().getTimeZoneName();
```

**Impersonation** (admin only, Global scope):

```javascript
var impersonate = new GlideImpersonate();
// impersonate() takes a sys_id, not a username
var previousUser = impersonate.impersonate('6816f79cc0a8016401c5a33be04be441');
// Now running as the impersonated user
// previousUser contains the sys_id of the original user

// Check if currently impersonating
var isImpersonating = new GlideImpersonate().isImpersonating();
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
var groupingSeparator = locale.getGroupingSeparator(); // e.g. ','
var decimalSeparator = locale.getDecimalSeparator();   // e.g. '.'
```

**Secure random generation**:

```javascript
var random = GlideSecureRandomUtil.getSecureRandomString(16);
var randomInt = GlideSecureRandomUtil.getSecureRandomIntBound(100); // 0 to 99
var randomLong = GlideSecureRandomUtil.getSecureRandomLong();
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

| Practice | Why it matters |
|----------|----------------|
| Descriptive variable names (`grIncident`) | Reviewed scripts are much easier to debug and update |
| PascalCase classes, camelCase functions | ServiceNow convention; wrong case breaks GlideAjax lookups |
| Never use `eval()` or dynamic code execution | Security vulnerability; can execute attacker-controlled code |
| Never hardcode `sys_id`s; use System Properties | Hardcoded IDs break on instance clones and cross-environment deployments |
| Avoid `getXMLWait()` | Synchronous; blocks the browser and causes timeout errors |
| Log important actions | Required for audit trails and debugging in production |
| Use domain context for multi-tenant operations | Without it, scripts inadvertently read/write across domain boundaries |
| Queue async work | Foreground scripts have strict time limits; long work must be async |
| Follow IIFE pattern for Script Includes | Prevents accidental global variable pollution |
| Test on sub-production first | Prevents production data corruption during script changes |

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

### APIs that accept module functions vs. string-only

| API | Script type | How to provide script |
|-----|------------|----------------------|
| `BusinessRule`, `ScriptAction`, `UiAction` | **Module function** (preferred) | `import { fn } from './module.ts'` then `script: fn` |
| `ScheduledScript` | **String only** | `script: Now.include('./file.js')` with IIFE wrapper |
| `ScriptInclude` | **String only** | `script: Now.include('./file.js')` with `Class.create()` |
| `ClientScript` | **String only** | `script: Now.include('./file.client.js')` |

> **ScheduledScript:** The `script` property is **string-only** — do NOT pass module imports. Use `Now.include('../../server/scheduled-scripts/my-job.js')`. The script file must wrap logic in an IIFE: `(function() { ... })();`

> **Scoped app restriction:** `gs.nowDateTime()` is **not allowed** in scoped applications. Use `new GlideDateTime().getDisplayValue()` instead.

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
