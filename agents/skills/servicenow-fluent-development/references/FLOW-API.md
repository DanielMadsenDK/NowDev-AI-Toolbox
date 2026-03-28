# Flow API

The Flow API defines flows and subflows (`sys_hub_flow`), which automate business processes with reusable multiple-step components.

Workflows become version-controlled code that benefits from AI assistance and pull request reviews.

Import from `@servicenow/sdk/automation`:

```ts
import { Flow, Subflow, wfa, trigger, action } from '@servicenow/sdk/automation'
import { TemplateValue } from '@servicenow/sdk/core'
```

---

## Flow Object

Create a `Flow` to run a sequence of actions and flow logic when a set of trigger conditions occur.

Flows only run when their trigger conditions are met. Use flows for event-driven automation that requires a consistent and predefined trigger.

### Flow Structure

A `Flow` consists of:
- **One configuration object** — defines flow configuration properties
- **One `wfa.trigger` function** — defines when to run the flow
- **One Flow body function** — defines what actions and flow logic to run
- **Zero or more `wfa.action` functions** — perform specific tasks
- **Zero or more `wfa.flow_logic` functions** — control flow execution

### Flow Configuration Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `$id` | String\|Number | Yes | Unique ID using `Now.ID['id']` format | `Now.ID['flow_name']` | — |
| `name` | String | Yes | Display name of the flow | Human-readable string | — |
| `description` | String | No | Description of what the flow does | String | — |
| `runAs` | String | No | User context for flow execution | `'system'`, `'user'` | `'user'` |
| `runWithRoles` | String | No | Roles the flow uses while running | Comma-separated role names | — |
| `flowPriority` | String | No | Execution priority in Flow Engine | `'LOW'`, `'MEDIUM'`, `'HIGH'` | `'MEDIUM'` |
| `protection` | String | No | Whether flow is read-only | `'read'`, `''` (editable) | `''` |
| `access` | String | No | Whether flow is public or private | `'public'`, `'package_private'` | `'public'` |
| `flowVariables` | Object | No | Data variables using Column types | `{ varName: ColumnType(...) }` | — |

### Flow Body Function

The flow body is an Arrow function that receives the `params` parameter, which contains:

```ts
params.trigger.current          // Current record (Record type) — for create/update triggers
params.trigger.previous         // Previous record values (Record type) — for update triggers
params.trigger.table_name       // Table name (String) of the current record
params.trigger.flowVariables    // Flow variables (Object) defined in this flow
params.trigger.email            // Email data — for inbound email triggers
params.trigger.subject          // Email subject — for inbound email triggers
params.trigger.from_address     // Sender email — for inbound email triggers
```

### Basic Flow Example

```ts
export const myFlow = Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'My Workflow',
    description: 'What this flow does',
    runAs: 'user',                  // 'system' or 'user'
    flowPriority: 'MEDIUM',         // 'LOW', 'MEDIUM', 'HIGH'
    protection: '',                 // 'read' or ''
    access: 'public',               // 'public' or 'package_private'
  },
  wfa.trigger(trigger.record.created, { $id: Now.ID['trigger_id'] }, triggerOptions),
  (params) => {
    // Flow body: actions, logic, loops
  }
)
```

---

## Subflow Object

Create a `Subflow` to run a reusable sequence of actions and flow logic when called by a flow or API.

Subflows run when called by a flow or an API. Use subflows for on-demand automation that can be called by multiple flows.

### Subflow Structure

A `Subflow` consists of:
- **One configuration object** — defines subflow configuration properties
- **Zero or one inputs object** — defines subflow inputs using Column types
- **Zero or one outputs object** — defines subflow outputs using Column types
- **Zero or one flowVariables object** — defines flow-scoped variables
- **One Flow body function** — defines what actions and flow logic to run
- **Zero or more `wfa.action` functions**
- **Zero or more `wfa.flow_logic` functions**

### Subflow Configuration Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `$id` | String\|Number | Yes | Unique ID using `Now.ID['id']` format | `Now.ID['subflow_name']` | — |
| `name` | String | Yes | Display name of the subflow | Human-readable string | — |
| `description` | String | No | Description of what the subflow does | String | — |
| `runAs` | String | No | User context for subflow execution | `'system'`, `'user'` | `'user'` |
| `runWithRoles` | Array | No | Roles the subflow uses while running | Array of role names | — |
| `flowPriority` | String | No | Execution priority in Flow Engine | `'LOW'`, `'MEDIUM'`, `'HIGH'` | `'MEDIUM'` |
| `protection` | String | No | Whether subflow is read-only | `'read'`, `''` (editable) | `''` |
| `access` | String | No | Visibility to other subflow authors | `'public'`, `'package_private'` | `'public'` |
| `category` | String | No | Category for organizing the subflow | String | — |
| `inputs` | Object | No | Input parameters using Column types | `{ paramName: ColumnType(...) }` | — |
| `outputs` | Object | No | Output parameters using Column types | `{ resultName: ColumnType(...) }` | — |
| `flowVariables` | Object | No | Data variables using Column types | `{ varName: ColumnType(...) }` | — |

### Subflow Body Parameters

```ts
_params.inputs              // Subflow input parameters (Object)
_params.inputs.user_sys_id // Specific input parameter value
_params.outputs            // Subflow output parameters (Object) — populate before ending
_params.flowVariables      // Flow variables (Object) defined in this subflow
```

### Complete Subflow Example

