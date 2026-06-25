---
name: servicenow-business-rules
context: fork
user-invocable: false
description: >-
  Create server-side database triggers with proper execution timing, recursion prevention, and validation patterns. Covers Classic Business Rule behavior and platform scripting guardrails. For Fluent SDK metadata, use `now-sdk explain businessrule-api --format raw` and the NowDev Fluent Logic agent. Trigger whenever the user mentions business rules, database triggers, Before/After/Async rules, validating records on save, or running server-side logic when records are inserted, updated, or deleted.
last_verified: "2026-05-18"
---

# ServiceNow Business Rules

## Choosing Your Approach

Business rules exist in two distinct contexts. This skill covers Classic/platform behavior; Fluent SDK constructor shape must come from `now-sdk explain businessrule-api --format raw`.

### **Classic Business Rules** (for existing instances)
Use for direct ServiceNow instance customizations created in the Business Rules UI.

```javascript
(function executeRule(current, previous) {
    // Your code here - runs in instance
})(current, previous);
```

### **Fluent SDK Business Rules** (for SDK projects)
Use `now-sdk explain businessrule-api --format raw` and `now-sdk explain business-rule-guide --format raw`, then route implementation to NowDev-AI-Fluent-Logic-Developer. Do not use local skill examples as SDK API reference.

---

## Execution Timing

| Type | When It Runs | Key Constraint |
|------|--------------|-----------------|
| **Before** | Before database save | Do NOT use `current.update()` |
| **After** | After database save | Do NOT modify `current` directly |
| **Async** | Background, post-save | Heavy ops, notifications |
| **Display** | Form load | Read-only, use `g_scratchpad` |

---

## Quick Start: Field Modification

```javascript
// ✓ CORRECT: Direct assignment in Before rule
current.state = 3;           // Auto-saved
current.urgency = current.priority;

// ✗ WRONG: Never use update() in Before rule
current.update();            // Causes infinite loop
```

## Quick Start: Validation

```javascript
if (current.start_date > current.end_date) {
    gs.addErrorMessage('Start date must be before end date');
    current.setAbortAction(true);  // Blocks save
}
```

## Decision Matrix: Which Approach to Use

| Situation | Classic | Fluent | Rationale |
|-----------|---------|--------|-----------|
| Existing instance customization | ✓ | - | Created in UI, no SDK setup needed |
| New SDK project | - | ✓ | Verify with `now-sdk explain businessrule-api` |
| Version control needed | - | ✓ | SDK files tracked in Git |
| Type-safe business logic | - | ✓ | Verify module pattern with installed SDK docs |
| Quick field validation | ✓ | - | No need for SDK complexity |
| Team knows TypeScript | - | ✓ | Leverage team expertise |
| Quick deployment | ✓ | - | Direct instance modification |

## Best Practices (All Approaches)

- **Prefer `filterCondition` over script guards** — the platform evaluates conditions before loading the script, which is more efficient
- **Set `order`** — lower numbers run first; default is 100. Set explicitly when rules may interact
- **Set `access`** — use `'public'` for cross-scope rules, `'package_private'` (default) for internal rules
- Use IIFE wrapper for all Classic rules (JavaScript context isolation)
- Check execution timing before using `current.update()`
- Only modify `current` in Before rules without calling `update()`
- Call `update()` explicitly in After rules
- Refactor complex logic (>20 lines) into Script Includes
- Test recursion prevention on sub-production first
- Prevent recursion by checking if field actually changed
- Handle all errors gracefully with try-catch
- Log important operations with `gs.info()` and `gs.error()`

## Key APIs

| API | Purpose |
|-----|---------|
| current | GlideRecord object being processed |
| previous | GlideRecord snapshot before changes |
| gs | GlideSystem for logging and system operations |
| g_scratchpad | Pass data to Display Business Rules |
| current.setAbortAction() | Cancel database transaction |
| current.setWorkflow() | Control workflow execution |

## Detailed Patterns

Choose the pattern that matches your implementation context:

- **[CLASSIC.md](./CLASSIC.md)** — Instance-based business rules (JavaScript, UI-created rules)
  - Field validation and auto-population
  - Before/After/Async/Display execution
  - Recursion prevention strategies
  - Error handling and logging

- Fluent SDK rules — use `now-sdk explain businessrule-api --format raw` and `now-sdk explain business-rule-guide --format raw`; route implementation to NowDev-AI-Fluent-Logic-Developer.

- **[EXAMPLES.md](./EXAMPLES.md)** — Classic quick reference plus Fluent topic pointers

## Reference

For complete execution matrix and advanced patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
