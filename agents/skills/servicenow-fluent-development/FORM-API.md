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

Each section has a `caption` and a `content` array of layout blocks.

### Section Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `caption` | String | Yes | Section header text (must not be empty) |
| `content` | Array | Yes | Array of layout blocks (`one-column` or `two-column`) |
| `header` | Boolean | No | Whether the section renders as a header |
| `title` | Boolean | No | Whether the section renders as a title/header row |

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
| `'annotation'` | Informational text block — requires `annotationId`, `text`, and optionally `annotationType` |
| `'formatter'` | Platform formatter widget (Activity Log, Attachments, etc.) — provide `formatterRef` |
| `'list'` | Related list within the form — provide `listType` and `listRef` |
| `'split'` | Horizontal separator between elements |
| `'end_split'` | Closes a split section |

### Annotation Element

```typescript
{
    layout: 'one-column',
    elements: [
        {
            type: 'annotation',
            annotationId: Now.ID['notice_annotation'],
            text: 'Review all required fields before submitting.',
            isPlainText: true,               // true = plain text, false = HTML
            annotationType: 'Info_Box_Blue', // built-in type or Record<'sys_ui_annotation_type'>
        },
        { field: 'short_description', type: 'table_field' },
    ],
}
```

Use a `Record()` for a custom annotation type instead of a built-in string:

```typescript
const warningBanner = Record({
    $id: Now.ID['custom_warning_banner'],
    table: 'sys_ui_annotation_type',
    data: {
        name: 'Custom Warning Banner',
        active: true,
        style: 'background-color: #fff3cd; border: 1px solid #ffc107; padding: 12px;',
    },
})

{
    type: 'annotation',
    annotationId: Now.ID['custom_notice'],
    text: '<b>Warning:</b> Custom styled annotation.',
    isPlainText: false,
    annotationType: warningBanner,
}
```

### Formatter Element

`formatterRef` accepts three forms:

```typescript
// 1. Predefined key — formatterName auto-derived
{ type: 'formatter', formatterRef: 'Activities_Filtered' }

// 2. Custom Record — formatterName derived from the record's `formatter` field
const breadcrumbFormatter = Record({
    $id: Now.ID['parent_breadcrumb_formatter'],
    table: 'sys_ui_formatter',
    data: {
        name: 'parent_breadcrumb',
        formatter: 'parent_crumbs.xml',
        table: 'sn_my_app_task',
        active: true,
    },
})
{ type: 'formatter', formatterRef: breadcrumbFormatter }

// 3. Raw GUID — formatterName must be provided explicitly
{
    type: 'formatter',
    formatterRef: 'aabbccdd11223344aabbccdd11223344',
    formatterName: 'custom_formatter.xml',
}
```

### List (Related List) Element

`listType` controls the relationship kind; `listRef` identifies the relationship:

```typescript
// One-to-many (12M) — listRef is '<related_table>.<field>'
{ type: 'list', listType: '12M', listRef: 'task_sla.task' }

// Many-to-many (M2M) — listRef is '<m2m_table>.<field>'
{ type: 'list', listType: 'M2M', listRef: 'm2m_task_project.task_ref' }

// Custom relationship — listRef is a Record<'sys_relationship'>
const incidentToProblem = Record({
    $id: Now.ID['inc_to_problem'],
    table: 'sys_relationship',
    data: {
        name: 'Incident to Problem',
        basic_apply_to: 'sn_my_app_task',
        basic_query_from: 'problem',
        reference_field: 'problem_id',
    },
})
{ type: 'list', listType: 'custom', listRef: incidentToProblem }
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
                            isPlainText: true,
                            annotationType: 'Info_Box_Blue',
                        },
                    ],
                },
            ],
        },
        {
            caption: 'Activity',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { type: 'formatter', formatterRef: 'Activities_Filtered' },
                    ],
                },
            ],
        },
        {
            caption: 'Related SLAs',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        { type: 'list', listType: '12M', listRef: 'task_sla.task' },
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
| Formatter elements use `formatterRef`, not `uiMacroName` | `uiMacroName` is not a valid property on formatter elements |
| Raw GUID `formatterRef` requires explicit `formatterName` | The build cannot derive `formatterName` from a plain sys_id |

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
