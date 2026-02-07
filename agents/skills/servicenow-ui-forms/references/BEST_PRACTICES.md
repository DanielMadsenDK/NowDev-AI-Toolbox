# Best Practices — UI Forms

## g_form Field Manipulation

### Safe Field Access
```javascript
// ✓ CORRECT - use g_form API
function updatefield() {
    g_form.setValue('priority', '1');
    g_form.setLabel('priority', 'Critical Priority');
    var value = g_form.getValue('priority');
    var display = g_form.getDisplayValue('priority');
}

// ✓ CORRECT - catch null fields
function setupField() {
    var field = g_form.getField('custom_field');
    if (!field) {
        gs.warn('Field does not exist on form');
        return;
    }
    g_form.setVisible('custom_field', true);
}

// ✗ WRONG - direct DOM access (breaks in different layouts)
var element = document.getElementById('sysparm_priority');
element.value = '1'; // May not work in all form layouts!

// ✗ WRONG - unreliable selectors
var input = document.querySelector('input[name="priority"]');
input.value = '1'; // Not guaranteed to exist!
```

### Field Value Operations
```javascript
// Get different representations
var priority = g_form.getValue('priority');           // sys_id
var priorityDisplay = g_form.getDisplayValue('priority'); // Label
var priorityName = g_form.getElement()
    .querySelector('[data-field-name="priority"]')
    .getAttribute('aria-label');

// Set values with validation
g_form.setValue('assignment_group', 'sys_id_value');

// Get reference field metadata
var caller = g_form.getReference('caller_id', function(ref) {
    gs.info('Caller: ' + ref.name);
    gs.info('Email: ' + ref.email);
});
```

## Form Visibility and Editing

### Control Field Visibility
```javascript
// Hide/show based on conditions
function toggleAdvancedFields() {
    var showAdvanced = g_form.getValue('show_advanced') === 'true';
    
    g_form.setVisible('custom_field1', showAdvanced);
    g_form.setVisible('custom_field2', showAdvanced);
    g_form.setVisible('custom_field3', showAdvanced);
}

// Make fields read-only
function setReadOnly() {
    g_form.setReadOnly('assignment_group', true);
    g_form.setReadOnly('priority', true);
}

// Make fields mandatory
function setMandatory() {
    g_form.setMandatory('short_description', true);
    g_form.setMandatory('assignment_group', true);
}
```

### Disable/Enable Fields
```javascript
// Conditionally enable fields
function updateAvailability() {
    var state = g_form.getValue('incident_state');
    
    switch (state) {
        case 'closed':
            g_form.setDisabled('comments', true);
            g_form.setDisabled('work_notes', true);
            break;
        case 'open':
            g_form.setDisabled('comments', false);
            g_form.setDisabled('work_notes', false);
            break;
    }
}

// Prevent editing of system fields
function protectSystemFields() {
    g_form.setReadOnly('sys_created_on', true);
    g_form.setReadOnly('sys_created_by', true);
    g_form.setReadOnly('sys_updated_on', true);
}
```

## Form Validation

### Client-Side Validation
```javascript
// ✓ CORRECT - client validation for UX
function validateForm() {
    var errors = [];
    
    // Check required fields
    var shortDesc = g_form.getValue('short_description');
    if (!shortDesc || shortDesc.trim() === '') {
        errors.push('Short Description is required');
    }
    
    // Check field values
    var priority = g_form.getValue('priority');
    if (!priority) {
        errors.push('Priority is required');
    }
    
    // Check length
    var description = g_form.getValue('description');
    if (description && description.length > 4000) {
        errors.push('Description cannot exceed 4000 characters');
    }
    
    // Show errors
    if (errors.length > 0) {
        g_form.addErrorMessage(errors.join('\n'));
        return false;
    }
    
    return true;
}

// OnSubmit handler
function onSubmit() {
    if (!validateForm()) {
        return false; // Prevent submit
    }
    return true;
}

// ✓ IMPORTANT - Always validate SERVER-SIDE too
// Client validation is for UX only, not security
```

