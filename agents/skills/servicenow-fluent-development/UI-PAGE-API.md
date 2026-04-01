# UI Page API — React Development

The UI Page API defines custom user interface (UI) pages `[sys_ui_page]` that display React applications. A UI page displays as a web page and can be added to a widget for use in dashboards.

Develop React applications with the UI Page API by adding static content files in the `src/client` directory that define the HTML, client script, and styling of the page. From the `UiPage` object, refer to the page's HTML entry point (`index.html`).

## UiPage Object

Create a UI page for a custom user interface with the `UiPage()` function.

### Properties

#### `$id` (String or Number) — Required
A unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`.

Format: `Now.ID['String' or Number]`

```ts
UiPage({
  $id: Now.ID['incident-manager-page'],
  // ...
})
```

#### `endpoint` (String) — Required
The endpoint to access the web page. The endpoint value can't contain spaces.

Format: `<scope>_<ui_page_name>.do`

```ts
UiPage({
  endpoint: 'x_incident_manager.do',
  // ...
})
```

**Note:** The scope prefix should match your application scope (e.g., `x_myapp_`).

#### `description` (String) — Optional
A description of the user interface and its purpose.

```ts
UiPage({
  description: 'Incident Response Manager UI Page',
  // ...
})
```

#### `direct` (Boolean) — Optional
Flag that indicates whether to omit the standard HTML, CSS, and JavaScript for a UI page. **For React UI pages, set this property to `true`.**

Valid values:
- `true` — Omit the standard HTML, CSS, and JavaScript and provide custom CSS and JavaScript for the page.
- `false` — Include the standard HTML, CSS, and JavaScript.

Default: `false`

```ts
// React app — use direct: true
UiPage({
  direct: true,
  // ...
})

// Traditional ServiceNow form — use direct: false or omit
UiPage({
  direct: false,
  // ...
})
```

**Important:** React-based UI pages **must** set `direct: true` to avoid conflicts with ServiceNow's default page scaffolding.

#### `html` (String) — Optional
The HTML entry point for your React application. Import your `index.html` file from the `src/client` directory.

**Note:** The html property supports only one-way synchronization with imported HTML files. After defining the HTML of a UI page in source code, if the HTML is modified outside of the source code, those changes aren't synchronized and reflected in the source code. Keep the HTML definition in the source-controlled `index.html` file.

**React HTML import pattern:**
```ts
import incidentPage from '../../client/index.html'

UiPage({
  $id: Now.ID['incident-manager-page'],
  endpoint: 'x_incident_manager.do',
  description: 'Incident Response Manager UI Page',
  category: 'general',
  html: incidentPage,
  direct: true,
})
```

> **Important — Custom Prebuild Projects:** If your project uses a `now.prebuild.mjs` script (required for React apps — see [THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md)), the `html` property must reference the **prebuild output**, not the source file. The prebuild writes transformed HTML to `dist/static/` (or the path configured in `now.config.json` as `staticContentDir`). Pointing to the source `index.html` causes a browser MIME type error because the source contains `<script src="./main.tsx" type="module">` which browsers reject.
>
> ```ts
> // Source file — DO NOT USE when a custom prebuild is present
> import incidentPage from '../../client/index.html'
>
> // Built output — USE THIS when now.prebuild.mjs is present
> import incidentPage from '../../../dist/static/index.html'
> ```

#### `category` (String) — Optional
The type of UI page.

Valid values:
- `general` — The page is general purpose.
- `homepages` — The page is used as a home page.
- `htmleditor` — The page is used to insert HTML content.
- `kb` — The page is used with a Knowledge Base.
- `cms` — The page is used with the Content Management System (CMS).
- `catalog` — The page is used with Service Catalog.

Default: `general`

```ts
UiPage({
  category: 'general',  // or 'catalog', 'cms', etc.
  // ...
})
```

#### `clientScript` (Script) — Not Recommended for React

**Do not include `clientScript` in React-based UiPage definitions.** Client-side logic belongs in React components. This field is not supported in Fluent for React UI pages and should be omitted entirely.

#### `processingScript` (Script) — Not Recommended for React

**Do not include `processingScript` in React-based UiPage definitions.** For server communication, use the Table API via `fetch()` or a ScriptInclude with GlideAjax. This field is not supported in Fluent for React UI pages and should be omitted entirely.

#### `$meta` (Object) — Optional
Metadata for the application metadata. Use the `installMethod` property to map the application metadata to an output directory that loads only in specific circumstances.

Supported values for `installMethod`:
- `demo` — Outputs the application metadata to the `metadata/unload.demo` directory to be installed with the application when the "Load demo data" option is selected.
- `first install` — Outputs the application metadata to the `metadata/unload` directory to be installed only the first time an application is installed on an instance.

```ts
UiPage({
  $id: Now.ID['incident-manager-page'],
  $meta: {
    installMethod: 'first install'
  },
  // ...
})
```

## HTML File Rules

HTML files for React UI pages have strict constraints:

- **Location**: Place only in `src/client/` — do not nest deeper in subdirectories.
- **No DOCTYPE**: Omit `<!DOCTYPE html>` declarations entirely.
- **Valid XHTML**: Use self-closing tags for void elements (`<img />`, `<br />`, `<input />`). All tags must be properly nested and closed.
- **No Jelly**: Do not use Jelly tags (`<j:...>`) in HTML files.
- **No ServiceNow script tags**: Use `<script src="..."></script>` instead of `<g:script>` or `<g:include>`.
- **No CDN scripts**: All dependencies must come from `package.json`, not external CDN URLs.
- **No inline JavaScript**: Keep HTML clean — load all logic via a single `<script src="main.jsx" type="module"></script>` tag.
- **No CSS link tags**: Do not use `<link rel="stylesheet">` in HTML. Import CSS through ESM in your JSX/JS files instead.

## CSS Patterns

ServiceNow's build system supports a specific subset of CSS patterns:

**Supported:**
- Import CSS files from JSX/JS using ESM: `import './ComponentName.css'`
- Standard class selectors and BEM-style naming conventions
- Placing CSS files alongside their components in `src/client/components/`

**Not supported:**
- CSS Modules (`.module.css` files with locally scoped classes)
- `@import` statements inside CSS files
- `<link rel="stylesheet">` tags in HTML files
- Relative CSS-in-CSS imports

Because CSS Modules aren't available, use consistent naming conventions (e.g., BEM) to prevent class name conflicts across components.

## React Development Patterns

### Full-Stack React Example

**UI Page definition (`incident-manager.now.ts`):**
```ts
import '@servicenow/sdk/global'
import { UiPage } from '@servicenow/sdk/core'
import incidentPage from '../../client/index.html'

