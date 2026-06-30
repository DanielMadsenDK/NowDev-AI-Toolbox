---
name: servicenow-server-date-time
context: fork
user-invocable: false
description: Perform date arithmetic, time calculations, timezone conversions, and schedule management using server-side APIs. Covers GlideDateTime, GlideDate, GlideDuration, GlideSchedule, and related scheduling operations. Trigger this skill whenever you need to add or subtract time from dates, compare date ranges, calculate durations, work with business calendars, format dates for display or storage, query scheduled jobs, calculate SLA time windows, handle relative time expressions, or implement any time-based business logic — even for simple date comparisons or timestamp formatting.
last_verified: "2026-05-18"
---

# Server Date & Time

Use for server-side date arithmetic, timezone conversions, duration calculations, business schedules, and SLA windows with ServiceNow date/time APIs.

## API Selection

| Need | Use | Guardrail |
|------|-----|-----------|
| Timestamp with timezone | `GlideDateTime` | Prefer over JavaScript `Date` |
| Date only | `GlideDate` | Do not store time-sensitive values in date-only fields |
| Time only | `GlideTime` | Use only when no date context is needed |
| Durations | `GlideDuration` | Match duration field semantics |
| Business hours / holidays | `GlideSchedule` | Load schedules from `cmn_schedule`; do not hardcode calendars |
| Recurrence | `GlideMultiRecurrence` / schedule APIs | Verify current API docs before implementation |

## Critical Guardrails

- Always prefer `GlideDateTime` over JavaScript `Date`; it integrates with platform timezone, locale, database, and DST handling.
- Store dates in UTC/internal values; format with display methods only for users.
- Use `GlideSchedule` for business-time/SLA calculations so holidays, work hours, and timezone rules are honored.
- Test calculations across DST boundaries and user timezones.
- Match field granularity: Date, DateTime, Time, or Duration.
- Cache `new GlideDateTime()` outside loops when comparing many records.
- Use `getNumericValue()` / documented difference methods for arithmetic; avoid raw string math.
- Validate input format before constructing date/time objects.
- Avoid hardcoded timezone assumptions; use user/session/system timezone intentionally.
- For scoped apps, prefer `new GlideDateTime().getDisplayValue()` over blocked `gs.nowDateTime()` patterns.

## Quick Patterns

```javascript
var now = new GlideDateTime();
var due = new GlideDateTime(now);
due.addDays(7);
```

```javascript
var start = new GlideDateTime('2026-02-01 09:00:00');
var end = new GlideDateTime('2026-02-02 17:00:00');
var diff = GlideDateTime.getDifference(start, end);
gs.info(diff.getDisplayValue());
```

```javascript
var schedule = new GlideSchedule();
schedule.load('schedule_sys_id');
schedule.setTimeZone(gs.getUser().getTimeZoneID());
var inSchedule = schedule.isInSchedule(new GlideDateTime());
```

## Key APIs

| API | Purpose |
|-----|---------|
| `GlideDateTime` | Date/time with timezone support |
| `GlideDate` | Date-only values |
| `GlideTime` | Time-only values |
| `GlideDuration` | Time spans and duration fields |
| `GlideSchedule` | Business hours and calendar-aware calculations |
| `GlideTimeZone` | Timezone offsets/metadata |
| `GlideLocale` | Locale formatting metadata |
| `GlideMultiRecurrence` | Recurring schedule occurrences |

## Reference

Classic GlideDateTime, GlideDate, GlideDuration, GlideSchedule, timezone, and scheduling APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
