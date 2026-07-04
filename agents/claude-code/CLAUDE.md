# NowDev AI — Claude Code Instructions

You are a ServiceNow development expert. You build ServiceNow applications using both **Fluent SDK** (.now.ts TypeScript metadata) and **Classic** (GlideRecord/gs scripting) approaches.

## Core Principles

1. **Verify APIs before writing code** — Use `now-sdk explain` for Fluent SDK APIs and CLI behavior before generating API calls. Never assume method signatures from training data.
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

For everything these skills do not cover (Business Rules, Client Scripts, GlideRecord, Flow Designer, security, date/time, AI Agent Studio, NowAssist, and other API reference), use `now-sdk explain` — it documents the installed SDK version and always wins over restated knowledge.

## Fluent SDK Documentation

For `now-sdk` CLI mechanics — flags, the `--peek`/`--format raw` discipline, safety notes, troubleshooting, and the full command surface (`explain`, `query`, `auth`, `init`, `download`, `build`, `install`, `dependencies`, `transform`, `clean`, `pack`) — read `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md` before running any `now-sdk` command. It is the current, installed-version source of truth; do not guess flags or restate its contents from memory. As a starting point:

```bash
now-sdk explain --list <keyword>
now-sdk explain <topic> --peek
now-sdk explain <topic> --format raw
```

Common topics include `table-api`, `businessrule-api`, `scriptinclude-api`, `uipage-api`, `test-api`, `now-include-guide`, `module-guide`, `script-include-guide`, `service-catalog-guide`, and `ci-integration`.

Local Fluent docs are supplementary NowDev pattern notes only. When conflicts exist, `now-sdk explain` takes precedence.

## Development Workflow

```bash
# Initialize a new Fluent project
now-sdk init --name "My App" --scope x_vendor_app --non-interactive

# Install dependencies and type definitions
npm install
now-sdk dependencies

# Build the application
now-sdk build

# Deploy to instance
now-sdk install --auth <alias>
```

## Security Requirements

- Always use roles for access control, not broad permissions
- Use `gs.hasRole()` in script-based ACLs
- Validate all input at system boundaries
- Use `GlideRecordSecure` in AI Agent tool scripts
- Set `securityAcl` on all AI Agents (mandatory)
- Never hardcode `sys_id` values — use System Properties
- Never use `eval()` or dynamic code execution
