# Platform Views & UI Layout Control — Fluent SDK

Covers two topics not in the dedicated API files:
1. **"Choosing the Right Approach"** — decision table for when to use each platform view component
2. **UI Formatters** (`sys_ui_formatter`) — adding activity streams, process flows, and other non-field content to forms

For UI Actions, see [UI-ACTION-API.md](./UI-ACTION-API.md).  
For UI Policies, see [UI-POLICY-API.md](./UI-POLICY-API.md).  
For Form Layouts, see [FORM-API.md](./FORM-API.md).  
For Views, View Rules, List Controls, and Relationships, see [platform-view-lists-guide.md](./platform-view-lists-guide.md).

---

## Choosing the Right Approach

Use this table to decide which artifact to create:

| What you need | Use | Fluent API |
|--------------|-----|-----------|
| Button/link on form or list | UI Actions | `UiAction` |
| Field visibility/mandatory/read-only based on condition | UI Policies | `UiPolicy` |
| Non-field content on forms (activity, process flow) | UI Formatters | Record API on `sys_ui_formatter`/`sys_ui_element` |
| Configure list columns and order | Lists | `List` |
| Different form layout per role/group/persona | Views | Record API on `sys_ui_view` |
| Auto-switch layout when condition met | View Rules | Record API on `sysrule_view` |
| Hide New/Edit buttons, role-based list actions | List Controls | Record API on `sys_ui_list_control` |
| Custom table relationships for related lists | Relationships | Record API on `sys_relationship` |

### Views vs View Rules vs UI Policies

| Requirement | Use |
|-------------|-----|
| Whole form layout changes per role/group (different fields/sections) | View |
| Whole form layout switches automatically based on condition/device/state | View Rule |
| Specific fields hide/show/mandatory/read-only when condition met | UI Policy |
| Control list buttons (New/Edit) or disable pagination | List Control |

### Views vs ACLs

| Requirement | Use |
|-------------|-----|
| Certain fields/sections should not appear in the form for some users | Views — fields absent from the form entirely |
| Restrict who can read/write/delete records or fields (data security) | ACLs — security enforcement |

---

## Avoidance (Platform Views)

- **NEVER** create `sys_ui_formatter` records for Activity or Attached Knowledge — they already exist globally; skip straight to adding the `sys_ui_element`
- **NEVER** create custom formatters — not supported in Fluent
- **NEVER** use `disabled` in UI Policy actions — use `readOnly` instead
- **NEVER** place a formatter in a section with no other elements — it will not render
- **NEVER** have a UI Action script return a value — the `script` field must never return anything
- **NEVER** skip the view uniqueness check — `sys_ui_view` is global and `title` must be unique across all scopes
- **NEVER** create lists for tables that don't exist yet — define the table first
- **NEVER** use Business Rules, Client Scripts, or UI Policies for view switching — always use View Rules (`sysrule_view`)
- **NEVER** combine `omit_*_button: true` with `*_roles` for the same capability — the omit flag overrides role permissions

---

## UI Formatters

Formatters add **non-field content** to forms (activity streams, process flows, checklists). Custom formatters are not supported in Fluent — always use built-in formatters.

### Built-In Formatters

| Formatter | `element` value | Purpose | Position |
|-----------|----------------|---------|----------|
| Activity | `activity.xml` | Journal entries, comments, work notes | Last in section |
| Process Flow | `process_flow` | Lifecycle stage visualization | First in section |
| CI Relations | `ui_ng_relation_formatter.xml` | CMDB relationship maps | First in section |
| Parent Breadcrumb | `parent_crumbs` | Parent hierarchy trail | First in section |
| Contextual Search | `cxs_table_search.xml` | Auto-suggest knowledge articles | Below search context field |
| Variables Editor | `com_glideapp_questionset_default_question_editor` | Record producer variables | — |
| Checklist | `inline_checklist_macro` | Sub-task tracking | Last in section |
| Attached Knowledge | `attached_knowledge` | Linked knowledge articles | Last in section |

### Key Rules

1. **Activity and Attached Knowledge** already exist globally — never create `sys_ui_formatter` records for them; skip straight to step 4 (add `sys_ui_element`)
2. A formatter **requires a section** — it must reside in a `sys_ui_section`, and the section must have at least one non-formatter element
3. **Parent Breadcrumb** requires a field named exactly `parent` — no variations like `parent_task` or `parent_record`
4. **Process Flow** requires stage configuration — verify `sys_process_flow` records exist for the target table
5. **Position matters** — Process Flow and Parent Breadcrumb go first (position 0); Activity and Checklist go last (position 99)

### Sequential Steps to Add a Formatter

1. Check formatter exists (`sys_ui_formatter`): For Activity and Attached Knowledge, skip to step 4. For others, query `sys_ui_formatter` for the target table, then global, then the extended-from table
2. If Process Flow: Verify/create stage records in `sys_process_flow`
3. If Contextual Search: Verify/create search config in `cxs_table_config`
4. Check section exists (`sys_ui_section`): Query for the target table and view. Create if missing
5. Add formatter element (`sys_ui_element`): Create with `type: 'formatter'` and reference to the section and formatter
6. Ensure at least one non-formatter element exists in the section

---

## Formatter Examples

### Add Activity Formatter (No `sys_ui_formatter` Record Needed)

```typescript
import { Record } from '@servicenow/sdk/core'

// Activity formatter already exists globally — only add the element
Record({
  $id: Now.ID['activity-formatter-element'],
  table: 'sys_ui_element',
  data: {
    sys_ui_section: section.$id,   // Reference to existing section
    element: 'activity.xml',
    type: 'formatter',
    position: 99,                   // Last in section
  },
})
```

### Create Process Flow Formatter and Stages

```typescript
import { Record } from '@servicenow/sdk/core'

// 1. Create the formatter record
export const processFlowFormatter = Record({
  $id: Now.ID['process-flow-formatter'],
  table: 'sys_ui_formatter',
  data: {
    name: 'Process Flow Formatter',
    type: 'formatter',
    formatter: 'process_flow.xml',
    table: 'my_task_table',
    active: true,
  },
})

// 2. Create stage records
Record({
  $id: Now.ID['flow-stage-new'],
  table: 'sys_process_flow',
  data: {
    active: true,
    condition: 'state=new^EQ',
    label: 'New',
    name: 'Task Flow - New State',
    order: '100',
    table: 'my_task_table',
  },
})

Record({
  $id: Now.ID['flow-stage-progress'],
  table: 'sys_process_flow',
  data: {
    active: true,
    condition: 'state=in_progress^EQ',
    label: 'In Progress',
    name: 'Task Flow - In Progress',
    order: '200',
    table: 'my_task_table',
  },
})

Record({
  $id: Now.ID['flow-stage-complete'],
  table: 'sys_process_flow',
  data: {
    active: true,
    condition: 'state=complete^EQ',
    label: 'Complete',
    name: 'Task Flow - Complete',
    order: '300',
    table: 'my_task_table',
  },
})

// 3. Add element to form section
Record({
  $id: Now.ID['process-flow-element'],
  table: 'sys_ui_element',
  data: {
    sys_ui_section: mySection.$id,
    element: 'process_flow.xml',
    type: 'formatter',
    position: 0,  // First in section
  },
})
```

### Add Checklist Formatter

```typescript
import { Record } from '@servicenow/sdk/core'

// Checklist formatter already exists globally — only add the element
Record({
  $id: Now.ID['checklist-element'],
  table: 'sys_ui_element',
  data: {
    sys_ui_section: mySection.$id,
    element: 'inline_checklist_macro',
    type: 'formatter',
    position: 99,  // Last in section
  },
})
```
