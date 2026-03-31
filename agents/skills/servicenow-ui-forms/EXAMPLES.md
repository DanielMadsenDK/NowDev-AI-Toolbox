# UI Forms & Actions - Code Examples

Examples for form field manipulation, UI actions, and form-based workflows.

## Table of Contents

1. [Form Field Manipulation](#form-field-manipulation)
2. [UI Actions - Form and List](#ui-actions---form-and-list)
3. [Dynamic Form Behavior](#dynamic-form-behavior)
4. [Service Catalog UI Policies](#service-catalog-ui-policies)

---

## Form Field Manipulation

### Setting and Getting Field Values

```javascript
// Get field value
var priority = g_form.getValue('priority');
var description = g_form.getDisplayValue('assignment_group');

// Set field value
g_form.setValue('priority', '1');
g_form.setValue('urgency', '2');

// Check if field has changed
if (g_form.hasChanged('state')) {
    var newState = g_form.getValue('state');
    gs.info('State changed to: ' + newState);
}

// Get previous value
var previousValue = g_form.getModifiedFields()['priority'];
```

### Making Fields Mandatory/Optional

```javascript
// Make field mandatory
g_form.setMandatory('short_description', true);
g_form.setMandatory('category', true);

// Make field optional
g_form.setMandatory('description', false);

// Conditionally require field based on category
var category = g_form.getValue('category');
if (category === 'change') {
    g_form.setMandatory('u_change_type', true);
    g_form.setMandatory('u_impact', true);
} else {
    g_form.setMandatory('u_change_type', false);
    g_form.setMandatory('u_impact', false);
}
```

### Controlling Field Visibility

```javascript
// Hide field
g_form.setVisible('internal_notes', false);

// Show field
g_form.setVisible('u_advanced_options', true);

// Toggle visibility
var isVisible = g_form.isVisible('u_advanced_options');
g_form.setVisible('u_advanced_options', !isVisible);

// Show/hide multiple fields
var advancedFields = ['u_field1', 'u_field2', 'u_field3'];
advancedFields.forEach(function (field) {
    g_form.setVisible(field, true);
});
```

### Making Fields Read-Only

```javascript
// Make field read-only
g_form.setReadOnly('number', true);
g_form.setReadOnly('created_on', true);

// Make field editable
g_form.setReadOnly('description', false);

// Conditionally lock fields
var state = g_form.getValue('state');
if (state === 'closed') {
    g_form.setReadOnly('priority', true);
    g_form.setReadOnly('assignment_group', true);
} else {
    g_form.setReadOnly('priority', false);
    g_form.setReadOnly('assignment_group', false);
}
```

### Disabling Fields

```javascript
// Disable field
g_form.setDisabled('approval_comments', true);

// Enable field
g_form.setDisabled('approval_comments', false);

// Disable based on condition
var requestType = g_form.getValue('request_type');
g_form.setDisabled('u_special_handling', requestType !== 'special');
```

---

## UI Actions - Form and List

**File:** `incident-ui-actions.now.ts`

```typescript
import { UiAction } from '@servicenow/sdk/core'

// Resolve Incident - Form Action
export const resolveIncidentAction = UiAction({
    $id: Now.ID['resolve_incident_action'],
    table: 'incident',
    actionName: 'Resolve',
    description: 'Resolve the incident',
    active: true,
    condition: "state != 'resolved' AND state != 'closed'",
    form: {
        showButton: true,
        showLink: true,
        style: 'primary',
    },
    list: {
        showLink: false,
        showButton: false,
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

// Assign to Me - Both Form and List
export const assignToMeAction = UiAction({
    $id: Now.ID['assign_to_me_action'],
    table: 'incident',
    actionName: 'Assign to Me',
    description: 'Assign this incident to myself',
    active: true,
    condition: "NOT assigned_to = '" + gs.getUserID() + "'",
    form: {
        showButton: true,
        showLink: true,
        style: 'default',
    },
    list: {
        showLink: true,
        showButton: true,
        style: 'default',
    },
    script: `
        current.assigned_to = gs.getUserID();
        current.assignment_group = gs.getUser().getDisplayValue('default_group');
        current.update();
        action.setRedirectURL(current);
    `,
    roles: ['itil', 'support'],
})

// Escalate - Destructive Style
export const escalateAction = UiAction({
    $id: Now.ID['escalate_incident_action'],
    table: 'incident',
    actionName: 'Escalate',
    description: 'Escalate incident to management',
    active: true,
    condition: "priority IN ('1', '2') AND state = 'in_progress'",
    form: {
        showButton: true,
        showLink: true,
        style: 'destructive',
    },
    list: {
        showLink: false,
        showButton: false,
    },
    script: `
        if (current.escalation_level == '') {
            current.escalation_level = '1';
        } else {
            current.escalation_level = parseInt(current.escalation_level) + 1;
        }
        current.escalated_on = new GlideDateTime().toString();
        current.update();

        var mgr = gs.getUser().getManagerID();
        var email = new GlideEmailOutbound();
        email.setTo(gs.getUser(mgr).getEmail());
        email.setSubject('Escalated Incident: ' + current.number);
        email.setBody('Incident ' + current.number + ' has been escalated.');
        email.send();

        action.setRedirectURL(current);
    `,
    roles: ['itil'],
})

// Add to Change Request
export const addToChangeAction = UiAction({
    $id: Now.ID['add_to_change_action'],
    table: 'incident',
    actionName: 'Add to Change',
    description: 'Link this incident to a change request',
    active: true,
    condition: "category = 'software' OR category = 'hardware'",
    form: {
        showButton: true,
        showLink: true,
        style: 'default',
    },
    list: {
        showLink: true,
        showButton: false,
    },
    script: `
        var dialog = new GlideDialog('x_change_dialog', true);
        dialog.on('ok', function(change_id) {
            current.change_request = change_id;
            current.update();
            action.setRedirectURL(current);
        });
    `,
    roles: ['itil'],
})

// Export Summary - List Action
export const exportSummaryAction = UiAction({
    $id: Now.ID['export_summary_action'],
    table: 'incident',
    actionName: 'Export Summary',
    description: 'Export incident summary to PDF',
    active: true,
    form: {
        showButton: false,
        showLink: false,
    },
    list: {
        showLink: true,
        showButton: true,
        style: 'default',
    },
    script: `
        var redirectUrl = '/api/now/table/incident/' + current.sys_id + '/export?format=pdf';
        action.setRedirectURL(redirectUrl);
    `,
    roles: ['itil', 'admin'],
})
```

---

## Dynamic Form Behavior

### Show/Hide Sections Based on Selection

```javascript
(function onLoadDynamicSections() {
    var form = g_form;

    // Hide advanced section initially
    form.setVisible('u_advanced_section', false);

    // Show/hide based on incident type
    var incidentType = form.getValue('u_type');
    updateSectionVisibility(incidentType);

    // Add change listener
    form.addOnChange('u_type', function () {
        var newType = form.getValue('u_type');
        updateSectionVisibility(newType);
    });

    function updateSectionVisibility(type) {
        if (type === 'complex') {
            form.setVisible('u_advanced_section', true);
            form.setMandatory('u_advanced_field1', true);
        } else {
            form.setVisible('u_advanced_section', false);
            form.setMandatory('u_advanced_field1', false);
        }
    }
})();
```

### Cascading Field Updates

```javascript
(function onLoadCascading() {
    var form = g_form;

    // Country change affects state options
    form.addOnChange('country', function () {
        var country = form.getValue('country');

        if (country === 'USA') {
            // Load US states
            form.setValue('state', '');
            // In real implementation, update reference choices
        } else if (country === 'Canada') {
            // Load Canadian provinces
            form.setValue('state', '');
        }
    });

    // Priority change affects urgency
    form.addOnChange('priority', function () {
        var priority = form.getValue('priority');

        if (priority === '1') {
            form.setValue('urgency', '1');
        } else if (priority === '2') {
            form.setValue('urgency', '2');
        } else {
            form.setValue('urgency', '3');
        }
    });
})();
```

### Dynamic Field Formatting

```javascript
(function onLoadFormatting() {
    var form = g_form;

    // Format phone number as user types
    form.addOnChange('phone_number', function () {
        var phone = form.getValue('phone_number');
        // Format: (XXX) XXX-XXXX
        var formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        form.setValue('phone_number', formatted);
    });

    // Auto-capitalize names
    form.addOnChange('full_name', function () {
        var name = form.getValue('full_name');
        var capitalized = name
            .split(' ')
            .map(function (word) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
        form.setValue('full_name', capitalized);
    });
})();
```

---

## Service Catalog UI Policies

**UI Policy - Show/Hide Based on Variable Selection**

```javascript
/**
 * UI Policy for Laptop Request Catalog Item
 *
 * Rules:
 * 1. If model is "MacBook Pro", show "Apple Care" option
 * 2. If RAM > 16GB, show "High Performance Cooling" option
 * 3. If delivery location is "International", make delivery notes mandatory
 */

function evaluatePolicy() {
    var model = g_form.getValue('model');
    var ram = g_form.getValue('ram');
    var location = g_form.getValue('delivery_location');

    // Rule 1: MacBook Pro specific options
    if (model === 'MacBook Pro') {
        g_form.setVisible('apple_care', true);
        g_form.setVisible('os_version', true);
    } else {
        g_form.setVisible('apple_care', false);
        g_form.setVisible('os_version', false);
    }

    // Rule 2: High RAM options
    if (ram === '32GB') {
        g_form.setVisible('advanced_cooling', true);
        g_form.setVisible('extended_warranty', true);
    } else {
        g_form.setVisible('advanced_cooling', false);
        g_form.setVisible('extended_warranty', false);
    }

    // Rule 3: International delivery
    if (location === 'international') {
        g_form.setMandatory('delivery_notes', true);
        g_form.setMandatory('import_export_info', true);
    } else {
        g_form.setMandatory('delivery_notes', false);
        g_form.setMandatory('import_export_info', false);
    }
}

// Execute policy on form load and when variables change
evaluatePolicy();

g_form.addOnChange('model', evaluatePolicy);
g_form.addOnChange('ram', evaluatePolicy);
g_form.addOnChange('delivery_location', evaluatePolicy);
```

---

## Best Practices Demonstrated

✓ **Conditional Display** - Show/hide based on values
✓ **Field Validation** - Make fields mandatory as needed
✓ **User Feedback** - Clear error messages
✓ **Performance** - Limit expensive operations in onChange
✓ **Accessibility** - Use proper field labels and help text
✓ **Consistent Styling** - Use standard button styles (primary, default, destructive)

---

## Common UI Patterns

| Pattern | Use Case |
|---------|----------|
| Conditional Visibility | Show advanced options only when needed |
| Cascading Updates | Update related fields automatically |
| Dynamic Validation | Change requirements based on context |
| Confirmation Dialogs | Warn user before destructive actions |
| Field Locking | Prevent edits after approval |

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| Form not responding | ✓ Check browser console for errors |
| Field not updating | ✓ Verify field name exactly |
| onChange not firing | ✓ Use g_form.addOnChange, not inline events |
| Mandatory not working | ✓ Field must exist in form schema |
| Visibility toggle stuck | ✓ Clear browser cache |

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for complete g_form API reference and advanced patterns.