export const incidentManagerPage = UiPage({
  $id: Now.ID['incident-manager-page'],
  endpoint: 'x_incident_manager.do',
  description: 'Incident Response Manager UI Page',
  category: 'general',
  html: incidentPage,
  direct: true,
})
```

**HTML entry point (`src/client/index.html`):**
```html
<html>
<head>
  <title>Incident Response Manager</title>

  <!-- Initialize globals and ServiceNow's required scripts -->
  <sdk:now-ux-globals></sdk:now-ux-globals>

  <!-- Load React entry point as a module — no inline JS, no CDN scripts -->
  <script src="main.jsx" type="module"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

**React entry point (`src/client/main.jsx`):**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
```

**App component (`src/client/app.tsx`):**
```tsx
import React, { useState } from 'react'
import IncidentList from './components/IncidentList'
import IncidentForm from './components/IncidentForm'

export default function App() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/now/table/incident?sysparm_display_value=all', {
        headers: { 'Accept': 'application/json', 'X-UserToken': window.g_ck },
      })
      const data = await response.json()
      setIncidents(data)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchIncidents()
  }, [])

  return (
    <div className="app">
      <h1>Incident Manager</h1>
      <IncidentForm onSubmit={fetchIncidents} />
      <IncidentList incidents={incidents} loading={loading} />
    </div>
  )
}
```

### `<sdk:now-ux-globals>` Tag

The `<sdk:now-ux-globals>` tag initializes ServiceNow global variables and required scripts. Always include this in your HTML for React UI pages to ensure access to:
- `window.g_ck` — User token required for authenticating Table API fetch calls
- ServiceNow styling and utilities

## ServiceNow Field Extraction

When fetching records with `sysparm_display_value=all` (recommended), reference fields, choice fields, and `sys_id` are returned as objects rather than plain strings. React cannot render objects directly — always extract the primitive value before rendering or using in API calls.

```jsx
// Display value (for rendering text):
const assignedTo = typeof record.assigned_to === 'object'
  ? record.assigned_to.display_value
  : record.assigned_to;

// sys_id (for PATCH/DELETE API calls):
const sysId = typeof record.sys_id === 'object'
  ? record.sys_id.value
  : record.sys_id;
