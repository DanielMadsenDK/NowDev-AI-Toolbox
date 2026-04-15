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

## Horizon Design System Theming

The Horizon Design System defines foundational rules for generating ServiceNow-compliant UIs. Include `<sdk:now-ux-globals></sdk:now-ux-globals>` in your HTML to enable theming support.

### Core Principles

1. **Fluid**: Use relative units (`rem`, `%`, `auto`) and spacing tokens, not fixed pixels.
2. **Symphonic**: Consistent radius, shadows, and typography ensure unified experience.
3. **Accessible**: WCAG 2.1 AA compliance: text contrast >= 4.5:1, visible focus states, keyboard navigation, semantic HTML.

### Foundation Token Patterns

| Property | Token Pattern | Available Values |
| --- | --- | --- |
| **Spacing** | `--now-static-space--{size}` | xxs (0.125rem), xs (0.25rem), sm (0.5rem), md (0.75rem), lg (1rem), xl (1.5rem), xxl (2rem), 3xl (2.5rem) |
| **Drop Shadows** | `--now-static-drop-shadow--{size}` | sm, md, lg, xl, xxl |
| **Border Radius** | `--now-static-border-radius--{size}` | sm (0.125rem), md (0.25rem), lg (0.5rem) |
| **Font Sizes** | `--now-static-font-size--{size}` | sm (0.75rem), md (1rem), lg (1.25rem), xl (1.5rem) |
| **Line Height** | `--now-static-line-height` | 1.25 (unitless) |
| **Font Family** | `--now-font-family` | Lato, Arial, sans-serif |

### Semantic Token Categories

| Element Type | Token Category | Example |
| --- | --- | --- |
| Buttons, CTAs | `actionable` | `--now-actionable--primary--background-color` |
| Inputs, Checkboxes | `form-control` | `--now-form-control-input--primary--border-color` |
| Containers, Cards | `container` | `--now-container-card--background-color-alpha` |
| Windows, Modals | `window` | `--now-window--border-color` |
| Menus, Lists | `menu` | `--now-menu-list--primary--background-color` |
| Navigation | `navigation` | `--now-navigation-page_tabs--primary--background-color` |
| Alerts, Banners | `messaging` | `--now-messaging--primary_warning--border-color` |
| Status Indicators | `indicator` | `--now-indicator--primary_critical--background-color` |
| Typography | `display-type` | `--now-display-type_label--font-weight` |

### Token Integrity Rules

1. Each visual property MUST use a valid design token
2. Tokens MUST belong to correct semantic category
3. Fallbacks MUST follow chained `var()` structure
4. Colors MUST be wrapped with `rgb()` or `rgba()`
5. No hard-coded color values — use tokens

```css
/* Correct fallback chain */
var(--now-actionable--primary--background-color, var(--now-color--primary-1, 0,128,163))

/* Correct color wrapping */
background-color: rgb(var(--now-color_background--primary, 255, 255, 255));
```

### Alias Layer

Provide stable, reusable names mapping to instance tokens:

```css
:root {
  /* Surfaces & borders */
  --snx-color-surface: rgb(var(--now-container--color, 255, 255, 255));
  --snx-color-surface-alt: rgb(var(--now-heading--header-primary--color, 245, 247, 249));
  --snx-color-border: rgb(var(--now-container--border-color, 207, 213, 215));

  /* Text */
  --snx-color-text: rgb(var(--now-color_text--primary, 16, 23, 26));
  --snx-color-text-muted: rgb(var(--now-color_text--secondary, 75, 85, 89));

  /* Actions & focus */
  --snx-color-primary: rgb(var(--now-actionable--primary--background-color, 0, 128, 163));
  --snx-color-on-primary: rgb(var(--now-actionable_label--primary--color, 255, 255, 255));
  --snx-color-focus: rgb(var(--now-color_focus-ring, 53, 147, 37));

  /* Spacing */
  --snx-space-inner: var(--now-static-space--md, 0.75rem);
  --snx-space-outer: var(--now-static-space--lg, 1rem);

  /* Border radius — component-specific */
  --snx-radius-button: var(--now-actionable--border-radius, 6px);
  --snx-radius-input: var(--now-form-control-input--primary--border-radius, 2px);
  --snx-radius-container: var(--now-container--border-radius, 8px);

  /* Typography */
  --snx-font-body: var(--now-font-family, system-ui, sans-serif);
  --snx-line-height: var(--now-static-line-height, 1.25);
}
```

Rules: NEVER create generic aliases that ignore component requirements. ALWAYS use component-specific aliases. Aliases MUST remain stable between generations.

### Dark Mode

Each token has light and dark mode values. The theme system handles switching automatically:

```css
/* Token automatically switches between light/dark */
background-color: rgb(var(--now-container--color, 255, 255, 255));
color: rgb(var(--now-color_text--primary, 16, 23, 26));
```

### Severity Variant Reference

All messaging, alert, and indicator components use these semantic variants:

| Display Name | Token Variant | Use For |
| --- | --- | --- |
| Success | `positive` | Successful operations, valid states |
| Error | `critical` | Errors, failures, urgent issues |
| Warning | `warning` | Warnings, cautions |
| Info | `info` | Informational messages |