```ts
import { Subflow, wfa, action } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const newUserOnboardingSubflow = Subflow(
  {
    $id: Now.ID['new_user_onboarding_subflow'],
    name: 'New User Onboarding Subflow',
    description: 'Sends welcome notification, assigns laptop and desk, returns assignment results',
    runAs: 'system',
    inputs: {
      user_sys_id: ReferenceColumn({
        label: 'User',
        referenceTable: 'sys_user',
        mandatory: true,
      }),
      office_location: ReferenceColumn({
        label: 'Office Location',
        referenceTable: 'cmn_location',
        mandatory: true,
      }),
    },
    outputs: {
      laptop_assigned: BooleanColumn({ label: 'Laptop Assigned' }),
      desk_assigned: BooleanColumn({ label: 'Desk Assigned' }),
      laptop_number: StringColumn({ label: 'Laptop Asset Number', maxLength: 40 }),
      desk_number: StringColumn({ label: 'Desk Asset Number', maxLength: 40 }),
    },
    flowVariables: {
      laptop_found: BooleanColumn({ label: 'Laptop Found Flag', default: false }),
      desk_found: BooleanColumn({ label: 'Desk Found Flag', default: false }),
    },
  },
  (params) => {
    const user = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID['lookup_user'] },
      {
        table: 'sys_user',
        conditions: `sys_id=${wfa.dataPill(params.inputs.user_sys_id, 'reference')}`,
        sort_type: 'sort_asc',
        if_multiple_records_are_found_action: 'use_first_record',
      }
    )

    wfa.action(
      action.core.sendNotification,
      { $id: Now.ID['send_welcome_notification'] },
      {
        table_name: 'sys_user',
        record: wfa.dataPill(params.inputs.user_sys_id, 'reference'),
        notification: 'new_user_welcome_notification',
      }
    )

    // Assign outputs before subflow ends
    wfa.flowLogic.assignSubflowOutputs(
      {
        $id: Now.ID['assign_outputs'],
        annotation: 'Return laptop and desk assignment results',
      },
      params.outputs,
      {
        laptop_assigned: true,
        desk_assigned: true,
        laptop_number: wfa.dataPill(user.Record.asset_tag, 'string'),
        desk_number: wfa.dataPill(user.Record.asset_tag, 'string'),
      }
    )
  }
)
```

---

## wfa.trigger Function

Run a flow when the start conditions of a specific trigger type are met. Triggers determine when a flow runs and what data is available from the flow start conditions.

### Trigger Types

The following trigger types are supported:

**Record Triggers:**
- `trigger.record.created` — fires when a new record is inserted
- `trigger.record.updated` — fires when an existing record is modified
- `trigger.record.createdOrUpdated` — fires on either insert or update

**Scheduled Triggers:**
- `trigger.scheduled.daily` — daily at a specified time
- `trigger.scheduled.weekly` — weekly on specified days
- `trigger.scheduled.monthly` — monthly on a specified day
- `trigger.scheduled.repeat` — repeating interval
- `trigger.scheduled.runOnce` — single execution at a future time

**Application Triggers:**
- `trigger.application.inboundEmail` — when email arrives for a table
- `trigger.application.slaTask` — when an SLA task event occurs
- `trigger.application.knowledgeManagement` — when knowledge articles change
- `trigger.application.remoteTableQuery` — when a remote table query completes

### wfa.trigger Structure

```ts
wfa.trigger(
  triggerType,              // e.g., trigger.record.created
  {
    $id: Now.ID['trigger_id'],     // Required: unique identifier
    annotation: 'optional label'    // Optional: describes trigger purpose
  },
  triggerInputs              // Object containing trigger-specific options
)
```

### Record Trigger Options

| Option | Type | Description | Valid Values |
|--------|------|-------------|--------------|
| `table` | String | **Required.** Target table name | Table name (e.g., `'incident'`) |
| `condition` | String | Encoded ServiceNow query filter | Encoded query string or empty |
| `run_flow_in` | String | Flow execution mode | `'background'`, `'foreground'`, `'any'` |
| `run_on_extended` | String | Run on extended (child) tables | `'true'`, `'false'` |
| `run_when_setting` | String | When to run the flow | `'both'`, `'non_interactive'`, `'interactive'` |
| `run_when_user_setting` | String | Filter by user | `'any'`, `'one_of'`, `'not_one_of'` |
| `run_when_user_list` | Array | Specific user sys_ids | Array of user sys_ids (when setting is `'one_of'` or `'not_one_of'`) |
| `trigger_strategy` | String | Strategy for triggering | `'unique_changes'` (prevents re-trigger on unchanged fields) |

### Record Trigger Examples

**High priority incident trigger:**
```ts
wfa.trigger(
  trigger.record.created,
  { $id: Now.ID['incident_trigger'], annotation: 'When high priority incident is created' },
  {
    table: 'incident',
    condition: 'priority=1^ORpriority=2',  // Encoded query filter
    run_on_extended: 'false',
    run_flow_in: 'background',
    run_when_setting: 'both',
    run_when_user_setting: 'any',
    run_when_user_list: [],
  }
)
```

**Change request update with unique changes strategy:**
```ts
wfa.trigger(
  trigger.record.updated,
  { $id: Now.ID['change_request_approved_trigger'] },
  {
    table: 'change_request',
    condition: 'approval=approved',
    run_flow_in: 'background',
    trigger_strategy: 'unique_changes',    // Only trigger on field changes
    run_when_user_list: [],
    run_when_setting: 'both',
    run_on_extended: 'false',
    run_when_user_setting: 'any',
  }
)
```

### Scheduled Trigger Examples

**Daily trigger at 9 AM:**
```ts
wfa.trigger(
  trigger.scheduled.daily,
  { $id: Now.ID['daily_report_trigger'], annotation: 'Runs daily at 9 AM' },
  {
    time: Time({ hours: 9, minutes: 0, seconds: 0 })
  }
)
```

### Inbound Email Trigger

```ts
wfa.trigger(
  trigger.application.inboundEmail,
  { $id: Now.ID['incident_email_trigger'], annotation: 'Process emails for incident table' },
  {
    target_table: 'incident',        // String, optional — table for email replies/forwards
    email_conditions: '',            // String, optional — filter which emails trigger the flow
    order: 100,                      // Number, optional — execution order when multiple email triggers exist
    stop_condition_evaluation: true  // Boolean, optional — stop evaluating other triggers if this one matches
  }
)

// Access email data in flow body:
(params) => {
  const emailSubject = params.trigger.email.subject       // Email subject
  const emailBody = params.trigger.email.body             // Email body
  const emailFrom = params.trigger.email.from             // Sender email address
}
```

---

## wfa.dataPill Function

Reference a specific runtime data pill value from an action or flow logic input.

Use `wfa.dataPill(expression, type)` to reference dynamic field values from trigger records or previous actions.

### Data Pill Properties

