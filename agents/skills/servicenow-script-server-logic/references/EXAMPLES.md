# Script Server Logic - Code Examples

Quick reference guide for creating server-side Script Includes and utilities. This page provides navigation to detailed pattern references organized by approach.

## Table of Contents

- [Choose Your Approach](#choose-your-approach)
- [Script Include Types](#script-include-types)
- [Pattern Coverage](#pattern-coverage)
- [Quick Decision Guide](#quick-decision-guide)
- [Key Differences at a Glance](#key-differences-at-a-glance)
- [See Also](#see-also)
- [Class-Based Script Include](#class-based-script-include)
- [Utility Functions Library](#utility-functions-library)
- [Database Query Utilities](#database-query-utilities)
- [Incident Management Utilities](#incident-management-utilities)
- [Logging and Error Handling](#logging-and-error-handling)
- [Best Practices Demonstrated](#best-practices-demonstrated)
- [Usage Example](#usage-example)

---

## Choose Your Approach

### **[CLASSIC.md](CLASSIC.md) — Instance-Based Script Includes**
Use for direct ServiceNow instance customizations using Class.create() pattern.

**Quick example:**
```javascript
var IncidentUtils = Class.create();
IncidentUtils.prototype = {
    initialize: function() {
        this.logger = gs.getLogger();
    },
    getIncidentCount: function(state) {
        var gr = new GlideRecord('incident');
        gr.addQuery('state', state);
        gr.query();
        return gr.getRowCount();
    },
    type: 'IncidentUtils'
};
```

**When to use:**
- ✓ Existing ServiceNow instances
- ✓ Reusable utilities and functions
- ✓ Database operations
- ✓ System-level operations
- ✓ User and session management

---

### **[FLUENT.md](FLUENT.md) — SDK-Based Script Includes (.now.ts)**
Use for TypeScript projects with modern ES6 class syntax.

**Quick example:**
```typescript
import { ScriptInclude } from '@servicenow/sdk/core'

export default ScriptInclude({
    $id: Now.ID['incident_utils'],
    name: 'IncidentUtils',
    apiName: 'x_my_app.IncidentUtils',
    script: class {
        getIncidentCount(state) {
            const gr = new GlideRecord('incident');
            gr.addQuery('state', state);
            gr.query();
            return gr.getRowCount();
        }
    }
})
```

**When to use:**
- ✓ New SDK projects
- ✓ TypeScript-based development
- ✓ Type-safe utilities
- ✓ Version control and Git
- ✓ Team knows TypeScript

---

## Script Include Types

| Type | Use Case | Best Approach |
|------|----------|---------------|
| **Class-based** | Complex utilities with state | Both |
| **Function-based** | Simple utilities | Classic |
| **Module-based** | Related functions grouped | Both |
| **Client-callable** | Expose to client scripts | Both |
| **Server-only** | Internal utilities | Both |

---

## Pattern Coverage

| Pattern | Classic | Fluent | Learn More |
|---------|---------|--------|------------|
| Script includes | ✓ | ✓ | See respective guide |
| Utility functions | ✓ | ✓ | See respective guide |
| Database operations | ✓ | ✓ | See respective guide |
| System operations | ✓ | ✓ | See respective guide |
| Logging | ✓ | ✓ | See respective guide |
| Type safety | - | ✓ | [FLUENT.md](FLUENT.md) |
| ES6+ syntax | - | ✓ | [FLUENT.md](FLUENT.md) |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | [FLUENT.md](FLUENT.md) |
| Do we use TypeScript? | Yes | [FLUENT.md](FLUENT.md) |
| Need version control? | Yes | [FLUENT.md](FLUENT.md) |
| Quick utility function? | Yes | [CLASSIC.md](CLASSIC.md) |

---

## Key Differences at a Glance

### Classic: Instance Script Include
```javascript
// Created directly in instance
var MyUtil = Class.create();
MyUtil.prototype = {
    initialize: function() {},
    doSomething: function(param) {
        return param + 1;
    },
    type: 'MyUtil'
};
```

### Fluent: SDK Script Include
```typescript
// Version-controlled .now.ts file
import { ScriptInclude } from '@servicenow/sdk/core'

export default ScriptInclude({
    $id: Now.ID['my_util'],
    name: 'MyUtil',
    apiName: 'x_my_app.MyUtil',
    script: class {
        doSomething(param) {
            return param + 1;
        }
    }
})
```

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Advanced patterns and debugging
- **[CLASSIC.md](CLASSIC.md)** — Full reference for Class.create() patterns
- **[FLUENT.md](FLUENT.md)** — Full reference for SDK Script Includes

---

## Class-Based Script Include

**File:** `my-script-include.now.ts`

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'
import { MyScriptInclude } from '../server/MyScriptInclude.server.js'

export default ScriptInclude({
    $id: Now.ID['my_script_include'],
    name: 'MyScriptInclude',
    description: 'Example script include for incident management utilities',
    active: true,
    apiName: 'x_ai_toolbox.MyScriptInclude',
    client_callable: false,
    script: MyScriptInclude,
})
```

**File:** `MyScriptInclude.server.js`

```javascript
var MyScriptInclude = Class.create();
MyScriptInclude.prototype = {
    /**
     * Constructor - called when script include is instantiated
     */
    initialize: function () {
        this.logger = gs.getLogger();
    },

    /**
     * Calculate incident severity based on priority and impact
     * @param {string} priority - Priority level (1-4)
     * @param {string} impact - Impact level (1-4)
     * @return {string} Severity level (critical, high, medium, low)
     */
    calculateSeverity: function (priority, impact) {
        try {
            var priorityVal = parseInt(priority) || 3;
            var impactVal = parseInt(impact) || 3;

            if (priorityVal === 1 && impactVal === 1) {
                return 'critical';
            } else if (priorityVal <= 2 || impactVal <= 2) {
                return 'high';
            } else if (priorityVal <= 3 || impactVal <= 3) {
                return 'medium';
            } else {
                return 'low';
            }
        } catch (error) {
            gs.error('Error calculating severity: ' + error.message);
            return 'unknown';
        }
    },

    /**
     * Validate incident before assignment
     * @param {string} incidentId - Sys ID of incident
     * @return {object} Validation result {valid: boolean, errors: []}
     */
    validateIncident: function (incidentId) {
        var incident = new GlideRecord('incident');
        if (!incident.get(incidentId)) {
            return {
                valid: false,
                message: 'Incident not found'
            };
        }

        var errors = [];

        // Check mandatory fields
        if (!incident.short_description || incident.short_description.length < 10) {
            errors.push('Short description must be at least 10 characters');
        }

        if (!incident.category) {
            errors.push('Category is mandatory');
        }

        if (!incident.assignment_group) {
            errors.push('Assignment group is mandatory');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Auto-assign incident to appropriate team
     * @param {string} incidentId - Sys ID of incident
     * @return {boolean} Success status
     */
    autoAssignIncident: function (incidentId) {
        try {
            var incident = new GlideRecord('incident');
            if (!incident.get(incidentId)) {
                return false;
            }

            var category = incident.category.toString();
            var groupName = '';

            // Assign based on category
            if (category === 'software') {
                groupName = 'Software Support';
            } else if (category === 'hardware') {
                groupName = 'Hardware Support';
            } else if (category === 'network') {
                groupName = 'Network Support';
            } else {
                groupName = 'General Support';
            }

            // Get the assignment group
            var group = new GlideRecord('sys_user_group');
            group.addQuery('name', groupName);
            group.query();

            if (group.next()) {
                incident.assignment_group = group.sys_id;
                incident.update();
                return true;
            }

            return false;
        } catch (error) {
            gs.error('Error auto-assigning incident: ' + error.message);
            return false;
        }
    },

    /**
     * Get incident statistics for a time period
     * @param {number} daysBack - Number of days to look back
     * @return {object} Statistics object
     */
    getIncidentStats: function (daysBack) {
        try {
            var days = daysBack || 30;
            var cutoffDate = GlideDateTime.subtract(GlideDateTime.now(), days * 24 * 60 * 60 * 1000);

            var incident = new GlideRecord('incident');
            incident.addQuery('created_on', '>=', cutoffDate);

            var stats = {
                total: 0,
                byPriority: {},
                byState: {},
                avgResolutionTime: 0
            };

            var totalResTime = 0;
            var resolvedCount = 0;

            incident.query();
            while (incident.next()) {
                stats.total++;

                var priority = incident.priority.toString();
                stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

                var state = incident.state.toString();
                stats.byState[state] = (stats.byState[state] || 0) + 1;

                if (incident.resolved_at && incident.created_on) {
                    var resTime = GlideDateTime.subtract(
                        incident.resolved_at,
                        incident.created_on
                    );
                    totalResTime += resTime;
                    resolvedCount++;
                }
            }

            if (resolvedCount > 0) {
                stats.avgResolutionTime = Math.round(totalResTime / resolvedCount / 3600000); // Convert to hours
            }

            return stats;
        } catch (error) {
            gs.error('Error getting incident stats: ' + error.message);
            return null;
        }
    },

    /**
     * Type for reference
     */
    type: 'MyScriptInclude'
};
```

---

## Utility Functions Library

**File:** `utility-functions.server.js`

```javascript
/**
 * Utility functions for common ServiceNow operations
 */

/**
 * Get user by email
 */
function getUserByEmail(email) {
    var user = new GlideRecord('sys_user');
    user.addQuery('email', email);
    user.query();

    return user.next() ? user.getUniqueValue() : null;
}

/**
 * Get group by name
 */
function getGroupByName(groupName) {
    var group = new GlideRecord('sys_user_group');
    group.addQuery('name', groupName);
    group.query();

    return group.next() ? group.getUniqueValue() : null;
}

/**
 * Send email notification
 */
function sendEmailNotification(toEmail, subject, body) {
    try {
        var email = new GlideEmailOutbound();
        email.setTo(toEmail);
        email.setSubject(subject);
        email.setBody(body);
        email.send();
        return true;
    } catch (error) {
        gs.error('Error sending email: ' + error.message);
        return false;
    }
}

/**
 * Format date for display
 */
function formatDate(dateStr, format) {
    if (!dateStr) {
        return '';
    }

    var dt = new GlideDateTime(dateStr);
    return dt.format(format || 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Calculate days between dates
 */
function daysBetween(date1, date2) {
    var d1 = new GlideDateTime(date1);
    var d2 = new GlideDateTime(date2);
    var diff = Math.abs(d2.getNumericValue() - d1.getNumericValue());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if user has role
 */
function userHasRole(userId, roleName) {
    var userRole = new GlideRecord('sys_user_has_role');
    userRole.addQuery('user', userId);
    userRole.addQuery('role.name', roleName);
    userRole.query();

    return userRole.getRowCount() > 0;
}

/**
 * Get current user info
 */
function getCurrentUserInfo() {
    var user = new GlideRecord('sys_user');
    user.get(gs.getUserID());

    return {
        id: user.getUniqueValue(),
        name: user.getValue('name'),
        email: user.getValue('email'),
        department: user.getValue('department')
    };
}

/**
 * Log custom message with context
 */
function logWithContext(message, level) {
    var logger = gs.getLogger();
    level = level || 'info';

    var contextMsg = '[' + new Date().toISOString() + '] ' + message;

    if (level === 'error') {
        logger.error(contextMsg);
    } else if (level === 'warn') {
        logger.warn(contextMsg);
    } else {
        logger.info(contextMsg);
    }
}
```

---

## Database Query Utilities

**File:** `query-utilities.server.js`

```javascript
/**
 * Safe GlideRecord query with error handling
 */
function safeQuery(tableName, conditions) {
    try {
        var gr = new GlideRecord(tableName);

        // Add conditions
        if (conditions && typeof conditions === 'object') {
            for (var field in conditions) {
                gr.addQuery(field, conditions[field]);
            }
        }

        gr.query();
        return gr;
    } catch (error) {
        gs.error('Query error on ' + tableName + ': ' + error.message);
        return null;
    }
}

/**
 * Count records matching criteria
 */
function countRecords(tableName, conditions) {
    var gr = safeQuery(tableName, conditions);
    return gr ? gr.getRowCount() : 0;
}

/**
 * Get field values aggregated by group
 */
function aggregateByField(tableName, groupByField, aggregateField) {
    try {
        var result = {};
        var gr = new GlideRecord(tableName);

        // Get distinct values
        var distinctValues = {};
        gr.query();

        while (gr.next()) {
            var key = gr.getValue(groupByField);
            if (!distinctValues[key]) {
                distinctValues[key] = [];
            }
            distinctValues[key].push(gr.getValue(aggregateField));
        }

        // Calculate aggregates
        for (var key in distinctValues) {
            result[key] = distinctValues[key].length;
        }

        return result;
    } catch (error) {
        gs.error('Aggregation error: ' + error.message);
        return null;
    }
}

/**
 * Get paginated results
 */
function getPaginatedRecords(tableName, pageSize, pageNumber, sortField) {
    try {
        var gr = new GlideRecord(tableName);

        if (sortField) {
            gr.orderBy(sortField);
        } else {
            gr.orderByDesc('sys_created_on');
        }

        var offset = (pageNumber - 1) * pageSize;
        gr.setLimit(pageSize);
        gr.setStartRow(offset);
        gr.query();

        var records = [];
        while (gr.next()) {
            records.push({
                id: gr.getUniqueValue(),
                displayValue: gr.getDisplayValue()
            });
        }

        return {
            records: records,
            pageNumber: pageNumber,
            pageSize: pageSize,
            totalCount: gr.getRowCount() // Note: This is approximate
        };
    } catch (error) {
        gs.error('Pagination error: ' + error.message);
        return null;
    }
}

/**
 * Bulk update records
 */
function bulkUpdateRecords(tableName, conditions, updateFields) {
    try {
        var gr = new GlideRecord(tableName);

        // Add conditions
        if (conditions && typeof conditions === 'object') {
            for (var field in conditions) {
                gr.addQuery(field, conditions[field]);
            }
        }

        gr.query();

        var updateCount = 0;
        while (gr.next()) {
            // Apply updates
            if (updateFields && typeof updateFields === 'object') {
                for (var field in updateFields) {
                    gr.setValue(field, updateFields[field]);
                }
            }

            gr.update();
            updateCount++;
        }

        return updateCount;
    } catch (error) {
        gs.error('Bulk update error: ' + error.message);
        return 0;
    }
}
```

---

## Incident Management Utilities

**File:** `incident-utilities.server.js`

```javascript
/**
 * Incident-specific utility functions
 */

var IncidentUtils = Class.create();
IncidentUtils.prototype = {
    initialize: function () {
        this.logger = gs.getLogger();
    },

    /**
     * Create incident from external system
     */
    createIncident: function (data) {
        try {
            var incident = new GlideRecord('incident');
            incident.initialize();
            incident.short_description = data.short_description;
            incident.description = data.description || '';
            incident.category = data.category || 'general';
            incident.priority = data.priority || '3';
            incident.urgency = data.urgency || '3';
            incident.impact = data.impact || '3';
            incident.assignment_group = data.assignment_group || '';

            var incidentId = incident.insert();
            return {
                success: true,
                incidentId: incidentId,
                number: incident.getValue('number')
            };
        } catch (error) {
            this.logger.error('Error creating incident: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Escalate incident
     */
    escalateIncident: function (incidentId, escalationLevel) {
        try {
            var incident = new GlideRecord('incident');
            if (!incident.get(incidentId)) {
                return { success: false, error: 'Incident not found' };
            }

            incident.escalation_level = escalationLevel || '1';
            incident.escalated_on = new GlideDateTime().toString();
            incident.update();

            // Notify manager
            var group = new GlideRecord('sys_user_group');
            if (group.get(incident.assignment_group)) {
                var manager = group.manager.getDisplayValue();
                // Send notification...
            }

            return { success: true, escalationLevel: escalationLevel };
        } catch (error) {
            this.logger.error('Error escalating incident: ' + error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Close incident
     */
    closeIncident: function (incidentId, closeNotes) {
        try {
            var incident = new GlideRecord('incident');
            if (!incident.get(incidentId)) {
                return { success: false, error: 'Incident not found' };
            }

            incident.state = 'closed';
            incident.close_notes = closeNotes || '';
            incident.closed_on = new GlideDateTime().toString();
            incident.closed_by = gs.getUserID();
            incident.update();

            return { success: true, closedOn: incident.getValue('closed_on') };
        } catch (error) {
            this.logger.error('Error closing incident: ' + error.message);
            return { success: false, error: error.message };
        }
    },

    type: 'IncidentUtils'
};
```

---

## Logging and Error Handling

**File:** `logging-utilities.server.js`

```javascript
/**
 * Logger wrapper for consistent error handling and logging
 */
var Logger = Class.create();
Logger.prototype = {
    initialize: function (componentName) {
        this.componentName = componentName;
        this.logger = gs.getLogger();
    },

    /**
     * Log info message
     */
    info: function (message) {
        var fullMsg = '[' + this.componentName + '] ' + message;
        this.logger.info(fullMsg);
    },

    /**
     * Log warning message
     */
    warn: function (message) {
        var fullMsg = '[' + this.componentName + '] WARNING: ' + message;
        this.logger.warn(fullMsg);
    },

    /**
     * Log error message
     */
    error: function (message, error) {
        var fullMsg = '[' + this.componentName + '] ERROR: ' + message;
        if (error && error.message) {
            fullMsg += ' - ' + error.message;
        }
        this.logger.error(fullMsg);
    },

    /**
     * Log debug message
     */
    debug: function (message, data) {
        if (gs.getProperty('debug.enabled') === 'true') {
            var fullMsg = '[' + this.componentName + '] DEBUG: ' + message;
            if (data) {
                fullMsg += ' - ' + JSON.stringify(data);
            }
            this.logger.info(fullMsg);
        }
    },

    /**
     * Wrap function with error handling
     */
    executeWithErrorHandling: function (func, context) {
        try {
            return func.call(context);
        } catch (error) {
            this.error('Execution error', error);
            throw error;
        }
    },

    type: 'Logger'
};
```

---

## Best Practices Demonstrated

✓ **Class-Based Structure** - Using Class.create() for reusability
✓ **Error Handling** - Try-catch blocks with logging
✓ **Documentation** - JSDoc-style comments
✓ **Safe Queries** - Query validation and error handling
✓ **Reusable Functions** - Common patterns extracted to utilities
✓ **Logging** - Consistent logging throughout
✓ **Type Field** - Required for proper class identification

---

## Usage Example

```javascript
// In a business rule or script include
var incidentUtils = new IncidentUtils();
var result = incidentUtils.createIncident({
    short_description: 'Test incident',
    category: 'software',
    priority: '2'
});

if (result.success) {
    gs.info('Created incident: ' + result.number);
} else {
    gs.error('Failed to create incident: ' + result.error);
}
```

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for server-side APIs and best practices.
