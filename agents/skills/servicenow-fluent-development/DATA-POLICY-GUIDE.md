# Data Policy Guide

`DataPolicy()` creates `sys_data_policy2` metadata for server-side mandatory and read-only field enforcement. Data policies apply across forms, imports, web services, REST/SOAP, and APIs, so they are the default choice for data integrity when the requirement can be expressed as conditional mandatory/read-only rules.

## When To Use

Use Data Policies for:

- Field is required under a condition.
- Field must be read-only or locked under a condition.
- Critical validation must apply to imports, integrations, and APIs.
- The requirement is mandatory/read-only enforcement and does not need scripting, messages, visibility, or value setting.

Use UI Policies for client-side UX such as visibility, messages, and form-only behavior. Use Business Rules when the logic needs `previous`, custom error messages, scripts, value changes, transition guards, or enforcement on out-of-scope mandatory fields.

## Important Defaults

These default to `true`; omit them unless overriding:

- `active`
- `applyToImportSets`
- `applyToSOAP`
- `useAsUiPolicyOnClient`
- `reverseIfFalse`

`inherit` defaults to `false`; only set it when the policy should apply to child tables.

## Rule Shape

Every policy needs `$id`, `table`, `shortDescription`, and `rules`. Every rule inside `rules` also needs its own `$id`.

```ts
import '@servicenow/sdk/global'
import { DataPolicy } from '@servicenow/sdk/core'

export const highPriorityIncidentPolicy = DataPolicy({
  $id: Now.ID['high_priority_incident_policy'],
  table: 'incident',
  shortDescription: 'Require assignment for high priority incidents',
  conditions: 'priority=1^ORpriority=2',
  rules: {
    assigned_to: {
      $id: Now.ID['high_priority_incident_policy_assigned_to_rule'],
      mandatory: true,
    },
    assignment_group: {
      $id: Now.ID['high_priority_incident_policy_assignment_group_rule'],
      mandatory: true,
    },
  },
})
```

## Read-Only Protection

```ts
import '@servicenow/sdk/global'
import { DataPolicy } from '@servicenow/sdk/core'

export const closedIncidentProtection = DataPolicy({
  $id: Now.ID['closed_incident_protection'],
  table: 'incident',
  shortDescription: 'Protect closed incident fields from modification',
  conditions: 'state=6^ORstate=7',
  rules: {
    close_code: {
      $id: Now.ID['closed_incident_protection_close_code_rule'],
      readOnly: true,
    },
    close_notes: {
      $id: Now.ID['closed_incident_protection_close_notes_rule'],
      readOnly: true,
    },
  },
})
```

## Dot-Walk Rules

Use dot-walk notation as the rule key for referenced-table fields. Do not use a `table` property inside rules for cross-table enforcement.

```ts
DataPolicy({
  $id: Now.ID['incident_reference_validation'],
  table: 'incident',
  shortDescription: 'Require caller contact information for critical incidents',
  conditions: 'priority=1^urgency=1',
  rules: {
    'caller_id.email': {
      $id: Now.ID['incident_reference_validation_caller_email_rule'],
      mandatory: true,
    },
  },
})
```

## Avoid

- Do not set both `mandatory: true` and `readOnly: true` on the same field.
- Do not use display labels in `conditions`; use stored choice values.
- Do not use Data Policies for visibility, messages, scripts, or value setting.
- Do not create overlapping policies with conflicting rules; the most restrictive result wins.
- Do not make out-of-scope fields mandatory with Data Policy; use a Business Rule when that enforcement is required.