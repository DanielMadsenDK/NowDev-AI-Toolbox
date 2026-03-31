# Best Practices — Server Date/Time

## GlideDateTime vs JavaScript Date

### Comparison Matrix
```
                        GlideDateTime           JavaScript Date
Timezone-aware          ✓ YES                   ✗ NO (UTC only)
Locale-aware            ✓ YES                   Limited
DST handling            ✓ Automatic             Manual
ServiceNow integration  ✓ Native                Requires conversion
Performance             ✓ Optimized             Lower
Arithmetic              ✓ Built-in methods      Manual calculation
Database interaction    ✓ Direct                Requires conversion

Recommendation: Always use GlideDateTime in ServiceNow scripts
```

### Correct Usage
```javascript
// ✓ CORRECT - GlideDateTime
var now = new GlideDateTime();
var later = new GlideDateTime('2024-12-31 23:59:59');

// Date arithmetic
now.addSeconds(60);
now.addDays(7);
now.addMonths(1);

// ✗ WRONG - JavaScript Date
var jsDate = new Date(); // Not timezone-aware!

// ✓ CORRECT IF NEEDED - Convert properly
var glidedt = new GlideDateTime();
var glideValue = glidedt.getValue(); // Returns timestamp
var jsDate = new Date(parseInt(glideValue));
```

## Timezone Handling

### Timezone Deep Dive
```javascript
// Get system timezone
var sysTimeZone = gs.getProperty('glide.sys.default_timezone', 'UTC');

// Get user timezone
var userTimeZone = gs.getUser().getTimeZoneID();

// Create datetime in specific timezone
var gdt = new GlideDateTime('2024-12-25 08:00:00');
gdt.setTZ(userTimeZone);

// Convert to display format
gs.info('Display time: ' + gdt.getDisplayValue()); // User timezone
gs.info('System time: ' + gdt.getValue());         // System timezone

// Get timezone offset
var tz = new GlideTimeZone(userTimeZone);
var offset = tz.getOffsetMinutes();
```

### DST (Daylight Saving Time) Considerations
```javascript
// DST transitions can affect date arithmetic
var spring = new GlideDateTime('2024-03-10 01:30:00'); // Just before spring forward
spring.addHours(2); // Handles DST change automatically

// When calculating business hours across DST boundary:
// Use GlideDateTime - it handles transitions
// Don't use raw millisecond arithmetic

var start = new GlideDateTime('2024-03-09');
var end = new GlideDateTime('2024-03-11');
var msPerDay = 24 * 60 * 60 * 1000;
// ✗ WRONG - ignores DST
var days = (end.getMilliseconds() - start.getMilliseconds()) / msPerDay;

// ✓ CORRECT - use getDaysUntil
var daysDiff = start.daysUntil(end);
```

## Date Formatting

### Format Strings
```javascript
var gdt = new GlideDateTime('2024-12-25 15:30:45');

// Common patterns
gs.info(gdt.getDisplayValue());           // 2024-12-25 15:30:45
gs.info(gdt.getDisplayValueInternal());   // System format
gs.info(gdt.toString());                  // Timestamp string

// Custom formatting
var formatter = {
    date: gdt.getDate().getDisplayValue(),      // 2024-12-25
    time: gdt.getTime().getDisplayValue(),      // 15:30:45
    dateOnly: gdt.getDate(),
    timeOnly: gdt.getTime()
};

// User locale formatting
var locale = GlideLocale.get();
var datePattern = locale.getDatePattern();
var timePattern = locale.getTimePattern();
```

## Business Hours & Schedules

### Business Hours Calculation
```javascript
// Create datetime for business hours calculation
var start = new GlideDateTime('2024-12-25 08:00:00');
var end = new GlideDateTime('2024-12-27 17:00:00');

// Get business hours between dates
var businessHours = GlideDateTime.getNumericValue(
    'businessHours',
    start.getValue(),
    end.getValue()
);
// Returns milliseconds of business time

// Convert to hours
var businessHoursCount = businessHours / (1000 * 60 * 60);
```

### Schedule Operations
```javascript
// Reference timezone-aware schedule
var schedule = new GlideSchedule();
schedule.setTimeZone('America/Denver');

// Check if time is in schedule
var gdt = new GlideDateTime('2024-12-25 14:30:00');
var isInSchedule = schedule.isInSchedule(gdt);

// Get next scheduled time
var nextScheduled = schedule.whenNext(gdt);

// Calculate duration in schedule
var start = new GlideDateTime('2024-12-25 08:00:00');
var end = new GlideDateTime('2024-12-25 17:00:00');
var scheduleTime = schedule.duration(start, end);
```

## Duration Calculations

### GlideDuration
```javascript
// Create duration
var duration = new GlideDuration('00:30:00'); // 30 minutes

// Get seconds
var seconds = duration.getSeconds();

// Arithmetic
var oneHour = new GlideDuration('01:00:00');
var combined = oneHour.add(duration);

// Compare
if (duration.getValue() > oneHour.getValue()) {
    gs.info('Duration is greater than 1 hour');
}

// Parse from milliseconds
var ms = 3600000; // 1 hour
var dur = new GlideDuration();
dur.setSeconds(Math.floor(ms / 1000));
```

