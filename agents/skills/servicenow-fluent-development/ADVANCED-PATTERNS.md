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

## Now.ref — Cross-Record References

Use `Now.ref()` to create a reference to a record in another table. Use it when a field needs to point to a record that isn't defined in the current file — for example, referencing a role, a flow, or any record identified by its sys_id or coalesce keys.

### Syntax

```ts
// By coalesce keys — identifies the record by unique field values
Now.ref(table: string, keys: { [key: string]: string }): any

// By sys_id or Now.ID key — identifies the record by GUID
Now.ref(table: string, guid: string, keys?: { [key: string]: string }): any
```

### Reference by coalesce keys

When you know the unique field values that identify a record:

```ts
import { Acl } from '@servicenow/sdk/core'

Acl({
  $id: Now.ID['incident-read-acl'],
  type: 'record',
  operation: 'read',
  table: 'incident',
  roles: [
    Now.ref('sys_user_role', { name: 'admin' }),
    Now.ref('sys_user_role', { name: 'itil' }),
  ],
})
```

### Reference by sys_id

When you have the record's sys_id:

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['my-catalog-item'],
  table: 'sc_cat_item',
  data: {
    name: 'Request Laptop',
    flow: Now.ref('sys_hub_flow', 'a1b2c3d4e5f67890abcdef1234567890'),
  },
})
```

### Reference by Now.ID key

If the target record is also defined in your Fluent project, you can use its `Now.ID` key as the guid:

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['my-catalog-item'],
  table: 'sc_cat_item',
  data: {
    name: 'Request Laptop',
    flow: Now.ref('sys_hub_flow', 'test_flow_for_service_catalog'),
  },
})
```

### Reference with fallback coalesce keys

Provide both a GUID and coalesce keys — the keys act as a fallback identifier:

```ts
Now.ref('sys_hub_flow', 'a1b2c3d4...', { name: 'My Flow' })
```

### When to use Now.ref vs direct references

| Scenario | Use |
|----------|-----|
| Record defined in same project | Return value of the API function (e.g., `const role = Role({...})`) |
| Record on the instance, known sys_id | `Now.ref('table', 'sys_id')` |
| Record on the instance, known unique fields | `Now.ref('table', { field: 'value' })` |
| Record in same project, different file | `Now.ID['key-name']` or `Now.ref('table', 'key-name')` |

---

## Now.attach — Image Attachments

`Now.attach()` attaches an image file to a record at build time. It reads the file, compresses it, and creates the corresponding `sys_attachment` and `sys_attachment_doc` records in the XML output.

### Syntax

```ts
Now.attach(path: ImagePath): Image
```

The file path is **relative to the `.now.ts` file** that contains the call.

### Supported image formats

| Extension | Format |
|-----------|--------|
| `.jpg`, `.jpeg` | JPEG |
| `.png` | PNG |
| `.gif` | GIF |
| `.bmp` | Bitmap |
| `.ico` | Icon |
| `.svg` | SVG |

Both lowercase and uppercase extensions are accepted (e.g., `.PNG`, `.JPG`).

### How it works

1. The SDK reads the image file from disk
2. Compresses the file data using gzip
3. Splits the compressed data into base64-encoded chunks
4. Generates a SHA-256 hash for deduplication
5. Creates `sys_attachment` and `sys_attachment_doc` records linked to the parent record

**Round-trip transformation:** When importing existing ServiceNow XML metadata back into a Fluent project (XML-to-Fluent transform), the SDK reverses this process — it extracts the attachment data back into an image file on disk and regenerates the `Now.attach()` call in the `.now.ts` output. This ensures image assets are always maintained as standalone files.

Source: https://servicenow.github.io/sdk/guides/now-attach-guide

### Examples

```ts
import { Record } from '@servicenow/sdk/core'

// Portal with a logo
Record({
  $id: Now.ID['my-portal'],
  table: 'sp_portal',
  data: {
    title: 'My Portal',
    icon: Now.attach('../../assets/portal-icon.png'),
  },
})

// Reuse the same image across multiple fields (avoids re-reading/compressing)
const logo = Now.attach('../../assets/company-logo.jpg')

Record({
  $id: Now.ID['portal-a'],
  table: 'sp_portal',
  data: {
    title: 'Portal A',
    icon: logo,
    logo: logo,
  },
})

// Share an image across multiple records
const icon = Now.attach('../../assets/app-icon.png')

Record({
  $id: Now.ID['portal-one'],
  table: 'sp_portal',
  data: { title: 'Portal One', icon: icon },
})

Record({
  $id: Now.ID['portal-two'],
  table: 'sp_portal',
  data: { title: 'Portal Two', icon: icon },
})
```

