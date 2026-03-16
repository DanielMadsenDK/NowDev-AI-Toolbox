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

#### `clientScript` (Script) — Optional
Additional JavaScript to run in the browser for client-side initialization or interoperability with ServiceNow APIs.

For React applications, most client-side logic should be in your React components. Use this property only for:
- Initialization scripts that need to run before React mounts
- Integration with ServiceNow global APIs (e.g., `window.g_ck`)
- Non-React interoperability code

Supports external file reference via `Now.include('path/to/file')`.

**External script reference:**
```ts
UiPage({
  clientScript: Now.include('./page.client.js'),
  // ...
})
```

#### `processingScript` (Script) — Optional
A script that runs on the server for backend operations. For React applications, prefer using REST APIs or GlideAjax through a ScriptInclude instead of processingScript.

Only use processingScript if you need legacy form submission handling.

Supports:
- A function from a JavaScript module (imported into the `.now.ts` file)
- A reference to another file via `Now.include('path/to/file')`

**Imported module function:**
```ts
import { handleSubmit } from '../server/form-handler.js'

UiPage({
  processingScript: handleSubmit,
  // ...
})
```

**External script reference:**
```ts
UiPage({
  processingScript: Now.include('./page.server.js'),
  // ...
})
```

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

  <!-- Initialize globals and Include ServiceNow's required scripts -->
  <sdk:now-ux-globals></sdk:now-ux-globals>

  <!-- Include your React entry point -->
  <script src="./main.jsx" type="module"></script>
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
      // Use GlideAjax or REST API to fetch data
      const response = await fetch('/api/x_incident_manager/incidents')
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
- `window.g_ck` — Correlation key for security
- `window.GlideAjax` — For server communication
- ServiceNow styling and utilities

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

## Best Practices

1. **Always set `direct: true`** — Required for React apps to prevent conflicts with ServiceNow's default page scaffolding.

2. **Include `<sdk:now-ux-globals>` in your HTML** — Ensures global ServiceNow variables (`window.g_ck`, `GlideAjax`) are initialized.

3. **Keep HTML definition source-controlled** — One-way synchronization means changes to `index.html` outside source code are lost. Maintain the HTML definition in your Git-tracked `index.html` file.

4. **Separate concerns** — Keep client code in `src/client/`, server logic in `src/fluent/`, and shared utilities in separate modules.

5. **Use GlideAjax for internal ServiceNow APIs** — Preferred for server communication within ServiceNow (see [CLIENT-SERVER-PATTERNS.md](CLIENT-SERVER-PATTERNS.md)).

6. **Use REST APIs for external integrations** — Required when integrating with external systems (see [REST-API.md](REST-API.md)).

7. **Endpoint naming convention** — Follow `<scope>_<descriptor>.do` to avoid naming collisions (e.g., `x_myapp_incident_manager.do`).

8. **Server-side validation** — Always validate inputs on the server, even if validated on the client. Protect API calls with ACLs.

## Related Concepts

- [CLIENT-SERVER-PATTERNS.md](CLIENT-SERVER-PATTERNS.md) — GlideAjax and REST implementation patterns, React entry point setup
- [REST-API.md](REST-API.md) — Scripted REST APIs for external system integration
- [SCRIPT-INCLUDE-API.md](SCRIPT-INCLUDE-API.md) — Server-side logic and client-callable functions
- [ACL-API.md](ACL-API.md) — Access control for UI pages and REST APIs
- [API-REFERENCE.md](API-REFERENCE.md) — Complete Fluent API reference including UiPage quick reference

## Examples

See [EXAMPLES.md](EXAMPLES.md) for complete working examples of UI pages with React, GlideAjax, and form submission patterns.
