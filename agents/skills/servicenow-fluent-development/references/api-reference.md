# Fluent API Quick Reference

## Import Patterns

```ts
import '@servicenow/sdk/global'                                     // Global Now.* helpers
import { Table, BusinessRule, UiPage, ScriptInclude } from '@servicenow/sdk/core'
import { UiPolicy, ImportSet, RestApi, script } from '@servicenow/sdk/core'
import { Duration, Time, FieldList, TemplateValue } from '@servicenow/sdk/core' // helpers
import { EmailNotification, Workspace, Sla } from '@servicenow/sdk/core'
import { Role, Applicability, UxListMenuConfig, Dashboard } from '@servicenow/sdk/core'
import { CatalogItem, CatalogClientScript, CatalogUiPolicy, VariableSet } from '@servicenow/sdk/core'
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

## ApplicationMenu and Navigation Modules

Navigation is defined in its own file, typically `src/fluent/navigation.now.ts`, and exported
from `src/fluent/index.now.ts`.

### ApplicationMenu

Creates the top-level entry in the ServiceNow application navigator sidebar.

```ts
import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

export const menu = ApplicationMenu({
  $id: Now.ID['app.menu'],
  title: 'My Application',
  hint: 'Short description shown as a tooltip in the navigator',
})
```

`$id` must be exported and referenced by any `sys_app_module` records that belong to this menu.

---

### sys_app_module — Navigation Modules

Each module is a `Record()` call targeting the `sys_app_module` table.
The `application` field **must** reference `menu.$id` — never use `Now.ID[...]` directly here.

#### Required fields on every module

| Field | Type | Description |
|---|---|---|
| `title` | String | Label shown in the navigator |
| `application` | Reference | `menu.$id` — points to the parent ApplicationMenu |
| `active` | Boolean | `true` to show in navigator |
| `link_type` | String | Controls what happens when the user clicks the module (see below) |
| `order` | Number | Sort order within the menu; lower numbers appear first |
| `hint` | String | Tooltip description |

#### Link type field matrix

| `link_type` | Extra required fields | Use case |
|---|---|---|
| `'LIST'` | `name` — target table name (e.g. `myTable.name`) | Opens a list view of a table |
| `'NEW'` | `name` — target table name | Opens a new-record form for a table |
| `'DIRECT'` | `query` — UI page endpoint (e.g. `'x_scope_page.do'`) | Opens a custom UI page directly |

> **`LIST` / `NEW`:** use the `name` field (set it to the table name).  
> **`DIRECT`:** use the `query` field (set it to the page endpoint); do **not** set `name`.

---

### Full Example

```ts
// src/fluent/navigation.now.ts
import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'
import { myTable } from './tables/MyTable.now.js'

export const menu = ApplicationMenu({
  $id: Now.ID['app.menu'],
  title: 'My Application',
  hint: 'Manage My Application records',
})

// Opens a list of all records
Record({
  $id: Now.ID['module.list'],
  table: 'sys_app_module',
  data: {
    title: 'All Records',
    application: menu.$id,
    active: true,
    link_type: 'LIST',
    name: myTable.name,
    order: 100,
    hint: 'View all My Application records',
  },
})

// Opens a blank new-record form
Record({
  $id: Now.ID['module.new'],
  table: 'sys_app_module',
  data: {
    title: 'New Record',
    application: menu.$id,
    active: true,
    link_type: 'NEW',
    name: myTable.name,
    order: 200,
    hint: 'Create a new My Application record',
  },
})

// Opens a custom UI page
Record({
  $id: Now.ID['module.dashboard'],
  table: 'sys_app_module',
  data: {
    title: 'Dashboard',
    application: menu.$id,
    active: true,
    link_type: 'DIRECT',
    query: 'x_scope_my_dashboard.do',
    order: 300,
    hint: 'Open the custom dashboard',
  },
})
```

Export from `src/fluent/index.now.ts`:

```ts
export { menu } from './navigation.now.js'
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
  $id: Now.ID['api'], name: 'My API', service_id: 'my_api', consumes: 'application/json',
  routes: [{
    $id: Now.ID['route.get'], name: 'get', method: 'GET',
    script: script`(function process(request, response) { response.setBody({ ok: true }) })(request, response)`
  }]
})
```

Endpoint: `/api/<scope>/<service_id>` — `service_id` must be unique within the application scope.

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
  atf.server.impersonate({ $id: 'step1', user: 'admin' })
  atf.server.recordInsert({
    $id: 'step2', table: 'incident', assert: 'record_successfully_inserted',
    enforceSecurity: false,
    fieldValues: { short_description: 'Test Incident', urgency: '2' },
  })
  atf.form.openNewForm({ $id: 'step3', table: 'incident', formUI: 'standard_ui' })
  atf.form.setFieldValue({
    $id: 'step4', table: 'incident', formUI: 'standard_ui',
    fieldValues: { urgency: '2', category: 'software' },
  })
  atf.form.submitForm({ $id: 'step5', formUI: 'standard_ui', assert: '' })
  atf.rest.sendRestRequest({
    $id: 'step6', method: 'get',
    path: "/api/now/v2/table/incident/{{step['step2'].record_id}}",
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: '', queryParameters: {},
  })
  atf.rest.assertStatusCode({ $id: 'step7', operation: 'equals', statusCode: 200 })
  atf.rest.assertJsonResponsePayloadElement({
    $id: 'step8', operation: 'equals',
    elementName: '/result/urgency', elementValue: '2',
  })
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
