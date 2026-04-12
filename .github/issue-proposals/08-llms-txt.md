---
title: "Add llms.txt for Machine-Readable Agent and Skill Discovery"
labels: ["enhancement", "documentation", "developer-experience"]
---

## Summary

Add an **`llms.txt` file** to the NowDev AI Toolbox repository root (and optionally a hosted version) that provides a machine-readable, structured listing of all agents and skills — enabling other AI tools, pipelines, and developers to discover and integrate NowDev capabilities programmatically.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository publishes a machine-readable [`llms.txt`](https://awesome-copilot.github.com/llms.txt) following the [llms.txt specification](https://llmstxt.org/). This file provides:
- Structured listings of all agents, skills, and instructions
- Descriptions optimized for AI consumption
- Links to raw file content for direct loading

The `llms.txt` spec has emerged as a standard for making documentation and project content accessible to AI agents. For a toolbox specifically designed for AI-assisted development, publishing `llms.txt` would be a strong signal of AI-first design and enable:

1. **AI agent discovery** — other AI tools can discover and load NowDev skills automatically
2. **Integration** — future Copilot CLI or plugin registries can index NowDev's capabilities
3. **Consistency** — a single source of truth for all available agents/skills that stays in sync with the codebase

There's even an awesome-copilot skill for creating these files: [create-llms](https://github.com/github/awesome-copilot/blob/main/skills/create-llms/SKILL.md).

## Proposed Work

### 1. Create `llms.txt` in the repository root

Following the [llms.txt specification](https://llmstxt.org/):

```markdown
# NowDev AI Toolbox

> Specialized AI agents and skills for ServiceNow development with GitHub Copilot.

NowDev AI Toolbox is a VS Code extension providing a three-tier AI agent hierarchy for ServiceNow development. Agents handle planning, Classic scripting, Fluent SDK development, review, and deployment.

## Agents

- [NowDev AI Orchestrator](https://raw.githubusercontent.com/DanielMadsenDK/NowDev-AI-Toolbox/main/agents/github-copilot/NowDev-AI.agent.md): Lead Architect — triages requests, plans solutions, coordinates all sub-agents
- [NowDev AI Assistant](https://raw.githubusercontent.com/DanielMadsenDK/NowDev-AI-Toolbox/main/agents/github-copilot/NowDev-AI-Assistant.agent.md): Lightweight Q&A and ServiceNow discovery
- ...

## Skills

- [ServiceNow Fluent Development](https://raw.githubusercontent.com/DanielMadsenDK/NowDev-AI-Toolbox/main/agents/skills/servicenow-fluent-development/SKILL.md): Complete Fluent SDK development guide with tables, ACLs, Business Rules, REST APIs, and UI
- [ServiceNow Business Rules](https://raw.githubusercontent.com/DanielMadsenDK/NowDev-AI-Toolbox/main/agents/skills/servicenow-business-rules/SKILL.md): Business Rule patterns, timing, and recursion prevention
- ...
```

### 2. Add `create-llms` skill to build tooling

Adopt the [create-llms](https://github.com/github/awesome-copilot/blob/main/skills/create-llms/SKILL.md) skill to make it easy to regenerate `llms.txt` as the agent/skill library grows:

- Skill scans `agents/github-copilot/*.agent.md` and `agents/skills/*/SKILL.md`
- Extracts frontmatter (`name`, `description`) from each file
- Generates the `llms.txt` following the spec
- Can be invoked via `@NowDev-AI-Agent update llms.txt`

### 3. GitHub Actions Automation (optional)

Add a workflow that auto-regenerates `llms.txt` on pushes to `main` when agent or skill files change.

## Benefits

- Makes NowDev AI Toolbox discoverable and integrable with AI-first tooling
- Low effort, high value — pure documentation with no runtime changes
- Signals that NowDev is an AI-native project aligned with ecosystem standards
- Enables future integration with the GitHub Copilot plugin marketplace

## References

- [llms.txt specification](https://llmstxt.org/)
- [awesome-copilot llms.txt](https://awesome-copilot.github.com/llms.txt)
- [awesome-copilot create-llms skill](https://github.com/github/awesome-copilot/blob/main/skills/create-llms/SKILL.md)