### Display Validation Messages
```javascript
// Add error message
g_form.addErrorMessage('This field is invalid');

// Add info message
g_form.addInfoMessage('Record will be processed overnight');

// Clear messages
g_form.clearMessages();

// Field-level error
g_form.setFieldError('priority', 'Priority must be 1 or 2');

// Mark field as invalid
g_form.setFieldMessagesVisible('priority', true);
```

## Form Event Handlers

### OnLoad Handler
```javascript
function onLoad() {
    // Called when form first loads
    
    // Initialize based on form state
    var isNew = g_form.isNewRecord();
    if (isNew) {
        g_form.setValue('created_from', gs.getUserID());
        g_form.setVisible('assignment_group', false);
    } else {
        g_form.setVisible('assignment_group', true);
        setupAdvancedFields();
    }
    
    // Set field defaults
    g_form.setValue('priority', '3');
    
    // Disable certain fields
    g_form.setReadOnly('created_on', true);
}

function setupAdvancedFields() {
    // Complex initialization
    g_form.setValue('category', 'software');
}
```

### OnChange Handler
```javascript
function onChangeAssignmentGroup() {
    // Called when assignment_group field changes
    
    var groupId = g_form.getValue('assignment_group');
    
    // Fetch group info and update UI
    var groupInfo = getGroupInfo(groupId);
    g_form.setLabel('assignment_group', 'Group: ' + groupInfo.name);
    
    // Update related fields
    g_form.setValue('assignment_team', groupInfo.default_team);
    
    // Clear dependent fields
    g_form.clearValue('assigned_to');
}

function onChangePriority() {
    var priority = g_form.getValue('priority');
    
    if (priority === '1') { // Critical
        g_form.setVisible('escalation_notes', true);
        g_form.setMandatory('escalation_notes', true);
    } else {
        g_form.setVisible('escalation_notes', false);
        g_form.setMandatory('escalation_notes', false);
    }
}
```

### OnSave Handler
```javascript
function onSave() {
    // Final validation before submit
    
    // Validate required fields
    if (!g_form.getValue('assignment_group')) {
        g_form.addErrorMessage('Assignment Group is required');
        return false;
    }
    
    // Complex validation
    if (!validateBusinessRules()) {
        return false;
    }
    
    // Log save event
    gs.info('Form saved by: ' + gs.getUserID());
    
    return true; // Allow save
}
```

## AJAX Patterns

### GlideAjax Calls
```javascript
// ✓ CORRECT - use async AJAX
function lookupUserInfo() {
    var ga = new GlideAjax('MyAjaxScript');
    ga.addParam('sysparm_name', 'getUserInfo');
    ga.addParam('user_id', g_form.getValue('user'));
    
    ga.getXML(function(response) {
        if (response.responseXML.documentElement.getAttribute('status') === 'success') {
            var userEmail = response.responseXML.documentElement
                .getAttribute('email');
            g_form.setValue('user_email', userEmail);
        } else {
            g_form.addErrorMessage('User not found');
        }
    });
}

// ✗ WRONG - blocks form
var answer = g_form.getXMLWait('MyScript', 'getSomething');

// ✗ WRONG - blocks browser
var result = gs.getXMLWait();
```

### Async Field Population
```javascript
function populateDependentField() {
    var parentValue = g_form.getValue('category');
    
    // Show loading state
    g_form.setLabel('subcategory', 'Loading...');
    g_form.setDisabled('subcategory', true);
    
    var ga = new GlideAjax('FieldLookup');
    ga.addParam('category', parentValue);
    
    ga.getXML(function(response) {
        var options = response.responseXML
            .documentElement
            .getAttribute('options');
        
        // Update field
        updateSelectOptions('subcategory', JSON.parse(options));
        
        // Re-enable field
        g_form.setDisabled('subcategory', false);
        g_form.setLabel('subcategory', 'Sub-Category');
    });
}
```

## Reference Fields

