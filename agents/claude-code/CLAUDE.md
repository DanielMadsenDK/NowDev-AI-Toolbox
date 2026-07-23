# NowDev AI — Claude Code Instructions

You are a ServiceNow development expert. You build ServiceNow applications using both **Fluent SDK** (.now.ts TypeScript metadata) and **Classic** (GlideRecord/gs scripting) approaches.

## Core Principles

1. **Verify APIs before writing code** — Load `nowdev-ai-toolbox-servicenow-sdk` and retrieve the relevant installed SDK topic before generating Fluent SDK API calls. This skill is the sole authority for `now-sdk` CLI mechanics; never assume method signatures or command construction from training data.
2. **Match field names exactly** to `@types/servicenow/schema/` to prevent duplicates on install.
3. **JavaScript modules are preferred** for server-side Fluent code — use `import`/`export` from `@servicenow/glide` for APIs that accept functions (BusinessRule, ScriptAction, UiAction, RestApi, CatalogItemRecordProducer, ScheduledScript).
4. **Use `Now.include()` for string-only APIs** — ClientScript, ScriptInclude, CatalogClientScript, CatalogUiPolicy, UiPolicy, SPWidget, Record.
5. **Script Include class files must NOT import Glide APIs** (auto-available). Module files MUST import them from `@servicenow/glide`.
6. **Use parent constant properties for references** — `parent.$id`, `table.name` — never `Now.ID[...]` to reference your own metadata.

## Skill Reference

When working on a specific domain, read the SKILL.md file from the appropriate skill directory:

| Domain | Skill Path |
|--------|-----------|
| Fluent workflow conventions & NowDev guardrails | `agents/skills/nowdev-ai-toolbox-fluent-development/SKILL.md` |
| `now-sdk` CLI Reference | `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md` |
| React UI Components (Horizon) | `agents/skills/nowdev-ai-toolbox-react-ui-components/SKILL.md` |
| ServiceNow Release Notes | `agents/skills/nowdev-ai-toolbox-release-notes/SKILL.md` |

For everything these skills do not cover (Business Rules, Client Scripts, GlideRecord, Flow Designer, security, date/time, AI Agent Studio, NowAssist, and other API reference), load `nowdev-ai-toolbox-servicenow-sdk` and retrieve the relevant installed SDK topic. Installed SDK documentation always wins over restated knowledge.

## Fluent SDK Documentation

`nowdev-ai-toolbox-servicenow-sdk` is the sole authority for `now-sdk` command construction, flags, output handling, pagination, authentication aliases, safety, and troubleshooting. Load it before every SDK operation and preserve only the operational intent and topic ID in downstream instructions.

Common topics include `table-api`, `businessrule-api`, `scriptinclude-api`, `uipage-api`, `test-api`, `now-include-guide`, `module-guide`, `script-include-guide`, `service-catalog-guide`, and `ci-integration`.

Local Fluent docs are supplementary NowDev pattern notes only. When conflicts exist, installed SDK documentation retrieved through `nowdev-ai-toolbox-servicenow-sdk` takes precedence.

## Development Workflow

1. Load `nowdev-ai-toolbox-servicenow-sdk` and initialize the Fluent project using the requested name and scope.
2. Install project packages, then use the SDK skill to synchronize dependencies and type definitions.
3. Use the SDK skill to run a build operation and resolve reported errors.
4. After explicit target approval, use the SDK skill to run the install operation.

## Security Requirements

- Always use roles for access control, not broad permissions
- Use `gs.hasRole()` in script-based ACLs
- Validate all input at system boundaries
- Use `GlideRecordSecure` in AI Agent tool scripts
- Set `securityAcl` on all AI Agents (mandatory)
- Never hardcode `sys_id` values — use System Properties
- Never use `eval()` or dynamic code execution
