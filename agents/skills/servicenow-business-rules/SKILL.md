---
name: servicenow-business-rules
user-invocable: false
description: Create server-side database triggers with proper execution timing, recursion prevention, and validation patterns. Covers two approaches: (1) Classic business rules in existing instances, and (2) Fluent SDK TypeScript definitions in .now.ts files. Use when implementing Before/After/Async business rules, preventing recursive rule execution, or enforcing data validation on database operations. For legacy instances, recommend Classic patterns; for SDK projects, recommend Fluent patterns.
---

# ServiceNow Business Rules

## Choosing Your Approach

Business rules exist in two distinct contexts:

### **Classic Business Rules** (for existing instances)
Use for direct ServiceNow instance customizations created in the Business Rules UI.

```javascript
(function executeRule(current, previous) {
    // Your code here - runs in instance
})(current, previous);
```

### **Fluent SDK Business Rules** (for SDK projects)
Use for TypeScript-based projects with `.now.ts` metadata files and `.server.js` handlers.

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency',
    active: true,
    table: 'incident',
    when: 'before',
    script: (current, previous) => {
        // Your code here - runs in SDK context
    }
})
```

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
| New SDK project | - | ✓ | Use .now.ts with TypeScript |
| Version control needed | - | ✓ | SDK files tracked in Git |
| Type-safe business logic | - | ✓ | TypeScript compiler catches errors |
| Quick field validation | ✓ | - | No need for SDK complexity |
| Team knows TypeScript | - | ✓ | Leverage team expertise |
| Quick deployment | ✓ | - | Direct instance modification |

## Best Practices (All Approaches)

- Use IIFE wrapper for all rules (JavaScript context isolation)
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

- **[FLUENT.md](./FLUENT.md)** — SDK-based business rules (TypeScript, `.now.ts` files)
  - Metadata-driven rule definitions
  - TypeScript handler implementation
  - Version-controlled rules
  - Full IDE support and type safety

- **[EXAMPLES.md](./EXAMPLES.md)** — Quick reference showing both approaches

## Reference

For complete execution matrix and advanced patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
