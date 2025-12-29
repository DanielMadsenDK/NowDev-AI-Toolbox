# AI Directive: ServiceNow Update Set Best Practices

## Context
Standards for capturing and moving configuration changes between instances.

## 1. Naming & Hygiene
*   **Format:** `[Application] - [Story ID] - [Description]`.
    *   *Example:* `Incident - STRY001 - Caller Logic Update`
*   **Description Field:** Mandatory. Link to the Jira/Story ticket.
*   **Scope:** Ensure you are in the correct Application Scope before creating the set.

## 2. Batching (Preferred)
*   **Pattern:** Use **Update Set Batches** (Hierarchy) instead of Merging.
    *   *Parent:* `[Release Name] - Batch`
    *   *Children:* Individual developer update sets.
*   **Reason:** Merging is destructive (cannot un-merge). Batching preserves the original sets and handles collisions better.

## 3. Completeness Check
*   **Dependencies:** If you use a new field in a script, ensure the Field Dictionary entry is also in the set (or a parent batch).
*   **Preview:** ALWAYS Run Preview on the target instance. Address all errors (Accept Remote / Skip) before Committing.

## 4. What is Captured?
*   **Captured:** Business Rules, Client Scripts, Forms, Fields, Tables, System Properties (if marked), Workflows, Flows.
*   **NOT Captured:** Data Records (Incidents, Users, Groups), Scheduled Job *execution history*, Dashboards (sometimes). -> **Use XML Import**.
