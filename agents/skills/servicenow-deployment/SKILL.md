---
name: servicenow-deployment
context: fork
user-invocable: false
description: Deploy ServiceNow configuration changes safely — either via Update Sets (classic instances) or now-sdk install (Fluent SDK projects). Covers Update Set naming, parent/child batching, preview validation, and SDK build/install workflows. Use when managing releases, migrating between instances, promoting changes from dev to test to prod, or orchestrating complex deployments with multiple Update Sets. Trigger this skill whenever the user mentions deployment, Update Sets, moving changes between environments, release management, or now-sdk install.
last_verified: "2026-05-18"
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
### CLI and Authentication

Do not hardcode SDK flags or CI variable names from local docs. Use the installed SDK docs first:

```bash
now-sdk explain ci-integration --format raw
now-sdk explain developing-apps-guide --format raw
now-sdk <command> --help
```

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
export SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL
export SN_SDK_AUTH_TYPE=basic
export SN_SDK_INSTANCE_URL=https://myinstance.service-now.com
export SN_SDK_USER=admin
export SN_SDK_USER_PWD=password

# OAuth client credentials:
export SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL
export SN_SDK_AUTH_TYPE=oauth
export SN_SDK_INSTANCE_URL=https://myinstance.service-now.com
export SN_SDK_OAUTH_CLIENT_ID=<oauth_client_id>
export SN_SDK_OAUTH_CLIENT_SECRET=<oauth_client_secret>
```

### Converting Existing Applications

```bash
# Verify current conversion and transform commands first
now-sdk explain developing-apps-guide --format raw
now-sdk transform --help
```

> **Note:** Records that exist as both a fluent `.now.ts` file and an XML file in `metadata/` will use the XML version on `build`. Remove converted XML files to avoid conflicts.

For CI/CD pipeline patterns, multi-scope deployments, and rollback procedures, see [FLUENT-PIPELINE.md](./FLUENT-PIPELINE.md)
