# Branching Strategy — Trunk-Based Development

## Overview

This project uses a **trunk-based development** strategy. All changes are merged to `main`
through short-lived feature branches. Environment promotion is controlled by Git tags
(for dev) and manual `workflow_dispatch` triggers (for test and prod).

## Branch Map

| Ref              | ServiceNow Environment | Trigger                         | Approval Required |
|------------------|------------------------|---------------------------------|-------------------|
| `main`           | (none — build only)    | PR builds                       | —                 |
| Tag `v*.*.*`     | Dev                    | Tag push → auto deploy to dev   | No                |
| `workflow_dispatch` | Test or Prod        | Manual trigger with env selector| Yes for prod      |

## Promotion Flow

1. Developer creates short-lived feature branch from `main` (max 1–2 days)
2. Opens a PR into `main` — CI runs build only
3. PR merged; release manager tags the commit: `git tag v1.2.0 && git push --tags`
4. Tag push triggers automatic deployment to dev
5. After dev validation, release manager runs `workflow_dispatch` selecting `test`
6. After test sign-off, runs `workflow_dispatch` selecting `prod` (triggers approval gate)

## Rollback

Run the rollback workflow (`workflow_dispatch` on `rollback.yml`) and specify the tag to restore.
