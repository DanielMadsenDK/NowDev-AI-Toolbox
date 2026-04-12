---
title: "Add Copilot Instructions Blueprint Generator for ServiceNow Projects"
labels: ["enhancement", "new-skill", "developer-experience"]
---

## Summary

Add a **Copilot Instructions Blueprint Generator skill** that analyzes an existing ServiceNow project and automatically generates a comprehensive `.github/copilot-instructions.md` file — ensuring GitHub Copilot produces code consistent with the project's ServiceNow conventions, scope, naming patterns, and technology choices.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes a [copilot-instructions-blueprint-generator](https://github.com/github/awesome-copilot/blob/main/skills/copilot-instructions-blueprint-generator/SKILL.md) skill that:

> Creates comprehensive copilot-instructions.md files that guide GitHub Copilot to produce code consistent with project standards, architecture patterns, and exact technology versions by analyzing existing codebase patterns and avoiding assumptions.

The NowDev AI Toolbox already has a `CUSTOM-INSTRUCTIONS-TEMPLATE.md` and a `customInstructionsFile` setting, but these require manual configuration. Many teams skip this step, leading to Copilot suggestions that don't align with their ServiceNow project's specific conventions.

A skill that **automatically discovers** and generates these instructions from the codebase would dramatically lower the barrier to adopting consistent AI-assisted development.

## Proposed Work

Create a new skill: **`servicenow-copilot-instructions-generator`**

### Skill Structure
```
agents/skills/servicenow-copilot-instructions-generator/
├── SKILL.md
└── references/
    ├── INSTRUCTION-PATTERNS.md      # Proven copilot instruction patterns for SN
    ├── DETECTION-HEURISTICS.md      # How to detect SN project conventions
    └── EXAMPLES.md                  # Example generated instruction files
```

### Skill Capabilities

**1. Project Convention Auto-Detection**

Analyze the repository to detect:
- **SDK type** — Fluent SDK (from `now.config.json`) vs. Classic
- **Scope configuration** — scope name, prefix, numeric ID from `now.config.json`
- **Naming patterns** — analyze existing table/field names to infer convention (e.g., `snake_case`, scope prefix usage)
- **Coding style** — detect if project uses JSDoc, specific ES version, async patterns
- **Third-party dependencies** — npm packages in use (from `package.json`)
- **Architecture patterns** — detect if project follows service layer, repository pattern, etc.
- **Test conventions** — analyze existing ATF test structure

**2. Generated `.github/copilot-instructions.md`**

The generated file includes:

```markdown
# GitHub Copilot Instructions — [App Name]

## Project Context
This is a ServiceNow Fluent SDK application with scope `x_myapp`.
SDK version: now-sdk@4.5.0

## Naming Conventions
- Tables: `x_myapp_[table_name]` (e.g., `x_myapp_incident_extension`)
- Script Includes: PascalCase, scope-prefixed (e.g., `MyAppIncidentUtils`)
- Flows: kebab-case (e.g., `incident-approval-flow`)

## Development Standards
- Always use Fluent SDK patterns (TypeScript-first)
- Business Rules must include recursion prevention
- All public Script Include methods must have JSDoc
- ATF tests required for all Business Rules and Script Includes

## Excluded Patterns
- Never use `eval()`, `gs.sleep()`, or `GlideRecord.query()` in loops
- Never hardcode sys_ids — use `gr.getRefRecord()` or constants
- Never use global scope variables in scoped apps
```

**3. `nowdev-ai-config.json` Integration**

Offer to also populate the `customInstructions` field in `.vscode/nowdev-ai-config.json` with the same content, so all NowDev agents automatically receive these project-specific instructions.

**4. Incremental Updates**

When run on an existing project with a `.github/copilot-instructions.md`, detect what has changed and offer a diff/merge UI rather than overwriting.

## Why This Matters

Without project-specific instructions, GitHub Copilot (and NowDev agents) make generic ServiceNow suggestions that:
- Use wrong scope prefixes
- Suggest Classic patterns in a Fluent SDK project
- Use naming conventions inconsistent with the existing codebase
- Miss project-specific forbidden patterns

This skill bridges the gap between NowDev's rich built-in knowledge and the project's unique context.

## Integration Points

- Should be suggested by the orchestrator when `.github/copilot-instructions.md` doesn't exist
- Should be invocable standalone: `@NowDev-AI-Agent Generate copilot instructions for this project`
- Output should be committed to the repository

## References

- [awesome-copilot copilot-instructions-blueprint-generator](https://github.com/github/awesome-copilot/blob/main/skills/copilot-instructions-blueprint-generator/SKILL.md)
- [NowDev CUSTOM-INSTRUCTIONS-TEMPLATE.md](agents/github-copilot/CUSTOM-INSTRUCTIONS-TEMPLATE.md)
- [GitHub Copilot custom instructions documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
