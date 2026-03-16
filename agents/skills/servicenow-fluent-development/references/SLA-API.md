# Service Level Agreement (SLA) API

The Service Level Agreement API defines service level agreements [contract_sla] that set the amount of time for a task to reach a specified condition, ensuring that tasks are resolved according to the service levels agreed between a service provider and customer.

For general information about SLAs, see Service Level Management.

## Sla Object

Creates a `contract_sla` record that controls the timing, conditions, workflows, and other information required to create and progress task SLAs.

## Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `name` | String | **Required.** A name for the SLA definition. |
| `table` | String | The name of the table to which the SLA applies. Default: `incident` |
| `type` | String | The type of service level agreement. The type is used for reporting purposes only. Valid values: `'SLA'` (service level agreement between service provider and external customer), `'OLA'` (operational level agreement between internal teams), `'Underpinning contract'` (contract with external vendor). Default: `'SLA'` |
| `active` | Boolean | Flag that indicates whether the SLA definition is active and can be matched against task records. Default: `true` |
| `target` | String | The stage of the task that the SLA measures. The target is used for filtering, searching, and reporting purposes only. Valid values: `'response'` (time to first respond), `'resolution'` (time to resolve). |
| `duration` | Object | The time duration within which the task must reach the target condition. Use the `Duration()` function to specify the duration. Format: `duration: Duration({ days: Number, hours: Number, minutes: Number, seconds: Number })`. **Required if `durationType` is empty.** |
| `durationType` | Reference or String | The sys_id of a relative duration [cmn_relative_duration], such as Breach on Due Date or End of next business day, to use instead of a user-specified duration. To define a relative duration, use the Record API - ServiceNow Fluent. |
| `relativeDurationWorksOn` | String | The record type from which the relative duration is calculated. Valid values: `'Task record'` (calculated from task record), `'SLA record'` (calculated from SLA record). Default: `'Task record'`. **Only applies if `durationType` is set.** |
| `schedule` | Reference or String | The sys_id of a schedule [cmn_schedule] for the time periods during which the SLAs accumulate business time. To define a schedule, use the Record API - ServiceNow Fluent. **Required if `scheduleSource` is `'sla_definition'`.** |
| `scheduleSource` | String | The source from which the schedule is obtained. Valid values: `'sla_definition'` (schedule specified in SLA definition), `'task_field'` (schedule from field on task record), `'no_schedule'` (no schedule, runs 24x7). Default: `'sla_definition'` |
| `scheduleSourceField` | String | The field from the task that provides the schedule. **Required if `scheduleSource` is `'task_field'`.** |
| `conditions` | Object | Encoded query conditions that control the timing of an SLA. Example: `'priority=1^state!=6'` matches tasks with priority 1 that aren't in closed state. For more information about SLA conditions, see Create an SLA definition. For information about filter queries, see Operators available for filters and queries. Format: `conditions: { start: 'String', stop: 'String', pause: 'String', resume: 'String', reset: 'String', cancel: 'String' }` |
| `advancedConditionType` | String | The type of advanced condition logic to apply. Valid values: `'none'` (no advanced logic), `'advanced'` (custom advanced condition script), `'advanced_journal'` (journal entries logic), `'advanced_system'` (system events logic), `'advanced_journal_and_system'` (both journal and system logic). Default: `'none'` |
| `conditionType` | String | The sys_id of an SLA condition [sla_condition_class] that determines when transitions between different stages of each task SLA. |
| `resetAction` | String | The action to take on the current task SLA record when the reset condition is met. Valid values: `'cancel'` (cancel current and create new), `'complete'` (mark complete and create new). Default: `'cancel'` |
| `whenTo` | Object | Settings that control when a paused SLA resumes and when an SLA cancels. Format: `whenTo: { resume: 'String', cancel: 'String' }`. See whenTo properties below. |
| `retroactive` | Object | Settings that control whether the SLA start time is set to a point in the past based on a specified field value. Format: `retroactive: { start: Boolean, setStartTo: 'String', pause: Boolean }`. See retroactive properties below. |
| `timezoneSource` | String | The source from which the time zone for SLA calculations is obtained. Valid values: `'task.caller_id.time_zone'`, `'task.caller_id.location.time_zone'`, `'task.cmdb_ci.location.time_zone'`, `'task.location.time_zone'`, `'sla.timezone'`. Default: `'task.caller_id.time_zone'` |
| `timezone` | String | The time zone to use for SLA calculations, such as `US/Pacific`. **Required if `timezoneSource` is `'sla.timezone'`.** |
| `overrides` | Reference or String | The variable identifier or sys_id of another SLA definition [contract_sla] that this SLA definition overrides. |
| `workflow` | Reference or String | The variable identifier or sys_id of a workflow [wf_workflow] to run when the SLA reaches a milestone or breaches. To define a workflow, use the Record API - ServiceNow Fluent. |
| `flow` | Reference or String | The variable identifier or sys_id of a flow [sys_hub_flow] to run when the SLA reaches a milestone or breaches. To define a flow, use the Flow API - ServiceNow Fluent. Default: Default SLA flow (828f267973333300e289235f04f6a7a3) |
| `vendor` | Reference or String | The variable identifier or sys_id of a company [core_company] that is the vendor for an underpinning contract SLA. To define a company, use the Record API - ServiceNow Fluent. |
| `domainPath` | String | The domain path that determines which domain owns the SLA in a multi-domain environment. Default: The global domain (`/`) |
| `enableLogging` | Boolean | Flag that indicates whether debug logging is enabled for the SLA definition. Default: `false` |
| `$meta` | Object | Metadata for the application metadata. With the `installMethod` property, you can map the application metadata to an output directory that loads only in specific circumstances. Valid values for `installMethod`: `'demo'` (installs with app when demo data loaded), `'first install'` (installs only on first install). |

