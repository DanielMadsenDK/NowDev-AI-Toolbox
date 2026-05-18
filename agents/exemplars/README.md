# Exemplars — Canonical Code Shapes

Each file here is the minimal "what good looks like" for a specific ServiceNow artifact type. Agents pattern-match to these shapes rather than reasoning from prose alone.

## Fluent SDK

| File | Artifact Type | Agent Reference |
|------|--------------|-----------------|
| `fluent-table.now.ts` | Fluent Table + Role + ACL | NowDev-AI-Fluent-Schema-Developer |
| `fluent-script-include.now.ts` | Fluent ScriptInclude (string-only bridge) | NowDev-AI-Fluent-Logic-Developer |
| `fluent-business-rule.now.ts` | Fluent BusinessRule (function-accepting) | NowDev-AI-Fluent-Logic-Developer |
| `atf-test-step.now.ts` | Fluent ATF Test + TestSuite | NowDev-AI-ATF-Developer |

## Classic Scripting

| File | Artifact Type | Agent Reference |
|------|--------------|-----------------|
| `classic-gliderecord.js` | GlideRecord query loop + secure insert | NowDev-AI-Script-Developer, NowDev-AI-BusinessRule-Developer |
| `classic-script-include.js` | Script Include — `Class.create()`, try/catch, private prefix | NowDev-AI-Script-Developer |
| `classic-glideajax.js` | Client-callable Script Include extending `AbstractAjaxProcessor` | NowDev-AI-Script-Developer |
| `classic-business-rule.js` | Business Rule IIFE wrapper + Display Business Rule g_scratchpad | NowDev-AI-BusinessRule-Developer |
| `classic-client-script.js` | onChange (isLoading guard + async GlideAjax) + onLoad (g_scratchpad) | NowDev-AI-Client-Developer |

## CI/CD Pipelines

| File | Artifact Type | Agent Reference |
|------|--------------|-----------------|
| `github-actions-branch-per-env.yml` | GitHub Actions — branch-per-environment deploy | NowDev-AI-Pipeline-Expert |
| `github-actions-trunk.yml` | GitHub Actions — trunk-based deploy (semver tags + dispatch) | NowDev-AI-Pipeline-Expert |
| `github-actions-multi-scope.yml` | GitHub Actions — parallel matrix for multiple SDK scopes | NowDev-AI-Pipeline-Expert |
| `github-actions-rollback.yml` | GitHub Actions — rollback to a previous tag | NowDev-AI-Pipeline-Expert |
| `azure-devops-branch-per-env.yml` | Azure DevOps — branch-per-environment deploy with variable groups | NowDev-AI-Pipeline-Expert |
| `branching-strategy-branch-per-env.md` | Branching strategy doc — branch-per-environment | NowDev-AI-Pipeline-Expert |
| `branching-strategy-trunk.md` | Branching strategy doc — trunk-based development | NowDev-AI-Pipeline-Expert |

**Keep these fresh.** A stale exemplar that agents copy from is worse than no exemplar. Update when SDK patterns or naming conventions change.
