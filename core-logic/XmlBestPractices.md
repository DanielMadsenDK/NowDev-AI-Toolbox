# AI Directive: ServiceNow XML Data Migration

## Context
Standards for moving **Data Records** (not configuration) between instances (e.g., Lookup Data, User Groups).

## 1. Export Procedure
*   **Method:** List View -> Right Click Header -> `Export` -> `XML`.
*   **Use Case:** Moving 'Sys Data' that isn't captured by Update Sets (e.g., specific `sys_user_group` records, `cmn_schedule` entries).

## 2. Import Behavior (CRITICAL)
*   **No Triggers:** XML Import **does NOT** trigger Business Rules (`before`, `after`, `async`) or update system fields (`sys_updated_on`, `sys_updated_by` are preserved from source).
*   **Implication:** If your data relies on a Business Rule to calculate a field on insert, that calculation will **NOT** happen during XML import.

## 3. Relational Integrity
*   **Orphan Risk:** Exporting a Group (`sys_user_group`) does **NOT** export its members (`sys_user_grmember`).
*   **Mandate:** You must identify and export all related tables separately if the relationship is required.
    *   *Example:* Export `sys_user`, then `sys_user_group`, then `sys_user_grmember`, then `sys_user_role`.

## 4. Usage in Releases
*   **Migration Plan:** Document the order.
    1.  Commit Update Set (Schema/Logic).
    2.  Import XML (Data).