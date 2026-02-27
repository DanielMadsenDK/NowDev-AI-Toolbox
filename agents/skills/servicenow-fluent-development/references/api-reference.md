# Fluent API Quick Reference

## Import Patterns

```ts
import '@servicenow/sdk/global'                                     // Global Now.* helpers
import { Table, BusinessRule, UiPage, ScriptInclude } from '@servicenow/sdk/core'
import { UiPolicy, ImportSet, RestApi, script } from '@servicenow/sdk/core'
import { Duration, Time, FieldList, TemplateValue } from '@servicenow/sdk/core' // helpers
import { EmailNotification, Workspace, Sla } from '@servicenow/sdk/core'
import { Role, Applicability, UxListMenuConfig, Dashboard } from '@servicenow/sdk/core'
import { CatalogItem, CatalogClientScript, CatalogUIPolicy, VariableSet } from '@servicenow/sdk/core'
import { CatalogItemRecordProducer } from '@servicenow/sdk/core'
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation' // Flow API
import { gs, GlideRecord } from '@servicenow/glide'                 // Server-side SN APIs
import { role as globalRole } from '#now:global/security'           // instance roles
import htmlEntry from '../../client/index.html'                     // HTML assets
import { myFn } from '../server/module.js'                          // TS module functions
```

`#now:` alias requires `"imports": { "#now:*": "./@types/servicenow/fluent/*/index.js" }` in `package.json`.

---

## Table

```ts
export const myTable = Table({
  name: 'x_scope_table',
  extends: 'task',        // Optional: extend task, cmdb_ci, etc.
  extensible: true,
  display: 'name',
  auto_number: { prefix: 'TBL', number: 1000, number_of_digits: 7 },
  schema: {
    name:       StringColumn({ label: 'Name', mandatory: true, maxLength: 100 }),
    count:      IntegerColumn({ label: 'Count', default: 0 }),
    active:     BooleanColumn({ label: 'Active', default: true }),
    due_date:   DateColumn({ label: 'Due Date' }),
    created_at: DateTimeColumn({ label: 'Created' }),
    status:     StringColumn({
      label: 'Status', dropdown: 'suggestion',
      choices: { open: { label: 'Open' }, closed: { label: 'Closed' } }
    }),
    owner:      ReferenceColumn({ label: 'Owner', referenceTable: 'sys_user', mandatory: true }),
    url:        UrlColumn({ label: 'URL' }),
    email:      EmailColumn({ label: 'Email' }),
    duration:   DurationColumn({ label: 'Duration' }),
    time_field: TimeColumn({ label: 'Time' }),
  },
  index: [{ element: 'status', name: 'status_idx', unique: false }]
})
```

**All Column Types :** `StringColumn`, `IntegerColumn`, `BooleanColumn`, `DateColumn`, `DateTimeColumn`, `ReferenceColumn`, `FloatColumn`, `EmailColumn`, `UrlColumn`, `HTMLColumn`, `MultiLineTextColumn`, `JsonColumn`, `GuidColumn`, `Password2Column`, `DurationColumn`, `TimeColumn`, `FieldListColumn`, `SlushBucketColumn`, `NameValuePairsColumn`, `TemplateValueColumn`, `ApprovalRulesColumn`

**Column Properties:** `label`, `mandatory`, `read_only`, `active`, `default`, `maxLength`, `dropdown`, `choices`, `referenceTable` (**required** for `ReferenceColumn` and `ListColumn`)

---

## ApplicationMenu

```ts
export const menu = ApplicationMenu({
  $id: Now.ID['app.menu'], title: 'My Application', hint: 'Application description'
})
```

---

## BusinessRule

```ts
BusinessRule({
  $id: Now.ID['br.name'], name: 'RuleName', table: myTable.name,
  action: ['insert', 'update'], when: 'after', order: 100, active: true,
  script: importedFunction  // or Now.include('./script.server.js')
})
```

---

## ClientScript

```ts
ClientScript({
  $id: Now.ID['cs.name'], name: 'ScriptName', table: 'incident',
  type: 'onLoad',  // onLoad | onChange | onSubmit | onCellEdit
  active: true, ui_type: 'all',
  script: Now.include('./script.client.js')
})
```

---

## ScriptInclude

