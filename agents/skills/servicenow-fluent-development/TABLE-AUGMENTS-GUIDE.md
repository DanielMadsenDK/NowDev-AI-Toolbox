# Table Augments Guide

Use `Table({ augments: '<table_name>', schema: { ... } })` to add custom columns to a platform or cross-scope table that your application does not own. The SDK creates `sys_dictionary` records for the new columns and does not create a `sys_db_object` record for the target table.

## When To Use

- Add custom fields to an out-of-box table such as `incident` or `task`.
- Store application data on a table owned by another scope.
- Extend a vendor or platform table without creating a child table.

Use a normal `Table({ name, schema })` definition when creating a new table. Use `extends` when creating a child table that inherits from another table.

## Rules

1. Export a variable whose name matches the table being augmented.
2. Set `augments` to the full target table name.
3. Do not set `name`, `extends`, `label`, `display`, `audit`, or other table ownership properties with `augments`.
4. Prefix every added column with your application scope prefix, such as `x_acme_`, to avoid collisions.

## Example

```ts
import { BooleanColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const incident = Table({
  augments: 'incident',
  schema: {
    x_acme_escalation_reason: StringColumn({
      label: 'Escalation Reason',
      maxLength: 500,
    }),
    x_acme_requires_review: BooleanColumn({
      label: 'Requires Review',
      default: false,
    }),
  },
})
```

## Avoid

- Do not omit the scope prefix from column names.
- Do not use `augments` for a table that does not already exist.
- Do not mix `augments` with table creation properties.
- Do not use the old singular `augment` property; the current SDK property is `augments`.