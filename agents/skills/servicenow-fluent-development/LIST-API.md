# List API - ServiceNow Fluent

The List API defines list views [sys_ui_list] for tables, allowing you to configure which columns display and in what order for table list views.

## Overview

Lists are the tabular views of records that users interact with when browsing a table. The List API lets you define custom list configurations with specific columns in a specific order, and optionally bind them to custom UI views.

**Related documentation:**
- [ServiceNow AI Platform® list administration](https://docs.servicenow.com) (for general list concepts)
- [Record API](./API-REFERENCE.md#record) — Use this to define UI views [sys_ui_view]
- [ServiceNow Fluent Language Constructs](./API-REFERENCE.md#fluent-language-constructs)

---

## Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | No (deprecated) | Deprecated — List IDs are now derived from other fields. You can omit `$id`. |
| `table` | String | Yes | The name of the table to which the list applies (e.g., `'incident'`, `'change_request'`, `'cmdb_ci_server'`). |
| `view` | Reference or String | Yes | The variable identifier or name of the UI view [sys_ui_view] which applies, or the default view. See [View Configuration](#view-configuration) for details. |
| `columns` | Array | Yes | A list of columns in the table to display in the list. Each element can be a field name string or a `ListElement` object. See [Columns Configuration](#columns-configuration) for details. |
| `parent` | String | No | The table on which the related list appears. Use when defining a related list on a parent table. |
| `relationship` | String or `Record<'sys_relationship'>` | No | The relationship to apply to the related list. |
| `$meta` | Object | No | Metadata for the application metadata controlling installation behavior. See [Metadata Control](#metadata-control) for details. |

---

## View Configuration

The `view` property references or defines which UI view (list layout) to use. There are two approaches:

### 1. Reference a Custom View

Define a UI view using the Record API and reference it by variable:

```ts
import { List, Record } from "@servicenow/sdk/core";

// Define the UI view
const app_task_view = Record({
   $id: Now.ID['app_task_view'],
   table: 'sys_ui_view',
   data: {
        name: 'app_task_view',
        title: 'Application Task View'
   }
});

// Reference the view variable in the List
List({
    $id: Now.ID["app_task_view_list"],
    table: "incident",
    view: app_task_view,  // Reference the Record constant, not Now.ID
    columns: [
        { element: "name", position: 0 },
        { element: "urgency", position: 1 },
    ]
});
```

### 2. Use the Default View

Use the default view by importing it from `@servicenow/sdk/core`:

```ts
import { List, default_view } from "@servicenow/sdk/core";

List({
    $id: Now.ID["server_list"],
    table: "cmdb_ci_server",
    view: default_view,
    columns: [
        { element: "name", position: 0 },
        { element: "business_unit", position: 1 },
        { element: "cpu_type", position: 2 },
    ]
});
```

---

## Columns Configuration

The `columns` property is an array of column definitions. Each element can be a **field name string** or a **ListElement object** specifying the field and display options.

### String Shorthand

The simplest form — just the field name:

```ts
columns: ['number', 'short_description', 'priority', 'state']
```

### ListElement Object Structure

```ts
{
  element: string,        // Field name (e.g., "name", "urgency")
  position?: number,      // 0-based position in the list (0 = first column)
  sum?: boolean,          // Show sum aggregate for this column
  maxValue?: boolean,     // Show maximum value aggregate for this column
  minValue?: boolean,     // Show minimum value aggregate for this column
  averageValue?: boolean  // Show average value aggregate for this column
}
```

### Column Ordering

Positions determine the left-to-right ordering. Lower numbers appear on the left:

```ts
columns: [
    { element: "name", position: 0 },          // First column (leftmost)
    { element: "business_unit", position: 1 }, // Second column
    { element: "vendor", position: 2 },        // Third column
    { element: "cpu_type", position: 3 }       // Fourth column (rightmost)
]
```

### Dot-Walking Field References

For related record fields, use dot-walking notation:

```ts
columns: [
    { element: "number", position: 0 },
    { element: "assigned_to.name", position: 1 },    // User name (related field)
    { element: "assignment_group.manager.name", position: 2 } // Manager name
]
```

---

## Metadata Control

The optional `$meta` object controls how the list is installed on the instance.

```ts
List({
    $id: Now.ID["server_list"],
    table: "cmdb_ci_server",
    view: default_view,
    columns: [ /* ... */ ],
    $meta: {
        installMethod: 'first install'  // or 'demo'
    }
});
```

### Install Method Values

| Value | Behavior |
|-------|----------|
| `'demo'` | List is installed only when "Load demo data" option is selected during app installation. |
| `'first install'` | List is installed only the first time the app is installed. Updates to the app won't overwrite it. |
| (omitted) | List is installed/updated every time the app is deployed. |

---

## Complete Examples

### Example 1: Server List with Default View

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

### Example 2: Custom View with Multiple Lists

```ts
import { List, Record } from "@servicenow/sdk/core";

// Define a custom UI view
const incidentDetailView = Record({
   $id: Now.ID['incident_detail_view'],
   table: 'sys_ui_view',
   data: {
        name: 'incident_detail_view',
        title: 'Incident Detail View'
   }
});

// Assign this view to a list with specific columns
export const incidentDetailList = List({
    $id: Now.ID["incident_detail_list"],
    table: "incident",
    view: incidentDetailView,
    columns: [
        { element: "number", position: 0 },
        { element: "short_description", position: 1 },
        { element: "urgency", position: 2 },
        { element: "assigned_to.name", position: 3 },
        { element: "state", position: 4 },
    ],
});

// You can also define another list using the same view
export const incidentCompactList = List({
    $id: Now.ID["incident_compact_list"],
    table: "incident",
    view: incidentDetailView,
    columns: [
        { element: "number", position: 0 },
        { element: "urgency", position: 1 },
    ],
});
```

### Example 3: Custom Table List with Demo Data

```ts
import { List, Record, default_view } from "@servicenow/sdk/core";

export const taskList = List({
    $id: Now.ID["custom_task_list"],
    table: "x_app_custom_task",
    view: default_view,
    columns: [
        { element: "title", position: 0 },
        { element: "description", position: 1 },
        { element: "priority", position: 2 },
        { element: "assigned_to.name", position: 3 },
        { element: "due_date", position: 4 },
        { element: "status", position: 5 },
    ],
    $meta: {
        installMethod: 'demo'
    }
});
```

### Example 4: Filtered List with Related Fields

```ts
import { List, Record } from "@servicenow/sdk/core";

// Define a custom view for change requests
const changeApprovalView = Record({
   $id: Now.ID['change_approval_view'],
   table: 'sys_ui_view',
   data: {
        name: 'change_approval_view',
        title: 'Change Approval View'
   }
});

export const changeApprovalList = List({
    $id: Now.ID["change_approval_list"],
    table: "change_request",
    view: changeApprovalView,
    columns: [
        { element: "number", position: 0 },
        { element: "type", position: 1 },
        { element: "state", position: 2 },
        { element: "assignment_group.manager.name", position: 3 },
        { element: "change_priority", position: 4 },
        { element: "start_date", position: 5 },
        { element: "end_date", position: 6 },
    ],
});
```

---

## Best Practices

### ✓ DO

- **Assign to a const and export** — Makes the list reusable and referable by name
  ```ts
  export const myList = List({ /* ... */ })
  ```

- **Use custom views for specific list purposes** — Different views for different use cases
  ```ts
  // One view for approval workflow
  const approvalView = Record({ /* ... */ })
  const approvalList = List({ view: approvalView, /* ... */ })

  // Another view for dashboards
  const dashboardView = Record({ /* ... */ })
  const dashboardList = List({ view: dashboardView, /* ... */ })
  ```

- **Reference views by variable, not Now.ID** — Prevents duplicate records on install
  ```ts
  List({ view: myViewConstant, /* ... */ })  // ✓ CORRECT
  ```

- **Use sensible column positions** — Use 0, 1, 2, 3... for clarity
  ```ts
  columns: [
    { element: "number", position: 0 },
    { element: "priority", position: 1 },
  ]
  ```

- **Document custom views** — Include titles and names that clarify their purpose
  ```ts
  Record({
    table: 'sys_ui_view',
    data: {
      name: 'incident_sla_tracking_view',
      title: 'Incident SLA Tracking View'
    }
  })
  ```

### ✗ DON'T

- **Don't mix Now.ID references with Record constants** — Always reference the constant variable
  ```ts
  List({ view: Now.ID['myview'], /* ... */ })  // ✗ WRONG
  List({ view: myViewConstant, /* ... */ })     // ✓ CORRECT
  ```

- **Don't create more columns than necessary** — Keep lists focused on key information
  ```ts
  // Too many columns = difficult to use
  columns: [
    { element: "field1", position: 0 },
    { element: "field2", position: 1 },
    { element: "field3", position: 2 },
    { element: "field4", position: 3 },
    { element: "field5", position: 4 },
    { element: "field6", position: 5 },
    // ...
  ]
  ```

- **Don't use inconsistent position numbering** — Stick to sequential 0, 1, 2...
  ```ts
  columns: [
    { element: "name", position: 0 },
    { element: "priority", position: 5 },  // ✗ Gaps are confusing
    { element: "state", position: 10 }
  ]
  ```

---

## Common Patterns

### Application Menu Integration

Lists are typically linked from application modules for navigation:

```ts
// src/fluent/navigation.now.ts
import { ApplicationMenu, Record } from "@servicenow/sdk/core";
import { incidentList } from "./lists.now.js";

const menu = ApplicationMenu({
  $id: Now.ID['app_menu'],
  title: 'My App'
});

Record({
  $id: Now.ID['module.incident_list'],
  table: 'sys_app_module',
  data: {
    title: 'Incidents',
    application: menu.$id,
    active: true,
    link_type: 'LIST',
    name: 'incident',  // Links to the incident table
    order: 100,
  }
});
```

The list configuration (column order, view) is then applied globally to all list views of that table.

### Multi-Purpose Lists

Define multiple lists for the same table with different column layouts:

```ts
// Quick overview
export const incidentQuickList = List({
    $id: Now.ID["incident_quick_list"],
    table: "incident",
    view: default_view,
    columns: [
        { element: "number", position: 0 },
        { element: "urgency", position: 1 },
        { element: "state", position: 2 },
    ],
});

// Detailed view
export const incidentDetailList = List({
    $id: Now.ID["incident_detail_list"],
    table: "incident",
    view: default_view,
    columns: [
        { element: "number", position: 0 },
        { element: "short_description", position: 1 },
        { element: "urgency", position: 2 },
        { element: "assigned_to.name", position: 3 },
        { element: "assignment_group.name", position: 4 },
        { element: "state", position: 5 },
        { element: "created_on", position: 6 },
    ],
});
```

---

## Troubleshooting

### List not appearing in the UI

1. **Verify the table name** — Ensure the `table` property matches an existing table
2. **Check the view** — Make sure the referenced view exists and is not marked as inactive
3. **Validate columns** — Ensure all field names in `columns` exist on the target table

### Columns not showing in expected order

- **Check position values** — Positions must be numeric and sequential (0, 1, 2...)
- **Verify column visibility** — Some fields may be hidden by default based on table configuration

### Duplicate lists after install

- **Reference view constants properly** — Always use the const variable, not `Now.ID`
  ```ts
  List({ view: myView, /* ... */ })  // ✓ Correct
  List({ view: Now.ID['myView'], /* ... */ })  // ✗ Creates duplicates
  ```

---

## Import Pattern

```ts
import { List, Record, default_view } from "@servicenow/sdk/core";
```

---

## See Also

- [API-REFERENCE.md](./API-REFERENCE.md) — Core Fluent API reference
- [Record API](./API-REFERENCE.md#record) — For defining UI views
- [EXAMPLES.md](./EXAMPLES.md) — Code examples for lists and related patterns
