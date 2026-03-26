---
name: servicenow-client-scripts
user-invocable: false
description: Implement browser-side client scripts using GlideAjax for async server communication. Covers two approaches: (1) Classic client scripts in existing instances, and (2) Fluent SDK TypeScript scripts in .now.ts files. Use for OnChange/OnLoad/OnSubmit scripts that make async server calls or event-driven logic requiring data from the server. For pure g_form field state operations with no server calls, use the servicenow-ui-forms skill. For legacy instances, recommend Classic patterns; for SDK projects, recommend Fluent patterns.
---

# ServiceNow Client Scripting

## Choosing Your Approach

Client scripts exist in two distinct contexts:

### **Classic Client Scripts** (for existing instances)
Use for direct ServiceNow instance customizations created in the Client Script UI.

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

### **Fluent SDK Client Scripts** (for SDK projects)
Use for TypeScript-based projects with `.now.ts` metadata files and `.client.js` handlers.

```typescript
import { ClientScript } from '@servicenow/sdk/core'

export const cs = ClientScript({
    $id: Now.ID['incident_onchange_script'],
    type: 'onChange',
    field: 'field_name',
    table: 'incident',
    name: 'My Script',
    script: (oldValue, newValue, isLoading) => {
        if (isLoading || !newValue) return;

        const ga = new GlideAjax('ScriptIncludeName');
        ga.addParam('sysparm_name', 'methodName');
        ga.addParam('sysparm_data', newValue);

        ga.getXMLAnswer(function(answer) {
            g_form.setValue('target_field', answer);
        });
    }
})
```

## Performance optimization

**Use g_scratchpad** (server → client on load):

```javascript
// Display Business Rule (server):
g_scratchpad.vip = true;

// OnLoad script (client):
if (g_scratchpad.vip) {
    g_form.setLabel('priority', 'VIP Priority');
}
```

**Avoid redundant calls**:

```javascript
// ✓ CORRECT: Check client logic first
if (!isLoading && newValue) {
    // Make server call
}

// Set display value to avoid round-trips
g_form.setValue('ref_field', id, displayValue);
```

## Critical Rules (Both Approaches)

| Rule | Reason |
|------|--------|
| Always use `getXMLAnswer()` | Async, prevents UI blocking |
| Never use `getXMLWait()` | Synchronous, blocks browser |
| Check `isLoading` flag | Prevents duplicate requests |
| Use `g_form` API | Safe across all form layouts |
| No direct DOM manipulation | Breaks on Polaris/Next Experience |
| Use IIFE wrapper | Prevents global scope pollution |

## Best Practices (All Approaches)

- Check `isLoading` before making GlideAjax calls
- Always use PascalCase for Script Include names
- Use `setValue(field, id, displayValue)` to avoid queries
- **Use UI Policies instead of client scripts when possible** — they load faster and don't require scripting for field visibility, read-only, mandatory, cleared, or static value changes. See [UI Policies](#ui-policies-vs-client-scripts) decision guide below.
- Use client scripts only for **dynamic/conditional logic** that requires server communication, complex validation, or responsive behavior
- Test with all form layouts (desktop, mobile, workspace)
- Use g_scratchpad from Display Business Rules to avoid redundant calls
- Handle errors gracefully with try-catch
- Keep scripts focused; move complex logic to Script Includes

## UI Policies vs Client Scripts

**Use UI Policies for:**
- Controlling field visibility (show/hide)
- Making fields read-only or editable
- Marking fields as mandatory or optional
- Clearing field values
- Setting static field values
- Controlling related list visibility
- Static behavior based on conditions (encoded queries)
- Performance-critical form behavior (faster load times)

**Use Client Scripts for:**
- Dynamic logic triggered by user actions (onChange, onLoad, onSubmit)
- Server communication with GlideAjax
- Complex conditional logic beyond simple field state
- Cascading field updates
- Custom validation with error messages
- Form manipulation based on data from script includes
- Responsive interactions (tooltips, confirmations, etc.)

**Performance tip:** If you only need to conditionally show/hide fields or set mandatory flags based on a field value, **always prefer UI Policies over client scripts**. UI Policies are more efficient and don't require async callbacks.

For complete UI Policy documentation, see the **servicenow-fluent-development** skill reference: **UI-POLICY-API.md** — UiPolicy object properties, field actions (visible/readOnly/mandatory/cleared), related list actions, conditions, script-based behavior, and inheritance patterns.

## Key APIs

| API | Purpose |
|-----|---------|
| GlideAjax | Async server communication |
| g_form | Form field manipulation |
| g_scratchpad | Server-to-client data passing |
| g_user | Current user context |
| GlideRecord | NEVER use client-side (blocks browser) |
| GlideModal | Display modal dialogs |

## Detailed Patterns

Choose the pattern that matches your implementation context:

- **[CLASSIC.md](references/CLASSIC.md)** — Instance-based client scripts (JavaScript, UI-created)
  - Form initialization and validation
  - GlideAjax server communication
  - Dynamic field visibility and cascading updates
  - Event handling and listeners
  - Reusable functions in global scope

- **[FLUENT.md](references/FLUENT.md)** — SDK-based client scripts (TypeScript, `.now.ts` files)
  - Metadata-driven script definitions
  - TypeScript handler implementation
  - Version-controlled scripts
  - Type-safe form handling
  - Full IDE support

- **[EXAMPLES.md](references/EXAMPLES.md)** — Quick reference showing both approaches

## Decision Matrix: Which Approach to Use

| Situation | Classic | Fluent | Rationale |
|-----------|---------|--------|-----------|
| Existing instance customization | ✓ | - | Created in UI, no SDK setup needed |
| New SDK project | - | ✓ | Use .now.ts with TypeScript |
| Version control needed | - | ✓ | SDK files tracked in Git |
| Type-safe form logic | - | ✓ | TypeScript compiler catches errors |
| Quick form enhancement | ✓ | - | No SDK complexity needed |
| Team knows TypeScript | - | ✓ | Leverage team expertise |
| GlideAjax calls needed | ✓ | ✓ | Both support async server calls |

## Reference

For GlideAjax templates, g_scratchpad patterns, and detailed API reference, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