| Property | Type | Description |
|----------|------|-------------|
| `expression` | String | **Required.** Dot notation reference to the runtime data (e.g., `params.trigger.current.fieldName`, `actionResult.Record.fieldName`) |
| `type` | String | **Required.** Data type: `'string'`, `'reference'`, `'integer'`, `'boolean'`, `'array.string'`, `'records'`, etc. |

### Common Data Pill Sources

**From trigger records:**
```ts
params.trigger.current.fieldName          // Current record field value
params.trigger.previous.fieldName         // Previous record value (update triggers)
params.trigger.table_name                 // Table name (String)
params.trigger.email.subject              // Email subject (inbound email trigger)
params.trigger.email.body                 // Email body (inbound email trigger)
params.trigger.email.from                 // Sender email address (inbound email trigger)
```

**From action outputs:**
```ts
actionResult.Record.fieldName             // Single record lookup result
actionResult.Records                      // Multiple records array
actionResult.fieldName                    // Action-specific output
```

**From flow variables:**
```ts
params.flowVariables.variableName         // Access flow variable
_params.flowVariables.variableName        // In subflow body
```

### Data Pill Examples

```ts
// String data pill from trigger
const description = wfa.dataPill(params.trigger.current.short_description, 'string')

// Reference data pill from trigger
const recordId = wfa.dataPill(params.trigger.current.sys_id, 'reference')

// Integer from action output
const priority = wfa.dataPill(lookupResult.Record.priority, 'integer')

// Array of strings
const assignees = wfa.dataPill(params.trigger.current.additional_assignee_list, 'array.string')
```

---

## wfa.action Function

Run a specific action instance from a flow or subflow. Actions determine what data is generated, updated, or retrieved.

### Action Structure

```ts
wfa.action(
  actionType,              // e.g., action.core.createRecord
  {
    $id: Now.ID['action_id'],      // Required: unique identifier
    annotation: 'optional label'    // Optional: describes action purpose
  },
  actionInputs              // Object containing action-specific parameters
)
```

### Supported Actions

The following action instances are supported:

**Record Operations:**
- `action.core.createRecord` — Create a new record on any table
- `action.core.createOrUpdateRecord` — Create or update a record based on coalesce keys
- `action.core.deleteRecord` — Delete a single record
- `action.core.updateRecord` — Update fields on a single record
- `action.core.updateMultipleRecords` — Update fields on all records matching conditions
- `action.core.lookUpRecord` — Find a single record by conditions (returns first if multiple)
- `action.core.lookUpRecords` — Find multiple records by conditions (returns array)

**Attachments:**
- `action.core.copyAttachment` — Copy an attachment from one record to another
- `action.core.deleteAttachment` — Delete an attachment
- `action.core.getAttachmentsOnRecord` — Get all attachments on a record
- `action.core.lookupAttachment` — Find an attachment by conditions
- `action.core.lookUpEmailAttachments` — Get email attachments
- `action.core.moveAttachment` — Move an attachment to a different record
- `action.core.moveEmailAttachmentsToRecord` — Move email attachments to a record

**Communication:**
- `action.core.sendNotification` — Send a configured notification
- `action.core.sendEmail` — Send an ad-hoc email
- `action.core.sendSms` — Send an SMS message
- `action.core.getEmailHeader` — Retrieve a specific email header from an inbound email
- `action.core.getLatestResponseTextFromEmail` — Extract latest reply text from email thread
- `action.core.associateRecordToEmail` — Link a record to an email thread
- `action.core.waitForEmailReply` — Pause flow until an email reply is received
- `action.core.waitForMessage` — Pause flow until a specific outbound message is received

**Approvals & Tasks:**
- `action.core.askForApproval` — Create approvals on a record with configurable rule sets
- `action.core.createTask` — Create a task record
- `action.core.createCatalogTask` — Create a catalog task for a request item

**Waits & Conditions:**
- `action.core.waitForCondition` — Pause flow until a record matches a condition

**Service Catalog:**
- `action.core.submitCatalogItemRequest` — Submit a catalog item order
- `action.core.getCatalogVariables` — Read variables from a catalog request item
- `action.core.recordProducer` — Submit a Record Producer request

**Events & Work Notes:**
- `action.core.fireEvent` — Fire a ServiceNow system event
- `action.core.addWorknoteLinkToContext` — Add a work note link to the flow context
- `action.core.slaPercentageTimer` — Check SLA percentage elapsed for a record

**Logging:**
- `action.core.log` — Log a message to the system log

### Record Actions

