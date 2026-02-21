---
name: servicenow-manipulate-data
user-invokable: false
description: Query, insert, update, and delete records in the ServiceNow database with emphasis on performance and security. Covers GlideRecord, GlideQuery, GlideAggregate, and secure data access patterns. Use when working with database records, aggregating data, or implementing data-driven logic.
---

# Manipulate ServiceNow Data

## Quick start

**Querying records** (traditional):

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

**Modern fluent queries**:

```javascript
var records = new global.GlideQuery('incident')
    .where('active', true)
    .where('priority', '<=', 2)
    .select();

for (var i = 0; i < records.length; i++) {
    var incident = records[i];
}
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

## Best practices

- Use `GlideQuery` for new code (modern, fluent)
- Use `GlideRecord` for complex queries and CRUD operations
- Never iterate to count; use `GlideAggregate` instead
- Use `getValue()` instead of dot-walking for performance
- Use `GlideRecordSecure` when ACLs matter
- Use `setLimit(1)` for existence checks
- Copy `encodedQuery` from list views for complex filters
- Test queries on sub-production before production
- Refactor repeated query logic into Script Includes
- Always check if record exists with `next()` before accessing

## Key APIs

| API | Purpose |
|-----|---------|
| GlideRecord | CRUD operations, traditional |
| GlideQuery | NEW - fluent, modern queries |
| GlideAggregate | Counts, sums, aggregations |
| GlideRecordSecure | ACL-enforced queries |
| GlideFilter | Advanced filtering operations |

## Reference

For Performance optimization, decision matrices, and anti-patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
