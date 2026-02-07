# ServiceNow Deployment Reference Patterns

## 1. Naming & Hygiene
*   **Format:** `Incident - STRY001 - Caller Logic Update`
*   **Scope:** verify Application Scope before creating.

## 2. Capture Matrix (What Moves?)

| Type | Captured? | Action if Missing |
|---|---|---|
| Business Rules / Scripts | YES | Standard Update Set |
| Tables / Fields | YES | Standard Update Set |
| System Properties | CONDITIONAL | Check 'Private' flag. |
| **Data Records** (Users/Incidents) | **NO** | Use XML Import / Fix Script |
| Scheduled Jobs | YES (Definition) | State (Active/Inactive) moves. |
| Homepages / Dashboards | SOMETIMES | Use "Add to Update Set" utility. |

## 3. Batching Strategy
*   **Parent:** `Release 1.0 - Batch Container`
*   **Children:** Link individual story sets to Parent.
*   **Commit:** Commit the Parent only. It pulls all children in sequence.