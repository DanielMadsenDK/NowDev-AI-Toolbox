# Best Practices — Manipulate Data

## GlideRecord vs GlideQuery Decision Matrix

| Feature | GlideRecord | GlideQuery |
|---------|-------------|-----------|
| Syntax | Procedural | Fluent/Chained |
| Sorting | orderBy() | orderBy() |
| Grouping | addAggregate() | N/A |
| Loops | while (gr.next()) | Array iteration |
| Complex filtering | Multiple addQuery() | where() chains |
| Maturity | Stable, battle-tested | Newer, modern API |
| Performance | Comparable | Comparable |

**Recommendation**: Use `GlideQuery` for new code, maintain `GlideRecord` for existing

## Query Performance Optimization

### 1. Use `setLimit()` for Existence Checks
```javascript
// ✗ SLOW - iterates all records and counts
var assignedIncidentGr = new GlideRecord('incident');
assignedIncidentGr.addQuery('assigned_to', gs.getUserID());
assignedIncidentGr.query();
var count = 0;
while (assignedIncidentGr.next()) count++;
if (count > 0) { /* has records */ }

// ✓ FAST - just checks if exists
var assignedIncidentGr = new GlideRecord('incident');
assignedIncidentGr.addQuery('assigned_to', gs.getUserID());
assignedIncidentGr.setLimit(1);
assignedIncidentGr.query();
if (assignedIncidentGr.getRowCount() > 0) { /* has records */ }
```

### 2. Avoid Dot-Walking in Loops
```javascript
// ✗ SLOW - dot-walk per iteration (N+1 problem)
var incidentGr = new GlideRecord('incident');
incidentGr.query();
while (incidentGr.next()) {
    var assignedUser = incidentGr.assigned_to.name; // Lookups assignment
    var callerUser = incidentGr.caller_id.name;     // Lookups caller
}

// ✓ FASTER - join or separate queries
var joinedIncidentGr = new GlideRecord('incident');
joinedIncidentGr.addJoinQuery('sys_user', 'assigned_to', 'sys_id');
joinedIncidentGr.query();
while (joinedIncidentGr.next()) {
    var name = joinedIncidentGr.assigned_to.name; // Already joined
}
```

### 3. Use `addEncodedQuery()` for Complex Filters
```javascript
// ✗ HARD TO READ - multiple addQuery() calls
var incidentGr = new GlideRecord('incident');
incidentGr.addQuery('priority', '<=', 2);
incidentGr.addQuery('state', 'IN', 'open,assigned,new');
incidentGr.addQuery('assigned_to', 'NOT EMPTY');

// ✓ CLEANER - copy from list view
var incidentGr = new GlideRecord('incident');
// Copy encoded query from list view:
incidentGr.addEncodedQuery('priority<=2^stateIN open,assigned,new^assigned_toISNOTEMPTY');
incidentGr.query();
```

## Aggregate Operations

### Counting Records
```javascript
// ✗ SLOW - counts in code
var openIncidentGr = new GlideRecord('incident');
openIncidentGr.addQuery('state', 'open');
openIncidentGr.query();
var count = 0;
while (openIncidentGr.next()) count++;

// ✓ FAST - database does the work
var agg = new GlideAggregate('incident');
agg.addQuery('state', 'open');
agg.addAggregate('COUNT');
agg.query();
var count = 0;
if (agg.next()) {
    count = agg.getAggregate('COUNT');
}
```

### Multiple Aggregations
```javascript
var agg = new GlideAggregate('incident');
agg.addQuery('state', 'open');
agg.addAggregate('COUNT'); // Count records
agg.addAggregate('SUM', 'time_worked'); // Total hours
agg.addAggregate('AVG', 'priority'); // Average priority
agg.addAggregate('MAX', 'created_on'); // Latest creation
agg.query();

if (agg.next()) {
    var total = agg.getAggregate('COUNT');
    var hours = agg.getAggregate('SUM');
    var avgPri = agg.getAggregate('AVG');
    var latest = agg.getAggregate('MAX');
}
```

