---
name: servicenow-business-rules
description: Standards for ServiceNow Business Rules (execution timing, conditions, and recursion prevention). Use when creating or modifying database triggers.
---

# ServiceNow Business Rules Standards

Coding standards and architectural patterns for Server-Side Database Triggers.

## Core Rules

1.  **Timing:** `Before` for current record, `After` for immediate related updates, `Async` for background work.
2.  **Wrappers:** MUST check `executeRule` IIFE to prevent global pollution.
3.  **Recursion:** NEVER called `current.update()` in `Before`/`After` rules on same table.
4.  **Conditions:** Use Condition builder first.

## Advanced Patterns

For execution matrix and code examples, see [REFERENCES.md](references/REFERENCES.md).