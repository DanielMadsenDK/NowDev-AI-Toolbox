# Server Date/Time - Code Examples

Examples for date arithmetic, time calculations, timezone handling, and schedule management.

## Table of Contents

1. [Date/Time Creation and Formatting](#datetime-creation-and-formatting)
2. [Date Arithmetic](#date-arithmetic)
3. [Timezone Handling](#timezone-handling)
4. [Duration Calculations](#duration-calculations)
5. [Schedule and Business Hours](#schedule-and-business-hours)
6. [Time-Based Logic](#time-based-logic)

---

## Date/Time Creation and Formatting

### Create GlideDateTime

```javascript
// Create from current time
var now = new GlideDateTime();

// Create from ISO string
var specificDate = new GlideDateTime('2026-03-15 14:30:00');

// Create from database value
var dbValue = '2026-03-15 10:00:00.000';
var dt = new GlideDateTime(dbValue);

// Get current time in different formats
var currentTime = new GlideDateTime();
gs.info('Current: ' + currentTime.toString()); // 2026-03-15 14:30:00
gs.info('Display: ' + currentTime.getDisplayValue()); // 03/15/2026 2:30 PM
gs.info('Numeric: ' + currentTime.getNumericValue()); // Milliseconds since epoch
```

### Format Dates

```javascript
var dt = new GlideDateTime('2026-03-15 14:30:00');

// Standard formats
gs.info(dt.format('yyyy-MM-dd')); // 2026-03-15
gs.info(dt.format('MM/dd/yyyy')); // 03/15/2026
gs.info(dt.format('dd-MMM-yyyy')); // 15-Mar-2026
gs.info(dt.format('EEEE, MMMM d, yyyy')); // Sunday, March 15, 2026
gs.info(dt.format('yyyy-MM-dd HH:mm:ss')); // 2026-03-15 14:30:00
gs.info(dt.format('hh:mm a')); // 02:30 PM

// Get components
gs.info('Year: ' + dt.getYearNoTZ()); // 2026
gs.info('Month: ' + dt.getMonthNoTZ()); // 3
gs.info('Day: ' + dt.getDayOfMonthNoTZ()); // 15
gs.info('Hour: ' + dt.getHourNoTZ()); // 14
gs.info('Minute: ' + dt.getMinutesNoTZ()); // 30
```

### Work with GlideDate (Date Only, No Time)

```javascript
// Create GlideDate
var date = new GlideDate('2026-03-15');

// Format date
gs.info(date.toString()); // 2026-03-15
gs.info(date.getDisplayValue()); // 03/15/2026

// Get date from GlideDateTime
var dt = new GlideDateTime('2026-03-15 14:30:00');
var dateOnly = new GlideDate(dt.toString());
gs.info(dateOnly.toString()); // 2026-03-15

// Comparison
var date1 = new GlideDate('2026-03-15');
var date2 = new GlideDate('2026-03-20');
gs.info('date1 < date2: ' + (date1.getValue() < date2.getValue())); // true
```

---

## Date Arithmetic

### Add/Subtract Time

```javascript
var start = new GlideDateTime('2026-03-15 09:00:00');

// Add time
var plus1Hour = new GlideDateTime(start);
plus1Hour.addSeconds(3600); // Add 1 hour (3600 seconds)

var plus1Day = new GlideDateTime(start);
plus1Day.addDays(1); // Add 1 day

var plus1Month = new GlideDateTime(start);
plus1Month.addMonths(1); // Add 1 month

var plus1Year = new GlideDateTime(start);
plus1Year.addYears(1); // Add 1 year

// Subtract time
var minus2Hours = new GlideDateTime(start);
minus2Hours.addSeconds(-7200); // Subtract 2 hours

// Calculate future dates
var deadline = new GlideDateTime();
deadline.addDays(5);
gs.info('Deadline: ' + deadline.toString());
```

### Calculate Time Differences

```javascript
function calculateDifference() {
    var start = new GlideDateTime('2026-03-01 09:00:00');
    var end = new GlideDateTime('2026-03-15 17:00:00');

    var diffMs = end.getNumericValue() - start.getNumericValue();

    // Convert to different units
    var diffSeconds = Math.floor(diffMs / 1000);
    var diffMinutes = Math.floor(diffMs / (1000 * 60));
    var diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
        days: diffDays,
        hours: diffHours,
        minutes: diffMinutes,
        seconds: diffSeconds
    };
}

// Usage
var diff = calculateDifference();
gs.info('Difference: ' + diff.days + ' days, ' + (diff.hours % 24) + ' hours');
```

### Get Start/End of Period

```javascript
var now = new GlideDateTime();

// Start of day
var startOfDay = new GlideDateTime(now);
startOfDay.setTime(0, 0, 0, 0); // Set to 00:00:00

// End of day
var endOfDay = new GlideDateTime(now);
endOfDay.setTime(23, 59, 59, 999); // Set to 23:59:59

// Start of week (Monday)
var startOfWeek = new GlideDateTime(now);
var dayOfWeek = startOfWeek.getDayOfWeekNoTZ(); // 1=Sunday, 2=Monday, etc
var daysToSubtract = dayOfWeek === 1 ? 6 : dayOfWeek - 2; // Get to Monday
startOfWeek.addDays(-daysToSubtract);
startOfWeek.setTime(0, 0, 0, 0);

// Start of month
var startOfMonth = new GlideDateTime(now);
startOfMonth.setDayOfMonth(1);
startOfMonth.setTime(0, 0, 0, 0);

// Start of year
var startOfYear = new GlideDateTime(now);
startOfYear.setMonth(0);
startOfYear.setDayOfMonth(1);
startOfYear.setTime(0, 0, 0, 0);
```

---

## Timezone Handling

### Work with Timezones

```javascript
// Get current timezone
var tzId = gs.getTimeZoneID();
gs.info('Current timezone: ' + tzId); // e.g., "America/New_York"

// Get user's timezone
var user = gs.getUser();
var userTz = user.getTimeZoneID();
gs.info('User timezone: ' + userTz);

// Create GlideDateTime in specific timezone
var dt = new GlideDateTime('2026-03-15 14:30:00');
gs.info('UTC: ' + dt.getDisplayValueUTC()); // Show in UTC
gs.info('Local: ' + dt.getDisplayValue()); // Show in system timezone

// Convert between timezones
function convertToUserTimezone(glideDateTime) {
    var user = gs.getUser();
    var userTz = user.getTimeZoneID();

    // GlideDateTime handles timezone conversion automatically
    var displayValue = glideDateTime.getDisplayValue();
    return displayValue;
}
```

### Timezone Offset Calculations

```javascript
function getTimezoneOffset(tzId) {
    // Get offset in milliseconds
    var gdt = new GlideDateTime();
    var tzName = 'java.util.TimeZone.getTimeZone("' + tzId + '")';

    // Simplified: Just show how to work with times across timezones
    var nyTime = new GlideDateTime('2026-03-15 14:30:00');
    var londonTime = new GlideDateTime('2026-03-15 18:30:00'); // 4 hours ahead

    return {
        ny: nyTime.toString(),
        london: londonTime.toString(),
        difference: '4 hours'
    };
}
```

---

## Duration Calculations

### Create and Use GlideDuration

```javascript
// Create duration from seconds
var duration = new GlideDuration(3600); // 1 hour in seconds

gs.info('Seconds: ' + duration.getNumericValue()); // 3600
gs.info('Display: ' + duration.getDisplayValue()); // 1:00:00
gs.info('Readable: ' + duration.toString()); // 1:00:00

// Create from string
var duration2 = new GlideDuration('2:30:45'); // 2 hours, 30 minutes, 45 seconds
gs.info('Total seconds: ' + duration2.getNumericValue());
```

### Calculate Business Hours

```javascript
function calculateBusinessHours(startTime, endTime) {
    var start = new GlideDateTime(startTime);
    var end = new GlideDateTime(endTime);

    var businessHours = 0;
    var currentTime = new GlideDateTime(start);

    // Simple calculation: 8 hours per weekday
    while (currentTime.getNumericValue() < end.getNumericValue()) {
        var dayOfWeek = currentTime.getDayOfWeekNoTZ();

        // 1 = Sunday, 7 = Saturday (not business hours)
        if (dayOfWeek !== 1 && dayOfWeek !== 7) {
            var hour = currentTime.getHourNoTZ();
            // Count only 9-17 (business hours)
            if (hour >= 9 && hour < 17) {
                businessHours += 1;
            }
        }

        currentTime.addSeconds(3600); // Add 1 hour
    }

    return businessHours;
}

// Usage
var hours = calculateBusinessHours('2026-03-16 08:00:00', '2026-03-20 18:00:00');
gs.info('Business hours: ' + hours);
```

### SLA and Response Time Calculations

```javascript
function calculateSLADeadline(createdTime, slaHours) {
    var created = new GlideDateTime(createdTime);
    var deadline = new GlideDateTime(created);

    var hoursAdded = 0;
    while (hoursAdded < slaHours) {
        deadline.addSeconds(3600); // Add 1 hour

        var dayOfWeek = deadline.getDayOfWeekNoTZ();
        var hour = deadline.getHourNoTZ();

        // Only count business hours (Mon-Fri, 9-17)
        if (dayOfWeek >= 2 && dayOfWeek <= 6 && hour >= 9 && hour < 17) {
            hoursAdded++;
        }
    }

    return deadline.toString();
}

// Usage
var slaDeadline = calculateSLADeadline('2026-03-16 10:00:00', 4);
gs.info('SLA Deadline: ' + slaDeadline); // Friday 14:00:00 or Monday 10:00:00
```

---

## Time-Based Logic

### Time Window Checks

```javascript
function isWithinBusinessHours(dateTime) {
    var dt = new GlideDateTime(dateTime);
    var dayOfWeek = dt.getDayOfWeekNoTZ(); // 1=Sun, 7=Sat
    var hour = dt.getHourNoTZ();

    var isWeekday = dayOfWeek >= 2 && dayOfWeek <= 6;
    var isBusinessHour = hour >= 9 && hour < 17;

    return isWeekday && isBusinessHour;
}

function isWithinMaintenanceWindow(dateTime) {
    var dt = new GlideDateTime(dateTime);
    var dayOfWeek = dt.getDayOfWeekNoTZ();
    var hour = dt.getHourNoTZ();

    // Maintenance: Sundays 2-4 AM
    return dayOfWeek === 1 && hour >= 2 && hour < 4;
}

function isUrgentPeriod(dateTime) {
    var dt = new GlideDateTime(dateTime);
    var hour = dt.getHourNoTZ();
    var dayOfWeek = dt.getDayOfWeekNoTZ();

    // Peak hours: Mon-Fri 9-5, or any time on weekends
    if (dayOfWeek >= 2 && dayOfWeek <= 6) {
        return hour >= 9 && hour < 17;
    } else {
        return true; // Weekend = always urgent
    }
}

// Usage
var now = new GlideDateTime();
gs.info('Business hours: ' + isWithinBusinessHours(now));
gs.info('Maintenance window: ' + isWithinMaintenanceWindow(now));
gs.info('Urgent: ' + isUrgentPeriod(now));
```

### Schedule Calculations

```javascript
function getNextBusinessDay(fromDate) {
    var next = new GlideDateTime(fromDate);
    next.addDays(1);

    while (true) {
        var dayOfWeek = next.getDayOfWeekNoTZ();
        if (dayOfWeek >= 2 && dayOfWeek <= 6) {
            // Monday through Friday
            return next;
        }
        next.addDays(1);
    }
}

function getNextHour(fromDate) {
    var next = new GlideDateTime(fromDate);
    next.addSeconds(3600); // Add 1 hour
    next.setMinutesNoTZ(0);
    next.setSecondsNoTZ(0);
    return next;
}

function getWorkingDaysBetween(startDate, endDate) {
    var count = 0;
    var current = new GlideDateTime(startDate);
    var end = new GlideDateTime(endDate);

    while (current.getNumericValue() <= end.getNumericValue()) {
        var dayOfWeek = current.getDayOfWeekNoTZ();
        if (dayOfWeek >= 2 && dayOfWeek <= 6) {
            count++;
        }
        current.addDays(1);
    }

    return count;
}
```

---

## Best Practices

✓ **Use GlideDateTime for timestamps** - includes timezone handling
✓ **Use GlideDate for date-only values** - no time component
✓ **Always consider timezones** - users may be in different zones
✓ **Use getNumericValue()** for calculations - returns milliseconds
✓ **Format dates for display** - use format() method with appropriate pattern
✓ **Handle daylight saving time** - GlideDateTime handles this automatically
✓ **Calculate business hours** - account for weekends and non-business hours
✓ **Store in UTC** - database stores UTC, convert for display

---

## Common Patterns

| Task | Method |
|------|--------|
| Get current time | new GlideDateTime() |
| Add time | dt.addSeconds(), addDays(), etc |
| Calculate difference | end.getNumericValue() - start.getNumericValue() |
| Format for display | dt.format('pattern') |
| Get component | dt.getHourNoTZ(), getMonthNoTZ(), etc |
| Business hours logic | Check getDayOfWeekNoTZ() and getHourNoTZ() |
| SLA deadline | Add business hours, skip weekends |

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for advanced scheduling and timezone patterns.