```

Apply this pattern to every field that could be a reference or choice field. Also note: fields with numeric or boolean types defined in the table schema are returned as **strings** — convert with `Number()` or compare with `String(value) === 'true'` as needed.

## Authentication and Table API Calls

ServiceNow provides a global correlation token at `window.g_ck` when `<sdk:now-ux-globals>` is included. Include this token in all Table API requests to authenticate as the current user:

```javascript
const response = await fetch(`/api/now/table/${this.tableName}`, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'X-UserToken': window.g_ck,
  },
});
```

**Client service layer rules:**
- Use the Fetch API — do not use `GlideRecord` or `GlideAjax` in `src/client/` files
- Always set `sysparm_display_value=all` when fetching records so display values are available
- Implement error handling: wrap `fetch` in `try/catch`, check `response.ok`, and still parse JSON (ServiceNow returns error details in the response body even on failure)
- Handle network failures gracefully with user-friendly messages

**Example error-safe fetch:**
```javascript
async function fetchRecords() {
  try {
    const response = await fetch('/api/now/table/incident?sysparm_display_value=all', {
      headers: { 'Accept': 'application/json', 'X-UserToken': window.g_ck },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Request failed');
    }
    return data.result ?? [];
  } catch (err) {
    console.error('Failed to fetch incidents:', err);
    return [];
  }
}
```

## Table Configuration for API Access

For a table to be accessible via the Table API from a UI page, ensure these properties are set in the Fluent table definition:

```ts
Table({
  name: 'x_myapp_task',
  // ...
  accessible_from: 'public',     // Required for cross-scope access
  caller_access: 'tracking',     // Enables automatic cross-scope access
  actions: ['create', 'read', 'update', 'delete'],
  web_service_access: true,      // Required for Table API access
})
```

## Component Structure

Break UI pages into small, focused React components:

- Place components in `src/client/components/`, each in its own `.jsx` file
- Keep files under ~100 lines; a component should have one responsibility
- Use `.jsx` extension for any file containing JSX syntax
- Each component can have a co-located CSS file imported via ESM
- Use event listeners (`addEventListener`) rather than inline event handlers — inline handlers like `onclick="fn()"` do not work with ES modules

## Navigation Integration

To make your UI page accessible from the ServiceNow navigation menu, create an application module:

```ts
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

const appMenu = ApplicationMenu({
  $id: Now.ID['incident_manager_menu'],
  title: 'Incident Manager Application',
})

// Create navigation module pointing to UI page
export const navigationModule = Record({
  table: 'sys_app_module',
  data: {
    application: appMenu.$id,
    title: 'Incident Manager',
    link_type: 'DIRECT',
    query: 'x_incident_manager.do',  // UI page endpoint
    active: true,
    order: 100,
    hint: 'Open the Incident Manager',
  },
})
```

## Limitations

React UI pages in Fluent have the following build and runtime constraints:

- **CSS**: No CSS Modules, no `@import` in CSS files, no `<link>` stylesheet tags in HTML
- **Routing**: Only hash-based routing (e.g., `#/route`) is supported — no browser history API routing
- **No SSR**: React Server Components and server-side rendering are not available
- **No media**: Audio, video, and WASM files are not supported
- **No preloading**: `<link rel="preload">` is not supported
- **No hashed paths**: Output file paths are deterministic (not content-hashed)
- **No CDNs**: All dependencies must be declared in `package.json`

## Best Practices

1. **Always set `direct: true`** — Required for React apps to prevent conflicts with ServiceNow's default page scaffolding.

2. **Include `<sdk:now-ux-globals>` in your HTML** — Ensures global ServiceNow variables (`window.g_ck`) are initialized before React mounts.

3. **Keep HTML definition source-controlled** — One-way synchronization means changes to `index.html` outside source code are lost. Maintain the HTML definition in your Git-tracked `index.html` file.

4. **Separate concerns** — Keep client code in `src/client/`, server logic in `src/fluent/`, and shared utilities in separate modules.

5. **Omit `clientScript` and `processingScript`** — These fields are not supported in Fluent React UI pages. Use the Table API or ScriptIncludes instead.

6. **Use the Table API from the client** — Call ServiceNow tables via `fetch()` with `X-UserToken: window.g_ck`. Do not use GlideRecord or GlideAjax in `src/client/` files.

7. **Extract field values before rendering** — Reference/choice/sys_id fields from `sysparm_display_value=all` responses are objects. Always extract `.display_value` or `.value` before use in JSX or API calls.

8. **Use event listeners, not inline handlers** — Inline handlers (`onclick="fn()"`) do not fire in ES module context. Use `addEventListener` instead.

9. **Endpoint naming convention** — Follow `<scope>_<descriptor>.do` to avoid naming collisions (e.g., `x_myapp_incident_manager.do`).

10. **Server-side validation** — Always validate inputs on the server, even if validated on the client. Protect API calls with ACLs.

11. **Never modify build tooling** — The ServiceNow IDE handles all build and deployment automatically. Do not create `webpack.config.js`, `vite.config.js`, or similar files. Only write application code.

## Related Concepts

- [CLIENT-SERVER-PATTERNS.md](CLIENT-SERVER-PATTERNS.md) — GlideAjax and REST implementation patterns, React entry point setup
- [REST-API.md](REST-API.md) — Scripted REST APIs for external system integration
- [SCRIPT-INCLUDE-API.md](SCRIPT-INCLUDE-API.md) — Server-side logic and client-callable functions
- [ACL-API.md](ACL-API.md) — Access control for UI pages and REST APIs
- [API-REFERENCE.md](API-REFERENCE.md) — Complete Fluent API reference including UiPage quick reference

## Examples

See [EXAMPLES.md](EXAMPLES.md) for complete working examples of UI pages with React, GlideAjax, and form submission patterns.
