# Form API

## Overview

`Form` defines the layout of a ServiceNow table form — which fields appear, how they are arranged in sections, and which views and roles they apply to (`sys_ui_form`). Use it to declaratively control the form presentation for tables you define in your Fluent application.

```typescript
import { Form, default_view } from '@servicenow/sdk/core'

export const myTaskForm = Form({
    table: 'x_myapp_task',
    view: default_view,
    sections: [
        {
            caption: 'Details',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'short_description', type: 'table_field' },
                        { field: 'description', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
})
```

When built, a single `Form()` call creates:
- `sys_ui_form` — the form record linking table and view
- `sys_ui_form_section` — join records between form and sections
- `sys_ui_section` — individual section records
- `sys_ui_element` — field-level element records
- `sys_ui_annotation` — annotation records (when `type: 'annotation'`)

---

## Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `table` | `keyof Tables` | The table this form layout applies to |
| `view` | string or `Record<'sys_ui_view'>` | The UI view — use `default_view` constant or a `Record()` reference |
| `sections` | `FormSection[]` | At least one section is required |

---

## View

Use the built-in `default_view` constant for the standard form, or create a custom view using `Record()`:

```typescript
import { Form, Record, default_view } from '@servicenow/sdk/core'

// Default view
Form({ table: 'x_myapp_task', view: default_view, sections: [...] })

// Custom named view
const opsView = Record({
    $id: Now.ID['ops_view'],
    table: 'sys_ui_view',
    data: { name: 'operations', title: 'Operations View' },
})

Form({ table: 'x_myapp_task', view: opsView, sections: [...] })
```

---

## Sections

Each section has a `caption` and a `content` array of layout blocks:

```typescript
sections: [
    {
        caption: 'Primary Information',
        content: [
            {
                layout: 'two-column',
                leftElements: [
                    { field: 'number', type: 'table_field' },
                    { field: 'state', type: 'table_field' },
                ],
                rightElements: [
                    { field: 'priority', type: 'table_field' },
                    { field: 'assigned_to', type: 'table_field' },
                ],
            },
        ],
    },
    {
        caption: 'Notes',
        content: [
            {
                layout: 'one-column',
                elements: [
                    { field: 'work_notes', type: 'table_field' },
                    { field: 'additional_comments', type: 'table_field' },
                ],
            },
        ],
    },
],
```

---

## Layout Types

### one-column

Renders elements in a single full-width column:

```typescript
{
    layout: 'one-column',
    elements: [
        { field: 'description', type: 'table_field' },
    ],
}
```

### two-column

Renders elements side by side in left and right columns:

```typescript
{
    layout: 'two-column',
    leftElements: [
        { field: 'name', type: 'table_field' },
        { field: 'category', type: 'table_field' },
    ],
    rightElements: [
        { field: 'priority', type: 'table_field' },
        { field: 'assigned_to', type: 'table_field' },
    ],
}
```

---

## Element Types

Elements within a layout block define what appears on the form:

| `type` | Description |
|--------|-------------|
| `'table_field'` | A standard table column field — provide `field` with the column name |
| `'annotation'` | Informational text block — requires `annotationId` and `text` |
| `'formatter'` | Platform formatter widget (Activity Log, Attachments, etc.) — provide `uiMacroName` |
| `'related_list'` | Related list displayed within the form section — provide `relatedTable` and `relatedField` |
| `'split'` | Horizontal separator between elements |
| `'end_split'` | Closes a split section |

### Annotation Example

```typescript
{
    layout: 'one-column',
    elements: [
        {
            type: 'annotation',
            annotationId: Now.ID['notice_annotation'],
            text: 'Review all required fields before submitting.',
        },
        { field: 'short_description', type: 'table_field' },
    ],
}
```

### Formatter Example

```typescript
{ type: 'formatter', uiMacroName: 'activity_formatter' }
{ type: 'formatter', uiMacroName: 'attachment_formatter' }
```

---

## Access Control

Restrict form visibility by role:

```typescript
Form({
    table: 'x_myapp_task',
    view: default_view,
    roles: ['admin', 'itil'],       // Array of role names or Role() constants
    sections: [...],
})
```

---

## User Personalisation

Create a form layout for a specific user:

```typescript
Form({
    table: 'x_myapp_task',
    view: default_view,
    user: 'username_or_sys_user_sys_id',
    sections: [...],
})
```

---

## Full Example

```typescript
import { Form, Role, Record, default_view } from '@servicenow/sdk/core'
import { myManagerRole } from '../roles/roles.now'

const mobileView = Record({
    $id: Now.ID['mobile_view'],
    table: 'sys_ui_view',
    data: { name: 'mobile', title: 'Mobile View' },
})

export const taskDetailForm = Form({
    table: 'x_myapp_task',
    view: default_view,
    roles: [myManagerRole.$id],
    sections: [
        {
            caption: 'Task Details',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        { field: 'number', type: 'table_field' },
                        { field: 'short_description', type: 'table_field' },
                        { field: 'state', type: 'table_field' },
                    ],
                    rightElements: [
                        { field: 'priority', type: 'table_field' },
                        { field: 'assigned_to', type: 'table_field' },
                        { field: 'due_date', type: 'table_field' },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        {
                            type: 'annotation',
                            annotationId: Now.ID['task_notice'],
                            text: 'Complete all required fields before setting state to In Progress.',
                        },
                    ],
                },
            ],
        },
        {
            caption: 'Work Notes',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { type: 'formatter', uiMacroName: 'activity_formatter' },
                    ],
                },
            ],
        },
    ],
})

export const taskMobileForm = Form({
    table: 'x_myapp_task',
    view: mobileView,
    sections: [
        {
            caption: 'Summary',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { field: 'short_description', type: 'table_field' },
                        { field: 'state', type: 'table_field' },
                        { field: 'assigned_to', type: 'table_field' },
                    ],
                },
            ],
        },
    ],
})
```

---

## Critical Rules

| Rule | Why |
|------|-----|
| Field names in `field` must exactly match `@types/servicenow/schema/` column names | Typos create missing elements or silent failures |
| Use `default_view` constant — never the string `'default'` directly | The `default_view` export handles the correct value |
| `Form` belongs in the **Schema layer** — define it after the `Table()` it references | The table must exist before form layout references it |
| `annotation` elements need a unique `annotationId: Now.ID['...']` | Required for stable `sys_ui_annotation` record identity |

---

## Build Placement

Form layouts belong in the **Schema layer**, defined after the table they reference:

```
src/
  fluent/
    schema/
      tables/
        task-table.now.ts           ← Table() definition
      forms/
        task-form.now.ts            ← Form() layout
```