### File organization

Keep image assets in an `assets/` directory at the project root:

```
src/
├── fluent/
│   ├── portal.now.ts        ← Now.attach('../../assets/logo.png')
│   └── generated/
│       └── keys.ts
├── assets/
│   ├── logo.png
│   ├── favicon.ico
│   └── banner.jpg
└── now.config.json
```

---

## Now.include — File Content Inlining

`Now.include()` populates a record field with the contents of a file at build time. It reads the file and inlines its text into the XML output, keeping source files separate for IDE support (syntax highlighting, IntelliSense, linting).

**Where an API supports it, use JavaScript modules instead for server-side scripts.** Modules support `import`/`export`, provide access to typed Glide APIs, and enable code reuse. `Now.include()` is always the right choice for **client-side scripts**, **HTML**, and **CSS**, and is also required for server-side APIs whose `script` property only accepts strings.

### When to use Now.include() vs modules

Not all APIs accept module imports. Some `script` properties are typed as `string` only — attempting to pass a module import will produce a compiler or build error. When that happens, use `Now.include()`.

| Content type | Recommended approach |
|---|---|
| Business rules, scripted REST routes, script actions, UI actions, scheduled scripts | **Modules** — these APIs accept function types |
| Record producer scripts (`script`, `postInsertScript`) | **Modules** — these APIs accept function types |
| Script includes | **Now.include()** — these APIs only accept strings |
| Client-side scripts (client scripts, catalog client scripts, UI policy scripts) | **Now.include()** — modules are not available in the browser |
| HTML templates (UI Pages, widgets) | **Now.include()** |
| CSS / SCSS (widgets, UI Pages) | **Now.include()** |
| Record API data fields | **Now.include()** — Record data values are strings |
| Any API where a module import causes a compiler/build error | **Now.include()** — fall back when the API doesn't support functions |

### Syntax

```ts
Now.include(filePath: string): string
```

The file path is **relative to the `.now.ts` file** that contains the call.

### Supported file types

| Type | Common extensions | Use case |
|------|------------------|----------|
| JavaScript | `.js`, `.client.js` | Client scripts, UI policy scripts, catalog client scripts |
| HTML | `.html` | UI Page HTML, widget templates |
| CSS/SCSS | `.css`, `.scss` | Widget styles, UI Page styles |

### Examples

**Client Script with external file:**

```ts
import { ClientScript } from '@servicenow/sdk/core'

ClientScript({
  $id: Now.ID['validate-form'],
  name: 'Validate Form',
  table: 'incident',
  type: 'onSubmit',
  script: Now.include('../../client/validate-form.client.js'),
})
```

**UI Page with HTML, client script, and processing script:**

```ts
import { UiPage } from '@servicenow/sdk/core'

UiPage({
  $id: Now.ID['my-ui-page'],
  endpoint: 'my_custom_page.do',
  html: Now.include('../../server/UiPage/my-page.html'),
  clientScript: Now.include('../../server/UiPage/my-page.client-script.client.js'),
  processingScript: Now.include('../../server/UiPage/my-page.processing-script.server.js'),
})
```

**Service Portal Widget:**

Widgets use `Now.include()` for client scripts, HTML, and CSS. Server scripts in widgets also use `Now.include()` because the widget server script runtime does not support modules.

```ts
import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
  $id: Now.ID['my-widget'],
  name: 'My Custom Widget',
  clientScript: Now.include('../../server/SPWidget/my-widget.client.js'),
  serverScript: Now.include('../../server/SPWidget/my-widget.server.js'),
  htmlTemplate: Now.include('../../server/SPWidget/my-widget.html'),
  customCss: Now.include('../../server/SPWidget/my-widget.scss'),
})
```

