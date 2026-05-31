# `$override` Guide

`$override` is an escape hatch available on Fluent API constructors for fields that the typed SDK API does not expose. It writes database column names and values directly to the generated metadata.

## When To Use

- A customer or scoped-application field exists on the target metadata table but is not modeled by the SDK type.
- A plugin or dependency adds a field that your app needs to set.
- The platform has an out-of-box column that the current SDK API surface has not exposed yet.

Prefer the typed property whenever it exists. `$override` skips IntelliSense and type checking.

## Syntax

`$override` accepts a flat object of database column names to `string`, `boolean`, or `number` values.

```ts
import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

export const setPriorityRule = BusinessRule({
  $id: Now.ID['set_priority_on_incident'],
  name: 'Set priority on incident',
  table: 'incident',
  when: 'before',
  action: ['insert'],
  script: `current.priority = 1`,
  $override: {
    x_acme_priority: 'high',
    u_audit_enabled: true,
    u_retry_count: 3,
  },
})
```

## Gotchas

- Keys are database column names in snake_case, not Fluent property names.
- The target column must already exist on the instance through your app, a dependency, or the platform.
- Reference fields expect a sys_id string or another valid reference value.
- Typos are not caught by TypeScript.

## Avoid

- Do not use `$override` for fields already modeled by the SDK.
- Do not set protected system fields such as `sys_id`, `sys_updated_by`, or audit fields.
- Do not use `$override` as a shortcut around understanding the typed API.