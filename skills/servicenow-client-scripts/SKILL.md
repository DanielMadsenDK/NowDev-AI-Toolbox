---
name: servicenow-client-scripts
description: Best practices for ServiceNow browser-side scripting. Covers performance mandates, GlideAjax patterns, and DOM manipulation rules. Use for Client Scripts and UI Policies.
---

# ServiceNow Client Scripting Standards

Strict coding standards for Browser-Side JavaScript.

## Core Rules

1.  **NO `GlideRecord`:** Forbidden. Blocks browser. use `GlideAjax`.
2.  **Async Only:** `getXMLAnswer` with callback. `getXMLWait` is forbidden.
3.  **UI Policies:** Preferred for visibility/mandatory/read-only logic.
4.  **DOM:** `document`/`jQuery` usage forbidden. use `g_form` API.

## Advanced Patterns

For GlideAjax templates and performance tips (`g_scratchpad`), see [REFERENCES.md](references/REFERENCES.md).