## Comparisons and Conditionals

### Date Comparison
```javascript
var now = new GlideDateTime();
var future = new GlideDateTime('2025-12-31');

// ✓ CORRECT - compare as timestamps
if (now.getMilliseconds() < future.getMilliseconds()) {
    gs.info('Future is in the future');
}

// ✓ CORRECT - string comparison works too
if (now.getValue() < future.getValue()) {
    gs.info('Future is after now');
}

// Get difference
var diff = future.getMilliseconds() - now.getMilliseconds();
var diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
var diffHours = Math.floor(diff / (1000 * 60 * 60));
var diffMinutes = Math.floor(diff / (1000 * 60));
```

## Common Patterns

### SLA Calculations
```javascript
function calculateSLADueDate(createdDate, priority) {
    var gdt = new GlideDateTime(createdDate);
    var hours = 8; // Default
    
    // Determine hours by priority
    switch (priority) {
        case '1':
            hours = 4;
            break;
        case '2':
            hours = 8;
            break;
        case '3':
            hours = 24;
            break;
    }
    
    // Add business hours
    var schedule = new GlideSchedule('business_hours');
    var endTime = new GlideDateTime();
    endTime.setValue(schedule.add(gdt.getValue(), hours * 60 * 60 * 1000));
    
    return endTime;
}
```

### Age Calculation
```javascript
function getRecordAge(createdDate) {
    var created = new GlideDateTime(createdDate);
    var now = new GlideDateTime();
    
    var diff = now.getMilliseconds() - created.getMilliseconds();
    
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        totalMs: diff,
        days: days,
        hours: hours,
        minutes: minutes,
        display: days + 'd ' + hours + 'h ' + minutes + 'm'
    };
}
```

### Due Date Rules
```javascript
function setDueDate(current) {
    var created = new GlideDateTime(current.sys_created_on);
    var due = new GlideDateTime();
    
    // 5 business days from creation
    var schedule = new GlideSchedule('business_hours');
    due.setValue(schedule.add(created.getValue(), 5 * 24 * 60 * 60 * 1000));
    
    current.due_date = due;
}
```

## Performance Considerations

### Caching Datetime Values
```javascript
// ✗ INEFFICIENT - new GlideDateTime on each reference
function processRecords() {
    var gr = new GlideRecord('incident');
    gr.query();
    while (gr.next()) {
        if (new GlideDateTime() > new GlideDateTime(gr.due_date)) {
            // Create new object each iteration!
        }
    }
}

// ✓ EFFICIENT - cache datetime objects
function processRecords() {
    var now = new GlideDateTime();
    var gr = new GlideRecord('incident');
    gr.query();
    while (gr.next()) {
        var dueDate = new GlideDateTime(gr.due_date);
        if (now.getMilliseconds() > dueDate.getMilliseconds()) {
            // Reuse objects
        }
    }
}
```

## Anti-Patterns

### ✗ Incorrect Timezone Handling
```javascript
// WRONG - loses timezone info
var jsDate = new Date('2024-12-25 15:30:00');
var offset = jsDate.getTimezoneOffset(); // System offset only

// CORRECT
var gdt = new GlideDateTime('2024-12-25 15:30:00');
gdt.setTZ('America/Denver');
var offset = new GlideTimeZone('America/Denver').getOffsetMinutes();
```

### ✗ Hardcoded Timezones
```javascript
// WRONG - assumes user timezone
var hours = 8; // "8 hours" in what timezone?

// CORRECT
var userTZ = gs.getUser().getTimeZoneID();
var gdt = new GlideDateTime();
gdt.setTZ(userTZ);
// Add business hours with schedule awareness
```

### ✗ Manual DST Handling
```javascript
// WRONG - DST transitions break this
var daysMs = 24 * 60 * 60 * 1000;
var endDate = new Date(startDate.getTime() + (7 * daysMs));

// CORRECT - GlideDateTime handles DST
var start = new GlideDateTime('2024-03-09');
var end = new GlideDateTime(start.getValue());
end.addDays(7);
```

## Debugging DateTime Issues

### Common Problems
```javascript
// Problem: "Invalid date"
// Solution: Verify format is 'YYYY-MM-DD HH:MM:SS'

// Problem: Timezone mismatch
// Solution: Always set timezone explicitly with setTZ()

// Problem: SLA calculations off by hours
// Solution: Check if schedule includes DST transition dates

// Debug datetime values
var gdt = new GlideDateTime('2024-12-25');
gs.debug('Display: ' + gdt.getDisplayValue());
gs.debug('System: ' + gdt.getValue());
gs.debug('Timestamp: ' + gdt.getMilliseconds());
gs.debug('Year: ' + gdt.getYearUTC());
gs.debug('Month: ' + gdt.getMonthUTC());
gs.debug('Day: ' + gdt.getDayOfMonthUTC());
```
