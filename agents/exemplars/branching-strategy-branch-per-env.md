# Branching Strategy: Branch-Per-Environment

Use this strategy when your organization requires explicit environment branches for promotions.

## Goals

- Make environment intent visible in Git branches.
- Keep promotion flow simple for teams that prefer branch-based release gates.
- Preserve PR checks and approvals per environment.

## Branch Model

| Branch | Purpose |
|--------|---------|
| `main` | Active development and integration |
| `deploy/dev` | Deployment trigger branch for dev |
| `deploy/test` | Deployment trigger branch for test |
| `deploy/prod` | Deployment trigger branch for production |

Feature development still happens outside deploy branches:

- `feature/<story-or-epic>`
- Optional: `feature/<story-or-epic>/<dev>`

## Promotion Flow

1. Merge feature work into `main` after PR checks.
2. Promote to dev by merging or cherry-picking to `deploy/dev`.
3. Promote to test by merging the same commit to `deploy/test`.
4. Promote to prod by merging the approved commit to `deploy/prod`.

## Required Controls

- Branch protection on all `deploy/*` branches.
- Required approvals per environment branch.
- Required CI checks before any `deploy/*` merge.
- Environment-specific secrets and service accounts.

## Tradeoffs

Advantages:

- Clear mapping between Git history and environment promotion decisions.
- Easy to add environment-specific approval policies.

Disadvantages:

- Higher branch management overhead.
- Increased risk of drift if commits are promoted inconsistently.

## Update Set Exception Lane

For emergency or global-scope exceptions:

1. Execute Update Set deployment using normal safety checks.
2. Create matching Git commit in `hotfix/<ticket>`.
3. Promote through `deploy/*` branches to restore parity.
