# Branching Strategy: Trunk-Based (Recommended)

Use this strategy when Git is your system of record and the team needs fast integration with strong release controls.

## Goals

- Keep `main` always deployable to shared dev integration.
- Support multiple developers working on the same feature with minimal conflicts.
- Enforce PR validation before merge.
- Promote to test and production through explicit approval gates.

## Branch Model

| Branch Type | Purpose | Lifetime |
|-------------|---------|----------|
| `main` | Integration baseline, auto-deployed to dev | Long-lived |
| `feature/<story-or-epic>` | Shared branch for one feature | Until feature merge |
| `feature/<story-or-epic>/<dev>` | Optional personal branch for parallel edits on same feature | Short-lived |
| `hotfix/<ticket>` | Urgent fixes, then merge back to `main` | Short-lived |

## Team Collaboration Flow (Same Feature, Multiple Developers)

1. Create `feature/<story-or-epic>` from `main`.
2. Each developer optionally creates `feature/<story-or-epic>/<dev>` from the shared feature branch.
3. Open PRs into the shared feature branch frequently.
4. Merge the shared feature branch into `main` only after feature acceptance.

This pattern keeps the team synchronized while still allowing isolated day-to-day work.

## Required PR Controls

- Require at least one reviewer for merges into `feature/*` and `main`.
- Require passing checks before merge:
  - `npm ci`
  - `npx @servicenow/sdk build --frozenKeys`
- Disallow direct pushes to `main`.

## Promotion Model

1. Merge to `main` triggers automatic deployment to dev integration.
2. Promote to test by approved manual workflow dispatch.
3. Production promotion is governed outside direct SDK install:
   - Application Repository + App Engine Management Center Pipelines and Deployments, or
   - ReleaseOps.

## Update Set Exception Lane

Use Update Sets only for exceptions such as global-scope work or emergency hotfixes.

Rules:

1. Keep one logical change per update set.
2. Never commit with preview errors.
3. Back-port all emergency fixes to Git immediately.

## Release and Rollback

- Tag release candidates with semantic versions (for example, `v1.4.0`).
- Roll back by redeploying the last known good tag to non-prod and promoting through normal governance.
- Treat data rollback as a separate, explicitly planned operation.