### Grouping with Aggregates
```javascript
var agg = new GlideAggregate('incident');
agg.groupBy('assigned_to');
agg.addAggregate('COUNT');
agg.query();

while (agg.next()) {
    var user = agg.getValue('assigned_to');
    var count = agg.getAggregate('COUNT');
    gs.info(user + ': ' + count + ' incidents');
}
```

## Secure Data Access

### GlideRecordSecure with ACLs
```javascript
// Standard - ignores ACLs
var incidentGr = new GlideRecord('incident');
incidentGr.query();
// Returns ALL incidents, regardless of user permissions

// Secure - respects ACLs
var grSecure = new GlideRecordSecure('incident');
grSecure.query();
// Returns only incidents user can read

// Enforce in code
var canCreate = grSecure.canCreate();
var canRead = grSecure.canRead();
if (canRead) {
    var value = grSecure.getValue('description');
}
```

## Write Operations

### Insert Pattern
```javascript
function createIncident(shortDescription, priority) {
    var incidentGr = new GlideRecord('incident');
    incidentGr.initialize(); // Initialize with defaults
    incidentGr.short_description = shortDescription;
    incidentGr.priority = priority;
    incidentGr.caller_id = gs.getUserID();
    
    try {
        return incidentGr.insert(); // Returns sys_id
    } catch (e) {
        gs.error('Insert failed: ' + e.getMessage());
        return null;
    }
}
```

### Update Pattern
```javascript
function updateIncident(incidentId, newState) {
    var incidentGr = new GlideRecord('incident');
    if (incidentGr.get(incidentId)) {
        incidentGr.state = newState;
        incidentGr.updated_by = gs.getUserID();
        
        try {
            incidentGr.update();
            return true;
        } catch (e) {
            gs.error('Update failed: ' + e.getMessage());
            return false;
        }
    }
    return false;
}
```

### Batch Operations
```javascript
// Batch insert
function batchInsertIncidents(incidents) {
    var insertedIds = [];
    
    for (var i = 0; i < incidents.length; i++) {
        var incidentGr = new GlideRecord('incident');
        incidentGr.short_description = incidents[i].description;
        incidentGr.priority = incidents[i].priority;
        
        var id = incidentGr.insert();
        if (id) {
            insertedIds.push(id);
        }
    }
    
    return insertedIds;
}
```

## Field Value Access

### getValue vs dot-notation
```javascript
// ✗ Dot notation - may trigger lookups
var name = gr.assigned_to.name;

// ✓ getValue - gets pre-loaded value
var name = gr.getDisplayValue('assigned_to');

// ✓ getValue for internal value
var userId = gr.getValue('assigned_to');

// Get element with metadata
var element = gr.getElement('priority');
var dataType = element.getED().getInternalType();
```

## GlideElement Operations

### Custom Logic on Fields
```javascript
var incidentGr = new GlideRecord('incident');
incidentGr.query();

while (incidentGr.next()) {
    var priorityElement = incidentGr.getElement('priority');
    
    // Check field properties
    if (priorityElement.canCreate()) {
        // Process field
    }
    
    // Get field metadata
    var fieldType = priorityElement.getED().getInternalType();
    var maxLength = priorityElement.getED().getMaxLength();
}
```

## Caching Strategies

### Script Include Cache
```javascript
// Cache lookup results
function getUserDepartment(userId) {
    var departmentCache = {};
    
    if (departmentCache[userId]) {
        return departmentCache[userId];
    }
    
    var user = new GlideRecord('sys_user');
    if (user.get(userId)) {
        departmentCache[userId] = user.getValue('department');
        return departmentCache[userId];
    }
    
    return null;
}
```

### Avoid N+1 Queries
```javascript
// ✗ N+1 PROBLEM - query in loop
var incidents = new GlideRecord('incident');
incidents.query();

while (incidents.next()) {
    var serverGr = new GlideRecord('cmdb_ci_server');
    serverGr.get(incidents.cmdb_ci);  // Additional query per iteration!
}

// ✓ SOLUTION - fetch all at once
var serverIds = [];
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
    serverIds.push(incidents.getValue('cmdb_ci'));
}

// Now query all servers once
var servers = new GlideRecord('cmdb_ci_server');
servers.addQuery('sys_id', 'IN', serverIds.join(','));
servers.query();
```
