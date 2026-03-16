# Fluent SDK - Code Examples

Examples for ServiceNow Fluent SDK patterns including tables, business rules, REST APIs, ACLs, cross-scope privileges, UI actions, automated tests, service catalog items, and import sets.

**For comprehensive API documentation, see [API-REFERENCE.md](./API-REFERENCE.md), [ACL-API.md](./ACL-API.md), [CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md), [ATF-API.md](./ATF-API.md), [PROPERTY-API.md](./PROPERTY-API.md), and [IMPORT-SETS-API.md](./IMPORT-SETS-API.md).**

## Table of Contents

1. [Table Definitions](#table-definitions)
2. [List Definitions](#list-definitions)
3. [Business Rules (Fluent Config)](#business-rules-fluent-config)
4. [REST API Definitions](#rest-api-definitions)
5. [Properties](#properties)
6. [Access Control Lists](#access-control-lists)
7. [Cross-Scope Privileges](#cross-scope-privileges)
8. [UI Actions](#ui-actions)
9. [Automated Test Framework (ATF)](#automated-test-framework-atf)
10. [Service Catalog Items](#service-catalog-items)
11. [Import Sets](#import-sets)
12. [Script Includes (Fluent)](#script-includes-fluent)
13. [Client Scripts (Fluent)](#client-scripts-fluent)

---

## Table Definitions

### Simple Table

**File:** `simple-table.now.ts`

```typescript
import { Table, StringColumn, IntegerColumn, BooleanColumn, DateColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const x_table_simple = Table({
    name: 'x_table_simple',
    label: 'Simple Custom Table',
    extends: 'task',
    description: 'A simple custom table extending task',
    schema: {
        title: StringColumn({
            mandatory: true,
            label: 'Title',
            maxLength: 255,
        }),

        description: StringColumn({
            label: 'Description',
            maxLength: 4000,
        }),

        priority: IntegerColumn({
            label: 'Priority',
            default: '3',
            range: {
                min: 1,
                max: 5,
            },
        }),

        is_active: BooleanColumn({
            label: 'Active',
            default: true,
        }),

        target_date: DateColumn({
            label: 'Target Date',
        }),

        assigned_to: ReferenceColumn({
            label: 'Assigned To',
            referenceTable: 'sys_user',
        }),
    },
})
```

### Table with Inheritance and Indexes

**File:** `table-extends.now.ts`

```typescript
import { Table, StringColumn, IntegerColumn } from '@servicenow/sdk/core'

export const x_table_extends = Table({
    name: 'x_table_extends',
    extends: 'task',
    extensible: true,
    display: 'Extension Example Table',
    description: 'A table that extends task with additional custom fields',
    auto_number: {
        prefix: 'sample',
        number: 100,
        number_of_digits: 9,
    },
    schema: {
        color: StringColumn({
            label: 'Color',
            maxLength: 50,
        }),

        code: StringColumn({
            label: 'Code',
            maxLength: 20,
        }),

        quantity: IntegerColumn({
            label: 'Quantity',
            default: '0',
        }),
    },
    index: [
        {
            element: 'color',
            name: 'color_index',
            unique: false,
        },
        {
            element: 'code',
            name: 'code_index',
            unique: true,
        },
    ],
})
```

---

## List Definitions

List definitions ([sys_ui_list]) control which columns display in table list views and in what order. Lists bind to UI views and are reusable across your application.

**For comprehensive documentation, see [LIST-API.md](./LIST-API.md).**

### Simple List with Default View

**File:** `simple-list.now.ts`

```typescript
import { List, default_view } from '@servicenow/sdk/core'

export const incidentList = List({
    $id: Now.ID['incident_list'],
    table: 'incident',
    view: default_view,
    columns: [
        { element: 'number', position: 0 },
        { element: 'short_description', position: 1 },
        { element: 'urgency', position: 2 },
        { element: 'state', position: 3 },
    ],
})
```

### List with Custom View

**File:** `custom-view-list.now.ts`

```typescript
import { List, Record } from '@servicenow/sdk/core'

// Define custom UI view
const incidentDetailView = Record({
    $id: Now.ID['incident_detail_view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_detail_view',
        title: 'Incident Detail View'
    }
})

export const incidentDetailList = List({
    $id: Now.ID['incident_detail_list'],
    table: 'incident',
    view: incidentDetailView,  // Reference the Record constant
    columns: [
        { element: 'number', position: 0 },
        { element: 'short_description', position: 1 },
        { element: 'urgency', position: 2 },
        { element: 'assigned_to.name', position: 3 },
        { element: 'assignment_group.name', position: 4 },
        { element: 'state', position: 5 },
    ],
})
```

### Multiple Lists for Same Table

**File:** `multi-list-views.now.ts`

Define different lists for different purposes:

```typescript
import { List, Record, default_view } from '@servicenow/sdk/core'

// Quick overview list
export const incidentQuickList = List({
    $id: Now.ID['incident_quick_list'],
    table: 'incident',
    view: default_view,
    columns: [
        { element: 'number', position: 0 },
        { element: 'urgency', position: 1 },
        { element: 'state', position: 2 },
    ],
})

// Detailed list for support team
const supportView = Record({
    $id: Now.ID['incident_support_view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_support_view',
        title: 'Support Team View'
    }
})

export const incidentSupportList = List({
    $id: Now.ID['incident_support_list'],
    table: 'incident',
    view: supportView,
    columns: [
        { element: 'number', position: 0 },
        { element: 'short_description', position: 1 },
        { element: 'urgency', position: 2 },
        { element: 'assigned_to.name', position: 3 },
        { element: 'assignment_group.manager.name', position: 4 },
        { element: 'state', position: 5 },
        { element: 'created_on', position: 6 },
        { element: 'updated_on', position: 7 },
    ],
})

// Executive summary list
const executiveView = Record({
    $id: Now.ID['incident_executive_view'],
    table: 'sys_ui_view',
    data: {
        name: 'incident_executive_view',
        title: 'Executive Summary'
    }
})

export const incidentExecutiveList = List({
    $id: Now.ID['incident_executive_list'],
    table: 'incident',
    view: executiveView,
    columns: [
        { element: 'number', position: 0 },
        { element: 'impact', position: 1 },
        { element: 'urgency', position: 2 },
        { element: 'state', position: 3 },
    ],
})
```

### Server List with Dot-Walking

**File:** `server-list.now.ts`

```typescript
import { List, default_view } from '@servicenow/sdk/core'

export const serverList = List({
    $id: Now.ID['cmdb_server_list'],
    table: 'cmdb_ci_server',
    view: default_view,
    columns: [
        { element: 'name', position: 0 },
        { element: 'business_unit.name', position: 1 },  // Related field
        { element: 'vendor.name', position: 2 },         // Related field
        { element: 'cpu_type', position: 3 },
        { element: 'os_version', position: 4 },
        { element: 'assigned_to.name', position: 5 },   // User name
    ],
})
```

### List with Installation Control

**File:** `demo-list.now.ts`

```typescript
import { List, default_view } from '@servicenow/sdk/core'

// This list is only loaded when demo data is installed
export const sampleTaskList = List({
    $id: Now.ID['sample_task_list'],
    table: 'x_app_custom_task',
    view: default_view,
    columns: [
        { element: 'title', position: 0 },
        { element: 'description', position: 1 },
        { element: 'priority', position: 2 },
        { element: 'assigned_to.name', position: 3 },
        { element: 'due_date', position: 4 },
        { element: 'status', position: 5 },
    ],
    $meta: {
        installMethod: 'demo'  // Only install with demo data
    }
})

// This list is only installed on first deployment
export const initialChangeList = List({
    $id: Now.ID['change_initial_list'],
    table: 'change_request',
    view: default_view,
    columns: [
        { element: 'number', position: 0 },
        { element: 'type', position: 1 },
        { element: 'state', position: 2 },
        { element: 'assignment_group.name', position: 3 },
    ],
    $meta: {
        installMethod: 'first install'  // Only install on first deployment
    }
})
```

### Custom Table List Integration

**File:** `custom-table-lists.now.ts`

```typescript
import { List, Record, default_view } from '@servicenow/sdk/core'
import { myCustomTable } from './tables/MyCustomTable.now.js'

const customAppView = Record({
    $id: Now.ID['custom_app_view'],
    table: 'sys_ui_view',
    data: {
        name: 'custom_app_view',
        title: 'Custom Application View'
    }
})

export const customTableList = List({
    $id: Now.ID['custom_table_list'],
    table: myCustomTable.name,  // Reference table by name
    view: customAppView,
    columns: [
        { element: 'title', position: 0 },
        { element: 'description', position: 1 },
        { element: 'priority', position: 2 },
        { element: 'assigned_to.name', position: 3 },
        { element: 'created_on', position: 4 },
    ],
})
```

---

## Business Rules (Fluent Config)

### Before Rule with Validation

**File:** `before-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'
import { beforeRuleHandler } from '../server/before-rule.server.js'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'priority=1^ORpriority=2',
    script: beforeRuleHandler,
    order: 50,
    active: true,
    addMessage: true,
    message: '<p>Urgent incident created. Assignment in progress...</p>',
    description: 'Auto-sets urgency based on priority and assigns to appropriate group',
})
```

### Async Rule with Inline Script

**File:** `async-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_async_rule'],
    name: 'Send Notification on High Priority',
    table: 'incident',
    when: 'async',
    action: ['insert', 'update'],
    filterCondition: 'priority=1',
    addMessage: false,
    script: `
        (function executeAsyncRule(current, previous) {
            try {
                var email = new GlideEmailOutbound();
                email.setTo(current.assignment_group.manager.email);
                email.setSubject('Critical Incident: ' + current.number);
                email.setBody('Critical incident created: ' + current.short_description);
                email.send();
                gs.info('Notification sent for ' + current.number);
            } catch (error) {
                gs.error('Error sending notification: ' + error);
            }
        })(current, previous);
    `,
    order: 100,
    active: true,
})
```

### Before Rule with Role Conditions

**File:** `admin-validation-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['admin_field_validation'],
    name: 'Admin-Only Field Validation',
    table: 'incident',
    when: 'before',
    action: ['update'],
    roleConditions: [admin, security_admin],
    condition: "current.se_impersonated == 'true'",
    abortAction: true,
    addMessage: true,
    message: '<p>Error: Cannot modify security fields. Contact administrator.</p>',
    script: Now.include('./validate-security-fields.server.js'),
    order: 10,
    active: true,
    protectionPolicy: 'protected',
})
```

### Before Rule with Field Value Setting

**File:** `auto-assign-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_auto_assign'],
    name: 'Auto-Assign Critical Incidents',
    table: 'incident',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'priority=1',
    setFieldValue: 'assignment_group=critical_support^urgency=1^impact=1',
    script: Now.include('./apply-auto-assign.server.js'),
    order: 25,
    active: true,
    description: 'Automatically assigns critical priority incidents to critical support group',
})
```

### After Rule with Related Updates

**File:** `after-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_after_update_change'],
    name: 'Update Related Change Request',
    table: 'incident',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    filterCondition: 'change_request!=NULL',
    script: Now.include('./update-related-change.server.js'),
    order: 100,
    active: true,
    description: 'Updates related change request when incident status changes',
})
```

### Display Rule for Form Loading

**File:** `display-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_display_context'],
    name: 'Load Related Information',
    table: 'incident',
    when: 'display',
    action: ['query'],
    script: `
        (function executeDisplayRule(current, previous) {
            // Load related change request
            if (current.change_request) {
                var change = new GlideRecord('change_request');
                if (change.get(current.change_request)) {
                    g_scratchpad.relatedChangeNumber = change.number;
                    g_scratchpad.relatedChangeStatus = change.status;
                }
            }

            // Calculate incident age for display
            var created = new GlideDateTime(current.created_on);
            var now = new GlideDateTime();
            var ageHours = (now.getNumericValue() - created.getNumericValue()) / (1000 * 60 * 60);
            g_scratchpad.incidentAge = Math.round(ageHours * 10) / 10;
        })(current, previous);
    `,
    order: 50,
    active: true,
})
```

---

## REST API Definitions

### Simple REST API

**File:** `simple-rest-api.now.ts`

```typescript
import { RestApi } from '@servicenow/sdk/core'

export default RestApi({
    $id: Now.ID['simple_rest_api'],
    name: 'Simple Incident API',
    service_id: 'simple_incident_api',
    consumes: 'application/json',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['api_get'],
            name: 'get_incidents',
            method: 'GET',
            script: `
                var response = { incidents: [] };
                var gr = new GlideRecord('incident');
                gr.setLimit(10);
                gr.query();

                while (gr.next()) {
                    response.incidents.push({
                        number: gr.getValue('number'),
                        short_description: gr.getValue('short_description')
                    });
                }

                return response;
            `,
        },

        {
            $id: Now.ID['api_create'],
            name: 'create_incident',
            method: 'POST',
            script: `
                var incident = new GlideRecord('incident');
                incident.initialize();
                incident.short_description = request.body.short_description;
                incident.category = request.body.category || 'general';
                var id = incident.insert();

                return { success: true, incident_id: id };
            `,
        },
    ],
})
```

### Modular REST API

**File:** `modular-rest-api.now.ts`

```typescript
import { RestApi } from '@servicenow/sdk/core'
import { getIncidentsHandler } from '../server/api-handlers/get-incidents.js'
import { createIncidentHandler } from '../server/api-handlers/create-incident.js'
import { updateIncidentHandler } from '../server/api-handlers/update-incident.js'

export default RestApi({
    $id: Now.ID['modular_rest_api'],
    name: 'Modular Incident API',
    service_id: 'incident_api',
    consumes: 'application/json',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['api_list'],
            name: 'list_incidents',
            method: 'GET',
            script: getIncidentsHandler,
        },
        {
            $id: Now.ID['api_create'],
            name: 'create_incident',
            method: 'POST',
            script: createIncidentHandler,
        },
        {
            $id: Now.ID['api_update'],
            name: 'update_incident',
            method: 'PUT',
            path: '/:incident_id',
            script: updateIncidentHandler,
        },
    ],
})
```

---

## Properties

For comprehensive Property documentation, see [PROPERTY-API.md](./PROPERTY-API.md).

**File:** `properties.now.ts`

```typescript
import '@servicenow/sdk/global'
import { Property, Role } from '@servicenow/sdk/core'

// Basic string property
export const appName = Property({
    $id: Now.ID['app_name'],
    name: 'x_ai_toolbox.application_name',
    type: 'string',
    value: 'AI Toolbox',
    description: 'Display name for the application',
})

// Boolean feature flag
export const enableNewUI = Property({
    $id: Now.ID['enable_new_ui'],
    name: 'x_ai_toolbox.enable_new_ui',
    type: 'boolean',
    value: 'false',
    description: 'Enable new UI features in beta',
})

// Integer configuration
export const maxQueryResults = Property({
    $id: Now.ID['max_results'],
    name: 'x_ai_toolbox.max_query_results',
    type: 'integer',
    value: '100',
    description: 'Maximum number of results per query',
})

// Choice list property
export const loggingLevel = Property({
    $id: Now.ID['log_level'],
    name: 'x_ai_toolbox.logging_level',
    type: 'choicelist',
    value: 'INFO',
    description: 'Application logging level',
    choices: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
})

// Password property with role access
const adminRole = Role({
    $id: Now.ID['admin_role'],
    name: 'x_ai_toolbox.admin',
})

const managerRole = Role({
    $id: Now.ID['manager_role'],
    name: 'x_ai_toolbox.manager',
})

export const externalApiKey = Property({
    $id: Now.ID['api_key'],
    name: 'x_ai_toolbox.external_api_key',
    type: 'password',
    value: '',
    description: 'API key for external service (encrypted)',
    roles: {
        read: [adminRole],
        write: [adminRole]
    },
    isPrivate: true,  // Don't export in update sets
})

// Frequently changed property
export const requestCounter = Property({
    $id: Now.ID['request_counter'],
    name: 'x_ai_toolbox.request_count_today',
    type: 'integer',
    value: '0',
    description: 'Daily request counter (resets at midnight)',
    ignoreCache: true,  // Avoid cache flush overhead
})

// Demo-only property
export const demoApiEndpoint = Property({
    $id: Now.ID['demo_endpoint'],
    name: 'x_ai_toolbox.demo_api_endpoint',
    type: 'string',
    value: 'https://demo.example.com/api',
    description: 'Demo API endpoint',
    $meta: {
        installMethod: 'demo'
    }
})
```

---

## Access Control Lists

For comprehensive ACL documentation, see [ACL-API.md](./ACL-API.md).

**File:** `acl-definitions.now.ts`

```typescript
import '@servicenow/sdk/global'
import { Acl, Role } from '@servicenow/sdk/core'

// Define roles
export const adminRole = Role({
    $id: Now.ID['admin_role'],
    name: 'x_ai_toolbox.admin',
})

export const managerRole = Role({
    $id: Now.ID['manager_role'],
    name: 'x_ai_toolbox.manager',
    containsRoles: [adminRole],  // Managers inherit admin permissions
})

export const viewerRole = Role({
    $id: Now.ID['viewer_role'],
    name: 'x_ai_toolbox.viewer',
})

// Record ACL - Create (admin and manager only)
export const aclCreate = Acl({
    $id: Now.ID['acl_create'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'create',
    roles: [adminRole, managerRole],
    description: 'Allow admins and managers to create incidents',
    active: true,
    adminOverrides: true,
})

// Record ACL - Read (all roles)
export const aclRead = Acl({
    $id: Now.ID['acl_read'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'read',
    roles: [adminRole, managerRole, viewerRole],
    description: 'Allow all users to read incidents',
    active: true,
})

// Record ACL - Write (admin and manager only)
export const aclWrite = Acl({
    $id: Now.ID['acl_write'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'write',
    roles: [adminRole, managerRole],
    description: 'Allow admins and managers to update incidents',
    active: true,
})

// Record ACL - Delete (admin only)
export const aclDelete = Acl({
    $id: Now.ID['acl_delete'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'delete',
    roles: [adminRole],
    description: 'Allow only admins to delete incidents',
    active: true,
    adminOverrides: true,
})

// Field-level ACL - Sensitive field
export const aclSensitiveFieldRead = Acl({
    $id: Now.ID['acl_sensitive_field'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    field: 'internal_notes',
    operation: 'read',
    roles: [adminRole, managerRole],
    description: 'Only admins and managers can read internal notes',
    active: true,
})

// Condition-based ACL - High priority incidents
export const aclHighPriorityWrite = Acl({
    $id: Now.ID['acl_high_priority'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'write',
    condition: 'priority=1^ORpriority=2',  // Only high and medium priority
    roles: [adminRole, managerRole],
    description: 'All managers can edit high-priority incidents',
    active: true,
})

// Script-based ACL - Assigned user can edit
export const aclAssignedUserEdit = Acl({
    $id: Now.ID['acl_assigned_edit'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'write',
    script: `return current.assigned_to === gs.getUserID() || gs.hasRole('admin');`,
    description: 'Assigned users and admins can edit their incidents',
    active: true,
})

// REST API ACL - Execute endpoint
export const aclRestApiExecute = Acl({
    $id: Now.ID['acl_rest_api'],
    type: 'rest_endpoint',
    name: 'incident_api',
    operation: 'execute',
    roles: [adminRole, managerRole],
    description: 'Allow API access to incident data',
    active: true,
})

// GraphQL ACL - Execute queries
export const aclGraphqlExecute = Acl({
    $id: Now.ID['acl_graphql'],
    type: 'graphql',
    name: 'incident_graphql',
    operation: 'execute',
    roles: [adminRole],
    script: `return !gs.isImpersonating();`,  // Block impersonated admins
    description: 'GraphQL access for non-impersonated admins only',
    active: true,
})

// Processor ACL - Execute processor
export const aclProcessorExecute = Acl({
    $id: Now.ID['acl_processor'],
    type: 'processor',
    name: 'IncidentProcessor',
    operation: 'execute',
    roles: [adminRole, managerRole],
    description: 'Execute incident processor',
    active: true,
})

// Client-callable script include
export const aclClientCallable = Acl({
    $id: Now.ID['acl_client_callable'],
    type: 'client_callable_script_include',
    name: 'IncidentHelper',
    operation: 'execute',
    roles: [viewerRole],
    description: 'Allow viewers to call the incident helper',
    active: true,
})

// Deny ACL - Contractors cannot delete
export const aclDenyDelete = Acl({
    $id: Now.ID['acl_deny_contractor_delete'],
    type: 'record',
    table: 'x_ai_toolbox_incident',
    operation: 'delete',
    roles: ['contractor'],
    decisionType: 'deny',  // Explicitly deny
    description: 'Contractors are blocked from deleting incidents',
    active: true,
})

// UX Data Broker ACL
export const aclUxDataBroker = Acl({
    $id: Now.ID['acl_ux_data_broker'],
    type: 'ux_data_broker',
    table: 'x_ai_toolbox_incident',
    operation: 'read',
    roles: [viewerRole],
    description: 'Control UX data broker access',
    active: true,
})
```

---

## Cross-Scope Privileges

For comprehensive Cross-Scope Privilege documentation, see [CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md).

**File:** `cross-scope-privileges.now.ts`

```typescript
import '@servicenow/sdk/global'
import { CrossScopePrivilege } from '@servicenow/sdk/core'

// Allow reading from a table in another scope
export const readIncidentsPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_read_incidents'],
    status: 'allowed',
    operation: 'read',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})

// Allow writing to a table in another scope
export const writeIncidentsPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_write_incidents'],
    status: 'allowed',
    operation: 'write',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})

// Allow creating records in a table in another scope
export const createIncidentsPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_create_incidents'],
    status: 'allowed',
    operation: 'create',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})

// Allow deleting records from a table in another scope
export const deleteIncidentsPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_delete_incidents'],
    status: 'allowed',
    operation: 'delete',
    targetName: 'incident',
    targetScope: 'x_snc_example',
    targetType: 'sys_db_object',
})

// Allow executing a script include from another scope
export const executeScriptIncludePrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_execute_script_include'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'IncidentHelper',
    targetScope: 'x_snc_example',
    targetType: 'sys_script_include',
})

// Allow executing a script object from another scope
export const executeScriptObjectPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_execute_script_object'],
    status: 'allowed',
    operation: 'execute',
    targetName: 'CustomProcessor',
    targetScope: 'x_snc_example',
    targetType: 'scriptable',
})

// Requested privilege (pending administrator approval)
export const requestedPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_requested_read'],
    status: 'requested',
    operation: 'read',
    targetName: 'change_request',
    targetScope: 'x_snc_change_mgmt',
    targetType: 'sys_db_object',
})

// Privilege with first-install metadata
export const demoPrivilege = CrossScopePrivilege({
    $id: Now.ID['cross_demo_read'],
    status: 'allowed',
    operation: 'read',
    targetName: 'problem',
    targetScope: 'x_snc_problem',
    targetType: 'sys_db_object',
    $meta: {
        installMethod: 'first install'
    }
})
```

---

## UI Actions

**File:** `ui-actions.now.ts`

```typescript
import { UiAction } from '@servicenow/sdk/core'

// Resolve incident action
export const resolveAction = UiAction({
    $id: Now.ID['resolve_incident'],
    table: 'incident',
    actionName: 'Resolve',
    active: true,
    condition: "state != 'resolved' AND state != 'closed'",
    form: {
        showButton: true,
        showLink: true,
        style: 'primary',
    },
    script: `
        current.state = 'resolved';
        current.resolved_by = gs.getUserID();
        current.resolved_at = new GlideDateTime().toString();
        current.update();
        action.setRedirectURL(current);
    `,
    roles: ['itil'],
})

// Assign to me action
export const assignToMeAction = UiAction({
    $id: Now.ID['assign_to_me'],
    table: 'incident',
    actionName: 'Assign to Me',
    active: true,
    form: {
        showButton: true,
        showLink: true,
    },
    list: {
        showLink: true,
        showButton: true,
    },
    script: `
        current.assigned_to = gs.getUserID();
        current.update();
        action.setRedirectURL(current);
    `,
    roles: ['itil', 'support'],
})

// Escalate action
export const escalateAction = UiAction({
    $id: Now.ID['escalate_incident'],
    table: 'incident',
    actionName: 'Escalate',
    active: true,
    condition: "priority IN ('1', '2')",
    form: {
        showButton: true,
        style: 'destructive',
    },
    script: `
        current.escalation_level = '1';
        current.escalated_on = new GlideDateTime().toString();
        current.update();
        action.setRedirectURL(current);
    `,
    roles: ['itil'],
})
```

---

## Automated Test Framework (ATF)

Automated Test Framework (ATF) tests verify that your application works correctly after changes. Tests are composed of steps that interact with forms, REST APIs, server operations, and more.

**For comprehensive ATF documentation, see [ATF-API.md](./ATF-API.md).**

### Basic Form Test

**File:** `test-create-incident.now.ts`

Tests creating a new incident record through the form UI.

```typescript
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

export const testCreateIncident = Test({
    $id: Now.ID['atf_create_incident'],
    active: true,
    name: 'Create Incident Test',
    description: 'Tests creating a new incident record via form UI',
    failOnServerError: true,
}, (atf) => {
    // Open a new form
    atf.form.openNewForm({
        table: 'incident',
        formUI: 'standard_ui',
    })

    // Set field values
    atf.form.setFieldValue({
        table: 'incident',
        formUI: 'standard_ui',
        fieldValues: {
            short_description: 'Test Incident',
            urgency: '2',
            impact: '2',
        },
    })

    // Submit the form
    const submitOutput = atf.form.submitForm({
        assertType: 'form_submitted_to_server',
        formUI: 'standard_ui',
    })

    // Validate the record was created on the server
    atf.server.recordValidation({
        recordId: submitOutput.record_id,
        table: 'incident',
        assertType: 'record_validated',
        enforceSecurity: true,
        fieldValues: 'short_description=Test Incident^urgency=2',
    })
})
```

### Server-Side Record Operations Test

**File:** `test-bulk-incident-operations.now.ts`

Tests creating, updating, and querying records on the server without form interaction.

```typescript
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

export const testBulkIncidentOperations = Test({
    $id: Now.ID['atf_bulk_operations'],
    active: true,
    name: 'Bulk Incident Operations Test',
    description: 'Tests creating and updating multiple incident records',
    failOnServerError: true,
}, (atf) => {
    // Impersonate admin user
    atf.server.impersonate({
        user: 'admin',
    })

    // Create first incident
    const incident1 = atf.server.recordInsert({
        $id: 'step_insert_1',
        table: 'incident',
        assertType: 'record_successfully_inserted',
        enforceSecurity: false,
        fieldValues: {
            short_description: 'High Priority Issue',
            urgency: '1',
        },
    })

    // Create second incident
    const incident2 = atf.server.recordInsert({
        $id: 'step_insert_2',
        table: 'incident',
        assertType: 'record_successfully_inserted',
        enforceSecurity: false,
        fieldValues: {
            short_description: 'Medium Priority Issue',
            urgency: '2',
        },
    })

    // Update first incident
    atf.server.recordUpdate({
        table: 'incident',
        recordId: incident1.record_id,
        assertType: 'record_successfully_updated',
        fieldValues: {
            state: 'in_progress',
        },
    })

    // Query for high priority records
    atf.server.recordQuery({
        table: 'incident',
        assertType: 'record_found',
        queryString: 'urgency=1^ORDERBYshort_description',
    })

    // Log results
    atf.server.log({
        log: `Created incidents: ${incident1.record_id} and ${incident2.record_id}`,
    })
})
```

### REST API Test

**File:** `test-incident-rest-api.now.ts`

Tests REST API endpoints with request/response validation.

```typescript
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

export const testIncidentRestApi = Test({
    $id: Now.ID['atf_rest_api'],
    active: true,
    name: 'REST API Test',
    description: 'Tests REST API endpoints for incident table',
    failOnServerError: true,
}, (atf) => {
    // Send GET request to retrieve incidents
    atf.rest.sendRestRequest({
        $id: 'step_get_incidents',
        method: 'get',
        path: '/api/now/v2/table/incident?limit=10',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: '',
        queryParameters: {},
    })

    // Assert successful response
    atf.rest.assertStatusCode({
        operation: 'equals',
        statusCode: 200,
    })

    // Validate JSON structure
    atf.rest.assertResponseJSONPayloadIsValid({
        assertType: 'valid_json',
    })

    // Assert response contains results
    atf.rest.assertJsonResponsePayloadElement({
        operation: 'equals',
        elementName: '/result_count',
        elementValue: 'true',
    })

    // Validate response header
    atf.rest.assertResponseHeader({
        headerName: 'Content-Type',
        headerValue: 'application/json',
    })

    // Validate response time
    atf.rest.assertResponseTime({
        operation: 'less_than',
        responseTime: '5000',
    })
})
```

### Multi-Step Test with Output Variables

**File:** `test-incident-workflow.now.ts`

Tests a complete workflow using output variables across multiple steps.

```typescript
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

export const testIncidentWorkflow = Test({
    $id: Now.ID['atf_incident_workflow'],
    active: true,
    name: 'Incident Workflow Test',
    description: 'Tests complete incident creation and modification workflow',
    failOnServerError: true,
}, (atf) => {
    // Step 1: Create an incident on the server
    atf.server.recordInsert({
        $id: 'step_insert',
        table: 'incident',
        assertType: 'record_successfully_inserted',
        enforceSecurity: false,
        fieldValues: {
            short_description: 'Workflow Test Incident',
            urgency: '3',
        },
    })

    // Step 2: Open the created record in a form
    atf.form.openExistingRecord({
        table: 'incident',
        formUI: 'standard_ui',
        recordId: '{{step["step_insert"].record_id}}',  // Reference output variable
    })

    // Step 3: Change field values
    atf.form.setFieldValue({
        table: 'incident',
        formUI: 'standard_ui',
        fieldValues: {
            urgency: '1',
            state: 'in_progress',
        },
    })

    // Step 4: Submit the form
    atf.form.submitForm({
        assertType: 'form_submitted_to_server',
        formUI: 'standard_ui',
    })

    // Step 5: Validate the server record reflects changes
    atf.server.recordValidation({
        recordId: '{{step["step_insert"].record_id}}',  // Use same record ID
        table: 'incident',
        assertType: 'record_validated',
        enforceSecurity: true,
        fieldValues: 'urgency=1^state=in_progress',
    })

    // Step 6: Log the test completion
    atf.server.log({
        log: `Workflow test completed for incident {{step["step_insert"].record_id}}`,
    })
})
```

---

## Service Catalog Items

**File:** `laptop-request-catalog.now.ts`

```typescript
import { Record } from '@servicenow/sdk/core'

// Catalog item
export const laptopRequestItem = Record({
    $id: Now.ID['laptop_catalog_item'],
    table: 'sc_cat_item',
    data: {
        name: 'Laptop Request',
        description: 'Request a new laptop',
        category: 'Hardware',
        active: true,
        price: '1200.00',
    },
})

// Variable set
export const laptopVarSet = Record({
    $id: Now.ID['laptop_var_set'],
    table: 'io_set_item',
    data: {
        name: 'Laptop Configuration',
        active: true,
    },
})

// Variables
export const employeeVar = Record({
    $id: Now.ID['var_employee'],
    table: 'io_variable',
    data: {
        question_text: 'Employee Name',
        name: 'employee_name',
        type: '24', // Reference
        reference_table: 'sys_user',
        mandatory: 'true',
        order: '10',
    },
})

export const modelVar = Record({
    $id: Now.ID['var_model'],
    table: 'io_variable',
    data: {
        question_text: 'Laptop Model',
        name: 'laptop_model',
        type: '7', // Choice
        choice_list: 'Dell XPS|HP EliteBook|MacBook Pro',
        mandatory: 'true',
        order: '20',
    },
})

export const ramVar = Record({
    $id: Now.ID['var_ram'],
    table: 'io_variable',
    data: {
        question_text: 'RAM Configuration',
        name: 'ram_config',
        type: '7', // Choice
        choice_list: '8GB|16GB|32GB',
        default_value: '16GB',
        mandatory: 'true',
        order: '30',
    },
})
```

---

## Import Sets

For comprehensive Import Sets documentation including staging tables, data sources, field mappings, transform scripts, and complete examples, see [IMPORT-SETS-API.md](./IMPORT-SETS-API.md).

### Basic User Import

**File:** `user-import.now.ts`

```typescript
import '@servicenow/sdk/global'
import { Table, Record, ImportSet } from '@servicenow/sdk/core'

// STEP 1: Create Staging Table Definition
export const userStagingTable = Table({
    $id: Now.ID['user-staging-table'],
    name: 'u_user_import_staging',
    label: 'User Import Staging',
    extends: 'sys_import_set_row',
    columns: [
        {
            name: 'u_email_address',
            type: 'email',
            max_length: 100,
            label: 'Email Address'
        },
        {
            name: 'u_full_name',
            type: 'string',
            max_length: 100,
            label: 'Full Name'
        },
        {
            name: 'u_username',
            type: 'string',
            max_length: 40,
            label: 'Username'
        },
    ]
})

// STEP 2: Create Data Source
export const userDataSource = Record({
    $id: Now.ID['user-csv-datasource'],
    table: 'sys_data_source',
    data: {
        name: 'User CSV Data Source',
        type: 'File',
        format: 'CSV',
        file_retrieval_method: 'Attachment',
        csv_delimiter: ',',
        header_row: 1,
        import_set_table_name: 'u_user_import_staging',
        import_set_table_label: 'User Import Staging',
        batch_size: 500,
        active: true,
    },
})

// STEP 3: Create Transform Map
export const userImportSet = ImportSet({
    $id: Now.ID['user-import-transform'],
    name: 'User Import Transform',
    targetTable: 'sys_user',
    sourceTable: 'u_user_import_staging',
    active: true,
    runBusinessRules: true,
    enforceMandatoryFields: 'onlyMappedFields',
    fields: {
        email: {
            sourceField: 'u_email_address',
            coalesce: true,
        },
        name: 'u_full_name',
        user_name: 'u_username',
    }
})
```

### Import with Field Transformation and Validation

**File:** `employee-import-advanced.now.ts`

```typescript
import '@servicenow/sdk/global'
import { Table, Record, ImportSet } from '@servicenow/sdk/core'

export const employeeStagingTable = Table({
    $id: Now.ID['employee-staging-table'],
    name: 'u_employee_import_staging',
    label: 'Employee Import Staging',
    extends: 'sys_import_set_row',
    columns: [
        {
            name: 'u_emp_id',
            type: 'string',
            max_length: 20,
            label: 'Employee ID'
        },
        {
            name: 'u_email',
            type: 'email',
            max_length: 100,
            label: 'Email'
        },
        {
            name: 'u_first_name',
            type: 'string',
            max_length: 50,
            label: 'First Name'
        },
        {
            name: 'u_last_name',
            type: 'string',
            max_length: 50,
            label: 'Last Name'
        },
        {
            name: 'u_department_code',
            type: 'string',
            max_length: 10,
            label: 'Department Code'
        },
        {
            name: 'u_start_date_str',
            type: 'string',
            max_length: 20,
            label: 'Start Date'
        },
    ]
})

export const employeeDataSource = Record({
    $id: Now.ID['employee-datasource'],
    table: 'sys_data_source',
    data: {
        name: 'Employee Data Source',
        type: 'File',
        format: 'CSV',
        import_set_table_name: 'u_employee_import_staging',
        import_set_table_label: 'Employee Import Staging',
        active: true,
    },
})

export const employeeImportSet = ImportSet({
    $id: Now.ID['employee-import-transform'],
    name: 'Employee Import Transform',
    targetTable: 'sys_user',
    sourceTable: 'u_employee_import_staging',
    active: true,
    runBusinessRules: true,
    fields: {
        email: {
            sourceField: 'u_email',
            coalesce: true,
            useSourceScript: true,
            sourceScript: `(function transformEntry(source) {
                return source.u_email.toLowerCase().trim();
            })(source);`
        },
        first_name: 'u_first_name',
        last_name: 'u_last_name',
        user_name: {
            sourceField: 'u_emp_id',
            coalesce: true,
        },
        department: {
            sourceField: 'u_department_code',
            choiceAction: 'create'
        },
        start_date: {
            sourceField: 'u_start_date_str',
            dateFormat: 'yyyy-MM-dd'
        }
    },
    scripts: [
        {
            $id: Now.ID['validate-employee-data'],
            active: true,
            order: 100,
            when: 'onBefore',
            script: `(function runTransformScript(source, map, log, target) {
                // Validate required fields
                if (!source.u_emp_id || !source.u_email) {
                    log.error('Missing required fields: emp_id=' + source.u_emp_id + ', email=' + source.u_email);
                    return;
                }

                // Validate email format
                if (source.u_email.indexOf('@') === -1) {
                    log.error('Invalid email format: ' + source.u_email);
                    return;
                }
            })(source, map, log, target);`
        }
    ]
})
```

---

## Script Includes (Fluent)

**File:** `my-script-include.now.ts`

```typescript
import { ScriptInclude } from '@servicenow/sdk/core'
import { MyScriptInclude } from '../server/MyScriptInclude.server.js'

export default ScriptInclude({
    $id: Now.ID['my_script_include'],
    name: 'MyScriptInclude',
    active: true,
    apiName: 'x_ai_toolbox.MyScriptInclude',
    client_callable: false,
    script: MyScriptInclude,
})
```

---

## Client Scripts (Fluent)

**File:** `form-onload.now.ts`

```typescript
import { ClientScript } from '@servicenow/sdk/core'
import { formOnLoadHandler } from '../client/form-onload.client.js'

export const cs = ClientScript({
    $id: Now.ID['incident_onload'],
    type: 'onLoad',
    uiType: 'all',
    table: 'incident',
    global: false,
    active: true,
    script: formOnLoadHandler,
})
```

---

## Best Practices Demonstrated

✓ **Parent References** - Using constant properties, never Now.ID for references
✓ **Fluent API** - Chainable, type-safe configuration
✓ **Script Separation** - External files for logic, Fluent for config
✓ **Naming Conventions** - Consistent prefixes for IDs and names
✓ **Documentation** - Clear descriptions for each element
✓ **Error Handling** - Try-catch in scripts where applicable

---

## Critical Patterns to Follow

### CORRECT - Parent-Child References
```typescript
export const menu = ApplicationMenu({ $id: Now.ID['menu'], title: 'App' })
export const module = Record({ table: 'sys_app_module', data: { application: menu.$id } })
```

### WRONG - Creates duplicate
```typescript
data: { application: Now.ID['menu'] } // Never do this
```

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| Duplicate records on install | ✓ Use constant properties for references |
| Script validation errors | ✓ Remember: script content is JavaScript, not TypeScript |
| API not found | ✓ Use Context7 to verify method signatures |
| Field name mismatches | ✓ Match @types/servicenow schemas exactly |

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for complete execution matrix, API reference, and advanced patterns.
