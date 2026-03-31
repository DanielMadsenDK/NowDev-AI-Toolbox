# Fluent SDK Client Scripts (.now.ts)

Patterns for browser-side scripts in ServiceNow SDK projects using TypeScript definitions.

## Table of Contents

1. [Overview](#overview)
2. [Form Initialization](#form-initialization)
3. [Form Validation](#form-validation)
4. [Dynamic Field Manipulation](#dynamic-field-manipulation)
5. [Event Handling](#event-handling)
6. [Server Communication](#server-communication)
7. [Best Practices](#best-practices)
8. [JavaScript Modules in Client Scripts](#javascript-modules-in-client-scripts)
9. [Comparison: Classic vs Fluent](#comparison-classic-vs-fluent)

---

## Overview

In SDK projects, client scripts are defined using `.now.ts` files (metadata) with handler functions in accompanying `.client.js` files.

Client scripts are created via the `ClientScript` object and define when JavaScript runs on the client (web browser) during form events such as form load, field changes, or form submission.

### Key Properties

The `ClientScript` object requires:
- **`$id`**: Unique ID using `Now.ID['script_id']` format (required)
- **`table`**: Name of the table the script runs on (required)
- **`name`**: Human-readable name for the script (required)
- **`type`**: When the script runs - `onLoad`, `onChange`, `onSubmit`, or `onCellEdit` (required)

### Key Fluent Language Constructs

When authoring client scripts with Fluent SDK, you'll use these language constructs:

- **`Now.ID['script_id']`** — Assign a human-readable ID to the client script (required for `$id`)
- **`Now.include('./file.client.js')`** — Link to external JavaScript file with two-way synchronization (recommended for maintainability and syntax highlighting)

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

### File Structure

```
src/
├── scripts/
│   ├── incident_form_onload.now.ts      # Metadata definition
│   └── handlers/
│       └── incident-form.client.js      # Execution code
```

---

## ClientScript Properties Reference

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `$id` | String or Number | Unique ID using `Now.ID[]` format | `Now.ID['incident_onload']` |
| `table` | String | Name of the table the script runs on | `'incident'` |
| `name` | String | Display name of the client script | `'Incident Form OnLoad Handler'` |
| `type` | String | When the script executes: `onLoad`, `onChange`, `onSubmit`, `onCellEdit` | `'onLoad'` |

### Conditional Properties (based on type)

| Property | Type | When Used | Description | Example |
|----------|------|-----------|-------------|---------|
| `field` | String | `onChange` or `onCellEdit` | Field that triggers the script | `'priority'` |

### Optional Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `active` | Boolean | `true` | Enable or disable the script | `true` |
| `appliesExtended` | Boolean | `false` | Apply to tables extended from the specified table | `false` |
| `global` | Boolean | `true` | Run on all views (`true`) or specific views only (`false`) | `true` |
| `view` | String | N/A | Specific views to run on (only when `global` is `false`) | `'form'` |
| `uiType` | String | `'desktop'` | UI target: `'desktop'`, `'mobile_or_service_portal'`, or `'all'` | `'all'` |
| `description` | String | Empty | Description of the script's functionality | `'Initializes form defaults'` |
| `messages` | String | Empty | Localized message strings accessible via `getmessage('[message]')` | `'no_permission'` |
| `isolateScript` | Boolean | `false` | Run in strict mode (`false`) or isolated mode (`true`) | `false` |
| `script` | Script | N/A | The executable JavaScript/handler function or `Now.include()` reference | `Now.include('./handler.js')` |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property | `{ installMethod: 'first install' }` |

### Property Details

**`uiType` valid values:**
- `'desktop'` (default) — Desktop and workspace UI
- `'mobile_or_service_portal'` — Mobile and Service Portal UI
- `'all'` — All user interfaces

**`type` valid values:**
- `'onLoad'` — Executes when form first renders
- `'onChange'` — Executes when specified field changes (requires `field` property)
- `'onSubmit'` — Executes when form is submitted
- `'onCellEdit'` — Executes when list editor cell value changes (requires `field` property)

**`isolateScript` behavior:**
- `true` — Script runs in isolated mode with access to direct DOM, jQuery, prototype, and window
- `false` (default) — Script runs in strict mode with restricted access

**`$meta.installMethod` valid values:**
- `'first install'` — Install only on initial application installation
- `'demo'` — Install with demo data when "Load demo data" option is selected

---

## Form Initialization

### Metadata Definition (.now.ts)

You have two options for providing the script:

**Option 1: Import JavaScript function** (when co-locating logic)

```typescript
import { ClientScript } from '@servicenow/sdk/core'
import { incidentFormOnLoad } from '../handlers/incident-form.client.js'

export const cs = ClientScript({
    $id: Now.ID['incident_onload_script'],
    type: 'onLoad',
    uiType: 'all',  // 'desktop', 'mobile_or_service_portal', 'all'
    table: 'incident',
    global: false,
    name: 'Incident Form OnLoad Handler',
    description: 'Initializes form with defaults and field visibility',
    active: true,
    appliesExtended: false,
    script: incidentFormOnLoad,
})
```

**Option 2: Use `Now.include()` for two-way sync** (recommended for maintainability)

```typescript
import '@servicenow/sdk/global'
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_onload_script'],
    type: 'onLoad',
    uiType: 'all',  // 'desktop', 'mobile_or_service_portal', 'all'
    table: 'incident',
    global: false,
    name: 'Incident Form OnLoad Handler',
    description: 'Initializes form with defaults and field visibility',
    active: true,
    appliesExtended: false,
    script: Now.include('./incident-form.client.js')  // Two-way sync with external file
})
```

`Now.include()` enables automatic synchronization: changes in the UI sync back to your source file, and edits to your `.client.js` file sync back to the instance.

### Handler Implementation (.client.js)

```javascript
export function incidentFormOnLoad() {
    const form = g_form;

    // Log form initialization
    console.log('Initializing form for: ' + form.getTableName());

    // Set defaults for new records
    if (form.isNewRecord()) {
        form.setValue('priority', '3');
        form.setValue('urgency', '3');
        form.setValue('impact', '3');
        form.setValue('state', 'new');
    }

    // Set field properties
    form.setMandatory('description', true);
    form.setReadOnly('number', true);
    form.setReadOnly('created_on', true);
    form.setReadOnly('created_by', true);

    // Dynamic visibility based on priority
    const priority = form.getValue('priority');
    updateVisibilityByPriority(priority);

    // Add change listeners
    form.addOnChange('priority', function() {
        updateVisibilityByPriority(form.getValue('priority'));
    });

    form.addOnChange('category', function() {
        suggestAssignmentGroup(form.getValue('category'));
    });

    // Disable reassignment if already assigned
    if (form.getValue('assigned_to')) {
        form.setReadOnly('assigned_to', true);
        form.setReadOnly('assignment_group', true);
    }
}

function updateVisibilityByPriority(priority) {
    const form = g_form;

    if (priority === '1' || priority === '2') {
        form.setVisible('escalation_reason', true);
        form.setMandatory('assignment_group', true);
    } else {
        form.setVisible('escalation_reason', false);
        form.setMandatory('assignment_group', false);
    }
}

function suggestAssignmentGroup(category) {
    const groupMap = {
        'software': 'Software Support',
        'hardware': 'Hardware Support',
        'network': 'Network Support',
    };

    const group = groupMap[category] || 'General Support';
    g_form.setValue('assignment_group', group);
}
```

---

## Form Validation

### Client-Side Validation

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_validation_script'],
    type: 'onSubmit',
    table: 'incident',
    global: false,
    name: 'Incident Validation',
    active: true,
    script: () => {
        const form = g_form;
        const errors = [];

        // Validate required fields
        const requiredFields = ['short_description', 'category', 'priority'];
        requiredFields.forEach(field => {
            if (!form.getValue(field)) {
                errors.push(`${field} is required`);
            }
        });

        // Validate description length
        const desc = form.getValue('short_description');
        if (desc && desc.length < 10) {
            errors.push('Short description must be at least 10 characters');
        }

        // Validate date relationships
        const startDate = form.getValue('start_date');
        const endDate = form.getValue('end_date');
        if (startDate && endDate) {
            const start = new Date(startDate).getTime();
            const end = new Date(endDate).getTime();

            if (start >= end) {
                errors.push('End date must be after start date');
            }

            // Warn if duration exceeds 30 days
            const daysApart = (end - start) / (1000 * 60 * 60 * 24);
            if (daysApart > 30) {
                form.addWarningMessage('Duration exceeds 30 days');
            }
        }

        // Display errors
        if (errors.length > 0) {
            errors.forEach(error => form.addErrorMessage(error));
            return false;  // Prevent submission
        }

        return true;  // Allow submission
    }
})
```

---

## Dynamic Field Manipulation

### Show/Hide Based on Selection

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_dynamic_visibility'],
    type: 'onChange',
    field: 'type',  // Watch this field
    table: 'incident',
    name: 'Dynamic Field Visibility',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading) return;

        const form = g_form;

        // Hide all conditional fields
        form.setVisible('change_category', false);
        form.setVisible('change_impact', false);
        form.setVisible('incident_category', false);

        // Show fields based on type
        if (newValue === 'change') {
            form.setVisible('change_category', true);
            form.setVisible('change_impact', true);
            form.setMandatory('change_category', true);
        } else if (newValue === 'incident') {
            form.setVisible('incident_category', true);
            form.setMandatory('incident_category', true);
        }
    }
})
```

### Cascading Updates

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_cascading_update'],
    type: 'onChange',
    field: 'priority',
    table: 'incident',
    name: 'Cascading Priority Updates',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading) return;

        const form = g_form;

        // Auto-set urgency and impact based on priority
        if (newValue === '1') {
            form.setValue('urgency', '1');
            form.setValue('impact', '1');
            form.setMandatory('assignment_group', true);
        } else if (newValue === '2') {
            form.setValue('urgency', '2');
            form.setValue('impact', '2');
            form.setMandatory('assignment_group', true);
        } else {
            form.setValue('urgency', '3');
            form.setValue('impact', '3');
            form.setMandatory('assignment_group', false);
        }
    }
})
```

---

## Event Handling

### Multiple Listeners with Handlers

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_setup_listeners'],
    type: 'onLoad',
    table: 'incident',
    name: 'Setup Field Listeners',
    active: true,
    script: () => {
        const form = g_form;

        // Priority change listener
        form.addOnChange('priority', function() {
            updateFieldsForPriority();
        });

        // Category change listener
        form.addOnChange('category', function() {
            const category = form.getValue('category');
            suggestAssignmentGroup(category);
        });

        // Toggle advanced options
        form.addOnChange('show_advanced', function() {
            const showAdvanced = form.getValue('show_advanced') === 'true';
            form.setVisible('advanced_options', showAdvanced);
            form.setVisible('custom_field1', showAdvanced);
            form.setMandatory('custom_field2', showAdvanced);
        });
    }
})

function updateFieldsForPriority() {
    const form = g_form;
    const priority = form.getValue('priority');

    if (priority === '1') {
        form.setMandatory('assignment_group', true);
        form.setVisible('escalation_reason', true);
    } else {
        form.setMandatory('assignment_group', false);
        form.setVisible('escalation_reason', false);
    }
}

function suggestAssignmentGroup(category) {
    const groupMap = {
        'software': 'Software Support',
        'hardware': 'Hardware Support',
        'network': 'Network Support',
    };

    g_form.setValue('assignment_group', groupMap[category] || 'General Support');
}
```

---

## Server Communication

### GlideAjax via SDK

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_server_call'],
    type: 'onChange',
    field: 'assignment_group',
    table: 'incident',
    name: 'Load Group Members',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) {
            return;
        }

        const form = g_form;
        const ga = new GlideAjax('IncidentUtils');
        ga.addParam('sysparm_name', 'getGroupMembers');
        ga.addParam('sysparm_group_id', newValue);

        ga.getXMLAnswer(function(answer) {
            try {
                const members = eval('(' + answer + ')');
                console.log('Group members loaded:', members);

                // Update any dependent fields
                form.addInfoMessage('Group members loaded');
            } catch (error) {
                form.addErrorMessage('Error loading group members: ' + error.message);
            }
        });
    }
})
```

### Form Variable Population

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['catalog_item_variables'],
    type: 'onChange',
    field: 'request_item',
    table: 'sc_req_item',
    name: 'Populate Catalog Variables',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) {
            return;
        }

        const form = g_form;
        const ga = new GlideAjax('CatalogItemUtils');
        ga.addParam('sysparm_name', 'findVariables');
        ga.addParam('sysparm_request_item', newValue);

        ga.getXMLAnswer(function(answer) {
            try {
                const variables = JSON.parse(answer);

                // Populate each variable
                Object.keys(variables).forEach(field => {
                    form.setValue(field, variables[field]);
                });

                form.addInfoMessage('Catalog variables populated');
            } catch (error) {
                form.addErrorMessage('Error populating variables: ' + error.message);
            }
        });
    }
})
```

