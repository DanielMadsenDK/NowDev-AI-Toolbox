# Exemplars — Canonical Code Shapes

Each file here is the minimal "what good looks like" for a specific ServiceNow artifact type. Agents pattern-match to these shapes rather than reasoning from prose alone.

## Fluent SDK

| File | Artifact Type | Agent Reference |
|------|--------------|-----------------|
| `fluent-table.now.ts` | Fluent Table + Role + ACL | NowDev-AI-Fluent-Schema-Developer |
| `fluent-script-include.now.ts` | Fluent ScriptInclude (string-only bridge) | NowDev-AI-Fluent-Logic-Developer |
| `fluent-business-rule.now.ts` | Fluent BusinessRule (function-accepting) | NowDev-AI-Fluent-Logic-Developer |
| `atf-test-step.now.ts` | Fluent ATF Test + TestSuite | NowDev-AI-ATF-Developer |

### API names added in SDK 4.8

Load `nowdev-ai-toolbox-servicenow-sdk` and retrieve the listed installed-documentation topic before using these APIs. The SDK skill is the sole authority for `now-sdk` CLI mechanics.

| API | Artifact Type | Installed-documentation topic | Agent Reference |
|-----|--------------|------------------------|-----------------|
| `PlaybookDefinition` | Playbook (triggers, lanes, activities, decisions) | `playbookdefinition-api`, `wfa-playbook-guide` | NowDev-AI-Fluent-Automation-Developer |
| `RestMessage` | Outbound REST integration (sys_rest_message) | `restmessage-api` | NowDev-AI-Fluent-Schema-Developer |
| `Alias` | Connection & Credential alias (sys_alias) | `alias-api` | NowDev-AI-Fluent-Schema-Developer |
| `AliasTemplate` | Alias configuration template (sys_alias_templates) | `aliastemplate-api` | NowDev-AI-Fluent-Schema-Developer |
| `RetryPolicy` | Outbound retry policy (sys_retry_policy) | `retrypolicy-api` | NowDev-AI-Fluent-Schema-Developer |
| `DataLookup` | Data lookup definition (dl_definition) | `datalookup-api` | NowDev-AI-Fluent-Schema-Developer |
| `Now.del()` | Declarative record deletion (by coalesce key, Now.ID, or GUID) | `now.del` | NowDev-AI-Fluent-Schema-Developer |

## Classic Scripting

Classic script bodies live inside Fluent artifacts (function-accepting APIs or `Now.include()` files), so the owning agents are the Fluent specialists.

| File | Artifact Type | Agent Reference |
|------|--------------|-----------------|
| `classic-business-rule.js` | Business Rule IIFE wrapper + Display Business Rule g_scratchpad | NowDev-AI-Fluent-Logic-Developer |
| `classic-client-script.js` | onChange (isLoading guard + async GlideAjax) + onLoad (g_scratchpad) | NowDev-AI-Fluent-UI-Developer |

**Keep these fresh.** A stale exemplar that agents copy from is worse than no exemplar. Update when SDK patterns or naming conventions change.
