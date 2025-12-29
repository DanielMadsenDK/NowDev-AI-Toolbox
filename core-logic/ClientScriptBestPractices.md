# AI Directive: ServiceNow Client Scripts Best Practices

## Context
This document defines the strict coding standards for **Client Scripts** (Browser-Side JavaScript).

## 1. Performance Mandates
*   **NO GlideRecord:** **STRICTLY FORBIDDEN**. Never use `new GlideRecord()` in Client Scripts. It fetches all fields and blocks the browser.
*   **Use GlideAjax:** Use `GlideAjax` for all server interactions.
*   **Asynchronous Only:** Always use a callback function. **DO NOT** use `getXMLWait`.
*   **UI Policies First:** Use UI Policies for visibility (`setVisible`), mandatory (`setMandatory`), and read-only (`setReadOnly`) states. Only use Client Scripts for logic that UI Policies cannot handle.

## 2. GlideAjax Pattern
Use `getXMLAnswer` for a lightweight response (string) instead of the full XML object.

**Standard Template:**
```javascript
var ga = new GlideAjax('ScriptIncludeName'); // PascalCase
ga.addParam('sysparm_name', 'methodName');
ga.addParam('sysparm_data', g_form.getValue('field'));
ga.getXMLAnswer(function(answer) {
    if (answer) {
        // Process result
        g_form.setValue('target_field', answer);
    }
});
```

## 3. Optimization Techniques
*   **isLoading Check:** In `onChange` scripts, always abort if loading.
    ```javascript
    if (isLoading || newValue === '') {
        return;
    }
    ```
*   **Bury the Call:** Check all client-side preconditions *before* triggering the server call.
    ```javascript
    // GOOD
    if (g_form.getValue('type') === 'special') {
        // Only call server if type is special
        var ga = new GlideAjax(...);
    }
    ```
*   **Reference Fields:** Set Display Value to avoid extra round-trips.
    ```javascript
    g_form.setValue('caller_id', sysId, displayName); // Efficient
    // vs
    g_form.setValue('caller_id', sysId); // Inefficient (Triggers synchronous fetch)
    ```

## 4. Minimizing Server Lookups
*   **g_scratchpad:** Use a **Display Business Rule** to push server data to the client on form load.
    *   *Server (Display BR):* `g_scratchpad.isManager = gs.getUser().isMemberOf('Managers');`
    *   *Client (onLoad):* `if (g_scratchpad.isManager) { ... }`

## 5. Restrictions
*   **DOM Manipulation:** **AVOID** `document.getElementById`, `jQuery`, `$`. Use `g_form` API. DOM structure changes between ServiceNow versions.
*   **Global Client Scripts:** **AVOID**. Apply scripts to specific tables.
