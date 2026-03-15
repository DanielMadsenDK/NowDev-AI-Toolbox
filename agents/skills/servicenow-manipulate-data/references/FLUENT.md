# Fluent SDK Query Patterns

Patterns for querying, inserting, updating, and deleting records using the modern ServiceNow SDK Fluent API.

## Table of Contents

1. [Query Patterns](#query-patterns)
2. [Record Operations](#record-operations)
3. [Data Aggregation](#data-aggregation)
4. [Bulk Operations](#bulk-operations)
5. [Complex Filtering](#complex-filtering)
6. [Best Practices](#best-practices)

---

## Query Patterns

### Simple Query with Fluent API

```typescript
import { GlideQuery } from '@servicenow/sdk/core'

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

```typescript
import { Record } from '@servicenow/sdk/core'

const newIncident = await new GlideQuery('incident')
    .create({
        short_description: 'New incident',
        description: 'Detailed description',
        category: 'software',
        priority: '3'
    })
    .insert()

return newIncident.sys_id
```

### Update Record (Fluent)

```typescript
const incident = new GlideQuery('incident')
    .where('sys_id', incidentId)
    .selectOne()

if (incident) {
    incident.short_description = 'Updated description'
    incident.priority = '2'
    incident.assignment_group = groupId
    incident.update()
    return true
}
return false
```

### Delete Record

```typescript
const incident = new GlideQuery('incident')
    .where('sys_id', incidentId)
    .selectOne()

if (incident) {
    incident.delete()
    return true
}
return false
```

---

## Data Aggregation

### Aggregate Operations

```typescript
const stats = new GlideQuery('incident')
    .select()
    .reduce((acc, incident) => {
        const priority = incident.priority
        acc[priority] = (acc[priority] || 0) + 1
        return acc
    }, {})

return stats
```

### Group and Count

```typescript
const incidents = new GlideQuery('incident')
    .where('state', '!=', 'closed')
    .select()

const groupedByPriority = incidents.reduce((acc, incident) => {
    const key = incident.priority
    if (!acc[key]) acc[key] = []
    acc[key].push(incident)
    return acc
}, {})

return groupedByPriority
```

### Filter and Transform

```typescript
const activeIncidents = new GlideQuery('incident')
    .where('active', 'true')
    .select()
    .filter(i => i.priority === '1' || i.priority === '2')
    .map(i => ({
        number: i.number,
        shortDescription: i.short_description,
        priority: i.priority,
        assignee: i.assigned_to.name
    }))

return activeIncidents
```

---

## Bulk Operations

### Bulk Update

```typescript
function bulkUpdateIncidents(conditions: Record<string, any>, updateFields: Record<string, any>) {
    const incidents = new GlideQuery('incident')
        .where(q => {
            for (const field in conditions) {
                q.where(field, conditions[field])
            }
            return q
        })
        .select()

    let updateCount = 0
    for (const incident of incidents) {
        Object.assign(incident, updateFields)
        incident.update()
        updateCount++
    }

    return updateCount
}

// Usage:
const updated = bulkUpdateIncidents(
    { state: 'in_progress', priority: '1' },
    { assignment_group: 'Critical Support', escalation_level: '1' }
)
```

### Bulk Delete

```typescript
const incidents = new GlideQuery('incident')
    .where('state', 'closed')
    .where('closed_on', '<', '2024-01-01')
    .limit(1000)
    .select()

let deleteCount = 0
for (const incident of incidents) {
    incident.delete()
    deleteCount++
}

return deleteCount
```

---

## Complex Filtering

### Complex Conditions with Nesting

```typescript
const incidents = new GlideQuery('incident')
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

```typescript
const incidents = new GlideQuery('incident')
    .where('short_description', 'like', '%network%')
    .orWhere('description', 'like', '%network%')
    .select()
```

### Range Queries

```typescript
const incidents = new GlideQuery('incident')
    .where('created_on', '>=', '2024-01-01')
    .where('created_on', '<', '2024-12-31')
    .where('priority', '<=', '2')
    .select()
```

---

## Best Practices

✓ **Type-safe access** - Use `incident.number` instead of `getValue()`
✓ **Use select()** - To execute and get array of records
✓ **Use selectOne()** - For single record retrieval
✓ **Chainable API** - Reduce boilerplate with method chaining
✓ **Better error handling** - TypeScript catches type errors at compile time
✓ **Modern JavaScript** - Use async/await patterns where applicable
✓ **Array methods** - Leverage `map()`, `filter()`, `reduce()` for transformations
✓ **Limit results** - Use `limit()` to restrict large result sets
✓ **Avoid nested loops** - Use array methods instead of imperative loops
✓ **Reference fields** - Type-safe access to display_value and other properties

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
| `create(data)` | Create new record object |
| `update()` | Save changes to record |
| `insert()` | Persist new record |
| `delete()` | Remove record |
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