### Reference Field Best Practices
```javascript
// ✓ CORRECT - handle reference field safely
function setupCallerField() {
    // Get reference field value
    var callerId = g_form.getValue('caller_id');
    var callerDisplay = g_form.getDisplayValue('caller_id');
    
    // Fetch reference data efficiently
    g_form.getReference('caller_id', function(ref) {
        if (ref) {
            gs.info('Caller name: ' + ref.name);
            gs.info('Caller email: ' + ref.email);
            
            // Use async populate
            g_form.setValue('caller_email', ref.email);
            g_form.setValue('caller_phone', ref.phone);
        } else {
            g_form.addErrorMessage('Caller not found');
        }
    });
}

// ✗ WRONG - dot-walking in JavaScript
var callerEmail = g_form.getValue('caller_id.email'); // Won't work!

// ✓ CORRECT - use getReference asynchronously
g_form.getReference('caller_id', function(ref) {
    var email = ref.email; // Now safe
});
```

## Form Optimization

### Performance Best Practices
```javascript
// ✗ INEFFICIENT - OnChange triggers for every keystroke
function onChangeDescription() {
    // Query database on every keystroke
    getRelatedRecords();
}

// ✓ EFFICIENT - Debounce expensive operations
var debounceTimer;
function onChangeDescription() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
        getRelatedRecords();
    }, 800); // Wait 800ms after user stops typing
}

// ✓ EFFICIENT - Cache AJAX results
var _fieldLookupCache = {};
function getCachedFieldData(key) {
    if (_fieldLookupCache[key]) {
        return _fieldLookupCache[key];
    }
    
    var ga = new GlideAjax('FieldLookup');
    ga.addParam('key', key);
    ga.getXML(function(response) {
        var data = response.responseXML.documentElement;
        _fieldLookupCache[key] = data;
        handleLookupResult(data);
    });
}
```

### Avoid Redundant Operations
```javascript
// ✗ WRONG - refreshes entire form
function updateMultipleFields() {
    g_form.setValue('field1', value1);
    // Form refreshes
    g_form.setValue('field2', value2);
    // Form refreshes again
    g_form.setValue('field3', value3);
    // And again!
}

// ✓ CORRECT - batch updates via AJAX call
var ga = new GlideAjax('FormProcessor');
ga.addParam('field1', value1);
ga.addParam('field2', value2);
ga.addParam('field3', value3);
ga.getXML(function(response) {
    // Handle all updates at once
});
```

## Anti-Patterns

### ✗ Direct DOM Manipulation
```javascript
// WRONG - form layout independent code
var elem = document.querySelector('.form-control');
elem.style.display = 'none';

// CORRECT
g_form.setVisible('field_name', false);
```

### ✗ Hardcoded Field Names
```javascript
// WRONG - breaks if field updates
g_form.setValue('inc_priority', '1');

// CORRECT - use table column name
g_form.setValue('priority', '1');
```

### ✗ Form Refresh in Loops
```javascript
// WRONG - refreshes form multiple times
for (var i = 0; i < fields.length; i++) {
    g_form.setValue(fields[i], values[i]);
    g_form.refreshDisplay(); // Multiple refreshes!
}

// CORRECT - single refresh
for (var i = 0; i < fields.length; i++) {
    g_form.setValue(fields[i], values[i]);
}
g_form.refreshDisplay(); // Single refresh
```

### ✗ Synchronous AJAX
```javascript
// WRONG - blocks form interaction
var answer = g_form.getXMLWait('script', 'function');

// CORRECT - use async callback
var ga = new GlideAjax('script');
ga.getXML(function(response) {
    // Handle asynchronously
});
```

## Mobile & Responsive Considerations

### Handle Different Layouts
```javascript
function initializeForm() {
    // Use g_form API - works on all layouts
    g_form.setVisible('advanced', false);
    g_form.setMandatory('title', true);
    
    // Responsive design handled by platform
    // Don't assume specific form layout
}

// ✗ WRONG - assumes desktop layout
function onMobile() {
    var form = document.querySelector('.form-wrapper');
    form.style.width = '100%'; // May break mobile view
}

// ✓ CORRECT - platform handles responsive
// Your code works automatically on mobile
```