**lookUpRecord:**
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
// Access result: found.Record.fieldName
```

**lookUpRecords (returns multiple records):**
```ts
const problems = wfa.action(
  action.core.lookUpRecords,
  { $id: Now.ID['lookup_problems'] },
  {
    table: 'problem',
    conditions: 'priority=1^active=true',
  }
)
// Access results: problems.Records (array of records)
```

**createRecord:**
```ts
wfa.action(
  action.core.createRecord,
  { $id: Now.ID['create_incident'] },
  {
    table_name: 'incident',
    values: TemplateValue({
      short_description: wfa.dataPill(params.trigger.current.description, 'string'),
      priority: '2',
    }),
  }
)
```

**updateRecord:**
```ts
wfa.action(
  action.core.updateRecord,
  { $id: Now.ID['update_incident'] },
  {
    table_name: 'incident',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    values: TemplateValue({
      state: '2',
      work_notes: 'Updated by flow',
    }),
  }
)
```

**deleteRecord:**
```ts
wfa.action(
  action.core.deleteRecord,
  { $id: Now.ID['delete_record'] },
  {
    table_name: 'task',
    record: wfa.dataPill(taskRecord.Record.sys_id, 'reference'),
  }
)
```

### Communication Actions

**sendNotification:**
```ts
wfa.action(
  action.core.sendNotification,
  { $id: Now.ID['send_notification'] },
  {
    table_name: 'incident',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    notification: 'incident_created_notification',  // Notification name
  }
)
```

**sendEmail:**
```ts
wfa.action(
  action.core.sendEmail,
  { $id: Now.ID['send_email'] },
  {
    table_name: 'incident',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    watermark_email: true,
    ah_subject: `Change ${wfa.dataPill(params.trigger.current.number, 'string')} - Approved`,
    ah_body: 'Your change request has been approved.',
    ah_to: wfa.dataPill(requester.Record.email, 'string'),
  }
)
```

**sendSms:**
```ts
wfa.action(
  action.core.sendSms,
  { $id: Now.ID['send_sms'] },
  {
    recipients: wfa.dataPill(user.Record.phone, 'string'),
    message: `Incident created: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
  }
)
```

### Approval Actions

**askForApproval:**
```ts
wfa.action(
  action.core.askForApproval,
  { $id: Now.ID['ask_approval'] },
  {
    table_name: 'change_request',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    approval_set: 'manager_approval',  // Approval set name
  }
)
```

**waitForApproval:**
```ts
wfa.action(
  action.core.waitForApproval,
  { $id: Now.ID['wait_approval'] },
  {
    table_name: 'change_request',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
  }
)
```

### Task Actions

**createTask:**
```ts
wfa.action(
  action.core.createTask,
  { $id: Now.ID['create_task'] },
  {
    task_table: 'incident',
    field_values: TemplateValue({
      priority: '1',
      short_description: wfa.dataPill(params.trigger.current.description, 'string'),
      assigned_to: wfa.dataPill(userRecord.Record.sys_id, 'reference'),
    }),
  }
)
```

### Utility Actions

**log:**
```ts
wfa.action(
  action.core.log,
  { $id: Now.ID['log_incident'] },
  {
    log_level: 'info',  // 'info', 'warn', 'error'
    log_message: `Incident created: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
  }
)
```

**waitForCondition:**
```ts
wfa.action(
  action.core.waitForCondition,
  { $id: Now.ID['wait_for_approval'] },
  {
    table_name: 'incident',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    condition: 'state=6',  // Encoded query condition
  }
)
```

**slaPercentageTimer:**
```ts
wfa.action(
  action.core.slaPercentageTimer,
  { $id: Now.ID['sla_timer'] },
  {
    table_name: 'incident',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
  }
)
```

---

## wfa.flow_logic Function

Run a specific flow logic instance from a flow or subflow. Flow logic determines how and when data is used.

### Flow Logic Types

The following flow logic instances are supported:

- `if`
- `elseIf`
- `else`
- `forEach`
- `waitForADuration`
- `exitLoop`
- `endFlow`
- `skipIteration`
- `setFlowVariables`
- `assignSubflowOutputs`

### Conditional Branching (if/elseIf/else)

```ts
wfa.flowLogic.if(
  {
    $id: Now.ID['check_priority'],
    condition: `${wfa.dataPill(params.trigger.current.priority, 'string')}=1`,
    annotation: 'Priority is critical'
  },
  () => {
    // Execute when condition is true
  }
)

wfa.flowLogic.elseIf(
  {
    $id: Now.ID['check_high_priority'],
    condition: `${wfa.dataPill(params.trigger.current.priority, 'string')}=2`,
    annotation: 'Priority is high'
  },
  () => {
    // Execute when previous condition is false and this is true
  }
)

wfa.flowLogic.else(
  {
    $id: Now.ID['check_default'],
    annotation: 'Default priority handling'
  },
  () => {
    // Execute when all previous conditions are false
  }
)
```

**Rules:**
- `condition` is an encoded ServiceNow query string
- Interpolate data pills using template literals
- `if`, `elseIf`, and `else` must be called in sequence immediately after each other

### Loops (forEach)

```ts
wfa.flowLogic.forEach(
  problems.Records,  // Array or records data pill
  { $id: Now.ID['iterate_problems'], annotation: 'Process each problem' },
  (item) => {
    // `item` is the current element
    // Can use item.fieldName to access fields
    wfa.action(
      action.core.updateRecord,
      { $id: Now.ID['update_problem'] },
      {
        table_name: 'problem',
        record: item,
        values: TemplateValue({ state: '2' }),
      }
    )
  }
)
```

**Loop Control:**
- `wfa.flowLogic.exitLoop({ $id: Now.ID['exit'] })` — break out of the loop early
- `wfa.flowLogic.skipIteration({ $id: Now.ID['skip'] })` — move to the next iteration (continue)

### Complete forEach Example

```ts
(params) => {
  // Find all newly created problems for the past day
  const problems = wfa.action(
    action.core.lookUpRecords,
    { $id: Now.ID['find_daily_problems'], annotation: 'Find daily unassigned problems' },
    {
      table: 'problem',
      conditions: 'sys_created_onONYesterday@javascript:gs.beginningOfYesterday()@javascript:gs.endOfYesterday()',
    }
  )

  // Iterate over the problems
  wfa.flowLogic.forEach(
    problems.Records,
    { $id: Now.ID['iterate_problems'], annotation: 'Iterate each problem' },
    (item) => {
      // Check if problem is not assigned
      wfa.flowLogic.if(
        {
          $id: Now.ID['check_unassigned'],
          condition: `${wfa.dataPill(item.assignment_group, 'reference')}ISEMPTY`,
          annotation: 'Check if problem is not assigned',
        },
        () => {
          wfa.action(
            action.core.updateRecord,
            { $id: Now.ID['update_state'] },
            {
              table_name: 'problem',
              record: item,
              values: TemplateValue({ state: '1' }),
            }
          )
        }
      )
    }
  )
}
```

### Wait for Duration

```ts
wfa.flowLogic.waitForADuration(
  {
    $id: Now.ID['wait_3_days'],
    annotation: 'Wait 3 days before escalation'
  },
  {
    duration_type: 'days',      // 'seconds', 'minutes', 'hours', 'days'
    duration: 3,
  }
)
```

### Exit Flow

```ts
wfa.flowLogic.endFlow(
  {
    $id: Now.ID['end_early'],
    annotation: 'End flow if no records found'
  }
)
```

### Set Flow Variables

```ts
wfa.flowLogic.setFlowVariables(
  {
    $id: Now.ID['set_variables'],
    annotation: 'Initialize flow variables with default values',
  },
  params.flowVariables,  // Always use params.flowVariables
  {
    incidentPriority: wfa.dataPill(params.trigger.current.priority, 'integer'),
    assignedGroup: wfa.dataPill(params.trigger.current.assignment_group, 'reference'),
    isEscalated: true,
    status: 'processing',
  }
)
```

### Complete setFlowVariables Example

```ts
import { IntegerColumn, StringColumn, BooleanColumn } from '@servicenow/sdk/core'

