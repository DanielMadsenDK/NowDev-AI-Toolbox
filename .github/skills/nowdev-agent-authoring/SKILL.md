---
name: nowdev-agent-authoring
description: Guide for creating and maintaining agent .agent.md files in this repository. Use when asked to add, update, refactor, or review agents in agents/github-copilot/ or .github/agents/.
---

## Two Agent Targets

This repository has two sets of agent files with different property support:

| Location | Target | Used by |
|----------|--------|---------|
| `agents/github-copilot/` | VS Code | GitHub Copilot Chat in VS Code (loaded via `package.json` chatAgents) |
| `.github/agents/` | Cloud | GitHub Copilot cloud agent on GitHub.com |

When creating a new agent, decide which target(s) it belongs to.

## VS Code Agent Frontmatter

```yaml
---
name: Display Name
user-invocable: true | false       # false = sub-agent only, never shown in user dropdown
disable-model-invocation: true     # only set on leaf specialists to prevent auto-selection
description: <purpose>
argument-hint: "<what caller should pass>"
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web', 'todo', 'vscode/memory', 'io.github.upstash/context7/*']
handoffs:
  - label: Back to <Parent>
    agent: <Parent Agent Name>
    prompt: <handoff message>
    send: true
---
```

VS Code prompt structure uses XML-like blocks:
- `<workflow>` — numbered steps Copilot follows
- `<stopping_rules>` — `STOP IF` safety conditions
- `<documentation>` — where to look up APIs (Context7 library IDs, skill file paths)

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
├── NowDev-AI-Classic-Developer (coordinator)
│   ├── NowDev-AI-Script-Developer
│   ├── NowDev-AI-BusinessRule-Developer
│   └── NowDev-AI-Client-Developer
├── NowDev-AI-Fluent-Developer (coordinator)
│   ├── NowDev-AI-Fluent-Schema-Developer
│   ├── NowDev-AI-Fluent-Logic-Developer
│   ├── NowDev-AI-Fluent-Automation-Developer
│   ├── NowDev-AI-Fluent-UI-Developer
│   ├── NowDev-AI-AI-Studio-Developer (coordinator)
│   │   ├── NowDev-AI-AI-Agent-Developer
│   │   └── NowDev-AI-NowAssist-Developer
│   └── NowDev-AI-ATF-Developer
├── NowDev-AI-Reviewer (router)
│   ├── NowDev-AI-Classic-Reviewer
│   └── NowDev-AI-Fluent-Reviewer
├── NowDev-AI-Debugger
├── NowDev-AI-Release-Expert (router)
│   ├── NowDev-AI-Classic-Release
│   └── NowDev-AI-Fluent-Release
└── NowDev-AI-Pipeline-Expert (CI/CD pipeline generation)
```

## Read Before Writing

For VS Code agents, always read `agents/github-copilot/AGENT-PATTERNS.md` before creating or editing — it contains the canonical tool sets and patterns that must be followed.

For cloud agents, read an existing file in `.github/agents/` as a style reference before writing.

When adding a new VS Code agent that is user-invocable (or a key sub-agent), check whether `src/AgentTopology.ts` needs a corresponding `AgentNode` entry to display it in the sidebar.
