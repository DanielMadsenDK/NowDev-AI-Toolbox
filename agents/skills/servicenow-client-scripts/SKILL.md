---
name: servicenow-client-scripts
context: fork
user-invocable: false
description: >-
    Implement browser-side client scripts using GlideAjax for async server communication. Covers Classic client script behavior, GlideAjax, g_scratchpad, and form performance guardrails. For Fluent SDK metadata, use `now-sdk explain clientscript-api --format raw` and the NowDev Fluent UI agent. Trigger whenever the user mentions client scripts, GlideAjax, OnChange/OnLoad/OnSubmit handlers, or browser-side logic that communicates with the server.
last_verified: "2026-05-18"
---

# ServiceNow Client Scripting

Use for Classic/platform Client Script behavior, GlideAjax, `g_form`, and `g_scratchpad`. For Fluent SDK metadata, use `now-sdk explain clientscript-api --format raw` and `now-sdk explain client-script-guide --format raw`.

## Choosing Your Approach

| Situation | Use | Rationale |
|-----------|-----|-----------|
| Static visibility/mandatory/read-only behavior | UI Policy | Faster, declarative, no script required |
| Dynamic form behavior without server calls | `g_form` / UI Forms skill | Runtime field state or validation |
| Browser-to-server lookup | GlideAjax | Async server communication |
| Existing instance customization | Classic Client Script UI | Direct platform customization |
| New SDK project / version-controlled metadata | Fluent SDK | Verify with `now-sdk explain clientscript-api --format raw` |

## Critical Guardrails

| Rule | Reason |
|------|--------|
| Always use `getXMLAnswer()` or `getXML()` | Async; avoids browser blocking |
| Never use `getXMLWait()` | Synchronous and forbidden |
| Never use client-side `GlideRecord` | Browser-blocking/unsupported; use GlideAjax |
| Avoid direct DOM or jQuery selectors | Breaks across Polaris, Workspace, mobile, and form layouts |
| Always check `isLoading` in handlers | Prevents duplicate calls during form load |
| Validate on the server too | Client validation is UX only, not security |

## Performance and Security Guardrails

- Prefer UI Policies for simple visibility, mandatory, read-only, clearing, related-list visibility, and static value changes.
- Use `g_scratchpad` from Display Business Rules for small server-computed values needed on load; keep payloads lightweight.
- Debounce rapid onChange events and cache form-lifetime lookup results.
- Send minimal parameters to GlideAjax Script Includes; whitelist methods by `sysparm_name` and validate inputs server-side.
- Use PascalCase Script Include names; wrong casing can break GlideAjax lookups.
- Use `g_form.setValue('ref_field', sysId, displayValue)` when you already have display value.
- Keep scripts focused; move complex server logic into Script Includes.
- Do not embed credentials, API keys, or secrets in client scripts.
- Test in classic forms, Workspace, mobile, and relevant catalog contexts.

## Quick Pattern

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || !newValue) return;
    var ga = new GlideAjax('IncidentUtils');
    ga.addParam('sysparm_name', 'suggestGroup');
    ga.addParam('sysparm_category', newValue);
    ga.getXMLAnswer(function(answer) {
        if (answer) g_form.setValue('assignment_group', answer);
    });
}
```

## UI Policies vs Client Scripts

Use UI Policies for show/hide, read-only, mandatory, clear values, static field values, related-list visibility, and declarative condition behavior. Use Client Scripts for dynamic user-triggered behavior, GlideAjax communication, complex validation, cascading updates, or custom messages. For Fluent UI Policy metadata, use `now-sdk explain uipolicy-api --format raw`.

## Key APIs

| API | Purpose |
|-----|---------|
| `GlideAjax` | Async server communication |
| `g_form` | Form field manipulation |
| `g_scratchpad` | Server-to-client data passing |
| `g_user` | Current user context |
| `GlideModal` | Modal dialogs |
| `onLoad` / `onChange` / `onSubmit` | Client script entry points |

## Reference

- Fluent SDK: `now-sdk explain clientscript-api --format raw`, `now-sdk explain client-script-guide --format raw`, and `now-sdk explain uipolicy-api --format raw`.
- Classic `g_form`, GlideAjax, and client scripting APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
