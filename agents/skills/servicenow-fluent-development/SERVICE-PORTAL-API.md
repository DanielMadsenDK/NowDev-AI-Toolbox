# Service Portal API

Source: https://servicenow.github.io/sdk/guides/service-portal-guide

## Overview

The Service Portal API enables you to define custom widgets, Angular providers, and dependencies for Service Portal pages. Service Portals provide self-service interfaces for end users.

For general information about portals, see [Service Portal](https://docs.servicenow.com/bundle/washingtondc-servicenow-platform/page/build/service-portal/concept_building_a_service_portal.html).

---

## When to Use Service Portal

- Building branded self-service portals for employees, customers, or partners
- Creating custom portal pages with responsive layouts
- Developing interactive widgets with client-server communication
- Customizing portal appearance through themes, headers, and footers
- Setting up navigation menus for portal structure
- Creating shared AngularJS services, directives, and factories
- Managing external JavaScript and CSS library dependencies

## When NOT to Use Service Portal

- Platform UI Pages — use UI Page API instead
- Next Experience / UI Builder pages
- Backend scripts without UI components
- Flow Designer workflows
- Workspace components in Next Experience

---

## Key Instructions

1. **Always use dedicated Fluent APIs** — Never use `Record()` for Service Portal components (except `sp_header_footer`)
2. **Check OOTB components first** — Verify out-of-the-box equivalents exist before creating custom ones
3. **Verify uniqueness** — Confirm `urlSuffix`, `pageId`, and widget `name`/`id` are unique across the instance
4. **Bootstrap 3 only** — Service Portal uses Bootstrap 3, not versions 4 or 5
5. **AngularJS 1.x only** — Use controller alias `c` instead of `$scope`
6. **Separate files for widgets** — Use `Now.include()` for scripts, templates, and styles
7. **No placeholders** — Replace all placeholder values with actual data
8. **Query only when referencing existing components** — Don't query before creating new ones
9. **Scoped app restrictions** — Use scoped-safe APIs only (see table below)
10. **Run UI diagnostics after install** — Verify portal loads without errors

---

## Component Hierarchy

```
Portal (sp_portal)
├── Theme (sp_theme)
│   ├── Header (sp_header_footer)
│   └── Footer (sp_header_footer)
├── Main Menu (sp_instance_menu)
└── Pages (sp_page)
    └── Containers → Rows → Columns → Widget Instances (sp_instance)
        └── Widgets (sp_widget)
            ├── Dependencies (sp_dependency)
            └── Angular Providers (sp_angular_provider)
```

## API to Table Mapping

| Component | Fluent API | ServiceNow Table |
|-----------|-----------|-----------------|
| Portal | `ServicePortal()` | `sp_portal` |
| Page | `SPPage()` | `sp_page` |
| Widget | `SPWidget()` | `sp_widget` |
| Theme | `SPTheme()` | `sp_theme` |
| Menu | `SPMenu()` | `sp_instance_menu` |
| Angular Provider | `SPAngularProvider()` | `sp_angular_provider` |
| Widget Dependency | `SPWidgetDependency()` | `sp_dependency` |
| Header/Footer | `SPHeaderFooter()` | `sp_header_footer` |

---

## Scoped Application Restrictions

Use only scoped-safe APIs in widget scripts:

| Global (NOT Allowed in Scoped) | Scoped Alternative |
|------------------------------|-------------------|
| `nowDateTime()` | `new GlideDateTime()` |
| `getXMLWait()` | `c.server.get()` or REST API |
| `gs.print()` | `gs.info()`, `gs.error()` |

---

## Widget Script Communication

**Server Script Context variables:**
- `data` — object passed to client
- `input` — client input from `c.server.get()` or `c.server.update()`
- `options` — widget option values

**Client Script Context variables:**
- `c.data` — data from server
- `c.options` — widget options
- `c.server.get(input)` — call server (GET)
- `c.server.update()` — call server (POST with `c.data` as input)
- `c.server.refresh()` — reload widget entirely

---

## Avoidance Patterns

Never do any of the following in Service Portal:

- Use `Record()` for Service Portal components
- Use GlideAjax in widgets
- Omit `setLimit()` on GlideRecord queries
- Omit `track by` on `ng-repeat`
- Use Bootstrap 4/5 classes
- Use `$scope` directly (use controller alias `c`)
- Use hardcoded hex colors in widget CSS (use theme SCSS variables)
- Use raw `px` values for `font-size` (use `$sp-text-*` variables)
- Use `!important` in widget CSS
- Use inline `style=""` attributes
- Re-add bundled libraries (jQuery, AngularJS, Bootstrap)
- Use `includeOnPageLoad: true` unless truly global
- Use `href="#"` on anchor elements
- Use `alert()` or `console.log()` in production widgets

---

## Implementation Workflow

1. Understand requirements and identify needed components
2. Check OOTB reusability — always prefer existing components
3. Create components bottom-up: dependencies → providers → widgets → pages → themes → portal
4. Verify unique identifiers (`urlSuffix`, `pageId`, widget `id` and `name`)
5. Validate configuration (menus require theme + header + mainMenu)
6. Generate code using dedicated Fluent API constructors
7. Run UI diagnostics after install
8. Share portal URL with user

---

## OOTB Themes Available

Verify existence on target instance before referencing.

| Name | Sys ID | Description |
|------|--------|-------------|
| Coral | `281507c44317d210ca4c1f425db8f2fd` | Coral color-scheme branding |
| La Jolla | `a7a6e78277002300a6e592718a10617a` | Modern flat design |
| Stock | `79315153cb33310000f8d856634c9c4b` | Default baseline |
| Stock - High Contrast | `f84873986711320023c82e08f585ef6a` | Accessibility-compliant |
| EC Theme | `9b6f06d71bb8f85047582171604bcb9c` | Employee Center default |
| Portal Next Experience | `f548bd34845a1110f87767389929c667` | Next-gen portal (Polaris) |

**Recommendation:** Prefer Coral first, then La Jolla. Always verify existence before referencing.

---

## CSS Variable Rules for Themes

- Only `--now-*` tokens exist as platform CSS custom properties
- Use `sp-rgb(--now-token, #hex) !default` when token exists
- Use hex directly when no token exists
- Always add `!default` for per-portal variable overrides

### Navbar Color Alignment

When `customCss` declares a custom `$brand-primary`, also set these 8 navbar variables to keep the navigation consistent:

- `$navbar-inverse-bg`
- `$navbar-inverse-border`
- `$navbar-inverse-link-color`
- `$navbar-inverse-link-hover-color`
- `$navbar-inverse-link-active-color`
- `$navbar-inverse-brand-color`
- `$navbar-inverse-toggle-icon-bar-bg`
- `$navbar-inverse-toggle-border-color`

---

## File Organization Structure

```
fluent/
├── service-portal/
│   └── portal.now.ts
├── sp-page/
│   ├── home/
│   │   └── home-page.now.ts
│   └── login/
│       └── login-page.now.ts
├── sp-widget/
│   └── my_widget/
│       ├── widget.now.ts
│       ├── server_script.js
│       ├── client_script.js
│       ├── template.html
│       └── styles.css
├── sp-theme/
│   └── theme.now.ts
├── sp-instance-menu/
│   └── menu.now.ts
├── sp-angular-provider/
│   └── provider.now.ts
├── sp-dependency/
│   └── dependency.now.ts
└── sp-header-footer/
    └── header.now.ts
```

---

## Menu Display Prerequisites

Navigation menus require ALL THREE of the following:
1. Portal has `theme` configured
2. Theme has `header` configured (`sp_header_footer` record)
3. Portal has `mainMenu` configured

---

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

---

## ServicePortal Object

Create the portal container record (`sp_portal`) that brings together pages, themes, and navigation into a unified self-service experience.

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique metadata identifier |
| `title` | string | Portal display name shown in the browser tab and header |
| `urlSuffix` | string | URL path to access the portal (e.g. `'esc'` → `/esc`). Lowercase, may contain hyphens/underscores |

### Key Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `homePage` | `string \| SPPage \| Record<'sp_page'>` | Default landing page when navigating to the portal root |
| `loginPage` | `string \| SPPage \| Record<'sp_page'>` | Page shown to unauthenticated users |
| `notFoundPage` | `string \| SPPage \| Record<'sp_page'>` | Page rendered for unmatched routes (404) |
| `theme` | `string \| SPTheme \| Record<'sp_theme'>` | Light mode theme applied to all pages |
| `darkTheme` | `string \| SPTheme \| Record<'sp_theme'>` | Dark mode theme |
| `mainMenu` | `string \| SPMenu \| Record<'sp_instance_menu'>` | Navigation menu in the portal header |
| `logo` | string | Logo image — sys_id of a `user_image` or `Now.attach()` reference |
| `catalog` | `string \| Record<'sc_catalog'>` | Default service catalog |
| `knowledgeBase` | `string \| Record<'kb_knowledge_base'>` | Default knowledge base |
| `defaultPortal` | boolean | Makes this the portal for `/?id=<pageId>` navigation |
| `inactive` | boolean | Deactivates the portal; redirects to `alternatePortal` |
| `enableAiSearch` | boolean | Enables AI-powered search (requires `searchApplication`) |
| `enableFavorites` | boolean | Enables user-pinned Quick Start favorites |
| `catalogs` | array | Ordered list of `{ catalog, order, active }` catalog entries |
| `knowledgeBases` | array | Ordered list of `{ knowledgeBase, order, active }` KB entries |

### Example

```typescript
import { ServicePortal } from '@servicenow/sdk/core'
import { employeePortalTheme } from './portal-theme.now'
import { portalHomePage, loginPage } from './portal-pages.now'

export const employeePortal = ServicePortal({
    $id: Now.ID['employee_center'],
    title: 'Employee Center',
    urlSuffix: 'esc',
    theme: employeePortalTheme.$id,
    homePage: portalHomePage.$id,
    loginPage: loginPage.$id,
    defaultPortal: true,
    enableFavorites: true,
    enableAiSearch: false,
    logo: Now.attach('./assets/portal-logo.png'),
    catalogs: [
        { catalog: 'sys_id_of_it_catalog', order: 100, active: true },
        { catalog: 'sys_id_of_hr_catalog', order: 200, active: true },
    ],
})
```

---

## SPMenu Object

Create a navigation menu instance (`sp_instance_menu`) with structured menu items for portal header navigation.

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique identifier |
| `title` | string | Heading text for the menu |
| `widget` | `string \| SPWidget \| Record<'sp_widget'>` | The widget rendered for this menu |
| `items` | `SPMenuItem[]` | Array of menu item definitions |
| `roles` | array | Role names or Role constants restricting menu visibility |
| `active` | boolean | Whether the menu is rendered. Default: `true` |
| `order` | number | Sort order within its column |

### Menu Item Structure

Each item in `items` supports:

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique identifier |
| `type` | string | Item type: `'page'`, `'kb_topic'`, `'url'`, etc. |
| `label` | string | Display text |
| `page` | string | `sp_page.id` or sys_id for `'page'` type items |
| `url` | string | External URL for `'url'` type items |
| `order` | number | Sort position within the menu |
| `active` | boolean | Whether the item is visible |
| `glyph` | string | FontAwesome icon name (without `fa-` prefix) |
| `color` | string | Bootstrap color (`'default'`, `'primary'`, `'info'`, etc.) |
| `childItems` | `SPMenuItem[]` | Nested items for dropdown sub-menus |
| `roles` | array | Role restrictions for this item |

### Example

```typescript
import { SPMenu } from '@servicenow/sdk/core'

export const mainPortalMenu = SPMenu({
    $id: Now.ID['portal_main_menu'],
    title: 'Employee Center Navigation',
    widget: 'sys_id_of_menu_widget',
    roles: ['employee'],
    active: true,
    items: [
        {
            $id: Now.ID['menu_item_home'],
            type: 'page',
            label: 'Home',
            page: 'index',
            order: 100,
            active: true,
            glyph: 'home',
        },
        {
            $id: Now.ID['menu_item_catalog'],
            type: 'page',
            label: 'Request Something',
            page: 'catalog',
            order: 200,
            active: true,
            childItems: [
                {
                    $id: Now.ID['menu_item_it'],
                    type: 'page',
                    label: 'IT Services',
                    page: 'catalog',
                    order: 100,
                },
                {
                    $id: Now.ID['menu_item_hr'],
                    type: 'page',
                    label: 'HR Services',
                    page: 'hr_catalog',
                    order: 200,
                },
            ],
        },
    ],
})
```

---

## SPPage Object

Create a portal page (`sp_page`) with a structured layout of containers, rows, columns, and widget instances.

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `pageId` | string | URL identifier used in routing (`?id=<pageId>`). **Required.** Unique within the portal |
| `containers` | `SPContainer[]` | Top-level layout sections of the page |
| `css` | string | Page-scoped CSS |
| `category` | string | Groups the page in the designer: `'custom'`, `'standard'`, `'kb'`, `'sc'`, etc. |

### Layout Hierarchy

```
SPPage
  └── SPContainer[]
        └── SPRow[]
              └── SPColumn[]   (size 1–12, Bootstrap grid)
                    └── SPInstance[]   (widget instances)
```

### Example

```typescript
import { SPPage, SPMenu } from '@servicenow/sdk/core'

export const portalHomePage = SPPage({
    pageId: 'index',
    category: 'custom',
    containers: [
        {
            $id: Now.ID['home_hero_container'],
            order: 100,
            cssClass: 'hero-container',
            rows: [
                {
                    $id: Now.ID['home_hero_row'],
                    order: 100,
                    columns: [
                        {
                            $id: Now.ID['home_hero_col'],
                            size: 12,
                            order: 100,
                            instances: [
                                {
                                    $id: Now.ID['home_hero_widget'],
                                    widget: 'sys_id_of_hero_widget',
                                    order: 100,
                                    active: true,
                                    widgetParameters: { title: 'Welcome to Employee Center' },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
})
```

---

## SPTheme Object

Create a portal theme (`sp_theme`) that controls global portal appearance — headers, footers, CSS variables, and included assets.

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique identifier |
| `name` | string | Display name in the portal designer and theme picker |

### Key Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `customCss` | string | SCSS variable definitions applied globally (e.g. `$nav-color: #333;`) |
| `header` | `string \| Record<'sp_header_footer'>` | Header widget rendered at the top of every page |
| `footer` | `string \| Record<'sp_header_footer'>` | Footer widget rendered at the bottom of every page |
| `fixedHeader` | boolean | Keeps header anchored to top viewport while scrolling. Default: `true` |
| `fixedFooter` | boolean | Keeps footer anchored to bottom viewport while scrolling. Default: `true` |
| `logo` | `string \| Image` | Portal logo — sys_id or `Now.attach()` reference |
| `logoAltText` | string | Accessible alt text for the logo |
| `icon` | `string \| Image` | Browser favicon |
| `cssIncludes` | `CssIncludeWithOrder[]` | CSS files loaded on every page using this theme |
| `jsIncludes` | `JsIncludeWithOrder[]` | JS files loaded on every page using this theme |
| `matchingNextExperienceTheme` | string | Links to a Next Experience theme for consistent cross-UI branding |
| `turnOffScssCompilation` | boolean | Disables server-side SCSS — use for plain CSS custom properties. Default: `false` |

### Example

```typescript
import { SPTheme, CssInclude, JsInclude } from '@servicenow/sdk/core'

const portalStyles = CssInclude({
    $id: Now.ID['portal_theme_css'],
    name: 'Employee Center Styles',
    spCss: 'sys_id_of_custom_css_record',
})

export const employeePortalTheme = SPTheme({
    $id: Now.ID['employee_center_theme'],
    name: 'Employee Center Theme',
    customCss: '$nav-color: #0070d2; $brand-primary: #0070d2; $brand-primary-dark: #005fb2;',
    header: 'sys_id_of_header_widget',
    footer: 'sys_id_of_footer_widget',
    fixedHeader: true,
    fixedFooter: false,
    logoAltText: 'Employee Center',
    logo: Now.attach('./assets/logo.png'),
    cssIncludes: [
        { order: 100, include: portalStyles },
    ],
})
```

### Build Order for Service Portal

When building a complete portal, follow this order:

1. `CssInclude` and `JsInclude` — referenced by SPTheme and SPWidgetDependency
2. `SPHeaderFooter` — referenced by SPTheme `header`/`footer`
3. `SPTheme` — referenced by ServicePortal
4. `SPAngularProvider` and `SPWidgetDependency` — referenced by SPWidget
5. `SPWidget` — referenced by SPMenu and SPPage instances
6. `SPMenu` — referenced by ServicePortal `mainMenu`
7. `SPPage` — referenced by ServicePortal page properties
8. `SPPageRouteMap` — references SPPage objects (created after pages exist)
9. `ServicePortal` — depends on all of the above

---

## SPHeaderFooter Object

Create a Service Portal header or footer (`sp_header_footer`). Headers and footers are special widgets that extend `sp_widget` with positioning capabilities for consistent placement across portal pages.

> **Note:** `SPHeaderFooter` is a dedicated Fluent API. Do not use `Record()` for headers and footers.

### Key Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[...]` | Yes | Unique identifier |
| `name` | string | Yes | The name of the header/footer widget |
| `htmlTemplate` | string | No | HTML template for the widget content |
| `serverScript` | string | No | Server-side script |
| `clientScript` | string | No | Client-side script |
| `customCss` | string | No | Custom CSS/SCSS |
| `static` | boolean | No | Whether this header/footer appears on all portal pages. Default: `false` |
| `id` | string | No | Unique widget ID (alphanumeric, `-`, `_`) |
| `hasPreview` | boolean | No | Show preview in Widget Editor. Default: `false` |
| `description` | string | No | Description of the widget |
| `angularProviders` | array | No | Array of Angular providers |
| `dependencies` | array | No | Array of widget dependencies |
| `roles` | array | No | Roles that can access the widget |
| `optionSchema` | array | No | Configurable widget options |
| `category` | string | No | Widget category. Default: `'custom'` |
| `controllerAs` | string | No | Controller alias. Default: `'c'` |
| `$meta` | Object | No | Installation metadata (`installMethod: 'demo'` or `'first install'`) |

### OOTB Headers and Footers

Always reuse OOTB headers and footers first. Only create custom when explicitly requested.

| Record        | Sys ID                             |
| ------------- | ---------------------------------- |
| Stock Header  | `bf5ec2f2cb10120000f8d856634c9c0c` |
| Sample Footer | `feb4f763df121200ba13a4836bf26320` |

### SPHeaderFooter Example

```typescript
import { SPHeaderFooter } from '@servicenow/sdk/core'

SPHeaderFooter({
    $id: Now.ID['static-header'],
    name: 'Static Portal Header',
    id: 'static-header',
    description: 'A static header that appears on all portal pages',
    htmlTemplate: Now.include('./header_template.html'),
    serverScript: Now.include('./header_server.js'),
    clientScript: Now.include('./header_client.js'),
    customCss: Now.include('./header_styles.css'),
    static: true,
    hasPreview: true,
})
```

---

## SPPageRouteMap Object

Create a page route map (`sp_page_route_map`) — a redirect rule that automatically routes users from one page to another within a portal. Route maps can be scoped to specific portals and roles, and support priority ordering when multiple rules match the same source page.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[...]` | Yes | Unique identifier |
| `routeFromPage` | string or SPPage | Yes | Source page — when a user navigates here, they are redirected |
| `routeToPage` | string or SPPage | Yes | Destination page the user is redirected to |
| `active` | boolean | No | Whether the route is active. Default: `true` |
| `order` | number | No | Evaluation priority (lower = evaluated first). Default: `10` |
| `portals` | array | No | Portals this mapping is scoped to. Omit to apply to all portals. |
| `roles` | array | No | Roles whose members follow this route. Omit to apply to all users. |
| `shortDescription` | string | No | Admin-facing description |

### SPPageRouteMap Example

```typescript
import { SPPageRouteMap } from '@servicenow/sdk/core'

export const dashboardRedirect = SPPageRouteMap({
    $id: Now.ID['dashboard-redirect'],
    routeFromPage: 'b5f4d31047132100ba13a5554ee49002',
    routeToPage: 'c6e5e42047132100ba13a5554ee49003',
    shortDescription: 'Redirect to new dashboard for ITIL users',
    portals: ['fe12dbbed14bd3f712f0787141c2f656'],
    roles: ['itil', 'admin'],
    active: true,
    order: 50,
})
```

---

## Bootstrap 3 and AngularJS Reference

Service Portal uses **Bootstrap 3** (not 4/5) and **AngularJS 1.x** (not Angular 2+).

### Bootstrap 3 Grid Patterns

| Layout Type             | Bootstrap Classes                  |
| ----------------------- | ---------------------------------- |
| Full-width              | `col-md-12`                        |
| Main + sidebar          | `col-md-8` + `col-md-4`           |
| Equal 2-column          | `col-md-6 col-xs-12` x 2          |
| 3-column cards          | `col-md-4 col-sm-6 col-xs-12` x 3 |
| 4-column stat tiles     | `col-md-3 col-sm-6 col-xs-12` x 4 |

Always add `col-xs-12` — every column must stack on mobile.

### AngularJS Binding Reference

| Pattern                 | Usage                                                  |
| ----------------------- | ------------------------------------------------------ |
| Two-way data binding    | `ng-model="c.data.fieldName"`                          |
| Display only            | `ng-bind="c.data.value"` or `{{c.data.value}}`        |
| Remove from DOM         | `ng-if="c.data.showSection"`                           |
| Hide/show (keep in DOM) | `ng-show="c.loading"`                                  |
| List iteration          | `ng-repeat="item in c.data.rows track by item.sys_id"` |
| Click handler           | `ng-click="c.methodName()"`                            |
| Dynamic class           | `ng-class="{'sp-active': c.selected === item.sys_id}"` |
| Disable button          | `ng-disabled="c.submitting"`                           |

### Key Rules

- Use controller alias `c` (not `$scope`): `var c = this;`
- Every `ng-repeat` must have `track by` (e.g., `track by item.sys_id`)
- Use `.panel`, `.btn-default`, `.col-xs-*` through `.col-lg-*` (Bootstrap 3 classes)
- Never use GlideAjax in widgets — use `c.server.get()` instead
- Never add bundled libraries (jQuery, AngularJS, Bootstrap) — they are already included
