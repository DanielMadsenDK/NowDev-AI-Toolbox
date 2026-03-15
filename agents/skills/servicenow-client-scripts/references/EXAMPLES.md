# Client Scripts - Code Examples

Quick reference guide for creating browser-side client scripts. This page provides navigation to detailed pattern references organized by approach.

## Choose Your Approach

### **[CLASSIC.md](CLASSIC.md) — Instance-Based Scripts**
Use for direct ServiceNow instance customizations created in the Client Script UI.

**Quick example:**
```javascript
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || !newValue) return;

    var ga = new GlideAjax('ScriptIncludeName');
    ga.addParam('sysparm_name', 'methodName');
    ga.addParam('sysparm_data', newValue);

    ga.getXMLAnswer(function(answer) {
        g_form.setValue('target_field', answer);
    });
}
```

**When to use:**
- ✓ Existing ServiceNow instances
- ✓ Form initialization and validation
- ✓ Server communication with GlideAjax
- ✓ Dynamic field visibility
- ✓ Event handling (onChange, onLoad, onSubmit)

---

### **[FLUENT.md](FLUENT.md) — SDK-Based Scripts (.now.ts)**
Use for TypeScript projects with `.now.ts` metadata definitions and handler functions.

**Quick example:**
```typescript
import { ClientScript } from '@servicenow/sdk/core'

export default ClientScript({
    $id: Now.ID['incident_onchange'],
    type: 'onChange',
    element: 'field_name',
    table: 'incident',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) return;

        const ga = new GlideAjax('ScriptIncludeName');
        ga.addParam('sysparm_name', 'methodName');
        ga.addParam('sysparm_data', newValue);

        ga.getXMLAnswer((answer) => {
            g_form.setValue('target_field', answer);
        });
    }
})
```

**When to use:**
- ✓ New SDK projects
- ✓ TypeScript-based development
- ✓ Type-safe form handling
- ✓ Version control and Git tracking
- ✓ Team knows TypeScript

---

## Script Types

| Type | Trigger | Use For |
|------|---------|---------|
| **onLoad** | Form loads | Initialization, defaults, listeners |
| **onChange** | Field changes | Cascading updates, server calls |
| **onSubmit** | Form submission | Validation, pre-submission checks |
| **onSave** | After save | Post-processing |

---

## Pattern Coverage

| Pattern | Classic | Fluent | Learn More |
|---------|---------|--------|------------|
| Form initialization | ✓ | ✓ | See respective guide |
| Validation | ✓ | ✓ | See respective guide |
| GlideAjax calls | ✓ | ✓ | See respective guide |
| Dynamic visibility | ✓ | ✓ | See respective guide |
| Cascading updates | ✓ | ✓ | See respective guide |
| Type safety | - | ✓ | [FLUENT.md](FLUENT.md) |
| Version control | - | ✓ | [FLUENT.md](FLUENT.md) |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | [FLUENT.md](FLUENT.md) |
| Do we use TypeScript? | Yes | [FLUENT.md](FLUENT.md) |
| Need version control? | Yes | [FLUENT.md](FLUENT.md) |
| Quick form enhancement? | Yes | [CLASSIC.md](CLASSIC.md) |

---

## Key Differences at a Glance

### Classic: Instance Script
```javascript
// Created in Client Scripts UI
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || !newValue) return;
    var ga = new GlideAjax('ScriptInclude');
    ga.addParam('sysparm_name', 'method');
    ga.getXMLAnswer(function(answer) {
        g_form.setValue('field', answer);
    });
}
```

### Fluent: SDK Script
```typescript
// Version-controlled .now.ts file
import { ClientScript } from '@servicenow/sdk/core'

export default ClientScript({
    $id: Now.ID['my_script'],
    type: 'onChange',
    element: 'field_name',
    table: 'incident',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) return;
        const ga = new GlideAjax('ScriptInclude');
        ga.addParam('sysparm_name', 'method');
        ga.getXMLAnswer((answer) => {
            g_form.setValue('field', answer);
        });
    }
})
```

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — GlideAjax patterns and g_form API reference
- **[CLASSIC.md](CLASSIC.md)** — Full reference for instance-based scripts
- **[FLUENT.md](FLUENT.md)** — Full reference for SDK scripts
