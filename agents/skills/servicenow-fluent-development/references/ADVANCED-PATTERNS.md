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
