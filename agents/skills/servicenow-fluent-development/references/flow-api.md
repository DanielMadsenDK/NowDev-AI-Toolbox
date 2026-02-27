# Flow API

The Flow API enables authoring ServiceNow workflows entirely in TypeScript using Fluent metadata.
Workflows become version-controlled code that benefits from AI assistance and pull request reviews.

Import from `@servicenow/sdk/automation`:

```ts
import { Flow, wfa, trigger, action } from '@servicenow/sdk/automation'
import { TemplateValue } from '@servicenow/sdk/core'
```

---

## Structure

A `Flow` accepts a metadata object followed by a trigger and a callback function containing the flow body:

```ts
export const myFlow = Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'Human-readable name',
    description: 'What this flow does',
    // Optional: runAs, priority, protection
  },
  wfa.trigger(triggerType, { $id: Now.ID['trigger_id'] }, triggerOptions),
  (params) => {
    // Flow body: actions, logic, loops
  }
)
```

---

## Triggers

### Record Triggers

Use `trigger.record.*` to react to database changes on a table:

- `trigger.record.created` — fires when a new record is inserted
- `trigger.record.updated` — fires when an existing record is modified
- `trigger.record.createdOrUpdated` — fires on either insert or update

Trigger options include `table`, `condition` (encoded query string), and `run_flow_in` (`'background'` or `'foreground'`).

### Scheduled Triggers

Use `trigger.scheduled.*` for time-based execution:

- `trigger.scheduled.daily` — daily at a specified time
- `trigger.scheduled.weekly` — weekly on specified days
- `trigger.scheduled.monthly` — monthly on a specified day
- `trigger.scheduled.repeat` — repeating interval
- `trigger.scheduled.runOnce` — single execution at a future time

### Application Triggers

Use `trigger.application.*` for platform events:

- `trigger.application.inboundEmail`
- `trigger.application.remoteTableQuery`
- `trigger.application.knowledgeManagement`
- `trigger.application.slaTask`

---

## Data Pills

Use `wfa.dataPill(reference, type)` to reference dynamic field values from trigger records or previous actions.
This is how you pass record field values into actions.

- `type` must match the field's actual data type: `'string'`, `'reference'`, `'integer'`, `'boolean'`, `'array.string'`, etc.
- Dot-walking is supported: reference a related record's field via a chain of dots in the first argument.

---

## Actions

Use `wfa.action(actionType, { $id: ... }, actionInputs)` to perform operations.

### Core Record Actions

- `action.core.updateRecord` — update fields on a record using `TemplateValue({ field: value })`
- `action.core.createRecord` — insert a new record
- `action.core.deleteRecord` — delete a record
- `action.core.lookupRecord` — query for a matching record by condition

### Communication Actions

- `action.core.sendNotification` — send a platform notification (requires `table_name`, `record`, `notification` name)
- `action.core.sendSms` — send SMS to one or more recipients
- `action.core.sendEmail` — send an ad-hoc email

### Utility Actions

- `action.core.log` — write a log entry; set `log_level` to `'info'`, `'warn'`, or `'error'`
- `action.core.createTask` — create a task record
- `action.core.setApproval` — set approval state on a record

### Attachment Actions

- `action.core.addAttachment` — attach a file to a record
- `action.core.deleteAttachment` — remove an attachment

---

## Flow Logic

All logic helpers live on `wfa.flowLogic`:

### Conditional Branching

```
wfa.flowLogic.if(   { $id, condition }, () => { /* true branch */ })
wfa.flowLogic.elseIf({ $id, condition }, () => { /* else-if branch */ })
wfa.flowLogic.else(  { $id },           () => { /* fallback branch */ })
```

`condition` is an encoded ServiceNow query string. You can interpolate data pills using template literals.
`if`, `elseIf`, and `else` must be called in sequence immediately after each other.

### Loops

```
wfa.flowLogic.forEach(dataPillArray, { $id }, () => { /* loop body */ })
```

- Iterates over an `array.*` data pill
- Use `wfa.flowLogic.exitLoop({ $id })` to break out of the loop early
- Use `wfa.flowLogic.skipIteration({ $id })` to move to the next iteration (continue)

### Delays

Use `wfa.flowLogic.wait` to pause flow execution for a duration or until a condition is met.

---

## Flow Variables

Declare typed variables in the flow metadata to pass data between actions:

```ts
Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'My Flow',
    variables: {
      currentCount: { type: 'integer', defaultValue: 0 },
      statusMessage: { type: 'string' },
    }
  },
  ...
)
```

---

## File Organisation

```
src/fluent/flows/
  my-flow.now.ts          → Flow definition (trigger + body)
  my-flow-actions.now.ts  → Shared action configs or sub-flows
```

---

## Key Guidelines

- Always use unique `$id` values for every `wfa.trigger`, `wfa.action`, and `wfa.flowLogic.*` call
- Use `action.core.log` at the start of flows to aid debugging
- Keep conditions as encoded query strings (same syntax as ServiceNow list filters)
- For record updates, use `TemplateValue({ field: value })` — this is the same helper used elsewhere in Fluent
- Use `'background'` execution for flows that do not need to block the user interaction
- Do not use flows for real-time UI interactions — use business rules or client scripts instead
