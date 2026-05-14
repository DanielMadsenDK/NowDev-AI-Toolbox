# Classic Script Includes & Server Logic

Patterns for server-side JavaScript Script Includes, utility functions, and system operations.

## Table of Contents

1. [Script Include Patterns](#script-include-patterns)
2. [Utility Functions](#utility-functions)
3. [Database Operations](#database-operations)
4. [System Operations](#system-operations)
5. [Logging & Error Handling](#logging--error-handling)
6. [Best Practices](#best-practices)

---

## Script Include Patterns

### Class-Based Script Include (Standard)

```javascript
var IncidentUtils = Class.create();
IncidentUtils.prototype = {
    /**
     * Constructor - initialize logger
     */
    initialize: function() {
        this.logger = gs.getLogger();
        this.tableName = 'incident';
    },

    /**
     * Get incident count by state
     * @param {string} state - Incident state
     * @return {number} Count of incidents
     */
    getIncidentCount: function(state) {
        var incidentGr = new GlideRecord(this.tableName);
        incidentGr.addQuery('state', state);
        incidentGr.query();

        var count = incidentGr.getRowCount();
        this.logger.info('Found ' + count + ' incidents in state: ' + state);

        return count;
    },

    /**
     * Create incident
     * @param {object} fields - Object with field values
     * @return {string} New incident sys_id
     */
    createIncident: function(fields) {
        try {
            var newIncidentGr = new GlideRecord(this.tableName);
            newIncidentGr.initialize();

            // Set fields from object
            for (var field in fields) {
                newIncidentGr.setValue(field, fields[field]);
            }

            var newId = newIncidentGr.insert();
            this.logger.info('Incident created: ' + newId);

            return newId;
        } catch (error) {
            this.logger.error('Error creating incident: ' + error.message);
            return null;
        }
    },

    /**
     * Get incident by number
     * @param {string} number - Incident number
     * @return {object} Incident data or null
     */
    getIncidentByNumber: function(number) {
        var incidentGr = new GlideRecord(this.tableName);
        if (incidentGr.get('number', number)) {
            return {
                sys_id: incidentGr.sys_id.toString(),
                number: incidentGr.number.toString(),
                short_description: incidentGr.short_description.toString(),
                state: incidentGr.state.toString(),
                priority: incidentGr.priority.toString()
            };
        }
        return null;
    },

    type: 'IncidentUtils'
};
```

### Function-Based Script Include (Simple Utilities)

```javascript
/**
 * Utility functions for working with users
 */

function getUserByEmail(email) {
    var userGr = new GlideRecord('sys_user');
    userGr.addQuery('email', email);
    userGr.setLimit(1);
    userGr.query();

    if (userGr.next()) {
        return {
            sys_id: userGr.sys_id.toString(),
            name: userGr.name.toString(),
            email: userGr.email.toString(),
            active: userGr.active.toString()
        };
    }
    return null;
}

function getUsersInGroup(groupId) {
    var users = [];
    var memberGr = new GlideRecord('sys_user_grmember');
    memberGr.addQuery('group', groupId);
    memberGr.query();

    while (memberGr.next()) {
        users.push({
            sys_id: memberGr.user.sys_id.toString(),
            name: memberGr.user.name.toString(),
            email: memberGr.user.email.toString()
        });
    }

    return users;
}

function getGroupByName(groupName) {
    var groupGr = new GlideRecord('sys_user_group');
    groupGr.addQuery('name', groupName);
    groupGr.setLimit(1);
    groupGr.query();

    if (groupGr.next()) {
        return {
            sys_id: groupGr.sys_id.toString(),
            name: groupGr.name.toString(),
            manager: groupGr.manager.getDisplayValue()
        };
    }
    return null;
}
```

---

## Utility Functions

### String & Data Formatting

```javascript
/**
 * Format date for display
 */
function formatDate(dateValue) {
    if (!dateValue) return '';
    var dt = new GlideDateTime(dateValue);
    return dt.getValue(); // returns 'yyyy-MM-dd HH:mm:ss' in UTC
}

/**
 * Truncate string to max length
 */
function truncateString(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Convert object to JSON safely
 */
function objectToJson(obj) {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        gs.warn('Error converting object to JSON: ' + error.message);
        return '{}';
    }
}

/**
 * Parse JSON safely
 */
function parseJson(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        gs.warn('Error parsing JSON: ' + error.message);
        return null;
    }
}
```

### Email Utilities

```javascript
/**
 * Send email using gs.eventQueue (recommended approach)
 * Register a notification in ServiceNow tied to the event name.
 */
function sendEmailViaEvent(record, toAddress, context) {
    gs.eventQueue('custom.send_email', record, toAddress, context);
}

/**
 * Send email directly (for use in mail script or notification context)
 */
function sendEmail(toAddress, subject, body) {
    try {
        var outboundEmail = new GlideEmailOutbound();
        outboundEmail.addAddress('to', toAddress);
        outboundEmail.setSubject(subject);
        outboundEmail.setBody(body);
        outboundEmail.setFrom(gs.getProperty('glide.system.from.email', 'noreply@company.com'));
        return true;
    } catch (error) {
        gs.error('Error sending email: ' + error.message);
        return false;
    }
}

/**
 * Send email to group members via events
 */
function sendEmailToGroup(groupId, subject, body) {
    var memberGr = new GlideRecord('sys_user_grmember');
    memberGr.addQuery('group', groupId);
    memberGr.query();

    var sendCount = 0;
    while (memberGr.next()) {
        var memberEmail = memberGr.user.email.toString();
        if (sendEmail(memberEmail, subject, body)) {
            sendCount++;
        }
    }

    gs.info('Emails sent to ' + sendCount + ' group members');
    return sendCount;
}
```

---

## Database Operations

### Safe Query Patterns

```javascript
/**
 * Query with limit and offset for pagination
 */
function queryWithPagination(tableName, pageNum, pageSize) {
    var paginatedGr = new GlideRecord(tableName);
    paginatedGr.addActiveQuery();  // Only active records
    paginatedGr.addQuery('state', '!=', 'deleted');
    paginatedGr.orderByDesc('created_on');

    var offset = (pageNum - 1) * pageSize;
    paginatedGr.setLimit(pageSize);
    var query = paginatedGr.query();

    // Skip to offset
    for (var i = 0; i < offset && paginatedGr.next(); i++) {
        // Skip rows
    }

    var results = [];
    while (paginatedGr.next()) {
        results.push({
            sys_id: paginatedGr.sys_id.toString(),
            number: paginatedGr.getValue('number')
        });
    }

    return results;
}

/**
 * Count records safely
 */
function countRecords(tableName, query) {
    var countGr = new GlideRecord(tableName);

    // Add query conditions if provided
    if (query) {
        for (var field in query) {
            countGr.addQuery(field, query[field]);
        }
    }

    countGr.query();
    return countGr.getRowCount();
}

/**
 * Bulk update with error handling
 */
function bulkUpdate(tableName, query, updateFields) {
    var bulkGr = new GlideRecord(tableName);

    // Add query conditions
    for (var field in query) {
        bulkGr.addQuery(field, query[field]);
    }

    bulkGr.query();

    var updateCount = 0;
    var errorCount = 0;

    while (bulkGr.next()) {
        try {
            // Apply updates
            for (var field in updateFields) {
                bulkGr.setValue(field, updateFields[field]);
            }

            bulkGr.update();
            updateCount++;
        } catch (error) {
            gs.error('Error updating record: ' + error.message);
            errorCount++;
        }
    }

    gs.info('Bulk update complete: ' + updateCount + ' updated, ' + errorCount + ' errors');
    return {
        updated: updateCount,
        errors: errorCount
    };
}
```

---

## System Operations

### Logging

```javascript
/**
 * Logger wrapper for consistent logging
 */
var Logger = Class.create();
Logger.prototype = {
    initialize: function(moduleName) {
        this.moduleName = moduleName;
        this.logger = gs.getLogger();
    },

    debug: function(message) {
        this.logger.debug('[' + this.moduleName + '] ' + message);
    },

    info: function(message) {
        this.logger.info('[' + this.moduleName + '] ' + message);
    },

    warn: function(message) {
        this.logger.warn('[' + this.moduleName + '] ' + message);
    },

    error: function(message, error) {
        var msg = '[' + this.moduleName + '] ' + message;
        if (error) {
            msg += ' - Error: ' + error.message;
        }
        this.logger.error(msg);
    },

    type: 'Logger'
};
```

### User & Session Management

```javascript
/**
 * Get current user information
 */
function getCurrentUser() {
    var user = gs.getUser();
    return {
        sys_id: user.getID(),
        name: user.getName(),
        email: user.getEmail(),
        roles: user.getRoles(),
        isAdmin: user.hasRole('admin')
    };
}

/**
 * Check if user has role
 */
function userHasRole(userId, roleName) {
    var userRoleGr = new GlideRecord('sys_user_has_role');
    userRoleGr.addQuery('user', userId);
    userRoleGr.addQuery('role.name', roleName);
    userRoleGr.query();
    return userRoleGr.hasNext();
}

/**
 * Get user preferences
 */
function getUserPreference(key) {
    var user = gs.getUser();
    var raw = user.getPreference('x_app.' + key);
    return raw ? JSON.parse(raw) : null;
}

/**
 * Save user preference
 */
function saveUserPreference(key, value) {
    var user = gs.getUser();
    user.savePreference('x_app.' + key, JSON.stringify(value));
}
```

### Event Publishing

```javascript
/**
 * Queue business event
 */
function publishEvent(eventName, record, data) {
    try {
        var eventData = {
            name: eventName,
            record: record.getTableName(),
            record_id: record.sys_id.toString(),
            timestamp: new GlideDateTime().toString()
        };

        // Add custom data
        if (data) {
            eventData.data = data;
        }

        gs.eventQueue(eventName, record, null, JSON.stringify(eventData));
        gs.info('Event published: ' + eventName);

        return true;
    } catch (error) {
        gs.error('Error publishing event: ' + error.message);
        return false;
    }
}
```

---

## Logging & Error Handling

### Audit Trail

```javascript
/**
 * Log audit trail
 */
function logAuditTrail(action, details) {
    try {
        var audit = new GlideRecord('incident_update');
        audit.initialize();
        audit.incident = details.record_id;
        audit.update_type = action;
        audit.comments = details.description || '';
        audit.user = gs.getUserID();

        var auditId = audit.insert();
        gs.info('Audit trail created: ' + auditId);

        return auditId;
    } catch (error) {
        gs.error('Error creating audit trail: ' + error.message);
        return null;
    }
}
```

---

## Best Practices

✓ **Use Class.create()** for complex utilities with state
✓ **Use functions for simple utilities** to avoid instantiation overhead
✓ **Always wrap try-catch** around database operations
✓ **Use descriptive names** (`grIncident` for GlideRecord variables)
✓ **Log important operations** for audit and debugging
✓ **Return meaningful data** from functions (objects, not just strings)
✓ **Use setLimit()** on queries to prevent performance issues
✓ **Avoid getXMLWait()** - always use async alternatives
✓ **Use GlideScopedEvaluator** for dynamic script evaluation
✓ **Prefix user preferences** with scope to avoid collisions
✓ **Document parameters and return values** with JSDoc comments
✓ **Test on sub-production first** before production deployment

---

## Key APIs

| API | Purpose |
|-----|---------|
| `Class.create()` | Define class-based script include |
| `gs.getLogger()` | Get system logger |
| `gs.getUserID()` | Get current user sys_id |
| `gs.getUser()` | Get current user object |
| `gs.eventQueue()` | Queue business event |
| `gs.getProperty()` | Get system property |
| `gs.info()` / `gs.error()` | Logging |
| `GlideScopedEvaluator` | Safe script evaluation |
| `GlideImpersonate` | Context switching (admin) |

---

## When to Use Classic Script Includes

- ✓ Existing ServiceNow instances
- ✓ Reusable server-side utilities
- ✓ Business logic not tied to specific features
- ✓ Database operations and queries
- ✓ System-level operations
- ✓ Maximum compatibility

For SDK-based projects, see [FLUENT.md](FLUENT.md) for TypeScript patterns.