---

## Best Practices

✓ **Separate metadata from logic** - `.now.ts` defines; `.client.js` implements
✓ **Use TypeScript for type safety** - Catch errors at compile time
✓ **Always check isLoading** - Prevents overlapping requests
✓ **Use async getXMLAnswer** - Never use getXMLWait
✓ **Handle errors gracefully** - Try-catch for JSON parsing
✓ **Avoid direct DOM manipulation** - Use g_form API only
✓ **Use g_scratchpad from server** - Avoid redundant GlideAjax calls
✓ **Test on all form layouts** - Desktop, mobile, workspace
✓ **Log important operations** - Use console.log for debugging
✓ **Keep scripts focused** - Complex logic should be in Script Includes

---

## JavaScript Modules in Client Scripts

JavaScript modules enable you to organize and reuse code within client-side scripts. A module is a JavaScript file containing related code shared and reused across forms and applications.

### Module Fundamentals

**What are modules:**
- JavaScript files containing reusable, exportable code
- Stored in the EcmaScript Module [sys_module] table after installation
- Supported through TypeScript and import/export statements
- Scoped to the application where they're defined

**Module limitations:**
- Modules can only be used within the application scope where they're added
- Application customizations aren't supported
- CommonJS modules from third-party libraries require proper `exports` definitions
- Node.js APIs aren't supported (ServiceNow SDK polyfills built-in modules)
- Global variables related to web APIs aren't supported

