# Classic Client Scripts (Instance-Based)

Patterns for browser-side client scripts using GlideAjax for server communication and form interaction.

## Table of Contents

1. [Form Initialization](#form-initialization)
2. [GlideAjax Communication](#glideajax-communication)
3. [Form Validation](#form-validation)
4. [Dynamic Field Manipulation](#dynamic-field-manipulation)
5. [Event Handling](#event-handling)
6. [Reusable Functions](#reusable-functions)
7. [Best Practices](#best-practices)

---

## Form Initialization

### OnLoad Script - Set Defaults and Read-Only Fields

```javascript
(function onLoad() {
    var form = g_form;

    // Set default values for new records
    if (form.isNewRecord()) {
        form.setValue('priority', '3');
        form.setValue('urgency', '3');
        form.setValue('state', 'new');
    }

    // Make fields read-only
    form.setReadOnly('number', true);
    form.setReadOnly('created_on', true);
    form.setReadOnly('created_by', true);

    // Make description mandatory
    form.setMandatory('description', true);

    // Show/hide fields based on priority
    var priority = form.getValue('priority');
    if (priority === '1' || priority === '2') {
        form.setVisible('escalation_reason', true);
        form.setMandatory('assignment_group', true);
    } else {
        form.setVisible('escalation_reason', false);
    }

    // Disable editing if already assigned
    var assignedTo = form.getValue('assigned_to');
    if (assignedTo) {
        form.setReadOnly('assigned_to', true);
        form.setReadOnly('assignment_group', true);
    }

})();
```

---

## GlideAjax Communication

### Basic GlideAjax Pattern (Async, Non-Blocking)

```javascript
function callServer(methodName, param1) {
    // Always check if already loading
    if (isLoading || !param1) {
        return;
    }

    var ga = new GlideAjax('ScriptIncludeName');  // PascalCase
    ga.addParam('sysparm_name', methodName);      // Method name
    ga.addParam('sysparm_data', param1);          // Data parameter

    // MUST use getXMLAnswer (async), NEVER getXMLWait
    ga.getXMLAnswer(function(answer) {
        if (answer) {
            g_form.setValue('target_field', answer);
            g_form.addInfoMessage('Data loaded successfully');
        }
    });
}
```

### Populate Form Variables from Server

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    // Skip if loading
    if (isLoading || newValue === '') {
        return;
    }

    // Call server to get variables
    var ga = new GlideAjax('CatalogItemUtils');
    ga.addParam('sysparm_name', 'findVariables');
    ga.addParam('sysparm_request_item', newValue);

    ga.getXMLAnswer(function(answer) {
        try {
            // Parse JSON response
            var variables = eval('(' + answer + ')');

            // Populate form fields
            for (var field in variables) {
                if (typeof(variables[field]) === 'string') {
                    g_form.setValue(field, variables[field]);
                }
            }

            g_form.addInfoMessage('Variables populated');
        } catch (error) {
            g_form.addErrorMessage('Error: ' + error.message);
        }
    });
}
```

### Filter List Collector with Server Query

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || newValue === '') {
        return;
    }

    var ga = new GlideAjax('StorageUtils');
    ga.addParam('sysparm_name', 'getFilteredBoxes');
    ga.addParam('sysparm_server_id', newValue);

    ga.getXMLAnswer(function(answer) {
        // Update list collector filter dynamically
        var control = g_form.getControl('storage_box');
        if (control) {
            control.setAttribute('query', 'sys_idIN' + answer);
        }
    });
}
```

### Load User Profile Information

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || newValue === '') {
        g_form.setValue('user_email', '');
        g_form.setValue('user_phone', '');
        return;
    }

    var ga = new GlideAjax('UserProfileUtils');
    ga.addParam('sysparm_name', 'getUserInfo');
    ga.addParam('sysparm_user_id', newValue);

    ga.getXMLAnswer(function(answer) {
        try {
            var userInfo = eval('(' + answer + ')');
            g_form.setValue('user_email', userInfo.email);
            g_form.setValue('user_phone', userInfo.phone);

            // Load profile photo if available
            if (userInfo.photo) {
                var photoElement = document.getElementById('user_photo');
                if (photoElement) {
                    photoElement.src = userInfo.photo;
                }
            }
        } catch (error) {
            g_form.addErrorMessage('Error loading user info: ' + error.message);
        }
    });
}
```

---

## Form Validation

### Client-Side Validation

```javascript
(function onValidate() {
    var form = g_form;
    var isValid = true;

    // Clear previous messages
    form.clearMessages();

    // Validate required fields
    var requiredFields = ['short_description', 'category', 'priority'];
    requiredFields.forEach(function(field) {
        var value = form.getValue(field);
        if (!value) {
            form.addErrorMessage(field + ' is required');
            isValid = false;
        }
    });

    // Validate field lengths
    var desc = form.getValue('short_description');
    if (desc && desc.length < 10) {
        form.addErrorMessage('Short description must be at least 10 characters');
        isValid = false;
    }

    // Validate date logic
    if (form.getValue('start_date') && form.getValue('end_date')) {
        var start = new Date(form.getValue('start_date')).getTime();
        var end = new Date(form.getValue('end_date')).getTime();

        if (start >= end) {
            form.addErrorMessage('End date must be after start date');
            isValid = false;
        }
    }

    return isValid;
})();
```

### Server-Side Validation via GlideAjax

```javascript
(function validateOnSubmit() {
    var form = g_form;

    // Call server for complex validation
    var ga = new GlideAjax('IncidentValidator');
    ga.addParam('sysparm_name', 'validate');
    ga.addParam('sysparm_priority', form.getValue('priority'));
    ga.addParam('sysparm_category', form.getValue('category'));
    ga.addParam('sysparm_group', form.getValue('assignment_group'));

    ga.getXMLAnswer(function(answer) {
        if (answer !== 'valid') {
            form.addErrorMessage('Validation failed: ' + answer);
        }
    });
})();
```

---

## Dynamic Field Manipulation

### Show/Hide Fields Based on Selection

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) {
        return;
    }

    var form = g_form;

    // Hide all conditional fields
    form.setVisible('escalation_reason', false);
    form.setVisible('change_category', false);
    form.setVisible('incident_category', false);

    // Show fields based on record type
    if (newValue === 'change') {
        form.setVisible('change_category', true);
        form.setVisible('change_impact', true);
        form.setMandatory('change_category', true);
    } else if (newValue === 'incident') {
        form.setVisible('incident_category', true);
        form.setMandatory('incident_category', true);
    }
}
```

### Toggle Sections Based on Checkbox

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) {
        return;
    }

    var form = g_form;

    // Show/hide advanced options
    if (newValue === 'true' || newValue === true) {
        form.setVisible('advanced_options', true);
        form.setVisible('custom_field1', true);
        form.setMandatory('custom_field2', true);
    } else {
        form.setVisible('advanced_options', false);
        form.setVisible('custom_field1', false);
        form.setMandatory('custom_field2', false);
    }
}
```

### Cascading Updates

```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading) {
        return;
    }

    var form = g_form;

    // Priority change - auto-set urgency
    if (control.name === 'priority') {
        if (newValue === '1') {
            form.setValue('urgency', '1');
            form.setValue('impact', '1');
        } else if (newValue === '2') {
            form.setValue('urgency', '2');
            form.setValue('impact', '2');
        } else {
            form.setValue('urgency', '3');
            form.setValue('impact', '3');
        }
    }

    // Category change - suggest group
    if (control.name === 'category') {
        var groupMap = {
            'software': 'Software Support',
            'hardware': 'Hardware Support',
            'network': 'Network Support'
        };

        form.setValue('assignment_group', groupMap[newValue] || 'General Support');
    }
}
```

---

## Event Handling

### Multiple onChange Listeners

```javascript
(function setupListeners() {
    var form = g_form;

    // Priority change listener
    form.addOnChange('priority', function() {
        var priority = form.getValue('priority');
        if (priority === '1') {
            form.setMandatory('assignment_group', true);
        } else {
            form.setMandatory('assignment_group', false);
        }
    });

    // Category change listener
    form.addOnChange('category', function() {
        callServerForSuggestions(form.getValue('category'));
    });

    // Recurring toggle listener
    form.addOnChange('is_recurring', function() {
        var isRecurring = form.getValue('is_recurring');
        form.setVisible('recurrence_end_date', isRecurring === 'true');
        form.setMandatory('recurrence_end_date', isRecurring === 'true');
    });
})();

