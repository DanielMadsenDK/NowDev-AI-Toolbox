---
name: nowdev-agent-authoring
description: Guide for creating and maintaining agent .agent.md files in this repository. Use when asked to add, update, refactor, or review agents in agents/github-copilot/ or .github/agents/.
---

## Two Agent Targets

This repository has two agent locations, but they do not play the same role.

| Location | Target | Used by |
|----------|--------|---------|
| `agents/github-copilot/` | Source of truth for bundled agent templates | Parsed by `src/AgentRegistry.ts`, shown in the sidebar, and synced into the workspace by `src/WorkspaceAgentManager.ts` |
| `.github/agents/` | Generated workspace output discovered by Copilot in the current workspace | Written by the extension, stamped as managed, and added to `.gitignore` |

In current repo behavior, you almost always edit `agents/github-copilot/` first and let the extension regenerate `.github/agents/`.

Do **not** assume a `package.json -> contributes.chatAgents` registration step exists here. It currently does not. Agent discovery in this project is driven by filesystem parsing and sync, not by package contributions.

## Source vs Generated Files

The extension currently:

- reads bundled source agents from `agents/github-copilot/`
- parses frontmatter with `AgentRegistry.ts`
- writes generated workspace copies to `.github/agents/`
- prepends `# nowdev-managed: true` and a `# nowdev-hash:` line to managed outputs
- injects MCP tools, doc-source substitutions, and agent enable/disable filtering during sync

Practical rule: edit `agents/github-copilot/` unless the task is explicitly about generated output behavior or managed hashes in `.github/agents/`.

## Skill Before Agent Gate

Skills are the default extension mechanism for reusable ServiceNow knowledge and task mechanics. Do not create a new agent merely to package instructions, query recipes, validation rules, examples, or a repeatable workflow that an existing agent can invoke.

Create or extend a skill when the capability:

- can run inside an existing agent's ownership and tool permissions
- provides reusable ServiceNow guidance, data retrieval, diagnosis, validation, or implementation mechanics
- does not need to coordinate child agents or own a separate handoff lifecycle
- should be available to several roles without duplicating prompt content

Create a new agent only when at least one of these is true:

- it owns a distinct implementation or decision boundary that existing agents must delegate to
- it requires a materially different tool or permission profile, such as read-only review versus file-writing implementation
- it coordinates child agents, dependencies, approvals, or handoffs as a persistent role
- it is an intentionally separate user-facing entry point with a stable responsibility

If none applies, stop agent creation and route the work to `.github/skills/nowdev-skill-authoring/SKILL.md`. Bundled skills must also pass that guide's Product Scope Gate: this project contains general ServiceNow capabilities, while company-specific business workflows belong in the consuming organization's own repository or private plugin.

## SDK Authority Gate

`nowdev-ai-toolbox-servicenow-sdk` is the sole authority for `now-sdk` CLI mechanics. Any agent that mentions or invokes `now-sdk` must load or explicitly reference that skill.

Agent prompts may specify why SDK access is needed, documentation topic IDs, target tables and fields, evidence requirements, safety boundaries, and how results affect the workflow. They must not contain complete `now-sdk` commands, aliases, flags, output-format recipes, pagination mechanics, authentication setup, or retry syntax. Even release agents describe operations such as build, dependency synchronization, and install conceptually; the SDK skill constructs and validates the command at runtime.

When editing an agent that uses `now-sdk`, verify both conditions:

1. The prompt references `nowdev-ai-toolbox-servicenow-sdk` as the command authority.
2. All CLI syntax and mechanics live only in that skill.

## Agent Frontmatter

This example is a complete baseline for a Fluent implementation specialist. It is not a universal allow-list: coordinators add `agent`, browser-facing roles add `browser`, and read-only roles omit `edit/*`.

```yaml
---
name: Display Name
user-invocable: true | false       # false = sub-agent only, never shown in user dropdown
description: <purpose>
agents: []
tools: [vscode/memory, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/askQuestions, vscode/toolSearch, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/runTask, execute/createAndRunTask, execute/runInTerminal, read/problems, read/readFile, read/viewImage, read/skill, read/terminalSelection, read/terminalLastCommand, read/getTaskOutput, edit/createDirectory, edit/createFile, edit/editFiles, edit/rename, search, web, todo]
---
```

`src/AgentRegistry.ts` parses frontmatter with the `yaml` package. Inline arrays remain the repository convention because sync helpers rewrite `tools` and `agents` in that form, but valid multiline YAML arrays are accepted on input.

The manifest currently reads `name`, `description`, `user-invocable`, `disable-model-invocation`, `argument-hint`, `model`, `target`, `tools`, `agents`, `handoffs`, `mcp-servers`, and `hooks`, while preserving the raw frontmatter and declared field names.

## Tool Selection

Choose tools from the agent's responsibilities, not from one global maximum list. Start from the nearest existing role in `agents/github-copilot/`, then add or remove capabilities deliberately.

