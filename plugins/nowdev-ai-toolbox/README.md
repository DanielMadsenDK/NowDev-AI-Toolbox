# NowDev AI Toolbox — Copilot Plugin

This directory is the **GitHub Copilot plugin** distribution of the
[NowDev AI Toolbox](https://github.com/DanielMadsenDK/NowDev-AI-Toolbox). It lets
you use the toolbox's ServiceNow agents in the **GitHub Copilot CLI** and the
**GitHub Copilot desktop app**, in addition to the VS Code extension.

> The VS Code extension remains the primary product. This plugin is a generated
> artifact built from the same agent and skill sources — do **not** edit the
> files in this directory by hand. Run `npm run build:plugin` from the repository
> root to regenerate them.

## What you get

- **One selectable agent — `NowDev AI Agent`** (the orchestrator). Pick it with
  `/agent`. It triages your request and **delegates** to specialized ServiceNow
  agents (Fluent SDK, debugging, review, release, pipeline, and more), just like
  the full VS Code experience.
- **18 ServiceNow skills** covering Fluent development, Business Rules, Client
  Scripts, React UI components, deployment, debugging, and more. Copilot loads
  these automatically when relevant.

The specialist agents are intentionally hidden from the `/agent` picker — they
are reachable only through delegation by the orchestrator, which keeps the
experience focused on a single entry point.

## Prerequisites

- **GitHub Copilot CLI** (`copilot`) or the **GitHub Copilot desktop app**.
- The **ServiceNow SDK** (`now-sdk`) installed and on your `PATH` for agents that
  run SDK commands:
  ```
  npm install -g @servicenow/sdk
  ```
- A ServiceNow instance and credentials configured for `now-sdk` if you want the
  agents to query live instance facts.

## Install

From a marketplace (this repository doubles as one):

```
copilot plugin marketplace add DanielMadsenDK/NowDev-AI-Toolbox
copilot plugin install nowdev-ai-toolbox@NowDev-AI-Toolbox
```

Or install directly from the repository path in one step:

```
copilot plugin install DanielMadsenDK/NowDev-AI-Toolbox:plugins/nowdev-ai-toolbox
```

## Use

1. Start `copilot` (or open the desktop app) in your ServiceNow SDK project.
2. Run `/agent` and select **NowDev AI Agent**.
3. Describe your task — a feature to build, a bug to debug, a review, a release,
   or a quick question. The orchestrator routes the work to the right
   specialists and returns the result.

## Feature parity

This plugin ships the **agents and skills only**. The VS Code extension's
graphical features — the Agents/MCP/Profiles management UI, documentation
download and sync, guideline integration, and one-click configuration — are
extension-only and are not part of the plugin. Agent behavior and skill content
are otherwise identical.