**Record with HTML content:**

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['my-record'],
  table: 'x_my_table',
  data: {
    name: 'My Record',
    description_html: Now.include('./html/description.html'),
  },
})
```

**Inline alternative** — for very short client scripts, use inline strings instead:

```ts
ClientScript({
  $id: Now.ID['simple-onload'],
  name: 'Welcome Message',
  table: 'incident',
  type: 'onLoad',
  script: `function onLoad() {
      g_form.addInfoMessage('Welcome!');
  }`,
})
```

### Round-trip transformation

`Now.include()` supports a clean round-trip workflow:

- **Build time:** The SDK reads the external file and inlines its contents into the XML output field.
- **Transform time (XML → Fluent):** When importing existing ServiceNow XML metadata back into a Fluent project, the SDK reverses the process — it extracts field content into separate files on disk and regenerates `Now.include()` calls in the `.now.ts` output.

This ensures scripts, HTML, and CSS are always maintained as standalone files with full IDE support regardless of the direction of transformation.

### Bridging module logic through string-only APIs

Some APIs (such as Script Includes) only accept strings, but you may want to reuse logic written as a TypeScript module. The bridging pattern is to write a thin wrapper script that uses `require()` to load the compiled module output:

```js
// my-script-include.server.js  (included via Now.include())
(function() {
  var logic = require('./dist/server/my-logic.js');
  // expose methods on the Script Include or call module exports
  answer = logic.myFunction(current);
})();
```

This is particularly common for Script Includes that need to bridge TypeScript module code to legacy callers such as GlideAjax or cross-scope APIs. The full pattern for cross-scope Script Include wrappers is covered in the [Cross-Scope Module Pattern](#cross-scope-module-pattern-advanced) section above.

Source: https://servicenow.github.io/sdk/guides/now-include-guide

---

## The keys.ts File and Now.ID

Every Fluent project has an auto-generated `keys.ts` file that maps human-readable identifiers to ServiceNow sys_ids. It's the registry that makes `Now.ID['my-record']` work.

### Location

```
src/fluent/generated/keys.ts
```

This file is **auto-generated by the build system** — you should not normally need to edit it by hand.

### Purpose

ServiceNow identifies every record by a 32-character sys_id. Working with raw sys_ids in source code is error-prone and unreadable. The keys file maps meaningful names to sys_ids:

```ts
$id: Now.ID['validate-on-insert']  // readable
// resolves to sys_id: '4103297d12554b488d489c0bf1ceff19'
```

### Key types

**Explicit keys** — direct mappings from a developer-chosen name to a table and sys_id. Created when you use `$id: Now.ID['some-name']`.

- You choose the key name — it can be any string
- The sys_id is auto-generated on first build and stable thereafter
- IDE autocomplete suggests existing keys when you type `Now.ID['`

**Composite keys** — for records identified by a combination of field values (coalesce keys) rather than a single name. Auto-generated for child/descendant records like table columns, documentation entries, and choice values. You don't interact with composite keys directly.

**Deleted keys** — tracks records removed from the project. Prevents sys_id reuse and enables clean uninstall.

### How Now.ID works

**First build (key is new):**

1. Build system sees the key is not in keys.ts
2. Generates a new sys_id
3. Adds the entry to keys.ts
4. Uses that sys_id in the XML output

**Subsequent builds (key exists):**

1. Looks up the key in keys.ts
2. Finds the existing sys_id
3. Uses the **same** sys_id — ensuring the record is updated, not duplicated

### Best practices

- **Don't edit keys.ts manually** unless you need to fix a specific mapping
- **Do commit keys.ts to version control** — it's the source of truth for record identity
- **Use meaningful key names** — `'validate-priority-on-insert'` is better than `'1'`
- **Don't worry about composite keys** — they're fully automatic

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

## Data Helper Functions

Fluent provides global helper functions for creating typed values in `Record()` data fields. These functions are available globally — no import needed.

### Duration()

Creates a duration value in ServiceNow format. Used with `DurationColumn` fields.

```ts
Duration({ days: 1, hours: 6, minutes: 30, seconds: 15 })
// Serialized to: '1970-01-02 06:30:15'
```

**Parameters:**

| Property | Type | Description |
|----------|------|-------------|
| `days` | `number` | Optional. Number of days |
| `hours` | `number` | Optional. Number of hours |
| `minutes` | `number` | Optional. Number of minutes |
| `seconds` | `number` | Optional. Number of seconds |

**Example:**

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['my-sla-record'],
  table: 'contract_sla',
  data: {
    name: 'Priority 1 SLA',
    duration: Duration({ days: 0, hours: 4 }),
  },
})
```

### Time()

Creates a time-of-day value in ServiceNow format (UTC). Used with `TimeColumn` fields.

The time is converted from the specified timezone to UTC. If no timezone is provided, the system timezone is used.

```ts
// System timezone (default)
Time({ hours: 14, minutes: 30, seconds: 0 })

// Explicit timezone — 14:30 EST converts to 19:30 UTC
Time({ hours: 14, minutes: 30, seconds: 0 }, 'America/New_York')

// UTC (no conversion)
Time({ hours: 9, minutes: 0, seconds: 0 }, 'UTC')
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `value.hours` | `number` | Optional. Hour (0-23) |
| `value.minutes` | `number` | Optional. Minutes (0-59) |
| `value.seconds` | `number` | Optional. Seconds (0-59) |
| `timeZone` | `string` | Optional. IANA timezone (e.g., `'America/New_York'`, `'UTC'`). Defaults to system timezone |