ALWAYS use `positive`, `critical`, `warning`, `info` — NEVER "success", "error", or "informational".

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

## Record List Pattern

ALWAYS use `NowRecordListConnected` for displaying ServiceNow records — NEVER manual `fetch()` + `.map()` + `<table>`.

```tsx
import React from "react";
import { NowRecordListConnected } from "@servicenow/react-components/NowRecordListConnected";

export default function TicketList({ onSelectTicket, onNewClicked }) {
  return (
    <NowRecordListConnected
      table="incident"
      listTitle="Incidents"
      columns="number,short_description,priority,state,assigned_to"
      onRowClicked={e => onSelectTicket(e.detail.payload.sys_id)}
      onNewActionClicked={onNewClicked}
      limit={25}
    />
  );
}
```

**Filtering:** `NowRecordListConnected` has no `query` prop. Use the React `key` prop with an encoded query string to force a re-mount with filtered data:

```tsx
<NowRecordListConnected
  key="active=true^priority=1"
  table="incident"
  listTitle="Critical Incidents"
  columns="number,short_description,priority"
/>
```

**`onNewActionClicked`:** REQUIRED unless `hideHeader={true}`. MUST navigate to the create view — NEVER use an empty function `() => {}`.

## RecordProvider Pattern

ALWAYS use `RecordProvider` for viewing/editing a single record — NEVER standalone Input components with manual Table API calls.

```tsx
import React from "react";
import { RecordProvider } from "@servicenow/react-components/RecordContext";
import { FormActionBar } from "@servicenow/react-components/FormActionBar";
import { FormColumnLayout } from "@servicenow/react-components/FormColumnLayout";

export default function TicketDetail({ ticketId, onBack }) {
  return (
    <RecordProvider
      table="incident"
      sysId={ticketId}
      isReadOnly={false}
    >
      <FormActionBar />
      <FormColumnLayout />
    </RecordProvider>
  );
}
```

**RecordProvider usage notes:**

- `table`: ServiceNow table name
- `sysId`: Record sys_id to load (use `"-1"` for new records, NEVER `null`/`undefined`)
- `isReadOnly={false}`: Required for editable forms and new records
- `FormColumnLayout`: Renders ALL fields automatically — there is NO `RecordField` component
- `FormActionBar`: Provides save/update/delete action buttons
- `useRecord()`: Hook to access `form.isDirty`, `header.data`, etc.
- Use `key` prop on `RecordProvider` when switching records to fully remount the form

## URL-Based Navigation

ALWAYS use URLSearchParams for navigation. Each view MUST have its own URL. NEVER use `window.location.reload()` — use React state. NEVER use hash-based routing (`#/path`) — ALWAYS use query strings (`?view=details`).

Implement iframe detection for Polaris compatibility:

