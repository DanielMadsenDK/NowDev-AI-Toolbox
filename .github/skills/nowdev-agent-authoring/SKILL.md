---
name: nowdev-agent-authoring
description: Guide for creating and maintaining agent .agent.md files in this repository. Use when asked to add, update, refactor, or review agents in agents/github-copilot/ or .github/agents/.
---

## Two Agent Targets

This repository has two agent locations, but they do not play the same role.

| Location | Target | Used by |
|----------|--------|---------|
| `agents/github-copilot/` | Source of truth for bundled agent templates | Parsed by `src/AgentRegistry.ts`, shown in the sidebar, and synced into the workspace by `src/WorkspaceAgentManager.ts` |
| `.github/agents/` | Generated workspace output / cloud-facing workspace agents | Written by the extension, stamped as managed, and added to `.gitignore` |

In current repo behavior, you almost always edit `agents/github-copilot/` first and let the extension regenerate `.github/agents/`.

Do **not** assume a `package.json -> contributes.chatAgents` registration step exists here. It currently does not. Agent discovery in this project is driven by filesystem parsing and sync, not by package contributions.

## Source vs Generated Files

The extension currently:

- reads bundled source agents from `agents/github-copilot/`
- parses frontmatter with `AgentRegistry.ts`
- writes generated workspace copies to `.github/agents/`
- prepends `# nowdev-managed: true` and a `# nowdev-hash:` line to managed outputs
- injects MCP tools, doc-source substitutions, and agent enable/disable filtering during sync

Practical rule: edit `agents/github-copilot/` unless the task is explicitly about generated output behavior, managed hashes, or cloud-side files in `.github/agents/`.

## VS Code Agent Frontmatter

```yaml
---
name: Display Name
user-invocable: true | false       # false = sub-agent only, never shown in user dropdown
description: <purpose>
agents: ['Child Agent A', 'Child Agent B']
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web', 'todo', 'vscode/memory', 'io.github.upstash/context7/*']
---
```

Important current parser constraints from `src/AgentRegistry.ts`:

- `tools: [...]` must stay on a single line
- `agents: [...]` must stay on a single line
- The sidebar manifest currently reads `name`, `description`, `user-invocable`, `tools`, and `agents`
- Additional frontmatter fields may still be useful to Copilot, but they are not used by the extension sidebar/parser unless code support is added

Current VS Code prompt bodies in this repo use XML-like blocks:
- `<workflow>` — numbered steps Copilot follows
- `<stopping_rules>` — `STOP IF` safety conditions
- `<documentation>` — where to look up APIs (Context7 library IDs, skill file paths)
- additional sections such as `<context_conservation>` or `<state_tracking>` when an agent needs them

When editing source agents, preserve any template tokens that are intentionally substituted during sync, such as:

- `{{DEVOPS_PREAMBLE}}`
- `{{DEVOPS_CUSTOM_INSTRUCTIONS}}`
- MCP instruction placeholders used by documentation-source injection

## Cloud Agent Frontmatter

Cloud agents have a **smaller, different** set of supported properties:

```yaml
---
name: optional-display-name
description: Required description of what this agent does.
target: github-copilot
tools: ["read", "edit", "search", "web", "github/*", "context7/*"]
---
```

**Properties silently ignored in cloud agents:**
- `handoffs` — no agent-to-agent orchestration in cloud
- `argument-hint` — not used
- `vscode/memory`, `todo`, `browser/*` — not available as cloud tools

Cloud agent prompts use plain Markdown — no XML blocks needed.

## Cloud Tool Aliases

| Alias | Maps to |
|-------|---------|
| `read` | Read file contents |
| `edit` | Create / edit / write files |
| `search` | Grep + glob file search |
| `execute` | Shell / bash execution |
| `web` | Web search and fetch |
| `agent` | Invoke another custom agent |
| `github/*` | All GitHub MCP read-only tools (issues, PRs, repo context) |
| `context7/*` | Context7 MCP documentation lookup |

## Standard Tool Sets by Role (Cloud)

| Role | Tools |
|------|-------|
| Skill / doc author | `read`, `edit`, `search`, `web`, `github/*`, `context7/*` |
| Agent author | `read`, `edit`, `search`, `github/*`, `context7/*` |
| Extension developer | `read`, `edit`, `search`, `execute`, `github/*`, `context7/*` |
| Content reviewer | `read`, `search`, `web`, `edit`, `github/*`, `context7/*` |
| Planner (read-only) | `read`, `search`, `web`, `github/*` |

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
├── NowDev-AI-Fluent-Release
└── NowDev-AI-Pipeline-Expert
```

## Read Before Writing

For VS Code agents, always read `agents/github-copilot/AGENT-PATTERNS.md` before creating or editing — it contains the canonical tool sets and patterns that must be followed.

For generated workspace/cloud-facing agents, read an existing file in `.github/agents/` and check whether it is extension-managed before editing.

When working on source agents, also read:

- `src/AgentRegistry.ts` to understand what frontmatter the sidebar/parser actually consumes
- `src/WorkspaceAgentManager.ts` to understand generated-file behavior, MCP injections, and managed hash stamping

When adding a new VS Code agent that is user-invocable (or a key sub-agent), check whether `src/AgentTopology.ts` needs a corresponding `AgentNode` entry to display it in the sidebar.

When adding a new source agent, there is normally **no** `package.json` agent registration step in this repo. The meaningful follow-up checks are:

1. Does `AgentRegistry.ts` parse the file shape correctly?
2. Does `WorkspaceAgentManager.ts` sync it into `.github/agents/` correctly?
3. Does `AgentTopology.ts` need an entry for sidebar visualization?