| Family | Current source-agent tools | Use when |
|--------|----------------------------|----------|
| Session and VS Code | `vscode/memory`, `vscode/resolveMemoryFileUri`, `vscode/runCommand`, `vscode/askQuestions`, `vscode/toolSearch` | The agent needs persistent/session context, VS Code commands, user clarification, or deferred-tool discovery |
| Terminal execution | `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/sendToTerminal`, `execute/killTerminal`, `execute/runTask`, `execute/createAndRunTask` | The role runs SDK commands, builds, tests, linters, tasks, or interactive terminal flows |
| Workspace reads | `read/readFile`, `read/problems`, `read/viewImage`, `read/skill`, `read/terminalSelection`, `read/terminalLastCommand`, `read/getTaskOutput` | Select only the evidence sources the role must inspect |
| Workspace writes | `edit/createDirectory`, `edit/createFile`, `edit/editFiles`, `edit/rename` | Implementation roles that own file changes; omit from reviewers, debuggers, release agents, and planners |
| Delegation | `agent` | Coordinators or orchestrators with a non-empty `agents: [...]` allow-list; omit from leaf agents |
| Discovery | `search`, `web` | Repository search and supplemental external research |
| Browser | `browser` | Roles that inspect or demonstrate browser/instance UI; define read-only behavior in the prompt when required |
| Tracking | `todo` | Multi-step work that benefits from explicit progress tracking |

Configured MCP tools are not a fixed source-agent list. `WorkspaceAgentManager` injects selected MCP server tools into eligible generated agents and expands configured documentation sources during synchronization. Do not hardcode a specific MCP server such as Context7 unless that server is an intentional, mandatory dependency of the agent.

### Role Baselines

- **Orchestrator:** full read, execution, edit, search/web, browser, tracking, user-interaction, and `agent` capabilities.
- **Coordinator:** implementation baseline plus `agent`; browser only when the coordinator directly owns browser work.
- **Implementation specialist:** full read, execution, edit, search/web, tracking, and user-interaction capabilities; no `agent` and normally no browser.
- **Reviewer or debugger:** read, diagnostics, validation execution, search/web, tracking, and user-interaction capabilities; no `edit/*`. Debuggers may receive `browser` for read-only diagnostics.
- **Release agent:** read and execution capabilities required for build/install plus search/web and tracking; no source editing.
- **Refinement/planning agent:** read, search/web, skill lookup, user clarification, memory, and tracking; no execution, browser, delegation, or write tools unless its workflow explicitly requires them.

The exact canonical sets live in `agents/github-copilot/AGENT-PATTERNS.md`. The actual `tools:` field in the nearest current source agent is the final local reference because tool availability evolves with VS Code and Copilot.

Current VS Code prompt bodies in this repo use XML-like blocks:
- `<workflow>` — numbered steps Copilot follows
- `<stopping_rules>` — `STOP IF` safety conditions
- `<documentation>` — where to look up APIs (configured documentation sources, `now-sdk explain`, and skill file paths)
- additional sections such as `<context_conservation>` or `<state_tracking>` when an agent needs them

When editing source agents, preserve any template tokens that are intentionally substituted during sync, such as:

- `{{DEVOPS_PREAMBLE}}`
- `{{DEVOPS_CUSTOM_INSTRUCTIONS}}`
- MCP instruction placeholders used by documentation-source injection

## Generated Workspace Agents

Generated `.github/agents/*.agent.md` files retain the source agent shape. During synchronization, the extension:

- injects configured MCP and documentation-source tools
- applies model and tool overrides
- prunes disabled agents from parent allow-lists
- substitutes profile, custom-instruction, DevOps, and documentation tokens
- stamps managed files with a content hash

Do not maintain a separate simplified "cloud" frontmatter contract in this guide unless the repository introduces a distinct cloud-agent source tree.

## VS Code Agent Hierarchy

```
NowDev AI Agent (orchestrator, user-invocable: true)
├── NowDev-AI-Assistant (support)
├── NowDev-AI-Refinement (support)
├── NowDev-AI-Fluent-Developer (coordinator)
│   ├── NowDev-AI-Fluent-Schema-Developer
│   ├── NowDev-AI-Fluent-Logic-Developer
│   ├── NowDev-AI-Fluent-Automation-Developer
│   ├── NowDev-AI-Fluent-UI-Developer
│   ├── NowDev-AI-AI-Agent-Developer
│   ├── NowDev-AI-NowAssist-Developer
│   └── NowDev-AI-ATF-Developer
├── NowDev-AI-Debugger
├── NowDev-AI-Fluent-Reviewer
└── NowDev-AI-Fluent-Release
```

## Read Before Writing

For VS Code agents, always read `agents/github-copilot/AGENT-PATTERNS.md` before creating or editing — it contains the canonical tool sets and patterns that must be followed.

For generated workspace agents, read an existing file in `.github/agents/` and check whether it is extension-managed before editing.

When working on source agents, also read:

- `src/AgentRegistry.ts` to understand what frontmatter the sidebar/parser actually consumes
- `src/WorkspaceAgentManager.ts` to understand generated-file behavior, MCP injections, and managed hash stamping
- `src/agentSync/` for frontmatter transforms, bundle membership, token substitution, and generated instruction/prompt behavior

When adding a new VS Code agent that is user-invocable (or a key sub-agent), check whether `src/AgentTopology.ts` needs a corresponding `AgentNode` entry to display it in the sidebar.

When adding a new source agent, there is normally **no** `package.json` agent registration step in this repo. The meaningful follow-up checks are:

1. Does `AgentRegistry.ts` parse the file shape correctly?
2. Does `WorkspaceAgentManager.ts` and `src/agentSync/` sync it into `.github/agents/` correctly?
3. Does `AgentTopology.ts` need an entry for sidebar visualization?
4. Does `npm run validate:agents` pass?
