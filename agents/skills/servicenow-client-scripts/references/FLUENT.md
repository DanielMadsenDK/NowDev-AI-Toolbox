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

---

## Overview

In SDK projects, client scripts are defined using `.now.ts` files (metadata) with handler functions in accompanying `.client.js` files.

### File Structure

```
src/
├── scripts/
│   ├── incident_form_onload.now.ts      # Metadata definition
│   └── handlers/
│       └── incident-form.client.js      # Execution code
```

---

## Form Initialization

### Metadata Definition (.now.ts)

```typescript
import { ClientScript } from '@servicenow/sdk/core'
import { incidentFormOnLoad } from '../handlers/incident-form.client.js'

export default ClientScript({
    $id: Now.ID['incident_onload_script'],
    type: 'onLoad',
    ui_type: 'all',  // 'desktop', 'mobile', 'all'
    table: 'incident',
    global: false,
    name: 'Incident Form OnLoad Handler',
    description: 'Initializes form with defaults and field visibility',
    active: true,
    script: incidentFormOnLoad,
})
```

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

export default ClientScript({
    $id: Now.ID['incident_validation_script'],
    type: 'onSubmit',
    table: 'incident',
    global: false,
    name: 'Incident Validation',
    active: true,
    script: (form = g_form) => {
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

export default ClientScript({
    $id: Now.ID['incident_dynamic_visibility'],
    type: 'onChange',
    element: 'type',  // Watch this field
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

export default ClientScript({
    $id: Now.ID['incident_cascading_update'],
    type: 'onChange',
    element: 'priority',
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

export default ClientScript({
    $id: Now.ID['incident_setup_listeners'],
    type: 'onLoad',
    table: 'incident',
    name: 'Setup Field Listeners',
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

export default ClientScript({
    $id: Now.ID['incident_server_call'],
    type: 'onChange',
    element: 'assignment_group',
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

export default ClientScript({
    $id: Now.ID['catalog_item_variables'],
    type: 'onChange',
    element: 'request_item',
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
