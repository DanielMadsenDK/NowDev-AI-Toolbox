# ServiceNow Client Scripting Reference Patterns

## 1. GlideAjax Standard Template
Use `getXMLAnswer` for lightweight string responses.

```javascript
var ga = new GlideAjax('ScriptIncludeName'); // PascalCase
ga.addParam('sysparm_name', 'methodName');
ga.addParam('sysparm_data', g_form.getValue('field'));
// Use getXMLAnswer, NOT getXML
ga.getXMLAnswer(function(answer) {
    if (answer) {
        g_form.setValue('target_field', answer);
    }
});
```

## 2. Optimization Techniques
*   **isLoading:** Always abort in `onChange`:
    ```javascript
    if (isLoading || newValue === '') {
        return;
    }
    ```
*   **Bury the Call:** Check client logic *before* calling server.
*   **Set Display Value:** `g_form.setValue('ref', id, display)` avoids round-trips.

## 3. g_scratchpad (Display Business Rules)
Push server data on load instead of making calls.
*   **Server (Display BR):** `g_scratchpad.vip = true;`
*   **Client (onLoad):** `if (g_scratchpad.vip)`

## 4. Restrictions detail
*   **DOM Access:** `document.getElementById` breaks on upgrades (Polaris/Next Experience).
*   **Global Scripts:** Avoid. Scope to specific tables.