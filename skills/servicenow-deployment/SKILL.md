---
name: servicenow-deployment
description: Best practices for ServiceNow Update Sets and deployments. Covers naming conventions, batching (vs merging), and capturing rules. Use when preparing for release or migration.
---

# ServiceNow Deployment & Update Set Standards

Standards for capturing and moving configuration changes.

## Core Rules

1.  **Naming:** `[App] - [Story ID] - [Desc]`. Mandatory description.
2.  **Batching:** Use **Update Set Batches** (Parent/Child). Merging is destructive and forbidden.
3.  **Preview:** Must resolve all errors (Accept Remote/Skip) before Commit.

## Advanced Patterns

For capture lists (what moves vs what stays) and batching details, see [REFERENCES.md](references/REFERENCES.md).