# Classic GlideRecord Queries

Patterns for querying, inserting, updating, and deleting records using traditional GlideRecord API.

## Table of Contents

1. [Simple Queries](#simple-queries)
2. [Record Operations](#record-operations)
3. [Data Aggregation](#data-aggregation)
4. [Bulk Operations](#bulk-operations)
5. [Complex Filtering](#complex-filtering)
6. [Best Practices](#best-practices)

---

## Simple Queries

### Query with Conditions

```javascript
var incident = new GlideRecord('incident');
incident.addQuery('active', 'true');
incident.addQuery('priority', '1');
incident.setLimit(10);
incident.orderByDesc('created_on');
incident.query();

var results = [];
while (incident.next()) {
    results.push({
        number: incident.getValue('number'),
        short_description: incident.getValue('short_description'),
        priority: incident.getValue('priority')
    });
}

return results;
```

### Multiple Conditions with OR Logic

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('active', 'true');
gr.addQuery('state', '!=', 'closed');
gr.addOrCondition('priority', '1');
gr.addOrCondition('priority', '2');
gr.orderBy('priority');
gr.query();

var count = 0;
while (gr.next()) {
    count++;
    // Process record
}

return count;
```

### Get Single Record by ID

```javascript
var incident = new GlideRecord('incident');
if (incident.get('INC0010001')) {
    var details = {
        number: incident.getValue('number'),
        caller: incident.getDisplayValue('caller_id'),
        state: incident.getValue('state'),
        created: incident.getValue('created_on')
    };
    return details;
} else {
    return null;
}
```

---

## Record Operations

### Insert Record

```javascript
var incident = new GlideRecord('incident');
incident.initialize();
incident.short_description = 'New incident';
incident.description = 'Detailed description';
incident.category = 'software';
incident.priority = '3';

var newId = incident.insert();
return newId;
```

### Update Record

```javascript
var incident = new GlideRecord('incident');
if (incident.get(incidentId)) {
    incident.short_description = 'Updated description';
    incident.priority = '2';
    incident.assignment_group = groupId;
    incident.update();
    return true;
}
return false;
```

### Delete Record

```javascript
var incident = new GlideRecord('incident');
if (incident.get(incidentId)) {
    incident.deleteRecord();
    return true;
}
return false;
```

---

## Data Aggregation

### Count by Field

```javascript
var stats = {};
var gr = new GlideRecord('incident');
gr.query();

while (gr.next()) {
    var priority = gr.getValue('priority');
    stats[priority] = (stats[priority] || 0) + 1;
}

return stats;
// Returns: { '1': 5, '2': 12, '3': 28, '4': 15 }
```

### Sum Values

```javascript
var total = 0;
var gr = new GlideRecord('incident');
gr.addQuery('state', 'resolved');
gr.query();

while (gr.next()) {
    var timeWorked = gr.getValue('time_worked');
    total += parseInt(timeWorked) || 0;
}

return total;
```

### Using GlideAggregate (Recommended for Performance)

```javascript
var agg = new GlideAggregate('incident');
agg.addQuery('state', 'resolved');
agg.addAggregate('COUNT');
agg.addAggregate('SUM', 'time_worked');
agg.query();

var stats = {};
if (agg.next()) {
    stats.count = agg.getAggregate('COUNT');
    stats.total = agg.getAggregate('SUM');
}

return stats;
```

---

## Bulk Operations

### Bulk Update

```javascript
function bulkUpdateIncidents(conditions, updateFields) {
    var gr = new GlideRecord('incident');

    // Add conditions
    for (var field in conditions) {
        gr.addQuery(field, conditions[field]);
    }

    gr.query();

    var updateCount = 0;
    while (gr.next()) {
        // Apply updates
        for (var field in updateFields) {
            gr.setValue(field, updateFields[field]);
        }

        gr.update();
        updateCount++;
    }

    return updateCount;
}

// Usage:
var updated = bulkUpdateIncidents(
    { state: 'in_progress', priority: '1' },
    { assignment_group: 'Critical Support', escalation_level: '1' }
);
```

### Bulk Delete

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('state', 'closed');
gr.addQuery('closed_on', '<', '2024-01-01');
gr.setLimit(1000);
gr.query();

var deleteCount = 0;
while (gr.next()) {
    gr.deleteRecord();
    deleteCount++;
}

return deleteCount;
```

---

## Complex Filtering

### NOT Condition

```javascript
var gr = new GlideRecord('incident');
var query = gr.addQuery('active', 'true');
query.addCondition('state', '!=', 'closed');
query.addCondition('state', '!=', 'resolved');
gr.query();
```

### IN Operator

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('priority', 'IN', '1,2,3');
gr.addQuery('state', 'IN', 'new,in_progress');
gr.query();
```

### Using Encoded Queries

```javascript
var gr = new GlideRecord('incident');
gr.addEncodedQuery('activeISfalse^priority=1^ORpriority=2');
gr.query();
```

---

## Best Practices

✓ **Check validity** - Always verify record exists after `get()` or `next()`
✓ **Use getValue()** - More performant than dot-walking for field access
✓ **Use getDisplayValue()** - For reference fields that need human-readable names
✓ **Always query first** - Call `query()` before iterating with `next()`
✓ **Use setLimit()** - Restrict result sets for large datasets
✓ **Use GlideAggregate** - Never count/sum by iterating records manually
✓ **Use GlideRecordSecure** - When ACL enforcement matters
✓ **Copy encoded queries** - From ServiceNow list views for complex filters
✓ **Test on sub-production** - Always validate queries before production use
✓ **Avoid nested loops** - Refactor query-within-loop into joins or separate queries

---

## Key APIs

| Method | Purpose |
|--------|---------|
| `addQuery(field, value)` | Add AND condition |
| `addOrCondition(field, value)` | Add OR condition |
| `addEncodedQuery(query)` | Complex query from list view |
| `orderBy(field)` | Sort ascending |
| `orderByDesc(field)` | Sort descending |
| `setLimit(count)` | Limit result set |
| `query()` | Execute query |
| `next()` | Move to next record |
| `getValue(field)` | Get field value |
| `getDisplayValue(field)` | Get reference display value |
| `update()` | Save changes |
| `insert()` | Create new record |
| `deleteRecord()` | Delete record |
| `initialize()` | Prepare new record |
| `get(sysId)` | Retrieve specific record |

---

## When to Use Classic GlideRecord

- ✓ Existing instance scripts and workflows
- ✓ Legacy codebases you're maintaining
- ✓ Quick scripting and fixes
- ✓ Complex queries with multiple conditions
- ✓ ACL-enforced queries with GlideRecordSecure
- ✓ Business rules and server-side scripts
- ✓ When you need to maximize compatibility

For modern TypeScript-based applications, see [FLUENT.md](FLUENT.md) for the newer GlideQuery API.