```ts
ScriptInclude({
  $id: Now.ID['si.name'],
  name: 'MyClass',
  apiName: 'x_scope.MyClass',  // Full scoped API name
  script: Now.include('./MyClass.server.js'),
  description: 'Description',
  callerAccess: 'tracking',
  clientCallable: true,
  mobileCallable: true,
  sandboxCallable: true,
  accessibleFrom: 'public',
  active: true
})
```

**Critical rules:**
- `name`, JS class name, and `type` property must ALL match
- `apiName`: `<scope>.<name>` (e.g., `x_1118332_los.MyClass`)
- Server JS **must** use `Object.extendsObject(global.AbstractAjaxProcessor, { ... })`
- Client **must** use full scoped API name: `new GlideAjax('x_scope.MyClass')`
- All flags (`callerAccess`, `clientCallable`, `mobileCallable`, `sandboxCallable`, `accessibleFrom`, `active`) are REQUIRED

---

## REST API

```ts
RestApi({
  $id: Now.ID['api'], name: 'My API', serviceId: 'my_api', consumes: 'application/json',
  routes: [{
    $id: Now.ID['route.get'], name: 'get', method: 'GET',
    script: script`(function(request, response) { response.setBody({ok:true}) })(request, response)`
  }]
})
```

Endpoint: `/api/<scope>/<serviceId>` — `serviceId` must be unique within namespace.

---

## UiPage

```ts
import htmlEntry from '../../client/index.html'
UiPage({ $id: Now.ID['page'], endpoint: 'x_app_page.do', html: htmlEntry, direct: true })
```

---

## SPWidget

```ts
SPWidget({
  $id: Now.ID['widget'], name: 'Widget', id: 'widget-id',
  clientScript: Now.include('widget.client.js'),   // AngularJS controller (c.data, $scope)
  serverScript: Now.include('widget.server.js'),   // IIFE: (function(){ data.x = y })()
  htmlTemplate: Now.include('widget.html'),
  customCss: Now.include('widget.scss'),
  hasPreview: true, demoData: { data: {} }, dependencies: [CHARTJS_SYSID]
})
```

**Portal Hierarchy:** `sp_page` → `sp_container` → `sp_row` → `sp_column` → `sp_instance` → SPWidget

---

## ATF Test

```ts
Test({ $id: Now.ID['test'], active: true, name: 'Test Name', description: 'Desc' }, (atf) => {
  atf.server.impersonate({ $id: '1', user: 'admin' })
  atf.server.recordInsert({ $id: '2', table: 'incident', fields: { short_description: 'Test' } })
  atf.form.openNewForm({ $id: '3', table: 'incident', view: 'itil' })
  atf.form.setFieldValue({ $id: '4', field: 'urgency', value: '2' })
  const submit = atf.form.submitForm({ $id: '5' })
  atf.rest.sendRestRequest({ $id: '6', method: 'GET', url: `/api/now/table/incident/${submit.record_id}` })
  atf.rest.assertStatusCode({ $id: '7', request: '6', statusCode: 200 })
  atf.rest.assertJsonResponsePayloadElement({ $id: '8', request: '6', jsonPath: '$.result.urgency', expectedValue: '2' })
})
```

**Output variables:** Use `step.record_id` or template `{{step["id"].record_id}}`.

---

## UiPolicy 

```ts
UiPolicy({
  $id: Now.ID['up.name'],
  table: 'incident',
  shortDescription: 'Control fields for high priority',
  onLoad: true,
  conditions: 'priority=1',
  actions: [
    { field: 'urgency', mandatory: true },
    { field: 'category', readOnly: false, visible: true }
  ]
})

// With scripts:
UiPolicy({
  $id: Now.ID['up.script'], table: 'task', shortDescription: 'Assignment validation',
  onLoad: true, conditions: 'assigned_to=', runScripts: true,
  scriptTrue: `function onCondition() { g_form.setMandatory('assigned_to', true); }`,
  scriptFalse: `function onCondition() { g_form.setMandatory('assigned_to', false); }`,
  uiType: 'desktop', isolateScript: true,
  actions: [{ field: 'assigned_to', mandatory: true }]
})
```

Creates `sys_ui_policy` + `sys_ui_policy_action` + optionally `sys_ui_policy_rl_action` records.

---

## ImportSet 

