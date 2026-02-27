# Advanced Patterns

## Record() API Usage

**Use `Record()` for:** Demo/seed data, `sys_app_module`, `sys_ui_action`, `sp_*` tables, `sc_cat_item`, and any table without a dedicated Fluent API.

**`Table()` vs `Record()`:** `Table()` defines a schema (columns, indexes). `Record()` creates/seeds data in existing tables.

```ts
// Demo data
Record({ $id: Now.ID['demo.incident'], table: 'incident', data: {
  short_description: 'Sample', urgency: '1', opened_at: '2025-01-01 12:00:00'
}})

// UI Action
Record({ $id: Now.ID['ui.action'], table: 'sys_ui_action', data: {
  name: 'custom_action', table: 'incident', active: true,
  script: script`/* ServiceNow JavaScript */`
}})
```

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
