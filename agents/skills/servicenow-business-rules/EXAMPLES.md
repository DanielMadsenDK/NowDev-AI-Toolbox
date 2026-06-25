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

### **Fluent SDK Rules (.now.ts)**
Use `now-sdk explain businessrule-api --format raw` and `now-sdk explain business-rule-guide --format raw`, then route implementation to NowDev-AI-Fluent-Logic-Developer. Local examples are not SDK API reference.

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
| Type safety | - | ✓ | `now-sdk explain businessrule-api` |
| Version control | - | ✓ | `now-sdk explain developing-apps-guide` |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | NowDev-AI-Fluent-Logic-Developer |
| Do we use TypeScript? | Yes | `now-sdk explain businessrule-api` |
| Need version control for rules? | Yes | `now-sdk explain developing-apps-guide` |
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
Use installed-version docs: `now-sdk explain businessrule-api --format raw`.

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Execution matrix and advanced patterns
- **[CLASSIC.md](CLASSIC.md)** — Full reference for instance-based rules
- Fluent SDK rules — `now-sdk explain businessrule-api --format raw`
