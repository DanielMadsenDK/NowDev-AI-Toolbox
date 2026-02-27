# Flow API

The Flow API enables authoring ServiceNow workflows entirely in TypeScript using Fluent metadata.
Workflows become version-controlled code that benefits from AI assistance and pull request reviews.

Import from `@servicenow/sdk/automation`:

```ts
import { Flow, Subflow, wfa, trigger, action } from '@servicenow/sdk/automation'
import { TemplateValue } from '@servicenow/sdk/core'
```

---

## Structure

### Flow

A `Flow` accepts a metadata object followed by a trigger and a callback function containing the flow body:

```ts
export const myFlow = Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'Human-readable name',
    description: 'What this flow does',
    // Optional:
    runAs: 'system',       // 'system' | 'admin' | user sys_id
    runWithRoles: [],      // array of role names
    flowPriority: 'LOW',   // 'LOW' | 'MEDIUM' | 'HIGH'
  },
  wfa.trigger(triggerType, { $id: Now.ID['trigger_id'], annotation: 'optional label' }, triggerOptions),
  (params) => {
    // Flow body: actions, logic, loops
  }
)
```

### Subflow

A `Subflow` is a reusable block with typed inputs, outputs, and optional flow-scoped variables.
Declare inputs, outputs, and flowVariables using column type helpers from `@servicenow/sdk/core`:

