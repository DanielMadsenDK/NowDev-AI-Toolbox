# Business Rules - Code Examples

Quick reference guide for creating business rules. This page provides navigation to detailed pattern references organized by approach.

## Choose Your Approach

### **[CLASSIC.md](CLASSIC.md) — Instance-Based Rules**
Use for direct ServiceNow instance customizations created in the Business Rules UI.

**Quick example:**
```javascript
(function executeRule(current, previous) {
    if (current.priority === previous.priority) {
        return;
    }
    current.urgency = current.priority;
})(current, previous);
```

**When to use:**
- ✓ Existing ServiceNow instances
- ✓ Instance-based customizations
- ✓ Field validation and auto-population
- ✓ Updating related records
- ✓ Sending notifications (Async)

---

### **[FLUENT.md](FLUENT.md) — SDK-Based Rules (.now.ts)**
Use for TypeScript projects with `.now.ts` metadata definitions and handler functions.

**Quick example:**
```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency',
    table: 'incident',
    when: 'before',
    script: (current, previous) => {
        if (current.priority === previous.priority) return;
        current.urgency = current.priority;
    }
})
```

**When to use:**
- ✓ New SDK projects
- ✓ TypeScript and version control
- ✓ Type-safe business logic
- ✓ Full-stack SDK applications
- ✓ Team knows TypeScript

---

## Execution Types

| Type | Runs When | Use For |
|------|-----------|---------|
| **Before** | Before database save | Validation, auto-population |
| **After** | After database save | Updating related records |
| **Async** | In background, post-save | Notifications, heavy operations |
| **Display** | When form loads | UI initialization, data passing |

---

## Pattern Coverage

| Pattern | Classic | Fluent | Learn More |
|---------|---------|--------|------------|
| Field validation | ✓ | ✓ | See respective guide |
| Auto-population | ✓ | ✓ | See respective guide |
| Recursion prevention | ✓ | ✓ | See respective guide |
| Related record updates | ✓ | ✓ | See respective guide |
| Notifications | ✓ | ✓ | See respective guide |
| Error handling | ✓ | ✓ | See respective guide |
| Type safety | - | ✓ | [FLUENT.md](FLUENT.md) |
| Version control | - | ✓ | [FLUENT.md](FLUENT.md) |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | [FLUENT.md](FLUENT.md) |
| Do we use TypeScript? | Yes | [FLUENT.md](FLUENT.md) |
| Need version control for rules? | Yes | [FLUENT.md](FLUENT.md) |
| Quick instance customization? | Yes | [CLASSIC.md](CLASSIC.md) |

---

## Key Differences at a Glance

### Classic: Instance Rule (UI-created)
```javascript
// Created directly in Business Rules UI
(function executeRule(current, previous) {
    current.urgency = current.priority;
})(current, previous);
```

### Fluent: SDK Rule (.now.ts)
```typescript
// Version-controlled, TypeScript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_rule'],
    name: 'Auto-Set Urgency',
    table: 'incident',
    when: 'before',
    script: (current, previous) => {
        current.urgency = current.priority;
    }
})
```

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Execution matrix and advanced patterns
- **[CLASSIC.md](CLASSIC.md)** — Full reference for instance-based rules
- **[FLUENT.md](FLUENT.md)** — Full reference for SDK rules
