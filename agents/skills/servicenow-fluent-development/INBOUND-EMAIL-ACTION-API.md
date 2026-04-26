# InboundEmailAction API — Fluent SDK

Configure Inbound Email Actions (`sys_email_action`) to process incoming emails — creating/updating records or sending auto-replies.

```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'
```

---

## Parameters

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | `Now.ID[string]` | Yes | — | Unique metadata identifier |
| `action` | `'record_action' \| 'reply_email'` | Yes | `'record_action'` | Action type: create/update a record or send an auto-reply |
| `type` | `'new' \| 'reply' \| 'forward'` | No | `'new'` | When to trigger: on new emails, replies, or forwards |
| `name` | string | No | — | Display name of the inbound email action |
| `table` | `keyof Tables` | No | — | Target table (e.g., `'incident'`, `'sc_req_item'`) |
| `active` | boolean | No | `false` | Whether the action is active |
| `order` | number | No | `100` | Execution order when multiple actions match (lower runs first) |
| `eventName` | string | No | `'email.read'` | Event name that triggers this action |
| `description` | string | No | — | Documentation for the action |
| `stopProcessing` | boolean | No | `false` | When `true`, stops subsequent actions from running |
| `conditionScript` | string | No | — | Server-side condition that must return `true` for the action to execute |
| `filterCondition` | string | No | — | Encoded query to filter which records this action applies to |
| `requiredRoles` | `(string \| Role)[]` | No | — | Roles the email sender must have for this action to trigger |
| `from` | `string \| Record<'sys_user'>` | No | — | Restrict to emails from a specific user (sys_id or Record reference) |
| `fieldAction` | string | No | — | Field value template using encoded query format (record_action only) |
| `assignmentOperator` | string | No | — | Assignment operator for field actions (record_action only) |
| `replyEmail` | string | No | — | HTML content for auto-reply (reply_email only) |
| `script` | string | No | — | Script executed when action triggers |

---

## Script Context Variables

When using `script`, five objects are available:

| Variable | Type | Description |
|----------|------|-------------|
| `current` | GlideRecord | The target record being created or updated |
| `event` | GlideRecord | The `sysevent` record |
| `email` | EmailWrapper | The inbound email object |
| `logger` | ScopedEmailLogger | For logging email processing activity |
| `classifier` | EmailClassifier | For classifying the email |

Use `Now.include()` to move scripts to external files for IDE support.

---

## `fieldAction` Syntax

The `fieldAction` property uses encoded query format with special syntax for dynamic values. Format: `field1=value1^field2DYNAMIC<sys_id>^EQ`

| Pattern | Example | Description |
|---------|---------|-------------|
| Static value | `active=true^priority=1^EQ` | Set field to literal value |
| Static sys_id reference | `assignment_group=d625dccec0a8016700a222a0f7900d06^EQ` | Reference by sys_id |
| Dynamic from email | `short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^EQ` | Pull value from email property |
| Datetime | `activity_due=2026-03-17 00:00:00^EQ` | ISO datetime format |
| Comma-separated list | `additional_assignee_listDYNAMIC<sys_id1>,<sys_id2>^EQ` | Multiple references |
| Text query | `123TEXTQUERY321=value^EQ` | Text query pattern |

**Common OOB email dynamic filter sys_ids:**
- Subject → String field: `b637bd21ef3221002841f7f775c0fbb6`
- Body → Text field: `367bf121ef3221002841f7f775c0fbe2`
- Sender → sys_user reference: `2fd8e97bef3221002841f7f775c0fbc1`
- Sender's Company → reference: `d27bf240ef0321002841f7f775c0fbeb`

---

## Examples

### Basic: Create Incident from Email

```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

export const createIncidentFromEmail = InboundEmailAction({
  $id: Now.ID['create-incident-from-email'],
  name: 'Create Incident from Email',
  action: 'record_action',
  table: 'incident',
  type: 'new',
  active: true,
  order: 100,
  stopProcessing: false,
})
```

### Static Field Values

```typescript
export const StaticFieldAction = InboundEmailAction({
  $id: Now.ID['static-field-action'],
  name: 'Set Static Fields on Incident',
  action: 'record_action',
  table: 'incident',
  type: 'new',
  active: true,
  fieldAction: 'priority=1^active=true^EQ',
})
```

### Dynamic Fields from Email (Subject, Body, Sender)

```typescript
export const dynamicFieldAction = InboundEmailAction({
  $id: Now.ID['dynamic-field-action'],
  name: 'Map Email Fields to Incident',
  action: 'record_action',
  table: 'incident',
  type: 'new',
  active: true,
  // Map Subject → short_description, Body → description, Sender → caller_id
  fieldAction: 'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^descriptionDYNAMIC367bf121ef3221002841f7f775c0fbe2^caller_idDYNAMIC2fd8e97bef3221002841f7f775c0fbc1^EQ',
})
```

### Auto-Reply Action

```typescript
export const autoReplyOnEmail = InboundEmailAction({
  $id: Now.ID['auto-reply-on-email'],
  name: 'Auto Reply to Sender',
  action: 'reply_email',  // Send auto-reply instead of creating record
  type: 'new',
  active: true,
  order: 200,
  replyEmail: '<p>Thank you for contacting us. We have received your email and will respond shortly.</p>',
})
```

### Conditional Action with Script

```typescript
export const conditionalEmailAction = InboundEmailAction({
  $id: Now.ID['conditional-email-action'],
  name: 'Create Incident with Custom Logic',
  action: 'record_action',
  table: 'incident',
  type: 'new',
  active: true,
  conditionScript: 'current.caller_id.active == true',
  script: Now.include('../../server/inbound-email-handler.js'),
})
```

### Role-Restricted Action

```typescript
import { InboundEmailAction, Role } from '@servicenow/sdk/core'

const itilRole = Role({
  $id: Now.ID['itil-role-ref'],
  name: 'itil',
})

export const roleRestrictedAction = InboundEmailAction({
  $id: Now.ID['role-restricted-email'],
  name: 'ITIL Only Email Action',
  action: 'record_action',
  table: 'incident',
  type: 'new',
  active: true,
  requiredRoles: [itilRole],
  stopProcessing: true,  // Stop subsequent actions if this one runs
})
```

---

## Best Practices

- Always set `order` explicitly when multiple actions may match the same email
- Use `stopProcessing: true` when an action should be the terminal handler
- Use `Now.include()` for complex scripts to keep IDE support and syntax highlighting
- Use `conditionScript` for pre-filtering rather than checking conditions inside the main script
- Leave `password` fields empty — set them manually after deployment
- For `reply_email` actions, ensure the HTML in `replyEmail` is safe and does not include user-supplied content unescaped
