# Fluent SDK Query Patterns

Patterns for querying, inserting, updating, and deleting records using the modern ServiceNow SDK Fluent API.

## Key Fluent Language Constructs

When working with Fluent SDK queries, you'll use these language constructs in script includes and business rules:

- **`Now.include('./file.server.js')`** — Reference external script files containing query logic (enables two-way sync)
- **`Now.ID['query_id']`** — Assign IDs to script includes or other metadata that contain query logic
- **`Now.ref('sys_user', { email: 'user@example.com' })`** — Reference user or other records from different applications

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

## Table of Contents

1. [Query Patterns](#query-patterns)
2. [Record Operations](#record-operations)
3. [Data Aggregation](#data-aggregation)
4. [Bulk Operations](#bulk-operations)
5. [Complex Filtering](#complex-filtering)
6. [Best Practices](#best-practices)

---

## Query Patterns

> **Note:** All code in this section runs inside `.server.js` handler files (not `.now.ts` metadata files).
> `GlideQuery`, `GlideRecord`, and `GlideAggregate` are global ServiceNow APIs — no import needed.

### Simple Query with Fluent API

```javascript
// Inside your .server.js handler file
const incidents = new GlideQuery('incident')
    .where('active', 'true')
    .where('priority', '1')
    .orderBy('created_on')
    .limit(10)
    .select()

const results = incidents.map(incident => ({
    number: incident.number,
    shortDescription: incident.short_description,
    priority: incident.priority
}))

return results
```

### Query with Advanced Filtering

```typescript
const incidents = new GlideQuery('incident')
    .where('active', 'true')
    .where(q => q
        .where('state', '!=', 'closed')
        .orWhere('priority', '1')
    )
    .orderBy('priority')
    .select()
```

### Get Single Record (Fluent)

```typescript
const incident = new GlideQuery('incident')
    .where('number', 'INC0010001')
    .selectOne()

if (incident) {
    return {
        number: incident.number,
        caller: incident.caller_id.display_value,
        state: incident.state,
        created: incident.created_on
    }
}
return null
```

---

## Record Operations

### Insert Record (Fluent)

```javascript
// Inside your .server.js handler file — use GlideRecord for inserts
var grIncident = new GlideRecord('incident')
grIncident.initialize()
grIncident.short_description = 'New incident'
grIncident.description = 'Detailed description'
grIncident.category = 'software'
grIncident.priority = '3'
grIncident.insert()

return grIncident.getUniqueValue()
```

### Update Record (Fluent)

```javascript
// Inside your .server.js handler file — use GlideRecord for updates
var grIncident = new GlideRecord('incident')
if (grIncident.get(incidentId)) {
    grIncident.short_description = 'Updated description'
    grIncident.priority = '2'
    grIncident.assignment_group = groupId
    grIncident.update()
    return true
}
return false
```

### Delete Record

```javascript
// Inside your .server.js handler file
var grIncident = new GlideRecord('incident')
if (grIncident.get(incidentId)) {
    grIncident.deleteRecord()
    return true
}
return false
```

---

## Data Aggregation

### Aggregate Operations

```javascript
// Inside your .server.js handler file
var incidents = new GlideQuery('incident')
    .select()

var stats = {}
for (var incident of incidents) {
    var priority = incident.priority
    stats[priority] = (stats[priority] || 0) + 1
}

return stats
```

### Group and Count

```javascript
var incidents = new GlideQuery('incident')
    .where('state', '!=', 'closed')
    .select()

var groupedByPriority = {}
for (var incident of incidents) {
    var key = incident.priority
    if (!groupedByPriority[key]) groupedByPriority[key] = []
    groupedByPriority[key].push(incident)
}

return groupedByPriority
```

### Filter and Transform

```javascript
var allIncidents = new GlideQuery('incident')
    .where('active', 'true')
    .select()

var activeIncidents = []
for (var i of allIncidents) {
    if (i.priority === '1' || i.priority === '2') {
        activeIncidents.push({
            number: i.number,
            shortDescription: i.short_description,
            priority: i.priority,
            assignee: i.assigned_to.name
        })
    }
}

return activeIncidents
```

---

## Bulk Operations

### Bulk Update

```javascript
// Inside your .server.js handler file
function bulkUpdateIncidents(conditions, updateFields) {
    var incidents = new GlideQuery('incident')
        .where(q => {
            for (var field in conditions) {
                q.where(field, conditions[field])
            }
            return q
        })
        .select()

    var updateCount = 0
    for (var incident of incidents) {
        for (var key in updateFields) {
            incident[key] = updateFields[key]
        }
        incident.update()
        updateCount++
    }

    return updateCount
}

### Bulk Delete

```javascript
// Inside your .server.js handler file
var incidents = new GlideQuery('incident')
    .where('state', 'closed')
    .where('closed_on', '<', '2024-01-01')
    .limit(1000)
    .select()

var deleteCount = 0
for (var incident of incidents) {
    incident.deleteRecord()
    deleteCount++
}

return deleteCount
```

---

## Complex Filtering

### Complex Conditions with Nesting

```javascript
// Inside your .server.js handler file
var incidents = new GlideQuery('incident')
    .where(q => q
        .where('active', 'true')
        .where(q2 => q2
            .where('priority', '1')
            .orWhere('priority', '2')
        )
    )
    .where('state', '!=', 'closed')
    .select()
```

### Text Search

```javascript
var incidents = new GlideQuery('incident')
    .where('short_description', 'like', '%network%')
    .orWhere('description', 'like', '%network%')
    .select()
```

### Range Queries

```javascript
var incidents = new GlideQuery('incident')
    .where('created_on', '>=', '2024-01-01')
    .where('created_on', '<', '2024-12-31')
    .where('priority', '<=', '2')
    .select()
```

---

## Best Practices

✓ **Use GlideQuery for reads** - Cleaner chainable API compared to GlideRecord query loops
✓ **Use GlideRecord for writes** - More reliable for insert/update/delete operations
✓ **Use select()** - To execute and get iterable of records
✓ **Use selectOne()** - For single record retrieval (returns null if not found)
✓ **Chainable API** - Reduce boilerplate with method chaining
✓ **No import needed** - GlideQuery, GlideRecord, GlideAggregate are global APIs in .server.js files
✓ **Array methods** - Leverage `map()`, `filter()`, `reduce()` for transformations on GlideQuery results
✓ **Limit results** - Use `limit()` to restrict large result sets
✓ **Avoid nested loops** - Use GlideAggregate for counts instead of looping

---

## Key APIs

| Method | Purpose |
|--------|---------|
| `where(field, operator, value)` | Add condition to query |
| `where(callback)` | Add grouped conditions |
| `orWhere(field, value)` | Add OR condition |
| `orderBy(field)` | Sort ascending |
| `orderByDesc(field)` | Sort descending |
| `limit(count)` | Limit result set |
| `select()` | Execute query, return array |
| `selectOne()` | Execute query, return single record or null |
| `toGlideRecord()` | Convert to GlideRecord for update/delete |
| `map()` | Transform results (Array method) |
| `filter()` | Filter results (Array method) |
| `reduce()` | Aggregate results (Array method) |

---

## When to Use Fluent API

- ✓ New SDK projects and applications
- ✓ TypeScript-based development
- ✓ Need type-safe queries
- ✓ Building full-stack applications
- ✓ Leverage modern JavaScript patterns
- ✓ Team has TypeScript expertise
- ✓ Modern development workflows with compilation

For legacy ServiceNow instances and compatibility, see [CLASSIC.md](CLASSIC.md) for the traditional GlideRecord API.
