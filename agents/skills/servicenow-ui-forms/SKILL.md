---
name: servicenow-ui-forms
context: fork
user-invocable: false
description: Manipulate form field state using g_form APIs — no server calls required. Covers field value get/set, mandatory/read-only/hidden control, inline validation and error messages, section and tab visibility, and form state checks. Use for dynamic/runtime field manipulation triggered by user actions (onChange, onLoad, onSubmit). For static field behavior based on conditions, prefer UI Policies instead — they load faster and don't require scripting. For scripts requiring GlideAjax server communication, use the servicenow-client-scripts skill. Trigger this skill whenever the user needs to control field visibility, mandatory state, read-only state, field values, or form messages in a ServiceNow client script without making server calls.
last_verified: "2026-05-18"
---

# Customize UI Forms

Use for Classic client-side `g_form` field manipulation with no server call. For GlideAjax/server communication, use `servicenow-client-scripts`. For Fluent UI metadata, use `now-sdk explain uipolicy-api --format raw` and `now-sdk explain uiaction-api --format raw` as needed.

## Choosing Your Approach

| Situation | Use | Rationale |
|-----------|-----|-----------|
| Static show/hide, mandatory, read-only, clear value, related-list visibility | UI Policy | Declarative and faster than script |
| Dynamic runtime form changes | `g_form` | User-triggered or computed behavior |
| Server lookup needed | GlideAjax via client-scripts skill | Async server communication |
| New SDK UI Policy / UI Action metadata | Fluent SDK | Verify with `now-sdk explain ... --format raw` |

## Critical Guardrails

- Prefer UI Policies when logic can be expressed declaratively (for example, if field X equals Y, show field Z).
- Use `g_form` APIs; avoid direct DOM, jQuery, layout-specific selectors, or desktop-only assumptions.
- Always check `isLoading` in onChange handlers to avoid load-time side effects.
- Client-side validation improves UX only; enforce authoritative validation server-side too.
- Use `g_form.setValue('ref_field', sysId, displayValue)` when setting reference fields and you already have display text.
- Use `g_scratchpad` for small server-pushed values on load; keep it lightweight.
- Debounce expensive onChange behavior and cache lookup results for the form lifetime.
- Verify field names exist on the form before manipulating optional/custom fields.
- Test in the target experiences: classic form, Workspace, mobile, and catalog when applicable.
- Do not log or expose sensitive data in browser scripts.

## Quick Patterns

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) return;
    var highPriority = newValue === '1';
    g_form.setMandatory('assignment_group', highPriority);
    g_form.setVisible('escalation_reason', highPriority);
}
```

```javascript
function onSubmit() {
    if (g_form.getValue('priority') === '1' && !g_form.getValue('assignment_group')) {
        g_form.addErrorMessage('Assignment group required for high priority');
        return false;
    }
    return true;
}
```

## Common `g_form` APIs

| API | Purpose |
|-----|---------|
| `getValue()` / `getDisplayValue()` | Read internal/display values |
| `setValue(field, value, displayValue)` | Set values, including reference display value |
| `setMandatory()` | Toggle mandatory state |
| `setReadOnly()` / `setDisabled()` | Control editability |
| `setVisible()` | Show/hide fields or sections |
| `addErrorMessage()` / `addInfoMessage()` | Form-level messages |
| `showErrorBox()` / `hideErrorBox()` / `showFieldMsg()` | Field-level feedback |
| `isNewRecord()` / `getTableName()` | Form state checks |
| `getReference(field, callback)` | Async reference lookup; avoid dot-walking |

## Reference

- Fluent UI Policy/UI Action metadata: `now-sdk explain uipolicy-api --format raw` and `now-sdk explain uiaction-api --format raw`.
- Classic `g_form`, form events, UI Policies, and client UI APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
