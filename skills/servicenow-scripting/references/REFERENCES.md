# ServiceNow Scripting Reference Patterns

## 1. Naming Conventions details
*   **Variables:** Descriptive is MANDATORY.
    *   **BAD:** `var gr = ...`
    *   **GOOD:** `var grIncident = ...`
*   **Classes:** PascalCase (`IncidentUtils`).
*   **Functions:** camelCase (`calculateRisk`).

## 2. Database Interactions (GlideRecord) details
*   **Counting:**
    *   **DO:** Use `GlideAggregate` ('COUNT').
    *   **DO NOT:** Use `getRowCount()` on a `GlideRecord` (fetches all rows).
*   **Existence Check:**
    *   **DO:** `gr.setLimit(1); gr.query(); if (gr.next()) ...`
    *   **DO NOT:** Query without limit just to check `hasNext()`.
*   **Field Access:**
    *   **DO:** `gr.getValue('field_name')`.
    *   **DO NOT:** `gr.field_name` (Dot-walking to object).
*   **Queries:**
    *   **DO:** `addEncodedQuery('...')` for complex filters.
    *   **DO:** Use Indexes.

## 3. Code Structure details
*   **Modularity:** Create reusable **Script Includes**. Avoid large blocks of code in Business Rules or Workflow Scripts.
*   **Functions:** Break logic into small methods (< 50 lines).
*   **Formatting:** Use standard JS indentation (4 spaces or 2 spaces, consistent).

## 4. Forbidden Patterns details
*   **Hardcoded Values:** `sys_id`s, Group Names, URLs. -> **Use System Properties**.
*   **`eval()`:** Security risk. Forbidden.
*   **`document` / `window`:** (Server Side) Do not exist.
*   **Sync GlideAjax:** `getXMLWait()` is forbidden.