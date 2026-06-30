---
name: servicenow-ai-agent-studio
context: fork
user-invocable: false
description: Navigation and guardrails for AI Agent Studio Fluent SDK artifacts. Use for routing AiAgent and AiAgenticWorkflow work, but verify all SDK object shapes, tools, triggers, and enum values with `now-sdk explain` first.
---

# ServiceNow AI Agent Studio

Use this skill for deciding whether a request belongs to AI Agent Studio and for NowDev routing. Do **not** use it as local API reference for `AiAgent`, `AiAgenticWorkflow`, tools, triggers, enum values, or version structures.

## Authoritative SDK Source

Always verify the installed SDK documentation before writing or reviewing code:

```bash
now-sdk explain --list aiagent
now-sdk explain aiagent-api --format raw
now-sdk explain aiagenticworkflow-api --format raw
now-sdk explain building-ai-agents-guide --format raw
```

If tool, trigger, or enum topic names change, discover them with `now-sdk explain --list <keyword>`.

## Routing Guidance

| User Intent | Route |
|---|---|
| One autonomous AI agent with tools/instructions | NowDev-AI-AI-Agent-Developer |
| Multi-agent team or coordinated workflow | NowDev-AI-AI-Agent-Developer |
| NowAssistSkillConfig / LLM skill shown in Now Assist surfaces | NowDev-AI-NowAssist-Developer |
| Supporting Script Includes, Subflows, tables, or REST APIs | Route those dependencies to the relevant Fluent specialist first |

## Guardrails

- Fetch `now-sdk explain` docs for the exact artifact before writing code.
- Verify mandatory security/access fields against the installed SDK docs and target instance release.
- Validate all referenced roles, tables, Script Includes, Subflows, tools, and trigger records against workspace or live instance facts.
- Do not copy local enum/tool lists; discover current values from the SDK docs and instance data.
- Keep helper script logic in the appropriate Logic/Automation specialist boundary and pass exact exported names through the artifact registry.