### Exporting Code from Modules

Use `export` statements to identify code for reuse. You can use named exports or default exports:

**Named exports** (recommended for multiple features):
```javascript
// utilities/form-helpers.js
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatPhoneNumber(phone) {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

export const DEFAULT_PRIORITY = '3';
```

**Default exports** (for single primary export):
```javascript
// utilities/priority-calculator.js
export default function calculatePriorityLevel(urgency, impact) {
    return Math.min(urgency + impact, 5);
}
```

### Importing Modules in Client Scripts

Use `import` statements to bring module code into your client scripts:

**Import named exports:**
```typescript
import { ClientScript } from '@servicenow/sdk/core'
import { validateEmail, formatPhoneNumber, DEFAULT_PRIORITY } from '#form-helpers'

export const cs = ClientScript({
    $id: Now.ID['contact_validation'],
    type: 'onChange',
    field: 'email',
    table: 'contact',
    name: 'Validate Contact Email',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) return;

        const form = g_form;
        if (!validateEmail(newValue)) {
            form.addErrorMessage('Invalid email format');
        }
    }
})
```

**Import default exports:**
```typescript
import { ClientScript } from '@servicenow/sdk/core'
import calculatePriority from '#priority-calculator'

export const cs = ClientScript({
    $id: Now.ID['priority_calculator'],
    type: 'onLoad',
    table: 'incident',
    name: 'Calculate Priority',
    script: () => {
        const form = g_form;
        const urgency = parseInt(form.getValue('urgency')) || 3;
        const impact = parseInt(form.getValue('impact')) || 3;

        const priority = calculatePriority(urgency, impact);
        form.setValue('priority', priority.toString());
    }
})
```

