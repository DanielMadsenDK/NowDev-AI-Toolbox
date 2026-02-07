---
name: servicenow-client-scripts
description: Implement browser-side client scripts with GlideAjax patterns, UI Policies, and g_form APIs. Covers performance optimization, preventing browser blocking, and safe DOM access. Use for OnChange/OnLoad/OnSubmit scripts, UI Policies, and client-side field validation.
---

# ServiceNow Client Scripting

## Quick start

**GlideAjax pattern** (async, non-blocking):

```javascript
function makeServerCall() {
    // Always check if already loading
    if (isLoading || g_form.getValue('field') === '') {
        return;
    }
    
    var ga = new GlideAjax('ScriptIncludeName'); // PascalCase
    ga.addParam('sysparm_name', 'methodName');
    ga.addParam('sysparm_data', g_form.getValue('source_field'));
    
    // MUST use getXMLAnswer (async), NEVER getXMLWait
    ga.getXMLAnswer(function(answer) {
        if (answer) {
            g_form.setValue('target_field', answer);
        }
    });
}
```

## Critical rules

| Rule | Reason |
|------|--------|
| NO GlideRecord | Blocks browser; use GlideAjax |
| Use `getXMLAnswer` | Async; prevents UI freeze |
| NO `getXMLWait` | Forbidden; blocks browser |
| NO document/jQuery | Breaks on Polaris/Next Experience |
| Use `g_form` API | Safe across all versions |

## Performance optimization

**Use g_scratchpad** (server → client on load):

```javascript
// Display Business Rule (server):
g_scratchpad.vip = true;

// OnLoad script (client):
if (g_scratchpad.vip) {
    g_form.setLabel('priority', 'VIP Priority');
}
```

**Avoid redundant calls**:

```javascript
// ✓ CORRECT: Check client logic first
if (!isLoading && newValue) {
    // Make server call
}

// Set display value to avoid round-trips
g_form.setValue('ref_field', id, displayValue);
```

## Best practices

- Use UI Policies for visibility/mandatory/read-only logic
- Always check `isLoading` flag before GlideAjax calls
- Use `setValue(field, id, display)` to avoid extra queries
- Avoid global variables; scope to specific tables
- Test with all form layouts before production

## Reference

For GlideAjax templates, g_scratchpad patterns, and examples, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
