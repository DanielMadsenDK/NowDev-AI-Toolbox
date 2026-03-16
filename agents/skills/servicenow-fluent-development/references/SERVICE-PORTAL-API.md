# Service Portal API

## Overview

The Service Portal API enables you to define custom widgets, Angular providers, and dependencies for Service Portal pages. Service Portals provide self-service interfaces for end users.

For general information about portals, see [Service Portal](https://docs.servicenow.com/bundle/washingtondc-servicenow-platform/page/build/service-portal/concept_building_a_service_portal.html).

---

## SPWidget Object

Create a custom widget `[sp_widget]` to include on a portal page.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** A name for the widget. |
| `category` | String | The type of widget. Valid values: `standard`, `otherApplications`, `custom`, `sample`, `knowledgeBase`, `servicePortal`, `serviceCatalog`. Default: `custom` |
| `clientScript` | Script | A client-side script that defines the AngularJS controller. This property supports inline JavaScript or a reference to another file using `Now.include('path/to/file')`. Default: `api.controller=function() { var c = this; };` |
| `serverScript` | Script | A server-side script that sets initial widget state or runs server-side queries. This property supports inline JavaScript or `Now.include('path/to/file')`. Default: `(function() { /* populate 'data' object */ })();` |
| `controllerAs` | String | A variable for a reference to the controller in the directive's scope. The client script accesses server data using `c.data` by default. Default: `c` |
| `htmlTemplate` | String | **Required.** The body HTML code that renders when the page is shown. Supports static XHTML, Jelly, script includes, or UI Macros. Use inline HTML or `Now.include('path/to/file')`. Default: `<div><!-- your widget template --></div>` |
| `customCss` | String | The CSS or SCSS that defines widget style. Supports inline CSS or `Now.include('path/to/file')`. |
| `dataTable` | String | The table in which to store widget instance options. To define a custom option schema, extend the Widget Instance `[sp_instance]` table. Default: `sp_instance` |
| `demoData` | String or Object | Data that demonstrates widget functionality. Supports inline JSON, file reference via `Now.include('path/to/file')`, or inline JSON objects. |
| `description` | String | A description of the widget and its purpose. |
| `docs` | Reference | The variable identifier of Service Portal documentation `[sp_documentation]` that provides additional information. |
| `fields` | Array | A list of column names from the data table to use in the widget option schema. |
| `hasPreview` | Boolean | Flag indicating whether you can preview the widget from the Widget Editor. Valid values: `true`, `false`. Default: `false` |
| `id` | String | A unique ID for the widget. Cannot contain spaces. |
| `linkScript` | Script | A link function that uses AngularJS to directly manipulate the DOM. Supports inline JavaScript or `Now.include('path/to/file')`. Default: `function link(scope, element, attrs, controller) { }` |
| `roles` | Array | A list of variable identifiers of Role objects or role names that can access the widget. |
| `optionSchema` | Array | A list of parameters that a Service Portal administrator (`sp_admin`) can configure for widget instances. Enables widget reuse with unique configurations per instance. |
| `public` | Boolean | Flag indicating whether the widget is available to unauthenticated users. Valid values: `true` (unauthenticated access), `false` (authenticated only). Default: `false` |
| `dependencies` | Array | A list of variable identifiers of SPWidgetDependency objects or sys_ids of dependencies for the widget. |
| `angularProviders` | Array | A list of variable identifiers of SPAngularProvider objects or sys_ids of Angular providers for the widget. |
| `templates` | Array | A list of Angular ng-templates `[sp_ng_template]` to associate with the widget. Angular ng-templates contain content rendered conditionally. |
| `$meta` | Object | Metadata for the application metadata. Supports `installMethod` property: `demo` (install with demo data), `first install` (install only on first installation). |

### optionSchema Structure

Each option schema item supports these properties:

```ts
optionSchema: [
  {
    name: 'String',           // Required: parameter name
    label: 'String',          // Required: label in widget instance options
    section: 'String',        // Required: section location (data, behavior, documentation, presentation, other)
    type: 'String',           // Required: data type (string, boolean, integer, reference, choice, fieldList, fieldName, glideList, glyphIcon)
    defaultValue: 'String',   // Optional: default value
    hint: 'String'            // Optional: tooltip description
  },
  // ... more options
]
```

### Example

```ts
import { SPWidget, Record } from '@servicenow/sdk/core'

const widgetDoc = Record({
  table: 'sp_documentation',
  data: {
    title: 'My Widget Documentation'
  }
})

export const myWidget = SPWidget({
  $id: Now.ID['my_simple_widget'],
  name: 'My Simple Widget',
  category: 'knowledgeBase',
  clientScript: Now.include('./client.js'),
  serverScript: Now.include('./server.js'),
  controllerAs: '$ctrl',
  customCss: Now.include('./custom_css.css'),
  dataTable: 'sp_instance',
  demoData: { message: 'Hello, World!' },
  description: 'This is a test widget',
  docs: widgetDoc,
  htmlTemplate: Now.include('./template.html'),
  fields: ['color', 'class_name'],
  hasPreview: true,
  id: 'my-simple-widget',
  linkScript: Now.include('./link.client.js'),
  optionSchema: [
    {
      name: 'my_option',
      label: 'My Option',
      type: 'string',
      section: 'behavior',
      defaultValue: 'default_value',
      hint: 'Configure this option'
    }
  ],
  roles: ['admin'],
  dependencies: [myDependency],
  angularProviders: [myProvider],
  templates: [
    {
      $id: Now.ID['template1'],
      id: 'my-template',
      htmlTemplate: Now.include('./my-template.html')
    }
  ]
})
```

---

## SPAngularProvider Object

Create an Angular Provider `[sp_angular_provider]` to reuse components in multiple widgets and improve portal performance.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** A name for the Angular provider. |
| `clientScript` | Script | A client-side script to reuse in widgets. Supports inline JavaScript or `Now.include('path/to/file')`. |
| `type` | String | The type of Angular provider. Valid values: `directive`, `factory`, `service`. Default: `directive` |
| `requires` | Array | A list of variable identifiers of other SPAngularProvider objects or sys_ids of required Angular providers. |
| `$meta` | Object | Metadata for the application metadata. Supports `installMethod` property: `demo`, `first install`. |

### Example

```ts
import { SPAngularProvider } from '@servicenow/sdk/core'

const OTHER_ANGULAR_PROVIDER = 'd11f285fe069e1f119b44bd05c0770aa'

export const myAngularProvider = SPAngularProvider({
  $id: Now.ID['my_angular_provider'],
  name: 'my_angular_provider',
  clientScript: Now.include('./my_angular_provider.client.js'),
  type: 'directive',
  requires: [OTHER_ANGULAR_PROVIDER]
})
```

---

## SPWidgetDependency Object

Create a widget dependency `[sp_dependency]` to link JavaScript and CSS files to widgets and use third-party libraries, external style sheets, or Angular modules.

Dependencies are loaded asynchronously from the server when needed. Keep dependencies as small as possible for efficient load times.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** The name of the widget dependency. |
| `angularModuleName` | String | The name of the Angular module to load if the JS include is an Angular module. |
| `includeOnPageLoad` | Boolean | Flag indicating when the dependency loads on a page. Valid values: `true` (load with initial page), `false` (load only when widget is loaded). Default: `false` |
| `cssIncludes` | Array | A list of CssInclude objects or sys_ids of CSS includes with their load order. |
| `jsIncludes` | Array | A list of JsInclude objects or sys_ids of JS includes with their load order. |
| `portalsForPageLoad` | Array | A list of sys_ids of portals `[sp_portal]` that load the widget dependency. If empty, the dependency is included on page load for all portals. |
| `$meta` | Object | Metadata for the application metadata. Supports `installMethod` property: `demo`, `first install`. |

### cssIncludes Structure

```ts
cssIncludes: [
  {
    order: Number,         // Load order (lower loads first)
    include: Reference or String  // CssInclude variable or sys_id
  },
  // ... more CSS includes
]
```

### jsIncludes Structure

```ts
jsIncludes: [
  {
    order: Number,         // Load order (lower loads first)
    include: Reference or String  // JsInclude variable or sys_id
  },
  // ... more JS includes
]
```

### Example

```ts
import { SPWidgetDependency } from '@servicenow/sdk/core'

export const sampleDependency = SPWidgetDependency({
  $id: Now.ID['samplejs'],
  name: 'Sample',
  angularModuleName: 'samplejs',
  includeOnPageLoad: true,
  portalsForPageLoad: ['b4572a48262a16df3032b48cef75a853', 'fe12dbbed14bd3f712f0787141c2f656'],
  cssIncludes: [
    {
      order: 100,
      include: localCss,
    },
    {
      order: 200,
      include: '94112ccb0fb3c2ed072b01d3cb401196',
    },
  ],
  jsIncludes: [
    {
      order: 100,
      include: localJs,
    },
    {
      order: 200,
      include: 'f8af18a5e6c71a3702c4f2038b43cf62',
    },
  ],
})
```

---

## CssInclude Object

Create a CSS include `[sp_css_include]` to reference a style sheet or external CSS in a widget dependency.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** The name of the CSS include. |
| `url` | String | The URL to an external CSS file. Required if `spCss` is not provided. |
| `spCss` | String | The sys_id of a style sheet `[sp_css]`. Required if `url` is not provided. |
| `rtlCssUrl` | String | The URL to an external right-to-left (RTL) CSS file for mirroring widget direction when the session language is right-to-left (e.g., Hebrew). |
| `lazyLoad` | Boolean | Flag indicating how to load the CSS include. Applies only if you use `spCss` property. Valid values: `true` (load asynchronously), `false` (don't load asynchronously). Default: `false` |
| `$meta` | Object | Metadata for the application metadata. Supports `installMethod` property: `demo`, `first install`. |

### Example

```ts
import { CssInclude } from '@servicenow/sdk/core'

export const localCss = CssInclude({
  $id: Now.ID['sample_styles'],
  name: 'Sample Styles',
  spCss: '50e3e32aa321b1c7d1945c5f423228bd',
})
```

---

## JsInclude Object

Create a JS include `[sp_js_include]` to reference a UI script or external JavaScript code in a widget dependency.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** The name of the JS include. |
| `url` | String | The URL to an external JavaScript file. Must be an absolute path. Required if `sysUiScript` is not provided. |
| `sysUiScript` | String | The sys_id of a UI script `[sys_ui_script]`. Required if `url` is not provided. |
| `$meta` | Object | Metadata for the application metadata. Supports `installMethod` property: `demo`, `first install`. |

### Example

```ts
import { JsInclude } from '@servicenow/sdk/core'

export const localJs = JsInclude({
  $id: Now.ID['sample_framework'],
  name: 'Sample Framework',
  sysUiScript: 'b67af05645f738df1f286bb3e9ecd55f',
})
```

---

## Complete Widget Example

Here's a full example showing widget, dependencies, and providers working together:

```ts
import { SPWidget, SPWidgetDependency, SPAngularProvider, CssInclude, JsInclude, Record } from '@servicenow/sdk/core'

// Define CSS and JS includes
const widgetCss = CssInclude({
  $id: Now.ID['widget_styles'],
  name: 'Widget Styles',
  spCss: '50e3e32aa321b1c7d1945c5f423228bd',
})

const widgetJs = JsInclude({
  $id: Now.ID['widget_script'],
  name: 'Widget Script',
  sysUiScript: 'b67af05645f738df1f286bb3e9ecd55f',
})

// Define a dependency
export const widgetDependency = SPWidgetDependency({
  $id: Now.ID['widget_dependency'],
  name: 'Widget Dependency',
  includeOnPageLoad: false,
  cssIncludes: [{ order: 100, include: widgetCss }],
  jsIncludes: [{ order: 100, include: widgetJs }],
})

// Define an Angular provider for shared functionality
export const widgetProvider = SPAngularProvider({
  $id: Now.ID['widget_provider'],
  name: 'widget_provider',
  clientScript: Now.include('./provider.js'),
  type: 'service',
})

// Define the widget
export const myPortalWidget = SPWidget({
  $id: Now.ID['portal_widget'],
  name: 'My Portal Widget',
  category: 'custom',
  description: 'A custom portal widget with dependencies',
  clientScript: Now.include('./widget.client.js'),
  serverScript: Now.include('./widget.server.js'),
  htmlTemplate: Now.include('./widget.html'),
  customCss: Now.include('./widget.css'),
  hasPreview: true,
  public: false,
  dependencies: [widgetDependency],
  angularProviders: [widgetProvider],
  optionSchema: [
    {
      name: 'title',
      label: 'Widget Title',
      type: 'string',
      section: 'presentation',
      defaultValue: 'My Widget',
      hint: 'The title displayed at the top of the widget'
    },
    {
      name: 'color_scheme',
      label: 'Color Scheme',
      type: 'choice',
      section: 'presentation',
      defaultValue: 'light'
    }
  ],
  roles: ['admin', 'user'],
  templates: [
    {
      $id: Now.ID['alt_template'],
      id: 'alternate-view',
      htmlTemplate: Now.include('./alternate-template.html')
    }
  ]
})
```

---

## Best Practices

1. **Minimize Dependencies:** Keep widget dependencies small. Large dependencies increase download size and impact page load time.
2. **Lazy Load:** Use `includeOnPageLoad: false` for dependencies not needed on initial page load.
3. **Organize Files:** Keep widget scripts, templates, and styles in separate files for maintainability.
4. **Angular Modules:** Use `angularModuleName` when defining Angular module dependencies.
5. **Option Schema:** Define clear option schema with helpful hints for portal administrators.
6. **Roles:** Restrict widget access via `roles` when appropriate.
7. **Demo Data:** Provide meaningful demo data for widget preview and testing.
8. **RTL Support:** Include `rtlCssUrl` if your widget targets right-to-left languages.

---

## Related Concepts

- **Service Portal** — Portal framework for self-service interfaces
- **ServiceNow Fluent** — Fluent language constructs (`Now.ID`, `Now.ref`, `Now.include`, `Now.attach`)
- **AngularJS** — Client-side framework for widget controllers
- **Fluent Language Constructs** — See [API-REFERENCE.md](API-REFERENCE.md) for `Now.ID`, `Now.ref`, `Now.include`
