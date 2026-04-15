# Fluent SDK Script Includes & Server Logic (.now.ts)

Patterns for server-side Script Includes in ServiceNow SDK projects using TypeScript definitions.

## Table of Contents

1. [Overview](#overview)
2. [ScriptInclude Properties Reference](#scriptinclude-properties-reference)
3. [Script Include Patterns](#script-include-patterns)
4. [Utility Modules](#utility-modules)
5. [Best Practices](#best-practices)

---

## Overview

In SDK projects, Script Includes are defined using `.now.ts` files (metadata) with handler implementation in accompanying `.js` files. The ScriptInclude API only accepts **strings** for its `script` property, so use `Now.include()` to reference external files.

> **Important:** JavaScript modules are the preferred approach for new server-side logic in Fluent projects. Script Include class files (`Class.create`) must **NOT** import Glide APIs — they are auto-available. Module files **MUST** import Glide APIs from `@servicenow/glide`. When module logic needs to be accessible via GlideAjax, cross-scope, or extension points, use the **module bridging pattern** — see servicenow-fluent-development: [MODULE-GUIDE.md](../../servicenow-fluent-development/MODULE-GUIDE.md).

### Key Fluent Language Constructs

When authoring Script Includes with Fluent SDK, you'll use these language constructs:

- **`Now.ID['script_id']`** — Assign a human-readable ID to the Script Include (required for `$id`)
- **`Now.include('./file.server.js')`** — Link to external JavaScript file with two-way synchronization (recommended for maintainability and syntax highlighting)
- **`Now.ref('sys_user', { email: 'admin@example.com' })`** — Reference records from other applications

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

### File Structure

```
src/
├── scripts/
│   ├── incident_utils.now.ts            # Metadata definition
│   └── handlers/
│       └── IncidentUtils.server.js      # Implementation
```

---

## ScriptInclude Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID using `Now.ID['script_id']` format. When built, this ID is hashed into a unique `sys_id`. |
| `name` | String | The name of the script include. **Must match the class name in the JavaScript implementation.** |
| `script` | Script or Class | The implementation: a class definition, reference to imported class/function, or `Now.include('./file.server.js')` |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiName` | String | `<scope>.<name>` | Internal name for cross-scope calls (e.g., `x_my_app.MyScriptInclude`). Format: `<scope>.<name>` |
| `description` | String | Empty | Description of the script include's purpose |
| `active` | Boolean | `true` | Whether the script include is enabled and callable |
| `clientCallable` | Boolean | `false` | Whether client scripts can call this include via GlideAjax |
| `mobileCallable` | Boolean | `false` | Whether mobile client scripts can call this include |
| `sandboxCallable` | Boolean | `false` | Whether sandbox contexts (query conditions, etc.) can call this. **⚠️ Use sparingly for security.** |
| `callerAccess` | String | (none) | Cross-scope access mode: `'tracking'` (auto-approved) or `'restriction'` (manual approval required) |
| `accessibleFrom` | String | `'package_private'` | Who can access: `'public'` (all scopes) or `'package_private'` (own scope only) |
| `protectionPolicy` | String | (none) | IP protection: `'read'` (read-only on download) or `'protected'` (encrypted in memory) |
| `$meta` | Object | N/A | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

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
    clientCallable: false,  // Server-side only
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

### Configuration Management with System Properties

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'

export default ScriptInclude({
    $id: Now.ID['config_utils'],
    name: 'ConfigUtils',
    description: 'System configuration utilities',
    apiName: 'x_my_app.ConfigUtils',
    active: true,
    script: class {
        /**
         * Get application configuration from system properties
         */
        getConfig() {
            return {
                appName: gs.getProperty('x_my_app.application_name'),
                maxResults: this.getIntProperty('x_my_app.max_query_results'),
                isFeatureEnabled: this.getBooleanProperty('x_my_app.enable_new_ui'),
                loggingLevel: gs.getProperty('x_my_app.logging_level'),
                apiKey: gs.getProperty('x_my_app.external_api_key'),
                // Add cache invalidation if needed
                _cached_at: new Date().toISOString()
            };
        }

        /**
         * Retrieve integer property (convert from string)
         */
        getIntProperty(propertyName, defaultValue = 0) {
            const value = gs.getProperty(propertyName);
            return value ? parseInt(value) : defaultValue;
        }

        /**
         * Retrieve boolean property (convert from string)
         */
        getBooleanProperty(propertyName, defaultValue = false) {
            const value = gs.getProperty(propertyName);
            if (value === null || value === undefined) return defaultValue;
            return value.toString().toLowerCase() === 'true';
        }

        /**
         * Check feature flag
         */
        isFeatureEnabled(featureName) {
            return this.getBooleanProperty(`x_my_app.enable_${featureName}`);
        }

        /**
         * Get numeric config with limits
         */
        getMaxResults() {
            const maxResults = this.getIntProperty('x_my_app.max_query_results', 100);
            // Enforce reasonable limits
            return Math.min(Math.max(maxResults, 1), 10000);
        }
    }
})
```

**Key Notes on System Properties:**
- All property values from `gs.getProperty()` are returned as **strings** — convert explicitly for other types
- Properties are **cached** — changes take effect after cache flush
- Use property names prefixed with your app scope (e.g., `x_my_app.property_name`)
- For comprehensive Property API documentation, see [PROPERTY-API.md](../../servicenow-fluent-development/references/PROPERTY-API.md) in the servicenow-fluent-development skill

---

## Best Practices

✓ **Name must match the class** - `name` property must match the class name in the implementation
✓ **Use class-based structure** - Modern and type-safe
✓ **Use ES6+ syntax** - Arrow functions, const/let, template strings
✓ **Always use TypeScript types** - Full type safety
✓ **Wrap try-catch** - Error handling for all operations
✓ **Use consistent naming** - CamelCase for methods and properties
✓ **Document with JSDoc** - TypeScript intellisense support
✓ **Use Object methods** - `Object.assign()`, `Object.keys()` instead of for-in
✓ **Avoid legacy patterns** - No Class.create() needed in SDK
✓ **Log operations** - Use gs.getLogger() for debugging
✓ **Set appropriate clientCallable** - Only expose to client via GlideAjax if needed
✓ **Restrict sandboxCallable** - Set to `false` (default) unless query conditions absolutely need access
✓ **Use package_private by default** - Set `accessibleFrom: 'package_private'` unless cross-scope access is intentional

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
| `name` | Display name in ServiceNow — **must match the class name** |
| `apiName` | API call name (e.g., `'x_scope.ClassName'`) |
| `clientCallable` | Whether accessible from client scripts via GlideAjax |
| `mobileCallable` | Whether accessible from mobile client scripts |
| `sandboxCallable` | Whether accessible from sandbox contexts (use sparingly) |
| `callerAccess` | Cross-scope access mode: `'tracking'` or `'restriction'` |
| `accessibleFrom` | Access scope: `'public'` or `'package_private'` (default) |
| `protectionPolicy` | IP protection: `'read'` or `'protected'` |
| `$meta.installMethod` | Installation timing: `'demo'` or `'first install'` |
| `script` | Handler class or function implementation |
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
