---
name: servicenow-business-rules
description: Create server-side database triggers with proper execution timing, recursion prevention, and validation patterns. Use when implementing Before/After/Async business rules, preventing recursive rule execution, or enforcing data validation on database operations.
---

# ServiceNow Business Rules

## Quick start

**Basic wrapping pattern** (prevents global variable pollution):

```javascript
(function executeRule(current, previous) {
    // Your code here
})(current, previous);
```

**Execution timing**:

| Type | Use Case | Key Constraint |
|------|----------|----------------|
| Before | Modifying current record before save | DO NOT use `current.update()` |
| After | Updating related records immediately | DO NOT modify `current` directly |
| Async | Integrations, heavy calculations | Runs in background |
| Display | Pass data to `g_scratchpad` | Read-only access |

**Preventing recursion**:

```javascript
// ✓ CORRECT: Direct field assignment in Before rule
current.state = 3; // Auto-saved

// ✗ WRONG: Never use update() in Before/After
current.update(); // Causes loop
```

## Validation pattern

```javascript
if (current.u_start_date > current.u_end_date) {
    gs.addErrorMessage('Start date must be before end date');
    current.setAbortAction(true); // Blocks DB transaction
}
```

## Best practices

- Use IIFE wrapper for all rules
- Check execution timing before using `current.update()`
- Refactor complex logic (>10 lines) into Script Includes
- Test recursion prevention on sub-production first
- Use Condition builder in the UI when possible

## Key APIs

| API | Purpose |
|-----|---------|
| current | GlideRecord object being processed |
| previous | GlideRecord snapshot before changes |
| gs | GlideSystem for logging and system operations |
| g_scratchpad | Pass data to Display Business Rules |
| current.setAbortAction() | Cancel database transaction |
| current.setWorkflow() | Control workflow execution |

## Reference

For complete execution matrix and advanced patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
