---
name: servicenow-business-rules
context: fork
user-invocable: false
description: >-
  Create server-side database triggers with proper execution timing, recursion prevention, and validation patterns. Covers Classic Business Rule behavior and platform scripting guardrails. For Fluent SDK metadata, use `now-sdk explain businessrule-api --format raw` and the NowDev Fluent Logic agent. Trigger whenever the user mentions business rules, database triggers, Before/After/Async rules, validating records on save, or running server-side logic when records are inserted, updated, or deleted.
last_verified: "2026-05-18"
---

# ServiceNow Business Rules

Use for Classic/platform Business Rule behavior. For Fluent SDK metadata, use `now-sdk explain businessrule-api --format raw` and `now-sdk explain business-rule-guide --format raw`.

## Choosing Your Approach

| Situation | Use | Rationale |
|-----------|-----|-----------|
| Existing instance customization | Classic Business Rule UI | Runs directly on the instance |
| New SDK project / version-controlled metadata | Fluent SDK | Verify with `now-sdk explain businessrule-api --format raw` |
| Quick validation or auto-population | Classic Before rule | Direct assignments are auto-saved |
| TypeScript-first app logic | Fluent SDK / modules | Verify installed SDK docs first |

## Execution Timing Guardrails

| Type | Runs | Use For | Must Do / Avoid |
|------|------|---------|-----------------|
| Before | Before database save | Validation, defaults, field transforms | Modify `current` directly; **never** call `current.update()` |
| After | After save | Related-record updates | Update other records explicitly; guard recursion |
| Async | Background after save | Notifications, integrations, heavy work | `previous` may be unavailable; failures do not block the transaction |
| Display | Form load | Server-to-client data | Read only; populate `g_scratchpad` |

## Critical Guardrails

- Prefer the Business Rule Condition/filter builder over script-only `if` guards so the script engine is skipped when conditions fail.
- Never create Global Business Rules; move shared logic into Script Includes and call from table-specific rules.
- Always use an IIFE wrapper in Classic rules to avoid global variable pollution.
- Prevent recursion with field-change checks, state flags, or carefully-scoped related-record updates.
- Never hardcode `sys_id`s, credentials, or environment-specific values; use System Properties or credential records.
- Use selective queries and `setLimit()`; never query every record in a rule.
- Prefer `getValue()` / `getDisplayValue()` over dot-walking in hot paths.
- Move complex logic (>20 lines or reused behavior) into Script Includes.
- Validate external/user input before saving; use `gs.addErrorMessage()` plus `current.setAbortAction(true)` in Before rules.
- Log meaningful production events and test recursion/performance on sub-production first.

## Quick Patterns

```javascript
if (current.start_date > current.end_date) {
    gs.addErrorMessage('Start date must be before end date');
    current.setAbortAction(true);
    return;
}
current.urgency = current.priority;
```

```javascript
if (current.priority === previous.priority) {
    return;
}
```

## Key APIs

| API | Purpose |
|-----|---------|
| `current` / `previous` | Current record and prior snapshot |
| `current.setAbortAction(true)` | Cancel the save transaction |
| `current.isNewRecord()` | Detect insert context |
| `current.update()` | Persist changes outside Before rules; guard recursion |
| `gs.addErrorMessage()` / `gs.addInfoMessage()` | User-facing messages |
| `gs.info()` / `gs.error()` | Operational logging |
| `g_scratchpad` | Display-rule data passed to client scripts |

## Reference

- Fluent SDK: `now-sdk explain businessrule-api --format raw` and `now-sdk explain business-rule-guide --format raw`.
- Classic platform APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