### Module Import Shortcuts via package.json

You can use shorthand imports by defining mappings in your application's `package.json`:

**Define import shortcuts:**
```json
{
    "name": "incident-management",
    "version": "1.0.0",
    "imports": {
        "#form-helpers": "./src/utilities/form-helpers.js",
        "#validators": "./src/utilities/validators.js",
        "#priority-calculator": "./src/utilities/priority-calculator.js"
    },
    "dependencies": {}
}
```

**Use the shortcuts:**
```typescript
// Instead of: import { validateEmail } from '../utilities/form-helpers.js'
import { validateEmail } from '#form-helpers'
import calculatePriority from '#priority-calculator'
```

### Using Third-Party Libraries

Add npm dependencies to your application's `package.json`:

```json
{
    "name": "incident-management",
    "version": "1.0.0",
    "dependencies": {
        "moment": "2.29.4",
        "uuid": "9.0.0"
    }
}
```

**Import and use third-party modules:**
```typescript
import { ClientScript } from '@servicenow/sdk/core'
import { v4 as uuidv4 } from 'uuid'

export const cs = ClientScript({
    $id: Now.ID['generate_ticket_id'],
    type: 'onLoad',
    table: 'incident',
    name: 'Generate Unique Ticket ID',
    script: () => {
        const ticketId = uuidv4();
        g_form.setValue('ticket_uuid', ticketId);
    }
})
```

