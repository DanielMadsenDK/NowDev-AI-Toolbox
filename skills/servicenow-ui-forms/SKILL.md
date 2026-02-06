---
name: servicenow-ui-forms
description: Manipulate form fields, sections, and user interactions using GlideForm. Covers field updates, validation, visibility control, and form state management. Use for client-side form customization, OnChange/OnLoad scripts, field validation, and dynamic UI behavior.
---

# Customize UI Forms

## Quick start

**Field manipulation**:

```javascript
// Get/set values
g_form.setValue('field_name', 'new_value');
var value = g_form.getValue('field_name');

// Get display value (for reference fields)
var display = g_form.getDisplayValue('field_name');

// Set display value to avoid server calls
g_form.setValue('ref_field', 'sys_id', 'display_value');
```

**Field properties**:

```javascript
// Mandatory
g_form.setMandatory('field_name', true);
var isMandatory = g_form.isMandatory('field_name');

// Read-only
g_form.setReadonly('field_name', true);
var isReadonly = g_form.isReadonly('field_name');

// Hidden
g_form.setHidden('field_name', true);
var isHidden = g_form.isHidden('field_name');

// Disabled
g_form.setDisabled('field_name', true);
```

**Validation**:

```javascript
// Add validation error
g_form.setFieldError('field_name', 'Error message here');

// Clear validation error
g_form.clearFieldError('field_name');

// Form-level validation
function onSubmit() {
    if (g_form.getValue('priority') < 2 && !g_form.getValue('assignment_group')) {
        g_form.addErrorMessage('Assignment group required for high priority');
        return false;
    }
    return true;
}
```

**Sections and tabs**:

```javascript
// Control section visibility
g_form.setVisible('section_name', true);

// Hide tab
g_form.switchToTab('tab_name');

// Set section label
g_form.setLabel('section_name', 'New Label');
```

**Form state**:

```javascript
// Check if form is new record
var isNewRecord = g_form.isNewRecord();

// Get table name
var tableName = g_form.getTableName();

// Get form metadata
var control = g_form.getControl('field_name');
```

## Common patterns

**OnLoad initialization**:

```javascript
function onLoad() {
    var status = g_form.getValue('state');
    
    if (status === 'resolved') {
        g_form.setReadonly('resolution_details', true);
    }
    
    // Use g_scratchpad for server-pushed data
    if (g_scratchpad && g_scratchpad.requires_approval) {
        g_form.setMandatory('approval_notes', true);
    }
}
```

**OnChange field dependencies**:

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) return;
    
    if (newValue === 'high') {
        g_form.setMandatory('assignment_group', true);
        g_form.setVisible('escalation_details', true);
    } else {
        g_form.setMandatory('assignment_group', false);
        g_form.setVisible('escalation_details', false);
    }
}
```

**OnSubmit validation**:

```javascript
function onSubmit() {
    var category = g_form.getValue('category');
    var subCategory = g_form.getValue('sub_category');
    
    if (!subCategory && category === 'Hardware') {
        g_form.addErrorMessage('Sub-category required for Hardware');
        return false;
    }
    
    return true;
}
```

## Best practices

- Use `setValue(field, id, display)` to avoid extra server calls
- Keep OnChange scripts focused and performant
- Use g_scratchpad to pass data from server without extra calls
- Always check `isLoading` to prevent redundant operations
- Use UI Policies for simple visibility/mandatory logic
- Avoid DOM access; always use g_form API
- Test with different form layouts before production
- Validate user input client-side before submission
- Log form submissions for debugging

## Reference

For g_form field manipulation, form event patterns, and performance optimization, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)