---
name: servicenow-deployment
user-invocable: false
description: Deploy ServiceNow configuration changes safely — either via Update Sets (classic instances) or now-sdk install (Fluent SDK projects). Covers Update Set naming, parent/child batching, preview validation, and SDK build/install workflows. Use when managing releases, migrating between instances, promoting changes from dev to test to prod, or orchestrating complex deployments with multiple Update Sets. Trigger this skill whenever the user mentions deployment, Update Sets, moving changes between environments, release management, or now-sdk install.
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

For capture lists, what moves vs what stays, and batching patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)

---

## Fluent SDK Deployment Workflow

For Fluent SDK applications, use the `now-sdk` CLI instead of Update Sets. The CLI manages authentication, building, and deploying fluent artifacts directly from source.

### CLI Commands

| Command | Purpose |
|---------|---------|
| `npx @servicenow/sdk init` | Scaffold a new project. Flags: `--appName`, `--packageName`, `--scopeName`, `--template`. Use `--from <sys_id>` to convert an existing app. |
| `npx @servicenow/sdk auth` | Manage instance credentials. `--add <url> --type basic\|oauth` to add, `--list` to check, `--use <alias>` to set default. |
| `npx @servicenow/sdk build` | Compile fluent source files. Validates syntax and reports errors. |
| `npx @servicenow/sdk install` | Push built artifacts to the instance. Requires prior `auth`. Use `--scope <name>` for multi-scope. |
| `npx @servicenow/sdk transform` | Convert existing instance artifacts (XML) into fluent `.now.ts` source files. |
| `npx @servicenow/sdk download` | Download specific records or update sets from an instance. |
| `npx @servicenow/sdk dependencies` | Fetch TypeScript type definitions for platform APIs. |
| `npx @servicenow/sdk clean` | Remove build output and cached artifacts. |
| `npx @servicenow/sdk pack` | Package the app into an update set XML. |

### Workflow

```
1. init         \u2190 Scaffold (one-time)
2. npm install  \u2190 Install dependencies (one-time)
3. auth         \u2190 Authenticate against instance
4. Write fluent \u2190 Create .now.ts files under src/fluent/
5. build        \u2190 Compile and validate
6. install      \u2190 Deploy to instance
7. Iterate      \u2190 Repeat steps 4\u20136
```

### Authentication

```bash
# Add credentials (interactive)
npx @servicenow/sdk auth --add https://myinstance.service-now.com --type basic

# Check existing credentials
npx @servicenow/sdk auth --list

# Set default alias
npx @servicenow/sdk auth --use <alias>

# Non-interactive (CI/CD) — use environment variables:
export SN_SDK_INSTANCE_URL=https://myinstance.service-now.com
export SN_SDK_USER=admin
export SN_SDK_USER_PWD=password
```

### Converting Existing Applications

```bash
# From an instance (convert scoped app by sys_id)
npx @servicenow/sdk init --from <sys_id_of_application>

# From an existing repo with XML metadata
npx @servicenow/sdk init --from <path_to_repo>

# Transform XML to Fluent DSL after init
npx @servicenow/sdk transform --from metadata/update/sys_script_<sys_id>.xml
npx @servicenow/sdk transform --from .          # transform whole app
```

> **Note:** Records that exist as both a fluent `.now.ts` file and an XML file in `metadata/` will use the XML version on `build`. Remove converted XML files to avoid conflicts.

For CI/CD pipeline patterns, multi-scope deployments, and rollback procedures, see [FLUENT-PIPELINE.md](./FLUENT-PIPELINE.md)
