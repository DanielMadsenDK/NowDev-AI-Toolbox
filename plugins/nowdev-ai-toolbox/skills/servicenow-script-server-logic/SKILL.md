---
name: servicenow-script-server-logic
context: fork
user-invocable: false
description: >-
  General server-side operations including Script Includes, JavaScript modules, system interactions, user session management, and utility functions. Covers two approaches: (1) Classic Script Includes using Class.create() for existing instances, and (2) Fluent SDK Script Includes and modules for SDK projects. Use for reusable server-side utilities, gs.* system operations, user context, and event publishing via gs.eventQueue(). Trigger this skill whenever the user needs to write a Script Include, create reusable server-side logic, use gs.* APIs, manage user sessions or preferences, queue events, or implement impersonation. JavaScript modules are preferred for new Fluent projects; Script Includes remain required for GlideAjax and cross-scope APIs.
last_verified: "2026-05-18"
---

# General Server Logic

Use for Classic server-side utilities, Script Includes, `gs.*` operations, sessions, events, and reusable logic. For Fluent SDK modules/Script Includes, use `now-sdk explain now-include-guide --format raw`, `now-sdk explain module-guide --format raw`, and `now-sdk explain scriptinclude-api --format raw`.

## Scoped App Restrictions

| Blocked / risky in scoped apps | Use instead |
|-------------------------------|-------------|
| `gs.nowDateTime()` | `new GlideDateTime().getDisplayValue()` |
| `gs.log()` two-argument form | `gs.info()`, `gs.warn()`, `gs.error()`, or `gs.debug()` |
| Unqualified custom table names | Fully-qualified scoped table names |
| Dynamic code via `eval()` | Direct logic or controlled `GlideScopedEvaluator` |

## Choosing Your Approach

| Situation | Use | Rationale |
|-----------|-----|-----------|
| Existing utility or GlideAjax target | Classic Script Include | Compatible with platform callers |
| Simple reusable server function | Function-style Script Include | Low ceremony |
| Stateful/reusable utility class | `Class.create()` Script Include | Conventional Classic pattern |
| New SDK project / TypeScript modules | Fluent SDK modules | Verify installed SDK docs first |

## Critical Guardrails

- Never use `eval()` or execute untrusted code. If dynamic scripts are unavoidable, validate inputs and use `GlideScopedEvaluator` in a controlled context.
- Never hardcode secrets, credentials, API keys, or environment-specific `sys_id`s; use credential records or System Properties.
- Prefix user preferences and System Properties with your app scope to avoid collisions.
- Queue long-running work with `gs.eventQueue()` or scheduled/background jobs; foreground scripts have strict time limits.
- Use `gs.eventQueue(name, instance, parm1, parm2, queue)` for business events; Script Actions receive `event.parm1` and `event.parm2`.
- Impersonation requires admin/global context; `GlideImpersonate.impersonate()` takes a user `sys_id`, not username.
- Use descriptive variable names and avoid undeclared globals.
- Wrap database operations in try/catch and log actionable errors.
- Use domain/session context intentionally in domain-separated instances.
- Return structured data from utilities; avoid leaking sensitive fields.

## Quick Patterns

```javascript
var userId = gs.getUserID();
var userName = gs.getUser().getName();
gs.info('Processing for user: ' + userName);
```

```javascript
gs.eventQueue('incident.priority_changed', current, current.getValue('priority'), current.getValue('state'));
```

```javascript
var raw = gs.getUser().getPreference('x_scope.last_table');
var pref = raw ? JSON.parse(raw) : null;
```

## Key APIs

| API | Purpose |
|-----|---------|
| `GlideSystem (gs)` | System operations, logging, events, properties |
| `GlideUser (gs.getUser())` | Current user context and preferences |
| `Class.create()` | Classic Script Include classes |
| `GlideScopedEvaluator` | Controlled script evaluation |
| `GlideImpersonate` | Admin-only context switching |
| `GlideLocale` | Locale and formatting metadata |
| `GlideSecureRandomUtil` | Secure random strings/integers |

## Reference

- Fluent SDK: `now-sdk explain now-include-guide --format raw`, `now-sdk explain module-guide --format raw`, `now-sdk explain scriptinclude-api --format raw`, and `now-sdk explain script-include-guide --format raw`.
- Classic `gs.*`, Script Include, session, event, and platform APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
