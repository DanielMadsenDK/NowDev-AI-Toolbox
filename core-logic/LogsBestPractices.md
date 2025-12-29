# AI Directive: ServiceNow Logging & Queues Best Practices

## Context
Guidelines for maintaining system health via logs and managing asynchronous queues.

## 1. Log Levels
*   **Error:** Functionality failed. Action required.
*   **Warning:** Unexpected behavior, but handled.
*   **Info:** Milestone reached (e.g., "Integration Job Started").
*   **Debug:** granular detail. **MUST** be controlled by a System Property.

## 2. Queue Management
*   **ECC Queue:** (External Communication Channel)
    *   `output` / `ready`: Waiting for MID Server.
    *   `input` / `ready`: Response received.
    *   *Alert:* If `ready` > 5 minutes, check MID Server status.
*   **Email:** `System Mailboxes > Outbox`. Check for stuck mail.
*   **Events:** `System Logs > Events`.
    *   Check `Processing duration`. >1000ms is slow.
    *   Check `Processed is Empty` count. Rising count = backlog.

## 3. Slow Patterns (What to look for)
*   **Slow SQL:** `System Diagnostics > Slow Queries`. Look for queries > 100ms.
*   **Large Tables:** Queries on tables > 100k rows without indexes.
*   **Recursion:** "Recursive Business Rule" errors in System Logs.
