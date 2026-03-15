# Data Manipulation - Code Examples

Quick reference guide for querying, updating, and aggregating ServiceNow records. This page provides navigation to detailed pattern references organized by approach.

## Choose Your Approach

### **[CLASSIC.md](CLASSIC.md) — Traditional GlideRecord**
Use for existing ServiceNow instances, legacy codebases, and business rules.

**Quick example:**
```javascript
var gr = new GlideRecord('incident');
gr.addQuery('active', 'true');
gr.addQuery('priority', '1');
gr.orderBy('created_on');
gr.query();

while (gr.next()) {
    gs.info('Incident: ' + gr.getValue('number'));
}
```

**When to use:**
- ✓ Existing instance scripts
- ✓ Business rules and server-side logic
- ✓ GlideAjax server methods
- ✓ Legacy codebases you're maintaining
- ✓ Quick fixes and one-off scripts

---

### **[FLUENT.md](FLUENT.md) — Modern SDK (GlideQuery)**
Use for new TypeScript projects and full-stack SDK applications.

**Quick example:**
```typescript
const incidents = new GlideQuery('incident')
    .where('active', 'true')
    .where('priority', '1')
    .orderBy('created_on')
    .select()

incidents.forEach(incident => {
    gs.info(`Incident: ${incident.number}`)
})
```

**When to use:**
- ✓ New TypeScript projects
- ✓ Full-stack SDK applications
- ✓ Type-safe code needed
- ✓ Modern development workflows
- ✓ Team knows TypeScript

---

## Pattern Coverage

| Pattern | Classic | Fluent | Learn More |
|---------|---------|--------|------------|
| Simple queries | ✓ | ✓ | See respective guide |
| Multiple conditions | ✓ | ✓ | See respective guide |
| CRUD operations | ✓ | ✓ | See respective guide |
| Data aggregation | ✓ | ✓ | See respective guide |
| Bulk operations | ✓ | ✓ | See respective guide |
| Complex filtering | ✓ | ✓ | See respective guide |
| Type safety | - | ✓ | [FLUENT.md](FLUENT.md) |
| ACL enforcement | ✓ | - | [CLASSIC.md](CLASSIC.md) |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | [FLUENT.md](FLUENT.md) |
| Do we use TypeScript? | Yes | [FLUENT.md](FLUENT.md) |
| Is this a business rule? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a quick fix? | Yes | [CLASSIC.md](CLASSIC.md) |
| Do we need type safety? | Yes | [FLUENT.md](FLUENT.md) |

---

## Key Differences at a Glance

### Classic GlideRecord
```javascript
// JavaScript syntax
var gr = new GlideRecord('incident');
gr.addQuery('priority', '1');
gr.query();
while (gr.next()) {
    var number = gr.getValue('number');
}
```

### Fluent SDK
```typescript
// TypeScript syntax, chainable API
const incidents = new GlideQuery('incident')
    .where('priority', '1')
    .select()

const numbers = incidents.map(i => i.number)
```

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Performance optimization and anti-patterns
- **[CLASSIC.md](CLASSIC.md)** — Full reference for GlideRecord patterns
- **[FLUENT.md](FLUENT.md)** — Full reference for GlideQuery patterns
