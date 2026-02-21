---
name: servicenow-server-date-time
user-invokable: false
description: Perform date arithmetic, time calculations, and schedule management using server-side APIs. Covers GlideDateTime, GlideDate, GlideDuration, and scheduling operations. Use when handling date calculations, working with timezones, managing scheduled tasks, or implementing time-based business logic.
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

- Always use GlideDateTime for timezone-safe operations
- Avoid JavaScript Date objects for ServiceNow data
- Use GlideSchedule for business hours calculations
- Store dates in UTC internally; format for display only
- Use GlideDuration for time spans and calculations
- Test date calculations with different timezones
- Remember: GlideDateTime automatically handles DST
- Use appropriate granularity (Date vs DateTime vs Time)
- Consider user timezone when displaying dates

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

For timezone handling, DST considerations, and advanced patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
