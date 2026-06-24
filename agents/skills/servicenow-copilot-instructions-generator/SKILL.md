---
name: servicenow-copilot-instructions-generator
description: Generate or update project-specific GitHub Copilot instructions for ServiceNow projects by detecting Fluent vs Classic style, scope, naming conventions, dependencies, tests, and forbidden patterns. Use when a ServiceNow workspace lacks `.github/copilot-instructions.md`, when a team wants Copilot aligned to project conventions, or when updating existing Copilot instructions after architecture changes.
---

# ServiceNow Copilot Instructions Generator

Use this skill to create or update `.github/copilot-instructions.md` for a ServiceNow project. The goal is to capture project-specific context that should apply to every Copilot request, while leaving task workflows and domain playbooks in agents and skills.

## Workflow

1. Inspect the workspace before writing anything.
   - Read `now.config.json` if present to identify Fluent SDK projects, app name, scope, package ID, and source layout.
   - Read `package.json` for SDK version, scripts, dependencies, test tools, and React/UI framework signals.
   - Search for `.now.ts`, `.js`, `.ts`, `.tsx`, and XML/import directories to classify Fluent, Classic, or mixed projects.
   - Read representative artifacts to detect naming, folder layout, JSDoc/comment style, import style, validation patterns, and testing conventions.
   - Read any existing `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `AGENTS.md`, `CLAUDE.md`, or local team standards before proposing changes.

2. Detect and record project facts.
   - Project style: Fluent SDK, Classic ServiceNow scripting, or mixed.
   - Application scope and naming prefix, including exact table prefix if discoverable.
   - Artifact directories and file naming conventions.
   - Server-side patterns: Script Includes, Business Rules, GlideAjax processors, REST APIs, Flows, Scheduled Scripts.
   - Client/UI patterns: Client Scripts, UI Policies, Catalog scripts, React UI pages, Workspaces, portals.
   - Validation and release commands that actually exist in the project.
   - Forbidden patterns already used by the team or required by NowDev guidance, such as hard-coded sys_ids, `eval()`, counting records by looping, unsafe browser blocking, and scope mismatches.

3. Draft concise instructions.
   - Keep instructions project-wide, stable, and short enough to be useful in every chat request.
   - Include only conventions that were detected from the project or explicitly provided by the user.
   - Prefer concrete names, paths, commands, and examples from the workspace over generic ServiceNow advice.
   - Put long examples, task recipes, and API deep dives in skills or reference docs, not in `copilot-instructions.md`.

4. Preserve existing work.
   - If `.github/copilot-instructions.md` already exists, update it surgically. Do not overwrite user-authored sections without explaining the change.
   - If project facts conflict, ask a batched clarification question before writing.
   - If no reliable project convention can be detected, mark it as an assumption or omit it.

5. Offer NowDev integration.
   - If the user wants NowDev agents to receive the same standards, offer to copy the final instruction text into the configured custom instructions flow.
   - Prefer the existing `nowdev-ai-toolbox.customInstructionsFile` setting and `.vscode/nowdev-ai-config.json` `customInstructions` integration. Do not invent a separate injection path.

## Output Structure

Use this shape unless the project already has a stronger local structure:

```markdown
# GitHub Copilot Instructions

## Project Context
- ServiceNow project style: [Fluent SDK / Classic / Mixed]
- Application scope: [exact scope or unknown]
- Primary artifact roots: [paths]

## Development Standards
- [Detected or user-confirmed standards]

## Naming Conventions
- Tables: [pattern]
- Script Includes: [pattern]
- Business Rules / Client Scripts / Fluent metadata: [pattern]

## ServiceNow Safety Rules
- [Project-specific forbidden patterns and platform safety constraints]

## Validation
- Run `[actual command]` after changes that affect [scope].

## Agent Guidance
- Prefer [Classic / Fluent] patterns for new work unless the user explicitly asks otherwise.
- Use existing project helpers and folder layout before introducing new abstractions.
```

## Quality Bar

- The generated file must be specific enough that Copilot can produce code aligned with this repository without rediscovering basic project facts.
- The file must not contain unverifiable API signatures, invented commands, placeholder scope names, or generic advice that applies to every ServiceNow project.
- The final response must summarize detected facts, files changed, assumptions, and any commands the user should run to validate the generated instructions.