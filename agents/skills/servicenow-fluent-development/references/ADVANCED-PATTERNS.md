# Advanced Patterns

## Record() API Usage

**Use `Record()` for:** Demo/seed data, `sys_app_module`, `sp_*` tables, and any table **without a dedicated Fluent API**.

**Prefer dedicated APIs:** The SDK is continuously updated with new first-class Fluent objects. If a dedicated API exists for what you need (e.g., `UiAction`, `UiPolicy`, `ScriptAction`), always prefer it over `Record()`. Use `Record()` only as a fallback when no dedicated API exists.

**`Table()` vs `Record()`:** `Table()` defines a schema (columns, indexes). `Record()` creates/seeds data in existing tables.

```ts
// Demo data
Record({ $id: Now.ID['demo.incident'], table: 'incident', data: {
  short_description: 'Sample', urgency: '1', opened_at: '2025-01-01 12:00:00'
}})
```

---

## UiAction

Use the dedicated `UiAction()` API for creating UI actions (buttons, links, context menu items on forms and lists).

```ts
import { UiAction } from '@servicenow/sdk/core'

UiAction({
  $id: Now.ID['my.action'],
  table: 'x_myapp_table',       // or 'global' for all tables
  actionName: 'My Action',
  name: 'Do Something',
  active: true,
  condition: "current.state == 'open'",
  script: `current.state = '2'; current.update();`,
  roles: ['x_myapp.user'],      // role names — no separate sys_ui_action_role record needed
  form: {
    showButton: true,
    showLink: false,
    style: 'primary',           // 'primary' | 'destructive'
  },
  list: {
    showButton: true,
    showBannerButton: false,
  },
  client: {
    isClient: false,
  },
  order: 100,
})
```

**`Record()` fallback** — only use `Record('sys_ui_action')` when targeting a **cross-scope table** that `UiAction()` cannot resolve (e.g., adding an action to `sc_cat_item` from a different scope). In that case, role mapping requires a separate `Record('sys_ui_action_role')` with the role sys_id.

---

## Cross-Scope Module Pattern (Advanced)

Expose a compiled TypeScript module as a Script Include accessible cross-scope:

```ts
Record({
  table: 'sys_script_include',
  data: {
    access: 'public', active: true, api_name: 'x_scope.MyClass', name: 'MyClass',
    script: script`const sinc = require('./dist/server/my-class.js'); var MyClass = sinc.MyClass;`
  }
})
// Usage in other scope: new x_scope.MyClass().method()
```

**Build order:** `tsc` (compile TS) → `now-sdk build` → `now-sdk install`

Note: `x_require` polyfill required for Xanadu releases before Patch 2 / Washington DC before Patch 9.

---

## Server-Side Logging & Typed GlideRecord

```ts
import { gs, GlideRecord } from '@servicenow/glide'

gs.info('Info message')
gs.warn('Warning message')
gs.error('Error message')
gs.addInfoMessage('UI message shown to user')

const gr: GlideRecord<'incident'> = new GlideRecord('incident')
gr.addQuery('active', true)
gr.query()
while (gr.next()) {
  const desc = gr.getValue('short_description')
}
```

---

## Common Script APIs Reference

These are the APIs most commonly used inside script fields. Verify with Context7 for exact signatures.

**Client-side (g_form, g_user):**
```js
g_form.addInfoMessage('Message')
g_form.setValue('field', 'value')
g_form.getValue('field')
g_form.setMandatory('field', true)
g_form.setVisible('field', false)
g_user.hasRole('admin')
```

**Server-side business rule (current, previous, gs):**
```js
current.getValue('field')
current.setValue('field', 'value')
previous.getValue('field')
gs.getUserID()
gs.hasRole('admin')
current.update()
current.insert()
```

**GlideRecord query:**
```js
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', '1');
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();
while (gr.next()) {
  gs.info('Found: ' + gr.getValue('number'));
}
```

**GlideAggregate:**
```js
var ga = new GlideAggregate('incident');
ga.addAggregate('COUNT');
ga.addQuery('active', true);
ga.groupBy('priority');
ga.query();
while (ga.next()) {
  gs.info(ga.getValue('priority') + ': ' + ga.getAggregate('COUNT'));
}
```

---

## Now.UNRESOLVED

`Now.UNRESOLVED` is a sentinel value used to explicitly mark that a metadata reference cannot be resolved during build time. It's useful when you need to reference records that will only exist after installation (e.g., records seeded at runtime, or external dependencies).

```ts
import { Record } from '@servicenow/sdk/core'

// Reference a record that will only exist after the app is installed
Record({
  $id: Now.ID['my_reference'],
  table: 'sys_script_include',
  data: {
    name: 'MyScript',
    script: Now.UNRESOLVED,  // Explicitly mark as unresolved — won't fail build
  },
})
```