function callServerForSuggestions(category) {
    var ga = new GlideAjax('IncidentUtils');
    ga.addParam('sysparm_name', 'suggestGroup');
    ga.addParam('sysparm_category', category);

    ga.getXMLAnswer(function(groupId) {
        if (groupId && groupId !== 'null') {
            g_form.setValue('assignment_group', groupId);
        }
    });
}
```

---

## Reusable Functions

### Store Functions in Window Object

```javascript
// Define once in onLoad script
window.validateRequired = function(fields) {
    var isValid = true;
    fields.forEach(function(field) {
        var value = g_form.getValue(field);
        if (!value) {
            g_form.addErrorMessage(field + ' is required');
            isValid = false;
        }
    });
    return isValid;
};

window.callServer = function(scriptInclude, method, params) {
    var ga = new GlideAjax(scriptInclude);
    ga.addParam('sysparm_name', method);

    for (var key in params) {
        ga.addParam(key, params[key]);
    }

    return new Promise(function(resolve, reject) {
        ga.getXMLAnswer(function(answer) {
            if (answer) {
                resolve(answer);
            } else {
                reject('No answer from server');
            }
        });
    });
};
```

### Use Shared Functions in onChange

```javascript
// In onChange scripts:
function onChange(control, oldValue, newValue, isLoading) {
    // Call shared validation
    if (!validateRequired(['category', 'priority'])) {
        return;
    }

    // Call shared server function
    callServer('IncidentUtils', 'suggestGroup', {
        'sysparm_category': newValue
    }).then(function(result) {
        g_form.setValue('assignment_group', result);
    });
}
```

---

## Best Practices

✓ **Use GlideAjax for async calls** - Always use `getXMLAnswer()`, never `getXMLWait()`
✓ **Check isLoading flag** - Prevents multiple overlapping requests
✓ **Always provide Script Include name in PascalCase** - ServiceNow requirement
✓ **Use IIFE for onLoad scripts** - Prevents global scope pollution
✓ **Handle errors gracefully** - Use try-catch for parsing responses
✓ **Validate on both client and server** - Client for UX, server for security
✓ **Use g_scratchpad from Display Business Rules** - Avoid redundant calls
✓ **Scope functions to g_form** - Use `g_form.setValue()` not direct assignment
✓ **Test with all form layouts** - Responsive, mobile, workspace
✓ **Avoid document/jQuery** - Breaks on Polaris and Next Experience

---

## Critical Rules

| Rule | Reason |
|------|--------|
| NO GlideRecord | Blocks browser, use GlideAjax |
| NO getXMLWait | Blocks UI, forbidden |
| NO direct DOM | Breaks on Polaris/Next |
| Always async | Use `getXMLAnswer()` |
| Check isLoading | Prevents duplicate calls |

---

## Key APIs

| API | Purpose |
|-----|---------|
| `g_form.setValue()` | Set field value |
| `g_form.getValue()` | Get field value |
| `g_form.setVisible()` | Show/hide field |
| `g_form.setMandatory()` | Make field required |
| `g_form.setReadOnly()` | Make field read-only |
| `g_form.addOnChange()` | Register change listener |
| `g_form.addErrorMessage()` | Show error to user |
| `g_form.addInfoMessage()` | Show info message |
| `GlideAjax` | Async server communication |
| `g_scratchpad` | Server-to-client data |

---

## When to Use Classic Client Scripts

- ✓ Existing ServiceNow instances
- ✓ Instance-based form customizations
- ✓ Form validation and dynamic UI
- ✓ Server communication with GlideAjax
- ✓ Legacy form customizations
- ✓ Maximum compatibility

For SDK-based projects, see [FLUENT.md](FLUENT.md) for TypeScript client script patterns.
