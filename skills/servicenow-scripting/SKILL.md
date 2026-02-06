---
name: servicenow-scripting
description: Best practices for ServiceNow server-side scripting, including GlideRecord, GlideAggregate, and naming conventions. Use when writing or reviewing Script Includes, Business Rules, or Fix Scripts.
---

# ServiceNow Scripting Best Practices

Universal coding standards for all ServiceNow server-side JavaScript.

## Core Rules

1.  **Naming:** Descriptive variables (`grIncident`), PascalCase classes, camelCase functions.
2.  **Database:** precise `GlideAggregate` for counts, `getValue()` for fields, `setLimit(1)` for checks.
3.  **Forbidden:** `eval()`, hardcoded `sys_id`s (use System Properties), `getXMLWait()`.

## Advanced Patterns

For detailed implementation patterns, see [REFERENCES.md](references/REFERENCES.md).