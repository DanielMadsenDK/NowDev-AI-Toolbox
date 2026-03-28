# Fluent API Quick Reference

## Table of Contents

- [Fluent Language Constructs](#fluent-language-constructs)
- [Import Patterns](#import-patterns)
- [Table](#table)
- [List](#list)
- [ApplicationMenu and Navigation Modules](#applicationmenu-and-navigation-modules)
- [BusinessRule](#businessrule)
- [ClientScript](#clientscript)
- [ScriptInclude](#scriptinclude)
- [Record](#record)
- [REST API](#rest-api)
- [UiPage](#uipage)
- [SPWidget](#spwidget)
- [ATF Test](#atf-test)
- [UiPolicy](#uipolicy)
- [ImportSet](#importset)
- [Utility Helpers](#utility-helpers)
- [EmailNotification](#emailnotification)
- [Role](#role)
- [Acl (Access Control List)](#acl-access-control-list)
- [CrossScopePrivilege](#crossscopeprivilege)
- [Applicability](#applicability)
- [Workspace](#workspace)
- [Sla](#sla)

---

## Fluent Language Constructs

ServiceNow Fluent provides specialized language constructs for metadata definition and management. These are built-in helpers that integrate with the Fluent SDK.

### Now.ID — Define Human-Readable Unique IDs

`Now.ID` specifies unique IDs for metadata defined in source code. When you build the application, the ID is hashed into a unique `sys_id`.

**Format:** `Now.ID['String' or Number]`
**Use case:** Define IDs for any metadata object that accepts a `$id` property.

**Rules:**
- Use `Now.ID` ONLY to define IDs for metadata (tables, business rules, UI policies, etc.)
- DO NOT use `Now.ID` to reference other metadata in your application
- To reference other metadata within the same application, assign the object to a const and reference the variable

**Example:**

```ts
import '@servicenow/sdk/global'
import { Table, BusinessRule, Record } from '@servicenow/sdk/core'

// Define metadata with Now.ID
export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_snc_example.manager'
})

export const myTable = Table({
  name: 'x_app_table',
  schema: { /* ... */ }
})

export const rule = BusinessRule({
  $id: Now.ID['br.validate'],
  table: myTable.name,
  script: `// ...`
})

// Reference via const variable, NOT Now.ID
Record({
  $id: Now.ID['record.data'],
  table: 'some_table',
  data: {
    role: managerRole  // Reference the const, not Now.ID['manager_role']
  }
})
```

---

### Now.ref — Reference Metadata in Other Applications

`Now.ref` references metadata in a different application that is **not defined in source code**. Use this when you need to link to metadata from another scope or application.

**Format:** `Now.ref('table', 'sys_id' or {column: 'value'}, {column: 'value'})`

**Use cases:**
- Reference roles from the global scope
- Link to records in other applications
- Use coalescing ID references for flexible lookups

**Examples:**

```ts
import { Role } from '@servicenow/sdk/core'

Role({
  $id: Now.ID['admin_role'],
  name: 'x_test.admin',
  contains_roles: [
    'x_test.manager',
    // Coalescing ID reference — find by name
    Now.ref('sys_user_role', { name: 'x_test.itil' }),
    // GUID-based reference
    Now.ref('sys_user_role', '${itomId}'),
    // GUID with coalescing ID reference
    Now.ref('sys_user_role', '3D82d1a88947942a90b6d8aa25126d439b', { name: 'x_test.csm' }),
  ],
})
```

**Coalescing ID references:** The second and third parameters (if provided) allow the system to find a record by alternative attributes if the primary lookup fails.

---

### Now.include — Reference External File Content

`Now.include` refers to text content in another file in the same application. Use this for script content that should be in separate files with appropriate syntax highlighting.

**Format:** `Now.include('./relative/path/to/file')`

**Benefits:**
- Enables syntax highlighting for the referenced language (JavaScript, HTML, CSS, etc.)
- Supports two-way synchronization: changes in the UI sync to the file, and vice versa
- Keeps inline properties clean and maintainable
- Works with any property that accepts script or markup content

**Supported file types:** JavaScript (`.js`), TypeScript (`.ts`), HTML (`.html`), CSS (`.css`), SCSS (`.scss`), and more.

**Examples:**

```ts
import { ScriptInclude, ClientScript, UiPage } from '@servicenow/sdk/core'
import htmlEntry from '../../client/index.html'

// Business rule with external script
ScriptInclude({
  $id: Now.ID['si.main'],
  name: 'MyScriptInclude',
  apiName: 'x_app.MyScriptInclude',
  active: true,
  script: Now.include('./MyScriptInclude.server.js')
})

// Client script with external JavaScript
ClientScript({
  $id: Now.ID['cs.onload'],
  name: 'IncidentOnLoad',
  table: 'incident',
  type: 'onLoad',
  script: Now.include('./incident.client.js')
})

// UI page with external HTML (typically imported at the top)
UiPage({
  $id: Now.ID['page.dashboard'],
  endpoint: 'x_app_dashboard.do',
  html: htmlEntry  // htmlEntry imported from client/index.html
})
```

**Two-way synchronization:** Changes to fields that use `Now.include` are automatically synced between the UI and the source file.

---

### Now.attach — Attach Images to Records

`Now.attach` attaches image files to records that have image fields (like `sp_portal.icon`).

**Format:** `Now.attach('./relative/path/to/file')`

**Supported formats:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.ico`, `.svg`

**Benefits:**
- Two-way synchronization: image changes in the UI sync to the file, and vice versa
- Reusable across multiple properties by assigning to a const

**Examples:**

```ts
import { Record } from '@servicenow/sdk/core'

// Single use
Record({
  $id: Now.ID['portal.sample'],
  table: 'sp_portal',
  data: {
    title: 'Sample Portal',
    url_suffix: 'sample',
    icon: Now.attach('../../assets/servicenow.jpg')
  }
})

// Reuse image across multiple records
const appIcon = Now.attach('../../assets/app-logo.png')

Record({
  $id: Now.ID['portal.main'],
  table: 'sp_portal',
  data: {
    title: 'Main Portal',
    url_suffix: 'main',
    icon: appIcon,
    logo: appIcon  // Reuse the same image
  }
})

Record({
  $id: Now.ID['portal.alt'],
  table: 'sp_portal',
  data: {
    title: 'Alternative Portal',
    url_suffix: 'alt',
    icon: appIcon
  }
})
```

---

## Import Patterns

```ts
import '@servicenow/sdk/global'                                     // Global Now.* helpers (Now.ID, Now.ref, Now.include, Now.attach, Now.UNRESOLVED)
import { Table, BusinessRule, UiPage, ScriptInclude } from '@servicenow/sdk/core'
import { UiPolicy, ImportSet, RestApi } from '@servicenow/sdk/core'
import { EmailNotification, Workspace, Sla } from '@servicenow/sdk/core'
import { Role, Applicability, UxListMenuConfig, Dashboard } from '@servicenow/sdk/core'
import { CatalogItem, CatalogClientScript, CatalogUiPolicy, VariableSet } from '@servicenow/sdk/core'
import { CatalogItemRecordProducer } from '@servicenow/sdk/core'
import { Acl, CrossScopePrivilege } from '@servicenow/sdk/core'     // Security & Privileges
import { AnnotationType, default_view } from '@servicenow/sdk/core' // Pre-defined UI constants
import { FlowObject, FlowArray } from '@servicenow/sdk/core'        // Complex flow types
import { Flow, SubflowDefinition, wfa, trigger, action, actionStep } from '@servicenow/sdk/automation'  // Flow API
import { ActionDefinition, ActionStepDefinition, ActionStep } from '@servicenow/sdk/automation'  // Custom action definitions
import { TriggerDefinition, FDTransform } from '@servicenow/sdk/automation'  // Custom triggers & transforms
import { gs, GlideRecord } from '@servicenow/glide'                 // Server-side SN APIs
import { role as globalRole } from '#now:global/security'           // instance roles
import htmlEntry from '../../client/index.html'                     // HTML assets
import { myFn } from '../server/module.js'                          // TS module functions
// Duration(), Time(), TemplateValue(), FieldList() are global functions (no import needed)
// They are declared globally via '@servicenow/sdk/global'
```

`#now:` alias requires `"imports": { "#now:*": "./@types/servicenow/fluent/*/index.js" }` in `package.json`.

---

## Table

Creates a table [sys_db_object] to store data in an application.

**Comprehensive documentation:** See [TABLE-API.md](./TABLE-API.md)

```ts
export const myTable = Table({
  name: 'x_scope_table',
  extends: 'task',        // Optional: extend task, cmdb_ci, etc.
  extensible: true,
  display: 'name',
  autoNumber: { prefix: 'TBL', number: 1000, numberOfDigits: 7 },
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

### Supported Column Types

All column types follow the pattern `<Type>Column`. Supported types include:

`StringColumn`, `IntegerColumn`, `BooleanColumn`, `DateColumn`, `DateTimeColumn`, `ReferenceColumn`, `FloatColumn`, `EmailColumn`, `UrlColumn`, `HtmlColumn`, `MultiLineTextColumn`, `JsonColumn`, `GuidColumn`, `Password2Column`, `DurationColumn`, `TimeColumn`, `FieldListColumn`, `SlushBucketColumn`, `NameValuePairsColumn`, `TemplateValueColumn`, `ApprovalRulesColumn`, `ListColumn`, `RadioColumn`, `ChoiceColumn`, `ScriptColumn`, `VersionColumn`, `DomainIdColumn`, `DomainPathColumn`, `FieldNameColumn`, `TableNameColumn`, `UserRolesColumn`, `UserImageColumn`, `BasicImageColumn`, `DocumentIdColumn`, `TranslatedTextColumn`, `TranslatedFieldColumn`, `SystemClassNameColumn`, `GenericColumn`, `DecimalColumn`, `ConditionsColumn`, `CalendarDateTimeColumn`, `BasicDateTimeColumn`, `DueDateColumn`, `IntegerDateColumn`, `ScheduleDateTimeColumn`, `OtherDateColumn`, `DayOfWeekColumn`, `DaysOfWeekColumn`, `RecordsColumn`

**For the complete column type quick-reference table (43 column types with descriptions), and full Table API documentation, see [TABLE-API.md](./TABLE-API.md)**

---

## List

Creates a `sys_ui_list` metadata object that defines list views [columns and order] for a table.

**Comprehensive documentation:** See [LIST-API.md](./LIST-API.md)

### Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique ID for the list (e.g., `Now.ID['app_task_view_list']`). |
| `table` | String | Yes | The name of the table to which the list applies. |
| `view` | Reference or String | Yes | The variable identifier or name of the UI view [sys_ui_view], or `default_view`. |
| `columns` | Array | Yes | A list of columns to display: `[{ element: "name", position: 0 }, ...]`. |
| `$meta` | Object | No | Metadata controlling installation: `{ installMethod: 'demo' \| 'first install' }`. |

### Basic Example

```ts
import { List, default_view } from "@servicenow/sdk/core";

export const serverList = List({
    $id: Now.ID["cmdb_server_list"],
    table: "cmdb_ci_server",
    view: default_view,
    columns: [
        { element: "name", position: 0 },
        { element: "business_unit", position: 1 },
        { element: "vendor", position: 2 },
        { element: "cpu_type", position: 3 },
    ],
});
```

### With Custom View

```ts
import { List, Record } from "@servicenow/sdk/core";

const customView = Record({
   $id: Now.ID['app_view'],
   table: 'sys_ui_view',
   data: {
        name: 'app_view',
        title: 'Custom Application View'
   }
});

export const customList = List({
    $id: Now.ID["app_list"],
    table: "incident",
    view: customView,  // Reference the Record constant
    columns: [
        { element: "number", position: 0 },
        { element: "short_description", position: 1 },
        { element: "urgency", position: 2 },
        { element: "assigned_to.name", position: 3 },
    ],
});
```

---

## ApplicationMenu and Navigation Modules

Navigation is defined in its own file, typically `src/fluent/navigation.now.ts`, and exported
from `src/fluent/index.now.ts`.

### ApplicationMenu

Creates the top-level entry in the ServiceNow application navigator sidebar. Application menus define how users access your application features.

**Comprehensive documentation:** See [APPLICATION-MENU-API.md](./APPLICATION-MENU-API.md)

#### Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique ID (e.g., `Now.ID['app_menu']`). Must be exported and referenced by `sys_app_module` records. |
| `title` | String | Yes | The label displayed in the application navigator. |
| `active` | Boolean | No | Show (`true`) or hide (`false`) in navigator. Default: `true` |
| `roles` | Array | No | Array of Role constants or role name strings for role-based visibility. |
| `category` | Reference | No | Menu category (Record targeting `sys_app_category`) that defines styling. |
| `hint` | String | No | Tooltip description shown on hover. |
| `description` | String | No | Longer description of the application's purpose. |
| `name` | String | No | Internal name to distinguish menus with the same title. |
| `order` | Number | No | Relative position in navigator. Lower numbers appear first. Default: 100 |
| `$meta` | Object | No | Metadata controlling installation (`installMethod: 'demo'` or `'first install'`). |

#### Basic Example

```ts
import '@servicenow/sdk/global'
import { ApplicationMenu } from '@servicenow/sdk/core'

export const menu = ApplicationMenu({
  $id: Now.ID['app.menu'],
  title: 'My Application',
  hint: 'Short description shown as a tooltip in the navigator',
  active: true,
})
```

#### Menu with Category and Roles

```ts
import { ApplicationMenu, Record, Role } from '@servicenow/sdk/core'

export const appRole = Role({
  $id: Now.ID['app_role'],
  name: 'x_myapp.user'
})

export const appCategory = Record({
  table: 'sys_app_category',
  $id: Now.ID['app_cat'],
  data: {
    name: 'example',
    style: 'border-color: #a7cded; background-color: #e3f3ff;',
  },
})

export const menu = ApplicationMenu({
  $id: Now.ID['app.menu'],
  title: 'My Application',
  hint: 'Application for managing operations',
  description: 'Complete operations management solution with dashboards and workflows.',
  category: appCategory,
  roles: [appRole],
  order: 100,
  active: true,
})
```

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

Creates a `sys_script` metadata object that defines server-side business rules.

### Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String/Number | Yes | Unique ID for the metadata object. Format: `Now.ID['rule_id']` |
| `name` | String | Yes | Display name in ServiceNow UI |
| `table` | String | Yes | Table name this rule applies to (e.g., `'incident'`, `'change_request'`) |
| `when` | String | Yes | Execution timing: `'before'`, `'after'`, `'async'`, `'display'` |
| `action` | Array | Yes | Record operations: `['insert']`, `['update']`, `['delete']`, `['query']` — combine as needed |
| `script` | Function/String | Yes | Handler: imported function, `Now.include()`, or inline JavaScript string |
| `order` | Number | No | Execution sequence (lowest to highest). Default: 100 |
| `active` | Boolean | No | Enable/disable rule. Default: true |
| `filterCondition` | String | No | Encoded query for filtering (database-layer efficiency). Do not combine with `condition` |
| `condition` | String | No | JavaScript conditional statement (app-layer). Do not combine with `filterCondition` |
| `setFieldValue` | String | No | Encoded query for auto-setting field values: `'field=value^field2=value2'` |
| `addMessage` | Boolean | No | Display message when rule runs. Default: false |
| `message` | String | No | HTML message to display to users (requires `addMessage: true`) |
| `abortAction` | Boolean | No | Abort transaction if condition true. Default: false. Cannot perform additional actions if enabled |
| `roleConditions` | Array | No | List of Role objects or role IDs — rule only executes if user has these roles |
| `description` | String | No | Description of rule purpose and behavior |
| `protectionPolicy` | String | No | IP protection: `'read'` (read-only on download) or `'protected'` (encrypted) |
| `$meta` | Object | No | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

### Execution Timing (`when`)

- **`'before'`** — Runs before record is saved to database. Can modify the record. Supports `abortAction` to prevent save.
- **`'after'`** — Runs after record is saved. Cannot prevent save. Used to update related records.
- **`'async'`** — Runs asynchronously after database commit. No user blocking. Best for notifications, heavy operations.
- **`'display'`** — Runs when record form loads. Read-only access. Use `g_scratchpad` to pass data to client scripts.

### Filter Conditions

**`filterCondition`** (Recommended for efficiency)
```ts
BusinessRule({
  // ... other properties
  filterCondition: 'priority=1^ORpriority=2^ORstate=resolved'
})
```

**`condition`** (For complex JavaScript logic)
```ts
BusinessRule({
  // ... other properties
  condition: "current.priority == '1' && current.state != 'resolved'"
})
```

**Note:** Use `filterCondition` for database-layer filtering (more efficient), `condition` for app-layer logic. Never use both.

### Examples

**Basic Before Rule**
```ts
BusinessRule({
  $id: Now.ID['br.validate'],
  name: 'Validate Incident',
  table: 'incident',
  when: 'before',
  action: ['insert', 'update'],
  filterCondition: 'priority=1^ORpriority=2',
  script: Now.include('./validate-incident.server.js'),
  order: 50,
  active: true,
})
```

**After Rule with Related Updates**
```ts
BusinessRule({
  $id: Now.ID['br.notify'],
  name: 'Update Related Records',
  table: 'incident',
  when: 'after',
  action: ['update'],
  script: importedHandler,
  order: 100,
  active: true,
})
```

**Async Rule with Message**
```ts
BusinessRule({
  $id: Now.ID['br.async_task'],
  name: 'Background Processing',
  table: 'incident',
  when: 'async',
  action: ['insert'],
  addMessage: true,
  message: '<p>Processing incident assignment...</p>',
  script: `gs.info('async rule executed');`,
})
```

**Role-Based Display Rule**
```ts
BusinessRule({
  $id: Now.ID['br.display'],
  name: 'Load Context Data',
  table: 'incident',
  when: 'display',
  action: ['query'],
  roleConditions: [admin, manager],
  script: Now.include('./load-context.server.js'),
  active: true,
})
```

---

## ClientScript

```ts
ClientScript({
  $id: Now.ID['cs.name'], name: 'ScriptName', table: 'incident',
  type: 'onLoad',  // onLoad | onChange | onSubmit | onCellEdit
  active: true, uiType: 'all',
  script: Now.include('./script.client.js')
})
```

---

## ScriptInclude

Creates a `sys_script_include` metadata object that defines server-side script includes.

**Comprehensive documentation:** See [SCRIPT-INCLUDE-API.md](./SCRIPT-INCLUDE-API.md)

### Properties Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | N/A | Unique ID using `Now.ID[]` format |
| `name` | String | Yes | N/A | Script include name — **must match the class/function name in the implementation** |
| `script` | Script | Yes | N/A | Server-side script: inline JS, `Now.include('./file.js')`, or imported function |
| `apiName` | String | No | `<scope>.<name>` | Full scoped API name for cross-scope calls (e.g., `x_scope.MyClass`) |
| `description` | String | No | Empty | Description of the script include's purpose |
| `clientCallable` | Boolean | No | `false` | Whether client scripts can call via GlideAjax |
| `mobileCallable` | Boolean | No | `false` | Whether mobile client scripts can call this script include |
| `sandboxCallable` | Boolean | No | `false` | Whether sandbox contexts can call this script include (use sparingly for security) |
| `callerAccess` | String | No | N/A | Cross-scope access mode: `'tracking'` (auto-approved) or `'restriction'` (requires approval) |
| `accessibleFrom` | String | No | `'package_private'` | Who can access: `'public'` (all scopes) or `'package_private'` (own scope only) |
| `active` | Boolean | No | `true` | Whether the script include is enabled |
| `protectionPolicy` | String | No | N/A | IP protection: `'read'` (read-only on download) or `'protected'` (encrypted) |
| `$meta` | Object | No | N/A | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

### Quick Example

```ts
ScriptInclude({
  $id: Now.ID['si.name'],
  name: 'MyClass',
  apiName: 'x_scope.MyClass',
  script: Now.include('./MyClass.server.js'),
  description: 'Description',
  callerAccess: 'tracking',
  clientCallable: true,
  mobileCallable: true,
  sandboxCallable: false,
  accessibleFrom: 'package_private',
  active: true
})
```

**Critical rules:**
- `name` must match the class/function name in the JS implementation
- For client-callable: use full API name with GlideAjax: `new GlideAjax('x_scope.MyClass')`
- For client-callable class-based: JS must use `Object.extendsObject(global.AbstractAjaxProcessor, { ... })`

---

## Record

Creates records in any table using the Record API. Use this to define application metadata that doesn't have a dedicated ServiceNow Fluent API (such as menu categories, demo data, sample incidents, or configuration records).

### Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique ID for the metadata object. Format: `Now.ID['String' or Number]` |
| `table` | String | Yes | Name of the table to which the record belongs (e.g., `'sys_app_category'`, `'incident'`, `'cmdb_ci_server'`) |
| `data` | Object | Yes | Fields and their values in the table. Values can be primitives or `Now.include()` references to external files |
| `$meta` | Object | No | Metadata controlling installation: `{ installMethod: 'demo' \| 'first install' }` |

### data Property Details

The `data` object contains field names and values. For content stored in separate files (scripts, HTML, CSS), use `Now.include()`:

```ts
data: {
  field1: 'value',
  field2: 123,
  script: Now.include('./script-file.js'),
  html: Now.include('./html-file.html'),
  css: Now.include('./css-file.css'),
}
```

**Supported file types:** JavaScript (`.js`), TypeScript (`.ts`), HTML (`.html`), CSS (`.css`), SCSS (`.scss`), and more.

### $meta.installMethod Values

- **`'demo'`** — Record is installed with the application when the "Load demo data" option is selected
- **`'first install'`** — Record is installed only on the initial application installation

### Example: Menu Category Record

```ts
import { Record } from '@servicenow/sdk/core'

export const appCategory = Record({
  $id: Now.ID[9],
  table: 'sys_app_category',
  data: {
    name: 'example',
    style: Now.include('./css-file.css'),  // Two-way sync with external CSS
  },
})
```

### Example: Incident Record with Demo Data

```ts
import { Record } from '@servicenow/sdk/core'

export const incident1 = Record({
  $id: Now.ID['incident-1'],
  table: 'incident',
  $meta: {
    installMethod: 'demo'
  },
  data: {
    active: 'true',
    approval: 'not requested',
    description: 'Unable to send or receive emails.',
    incidentState: '1',
    shortDescription: 'Email server is down.',
    subcategory: 'email',
    callerId: '77ad8176731313005754660c4cf6a7de',
  }
})
```

### Example: Server Record with Configuration Data

```ts
import { Record } from '@servicenow/sdk/core'

export const ciserver1 = Record({
  $id: Now.ID['cmdb-ci-server-1'],
  table: 'cmdb_ci_server',
  data: {
    assetTag: 'P1000199',
    attested: 'false',
    canPrint: 'false',
    company: 'e7c1f3d53790200044e0bfc8bcbe5deb',
    cost: '2160',
    costCc: 'USD',
    cpuSpeed: '633',
    cpuType: 'GenuineIntel',
    diskSpace: '100',
    manufacturer: 'b7e7d7d8c0a8016900a5d7f291acce5c',
    name: 'DatabaseServer1',
    os: 'Linux Red Hat',
    shortDescription: 'DB Server',
    subcategory: 'Computer',
  }
})
```

### Example: Record with External Script Content

```ts
import { Record } from '@servicenow/sdk/core'

export const customConfig = Record({
  $id: Now.ID['config-script'],
  table: 'x_app_config',
  data: {
    name: 'initialization_script',
    script: Now.include('./init-script.js'),  // Two-way sync
    description: 'Application initialization logic',
  },
  $meta: {
    installMethod: 'first install'
  }
})
```

---

## REST API

```ts
RestApi({
  $id: Now.ID['api'], name: 'My API', serviceId: 'my_api', consumes: 'application/json',
  routes: [{
    $id: Now.ID['route.get'], name: 'get', method: 'GET',
    script: Now.include('./handler.server.js')
  }]
})
```

Endpoint: `/api/<scope>/<serviceId>` — `serviceId` must be unique within the application scope. For full documentation including versions, parameters, headers, and ACLs see [REST-API.md](./REST-API.md).

---

## UiPage

Create a React application hosted as a UI page.

**Comprehensive documentation:** See [UI-PAGE-API.md](./UI-PAGE-API.md)

### Quick Reference

```ts
import incidentPage from '../../client/index.html'

UiPage({
  $id: Now.ID['incident-manager-page'],
  endpoint: 'x_incident_manager.do',
  description: 'Incident Manager React App',
  category: 'general',
  html: incidentPage,
  direct: true,  // Required for React
})
```

**Key points:**
- Always set `direct: true` to prevent ServiceNow's default page scaffolding
- Import your React app's `index.html` entry point
- Include `<sdk:now-ux-globals>` in your HTML to initialize ServiceNow globals (`window.g_ck`, `GlideAjax`)
- Use GlideAjax or REST APIs for server communication (defined in ScriptInclude or RestApi objects)

---

## SPWidget

Create a custom widget for Service Portal pages. For comprehensive documentation on SPWidget, Angular providers, dependencies, and CSS/JS includes, see **[SERVICE-PORTAL-API.md](SERVICE-PORTAL-API.md)**.

```ts
SPWidget({
  $id: Now.ID['widget'], name: 'Widget', id: 'widget-id',
  clientScript: Now.include('widget.client.js'),   // AngularJS controller (c.data, $scope)
  serverScript: Now.include('widget.server.js'),   // IIFE: (function(){ data.x = y })()
  htmlTemplate: Now.include('widget.html'),
  customCss: Now.include('widget.scss'),
  hasPreview: true, demoData: { data: {} }, dependencies: [CHARTJS_SYSID],
  optionSchema: [{ name: 'opt', label: 'Option', type: 'string', section: 'behavior' }]
})
```

**Portal Hierarchy:** `sp_page` → `sp_container` → `sp_row` → `sp_column` → `sp_instance` → SPWidget

---

## ATF Test

Creates an automated test ([sys_atf_test]) with a series of steps to test your application.

**Comprehensive documentation:** See [ATF-API.md](./ATF-API.md)

### Basic Example

```ts
import { Test } from '@servicenow/sdk/core'

Test({
  $id: Now.ID['test'],
  active: true,
  name: 'Create Incident Test',
  description: 'Tests creating and validating an incident record',
  failOnServerError: true,
}, (atf) => {
  atf.form.openNewForm({
    table: 'incident',
    formUI: 'standard_ui',
  })
  atf.form.setFieldValue({
    table: 'incident',
    formUI: 'standard_ui',
    fieldValues: { urgency: '2', category: 'software' },
  })
  const output = atf.form.submitForm({
    formUI: 'standard_ui',
    assertType: 'form_submitted_to_server'
  })
  atf.server.recordValidation({
    recordId: output.record_id,
    table: 'incident',
    assertType: 'record_validated',
    fieldValues: 'urgency=2^category=software',
  })
})
```

**Key properties:**
- `$id`, `name`, `description`, `active`, `failOnServerError`
- `configurationFunction` — Callback receiving `atf` object with all test step methods

**Output variables:** Use `output.<variable>` or template `{{step["step-id"].<variable>}}` to reference outputs from previous steps.

---

## UiPolicy

Creates a `sys_ui_policy` metadata object that dynamically changes the behavior of information on a form and controls custom process flows for tasks.

**Comprehensive documentation:** See [UI-POLICY-API.md](./UI-POLICY-API.md)

UI Policies can make fields mandatory, read-only, visible, hidden, or cleared when certain conditions are met. For faster load times, use UI policies when possible instead of client scripts.

### Quick Reference

```ts
UiPolicy({
  $id: Now.ID['up.name'],
  table: 'incident',
  view: default_view,  // Required
  shortDescription: 'Control fields for high priority',
  active: true,
  onLoad: true,
  conditions: 'priority=1',
  actions: [
    { field: 'urgency', mandatory: true },
    { field: 'category', readOnly: false, visible: true }
  ]
})

// With scripts:
UiPolicy({
  $id: Now.ID['up.script'],
  table: 'task',
  view: default_view,
  shortDescription: 'Assignment validation',
  onLoad: true,
  conditions: 'assigned_to=',
  runScripts: true,
  scriptTrue: `function onCondition() { g_form.setMandatory('assigned_to', true); }`,
  scriptFalse: `function onCondition() { g_form.setMandatory('assigned_to', false); }`,
  uiType: 'desktop',
  isolateScript: true,
  actions: [{ field: 'assigned_to', mandatory: true }]
})
```

### Key Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String/Number | Yes | Unique ID using `Now.ID[]` format |
| `table` | String | Yes | Target table name (e.g., `'incident'`, `'task'`) |
| `view` | Reference or String | Yes | UI view reference or `default_view` import |
| `shortDescription` | String | Yes | Description of the policy and its purpose |
| `conditions` | String | No | Filter query for when policy applies (e.g., `'priority=1'`) |
| `actions` | Array | No | Field actions to apply (visibility, read-only, mandatory, cleared, value, message) |
| `relatedListActions` | Array | No | Related list visibility controls |
| `active` | Boolean | No | Enable/disable policy. Default: `true` |
| `onLoad` | Boolean | No | Run policy on form load. Default: `true` |
| `runScripts` | Boolean | No | Enable `scriptTrue`/`scriptFalse` execution. Default: `false` |
| `scriptTrue` | String | Conditional | Script when conditions are met (required if `runScripts: true`) |
| `scriptFalse` | String | Conditional | Script when conditions fail (required if `runScripts: true`) |
| `uiType` | String | Conditional | UI type: `'desktop'`, `'mobile-or-service-portal'`, `'all'` (required if `runScripts: true`) |

**For complete API documentation including all properties, action types, related list configuration, inheritance behavior, and advanced examples, see [UI-POLICY-API.md](./UI-POLICY-API.md)**

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

**Comprehensive documentation:** See [EMAIL-NOTIFICATION-API.md](./EMAIL-NOTIFICATION-API.md)

Key properties:
- `table`, `name`, `description`
- `triggerConditions` — `{ generationType, onRecordInsert, onRecordUpdate, condition, weight, order }` where `condition` is an encoded query
- `recipientDetails` — `{ recipientFields, recipientUsers, recipientGroups, sendToCreator, isSubscribableByAllUsers, eventParm1WithRecipient }` — `recipientFields` are field names on the table that hold user references
- `emailContent` — `{ contentType, subject, messageHtml, messageText, importance, forceDelivery, from, replyTo }` — subject/body support `${field}` variable substitution
- `digest` — `{ allow, default, type, defaultInterval, subject, html, text }` — optional email digest configuration for summarized notifications

---

## Role

Creates a `sys_user_role` record that grants specific permissions to users of an application.

**Comprehensive documentation:** See [ROLE-API.md](./ROLE-API.md)

Key properties:
- `$id` — unique ID for the role (e.g., `Now.ID['admin_role']`)
- `name` — scoped role name (e.g., `'x_myapp.admin'`)
- `description` — description of what the role can access
- `containsRoles` — array of Role constants or role names this role contains/inherits
- `canDelegate` — whether users with this role can delegate it to others (default: `true`)
- `assignableBy` — roles that can assign this role to users
- `elevatedPrivilege` — whether users must manually accept the role (default: `false`)
- `grantable` — whether the role can be granted independently (default: `true`)
- `scopedAdmin` — whether this is an Application Administrator role (default: `false`)

**Simple example:**

```ts
import { Role } from '@servicenow/sdk/core'

export const adminRole = Role({
  $id: Now.ID['admin_role'],
  name: 'x_myapp.admin',
  description: 'Application administrator'
})

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_myapp.manager',
  description: 'Team manager with extended permissions',
  containsRoles: [adminRole]  // Managers inherit admin permissions
})
```

For role hierarchies, delegation control, elevated privileges, application admin roles, and complete examples, see [ROLE-API.md](./ROLE-API.md).

---

## Acl (Access Control List)

Creates a `sys_security_acl` record that secures parts of an application.

**Comprehensive documentation:** See [ACL-API.md](./ACL-API.md)

Key properties:
- `$id` — unique ID (e.g., `Now.ID['acl_read']`)
- `type` — object type to secure (`'record'`, `'rest_endpoint'`, `'graphql'`, `'processor'`, `'ui_page'`, `'client_callable_script_include'`, etc.)
- `operation` — the operation to secure (`'read'`, `'write'`, `'delete'`, `'create'`, `'execute'`, etc.)
- `roles` — array of Role constants or role sys_ids
- `table` — table name (required for `type: 'record'` and others)
- `name` — ACL name (required for `type: 'rest_endpoint'`, `'graphql'`, etc.)
- `field` — optional field name to secure (use `'*'` for all fields)
- `condition` — optional filter query for conditional access
- `script` — optional custom JavaScript permission logic
- `adminOverrides` — whether admin role automatically passes (default: `true`)
- `active` — whether ACL is enforced (default: `true`)
- `decisionType` — `'allow'` or `'deny'` (default: `'allow'`)
- `description` — human-readable description

**Simple example:**

```ts
import { Acl, Role } from '@servicenow/sdk/core'

const adminRole = Role({ $id: Now.ID['admin'], name: 'x_app.admin' })

export const readAcl = Acl({
  $id: Now.ID['read'],
  type: 'record',
  table: 'my_table',
  operation: 'read',
  roles: [adminRole],
  description: 'Only admins can read this table'
})
```

For field-level, condition-based, script-based, and multi-type ACL examples, see [ACL-API.md](./ACL-API.md).

---

## CrossScopePrivilege

Creates a `sys_scope_privilege` record that allows scripts to access resources (tables, script includes, or script objects) in other application scopes at runtime.

**Comprehensive documentation:** See [CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md)

Key properties:
- `$id` — unique ID (e.g., `Now.ID['cross_read']`)
- `status` — authorization state: `'requested'`, `'allowed'`, `'denied'`
- `operation` — the operation to authorize: `'read'`, `'write'`, `'create'`, `'delete'`, `'execute'`
- `targetName` — name of the table, script include, or script object
- `targetScope` — application scope containing the resource (e.g., `'x_snc_example'`)
- `targetType` — resource type: `'sys_db_object'` (table), `'sys_script_include'`, or `'scriptable'` (script object)

**Simple example:**

```ts
import { CrossScopePrivilege } from '@servicenow/sdk/core'

export const readPrivilege = CrossScopePrivilege({
  $id: Now.ID['cross_read_incidents'],
  status: 'allowed',
  operation: 'read',
  targetName: 'incident',
  targetScope: 'x_snc_example',
  targetType: 'sys_db_object',
})
```

For detailed examples including table operations (create, write, delete) and script object execution, see [CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md).

---

## Applicability

Creates a `ux_app_applicability` record that groups roles together to control workspace access.

Key properties:
- `name`
- `roles` — array of `Role` constants

---

## Workspace

Creates a `ux_workspace` record providing a Next Experience UI for managing records across one or more tables.
Automatically generates landing, list, and detail pages for the specified tables.

**Comprehensive documentation:** See [WORKSPACE-API.md](./WORKSPACE-API.md)

Key properties:
- `$id` — unique identifier (hashed into sys_id at build time)
- `title` — display name for the workspace
- `path` — URL path segment (kebab-case, used in `/now/<path>/<landingPath>`)
- `tables` — array of table names the workspace manages
- `listConfig` — reference to a `UxListMenuConfig` object defining navigation structure
- `landingPath` — landing page path segment (default: `'home'`)
- `active` — flag for workspace accessibility (default: `true`)

### UxListMenuConfig

Defines the sidebar navigation for a Workspace with organized categories and filtered list views.

Key properties:
- `$id`, `name`, `description` — metadata
- `active` — visibility flag
- `categories` — array of category objects organizing lists by logical groupings

Each category contains:
- `$id`, `title`, `order`, `active`, `description`
- `lists` — array of list view objects

Each list contains:
- `$id`, `title`, `order`, `active`
- `table` — table name for the list
- `condition` — encoded query filter
- `columns` — comma-separated field names to display
- `applicabilities` — array of role-based visibility controls

### Applicability

Controls role-based visibility of lists in workspace navigation.

Properties:
- `$id`, `name`, `description`, `active`
- `roles` — array of Role objects for ACL
- `roleNames` — comma-separated role names (alternative to `roles`)

### Dashboard

Creates a `par_dashboard` record for organizing and sharing data visually with tabs, widgets, permissions, and visibility rules.

**Comprehensive documentation:** See [DASHBOARD-API.md](./DASHBOARD-API.md)

Quick example:
```ts
Dashboard({
  $id: Now.ID['ops_dashboard'],
  name: 'Operations Overview',
  tabs: [{
    $id: Now.ID['overview'],
    name: 'Overview',
    widgets: [{
      $id: Now.ID['chart'],
      component: 'vertical-bar',
      componentProps: {
        dataSources: [{
          label: 'Incident',
          sourceType: 'table',
          tableOrViewName: 'incident',
          id: 'data_source_1'
        }],
        metrics: [{
          dataSource: 'data_source_1',
          id: 'metric_1',
          aggregateFunction: 'COUNT',
          axisId: 'primary'
        }]
      },
      height: 12,
      width: 24,
      position: { x: 0, y: 0 }
    }]
  }],
  visibilities: [{
    $id: Now.ID['ops_dashboard_vis'],
    experience: opsWorkspace
  }],
  permissions: [{
    $id: Now.ID['admin_permission'],
    user: 'user_sys_id',
    owner: true,
    canRead: true,
    canWrite: true,
    canShare: true
  }]
})
```

---

## Sla

Creates a `contract_sla` record defining service level agreements that set the amount of time for a task to reach a specified condition.

**Comprehensive documentation:** See [SLA-API.md](./SLA-API.md)

### Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique ID for the SLA definition (e.g., `Now.ID['p1_incident_sla']`). |
| `name` | String | Yes | Display name for the SLA definition. |
| `table` | String | No | Target table name. Default: `'incident'` |
| `target` | String | No | SLA target: `'response'` (first response) or `'resolution'` (time to resolve). |
| `duration` | Object | Depends | Time duration using `Duration()` helper. **Required if `durationType` is empty.** |
| `durationType` | Reference | Depends | sys_id of relative duration record. **Required if `duration` is empty.** |
| `schedule` | Reference or String | Conditional | sys_id of business schedule. **Required if `scheduleSource` is `'sla_definition'`.** |
| `scheduleSource` | String | No | Schedule source: `'sla_definition'`, `'task_field'`, or `'no_schedule'`. Default: `'sla_definition'` |
| `conditions` | Object | Yes | Timing conditions: `{ start, stop, pause?, resume?, reset?, cancel? }` as encoded queries |
| `type` | String | No | SLA type: `'SLA'`, `'OLA'`, or `'Underpinning contract'`. Default: `'SLA'` |
| `active` | Boolean | No | Enable/disable SLA. Default: `true` |
| `resetAction` | String | No | Action on reset: `'cancel'` or `'complete'`. Default: `'cancel'` |
| `whenTo` | Object | No | Control resume/cancel behavior: `{ resume: 'on_condition'\|'no_match', cancel: 'on_condition'\|'no_match'\|'never' }` |
| `retroactive` | Object | No | Retroactive timing: `{ start: boolean, setStartTo: 'field_name', pause: boolean }` |
| `timezoneSource` | String | No | Timezone source for calculations. Default: `'task.caller_id.time_zone'` |
| `timezone` | String | Conditional | Time zone value (e.g., `'US/Pacific'`). **Required if `timezoneSource` is `'sla.timezone'`.** |
| `flow` | Reference or String | No | Flow to execute on SLA milestone/breach |
| `workflow` | Reference or String | No | Workflow to execute on SLA milestone/breach |
| `enableLogging` | Boolean | No | Enable debug logging. Default: `false` |
| `$meta` | Object | No | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

### Quick Example

```ts
import { Sla, Duration } from '@servicenow/sdk/core'

Sla({
  $id: Now.ID['incident_p1_resolution'],
  name: 'P1 Incident Resolution',
  table: 'incident',
  target: 'resolution',
  duration: Duration({ hours: 4 }),
  schedule: '<business_schedule_sys_id>',
  conditions: {
    start: 'priority=1',
    stop: 'state=6',
    pause: 'state=3',
    resume: 'state!=3'
  }
})
```

For complete property documentation, examples with retroactive timing, variable schedules, custom behavior, and best practices, see [SLA-API.md](./SLA-API.md).