const flowVars = {
  incidentPriority: IntegerColumn({ label: 'Incident Priority' }),
  assignedGroup: StringColumn({ label: 'Assigned Group' }),
  isApproved: BooleanColumn({ label: 'Is Approved' }),
}

Flow(
  {
    $id: Now.ID['my_flow'],
    name: 'My Flow',
    flowVariables: flowVars,
  },
  // trigger...
  (params) => {
    const lookupResult = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID['lookup_config'] },
      { table: 'sys_properties', conditions: 'name=incident.priority' }
    )

    // Set variables using data pills
    wfa.flowLogic.setFlowVariables(
      {
        $id: Now.ID['set_vars'],
        annotation: 'Set variables from trigger and action outputs',
      },
      params.flowVariables,
      {
        incidentPriority: wfa.dataPill(params.trigger.current.priority, 'integer'),
        assignedGroup: wfa.dataPill(params.trigger.current.assignment_group, 'reference'),
        isApproved: wfa.dataPill(lookupResult.Record.value, 'boolean'),
      }
    )
  }
)
```

### Assign Subflow Outputs

```ts
wfa.flowLogic.assignSubflowOutputs(
  {
    $id: Now.ID['assign_outputs'],
    annotation: 'Return laptop and desk assignment results',
  },
  params.outputs,  // Always use params.outputs in subflow
  {
    laptop_assigned: true,
    desk_assigned: true,
    laptop_number: wfa.dataPill(availableLaptop.Record.asset_tag, 'string'),
    desk_number: wfa.dataPill(availableDesk.Record.asset_tag, 'string'),
  }
)
```

**Note:** `assignSubflowOutputs` must be called before the subflow body ends if outputs are declared.

---

## wfa.inlineScript Function

Embed an inline TypeScript/JavaScript expression directly inside an action input. Use this when you need to compute a value dynamically at flow runtime instead of using a static data pill.

```ts
import { wfa } from '@servicenow/sdk/automation'

wfa.action(
  action.core.createRecord,
  { $id: Now.ID['create_incident'] },
  {
    table_name: 'incident',
    values: TemplateValue({
      short_description: wfa.inlineScript(`current.description + ' (auto-created)'`),
      urgency: wfa.inlineScript(`current.urgency < 2 ? '1' : current.urgency`),
    }),
  }
)
```

**Note:** `wfa.inlineScript()` accepts a JavaScript expression string. Avoid complex logic — prefer a Script Include for more complex server-side computation.

---

## wfa.approvalRules and wfa.approvalDueDate

Use these helpers to configure the `askForApproval` action with structured rule sets and optional due dates.

### wfa.approvalRules

Build structured approval rules that determine who can approve or reject a flow step. Rules are organized into **rule sets** connected by OR logic, with individual rules within each set connected by AND logic.

```ts
import { wfa, action } from '@servicenow/sdk/automation'

wfa.action(
  action.core.askForApproval,
  { $id: Now.ID['ask_approval'] },
  {
    table: 'change_request',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    approval_conditions: wfa.approvalRules({
      conditionType: 'OR',
      ruleSets: [
        {
          action: 'Approves',
          conditionType: 'AND',
          rules: [
            {
              rule_type: 'Any',           // 'Any' | 'All' | 'Res' | 'Count' | 'Percent'
              users: ['user_sys_id_1'],   // Array of user sys_ids
              groups: ['group_sys_id_1'], // Array of group sys_ids
              manual: false,
            },
          ],
        },
        {
          action: 'Rejects',
          conditionType: 'AND',
          rules: [
            {
              rule_type: 'Any',
              users: [],
              groups: ['cab_group_sys_id'],
              manual: false,
            },
          ],
        },
      ],
    }),
  }
)
```

**Rule types:**
- `'Any'` — Any user or group member can approve/reject
- `'All'` — All users and group members must approve/reject
- `'Res'` — All responded and anyone approves/rejects
- `'Count'` — Specific number of approvals required
- `'Percent'` — Percentage of approvals required

### wfa.approvalDueDate

Set an automatic action when approvals are not responded to by a due date.

```ts
approval_conditions: wfa.approvalRules({ ... }),
due_date: wfa.approvalDueDate({
  action: 'approve',            // 'none' | 'approve' | 'reject' | 'cancel'
  dateType: 'relative',         // 'actual' | 'relative'
  duration: 5,
  durationType: 'days',         // 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'
  daysSchedule: '',             // Optional: cmn_schedule sys_id for business hours
})

// Or with an actual date:
due_date: wfa.approvalDueDate({
  action: 'reject',
  dateType: 'actual',
  date: wfa.dataPill(params.trigger.current.due_date, 'glide_date_time'),
})
```

---

## FlowObject and FlowArray (Complex Subflow Types)

For Subflows and custom Actions with complex structured inputs/outputs, use `FlowObject` and `FlowArray` instead of flat Column types.

### FlowObject

Create a complex object type for nested input/output structures:

```ts
import { FlowObject, FlowArray, StringColumn, IntegerColumn, BooleanColumn } from '@servicenow/sdk/core'
import { SubflowDefinition as Subflow } from '@servicenow/sdk/automation'

const addressSchema = FlowObject({
  label: 'Address',
  fields: {
    street: StringColumn({ label: 'Street', mandatory: true }),
    city: StringColumn({ label: 'City', mandatory: true }),
    zip: StringColumn({ label: 'ZIP Code', maxLength: 10 }),
  },
})

export const createUserSubflow = Subflow(
  {
    $id: Now.ID['create_user_subflow'],
    name: 'Create User Subflow',
    inputs: {
      name: StringColumn({ label: 'Full Name', mandatory: true }),
      age: IntegerColumn({ label: 'Age' }),
      address: addressSchema,
    },
    outputs: {
      created: BooleanColumn({ label: 'Was Created' }),
      user_sys_id: StringColumn({ label: 'User Sys ID', maxLength: 40 }),
    },
  },
  (params) => {
    // Access nested inputs:    params.inputs.address.city
    // Assign outputs:
    wfa.flowLogic.assignSubflowOutputs(
      { $id: Now.ID['assign_outputs'] },
      params.outputs,
      { created: true, user_sys_id: 'some_sys_id' }
    )
  }
)
```

### FlowArray

Create an array type for a collection of items in subflow inputs/outputs:

```ts
import { FlowArray, StringColumn, ReferenceColumn } from '@servicenow/sdk/core'