```ts
ImportSet({
  $id: Now.ID['is.user_import'],
  name: 'User Data Import',
  targetTable: 'sys_user',
  sourceTable: 'u_user_import_staging',
  active: true,
  runBusinessRules: true,
  enforceMandatoryFields: 'onlyMappedFields',
  fields: {
    first_name: 'name',       // targetField: sourceField (string shorthand)
    last_name: 'last_name',
    email: {
      sourceField: 'email',
      coalesce: true,          // Use as coalesce key
      coalesceCaseSensitive: false
    }
  },
  scripts: [{
    active: true, order: 100, when: 'onBefore',
    script: `(function runTransformScript(source, map, log, target) { /* ... */ })(source, map, log, target);`
  }]
})
```

Creates `sys_transform_map` + `sys_transform_entry` + `sys_transform_script`. Use `Record()` for `sys_data_source`.

---

## Now.attach — Image Fields

```ts
Record({
  $id: Now.ID['portal.test'], table: 'sp_portal',
  data: { title: 'Test Portal', url_suffix: 'test', icon: Now.attach('../../assets/logo.jpg') }
})
```

---

## Utility Helpers 

```ts
// Duration() — for DurationColumn fields
Duration({ days: 1, hours: 6, minutes: 30, seconds: 15 })

// Time() — for TimeColumn fields
Time({ hours: 9, minutes: 0, seconds: 0 })
Time({ hours: 9, minutes: 0, seconds: 0 }, 'America/New_York')  // with timezone

// FieldList<T>() — for FieldListColumn; dot-walking supported
FieldList<'sys_user'>(['name', 'company', 'active', 'manager.name'])

// TemplateValue() — for TemplateValueColumn; also used in Flow action.core.updateRecord
TemplateValue({ cost: 100, description: 'Catalog Item', active: true })
```

---

## EmailNotification

Creates a `sysevent_email_action` record. Controls when and what email is sent for a table event.

Key properties:
- `table`, `name`, `description`
- `triggerConditions` — `{ generationType, onRecordInsert, onRecordUpdate, condition }` where `condition` is an encoded query
- `recipientDetails` — `{ recipientFields, sendToCreator }` — `recipientFields` are field names on the table that hold user references
- `emailContent` — `{ contentType, subject, messageHtml, importance }` — subject/body support `${field}` variable substitution

---

## Role

Creates a `sys_user_role` record.

Key properties:
- `name` — scoped role name (e.g., `'x_myapp.admin'`)
- `containsRoles` — array of role names this role inherits (e.g., `['canvas_user']`)

Export the constant and reference it in `Acl`, `Applicability`, or `Workspace` definitions.

---

## Applicability

Creates a `ux_app_applicability` record that groups roles together to control workspace access.

Key properties:
- `name`
- `roles` — array of `Role` constants

---

## Workspace

Creates a `ux_workspace` record providing a Next Experience UI for managing records.
Automatically generates landing, list, and detail pages for the specified tables.

Key properties:
- `title`, `path` — display name and URL path segment
- `tables` — array of table names the workspace manages
- `listConfig` — reference to a `UxListMenuConfig` constant defining the navigation categories and list views

### UxListMenuConfig

Defines the sidebar navigation for a Workspace. Organises lists into categories.

Key properties:
- `name`, `description`
- `categories` — array of `{ $id, title, order, lists: [...] }` objects
  - Each list entry has: `$id`, `title`, `order`, `condition` (encoded query), `table`, `columns` (comma-separated field names), `applicabilities`

### Dashboard

Creates a `par_dashboard` record. Connect it to a Workspace via the `visibilities` property using a reference to the Workspace constant:

```ts
Dashboard({
  $id: Now.ID['ops_dashboard'],
  name: 'Operations Overview',
  tabs: [ /* tab configuration */ ],
  visibilities: [{
    $id: Now.ID['ops_dashboard_vis'],
    experience: opsWorkspace   // reference to your Workspace constant
  }],
  permissions: []
})
```

---

## Sla

Creates a `contract_sla` record defining service level agreements.

Key properties:
- `name`, `table`
- `duration` — a `Duration()` helper value
- `schedule` — sys_id of the `cmn_schedule` record
- `conditions` — `{ start, stop, pause?, reset? }` where each value is an encoded query string

```ts
Sla({
  $id: Now.ID['change_review_sla'],
  name: 'Normal Change Review Window',
  table: 'change_request',
  duration: Duration({ days: 5 }),
  schedule: '<business_hours_schedule_sys_id>',
  conditions: {
    start: 'state=assess',
    stop: 'state=scheduled',
    pause: 'on_hold=true'
  }
})
```
