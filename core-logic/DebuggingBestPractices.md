# AI Directive: ServiceNow Debugging Best Practices

## Context
This document outlines the tools and methods for diagnosing issues in the ServiceNow platform.

## 1. Server-Side Debugging
*   **System Logs:**
    *   Use `gs.info('Source: message')`, `gs.warn()`, `gs.error()`.
    *   **Scope:** `gs.print()` and `gs.log()` are Legacy/Global only. Use `gs.info()` for Scoped Apps.
*   **Script Debugger:** Use the IDE Script Debugger (Breakpoints) for complex logic in Script Includes.
*   **Session Debug:**
    *   `System Diagnostics > Debug Business Rule`: Traces BR execution order.
    *   `System Security > Debug Security Rules`: Traces ACL evaluations.

## 2. Property-Controlled Logging (Pattern)
Prevent log spam in Production by wrapping debug statements.

```javascript
// Script Include
initialize: function() {
    this.debug = gs.getProperty('my_app.debug') === 'true';
},

_log: function(msg) {
    if (this.debug) {
        gs.info('[MyApp]: ' + msg);
    }
}
```

## 3. Client-Side Debugging
*   **Browser Console:** `console.log()` is standard.
*   **jslog():** Writes to the ServiceNow "JavaScript Log" (Developer Tools).
*   **Field Watcher:** Right-click a field logo -> "Watch Field". Shows what scripts (Client Script, UI Policy) affect it.
*   **Service Portal:**
    *   Impersonate User.
    *   Open standard UI page to see "Debug Output" at the bottom (if accessible).
    *   Or check Browser Console.

## 4. Common Diagnostic Steps
1.  **Reproduce:** Identify the record, user, and steps.
2.  **Isolate:** Is it Server (Database, BR) or Client (Browser)?
3.  **Check Logs:** Look for "Slow Query", "Recursive Business Rule", or Stack Traces.
4.  **Check Scope:** Are Cross-Scope privileges missing?
