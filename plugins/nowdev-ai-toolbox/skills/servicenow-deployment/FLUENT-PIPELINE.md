# Fluent SDK CI/CD Pipelines

Use this guide when designing CI/CD for ServiceNow Fluent SDK projects. Prefer live SDK documentation before finalizing a pipeline:

```bash
now-sdk explain ci-integration --format raw
now-sdk explain developing-apps-guide --format raw
```

For local agent work, `now-sdk explain` is the first reference. Use online SDK docs only when the CLI does not cover a required topic.

## Core Principles

- Run SDK commands from the checked-out repository, not from generated output folders.
- Use `npm ci` so CI uses the committed lockfile.
- Run a build before install; never install after a failed build.
- Use `now-sdk build --frozenKeys` in pull request checks to ensure generated `keys.ts` changes were committed.
- Use `now-sdk install` only for non-production automation unless your organization explicitly allows direct automated production installs.
- Store all credentials in the CI platform secret store. Never commit credentials, tokens, instance URLs for restricted environments, or generated `.env` files.
- Prefer OAuth client credentials for regulated/shared CI. Basic auth is acceptable for PDIs and low-risk sandboxes.
- Keep deployment jobs environment-scoped so approvals, secrets, and audit trails are isolated.

## Recommended Pipeline Shape

1. Checkout source.
2. Set up Node.js using the project-supported version.
3. Run `npm ci`.
4. Run `npm run build` or `now-sdk build --frozenKeys` for validation.
5. For deployment branches/environments, run `now-sdk install` with CI environment variables.
6. Publish build logs and deployment summary.

## Required CI Variables

For CI installs, set:

```text
SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL
SN_SDK_INSTANCE_URL=<instance url from secret store>
```

For basic auth:

```text
SN_SDK_AUTH_TYPE=basic
SN_SDK_USER=<service user from secret store>
SN_SDK_USER_PWD=<password from secret store>
```

For OAuth client credentials:

```text
SN_SDK_AUTH_TYPE=oauth
SN_SDK_OAUTH_CLIENT_ID=<client id from secret store>
SN_SDK_OAUTH_CLIENT_SECRET=<client secret from secret store>
```

Always verify the exact supported variables with `now-sdk explain ci-integration --format raw` before generating final YAML.

## GitHub Actions Pattern

Use separate jobs for validation and deployment. Deployment should run only on approved branches or environments.

```yaml
name: ServiceNow Fluent CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx now-sdk build --frozenKeys

  deploy-dev:
    if: github.ref == 'refs/heads/main'
    needs: validate
    runs-on: ubuntu-latest
    environment: dev
    env:
      SN_SDK_NODE_ENV: SN_SDK_CI_INSTALL
      SN_SDK_AUTH_TYPE: oauth
      SN_SDK_INSTANCE_URL: ${{ secrets.SN_SDK_INSTANCE_URL }}
      SN_SDK_OAUTH_CLIENT_ID: ${{ secrets.SN_SDK_OAUTH_CLIENT_ID }}
      SN_SDK_OAUTH_CLIENT_SECRET: ${{ secrets.SN_SDK_OAUTH_CLIENT_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx now-sdk build --frozenKeys
      - run: npx now-sdk install
```

## Azure DevOps Pattern

Use variable groups or Key Vault-backed secrets. Keep environment promotion explicit.

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  - group: servicenow-dev

stages:
  - stage: Validate
    jobs:
      - job: Build
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
          - script: npx now-sdk build --frozenKeys

  - stage: DeployDev
    dependsOn: Validate
    condition: succeeded()
    jobs:
      - deployment: Install
        environment: dev
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: NodeTool@0
                  inputs:
                    versionSpec: '20.x'
                - script: npm ci
                - script: npx now-sdk build --frozenKeys
                - script: npx now-sdk install
                  env:
                    SN_SDK_NODE_ENV: SN_SDK_CI_INSTALL
                    SN_SDK_AUTH_TYPE: oauth
                    SN_SDK_INSTANCE_URL: $(SN_SDK_INSTANCE_URL)
                    SN_SDK_OAUTH_CLIENT_ID: $(SN_SDK_OAUTH_CLIENT_ID)
                    SN_SDK_OAUTH_CLIENT_SECRET: $(SN_SDK_OAUTH_CLIENT_SECRET)
```

## Multi-Scope Projects

If a repository contains multiple Fluent apps, detect every `now.config.json` before generating the pipeline. Prefer parallel matrix jobs when scopes do not depend on each other.

Pipeline agents should read the repository structure first and only use `--scope` when the current SDK docs confirm the flag is applicable for the command being generated.

## Promotion Strategy

- **Pull requests:** build with `--frozenKeys`; do not install.
- **Main branch:** install to dev/integration after validation.
- **Test/UAT:** require environment approval and use separate secrets.
- **Production:** prefer ServiceNow app promotion processes unless the organization explicitly approves direct SDK install automation.

## Rollback

For source-driven rollback, deploy a known-good revision:

```bash
git checkout <tag-or-commit>
npm ci
now-sdk build --frozenKeys
now-sdk install
```

Document any data migrations separately. SDK install handles app metadata, not arbitrary production data rollback.

## Pipeline Review Checklist

- [ ] No plaintext credentials or tokens.
- [ ] `npm ci` used instead of `npm install` in CI.
- [ ] Build runs before install.
- [ ] Pull request validation uses `--frozenKeys`.
- [ ] Environment-specific secrets are isolated.
- [ ] Production deployment policy is explicit.
- [ ] Multi-scope jobs are parallel unless dependencies require ordering.
- [ ] Generated YAML uses `npx now-sdk` or project scripts, not an assumed global SDK install.
