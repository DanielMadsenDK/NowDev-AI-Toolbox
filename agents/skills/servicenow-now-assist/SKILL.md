---
name: servicenow-now-assist
context: fork
user-invocable: false
description: Navigation and guardrails for NowAssist Skill configurations in Fluent SDK projects. Use for routing NowAssistSkillConfig work, but verify all SDK object shapes, tool graph APIs, provider fields, and security settings with `now-sdk explain` first.
---

# ServiceNow NowAssist Skill Configuration

Use this skill for NowAssist intent, routing, and local guardrails. Do **not** use it as local API reference for `NowAssistSkillConfig`, inputs, outputs, tools, providers, prompt fields, enum values, or deployment settings.

## Authoritative SDK Source

Always verify the installed SDK documentation before writing or reviewing code:

```bash
now-sdk explain --list nowassist
now-sdk explain --list skill
now-sdk explain <topic> --format raw
```

Use the discovered NowAssistSkillConfig topic and any tool/provider guide topics returned by the installed SDK.

## Routing Guidance

| User Intent | Route |
|---|---|
| LLM-powered skill in Now Assist surfaces | NowDev-AI-NowAssist-Developer |
| Agent or agentic workflow, not a NowAssist skill | NowDev-AI-AI-Agent-Developer |
| Supporting Script Includes, Subflows, Flow Actions, or table metadata | Build dependencies with the relevant Fluent specialist first |
| Classic server scripts used by tools | NowDev-AI-Fluent-Logic-Developer or Classic specialist depending on project style |

## Guardrails

- Fetch `now-sdk explain` docs for the exact skill/topic before writing code.
- Verify security controls, roles, provider configuration, prompt versioning, and deployment surfaces against the installed SDK docs and target instance release.
- Validate referenced Script Includes, Subflows, Flow Actions, tables, and roles against workspace or live instance facts.
- Do not copy local tool graph examples; use current SDK docs plus the actual dependency exports.
- Keep prompt/tool dependencies explicit in the artifact registry so reviewers and release agents can verify them.
