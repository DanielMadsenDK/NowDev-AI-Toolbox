# Fluent SDK — CI/CD Pipeline Patterns

Patterns for deploying ServiceNow Fluent SDK applications through automated pipelines. Covers multi-scope installs, credential management, rollback procedures, and multi-environment promotion strategies.

> **Scope:** This document covers `npx @servicenow/sdk` deployment operations only.
> For Update Set / classic deployment patterns, see [SKILL.md](./SKILL.md) and [BEST_PRACTICES.md](./BEST_PRACTICES.md).

---

## Table of Contents

1. [Multi-Scope Deployments](#multi-scope-deployments)
2. [Credential and Secret Management in CI](#credential-and-secret-management-in-ci)
3. [Rollback via `--reinstall`](#rollback-via---reinstall)
4. [Multi-Environment Promotion Strategies](#multi-environment-promotion-strategies)
5. [Branch-per-Environment vs Trunk-Based](#branch-per-environment-vs-trunk-based)
6. [Verifying Pipeline Templates](#verifying-pipeline-templates)

---

## Multi-Scope Deployments

### How Scopes Are Defined

Each ServiceNow SDK application has exactly one scope, declared in its `now.config.json`:

```json
{
  "scope": "x_mycompany_core",
  "scopeId": "fc1b5713c3db3110d6489a038a40dd85",
  "name": "MyCompany Core",
  "active": true
}
```

In a **monorepo** (multiple applications in one repository), each application lives in its own subdirectory with its own `now.config.json`:

```
my-servicenow-repo/
├── packages/
│   ├── core-app/
│   │   ├── now.config.json     ← scope: "x_mycompany_core"
│   │   ├── src/
│   │   └── package.json
│   ├── portal-app/
│   │   ├── now.config.json     ← scope: "x_mycompany_portal"
│   │   ├── src/
│   │   └── package.json
│   └── integration-app/
│       ├── now.config.json     ← scope: "x_mycompany_integ"
│       ├── src/
│       └── package.json
└── package.json
```

### Detecting Multiple Scopes

Enumerate all `now.config.json` files in a repository to identify all scopes present:

```bash
# List all scopes in a monorepo
find . -name "now.config.json" -not -path "*/node_modules/*" \
  | xargs -I{} sh -c 'echo "$(dirname {}): $(jq -r .scope {})"'

# Output:
# ./packages/core-app: x_mycompany_core
# ./packages/portal-app: x_mycompany_portal
# ./packages/integration-app: x_mycompany_integ
```

### Deploying One Scope at a Time with `--scope`

Use the `--scope` flag to deploy a specific application scope in isolation:

```bash
# Deploy a single scope by name
npx @servicenow/sdk install --scope x_mycompany_core

# Deploy another scope
npx @servicenow/sdk install --scope x_mycompany_portal
```

This is critical in CI pipelines — deploying all scopes in a single unordered pass risks dependency failures when scope B references types or tables defined by scope A.

### Ordering Scope Deployments for Dependencies

When scopes depend on each other, deploy in dependency order: foundations first, consumers last.

```bash
#!/usr/bin/env bash
# deploy-all-scopes.sh — deploy scopes in dependency order
set -euo pipefail

INSTANCE_URL="${NOW_INSTANCE_URL}"
USERNAME="${NOW_USERNAME}"
PASSWORD="${NOW_PASSWORD}"

echo "==> Step 1: Deploy core (no dependencies)"
cd packages/core-app
npx @servicenow/sdk install \
  --scope x_mycompany_core \
  --url "${INSTANCE_URL}" \
  --username "${USERNAME}" \
  --password "${PASSWORD}"
cd ../..

echo "==> Step 2: Deploy portal (depends on core)"
cd packages/portal-app
npx @servicenow/sdk install \
  --scope x_mycompany_portal \
  --url "${INSTANCE_URL}" \
  --username "${USERNAME}" \
  --password "${PASSWORD}"
cd ../..

echo "==> Step 3: Deploy integration layer (depends on both)"
cd packages/integration-app
npx @servicenow/sdk install \
  --scope x_mycompany_integ \
  --url "${INSTANCE_URL}" \
  --username "${USERNAME}" \
  --password "${PASSWORD}"
cd ../..

echo "==> All scopes deployed successfully"
```

### Dependency Ordering Reference Table

Document your scope dependency graph and use it to enforce deployment order:

| Scope | Depends On | Deploy Order |
|-------|-----------|:------------:|
| `x_mycompany_core` | _(none)_ | 1 |
| `x_mycompany_portal` | `x_mycompany_core` | 2 |
| `x_mycompany_integ` | `x_mycompany_core`, `x_mycompany_portal` | 3 |

> **Rule:** Never deploy a consumer scope before all of its provider scopes have been installed on the target instance. A failed dependency install must abort the pipeline — `set -euo pipefail` enforces this in bash.

---

## Credential and Secret Management in CI

### Required Environment Variables

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `NOW_INSTANCE_URL` | Full URL of the target instance | `https://mycompany.service-now.com` |
| `NOW_USERNAME` | Service account username | `svc_sdk_deploy` |
| `NOW_PASSWORD` | Service account password | _(secret)_ |
| `NOW_OAUTH_TOKEN` | OAuth bearer token (alternative to user/pass) | _(secret)_ |

**Username/password vs. OAuth token:** Use OAuth (`NOW_OAUTH_TOKEN`) when your organization's security policy prohibits basic-auth service accounts, or when you need short-lived credentials with automatic rotation. Use username/password (`NOW_USERNAME` + `NOW_PASSWORD`) for simpler setups where a dedicated service account is acceptable.

### Per-Environment Secret Naming Convention

Use environment-prefixed names so a single pipeline file can deploy to any environment by switching the prefix:

```
DEV_NOW_INSTANCE_URL     TEST_NOW_INSTANCE_URL     PROD_NOW_INSTANCE_URL
DEV_NOW_USERNAME         TEST_NOW_USERNAME          PROD_NOW_USERNAME
DEV_NOW_PASSWORD         TEST_NOW_PASSWORD          PROD_NOW_PASSWORD
```

This pattern lets you resolve credentials at runtime without branching your pipeline logic:

```bash
# Resolve credentials by environment prefix
ENV_PREFIX="${DEPLOY_ENV^^}"   # e.g. "dev" → "DEV"
INSTANCE_URL_VAR="${ENV_PREFIX}_NOW_INSTANCE_URL"
USERNAME_VAR="${ENV_PREFIX}_NOW_USERNAME"
PASSWORD_VAR="${ENV_PREFIX}_NOW_PASSWORD"

INSTANCE_URL="${!INSTANCE_URL_VAR}"
USERNAME="${!USERNAME_VAR}"
PASSWORD="${!PASSWORD_VAR}"
```

### GitHub Actions

Store secrets in **Settings → Secrets and variables → Actions**. Never hard-code credentials in workflow files.

```yaml
# .github/workflows/deploy.yml
name: Deploy to ServiceNow

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'dev'
        type: choice
        options: [dev, test, prod]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}  # uses environment-scoped secrets

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build all scopes
        run: npm run build          # runs now-sdk build in each package

      - name: Deploy core scope
        working-directory: packages/core-app
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME: ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD: ${{ secrets.NOW_PASSWORD }}
        run: |
          npx @servicenow/sdk install \
            --scope x_mycompany_core \
            --url "$NOW_INSTANCE_URL" \
            --username "$NOW_USERNAME" \
            --password "$NOW_PASSWORD"

      - name: Deploy portal scope
        working-directory: packages/portal-app
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME: ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD: ${{ secrets.NOW_PASSWORD }}
        run: |
          npx @servicenow/sdk install \
            --scope x_mycompany_portal \
            --url "$NOW_INSTANCE_URL" \
            --username "$NOW_USERNAME" \
            --password "$NOW_PASSWORD"
```

**Key GitHub Actions points:**

- Use [GitHub Environments](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment) to gate prod deployments behind required reviewers
- Environment-scoped secrets automatically shadow repository-level secrets — name them identically in each environment (`NOW_INSTANCE_URL`, `NOW_USERNAME`, `NOW_PASSWORD`) so your workflow YAML needs no changes between environments
- Never print secret values with `echo` — GitHub Actions redacts known secret values, but log-based extraction is still a risk

### Azure DevOps

Use **variable groups** linked to an Azure Key Vault for secret storage, and reference them in pipeline YAML:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include: [main]

variables:
  - group: servicenow-dev-credentials   # variable group in Library

stages:
  - stage: Deploy_Dev
    displayName: 'Deploy to Dev'
    jobs:
      - deployment: DeployDev
        environment: 'servicenow-dev'   # environment with approval gates
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self

                - task: NodeTool@0
                  inputs:
                    versionSpec: '20.x'

                - script: npm ci
                  displayName: 'Install dependencies'

                - script: |
                    cd packages/core-app
                    npx @servicenow/sdk install \
                      --scope x_mycompany_core \
                      --url "$(NOW_INSTANCE_URL)" \
                      --username "$(NOW_USERNAME)" \
                      --password "$(NOW_PASSWORD)"
                  displayName: 'Deploy core scope'
                  env:
                    NOW_PASSWORD: $(NOW_PASSWORD)   # mark as secret so it's masked in logs
```

**Azure DevOps variable group setup:**

```
Library → Variable Groups → New variable group
  Name: servicenow-dev-credentials
  Link secrets from Azure Key Vault: ✓
    Key Vault: kv-mycompany-servicenow
    Secrets to map:
      NOW_INSTANCE_URL  → dev-instance-url
      NOW_USERNAME      → dev-service-account-username
      NOW_PASSWORD      → dev-service-account-password
```

### Credential Safety Rules

✅ **Do:**
- Use dedicated service accounts with the minimum roles needed to install apps (typically `admin` or a custom install role)
- Rotate credentials on a schedule and immediately after any personnel change
- Audit service account activity in the ServiceNow System Log

❌ **Never:**
- Print or `echo` credential values in CI logs, even for debugging
- Store credentials in source code, `.env` files checked into git, or build artifacts
- Share a single service account across dev/test/prod environments
- Use personal accounts for CI — they break when the employee leaves

---

## Rollback via `--reinstall`

### What `--reinstall` Does

The `--reinstall` flag instructs the SDK to remove all non-package metadata on the target instance before re-deploying the package from scratch. This ensures a clean state that exactly matches the package contents — no orphaned records from previous deploys.

```bash
# Standard install (additive — existing records are updated, nothing is removed)
npx @servicenow/sdk install --scope x_mycompany_core

# Reinstall (removes non-package metadata, then deploys cleanly)
npx @servicenow/sdk install --scope x_mycompany_core --reinstall
```

| Mode | Behaviour | When to Use |
|------|-----------|-------------|
| `install` | Creates/updates records from the package; leaves extras alone | Normal forward deploys |
| `install --reinstall` | Removes non-package metadata, then installs clean | Rollback, environment repair, removing deleted metadata |

> **Caution:** `--reinstall` is destructive to instance state outside the package boundary. Always confirm you are targeting the correct instance and scope before running it.

### Git Tag-Based Rollback Workflow

Tag every production deployment so you can check out the exact artifact that was deployed:

```bash
# Tag at deploy time (in CI)
git tag "deploy/prod/$(date +%Y%m%d-%H%M%S)" -m "Production deploy"
git push origin --tags

# Example tag names:
# deploy/prod/20260315-142035
# deploy/prod/20260316-090122   ← latest (broken)
# deploy/prod/20260315-142035   ← last good
```

**Rollback procedure (manual or automated):**

```bash
#!/usr/bin/env bash
# rollback.sh — roll back to a previously tagged deploy
set -euo pipefail

ROLLBACK_TAG="${1:?Usage: ./rollback.sh <git-tag>}"

echo "==> Checking out tag: ${ROLLBACK_TAG}"
git checkout "${ROLLBACK_TAG}"

echo "==> Installing dependencies for this version"
npm ci

echo "==> Rolling back core scope with --reinstall"
cd packages/core-app
npx @servicenow/sdk install \
  --scope x_mycompany_core \
  --reinstall \
  --url "${NOW_INSTANCE_URL}" \
  --username "${NOW_USERNAME}" \
  --password "${NOW_PASSWORD}"
cd ../..

echo "==> Rolling back portal scope with --reinstall"
cd packages/portal-app
npx @servicenow/sdk install \
  --scope x_mycompany_portal \
  --reinstall \
  --url "${NOW_INSTANCE_URL}" \
  --username "${NOW_USERNAME}" \
  --password "${NOW_PASSWORD}"
cd ../..

echo "==> Rollback to ${ROLLBACK_TAG} complete"
```

Trigger this as a `workflow_dispatch` job in GitHub Actions or a parameterised Azure DevOps build, passing the target tag as input.

### Rollback vs Forward-Fix Decision Guide

```
Incident detected in production
         │
         ▼
  Is the fix trivial and low-risk?
  (e.g. wrong label, simple logic tweak)
         │
    Yes ─┤──────────────────────────────────► Forward-fix
         │                                   (patch, redeploy,
    No   │                                    run install)
         ▼
  Is the impact business-critical right now?
         │
    Yes ─┤──────────────────────────────────► Rollback immediately
         │                                   (git tag checkout,
    No   │                                    run install --reinstall)
         ▼
  Schedule a fix in the next sprint ────────► Forward-fix
```

| Criterion | Rollback | Forward-Fix |
|-----------|----------|-------------|
| Fix complexity | Unknown/high | Low/well-understood |
| User impact | Immediate, severe | Tolerable for hours |
| Root cause | Not yet identified | Clear and simple |
| Risk of fix | Hard to assess quickly | Low |
| Data migration needed | No | Possibly yes |

### Rollback in CI/CD Pipelines — GitHub Actions Example

```yaml
# .github/workflows/rollback.yml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      rollback_tag:
        description: 'Git tag to roll back to (e.g. deploy/prod/20260315-142035)'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: prod          # requires manual approval via environment protection rules

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.rollback_tag }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies at rollback version
        run: npm ci

      - name: Rollback core scope
        working-directory: packages/core-app
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME: ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD: ${{ secrets.NOW_PASSWORD }}
        run: |
          npx @servicenow/sdk install \
            --scope x_mycompany_core \
            --reinstall \
            --url "$NOW_INSTANCE_URL" \
            --username "$NOW_USERNAME" \
            --password "$NOW_PASSWORD"

      - name: Rollback portal scope
        working-directory: packages/portal-app
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME: ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD: ${{ secrets.NOW_PASSWORD }}
        run: |
          npx @servicenow/sdk install \
            --scope x_mycompany_portal \
            --reinstall \
            --url "$NOW_INSTANCE_URL" \
            --username "$NOW_USERNAME" \
            --password "$NOW_PASSWORD"

      - name: Tag rollback event
        run: |
          git tag "rollback/prod/$(date +%Y%m%d-%H%M%S)" \
            -m "Rolled back to ${{ github.event.inputs.rollback_tag }}"
          git push origin --tags
```

---

## Multi-Environment Promotion Strategies

### Dev → Test → Prod Promotion Workflow

The canonical pipeline builds the artifact once and promotes it through environments by re-deploying the same commit SHA:

```
Developer pushes to main
         │
         ▼
  ┌─────────────┐
  │  CI: Build  │  npm ci && npm run build
  └──────┬──────┘
         │ artifact: dist/ + git SHA
         ▼
  ┌─────────────────┐
  │  Deploy to Dev  │  install --scope (automatic, no gate)
  └──────┬──────────┘
         │ manual or automated promotion
         ▼
  ┌──────────────────┐
  │  Deploy to Test  │  install --scope (smoke tests run)
  └──────┬───────────┘
         │ approval gate (QA lead sign-off)
         ▼
  ┌──────────────────┐
  │  Deploy to Prod  │  install --scope (requires 2 approvers)
  └──────────────────┘
```

### Approval Gates Before Production

Use your CI platform's environment protection rules to require human review before the prod deploy job runs:

**GitHub Actions — environment protection rules:**
```
Settings → Environments → prod
  ✓ Required reviewers: [qa-lead, release-manager]
  ✓ Wait timer: 0 minutes
  ✓ Deployment branches: main only
```

**Azure DevOps — stage approval:**
```yaml
- stage: Deploy_Prod
  dependsOn: Deploy_Test
  condition: succeeded('Deploy_Test')
  jobs:
    - deployment: DeployProd
      environment: 'servicenow-prod'   # environment configured with approvals in ADO portal
```

### Environment-Specific Configuration

Avoid environment-specific values in source code. Keep `now.config.json` environment-agnostic (it describes the application, not the target) and provide environment details exclusively through CI environment variables.

```jsonc
// now.config.json — environment-agnostic; same file in all environments
{
  "scope": "x_mycompany_core",
  "scopeId": "fc1b5713c3db3110d6489a038a40dd85",
  "name": "MyCompany Core",
  "active": true
}
```

```bash
# Target instance is determined entirely by CI environment variables:
npx @servicenow/sdk install \
  --scope x_mycompany_core \
  --url    "$NOW_INSTANCE_URL" \   # https://dev.service-now.com  OR  https://mycompany.service-now.com
  --username "$NOW_USERNAME" \
  --password "$NOW_PASSWORD"
```

If you have values that genuinely differ per environment at the application level (e.g. email recipients, integration endpoints), use **ServiceNow System Properties** set on each instance — not baked into the deployed artifact.

### Immutable Artifacts: Build Once, Deploy Many

Build the application **once** per commit and store the artifact. Redeploy that same artifact to each environment rather than rebuilding per-environment.

```yaml
# GitHub Actions: build once, deploy to each env from the artifact

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: servicenow-build-${{ github.sha }}
          path: |
            packages/*/dist/
            packages/*/now.config.json
            packages/*/package.json

  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: servicenow-build-${{ github.sha }}
      - run: |
          cd packages/core-app
          npx @servicenow/sdk install --scope x_mycompany_core \
            --url "$NOW_INSTANCE_URL" --username "$NOW_USERNAME" --password "$NOW_PASSWORD"
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME:     ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD:     ${{ secrets.NOW_PASSWORD }}

  deploy-test:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: test
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: servicenow-build-${{ github.sha }}
      - run: |
          cd packages/core-app
          npx @servicenow/sdk install --scope x_mycompany_core \
            --url "$NOW_INSTANCE_URL" --username "$NOW_USERNAME" --password "$NOW_PASSWORD"
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME:     ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD:     ${{ secrets.NOW_PASSWORD }}

  deploy-prod:
    needs: deploy-test
    runs-on: ubuntu-latest
    environment: prod                   # requires approval from environment protection rules
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: servicenow-build-${{ github.sha }}
      - run: |
          cd packages/core-app
          npx @servicenow/sdk install --scope x_mycompany_core \
            --url "$NOW_INSTANCE_URL" --username "$NOW_USERNAME" --password "$NOW_PASSWORD"
        env:
          NOW_INSTANCE_URL: ${{ secrets.NOW_INSTANCE_URL }}
          NOW_USERNAME:     ${{ secrets.NOW_USERNAME }}
          NOW_PASSWORD:     ${{ secrets.NOW_PASSWORD }}
```

**Why build once?**

| Build-per-environment | Build once, deploy many |
|-----------------------|------------------------|
| Rebuild may produce different output if deps change | Same bits deployed everywhere |
| Slower pipelines (rebuild for each env) | Faster: build cost paid once |
| Harder to audit — "what exactly is on prod?" | Artifact SHA is the definitive answer |
| npm resolution differences between builds | Deterministic: `npm ci` + locked `package-lock.json` |

---

## Branch-per-Environment vs Trunk-Based

### Branch-per-Environment

Each environment has a dedicated long-lived branch. Promotion is a git merge operation.

```
main (development)
  │
  ├─── deploy/dev    ← mirrors main continuously
  ├─── deploy/test   ← merged from deploy/dev after QA signoff
  └─── deploy/prod   ← merged from deploy/test after release approval
```

**How it works:**

```bash
# Promote dev → test
git checkout deploy/test
git merge --no-ff deploy/dev
git push origin deploy/test
# CI detects push to deploy/test → deploys to TEST instance

# Promote test → prod
git checkout deploy/prod
git merge --no-ff deploy/test
git push origin deploy/prod
# CI detects push to deploy/prod → deploys to PROD instance (after approval gate)
```

**Pipeline trigger:**

```yaml
# GitHub Actions trigger for branch-per-env
on:
  push:
    branches:
      - deploy/dev
      - deploy/test
      - deploy/prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ contains(github.ref, 'deploy/prod') && 'prod' || contains(github.ref, 'deploy/test') && 'test' || 'dev' }}
    steps:
      - uses: actions/checkout@v4
      # ... build and deploy steps using environment-scoped secrets
```

### Trunk-Based Deployment

`main` is always deployable. Environments are selected by git tag or `workflow_dispatch` input — no long-lived deploy branches.

```
main ──────────────────────────────────────────────►
      │           │              │
   commit      commit          commit
      │           │              │
  auto-deploy   tag v1.2.0   workflow_dispatch
  to DEV only   → deploy/test    → deploy/prod
```

**How it works:**

```yaml
# GitHub Actions trigger for trunk-based
on:
  push:
    branches: [main]              # always deploy to dev
  workflow_dispatch:
    inputs:
      target_env:
        description: 'Deploy to which environment?'
        type: choice
        options: [test, prod]
        required: true
      sha:
        description: 'Commit SHA to deploy (defaults to latest main)'
        required: false
  push:
    tags:
      - 'release/*'               # tag push triggers test deploy
```

### Comparison: Branch-per-Environment vs Trunk-Based

| Dimension | Branch-per-Environment | Trunk-Based |
|-----------|------------------------|-------------|
| **Promotion mechanism** | Git merge | Tag or `workflow_dispatch` |
| **Long-lived branches** | Yes (`deploy/dev`, `deploy/test`, `deploy/prod`) | No (only `main`) |
| **Merge conflicts** | Higher risk (branches diverge over time) | Low (single source of truth) |
| **Traceability** | Branch history shows what's in each env | Tags/SHAs show what's in each env |
| **Rollback** | Revert merge commit, re-push deploy branch | Re-run pipeline against earlier SHA/tag |
| **CI complexity** | Simple triggers (branch name → env) | Slightly more logic (tag/input → env) |
| **Team size fit** | Small teams familiar with git-flow | Larger teams; CI/CD-mature organizations |
| **Drift risk** | High (branches can diverge) | Low (one branch, same code everywhere) |
| **Works well with** | Feature-flag-light workflows | Feature flags; immutable artifact pattern |

### When to Use Which Strategy

**Choose branch-per-environment when:**
- The team is more comfortable with git-flow than CI/CD tooling
- You need a simple visual indicator of "what's on prod" (look at `deploy/prod` branch)
- Environment differences require occasional branch-level hotfixes (apply to `deploy/prod` without going through `main`)
- Your pipeline tooling has better branch-trigger support than manual-dispatch support

**Choose trunk-based when:**
- You want to guarantee "what's on prod" is always a commit from `main` with zero drift
- You use the immutable artifact pattern (build once, promote the artifact)
- Your team practices continuous delivery and deploys frequently
- You want simpler branch hygiene — no long-lived branches to maintain
- You already use feature flags to control in-flight work on `main`

> **Recommendation for new projects:** Start with trunk-based. It pairs naturally with the immutable artifact pattern documented above, avoids branch-divergence drift, and scales better as your team and number of scopes grow.

---

## Quick Reference

### Core Deploy Commands

```bash
# Standard deploy — one scope
npx @servicenow/sdk install \
  --scope <scope_name> \
  --url   "$NOW_INSTANCE_URL" \
  --username "$NOW_USERNAME" \
  --password "$NOW_PASSWORD"

# Reinstall (clean deploy — removes non-package metadata first)
npx @servicenow/sdk install \
  --scope <scope_name> \
  --reinstall \
  --url   "$NOW_INSTANCE_URL" \
  --username "$NOW_USERNAME" \
  --password "$NOW_PASSWORD"

# Build before deploying (always run build first)
npx @servicenow/sdk build && \
npx @servicenow/sdk install --scope <scope_name> ...
```

### Environment Variable Checklist

```bash
# Verify all required vars are set before deploying
: "${NOW_INSTANCE_URL:?NOW_INSTANCE_URL is required}"
: "${NOW_USERNAME:?NOW_USERNAME is required}"
: "${NOW_PASSWORD:?NOW_PASSWORD is required}"
```

### Deployment Safety Checklist

- [ ] `npx @servicenow/sdk build` passes with no TypeScript errors
- [ ] Credentials resolved from CI secret store — not from source code
- [ ] Scope dependency order correct (foundations before consumers)
- [ ] Deploying to the intended instance URL (verify before prod!)
- [ ] Approval gate in place for production deploys
- [ ] Git tag created at deploy time for rollback traceability
- [ ] Rollback procedure tested on a non-production environment

---

## Verifying Pipeline Templates

Pipeline templates in this document cannot be run against a live ServiceNow instance in a static validation context. The following verification approach is used to ensure correctness:

### Context7 SDK Verification

The `@servicenow/sdk` CLI commands used in all templates were verified against the official ServiceNow SDK documentation via Context7 (`/websites/servicenow_github_io_sdk`):

| Command | Source |
|---------|--------|
| `npx @servicenow/sdk build` | [servicenow.github.io/sdk](https://servicenow.github.io/sdk) — builds TypeScript → metadata in `dist/app/`; also see [BUILD-WORKFLOW.md](../servicenow-fluent-development/BUILD-WORKFLOW.md) |
| `npx @servicenow/sdk install --url ... --username ... --password ...` | SDK CLI reference — direct credential flags for non-interactive (CI) auth |
| `npx @servicenow/sdk install --reinstall` | [BUILD-WORKFLOW.md](../servicenow-fluent-development/BUILD-WORKFLOW.md) — removes non-package metadata before redeploying |
| `npx @servicenow/sdk install --scope <scope>` | SDK CLI reference — restricts install to a single named scope |

Always cross-reference the installed SDK version's own docs before using in production:

```bash
# Fetch the machine-readable version index
curl https://servicenow.github.io/sdk/versions.json

# Read the llmsFull URL for your exact version and load it as your API reference
```

### Dry-Run Validation (Recommended Before First Real Deployment)

Before deploying to a real instance:

1. **Build locally** — run `npx @servicenow/sdk build` in the project root. A successful local build confirms the TypeScript and schema are correct.
2. **Check secret resolution** — in GitHub Actions, use `echo "URL=${{ secrets.NOW_INSTANCE_URL }}"` (secrets are redacted in logs; any `***` confirms the secret is set).
3. **Deploy to a throwaway dev instance first** — use a personal developer instance (PDI) before targeting shared dev/test environments.
4. **Review workflow run logs** — GitHub Actions and Azure DevOps both show step-by-step output; confirm `npx @servicenow/sdk build` exits 0 and `install` reports successful metadata push.

### CI Template Linting

| Tool | Command | What it checks |
|------|---------|----------------|
| GitHub Actions | [actionlint](https://github.com/rhysd/actionlint) (Go binary, see install instructions) | YAML syntax, expression syntax, secret references |
| Azure DevOps | `az pipelines run --dry-run` | Pipeline parse and validation |

```bash
# Install actionlint (macOS)
brew install actionlint

# Install actionlint (Linux, via download)
bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)

# Lint GitHub Actions workflows
actionlint .github/workflows/deploy.yml
```

---

## See Also

- [SKILL.md](./SKILL.md) — Update Set deployment (classic instances)
- [BEST_PRACTICES.md](./BEST_PRACTICES.md) — Deployment do/don't patterns, Update Set lifecycle
- [servicenow-fluent-development: BUILD-WORKFLOW.md](../servicenow-fluent-development/BUILD-WORKFLOW.md) — Full `now-sdk` command reference, `now.config.json` schema, tsconfig setup