**Example:**

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['daily-job'],
  table: 'sysauto_script',
  data: {
    name: 'Daily Data Processing',
    run_time: Time({ hours: 9, minutes: 0, seconds: 0 }, 'UTC'),
  },
})
```

### TemplateValue()

Creates a template value serialized as a ServiceNow encoded query string. Used with `TemplateValueColumn` fields.

Supports a generic table parameter for type-safe field IntelliSense.

```ts
// Generic — accepts any key/value pairs
TemplateValue({ cost: 100, description: 'Item', active: true })
// Serialized to: 'cost=100^description=Item^active=true^EQ'

// Table-specific — provides IntelliSense for sc_cat_item fields
TemplateValue<'sc_cat_item'>({ cost: 100, description: 'Item', category: 'Hardware' })
```

**Example:**

```ts
import { Record } from '@servicenow/sdk/core'

Record({
  $id: Now.ID['onboarding-task'],
  table: 'sc_cat_item',
  data: {
    name: 'New Laptop Request',
    template: TemplateValue<'sc_req_item'>({
      short_description: 'Laptop setup',
      priority: 2,
      assignment_group: 'IT Hardware',
    }),
  },
})
```

### FieldList()

Creates a comma-separated list of field names. Used with `FieldListColumn` and `SlushBucketColumn` fields.

Supports a generic table parameter for type-safe field IntelliSense, including dot-walk paths.

```ts
// Generic — accepts any strings
FieldList(['name', 'description', 'cost'])
// Serialized to: 'name,description,cost'

// Table-specific — provides IntelliSense and dot-walk support
FieldList<'sc_cat_item'>(['name', 'description', 'cost', 'category', 'assigned_to.name'])
```

**Example:**

```ts
import { Table, FieldListColumn, TableNameColumn } from '@servicenow/sdk/core'

Table({
  name: 'x_myapp_config',
  label: 'Config',
  schema: {
    target_table: TableNameColumn({ label: 'Target Table' }),
    display_fields: FieldListColumn({ label: 'Display Fields', dependent: 'target_table' }),
  },
})

Record({
  $id: Now.ID['config-record'],
  table: 'x_myapp_config',
  data: {
    target_table: 'sc_cat_item',
    display_fields: FieldList<'sc_cat_item'>(['name', 'description', 'cost', 'availability']),
  },
})
```

---

## AI / LLM Integration with sn_generative_ai

Use `sn_generative_ai.LLMClient` to call the platform's generative AI capabilities from server-side scripts. This API is available in Script Includes, Business Rules, Scripted REST APIs, and any server-side execution context.

### Pattern: Script Include Wrapper (Recommended)

Create a **Script Include** as a wrapper for all LLM calls so the logic is reusable and testable:

```javascript
var LLMHelper = Class.create();
LLMHelper.prototype = {
    initialize: function() {},

    generateSummary: function(text) {
        var llmClient = new sn_generative_ai.LLMClient();
        var prompt = 'Summarize the following text in 2-3 sentences:\n\n' + text;
        try {
            var result = llmClient.call({ prompt: prompt });
            if (result.status === 'Success') {
                return result.response.trim();
            } else {
                gs.error('LLM call failed: ' + result.response);
                return '';
            }
        } catch (e) {
            gs.error('LLM exception: ' + e.message);
            return '';
        }
    },

    type: 'LLMHelper'
};
```

### Calling Pattern

The `llmClient.call()` method accepts a `prompt` string and returns a result object:

```javascript
var llmClient = new sn_generative_ai.LLMClient();
var prompt = 'Your specific AI task prompt here';
try {
    var result = llmClient.call({ prompt: prompt });
    if (result.status === 'Success') {
        var response = result.response.trim();
        // use response
    } else {
        gs.error('LLM error: ' + result.response);
    }
} catch (e) {
    gs.error('LLM exception: ' + e.message);
}
```

### Result Object

| Property | Type | Description |
|----------|------|-------------|
| `status` | string | `'Success'` when the call succeeded; other values indicate failure |
| `response` | string | The LLM-generated text response (or error message if status ≠ 'Success') |

### Integration Points

| Caller | Pattern |
|--------|---------|
| Business Rules | Call the Script Include directly in rule script |
| Scripted REST API | Call the Script Include in the REST handler function |
| Client Script (via GlideAjax) | Call a Script Include method that wraps `sn_generative_ai.LLMClient` |

### Best Practices

- Always wrap `llmClient.call()` in `try/catch` — the call can throw if the AI service is unavailable
- Always check `result.status === 'Success'` before using `result.response`
- Create a Script Include for LLM calls so the prompt logic is reusable and not duplicated
- Trim the response (`result.response.trim()`) to remove leading/trailing whitespace
