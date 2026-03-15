# Fluent SDK - Code Examples

Examples for ServiceNow Fluent SDK patterns including tables, business rules, REST APIs, ACLs, UI actions, and service catalog items.

## Table of Contents

1. [Table Definitions](#table-definitions)
2. [Business Rules (Fluent Config)](#business-rules-fluent-config)
3. [REST API Definitions](#rest-api-definitions)
4. [Access Control Lists](#access-control-lists)
5. [UI Actions](#ui-actions)
6. [Service Catalog Items](#service-catalog-items)
7. [Script Includes (Fluent)](#script-includes-fluent)
8. [Client Scripts (Fluent)](#client-scripts-fluent)

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

## Business Rules (Fluent Config)

### Before Rule

**File:** `before-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'
import { beforeRuleHandler } from '../server/before-rule.server.js'

export default BusinessRule({
    $id: Now.ID['incident_before_rule'],
    name: 'Auto-Set Urgency Based on Priority',
    active: true,
    table: 'incident',
    when: 'before',
    script: beforeRuleHandler,
})
```

### Async Rule with Inline Script

**File:** `async-rule.now.ts`

```typescript
import { BusinessRule } from '@servicenow/sdk/core'

export default BusinessRule({
    $id: Now.ID['incident_async_rule'],
    name: 'Send Notification on High Priority',
    active: true,
    table: 'incident',
    when: 'async',
    script: `
        (function executeAsyncRule(current, previous) {
            if (current.priority == '1') {
                var email = new GlideEmailOutbound();
                email.setTo(current.assignment_group.manager.email);
                email.setSubject('Critical Incident: ' + current.number);
                email.setBody('Critical incident created: ' + current.short_description);
                email.send();
            }
        })(current, previous);
    `,
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

## Access Control Lists

**File:** `acl-definitions.now.ts`

```typescript
import { Acl, Role } from '@servicenow/sdk/core'

// Define roles
export const admin_role = Role({
    name: 'x_ai_toolbox.admin',
})

export const manager_role = Role({
    name: 'x_ai_toolbox.manager',
})

// Record ACL - Create
export const acl_create = Acl({
    $id: Now.ID['acl_create'],
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: [admin_role, manager_role],
    table: 'x_ai_toolbox_incident',
})

// Record ACL - Read
export const acl_read = Acl({
    $id: Now.ID['acl_read'],
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: [admin_role, manager_role, 'user'],
    table: 'x_ai_toolbox_incident',
})

// Record ACL - Write
export const acl_write = Acl({
    $id: Now.ID['acl_write'],
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: [admin_role, manager_role],
    table: 'x_ai_toolbox_incident',
})

// REST API ACL
export const acl_rest_api = Acl({
    $id: Now.ID['acl_rest_api'],
    localOrExisting: 'Existing',
    name: 'incident_api_acl',
    type: 'rest_endpoint',
    operation: 'execute',
    roles: [admin_role, manager_role],
    script_acl: 'incident_api',
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

export default ClientScript({
    $id: Now.ID['incident_onload'],
    type: 'onLoad',
    ui_type: 'all',
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