## whenTo Properties

Controls when a paused SLA resumes and when an SLA cancels.

| Property | Type | Description |
|----------|------|-------------|
| `resume` | String | The behavior that controls when a paused SLA resumes timing. Valid values: `'on_condition'` (resumes when task matches resume condition), `'no_match'` (resumes when task no longer matches pause condition). Default: `'on_condition'` |
| `cancel` | String | The behavior that controls when an active SLA is canceled. Valid values: `'on_condition'` (canceled when task matches cancel condition), `'no_match'` (canceled when task no longer matches start condition), `'never'` (never canceled). Default: `'on_condition'` |

## retroactive Properties

Controls whether the SLA start time is set to a point in the past based on a specified field value.

| Property | Type | Description |
|----------|------|-------------|
| `start` | Boolean | Flag that indicates whether retroactive start is enabled. When enabled, the SLA start time is set to the value of the field specified in `setStartTo` rather than the time when the start condition was first met. Default: `false` |
| `setStartTo` | String | The field on the task record whose value is used as the SLA start time when retroactive start is enabled. **Required if `start` is `true`.** |
| `pause` | Boolean | Flag that indicates whether retroactive pause is enabled when retroactive start is active. When enabled, any time that the task was in a paused state before the SLA was attached is subtracted from the elapsed time. Default: `true` |

## conditions Object

Encoded query conditions that control the timing of an SLA.

| Condition | Type | Description |
|-----------|------|-------------|
| `start` | String | Condition that triggers the SLA to begin |
| `stop` | String | Condition that completes the SLA when met |
| `pause` | String | Condition that pauses the SLA timer (optional) |
| `resume` | String | Condition that resumes a paused SLA (optional) |
| `reset` | String | Condition that resets the SLA (optional) |
| `cancel` | String | Condition that cancels the SLA (optional) |

Each condition is an encoded query string, following the same operators available for filters and queries. Example: `'priority=1^state!=6'`

## Basic Example

```ts
import { Sla, Duration } from '@servicenow/sdk/core'

Sla({
    $id: Now.ID['incident-p1-resolution'],
    name: 'P1 Incident Resolution',
    table: 'incident',
    target: 'resolution',
    duration: Duration({ hours: 4 }),
    schedule: 'b1992362eb601100fcfb858ad106fe16',
    conditions: {
        start: 'priority=1',
        stop: 'state=6',
        pause: 'state=3',
        resume: 'state!=3',
    },
    whenTo: {
        resume: 'on_condition',
    },
    resetAction: 'cancel',
})
```

## Example: Multi-condition SLA with Custom Behavior

