---
name: servicenow-server-date-time
user-invocable: false
description: Perform date arithmetic, time calculations, timezone conversions, and schedule management using server-side APIs. Covers GlideDateTime, GlideDate, GlideDuration, GlideSchedule, and related scheduling operations. Trigger this skill whenever you need to add or subtract time from dates, compare date ranges, calculate durations, work with business calendars, format dates for display or storage, query scheduled jobs, calculate SLA time windows, handle relative time expressions, or implement any time-based business logic — even for simple date comparisons or timestamp formatting.
---

# Server Date & Time

## Quick start

**GlideDateTime** (core API):

```javascript
// Current time
var now = new GlideDateTime();
gs.info(now.getDisplayValue()); // 2026-02-06 14:30:45

// Add/subtract time
var future = new GlideDateTime();
future.addDays(7);
future.addHours(2);

// Compare dates
var start = new GlideDateTime('2026-02-01');
var end = new GlideDateTime('2026-02-28');
var diff = GlideDateTime.getDifference(start, end);
gs.info(diff.getDisplayValue()); // Shows duration
```

**GlideDate** (date only, no time):

```javascript
var today = new GlideDate();
gs.info(today.getDisplayValue()); // 2026-02-06

var nextMonth = new GlideDate('2026-03-06');
```

**GlideDuration** (time spans):

```javascript
var duration = new GlideDuration('PT8H30M'); // 8 hours 30 minutes
gs.info(duration.getDisplayValue()); // 08:30:00
```

**Schedule operations**:

```javascript
var schedule = new GlideSchedule('9-to-5', 'UTC');
var isAvailable = schedule.isInSchedule(new GlideDateTime());

// Add schedule segments
schedule.add(new GlideDateTime('2026-02-06 09:00:00'), 
             new GlideDateTime('2026-02-06 17:00:00'));
```

**Recurring schedules**:

```javascript
var recurring = new GlideMultiRecurrence();
// Configure based on sys_trigger table fields
// Returns array of GlideDateTime objects for next occurrences
```

## Utilities

**DateTimeUtils** (script include):

```javascript
// Various utility functions
var utils = new DateTimeUtils();
var nextWeek = utils.addDays(now, 7);
```

**DurationCalculator** (script include):

```javascript
var calc = new DurationCalculator();
var dueDate = calc.calculateDueDate(startDate, duration);
```

## Best practices

| Practice | Why it matters |
|----------|----------------|
| Use GlideDateTime, not JavaScript `Date` | JS Date ignores instance timezone settings and DST; GlideDateTime handles both automatically |
| Store dates in UTC; format for display only | Prevents timezone-shifted data when records move between instances or exports |
| Use GlideSchedule for business hours | Ensures SLA calculations respect holidays and working hours defined on the instance |
| Use GlideDuration for time spans | Enables arithmetic with ServiceNow duration fields directly |
| Test calculations across timezones | DST transitions can shift results by an hour; verify with users in different regions |
| Match granularity to the use case (Date vs DateTime vs Time) | Storing time in a Date-only field silently discards the time component |

## Key APIs

| API | Purpose |
|-----|---------|
| GlideDateTime | Date and time with timezone support |
| GlideDate | Date only, no time component |
| GlideDuration | Time spans and durations |
| GlideTime | Time only, no date |
| GlideSchedule | Business hour calculations |
| GlideMultiRecurrence | Recurring schedule occurrences |

## Reference

For working code examples covering date arithmetic, duration calculations, schedule queries, and timezone formatting, see [EXAMPLES.md](./EXAMPLES.md)

For timezone handling, DST considerations, and advanced patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
