# Fluent SDK Script Includes & Server Logic (.now.ts)

Patterns for server-side Script Includes in ServiceNow SDK projects using TypeScript definitions.

## Table of Contents

1. [Overview](#overview)
2. [Script Include Patterns](#script-include-patterns)
3. [Utility Modules](#utility-modules)
4. [Best Practices](#best-practices)

---

## Overview

In SDK projects, Script Includes are defined using `.now.ts` files (metadata) with handler implementation in accompanying `.server.js` files.

### File Structure

```
src/
├── scripts/
│   ├── incident_utils.now.ts            # Metadata definition
│   └── handlers/
│       └── IncidentUtils.server.js      # Implementation
```

---

## Script Include Patterns

### Metadata Definition (.now.ts)

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'
import { IncidentUtils } from '../handlers/IncidentUtils.server.js'

export default ScriptInclude({
    $id: Now.ID['incident_utils'],
    name: 'IncidentUtils',
    description: 'Utilities for incident management',
    active: true,
    apiName: 'x_my_app.IncidentUtils',
    client_callable: false,  // Server-side only
    script: IncidentUtils,
})
```

### Implementation (.server.js)

```javascript
export class IncidentUtils {
    constructor() {
        this.logger = gs.getLogger();
        this.tableName = 'incident';
    }

    /**
     * Get incident count by state
     */
    getIncidentCount(state) {
        const gr = new GlideRecord(this.tableName);
        gr.addQuery('state', state);
        gr.query();

        const count = gr.getRowCount();
        this.logger.info(`Found ${count} incidents in state: ${state}`);

        return count;
    }

    /**
     * Create incident
     */
    createIncident(fields) {
        try {
            const gr = new GlideRecord(this.tableName);
            gr.initialize();

            // Set fields from object
            Object.keys(fields).forEach(field => {
                gr.setValue(field, fields[field]);
            });

            const newId = gr.insert();
            this.logger.info(`Incident created: ${newId}`);

            return newId;
        } catch (error) {
            this.logger.error(`Error creating incident: ${error.message}`);
            return null;
        }
    }

    /**
     * Get incident by number
     */
    getIncidentByNumber(number) {
        const gr = new GlideRecord(this.tableName);
        if (gr.get('number', number)) {
            return {
                sys_id: gr.sys_id.toString(),
                number: gr.number.toString(),
                short_description: gr.short_description.toString(),
                state: gr.state.toString(),
                priority: gr.priority.toString()
            };
        }
        return null;
    }

    /**
     * Update incident state
     */
    updateIncidentState(incidentId, newState) {
        try {
            const gr = new GlideRecord(this.tableName);
            if (gr.get(incidentId)) {
                gr.state = newState;
                gr.update();

                this.logger.info(`Incident ${incidentId} state updated to ${newState}`);
                return true;
            }
            return false;
        } catch (error) {
            this.logger.error(`Error updating incident: ${error.message}`);
            return false;
        }
    }
}
```

---

## Utility Modules

### User Utilities Module

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'

export default ScriptInclude({
    $id: Now.ID['user_utils'],
    name: 'UserUtils',
    description: 'User management utilities',
    apiName: 'x_my_app.UserUtils',
    active: true,
    script: class {
        /**
         * Get user by email
         */
        getUserByEmail(email) {
            const gr = new GlideRecord('sys_user');
            gr.addQuery('email', email);
            gr.setLimit(1);
            gr.query();

            if (gr.next()) {
                return {
                    sys_id: gr.sys_id.toString(),
                    name: gr.name.toString(),
                    email: gr.email.toString(),
                    active: gr.active.toString()
                };
            }
            return null;
        }

        /**
         * Get users in group
         */
        getUsersInGroup(groupId) {
            const users = [];
            const gr = new GlideRecord('sys_user_grmember');
            gr.addQuery('group', groupId);
            gr.query();

            while (gr.next()) {
                users.push({
                    sys_id: gr.user.sys_id.toString(),
                    name: gr.user.name.toString(),
                    email: gr.user.email.toString()
                });
            }

            return users;
        }

        /**
         * Check if user has role
         */
        userHasRole(userId, roleName) {
            const user = new GlideRecord('sys_user');
            if (user.get(userId)) {
                return user.hasRole(roleName);
            }
            return false;
        }
    }
})
```

### Data Utilities Module

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'

export default ScriptInclude({
    $id: Now.ID['data_utils'],
    name: 'DataUtils',
    description: 'Data manipulation utilities',
    apiName: 'x_my_app.DataUtils',
    active: true,
    script: class {
        /**
         * Format date for display
         */
        formatDate(dateValue) {
            if (!dateValue) return '';
            const dt = new GlideDateTime(dateValue);
            return dt.format('yyyy-MM-dd HH:mm:ss');
        }

        /**
         * Truncate string safely
         */
        truncateString(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        /**
         * Convert object to JSON safely
         */
        objectToJson(obj) {
            try {
                return JSON.stringify(obj);
            } catch (error) {
                gs.warn(`Error converting object to JSON: ${error.message}`);
                return '{}';
            }
        }

        /**
         * Parse JSON safely
         */
        parseJson(jsonString) {
            try {
                return JSON.parse(jsonString);
            } catch (error) {
                gs.warn(`Error parsing JSON: ${error.message}`);
                return null;
            }
        }

        /**
         * Count records matching query
         */
        countRecords(tableName, queryConditions = {}) {
            const gr = new GlideRecord(tableName);

            Object.keys(queryConditions).forEach(field => {
                gr.addQuery(field, queryConditions[field]);
            });

            gr.query();
            return gr.getRowCount();
        }

        /**
         * Bulk update records
         */
        bulkUpdate(tableName, queryConditions, updateFields) {
            const gr = new GlideRecord(tableName);

            Object.keys(queryConditions).forEach(field => {
                gr.addQuery(field, queryConditions[field]);
            });

            gr.query();

            let updateCount = 0;
            let errorCount = 0;

            while (gr.next()) {
                try {
                    Object.assign(gr, updateFields);
                    gr.update();
                    updateCount++;
                } catch (error) {
                    gs.error(`Error updating record: ${error.message}`);
                    errorCount++;
                }
            }

            gs.info(`Bulk update: ${updateCount} updated, ${errorCount} errors`);
            return { updated: updateCount, errors: errorCount };
        }
    }
})
```

---

## Best Practices

✓ **Use class-based structure** - Modern and type-safe
✓ **Use ES6+ syntax** - Arrow functions, const/let, template strings
✓ **Always use TypeScript types** - Full type safety
✓ **Wrap try-catch** - Error handling for all operations
✓ **Use consistent naming** - CamelCase for methods and properties
✓ **Document with JSDoc** - TypeScript intellisense support
✓ **Use Object methods** - `Object.assign()`, `Object.keys()` instead of for-in
✓ **Avoid legacy patterns** - No Class.create() needed in SDK
✓ **Log operations** - Use gs.getLogger() for debugging
✓ **Set appropriate client_callable** - Only expose to client if needed

---

## Comparison: Classic vs Fluent

| Aspect | Classic | Fluent |
|--------|---------|--------|
| Definition | Inline in instance | TypeScript `.now.ts` file |
| Class syntax | `Class.create()` | ES6 `class` keyword |
| Implementation | `.js` inline or separate | `.server.js` file |
| Type safety | None | Full TypeScript support |
| Version control | Manual export | Git tracking |
| Modern syntax | Legacy JavaScript | ES6+ features |
| IDE support | Limited | Full intellisense |
| Testing | Manual UI testing | Automated testing capable |

---

## Key APIs

| API | Purpose |
|-----|---------|
| `ScriptInclude()` | SDK function to define script include |
| `$id` | Unique identifier for this script include |
| `name` | Display name in ServiceNow |
| `apiName` | API call name (e.g., 'x_scope.ClassName') |
| `client_callable` | Whether accessible from client scripts |
| `script` | Handler class or function |
| `gs.getLogger()` | Get system logger |
| `gs.info()` / `gs.error()` | Logging methods |

---

## When to Use Fluent SDK Script Includes

- ✓ New SDK projects and applications
- ✓ TypeScript-based development
- ✓ Need type-safe utilities
- ✓ Full-stack SDK applications
- ✓ Version control and Git tracking
- ✓ Automated testing with CI/CD
- ✓ Team knows TypeScript

For instance-based customizations, see [CLASSIC.md](CLASSIC.md) for traditional Script Include patterns.
