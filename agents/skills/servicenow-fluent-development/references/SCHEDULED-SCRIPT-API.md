# Scheduled Script API

## Overview

`ScheduledScript` defines a server-side job that runs automatically on a repeating schedule (`sys_script_execution`). Use it to perform background maintenance, send periodic notifications, process batches of records, or run any timed server-side logic.

```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

export const dailyCleanup = ScheduledScript({
    $id: Now.ID['daily_cleanup_job'],
    name: 'Daily Record Cleanup',
    active: true,
    frequency: 'daily',
    executionTime: { hours: 2, minutes: 0, seconds: 0 },
    script: Now.include('./daily-cleanup.js'),
})
```

---

## Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | `Now.ID[...]` | Unique metadata identifier |

All other properties are optional (the job will still create a record), but a meaningful `name`, `frequency`, and `script` are practically required for any real job.

---

## Frequency Options

Set `frequency` to control how often the job runs:

| Value | When It Runs |
|-------|-------------|
| `'once'` | A single run at `executionStart` |
| `'daily'` | Every day at `executionTime` |
| `'weekly'` | On `daysOfWeek` at `executionTime` |
| `'monthly'` | On `dayOfMonth` at `executionTime` |
| `'periodically'` | Every `executionInterval` starting from `executionStart` |

---

## Scheduling Properties

### Time of Day

```typescript
executionTime: { hours: 9, minutes: 30, seconds: 0 }   // 09:30 AM
```

### Days of Week (weekly)

```typescript
frequency: 'weekly',
daysOfWeek: ['monday', 'wednesday', 'friday'],
```

Valid values: `'sunday'`, `'monday'`, `'tuesday'`, `'wednesday'`, `'thursday'`, `'friday'`, `'saturday'`

### Day of Month (monthly)

```typescript
frequency: 'monthly',
dayOfMonth: 1,     // 1–31; first day of month
```

### Interval (periodically)

```typescript
frequency: 'periodically',
executionInterval: { hours: 4, minutes: 0, seconds: 0 },
```

### Date Range

Limit when a job is active:

```typescript
executionStart: '2025-01-01 00:00:00',
executionEnd:   '2025-12-31 23:59:59',
```

Jobs with an `executionEnd` in the past are automatically marked inactive.

### Offset

Shift the run time relative to the scheduled time:

```typescript
offset: { hours: 0, minutes: 15, seconds: 0 },
offsetType: 'future',   // 'future' = run 15min after scheduled time, 'past' = before
```

---

## Conditional Execution

Gate a job on a condition script:

```typescript
conditional: true,
condition: `
var featureEnabled = gs.getProperty('myapp.batch_processing.enabled', 'false');
answer = featureEnabled === 'true';
`,
```

The `condition` script must set `answer` to `true` or `false`. The job only runs when `answer` is `true`.

---

## Script Content

Provide the job logic via `script`. Always prefer `Now.include` for anything beyond trivial scripts:

```typescript
script: Now.include('./jobs/daily-cleanup.js'),
```

The linked `.js` file runs as a ServiceNow server-side script — full GlideRecord, gs.* APIs available:

```javascript
// daily-cleanup.js
(function runDailyCleanup() {
    var gr = new GlideRecord('my_app_temp_log');
    var cutoff = new GlideDateTime();
    cutoff.addDaysLocalTime(-30);
    gr.addQuery('sys_created_on', '<', cutoff.getValue());
    gr.deleteMultiple();
    gs.info('Cleanup completed: removed log records older than 30 days');
})();
```

---

## Run As User

By default, the job runs as the system. Specify `runAs` to execute with a specific user's context and permissions:

```typescript
runAs: 'sys_id_or_username_of_service_account',
```

Always set `runAs` when the job performs security-sensitive operations or needs scoped access.

---

## Timezone

| Property | Description |
|----------|-------------|
| `timeZone` | Timezone for scheduling. Use `'floating'` (default) for the instance timezone |
| `userTimeZone` | Timezone context for GlideDateTime calculations inside the script |

For global instances serving multiple time zones, use `timeZone: 'UTC'` for consistency.

---

## Protection Policy

Prevent downstream modifications after installation:

| Value | Effect |
|-------|--------|
| `'read'` | Other developers can view the script but not change it |
| `'protected'` | Other developers cannot view or modify the script |
| *(omit)* | Other developers can customise the job freely |

---

## Full Example

```typescript
import { ScheduledScript } from '@servicenow/sdk/core'

export const weeklyReportJob = ScheduledScript({
    $id: Now.ID['weekly_report_job'],
    name: 'Weekly Status Report',
    active: true,
    frequency: 'weekly',
    daysOfWeek: ['monday'],
    executionTime: { hours: 7, minutes: 0, seconds: 0 },
    timeZone: 'America/New_York',
    runAs: 'sys_id_of_reporting_user',
    conditional: true,
    condition: `
var enabled = gs.getProperty('reporting.weekly.enabled', 'false');
answer = enabled === 'true';
    `,
    script: Now.include('./jobs/weekly-report.js'),
    upgradeSafe: true,
})
```

---

## Critical Rules

| Rule | Why |
|------|-----|
| Always set `runAs` for jobs that access secured data | Ensures correct permission context |
| Use `Now.include('./job.js')` for scripts longer than a few lines | Enables IDE support and two-way sync |
| Set `conditional: true` with a `condition` script for environment-gated jobs | Prevents accidental execution in non-production instances |
| Use `executionStart` / `executionEnd` for time-limited campaigns | Jobs with a past `executionEnd` auto-deactivate |
| Never use `current.update()` inside a scheduled job script | `current` is not available in scheduled script context |

---

## Build Placement

Scheduled scripts belong to the **Logic layer** of a Fluent project, alongside Business Rules and Script Includes:

```
src/
  fluent/
    logic/
      scheduled/
        weekly-report.now.ts       ← ScheduledScript definition
      jobs/
        weekly-report.js           ← Script content (Now.include target)
```
