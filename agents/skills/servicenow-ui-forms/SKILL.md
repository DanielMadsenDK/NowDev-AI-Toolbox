---
name: servicenow-ui-forms
user-invocable: false
description: Manipulate form field state using g_form APIs — no server calls required. Covers field value get/set, mandatory/read-only/hidden control, inline validation and error messages, section and tab visibility, and form state checks. Use for dynamic/runtime field manipulation triggered by user actions (onChange, onLoad, onSubmit). For static field behavior based on conditions, prefer UI Policies instead — they load faster and don't require scripting. For scripts requiring GlideAjax server communication, use the servicenow-client-scripts skill. Trigger this skill whenever the user needs to control field visibility, mandatory state, read-only state, field values, or form messages in a ServiceNow client script without making server calls.
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
- **Use UI Policies for static field behavior** — they load faster and don't require scripting
- Avoid DOM access; always use g_form API
- Test with different form layouts before production
- Validate user input client-side before submission
- Log form submissions for debugging

## UI Policies vs g_form

**Use UI Policies for:**
- Conditional field visibility (show/hide) based on another field value
- Making fields read-only or editable based on conditions
- Marking fields as mandatory or optional based on conditions
- Clearing field values automatically
- Setting static field values
- Controlling related list visibility
- Static behavior based on encoded query conditions
- **Performance-critical scenarios** — UI Policies don't require client-side scripts

**Use g_form for:**
- Dynamic field manipulation triggered by user actions (onChange, onLoad, onSubmit)
- Complex logic requiring server communication via GlideAjax
- Custom validation with specific error messages
- Responsive behavior that changes based on user interactions
- Cascading field updates beyond simple conditional logic
- Form state checks and manipulation
- Setting field values dynamically from script logic

**Performance tip:** If your logic can be expressed as "if field X equals Y, then show field Z", **always use a UI Policy**. UI Policies are declarative and don't require async callbacks, making them significantly faster than client scripts that call g_form methods.

**Example — Use UI Policy instead of g_form:**
```javascript
// ❌ NOT RECOMMENDED: Client script using g_form
function onChange(control, oldValue, newValue, isLoading) {
    if (newValue === 'hardware') {
        g_form.setMandatory('asset_tag', true);
        g_form.setVisible('serial_number', true);
    } else {
        g_form.setMandatory('asset_tag', false);
        g_form.setVisible('serial_number', false);
    }
}

// ✅ RECOMMENDED: UI Policy
UiPolicy({
  $id: Now.ID['category_hardware_policy'],
  table: 'incident',
  conditions: 'category="hardware"',
  actions: [
    { field: 'asset_tag', mandatory: true, visible: true },
    { field: 'serial_number', visible: true }
  ]
})
```

For complete UI Policy documentation, see the **servicenow-fluent-development** skill: **UI-POLICY-API.md**.

## Key APIs

| API | Purpose |
|-----|---------|
| g_form | Primary form manipulation API |
| g_scratchpad | Server-to-client data passing |
| g_user | Current user information |
| GlideModal | Modal dialog management |
| GlideAjax | Async server communication |
| onChange | Field value change handler |
| onLoad | Form initialization handler |
| onSubmit | Form submission validation |

## Examples

For working code examples covering field manipulation, UI actions, dynamic form behavior, and service catalog UI policies, see [EXAMPLES.md](./EXAMPLES.md)

## Reference

For g_form field manipulation, form event patterns, and performance optimization, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)