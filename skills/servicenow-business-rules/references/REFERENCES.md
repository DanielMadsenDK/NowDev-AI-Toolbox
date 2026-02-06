# ServiceNow Business Rules Reference Patterns

## 1. Execution Timing Matrix

| Value | Usage | Constraint |
|---|---|---|
| **Before** | Modifying `current` record being saved. | **DO NOT** use `current.update()`. |
| **After** | Modifying **related** records seen immediately. | **DO NOT** modify `current`. |
| **Async** | Integrations, heavy calculations. | Preferred over 'After'. Runs in background. |
| **Display** | Passing data to `g_scratchpad`. | Read-only access to `current`. |

## 2. Function Wrapping (IIFE)
**CRITICAL:** Prevents global variable pollution.

```javascript
(function executeRule(current, previous /*null when async*/) {
    // Your code here
})(current, previous);
```

## 3. Recursion Prevention
*   **Prevent Loops:** Using `current.update()` in `Before`/`After` rules causes stack overflows.
*   **Correct Usage:**
    *   `Before`: `current.state = 3;` (Auto-saved).
    *   `After`: Update *other* records.

## 4. Validation Pattern
```javascript
if (current.u_start_date > current.u_end_date) {
    gs.addErrorMessage('Error text');
    current.setAbortAction(true); // Blocks DB transaction
}
```

## 5. Architecture
*   **Refactor:** Move complex logic (>10 lines) to **Script Includes**.
*   **Global Rules:** Forbidden. Use Script Includes.