---
name: servicenow-deployment
description: Deploy ServiceNow configuration changes safely using Update Sets with proper naming, parent/child batching, and preview validation. Use when managing releases, migrating between instances, or orchestrating complex deployments with multiple Update Sets.
---

# ServiceNow Deployment

## Quick start

**Update Set naming convention**:

```
[App Name] - [Story ID] - [Brief Description]

Example:
ITIL - STORY-1234 - Add approval routing for high-priority incidents
```

**Batching strategy** (parent/child pattern):

```
Parent Update Set (orchestrates order)
├── Child Update Set 1 (dependencies)
├── Child Update Set 2 (main logic)
└── Child Update Set 3 (cleanup)
```

## Deployment process

1. **Capture phase**: Select only objects needed; use filters to exclude system changes
2. **Preview phase**: Resolve all errors:
   - Accept Remote: Keep target system changes
   - Skip: Ignore conflicting source changes
3. **Commit phase**: Only after preview succeeds
4. **Verify phase**: Test functionality on target instance

## Critical rules

| Rule | Reason |
|------|--------|
| Use Parent/Child batches | Maintains deployment order; enables rollback |
| Never merge sets | Destructive; loses change history |
| Preview before commit | Catches conflicts early |
| Unique naming | Enables audit trail and troubleshooting |

## Best practices

- Keep Update Sets focused (one feature per set)
- Document customizations in the Description field
- Test on sub-production before production
- Create parent sets for new applications
- Version track all custom objects
- Backup production before large deployments
- Review all preview errors before committing
- Use descriptive names with story/ticket IDs

## Key concepts

| Concept | Description |
|---------|-------------|
| Update Set | Container for configuration changes |
| Parent Update Set | Orchestrates multiple child sets |
| Preview | Validation step before commit |
| Remote Update Set | Update Set on target instance |
| Collision | Conflicting changes between instances |

## Reference

For capture lists, what moves vs what stays, and batching patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
