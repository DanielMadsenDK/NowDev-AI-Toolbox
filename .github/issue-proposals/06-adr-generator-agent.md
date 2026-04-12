---
title: "Add ADR Generator Agent for ServiceNow Architecture Decisions"
labels: ["enhancement", "new-agent"]
---

## Summary

Add an **ADR (Architecture Decision Record) Generator agent** to the NowDev AI Toolbox that helps ServiceNow architects capture and document important technical decisions in a structured, AI-optimized format.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes:

- **[ADR Generator agent](https://github.com/github/awesome-copilot/blob/main/agents/adr-generator.agent.md)** — creates comprehensive Architectural Decision Records with structured formatting optimized for AI consumption and human readability
- **[create-architectural-decision-record skill](https://github.com/github/awesome-copilot/blob/main/skills/create-architectural-decision-record/SKILL.md)** — creates ADR documents for AI-optimized decision documentation

In ServiceNow development, teams regularly make critical architectural choices:
- Classic vs. Fluent SDK approach
- Custom table vs. extending standard tables
- Flow Designer vs. Business Rule for automation
- On-instance scripting vs. REST integration
- Scoped vs. global scope design
- Third-party npm library usage in Fluent SDK

These decisions are rarely documented, leading to repeated debates, inconsistent implementations, and onboarding challenges. ADRs solve this.

## Proposed Work

Create a new agent: **`NowDev-AI-ADR-Generator`** (Tier 2 agent, invocable from the orchestrator and standalone)

### Agent Capabilities

**1. ADR Creation**
- Ask structured questions about a decision context
- Auto-detect relevant context from the codebase (e.g., if project uses Fluent SDK, offer SDK-related decision templates)
- Generate a complete ADR following the MADR (Markdown Architectural Decision Records) format
- Store ADR files in `docs/decisions/` directory with sequential numbering (e.g., `ADR-0001-use-fluent-sdk.md`)

**2. Pre-Built ServiceNow Decision Templates**
Templates for common ServiceNow decisions:
- `Classic vs. Fluent SDK` — when to use each approach
- `Custom Table Design` — extending base vs. new table
- `Automation Engine Selection` — Flow Designer vs. Business Rule vs. Scheduled Script
- `Integration Pattern` — REST Push vs. Pull vs. MID Server vs. Import Set
- `AI Studio vs. Custom NowAssist` — when to use built-in vs. custom AI
- `Scope Strategy` — single scope vs. multi-scope design
- `Third-Party Library` — include vs. avoid in Fluent SDK

**3. ADR Index Generation**
- Maintain a `docs/decisions/README.md` with a table of all ADRs
- Track decision status: `Proposed`, `Accepted`, `Deprecated`, `Superseded`
- Link related decisions and show supersession chains

**4. Decision Context from Codebase**
- Read `now.config.json` to understand the current project context
- Analyze existing code patterns to suggest relevant decisions
- Flag potential conflicts with existing ADRs

### ADR Format

```markdown
# ADR-0001: Use Fluent SDK for All New Development

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Development Team  
**Tags:** tooling, sdk, development-approach

## Context and Problem Statement
[What is the context? What problem are we solving?]

## Decision Drivers
- [Driver 1]
- [Driver 2]

## Considered Options
- Option A: Classic XML-based development
- Option B: Fluent SDK with now-sdk CLI
- Option C: Hybrid approach

## Decision Outcome
Chosen option: **Option B**, because [justification].

### Positive Consequences
- [Pro 1]
- [Pro 2]

### Negative Consequences
- [Con 1]

## Pros and Cons of the Options
[Full analysis per option]

## Links
- [ServiceNow Fluent SDK docs](https://developer.servicenow.com/dev.do#!/reference/now-sdk)
- Related ADR: ADR-0002
```

## Integration Points

- Should be invocable directly: `@NowDev-AI-ADR-Generator Create an ADR for using Fluent SDK`
- The orchestrator should suggest creating ADRs when a major architectural choice is detected during planning
- Should be listed in the NowDev AI Toolbox README's agent table

## References

- [awesome-copilot ADR Generator agent](https://github.com/github/awesome-copilot/blob/main/agents/adr-generator.agent.md)
- [MADR (Markdown Architectural Decision Records)](https://github.com/adr/madr)
- [ADR specification](https://adr.github.io/)