const incidentListSchema = FlowArray({
  label: 'Incidents',
  elementType: ReferenceColumn({
    label: 'Incident',
    referenceTable: 'incident',
  }),
  childName: 'incident',
  maxRows: 100,
})

// Use in Subflow inputs/outputs:
inputs: {
  incidents: incidentListSchema,
}
```

**Rules:**
- `FlowArray` elements can be `Column` types or `FlowObject` — but NOT another `FlowArray`
- `mandatory?: boolean` — marks the array itself as required
- `maxRows?: number` — maximum rows allowed

---

## FDTransform (Data Transformations)

The `FDTransform` object provides typed data transformation utilities for use in flow expressions and templates. Import it alongside other flow utilities:

```ts
import { FDTransform } from '@servicenow/sdk/automation'
```

### String Transformations (`FDTransform.string`)

| Method | Description |
|--------|-------------|
| `contains(input, search)` | Returns true if input contains search |
| `doesNotContain(input, search)` | Returns true if input does not contain search |
| `startsWith(input, prefix)` | Returns true if input starts with prefix |
| `endsWith(input, suffix)` | Returns true if input ends with suffix |
| `substring(input, start, end?)` | Extract a substring |
| `split(input, delimiter)` | Split string into array |
| `replaceString(input, search, replacement)` | Replace substring |
| `trim(input)` | Remove leading/trailing whitespace |
| `toLowerCase(input)` | Convert to lowercase |
| `toUpperCase(input)` | Convert to uppercase |
| `toProperCase(input)` | Convert to title case |
| `size(input)` | Return string length |
| `firstCharacter(input)` | Return first character |
| `lastCharacter(input)` | Return last character |
| `stringToNumber(input)` | Convert string to number |

### Math Transformations (`FDTransform.math`)

| Method | Description |
|--------|-------------|
| `add(a, b)` | Add two numbers |
| `subtract(a, b)` | Subtract b from a |
| `multiply(a, b)` | Multiply two numbers |
| `divide(a, b)` | Divide a by b |
| `power(base, exp)` | Raise base to exponent |
| `sqrt(n)` | Square root |
| `abs(n)` | Absolute value |
| `round(n, decimals?)` | Round to decimal places |
| `toFixedValue(n, digits)` | Fixed-point notation |
| `min(...values)` | Minimum value |
| `max(...values)` | Maximum value |
| `sum(...values)` | Sum of values |
| `average(...values)` | Average of values |
| `median(...values)` | Median value |

### DateTime Transformations (`FDTransform.dateTime`)

| Method | Description |
|--------|-------------|
| `addTime(input, duration)` | Add duration to date |
| `subtractTime(input, duration)` | Subtract duration from date |
| `dateDifference(date1, date2)` | Difference between dates |
| `dateToString(input, format, customFormat?)` | Format a date to string |
| `stringToDate(input, format, customFormat?)` | Parse a string to date |
| `year(input)` | Extract year |
| `month(input)` | Extract month number |
| `week(input)` | Extract week number |
| `day(input)` | Extract day of month |
| `hour(input)` | Extract hour |
| `minute(input)` | Extract minute |
| `second(input)` | Extract second |
| `endOfMonth(input)` | Last day of the month |

**Supported date format tokens:** `'yyyy-MM-dd'`, `'yyyy-MM-dd HH:mm:ss'`, `"yyyy-MM-dd'T'HH:mm:ss'Z'"`, `'EEE, MMM dd, yyyy'`, `'MM/dd/yyyy'`, and more. Use `'Custom'` with `customFormat` for other patterns.

### Utility Transformations (`FDTransform.utilities`)

| Method | Description |
|--------|-------------|
| `isBlank(value)` | True if null, undefined, or empty string |
| `isNotBlank(value)` | True if has content |
| `isNull(value)` | True if null or undefined |
| `isTrue(value)` | True if value is truthy |
| `isFalse(value)` | True if value is falsy |
| `getFirstItem(array)` | First element of array |
| `getLastItem(array)` | Last element of array |
| `getNthItem(array, n)` | Nth element (1-based) |
| `getItemFromNameValues(pairs, key)` | Get value from name-value pair |
| `join(array, separator)` | Join array to string |
| `sort(array)` | Sort array |
| `unique(array)` | Remove duplicates |
| `keyValueMap(pairs)` | Convert name-value pairs to map |

### Sanitize Utilities

Prevent injection attacks in SQL queries and shell commands:

```ts
FDTransform.sanitize.sql.sanitizeSqlIdentifier(input)  // Safe SQL identifier
FDTransform.sanitize.sql.sanitizeSqlValue(input)        // Safe SQL value
FDTransform.sanitize.shell.sanitizeBashShellArguments(input)  // Safe shell argument
```

### Complex Data (`FDTransform.complexData`)

```ts
FDTransform.complexData.toXml(obj)   // Serialize object to XML string
```

---

## ActionDefinition (Creating Custom Flow Actions)

Define reusable, installable Flow Actions that appear in Flow Designer's action picker. Custom actions encapsulate structured inputs, outputs, and action steps.

```ts
import { ActionDefinition } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn, ReferenceColumn, TableNameColumn, DocumentIdColumn } from '@servicenow/sdk/core'

