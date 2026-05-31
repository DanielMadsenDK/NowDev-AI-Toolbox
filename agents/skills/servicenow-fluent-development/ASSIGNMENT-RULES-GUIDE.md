# Assignment Rules Guide

Assignment rules automatically populate `assignment_group` or `assigned_to` on task and task-inherited records. In Fluent SDK 4.7.0, assignment rules are authored with the generic `Record()` API on `sysrule_assignment`; there is no dedicated `AssignmentRule()` constructor.

## When To Use

Use assignment rules when the requirement is primarily task routing:

- Assign incidents, changes, problems, catalog tasks, HR cases, or custom task-inherited records to a group or user.
- Pre-populate assignment fields when a record is opened.
- Route task records by straightforward conditions such as category, priority, location, or caller attributes.

Use a Business Rule instead when the table does not extend `task`, the logic must run on database insert/update instead of record open, or the requirement needs complex validation, multiple GlideRecord queries, external calls, or broader field updates.

## Required Checks

1. Verify the target table extends `task`. Assignment rules do not work on non-task tables.
2. Query the instance for the target `sys_user_group` or `sys_user` unless the user provided a sys_id explicitly.
3. Prefer static `group` assignment by sys_id for simple routing.
4. Use one script-based assignment rule for multiple scenarios on the same table rather than several conflicting rules.
5. End encoded query conditions with `^EQ`.

## Record Shape

```ts
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const hardwareIncidentAssignment = Record({
  $id: Now.ID['hardware-incident-assignment'],
  table: 'sysrule_assignment',
  data: {
    name: 'Assign Hardware Incidents',
    table: 'incident',
    active: true,
    condition: 'category=hardware^EQ',
    match_conditions: 'ALL',
    group: '<validated_sys_user_group_sys_id>',
    order: 100,
  },
})
```

## Script-Based Assignment

Use `Now.include()` for script bodies that need branching logic.

```ts
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const categoryBasedAssignment = Record({
  $id: Now.ID['category-based-assignment'],
  table: 'sysrule_assignment',
  data: {
    name: 'Assign by Category',
    table: 'incident',
    active: true,
    order: 100,
    script: Now.include('../../server/assignment-rules/category-based.js'),
  },
})
```

```js
if (current.category == 'hardware') {
  current.assignment_group.setDisplayValue('Hardware')
} else if (current.category == 'software') {
  current.assignment_group.setDisplayValue('Software')
} else {
  current.assignment_group.setDisplayValue('Service Desk')
}
```

## Avoid

- Do not use assignment rules on non-task tables.
- Do not expect assignment rules to behave like insert/update Business Rules.
- Do not silently fall back to `setDisplayValue()` when a group or user lookup fails; ask the user how to proceed.
- Do not set `group` or `user` when `script` is present; script assignment overrides static fields.
- Do not use complex scripts that exceed 8000 characters or contain broad platform logic; use a Business Rule instead.