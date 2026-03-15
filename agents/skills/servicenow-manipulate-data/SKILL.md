---
name: servicenow-manipulate-data
user-invokable: false
description: Query, insert, update, and delete records in the ServiceNow database with emphasis on performance and security. Covers two approaches: (1) Classic GlideRecord API for existing instances and legacy code, and (2) Modern Fluent SDK (GlideQuery) for new TypeScript projects. Use when working with database records, aggregating data, or implementing data-driven logic. For legacy/existing instances, recommend Classic patterns; for new SDK projects, recommend Fluent patterns.
---

# Manipulate ServiceNow Data

## Choosing Your Approach

The skill supports two distinct ServiceNow development patterns:

### **Classic GlideRecord** (for existing instances)
Use for existing instance scripts, legacy codebases, business rules, and quick scripting. Best for GlideAjax, server-side scripts, and maximum compatibility.

### **Fluent SDK (GlideQuery)** (for new projects)
Use for new TypeScript-based projects, full-stack applications, and modern development workflows. Better type safety, chainable API, and cleaner code.

---

## Quick start

**Classic GlideRecord** - Traditional approach:

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('state', 'Open');
gr.addQuery('priority', '<=', 2);
gr.orderBy('created_on');
gr.query();

while (gr.next()) {
    gs.info('Incident: ' + gr.getValue('number'));
}
```

**Fluent SDK (GlideQuery)** - Modern approach:

```typescript
const records = new GlideQuery('incident')
    .where('state', 'Open')
    .where('priority', '<=', 2)
    .orderBy('created_on')
    .select()

records.forEach(incident => {
    gs.info(`Incident: ${incident.number}`)
})
```

**Aggregating data**:

```javascript
var agg = new GlideAggregate('incident');
agg.addAggregate('COUNT');
agg.addAggregate('SUM', 'time_worked');
agg.query();

while (agg.next()) {
    var count = agg.getAggregate('COUNT');
    var total = agg.getAggregate('SUM');
}
```

**Secure access** (with ACL enforcement):

```javascript
var gr = new GlideRecordSecure('confidential_table');
gr.query();
// Only returns records user has permission to see
```

## Performance patterns

| Pattern | Use Case | Performance |
|---------|----------|-------------|
| `setLimit(1)` | Existence check | Fast |
| `getValue('field')` | Get single value | No dot-walk overhead |
| `GlideAggregate` | Count/Sum | Much faster than loop |
| `addEncodedQuery()` | Complex filters | Copy from list view |

## Decision Matrix: Which Approach to Use

| Situation | Classic | Fluent | Rationale |
|-----------|---------|--------|-----------|
| Existing instance scripts | ✓ | - | Maximum compatibility, no compilation needed |
| Legacy business rules | ✓ | - | Business rules run on instances without SDK |
| GlideAjax server methods | ✓ | - | Proven pattern for async communication |
| New TypeScript project | - | ✓ | Type safety, better tooling support |
| Full-stack SDK application | - | ✓ | Fluent API designed for SDK projects |
| Quick fix/scripting | ✓ | - | Less setup required |
| Team knows TypeScript | - | ✓ | Leverages team expertise |
| Team knows legacy JavaScript | ✓ | - | Comfortable patterns |

## Best practices (All approaches)

- Never iterate to count; use `GlideAggregate` (classic) or `.reduce()` (fluent) instead
- Use `getValue()` (classic) or direct property access (fluent) for field access
- Use `GlideRecordSecure` (classic) when ACLs matter
- Use `setLimit()` (classic) or `limit()` (fluent) to restrict large datasets
- Copy `encodedQuery` from list views for complex filters
- Test queries on sub-production before production
- Refactor repeated query logic into Script Includes
- Always verify record exists before accessing (`next()` or `selectOne()`)

## Key APIs

| API | Purpose |
|-----|---------|
| GlideRecord | CRUD operations, traditional |
| GlideQuery | NEW - fluent, modern queries |
| GlideAggregate | Counts, sums, aggregations |
| GlideRecordSecure | ACL-enforced queries |
| GlideFilter | Advanced filtering operations |

## Detailed Patterns

Choose the pattern that matches your project type:

- **[CLASSIC.md](references/CLASSIC.md)** — Traditional GlideRecord patterns (JavaScript, existing instances)
  - Simple and multiple condition queries
  - Record CRUD operations
  - GlideAggregate for performance
  - Bulk operations and complex filtering

- **[FLUENT.md](references/FLUENT.md)** — Modern SDK patterns (TypeScript, new projects)
  - Type-safe fluent API
  - GlideQuery chainable methods
  - Array transformations and aggregations
  - Full-stack application development

- **[EXAMPLES.md](references/EXAMPLES.md)** — Quick reference showing both approaches side-by-side

## Reference

For performance optimization, decision matrices, and anti-patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