```ts
import { Subflow, wfa, action } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const mySubflow = Subflow(
  {
    $id: Now.ID['my_subflow'],
    name: 'My Subflow',
    description: 'Does something reusable',
    inputs: {
      user_id: ReferenceColumn({ label: 'User', referenceTable: 'sys_user', mandatory: true }),
    },
    outputs: {
      success: BooleanColumn({ label: 'Success' }),
      result_label: StringColumn({ label: 'Result Label', maxLength: 40 }),
    },
    flowVariables: {
      found_flag: BooleanColumn({ label: 'Found Flag', default: false }),
    },
  },
  (params) => {
    // Access inputs via params.inputs.user_id
    // Assign outputs before the subflow ends:
    wfa.flowLogic.assignSubflowOutputs(
      { $id: Now.ID['assign_outputs'], annotation: 'Return results' },
      params.outputs,
      { success: true, result_label: wfa.dataPill(someAction.Record.name, 'string') }
    )
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

All record trigger options:

| Option | Description |
|--------|-------------|
| `table` | Target table name |
| `condition` | Encoded ServiceNow query string |
| `run_flow_in` | `'background'` or `'foreground'` |
| `run_on_extended` | `'true'` or `'false'` — whether to run on extended tables |
| `run_when_setting` | `'both'` \| `'always'` \| `'once'` |
| `run_when_user_setting` | `'any'` \| `'specific'` |
| `run_when_user_list` | Array of user sys_ids when user_setting is `'specific'` |
| `trigger_strategy` | `'unique_changes'` — prevents re-triggering on unchanged fields (record.updated only) |

### Scheduled Triggers

Use `trigger.scheduled.*` for time-based execution:

- `trigger.scheduled.daily` — daily at a specified time
- `trigger.scheduled.weekly` — weekly on specified days
- `trigger.scheduled.monthly` — monthly on a specified day
- `trigger.scheduled.repeat` — repeating interval
- `trigger.scheduled.runOnce` — single execution at a future time

### Application Triggers

Use `trigger.application.*` for platform events:

- `trigger.application.inboundEmail` — options: `email_conditions` (encoded query on email fields), `target_table`
- `trigger.application.remoteTableQuery`
- `trigger.application.knowledgeManagement`
- `trigger.application.slaTask`

Inbound email data pills: `params.trigger.from_address`, `params.trigger.subject`, `params.trigger.inbound_email.body`, `params.trigger.inbound_email.sys_id`.

---

## Data Pills

Use `wfa.dataPill(reference, type)` to reference dynamic field values from trigger records or previous actions.

- `type` must match the field's actual data type: `'string'`, `'reference'`, `'integer'`, `'boolean'`, `'array.string'`, `'records'`, etc.
- Dot-walking is supported: reference a related record's field via a chain of dots.
- Action result accessors differ by action type (see Actions below).

---

## Actions

Use `wfa.action(actionType, { $id, annotation? }, actionInputs)` to perform operations.
The second argument supports an optional `annotation` label for readability in Flow Designer.

### Record Actions

> **Critical:** The lookup action is `action.core.lookUpRecord` (capital U — not `lookupRecord`).
> The result's record fields are accessed as `.Record.fieldName` (capital R).

| Action | Key Inputs | Result Accessor |
|--------|-----------|----------------|
| `action.core.lookUpRecord` | `table`, `conditions`, `sort_type`, `if_multiple_records_are_found_action` | `.Record.fieldName` |
| `action.core.createRecord` | `table_name`, `values: TemplateValue({...})` | `.record` |
| `action.core.updateRecord` | `table_name`, `record`, `values: TemplateValue({...})` | — |
| `action.core.deleteRecord` | `table_name`, `record` | — |

Example — look up a record and reference its fields:

```ts
const found = wfa.action(
  action.core.lookUpRecord,
  { $id: Now.ID['lookup_user'], annotation: 'Find user by email' },
  {
    table: 'sys_user',
    conditions: `email=${wfa.dataPill(params.trigger.current.caller_email, 'string')}`,
    sort_type: 'sort_asc',
    if_multiple_records_are_found_action: 'use_first_record',
  }
)
// Use the result:
// wfa.dataPill(found.Record.sys_id, 'reference')
// wfa.dataPill(found.Record.name, 'string')
```

### Communication Actions

- `action.core.sendNotification` — platform notification: requires `table_name`, `record`, `notification` (name of the notification record)
- `action.core.sendSms` — send SMS: `recipients`, `message`
- `action.core.sendEmail` — ad-hoc email:

```ts
wfa.action(action.core.sendEmail, { $id: Now.ID['send_email'] }, {
  table_name: 'incident',
  record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
  watermark_email: true,
  ah_to: wfa.dataPill(userRecord.Record.email, 'string'),
  ah_subject: `Subject text with ${wfa.dataPill(params.trigger.current.number, 'string')}`,
  ah_body: 'Body content here.',
})
```

### Task and Approval Actions

- `action.core.createTask` — create a task record:

```ts
wfa.action(action.core.createTask, { $id: Now.ID['create_task'] }, {
  task_table: 'incident',
  field_values: TemplateValue({
    priority: 1,
    short_description: wfa.dataPill(params.trigger.subject, 'string'),
    assigned_to: wfa.dataPill(userRecord.Record.sys_id, 'reference'),
  }),
})
```

- `action.core.setApproval` — set approval state on a record

### Attachment Actions

- `action.core.getAttachmentsOnRecord` — retrieve attachments on a record; input: `source_record`; result accessed via `.parameter`
- `action.core.copyAttachment` — copy an attachment to another record: `attachment_record`, `target_record`, `table`

### Utility Actions

- `action.core.log` — write a log entry; `log_level` is `'info'`, `'warn'`, or `'error'`

---

## Flow Logic

All logic helpers live on `wfa.flowLogic`:

### Conditional Branching

```ts
wfa.flowLogic.if(    { $id, condition, annotation? }, () => { /* true branch */ })
wfa.flowLogic.elseIf({ $id, condition, annotation? }, () => { /* else-if branch */ })
wfa.flowLogic.else(  { $id, annotation? },            () => { /* fallback branch */ })
```

`condition` is an encoded ServiceNow query string. Interpolate data pills using template literals.
`if`, `elseIf`, and `else` must be called in sequence immediately after each other.

### Loops

```ts
wfa.flowLogic.forEach(dataPillArray, { $id }, () => { /* loop body */ })
```

- Iterates over an `array.*` or `records` data pill
- `wfa.flowLogic.exitLoop({ $id })` — break out of the loop early
- `wfa.flowLogic.skipIteration({ $id })` — move to the next iteration (continue)

### Delays

Use `wfa.flowLogic.wait` to pause flow execution for a duration or until a condition is met.

### Subflow Output Assignment

Use `wfa.flowLogic.assignSubflowOutputs` inside a `Subflow` body to populate output values before completion.
See the Subflow section above for a complete example.

---

## Flow Variables

Declare typed variables in the flow metadata using column type helpers from `@servicenow/sdk/core`:

```ts
import { IntegerColumn, StringColumn } from '@servicenow/sdk/core'

Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'My Flow',
    variables: {
      currentCount: IntegerColumn({ label: 'Count', default: 0 }),
      statusMsg: StringColumn({ label: 'Status', maxLength: 255 }),
    },
  },
  // trigger ...
  (params) => {
    // Access via params.variables.currentCount
  }
)
```

---

## Key Guidelines

- Always export `Flow` and `Subflow` constants — they can be referenced by `CatalogItem.flow` or other metadata
- Use `runAs: 'system'` for fulfillment flows that need elevated privileges
- Set `flowPriority` for time-sensitive (`'HIGH'`) or batch work (`'LOW'`)
- Prefer `trigger_strategy: 'unique_changes'` on `record.updated` triggers to avoid redundant execution
- Use `Subflow` to extract reusable logic callable from multiple Flows
- `wfa.flowLogic.assignSubflowOutputs` must be called before the subflow body ends if outputs are declared
- Always use unique `$id` values for every trigger, action, and flowLogic call
- Use `action.core.log` at the start of flows to aid debugging
- For record updates, wrap field values in `TemplateValue({ field: value })`