```ts
import { Sla, Duration, Record } from '@servicenow/sdk/core'

// Define a business hour schedule
const businessSchedule = Record({
  $id: Now.ID['standard_schedule'],
  table: 'cmn_schedule',
  data: {
    name: 'Standard Business Hours',
    timezone: 'US/Central',
    // Add additional schedule configuration as needed
  }
})

Sla({
    $id: Now.ID['change-request-approval'],
    name: 'Change Request Approval SLA',
    table: 'change_request',
    type: 'OLA',
    target: 'response',
    duration: Duration({ days: 1, hours: 0 }),
    schedule: businessSchedule,
    scheduleSource: 'sla_definition',

    conditions: {
        start: 'type=standard',
        stop: 'approval!=pending',
        pause: 'on_hold=true',
        resume: 'on_hold=false',
        reset: 'state=draft',
        cancel: 'state=cancelled'
    },

    whenTo: {
        resume: 'on_condition',
        cancel: 'on_condition'
    },

    resetAction: 'cancel',
    timezoneSource: 'sla.timezone',
    timezone: 'US/Central',
    active: true,
    enableLogging: false
})
```

## Example: SLA with Retroactive Timing

```ts
import { Sla, Duration } from '@servicenow/sdk/core'

Sla({
    $id: Now.ID['incident-retroactive-sla'],
    name: 'Incident Resolution with Retroactive Start',
    table: 'incident',
    target: 'resolution',
    duration: Duration({ days: 3 }),
    schedule: 'business_schedule_sys_id',
    scheduleSource: 'sla_definition',

    conditions: {
        start: 'priority=1^ORpriority=2',
        stop: 'state=6',
        pause: 'state=3',
        resume: 'state!=3'
    },

    retroactive: {
        start: true,
        setStartTo: 'opened_at',
        pause: true
    },

    active: true
})
```

## Example: SLA with Task Field Schedule

```ts
import { Sla, Duration } from '@servicenow/sdk/core'

Sla({
    $id: Now.ID['task-variable-schedule'],
    name: 'Task with Variable Schedule',
    table: 'task',
    target: 'resolution',
    duration: Duration({ hours: 8 }),

    scheduleSource: 'task_field',
    scheduleSourceField: 'assignment_group.schedule',

    conditions: {
        start: 'state=new',
        stop: 'state=closed'
    },

    timezoneSource: 'task.location.time_zone',
    active: true
})
```

## Key Guidelines & Best Practices

### Schedule Configuration
- **`sla_definition`** — Use when all tasks use the same schedule (e.g., standard business hours)
- **`task_field`** — Use when different tasks have different schedules based on a field value (e.g., assignment group has its own schedule)
- **`no_schedule`** — Use for 24/7 SLAs that don't follow business hours

### Time Zone Handling
- Default (`task.caller_id.time_zone`) — Respects the caller's personal time zone setting
- Use `'sla.timezone'` when all tasks should use the same time zone regardless of caller
- Location-based options useful for distributed teams across multiple locations

### Conditions
- **`start`** — Define when the SLA begins tracking. Required.
- **`stop`** — Define when the SLA completes. Required.
- **`pause` / `resume`** — Optional. Use to temporarily suspend SLA timing when task is in certain states
- **`reset`** — Optional. Triggers a new SLA instance when condition met
- **`cancel`** — Optional. Ends the SLA without marking it complete

### Duration vs. Relative Duration
- Use **`Duration()`** for fixed time periods (e.g., 4 hours, 2 days)
- Use **`durationType`** for relative durations that depend on business calendars or other factors
- Cannot use both simultaneously — choose one approach

### Retroactive Timing
- Enable `retroactive.start: true` to set SLA start time to a past field value (e.g., when task was actually created)
- Use `setStartTo` to specify which field contains the retroactive time
- `retroactive.pause: true` (default) automatically subtracts time the task spent paused before SLA was attached

### Logging and Debugging
- Set `enableLogging: true` to capture debug logs for troubleshooting SLA matching and timing issues
- Use advanced condition types (`advanced`, `advanced_journal`, `advanced_system`) for complex SLA logic beyond simple encoded queries

### Overrides and Precedence
- Use `overrides` to specify that this SLA supersedes another SLA definition
- When multiple SLAs match a task, the one with highest precedence (specified by `overrides`) is used

### Performance Considerations
- Simple encoded query conditions are preferred over advanced scripts for better performance
- Use `filterCondition` patterns for efficient database-level matching
- Avoid overly complex condition logic — test SLA matching with representative data

## Related Concepts

- **Service Level Management** — Overall SLA strategy and configuration
- **ServiceNow Fluent** — Language constructs for metadata definition
- **Flow API** — Creating automation flows triggered on SLA milestones or breaches
- **Record API** — Defining supporting records like schedules and companies

## Import

```ts
import { Sla, Duration } from '@servicenow/sdk/core'
```
