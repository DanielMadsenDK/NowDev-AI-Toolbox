---
name: servicenow-fluent-development
context: fork
user-invocable: false
description: Navigation and NowDev-specific guardrails for ServiceNow Fluent SDK development. Use when a task involves Fluent `.now.ts` metadata, SDK project layout, NowDev agent handoffs, or local patterns that are not covered by `now-sdk explain`.
---

# ServiceNow Fluent Development

Use this skill for NowDev workflow conventions around Fluent SDK projects. Do **not** use it as API reference for constructors, parameters, imports, enums, CLI flags, or examples.

## Authoritative SDK Source

For `now-sdk` command syntax, flags, and the `explain`/`query` discovery workflow, use `agents/skills/now-sdk/SKILL.md` — the canonical CLI reference. This skill does not duplicate that mechanics.

Always verify current SDK API shape with `now-sdk explain <topic> --format raw` before writing or reviewing Fluent code. If local guidance conflicts with `now-sdk explain`, the installed SDK documentation wins.

## What This Skill Still Owns

- NowDev project layout conventions and agent handoff expectations.
- When to route work to Schema, Logic, Automation, UI, AI Studio, NowAssist, ATF, Review, or Release agents.
- Opinionated local guardrails that prevent repeated NowDev mistakes.
- Links to small local pattern docs that are workflow-oriented rather than SDK reference.

## Local Pattern Docs

Use these only after fetching the relevant SDK topic with `now-sdk explain <topic> --format raw`:

| Need | Local Reference |
|---|---|
| Script Include bridges and module/string-only decision support | [MODULE-GUIDE.md](./MODULE-GUIDE.md) |
| GlideAjax/REST service layering for React UI Pages | [CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md) |
| Third-party React dependencies, Rollup prebuild, CSS bundling | [THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md) |
| `$override` risk policy and review checklist | [OVERRIDE-GUIDE.md](./OVERRIDE-GUIDE.md) |
| Build/runtime troubleshooting workflow | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Advanced NowDev patterns that are not pure SDK reference | [ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md) |

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
- For module-vs-string decisions, verify `now-sdk explain now-include-guide --format raw`, `now-sdk explain module-guide --format raw`, and the artifact-specific API topic.
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