```tsx
interface ViewState {
  view: string;
  recordId: string | null;
}

function getViewFromUrl(): ViewState {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") || "list",
    recordId: params.get("id") || null
  };
}

export default function TaskApp() {
  const [currentView, setCurrentView] = useState<ViewState>(getViewFromUrl);

  useEffect(() => {
    const onPopState = () => setCurrentView(getViewFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateToView = useCallback(
    (viewName: string, recordId?: string | null, { title = "" } = {}) => {
      const params = new URLSearchParams({ view: viewName });
      if (recordId) params.set("id", recordId);
      const relativePath = `${window.location.pathname}?${params}`;
      const pageTitle =
        title ||
        `Task Manager - ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;

      if (window.self !== window.top) {
        (window as any).CustomEvent.fireTop("magellanNavigator.permalink.set", {
          relativePath,
          title: pageTitle
        });
      }

      window.history.pushState({ viewName, recordId }, "", relativePath);
      document.title = pageTitle;
      setCurrentView({ view: viewName, recordId: recordId || null });
    },
    []
  );

  const { view, recordId } = currentView;

  if (view === "list") {
    return (
      <NowRecordListConnected
        table="incident"
        listTitle="Incidents"
        columns="number,short_description,priority,state,assigned_to"
        onRowClicked={e => {
          const sysId = e.detail.payload.sys_id;
          const number = e.detail.payload.number;
          navigateToView("detail", sysId, { title: `Incident ${number}` });
        }}
        onNewActionClicked={() => {
          navigateToView("create", null, { title: "New Incident" });
        }}
      />
    );
  }

  if (view === "create") {
    return (
      <RecordProvider table="incident" sysId="-1" isReadOnly={false}>
        <FormActionBar
          onSubmit={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
          onCancel={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
        />
        <FormColumnLayout />
      </RecordProvider>
    );
  }

  if (view === "detail" && recordId) {
    return (
      <RecordProvider table="incident" sysId={recordId} isReadOnly={false}>
        <FormActionBar
          onSubmit={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
          onCancel={() =>
            navigateToView("list", null, { title: "Incident List" })
          }
        />
        <FormColumnLayout />
      </RecordProvider>
    );
  }
}
```

### Navigation Key Points

- Each view needs its own URL with URLSearchParams
- Use React state (`setCurrentView`) to trigger re-renders — NEVER `window.location.reload()`
- Check `window.self !== window.top` for iframe context
- Use `window.CustomEvent.fireTop` in Polaris iframe
- Use `history.pushState()` for URL updates
- Listen for `popstate` events for browser back/forward
- NEVER use hash-based routing (`#/path`)

## Dirty State Management

MANDATORY for ANY view that creates, edits, or views records with a form. `RecordProvider` tracks dirty state internally — do NOT implement manual field diffing. The ONLY way to check dirty state is `useRecord().form.isDirty`. NEVER use `window.confirm()` or `window.alert()` — use the ServiceNow `Modal` component.

### Standard Pattern

```tsx
import React, { useEffect } from "react";
import { RecordProvider } from "@servicenow/react-components/RecordContext";
import { FormActionBar } from "@servicenow/react-components/FormActionBar";
import { FormColumnLayout } from "@servicenow/react-components/FormColumnLayout";
import { Alert } from "@servicenow/react-components/Alert";
import { useRecord } from "@servicenow/react-components";

function FormWithDirtyTracking() {
  const { form } = useRecord();

  useEffect(() => {
    if (!form.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.isDirty]);

  return (
    <>
      {form.isDirty && (
        <Alert status="warning" content="Unsaved changes" />
      )}
      <FormActionBar />
      <FormColumnLayout />
    </>
  );
}

export default function RecordForm({ sysId }: { sysId: string }) {
  return (
    <RecordProvider table="incident" sysId={sysId} isReadOnly={false}>
      <FormWithDirtyTracking />
    </RecordProvider>
  );
}
```

### Warn on In-App Navigation (Modal)

```tsx
import React, { useState, useCallback } from "react";
import {
  Modal,
  ModalOpenedSet,
  ModalFooterActionClicked
} from "@servicenow/react-components/Modal";

function UnsavedChangesModal({ opened, onDiscard, onCancel }) {
  const handleOpenedSet = useCallback<ModalOpenedSet>(() => {
    onCancel();
  }, [onCancel]);

  const handleFooterAction = useCallback<ModalFooterActionClicked>(
    e => {
      if (e.detail.payload.action.label === "Discard") {
        onDiscard();
      } else {
        onCancel();
      }
    },
    [onDiscard, onCancel]
  );

  return (
    <Modal
      opened={opened}
      size="sm"
      headerLabel="Unsaved Changes"
      content="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      footerActions={[
        { label: "Cancel", variant: "secondary" },
        { label: "Discard", variant: "primary-negative" }
      ]}
      onOpenedSet={handleOpenedSet}
      onFooterActionClicked={handleFooterAction}
    />
  );
}
```

Integrate with navigation — wrap `navigateToView` with a dirty check:

```tsx
const { form } = useRecord();
const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

const safeNavigate = useCallback(
  (viewName: string, recordId?: string | null, options?: { title?: string }) => {
    if (form.isDirty) {
      setPendingNavigation(() => () => navigateToView(viewName, recordId, options));
      return;
    }
    navigateToView(viewName, recordId, options);
  },
  [form.isDirty, navigateToView]
);

// In JSX — use safeNavigate instead of navigateToView:
<UnsavedChangesModal
  opened={pendingNavigation !== null}
  onDiscard={() => {
    pendingNavigation?.();
    setPendingNavigation(null);
  }}
  onCancel={() => setPendingNavigation(null)}
/>
```

### Dirty State Key Points

- ONLY use `useRecord().form.isDirty` to check dirty state
- NEVER use `window.confirm()` or `window.alert()` — use the ServiceNow `Modal` component
- `FormActionBar` handles save/submit/cancel automatically — dirty state resets on successful save
- Use `key` prop on `RecordProvider` when switching records to fully remount the form
- For new records: pass `sysId="-1"` — NEVER `null` or `undefined`

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

### Field Extraction Utilities

ALWAYS create these utility functions in every project:

```ts
// src/client/utils/fields.ts
export const display = field => {
  if (typeof field === "string") {
    return field;
  }
  return field?.display_value || "";
};

export const value = field => {
  if (typeof field === "string") {
    return field;
  }
  return field?.value || "";
};
```

Usage:

```tsx
import { display, value } from "./utils/fields";

// For UI display:
<td>{display(record.short_description)}</td>
<td>{display(record.assigned_to)}</td>

// For operations/keys:
await updateRecord(value(record.sys_id), data);
{records.map(r => <li key={value(r.sys_id)}>)}
```

Common mistakes:

```tsx
// WRONG — accessing object directly
<span>{record.assigned_to}</span>

// WRONG — using value for display
<span>{value(record.state)}</span>  // Shows "2" instead of "In Progress"

// CORRECT — display for UI, value for operations
<span>{display(record.state)}</span>  // Shows "In Progress"
await api.update(value(record.sys_id), data);  // Uses sys_id value
```

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
- **Routing**: Use URLSearchParams (e.g., `?view=details`), NOT hash routing (`#/route`)
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
