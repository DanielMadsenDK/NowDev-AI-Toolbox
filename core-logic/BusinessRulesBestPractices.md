# AI Directive: ServiceNow Business Rules Best Practices

## Context
This document defines the strict coding standards and architectural patterns for ServiceNow **Business Rules** (Server-Side Database Triggers).

## 1. Execution Timing (When to Run)
Select the correct `When` value based on the goal.

| Value | Usage | Constraint |
|---|---|---|
| **Before** | Modifying the `current` record being saved. | **DO NOT** use `current.update()`. |
| **After** | Modifying **related** records (e.g., Parent Task) that must be seen immediately. | **DO NOT** modify `current`. |
| **Async** | Modifying related records, integrations, or heavy calculations. | Preferred over 'After' for user performance. Runs in background. |
| **Display** | Passing server data to the client (`g_scratchpad`). | Read-only access to `current`. |

## 2. Conditions & Filters
*   **MANDATORY:** Always use the **Filter Conditions** builder for simple field checks.
*   **MANDATORY:** If scripting is needed, put the condition in the `Condition` field, not just inside the script body.
*   **Reason:** Prevents the script engine from loading unnecessarily.

## 3. Function Wrapping (Scope Safety)
**CRITICAL:** All Business Rule scripts MUST be wrapped in a self-executing function (IIFE) to prevent global variable pollution.

**Pattern:**
```javascript
(function executeRule(current, previous /*null when async*/) {

    // Your code here

})(current, previous);
```

## 4. Recursion Prevention
*   **CRITICAL RULE:** **NEVER** call `current.update()` in a `Before` or `After` Business Rule on the *same* table.
*   **Result:** Infinite loop and stack overflow.
*   **Alternative:**
    *   In `Before` rules: Just set values (e.g., `current.state = 3;`). They are saved automatically.
    *   In `After` rules: You should be updating *other* records, not `current`.

## 5. Security & Validation
*   **Input Validation:** Use Business Rules to validate data integrity (Server-Side) even if Client Scripts exist (Client-Side can be bypassed).
*   **Pattern:**
    ```javascript
    if (current.u_start_date > current.u_end_date) {
        gs.addErrorMessage('Start date must be before End date');
        current.setAbortAction(true); // Blocks the database transaction
    }
    ```

## 6. Architecture
*   **Complex Logic:** Move complex logic (>10 lines) to a **Script Include**. Call the Script Include from the Business Rule.
*   **Global Rules:** **DO NOT** use Global Business Rules. Use Script Includes instead.