export const enrichIncidentAction = ActionDefinition(
  {
    $id: Now.ID['enrich_incident_action'],
    name: 'Enrich Incident with CMDB Data',
    description: 'Looks up CMDB CI data and enriches the incident with business service info',
    access: 'public',
    inputs: {
      incident_id: DocumentIdColumn({
        label: 'Incident',
        mandatory: true,
        dependent: 'incident_table',
      }),
      incident_table: TableNameColumn({
        label: 'Table',
        mandatory: true,
      }),
    },
    outputs: {
      business_service: StringColumn({ label: 'Business Service', maxLength: 255 }),
      enriched_count: StringColumn({ label: 'Fields Enriched', maxLength: 10 }),
    },
  },
  (params) => {
    // Action body — use ActionStep calls here
    // params.inputs.incident_id, params.outputs.business_service
  }
)
```

### ActionDefinition Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | String | Yes | Unique metadata ID |
| `name` | String | Yes | Display name in Flow Designer |
| `description` | String | No | Visible to flow developers |
| `access` | String | No | `'public'` or `'package_private'` |
| `category` | String | No | Groups action in the picker |
| `protection` | String | No | `'read'` (read-only) or `''` |
| `inputs` | Object | Yes | Input parameters as Column types |
| `outputs` | Object | Yes | Output parameters as Column types |

---

## ActionStepDefinition and ActionStep (Custom Action Steps)

Define typed steps within a custom `ActionDefinition` body. Each step corresponds to a platform step type.

```ts
import { ActionStepDefinition, ActionStep } from '@servicenow/sdk/automation'
import { StringColumn, ChoiceColumn, IntegerColumn } from '@servicenow/sdk/core'

// Define a custom step type
const myScriptStep = ActionStepDefinition({
  $id: Now.ID['my_script_step_def'],
  name: 'Run Custom Script',
  category: 'utilities',
  inputs: {
    input_value: StringColumn({ label: 'Input', mandatory: true }),
    retry_count: IntegerColumn({ label: 'Retry Count', default: 3 }),
  },
  outputs: {
    result: StringColumn({ label: 'Result' }),
    status: ChoiceColumn({
      label: 'Status',
      choices: { success: { label: 'Success' }, failed: { label: 'Failed' } },
    }),
  },
})

// Use the step inside an ActionDefinition body:
ActionDefinition(
  { $id: Now.ID['my_action'], name: 'My Action', inputs: {}, outputs: {} },
  (params) => {
    ActionStep(myScriptStep, { $id: Now.ID['run_script'] }, {
      input_value: 'hello',
      retry_count: 2,
    })
  }
)
```

**Built-in action steps** (use in custom Action bodies):

```ts
import { actionStep } from '@servicenow/sdk/automation'

// Available: actionStep.log, actionStep.script, actionStep.rest, actionStep.createRecord,
//            actionStep.updateRecord, actionStep.deleteRecord, actionStep.lookUpRecord,
//            actionStep.lookUpRecords, actionStep.createOrUpdateRecord, actionStep.updateMultipleRecords,
//            actionStep.deleteMultipleRecords, actionStep.createTask, actionStep.waitForCondition,
//            actionStep.waitForEmailReply, actionStep.waitForMessage, actionStep.fireEvent,
//            actionStep.notification, actionStep.email, actionStep.sms, actionStep.askForApproval,
//            actionStep.getLatestResponseTextFromEmail, actionStep.createTemplatedObject,
//            actionStep.createRecordForRemoteTable, actionStep.collectActivityContext,
//            actionStep.createAppFromPayload
```

---

## TriggerDefinition (Custom Trigger Types)

Define custom trigger types for Flow Designer. This is advanced usage for platform or ISV development:

```ts
import { TriggerDefinition } from '@servicenow/sdk/automation'
import { StringColumn, BooleanColumn } from '@servicenow/sdk/core'

