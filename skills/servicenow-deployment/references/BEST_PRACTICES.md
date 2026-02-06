# Best Practices — Deployment

## Update Set Lifecycle

### Capture Phase Best Practices

#### 1. Use Meaningful Names
```text
Good: [ITIL] - STORY-1234 - Add SLA escalation for high-priority incidents
Bad:  Update Set 1
Bad:  Fix - do not use
```

#### 2. Capture Selectively
- Use filters to exclude system updates
- Don't capture system-generated changes
- Document what's included in Description field
- Review conflicts before capture

#### 3. Avoid Capturing
- Translations (use Language Pack)
- User data or test records
- System properties modified for testing
- Large attachments

### Preview Phase Critical Steps

#### Always Resolve Errors
```text
- Accept Remote: Keep target system version
- Skip: Ignore source version (dangerous!)
- Merge: Create new conflict resolution (rare)
```

**NEVER commit with errors**—this will fail on production

#### Types of Conflicts
- **Remote newer**: Target system has newer version
- **Missing remote**: Object doesn't exist on target
- **Prerequisite missing**: Dependencies not present

### Commit Phase Safety

```text
1. Backup production first
2. Schedule off-hours if large
3. Have rollback plan ready
4. Monitor for errors post-commit
5. Verify functionality on target
```

## Batching Strategies

### Parent/Child Architecture

```text
Parent Update Set (contains references)
│
├─ Child 1 (Dependencies)
│  └─ Scripts, tables, fields
│
├─ Child 2 (Main Application)
│  └─ Business logic, forms
│
└─ Child 3 (Cleanup)
    └─ Remove old objects, optimize
```

### Batching Example
```text
Parent: Release-2026-02
├─ Release-2026-02-Dependencies
├─ Release-2026-02-Core
├─ Release-2026-02-UI
└─ Release-2026-02-Testing
```

**Advantages**:
- Maintains order across instances
- Can rollback individual components
- Easier to troubleshoot failures
- Allows parallel development

## Common Mistakes

### 1. Merging Update Sets
```text
✗ WRONG: Creates single set, loses history
✓ CORRECT: Keep separate for traceability
```

### 2. Deploying Without Testing
```text
✗ WRONG: Direct to production
✓ CORRECT: Dev → Sub-prod → Prod
           (verify at each step)
```

### 3. Not Documenting Changes
```text
✗ WRONG: Empty description field
✓ CORRECT: Include ticket number, business purpose, dependencies
```

### 4. Capturing Unrelated Changes
```text
✗ WRONG: Single set with 20 unrelated customizations
✓ CORRECT: One logical feature per set
```

## Advanced Patterns

### Multi-Instance Deployment

```text
Production Instance
↓ (export Update Set)
Staging Instance
↓ (test and approve)
Development Instance
↓ (create Update Set)
```

### Rollback Strategy

```text
1. Back up production data first
2. Keep previous version of Update Sets
3. Document rollback procedure
4. Test rollback on sub-production
5. Have DB restore ready as last resort
```

### Using System Properties for Configuration

Instead of hardcoding values:
```javascript
// In Update Set (scripting)
var defaultGroup = gs.getProperty('incident.default_assignment_group');

// On target instance, override property value without changing code
```

## Performance During Deployment

### Large Update Sets
- Deploy during maintenance window
- Monitor system performance
- Disable background jobs during deployment
- Update indexes after structural changes

### Notification Strategy
```text
1. Maintenance window announcement (48h before)
2. Deployment start notification
3. Completion confirmation
4. Rollback capability statement
```

## Testing Update Sets

### Pre-Deployment Checklist
- [ ] All changes captured correctly
- [ ] No extraneous objects included
- [ ] Preview passes on test instance
- [ ] Business logic verified
- [ ] Performance acceptable
- [ ] No blocking errors
- [ ] Documentation complete

### Verification After Deployment
```text
1. Verify application functionality
2. Check data integrity
3. Monitor system performance
4. Review system logs for errors
5. Have rollback ready for 24h
```

## XML and Update Set Export

### When to Use XML Export
- Migrating between instances
- Version control integration
- Backup purposes
- Migration to new environment

### XML Best Practices
```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Include clear header comments -->
<record>
    <!-- Group related objects -->
    <!-- Document complex relationships -->
</record>
```

## Multi-Application Deployments

### Order Matters
```text
1. Core tables and fields first
2. Business logic (rules, scripts)
3. UI customizations (forms, scripts)
4. Reporting and analytics
5. Integrations
```

### Dependency Tracking

Use Update Set Batches to establish explicit order:
1. Parent meta-set declares load order
2. Child sets execute in declared sequence
3. Failures in parent block children (optional)