### Importing Server APIs in Modules

To use Glide Server APIs within a module, import them from the `@servicenow/glide` package:

**Import from global namespace:**
```javascript
// utilities/server-functions.js
import { gs } from '@servicenow/glide';
import { GlideRecord } from '@servicenow/glide';

export function getUserFullName(userId) {
    const userRecord = new GlideRecord('sys_user');
    userRecord.addQuery('sys_id', userId);
    userRecord.query();

    if (userRecord.next()) {
        return userRecord.getValue('first_name') + ' ' + userRecord.getValue('last_name');
    }
    return 'Unknown User';
}
```

**Import from specific namespaces:**
```javascript
// utilities/rest-integration.js
import { RESTAPIRequest, RESTAPIResponse } from '@servicenow/glide/sn_ws_int';

export function handleRestRequest(request, response) {
    const body = request.getBody();
    response.setStatus(200);
    response.setContentType('application/json');
    response.setBody(JSON.stringify({ processed: true }));
}
```

### Module Organization Patterns

**Utility functions by domain:**
```
src/
├── client-scripts/
│   ├── incident-form.now.ts
│   ├── change-form.now.ts
│   └── handlers/
│       └── incident-handlers.client.js
└── modules/
    ├── validators/
    │   ├── email-validator.js
    │   ├── phone-validator.js
    │   └── date-validator.js
    ├── formatters/
    │   ├── phone-formatter.js
    │   └── currency-formatter.js
    └── helpers/
        ├── form-helpers.js
        └── api-helpers.js
```

**Reusing utilities across multiple client scripts:**
```typescript
// incident-form.now.ts
import { validateEmail } from '#validators/email-validator'
import { formatPhoneNumber } from '#formatters/phone-formatter'

export const cs = ClientScript({
    // Uses shared validators and formatters
})
```

### Best Practices for Modules

✓ **Group by domain** — Keep related utilities together (validators, formatters, helpers)
✓ **Use named exports** — Easier to track what's being used and refactor
✓ **Document module purpose** — Add JSDoc comments explaining the module's role
✓ **Avoid circular dependencies** — Unidirectional imports prevent issues
✓ **Keep modules focused** — Single responsibility per module
✓ **Use consistent naming** — File names should reflect exported content
✓ **Version third-party libraries** — Pin versions in `package.json` for consistency
✓ **Test modules independently** — Unit test utility functions before using in scripts

---

## Comparison: Classic vs Fluent

| Aspect | Classic | Fluent |
|--------|---------|--------|
| Definition | UI form in instance | TypeScript `.now.ts` file |
| Type safety | None | Full TypeScript support |
| Metadata | Inline in UI | Explicit in code |
| Version control | Manual export | Git tracking |
| Testing | Manual UI testing | Automated testing possible |
| IDE support | None | Full intellisense |
| Documentation | Inline comments | Code is documentation |

---

## Key APIs (g_form)

| API | Purpose |
|-----|---------|
| `setValue(field, value)` | Set field value |
| `getValue(field)` | Get field value |
| `setVisible(field, boolean)` | Show/hide field |
| `setMandatory(field, boolean)` | Make field required |
| `setReadOnly(field, boolean)` | Make field read-only |
| `addOnChange(field, callback)` | Register change listener |
| `addErrorMessage(msg)` | Show error |
| `addInfoMessage(msg)` | Show info |
| `addWarningMessage(msg)` | Show warning |
| `isNewRecord()` | Check if new |
| `getTableName()` | Get table name |
| `getUniqueValue()` | Get sys_id |

---

## When to Use Fluent SDK Client Scripts

- ✓ New SDK projects and applications
- ✓ TypeScript-based development
- ✓ Full-stack SDK applications
- ✓ Version control and CI/CD
- ✓ Team knows TypeScript
- ✓ Type-safe form handling

For instance-based customizations, see [CLASSIC.md](CLASSIC.md) for traditional client script patterns.
