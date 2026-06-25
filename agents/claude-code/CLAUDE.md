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
| Fluent SDK development | `agents/skills/servicenow-fluent-development/SKILL.md` |
| Business Rules | `agents/skills/servicenow-business-rules/SKILL.md` |
| Client Scripts | `agents/skills/servicenow-client-scripts/SKILL.md` |
| Script Includes / Server Logic | `agents/skills/servicenow-script-server-logic/SKILL.md` |
| Data Manipulation (GlideRecord) | `agents/skills/servicenow-manipulate-data/SKILL.md` |
| Flow Designer (Classic) | `agents/skills/servicenow-flow-designer/SKILL.md` |
| Deployment & Update Sets | `agents/skills/servicenow-deployment/SKILL.md` |
| HTTP Integrations (REST/SOAP) | `agents/skills/servicenow-http-integrations/SKILL.md` |
| Date/Time Operations | `agents/skills/servicenow-server-date-time/SKILL.md` |
| Security & Encryption | `agents/skills/servicenow-server-security/SKILL.md` |
| UI Forms (g_form) | `agents/skills/servicenow-ui-forms/SKILL.md` |
| AI Agent Studio | `agents/skills/servicenow-ai-agent-studio/SKILL.md` |
| NowAssist Skills | `agents/skills/servicenow-now-assist/SKILL.md` |
| Instance Scan Checks | `agents/skills/servicenow-instance-scan/SKILL.md` |
| React UI Components | `agents/skills/servicenow-react-ui-components/SKILL.md` |

## Fluent SDK Documentation

For Fluent SDK APIs, guides, and CLI behavior, use the installed SDK docs:

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
