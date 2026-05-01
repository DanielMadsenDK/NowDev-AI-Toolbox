---
name: nowdev-skill-authoring
description: Guide for creating and updating ServiceNow skill documentation files in this repository. Use when asked to add, update, or review any agent skill in the agents/skills/ directory.
---

## How Skills Are Loaded Here

In this repository, VS Code auto-loads only the `SKILL.md` files explicitly listed in `package.json` under `contributes.chatSkills`.

- `SKILL.md` is the only file guaranteed to be loaded automatically by Copilot Chat
- Sibling Markdown files are reference material for humans or for agents that explicitly read them
- When adding a new skill, updating `package.json` is mandatory

## Skill Directory Patterns

Skills live in `agents/skills/<skill-name>/`, but the directory shape is intentionally mixed. Do not assume every skill needs the same file set.

| File | Purpose |
|------|---------|
| `SKILL.md` | Required primary entry point — loaded automatically when the skill is contributed in `package.json` |
| `BEST_PRACTICES.md` | Optional do/don't patterns for safe and idiomatic code |
| `FLUENT.md` | Optional Fluent SDK (`.now.ts`) patterns for domains that need Fluent-specific guidance |
| `CLASSIC.md` | Optional Classic ServiceNow scripting patterns |
| `EXAMPLES.md` | Optional complete scenarios or copyable snippets |
| `*-API.md` / `*-GUIDE.md` / `*-REFERENCE.md` | Optional deep reference docs when a skill needs more than one supporting document |

Current repo patterns include:

- Minimal skills with only `SKILL.md`
- Split skills with `SKILL.md` plus `BEST_PRACTICES.md`, `FLUENT.md`, `CLASSIC.md`, or `EXAMPLES.md`
- Reference-heavy skills such as `servicenow-fluent-development/` and `servicenow-react-ui-components/` with many focused support docs

## SKILL.md Frontmatter

Required fields:
```yaml
---
name: servicenow-<domain-name>   # lowercase, hyphens, prefix with "servicenow-"
description: <one sentence purpose>. Use when <trigger condition>.
---
```

When adding a brand new skill, remember to add `./agents/skills/<skill-name>/SKILL.md` to `package.json -> contributes.chatSkills` or VS Code will not load it.

## Writing Quality Checklist

1. `SKILL.md` must begin with a clear "when to use this skill" statement
2. `SKILL.md` should stand on its own even if no sibling docs are loaded
3. Fluent examples must use TypeScript (`.now.ts`) and real `@servicenow/sdk` imports
4. Classic examples must use platform globals (`GlideRecord`, `gs.*`, `GlideDateTime`, etc.) and must not invent SDK-style imports
5. `BEST_PRACTICES.md` must contrast correct vs incorrect patterns using ✅ / ❌
6. Any API signatures, import paths, enum names, or method names must be verified against live docs before writing
7. Only create extra files when the topic is large enough to justify them

## Current Good Reference Shapes

```
agents/skills/servicenow-my-domain/
├── SKILL.md              ← always required
├── BEST_PRACTICES.md     ← optional
├── FLUENT.md             ← optional
├── CLASSIC.md            ← optional
├── EXAMPLES.md           ← optional
└── MY-DOMAIN-API.md      ← optional
```

## Read Before Writing

Before creating or editing any skill file, always read the corresponding existing files in `agents/skills/<domain>/` to understand current content and avoid duplication.

Use these as structural references:
- `agents/skills/servicenow-manipulate-data/` — clean data-access skill example
- `agents/skills/servicenow-business-rules/` — good FLUENT.md / CLASSIC.md split pattern
- `agents/skills/servicenow-fluent-development/` — most detailed skill, multiple API reference files
- `agents/skills/servicenow-react-ui-components/` — example of a large reference-heavy UI skill

## API Accuracy

Never write API method signatures, class names, enum values, or import paths from memory alone. Always verify against live documentation first.

Preferred verification order:

1. Use Context7 library resolution to find the current Fluent SDK or ServiceNow docs library ID
2. Query Context7 for the exact API/topic you are documenting
3. If Context7 is unavailable, use the official fallback sources below

If Context7 is unavailable, fetch `https://servicenow.github.io/sdk/llms.txt` as the Fluent SDK fallback.

For classic platform APIs, use the official ServiceNow docs site as the fallback rather than hardcoding unverifiable signatures.