export const myCustomTrigger = TriggerDefinition({
  $id: Now.ID['my_custom_trigger'],
  name: 'My Custom Trigger',
  type: 'rest',
  inputs: {
    endpoint: StringColumn({ label: 'Endpoint', mandatory: true }),
    require_auth: BooleanColumn({ label: 'Require Auth', default: true }),
  },
  outputs: {
    payload: StringColumn({ label: 'Request Payload', maxLength: 65000 }),
    caller_id: StringColumn({ label: 'Caller ID', maxLength: 40 }),
  },
})
```

**Built-in trigger types** reference (used with `wfa.trigger(trigger.xxx, ...)`):

| Category | Trigger | Type string |
|----------|---------|-------------|
| Record | `trigger.record.created` | `'record_create'` |
| Record | `trigger.record.updated` | `'record_update'` |
| Record | `trigger.record.createdOrUpdated` | `'record_create_or_update'` |
| Scheduled | `trigger.scheduled.daily` | `'daily'` |
| Scheduled | `trigger.scheduled.weekly` | `'weekly'` |
| Scheduled | `trigger.scheduled.monthly` | `'monthly'` |
| Scheduled | `trigger.scheduled.repeat` | `'repeat'` |
| Scheduled | `trigger.scheduled.runOnce` | `'run_once'` |
| Application | `trigger.application.inboundEmail` | `'email'` |
| Application | `trigger.application.serviceCatalog` | `'service_catalog'` |
| Application | `trigger.application.slaTask` | `'sla_task'` |
| Application | `trigger.application.knowledgeManagement` | `'knowledge_management'` |
| Application | `trigger.application.remoteTableQuery` | `'remote_table_query'` |

---

## Complete Production Examples

### Example 1: Incident Severity Alert Flow

This flow runs when an incident is created with an empty origin field. It alerts managers and team members based on incident severity:

```ts
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const incidentSeverityAlertFlow = Flow(
  {
    $id: Now.ID['incident_severity_alert_flow'],
    name: 'Incident Severity Alert Flow',
    description: 'Alerts managers and team members based on incident severity for incidents with empty origin',
  },
  wfa.trigger(
    trigger.record.created,
    { $id: Now.ID['empty_origin_incident_trigger'] },
    {
      table: 'incident',
      condition: 'origin=NULL',
      run_flow_in: 'background',
      run_on_extended: 'false',
      run_when_setting: 'both',
      run_when_user_setting: 'any',
      run_when_user_list: [],
    }
  ),
  (params) => {
    wfa.action(
      action.core.log,
      { $id: Now.ID['log_incident_short_description'] },
      {
        log_level: 'info',
        log_message: `Incident created: ${wfa.dataPill(params.trigger.current.short_description, 'string')}`,
      }
    )

    wfa.flowLogic.if(
      {
        $id: Now.ID['check_severity_high'],
        condition: `${wfa.dataPill(params.trigger.current.severity, 'string')}=1`,
        annotation: 'High severity (1)',
      },
      () => {
        const assignmentGroup = wfa.action(
          action.core.lookUpRecord,
          { $id: Now.ID['lookup_assignment_group'] },
          {
            table: 'sys_user_group',
            conditions: `sys_id=${wfa.dataPill(params.trigger.current.assignment_group, 'reference')}`,
            sort_type: 'sort_asc',
            if_multiple_records_are_found_action: 'use_first_record',
          }
        )

        wfa.action(
          action.core.sendNotification,
          { $id: Now.ID['send_urgent_email_to_manager'] },
          {
            table_name: 'incident',
            record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
            notification: 'high_severity_incident_manager_notification',
          }
        )

        wfa.action(
          action.core.updateRecord,
          { $id: Now.ID['update_work_notes_high'] },
          {
            table_name: 'incident',
            record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
            values: TemplateValue({
              work_notes: `Alert sent to manager ${wfa.dataPill(assignmentGroup.Record.name, 'string')}`,
            }),
          }
        )
      }
    )

    wfa.flowLogic.elseIf(
      {
        $id: Now.ID['check_severity_medium'],
        condition: `${wfa.dataPill(params.trigger.current.severity, 'string')}=2`,
        annotation: 'Medium severity (2)',
      },
      () => {
        wfa.action(
          action.core.log,
          { $id: Now.ID['log_medium_severity'] },
          {
            log_level: 'info',
            log_message: `Medium severity incident: ${wfa.dataPill(params.trigger.current.number, 'string')}`,
          }
        )
      }
    )

    wfa.action(
      action.core.updateRecord,
      { $id: Now.ID['update_incident_to_in_progress'] },
      {
        table_name: 'incident',
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        values: TemplateValue({ state: '2' }),
      }
    )
  }
)
```

### Example 2: Change Request Approval Notification Flow

This flow runs when a change request is approved and notifies the requester:

```ts
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const changeRequestApprovalNotificationFlow = Flow(
  {
    $id: Now.ID['change_request_approval_notification_flow'],
    name: 'Change Request Approval Notification Flow',
    description: 'Sends formatted notification to requester when change request is approved',
  },
  wfa.trigger(
    trigger.record.updated,
    { $id: Now.ID['change_request_approved_trigger'] },
    {
      table: 'change_request',
      condition: 'approval=approved',
      run_flow_in: 'background',
      trigger_strategy: 'unique_changes',
      run_when_user_list: [],
      run_when_setting: 'both',
      run_on_extended: 'false',
      run_when_user_setting: 'any',
    }
  ),
  (params) => {
    const requester = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID['lookup_requester_details'] },
      {
        table: 'sys_user',
        conditions: `sys_id=${wfa.dataPill(params.trigger.current.requested_by, 'reference')}`,
        sort_type: 'sort_asc',
        if_multiple_records_are_found_action: 'use_first_record',
      }
    )

    wfa.action(
      action.core.sendEmail,
      { $id: Now.ID['send_approval_notification_email'] },
      {
        table_name: 'change_request',
        watermark_email: true,
        ah_subject: `Change Request ${wfa.dataPill(params.trigger.current.number, 'string')} - Approved`,
        ah_body: `Your change request has been approved.`,
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        ah_to: wfa.dataPill(requester.Record.email, 'string'),
      }
    )

    wfa.action(
      action.core.updateRecord,
      { $id: Now.ID['update_work_notes_notification_sent'] },
      {
        table_name: 'change_request',
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        values: TemplateValue({
          work_notes: `Approval notification sent to ${wfa.dataPill(requester.Record.name, 'string')}`,
        }),
      }
    )
  }
)
```

### Example 3: Change Risk Tagging Flow

This flow runs when a change request is created or updated with high impact, tags it as high-risk, and notifies the CAB:

```ts
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const changeRiskTaggingFlow = Flow(
  {
    $id: Now.ID['change_risk_tagging_flow'],
    name: 'Change Risk Tagging Flow',
    description: 'Tags change requests with high-risk label when created or updated with high impact',
  },
  wfa.trigger(
    trigger.record.createdOrUpdated,
    { $id: Now.ID['change_risk_trigger'] },
    {
      table: 'change_request',
      condition: 'active=true^impact=1',
      run_flow_in: 'background',
      run_on_extended: 'false',
      run_when_setting: 'both',
      run_when_user_setting: 'any',
      run_when_user_list: [],
    }
  ),
  (params) => {
    wfa.action(
      action.core.updateRecord,
      { $id: Now.ID['tag_high_risk'] },
      {
        table_name: 'change_request',
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        values: TemplateValue({
          risk: 'high',
          work_notes: 'Automatically tagged as high-risk due to high impact.',
        }),
      }
    )

    const cab = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID['lookup_cab_group'] },
      {
        table: 'sys_user_group',
        conditions: 'name=CAB^active=true',
        sort_type: 'sort_asc',
        if_multiple_records_are_found_action: 'use_first_record',
      }
    )

    wfa.action(
      action.core.sendNotification,
      { $id: Now.ID['notify_cab_high_risk'] },
      {
        table_name: 'change_request',
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        notification: 'high_risk_change_cab_notification',
      }
    )

    wfa.action(
      action.core.log,
      { $id: Now.ID['log_risk_tagged'] },
      {
        log_level: 'warn',
        log_message: `Change ${wfa.dataPill(params.trigger.current.number, 'string')} tagged as high-risk. CAB group notified.`,
      }
    )
  }
)
```

---

## Best Practices

- **Always export** `Flow` and `Subflow` constants — they can be referenced by `CatalogItem.flow` or other metadata
- **Use `runAs: 'system'`** for fulfillment flows that need elevated privileges
- **Set `flowPriority`** for time-sensitive (`'HIGH'`) or batch work (`'LOW'`)
- **Prefer `trigger_strategy: 'unique_changes'`** on `record.updated` triggers to avoid redundant execution
- **Use `Subflow`** to extract reusable logic callable from multiple Flows
- **`assignSubflowOutputs` requirement** — must be called before the subflow body ends if outputs are declared
- **Always use unique `$id` values** — for every trigger, action, and flowLogic call
- **Log at flow start** — use `action.core.log` to aid debugging
- **Wrap field values in `TemplateValue`** — for record updates and creates
- **Use data pills correctly** — match the data type to the field's actual type (`'string'`, `'reference'`, `'integer'`, etc.)
- **Test with background execution** — set `run_flow_in: 'background'` and monitor for errors