# Branching Strategy — Branch-Per-Environment

## Overview

This project uses a **branch-per-environment** strategy. Each ServiceNow environment
has a corresponding long-lived Git branch. Developers merge feature branches into `main`
for code review; releases are promoted by merging `main` into the appropriate deploy branch.

## Branch Map

| Branch        | ServiceNow Environment | CI Trigger      | Approval Required |
|---------------|------------------------|-----------------|-------------------|
| `main`        | (none — review only)   | PR builds only  | —                 |
| `deploy/dev`  | Dev instance           | Push → auto     | No                |
| `deploy/test` | Test instance          | Push → auto     | No                |
| `deploy/prod` | Production instance    | Push → manual   | Yes (environment protection) |

## Promotion Flow

1. Developer creates feature branch from `main`
2. Opens a PR into `main` — CI runs build and tests
3. PR is reviewed and merged into `main`
4. Release manager merges `main` into `deploy/dev` to deploy to dev
5. After dev validation, merges `deploy/dev` into `deploy/test`
6. After test sign-off, merges `deploy/test` into `deploy/prod` (triggers approval gate)

## Rollback

To roll back an environment, check out the previous commit on that deploy branch and push:

```bash
git checkout deploy/dev
git revert HEAD          # or git reset --hard <previous-sha>
git push origin deploy/dev
```