**Key rules:**
- Use `Now.UNRESOLVED` only when you know the value will be filled in post-installation
- Do NOT use it as a shortcut for missing values — the build will still generate the record without that field
- Prefer `Now.ref()` instead when the record exists in another scope and can be referenced by coalesce keys

---

## Now.ref — Cross-Application References

Use `Now.ref()` to reference records from OTHER applications (not in your current source code). This creates a reference to an existing record by either coalesce keys or sys_id.

```ts
import { Record } from '@servicenow/sdk/core'

// Reference by coalesce keys (preferred — install-agnostic)
Record({
  $id: Now.ID['my_flow'],
  table: 'sys_hub_flow',
  data: {
    run_as: Now.ref('sys_user_role', { name: 'admin' }),
  },
})

// Reference by sys_id (use when you have a known, stable sys_id)
Record({
  $id: Now.ID['my_sla'],
  table: 'contract_sla',
  data: {
    workflow: Now.ref('wf_workflow', 'a1b2c3d4e5f6...'),
    flow: Now.ref('sys_hub_flow', 'my-flow-name'),
  },
})

// Reference with sys_id + coalesce fallback
Record({
  $id: Now.ID['my_record'],
  table: 'incident',
  data: {
    category: Now.ref('sc_category', 'known-sys-id', { name: 'Hardware' }),
  },
})
```

**When to use `Now.ref` vs `$id`:**
- `Now.ref()` — for records in OTHER apps or system records (roles, flows, categories, users)
- `constant.$id` — for records YOU define in the SAME project (always prefer this)

---

## AnnotationType (Pre-defined UI Annotation Types)

The SDK provides pre-defined `AnnotationType` constants for adding annotations and separators to forms (banners, labels, separators) without looking up sys_ids manually.

```ts
import { AnnotationType } from '@servicenow/sdk/core'
import { Record } from '@servicenow/sdk/core'

// Add a form field annotation using pre-defined type
Record({
  $id: Now.ID['my_annotation'],
  table: 'sys_ui_annotation',
  data: {
    element: 'short_description',
    value: 'Describe the incident clearly.',
    type: AnnotationType.Info_Box_Blue.$id,
    view: default_view.$id,
    table: 'incident',
  },
})
```

**Available constants in `AnnotationType` namespace:**

| Constant | Visual |
|----------|--------|
| `AnnotationType.Info_Box_Blue` | Blue info banner |
| `AnnotationType.Info_Box_Red` | Red warning banner |
| `AnnotationType.Line_Separator` | Horizontal separator line |
| `AnnotationType.Plain_Text` | Plain text label |
| `AnnotationType.Section_Details` | Section detail block |
| `AnnotationType.Section_Plain_Text` | Section plain text |
| `AnnotationType.Section_Separator` | Section separator |
| `AnnotationType.Text` | Text block |

---

## default_view (Default Sys UI View)

The `default_view` constant references the system's default `sys_ui_view` record without needing to know its sys_id.

```ts
import { default_view } from '@servicenow/sdk/core'
import { List } from '@servicenow/sdk/core'

// Use in List definitions
export const myList = List({
  table: myTable.name,
  view: default_view.$id,  // reference the default view
  columns: [
    { field: 'number' },
    { field: 'short_description' },
    // ...
  ],
})
```

---

## Global Helper Functions

These global functions are available in `.now.ts` files for creating properly-typed data values:

### Duration()

Create a duration value for `DurationColumn` fields, SLA durations, and scheduled triggers:

```ts
// All units are optional
Duration({ days: 1, hours: 6, minutes: 30, seconds: 15 })
// Returns '1970-01-02 06:30:15' (ServiceNow duration format)

Duration({ hours: 4 })
// Returns '1970-01-01 04:00:00'
```

### Time()

Create a time-of-day value for `TimeColumn` fields and daily trigger schedules:

```ts
// Defaults to system timezone
Time({ hours: 9, minutes: 0, seconds: 0 })

// With explicit timezone conversion to UTC
Time({ hours: 14, minutes: 30, seconds: 0 }, 'America/New_York')
// 14:30 EST → stored as 19:30 UTC
```

### TemplateValue()

Create a typed record field values object for `TemplateValueColumn` fields:

```ts
// Generic (accepts any field)
TemplateValue({ cost: 100, description: 'Item', active: true })
// Returns: 'cost=100^description=Item^active=true^EQ'

// Table-specific (IntelliSense for valid fields)
TemplateValue<'sc_cat_item'>({ cost: 100, category: 'Hardware' })

// Used in flows with action.core.createRecord / updateRecord:
values: TemplateValue({ state: '2', work_notes: 'Auto-assigned' })
```

### FieldList()

Create a list of field names (for `FieldListColumn` fields and List view columns):

```ts
// Generic
FieldList(['name', 'description', 'cost'])
// Returns: 'name,description,cost'

// Table-specific (IntelliSense + dot-walk support)
FieldList<'sc_cat_item'>(['name', 'description', 'cost', 'category', 'assigned_to.name'])
```
