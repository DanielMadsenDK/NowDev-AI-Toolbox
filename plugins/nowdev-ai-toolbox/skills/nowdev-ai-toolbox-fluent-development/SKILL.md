---
name: nowdev-ai-toolbox-fluent-development
user-invocable: false
description: Navigation and NowDev-specific guardrails for ServiceNow Fluent SDK development. Use when a task involves Fluent `.now.ts` metadata, SDK project layout, NowDev agent handoffs, or local patterns not covered by installed SDK documentation.
---

# ServiceNow Fluent Development

Use this skill for NowDev workflow conventions around Fluent SDK projects. Do **not** use it as API reference for constructors, parameters, imports, enums, CLI flags, or examples.

## Authoritative SDK Source

Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`. It is the sole authority for CLI command construction, flags, documentation and query discovery, authentication, output handling, pagination, and troubleshooting; this skill does not duplicate those mechanics.

Always ask the canonical SDK skill to retrieve the relevant installed documentation topic before writing or reviewing Fluent code. Installed SDK documentation takes absolute precedence and is the sole authority on all SDK APIs; local pattern files or prior knowledge do not apply to SDK API syntax or shapes.

If the canonical SDK skill cannot retrieve the installed documentation, halt and inform the user that SDK verification is required before proceeding. Let that skill classify the CLI failure; do not fall back to local pattern docs or prior knowledge as a substitute for current SDK shape.

## What This Skill Still Owns

- NowDev project layout conventions and agent handoff expectations.
- When to route work to Schema, Logic, Automation, UI, AI Studio, NowAssist, ATF, Review, or Release agents.
- Opinionated local guardrails that prevent repeated NowDev mistakes.
- Links to small local pattern docs that are workflow-oriented rather than SDK reference.

## Local Pattern Docs

Use these local docs ONLY for workflows and patterns not covered by the SDK. Always prioritize installed SDK guides retrieved by `nowdev-ai-toolbox-servicenow-sdk`, and consult these files only for the specific non-API topics they cover:

| Need | Local Reference |
|---|---|
| Build/runtime troubleshooting workflow | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Multi-agent handoff sequencing, artifact naming conventions, and NowDev-specific anti-patterns not addressable by SDK explain topics | [ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md) |

The following used to be local files but are now fully covered by installed SDK documentation. Ask the canonical SDK skill to retrieve these topics:

| Need | SDK Topic |
|---|---|
| JavaScript modules, module/string-only decision support | `module-guide` |
| Script Include bridges (module-to-Script Include pattern) | `script-include-guide` |
| `$override` risk policy and gotchas | `override-guide` |
| React UI Page build model, dirty state, service layer, CSS constraints | `ui-page-patterns-guide` |

## Agent Routing

| Work Type | Agent |
|---|---|
| Tables, Roles, ACLs, Data Policies, Properties, Menus, Lists, Form layouts, Instance Scan checks | NowDev-AI-Fluent-Schema-Developer |
| Business Rules, Script Includes, Script Actions, REST APIs, Email Notifications, SLAs, Scheduled Scripts | NowDev-AI-Fluent-Logic-Developer |
| Flows, Subflows, custom actions/triggers, Playbooks | NowDev-AI-Fluent-Automation-Developer |
| UI Pages, React client code, Client Scripts, UI Policies, UI Actions, Catalog, Portal, Workspaces, Dashboards | NowDev-AI-Fluent-UI-Developer |
| AiAgent, AiAgenticWorkflow | NowDev-AI-AI-Agent-Developer |
| NowAssistSkillConfig | NowDev-AI-NowAssist-Developer |
| Automated Test Framework `Test()` definitions | NowDev-AI-ATF-Developer |
| SDK build/install/release | NowDev-AI-Fluent-Release |
| Code review | NowDev-AI-Fluent-Reviewer |

## Persistent Guardrails

- Verify current SDK shape through `nowdev-ai-toolbox-servicenow-sdk` before writing or reviewing code.
- Use actual workspace facts: `now.config.json`, `.vscode/nowdev-ai-config.json`, generated schema types, and session artifact state.
- Own metadata references should use exported constants such as `table.name` or `record.$id`; use `Now.ref()` for metadata outside the current application.
- Use `Now.include()` for files only where the current SDK topic says the property accepts string content or file inclusion.
- For module-vs-string decisions, first ask the canonical SDK skill for the artifact-specific API topic; if unresolved, request topic `module-guide`, and use topic `now-include-guide` only to confirm file-inclusion syntax. The artifact-specific topic takes precedence over the general guides.
- Run the narrowest available validation after edits, usually an SDK build for Fluent app changes. Delegate command construction and execution mechanics to `nowdev-ai-toolbox-servicenow-sdk`.
- Never delete a `Table()` / `BusinessRule()` / `Record()` definition from a `.now.ts` file without confirming with the user first — the deletion may need to propagate as an upgrade-time delete via `keys.ts`, which the code alone can't reveal. See the required Fluent orientation (`keys-file` topic) in `nowdev-ai-toolbox-servicenow-sdk`.

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

Use this layout as a convention only; API correctness still comes from installed documentation retrieved through `nowdev-ai-toolbox-servicenow-sdk` and the current workspace.
