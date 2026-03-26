# Client Script API

Defines `sys_script_client` metadata that runs JavaScript in the browser on ServiceNow forms and lists. Use client scripts to validate input, auto-populate fields, display alerts, and respond to user interactions.

```ts
import { ClientScript } from '@servicenow/sdk/core'
```

---

## When to Use Client Scripts vs UI Policies

Prefer **UI Policies** for simple show/hide, mandatory, and read-only logic — they load faster and require no JavaScript. Use **Client Scripts** when you need:
- Conditional logic based on computed or async values
- Field population from external sources
- User alerts, messages, or confirmations
- Complex cross-field validation on submit

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID using `Now.ID['id']` format |
| `name` | String | Name of the client script — must be unique within the table |
| `table` | String | Table name on which the script runs (e.g., `'incident'`) |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | String | `'--None--'` | Event that triggers the script. See [Script Types](#script-types). |
| `uiType` | String | `'all'` | UI the script applies to: `'desktop'`, `'mobile_or_service_portal'`, or `'all'` |
| `active` | Boolean | `true` | Whether the script is enabled |
| `global` | Boolean | `true` | `true` = all views; `false` = specific view only |
| `view` | String | N/A | View name when `global` is `false` |
| `field` | String | N/A | Field the script applies to. Only valid for `onChange` and `onCellEdit` types |
| `appliesExtended` | Boolean | `false` | Whether the script also runs on tables that extend this table |
| `isolateScript` | Boolean | `false` | Run in strict mode — disables direct DOM access, jQuery, prototype, and window |
| `description` | String | N/A | Description of the script's purpose |
| `messages` | String | N/A | Newline-separated message keys for `getmessage('[key]')` localization |
| `script` | Script | N/A | Script content. See [Script Content Options](#script-content-options). |
| `$meta` | Object | N/A | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

> **Deprecated aliases:** `ui_type` (use `uiType`), `applies_extended` (use `appliesExtended`), `isolate_script` (use `isolateScript`). The deprecated and current aliases are mutually exclusive — use one or the other.

---

## Script Types

The `type` property defines when the script runs:

| Type | When it runs | `field` property |
|------|-------------|-----------------|
| `'onLoad'` | When the form loads | Not applicable |
| `'onChange'` | When a specific field value changes | Required |
| `'onSubmit'` | When the form is submitted | Not applicable |
| `'onCellEdit'` | When a cell is edited in a list | Required |

---

## Script Content Options

The `script` property accepts three content formats:

**1. External file (recommended — keeps logic separate from metadata):**
```ts
script: Now.include('./my-script.client.js')
```

**2. Imported function (type-safe, reusable):**
```ts
import { onLoadHandler } from '../client/handlers.client.js'
// ...
script: onLoadHandler
```

**3. Inline JavaScript (for very short scripts only):**
```ts
script: `function onLoad() { g_form.addInfoMessage('Form loaded'); }`
```

External files are preferred because they allow linting, testing, and reuse. The file is linked with `Now.include()` and stays synchronized with the metadata.

---

## Examples

### onLoad — Show a message when the form opens

```ts
import { ClientScript } from '@servicenow/sdk/core'

export const incidentOnLoad = ClientScript({
  $id: Now.ID['cs.incident_onload'],
  name: 'IncidentOnLoad',
  table: 'incident',
  type: 'onLoad',
  uiType: 'all',
  active: true,
  description: 'Shows a reminder message when the incident form opens',
  script: Now.include('./incident-onload.client.js'),
})
```

### onChange — Respond to a field change

```ts
import { ClientScript } from '@servicenow/sdk/core'

export const priorityChange = ClientScript({
  $id: Now.ID['cs.incident_priority_change'],
  name: 'IncidentPriorityChange',
  table: 'incident',
  type: 'onChange',
  field: 'priority',
  uiType: 'desktop',
  active: true,
  description: 'Warns the user when setting priority 1',
  script: Now.include('./priority-change.client.js'),
})
```

### onSubmit — Validate before form save

```ts
import { ClientScript } from '@servicenow/sdk/core'

export const incidentSubmit = ClientScript({
  $id: Now.ID['cs.incident_submit'],
  name: 'IncidentSubmitValidation',
  table: 'incident',
  type: 'onSubmit',
  uiType: 'all',
  active: true,
  isolateScript: true,
  description: 'Validates required fields before submit',
  script: Now.include('./incident-submit.client.js'),
})
```

### View-specific script

```ts
import { ClientScript } from '@servicenow/sdk/core'

export const itilViewScript = ClientScript({
  $id: Now.ID['cs.incident_itil_view'],
  name: 'IncidentITILViewLoad',
  table: 'incident',
  type: 'onLoad',
  uiType: 'desktop',
  global: false,
  view: 'itil',
  active: true,
  script: Now.include('./itil-view-onload.client.js'),
})
```

### Script with localized messages

```ts
import { ClientScript } from '@servicenow/sdk/core'

export const incidentWithMessages = ClientScript({
  $id: Now.ID['cs.incident_messages'],
  name: 'IncidentWithMessages',
  table: 'incident',
  type: 'onLoad',
  uiType: 'all',
  active: true,
  messages: 'msg_confirm_close\nmsg_priority_warning',
  script: Now.include('./incident-messages.client.js'),
})
```

In the client script file, retrieve these with:
```js
var msg = getmessage('msg_confirm_close')
```

---

## Client Script File Patterns

### onLoad handler

```js
// incident-onload.client.js
function onLoad() {
  var state = g_form.getValue('state')
  if (state === '6') {
    g_form.addInfoMessage(getmessage('msg_resolved_info'))
  }
}
```

### onChange handler

```js
// priority-change.client.js
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return  // skip on form load
  if (newValue === '1') {
    g_form.addWarningMessage('Critical priority selected — confirm with manager')
  }
}
```

### onSubmit handler (return `false` to cancel)

```js
// incident-submit.client.js
function onSubmit() {
  var category = g_form.getValue('category')
  if (!category) {
    g_form.addErrorMessage('Category is required before submitting')
    return false  // cancel the submit
  }
}
```

---

## Best Practices

- **External files over inline** — Put logic in `.client.js` files for clarity and testability
- **Guard against `isLoading`** in `onChange` to avoid running on form load: `if (isLoading) return`
- **Prefer UI Policies** for simple mandatory/read-only/visible changes — they have better performance
- **Use `isolateScript: true`** in new scripts for security; omit only when legacy code requires direct DOM or jQuery
- **Use `appliesExtended: true`** when the script should apply to child tables (e.g., a script on `task` that should run on `incident` and `change_request`)
- **Scope to the view** with `global: false` + `view` when a script is UI-specific and shouldn't run everywhere

---

## Related APIs

- [UI Policy API](./UI-POLICY-API.md) — Declarative field control (preferred over scripts for simple cases)
- [Script Include API](./SCRIPT-INCLUDE-API.md) — Server-side functions callable from client scripts via GlideAjax
- [Service Catalog](./SERVICE-CATALOG.md) — `CatalogClientScript` for catalog item forms
- [UI Action API](./UI-ACTION-API.md) — Buttons and links with optional client-side scripting
