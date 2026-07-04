---
name: nowdev-ai-toolbox-fluent-development
context: fork
user-invocable: false
description: Navigation and NowDev-specific guardrails for ServiceNow Fluent SDK development. Use when a task involves Fluent `.now.ts` metadata, SDK project layout, NowDev agent handoffs, or local patterns that are not covered by `now-sdk explain`.
---

# ServiceNow Fluent Development

Use this skill for NowDev workflow conventions around Fluent SDK projects. Do **not** use it as API reference for constructors, parameters, imports, enums, CLI flags, or examples.

## Authoritative SDK Source

For `now-sdk` command syntax, flags, and the `explain`/`query` discovery workflow, use `agents/skills/now-sdk/SKILL.md` — the canonical CLI reference. This skill does not duplicate that mechanics.

Always verify current SDK API shape with `now-sdk explain <topic> --format raw` before writing or reviewing Fluent code. Installed SDK documentation always takes absolute precedence and is the sole authority on all SDK APIs; local pattern files or prior knowledge do not apply to SDK API syntax or shapes.

If `now-sdk explain` is unavailable or returns an error, halt and inform the user that SDK verification is required before proceeding. Do not fall back to local pattern docs or prior knowledge as a substitute for current SDK shape.

## What This Skill Still Owns

- NowDev project layout conventions and agent handoff expectations.
- When to route work to Schema, Logic, Automation, UI, AI Studio, NowAssist, ATF, Review, or Release agents.
- Opinionated local guardrails that prevent repeated NowDev mistakes.
- Links to small local pattern docs that are workflow-oriented rather than SDK reference.

## Local Pattern Docs

Use these local docs ONLY for workflows and patterns not covered by the SDK. Always prioritize the SDK `explain` guides, and consult these files only for the specific non-API topics they cover:

| Need | Local Reference |
|---|---|
| Build/runtime troubleshooting workflow | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Multi-agent handoff sequencing, artifact naming conventions, and NowDev-specific anti-patterns not addressable by SDK explain topics | [ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md) |

The following used to be local files but are now fully covered by the installed SDK's own docs — fetch these `explain` topics directly instead:

| Need | SDK Topic |
|---|---|
| JavaScript modules, module/string-only decision support | `now-sdk explain module-guide --format raw` |
| Script Include bridges (module-to-Script Include pattern) | `now-sdk explain script-include-guide --format raw` |
| `$override` risk policy and gotchas | `now-sdk explain override-guide --format raw` |
| React UI Page build model, dirty state, service layer, CSS constraints | `now-sdk explain ui-page-patterns-guide --format raw` |

## Agent Routing

| Work Type | Agent |
|---|---|
| Tables, Roles, ACLs, Data Policies, Properties, Menus, Lists, Form layouts, Instance Scan checks | NowDev-AI-Fluent-Schema-Developer |
| Business Rules, Script Includes, Script Actions, REST APIs, Email Notifications, SLAs, Scheduled Scripts | NowDev-AI-Fluent-Logic-Developer |
| Flows, Subflows, custom actions/triggers, Playbooks | NowDev-AI-Fluent-Automation-Developer |
| UI Pages, React client code, Client Scripts, UI Policies, UI Actions, Catalog, Portal, Workspaces, Dashboards | NowDev-AI-Fluent-UI-Developer |
| AiAgent, AiAgenticWorkflow, NowAssistSkillConfig | NowDev-AI-AI-Studio-Developer |
| Automated Test Framework `Test()` definitions | NowDev-AI-ATF-Developer |
| SDK build/install/release | NowDev-AI-Fluent-Release |
| Code review | NowDev-AI-Fluent-Reviewer |

## Persistent Guardrails

- Verify current SDK shape with `now-sdk explain` before writing or reviewing code.
- Use actual workspace facts: `now.config.json`, `.vscode/nowdev-ai-config.json`, generated schema types, and session artifact state.
- Own metadata references should use exported constants such as `table.name` or `record.$id`; use `Now.ref()` for metadata outside the current application.
- Use `Now.include()` for files only where the current SDK topic says the property accepts string content or file inclusion.
- For module-vs-string decisions, first check the artifact-specific API topic; if unresolved, check `now-sdk explain module-guide --format raw`; use `now-sdk explain now-include-guide --format raw` only to confirm file-inclusion syntax. The artifact-specific topic takes precedence over the general guides.
- Run the narrowest available validation after edits, usually `now-sdk build` for Fluent app changes.

## Project Layout Convention

Prefer existing project layout when present. For new Fluent projects, use clear ownership folders such as:

```text
src/fluent/tables/
src/fluent/script-includes/
src/fluent/business-rules/
src/fluent/ui-pages/
src/fluent/flows/
src/client/
src/tests/
```

Use this layout as a convention only; API correctness still comes from `now-sdk explain` and the current workspace.
