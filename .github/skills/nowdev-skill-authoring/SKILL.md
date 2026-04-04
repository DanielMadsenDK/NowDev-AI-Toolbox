---
name: nowdev-skill-authoring
description: Guide for creating and updating ServiceNow skill documentation files in this repository. Use when asked to add, update, or review any agent skill in the agents/skills/ directory.
---

## Skill File Structure

Each skill lives in `agents/skills/<skill-name>/` and consists of multiple files:

| File | Purpose |
|------|---------|
| `SKILL.md` | Primary entry point loaded by VS Code agents — main instructions, when to use, key patterns |
| `BEST_PRACTICES.md` | ✅ / ❌ do/don't patterns for safe and idiomatic code |
| `FLUENT.md` | Fluent SDK (`.now.ts`) specific patterns and API usage for this domain |
| `CLASSIC.md` | Classic ServiceNow JS scripting patterns for this domain |
| `EXAMPLES.md` | Complete, working code examples for key scenarios |
| `*-API.md` | Detailed API reference — method signatures, constants, type definitions (optional but valuable for complex domains) |

## SKILL.md Frontmatter

Required fields:
```yaml
---
name: servicenow-<domain-name>   # lowercase, hyphens, prefix with "servicenow-"
description: <one sentence purpose>. Use when <trigger condition>.
---
```

## Writing Quality Checklist

1. `SKILL.md` must begin with a clear "when to use this skill" statement
2. Every code example must include imports
3. `FLUENT.md` examples must use TypeScript (`.now.ts`) and `@servicenow/sdk` imports
4. `CLASSIC.md` examples must use `GlideRecord` / `gs.*` / `GlideDateTime` — no SDK imports
5. `BEST_PRACTICES.md` must contrast correct vs incorrect patterns using ✅ / ❌
6. All API method signatures must be verified against Context7 before writing

## Example Directory Layout

```
agents/skills/servicenow-my-domain/
├── SKILL.md              ← loaded by VS Code agents
├── BEST_PRACTICES.md     ← do/don't
├── FLUENT.md             ← .now.ts patterns
├── CLASSIC.md            ← GlideRecord/gs patterns
├── EXAMPLES.md           ← complete working examples
└── MY-DOMAIN-API.md      ← detailed API reference (optional)
```

## Read Before Writing

Before creating or editing any skill file, always read the corresponding existing files in `agents/skills/<domain>/` to understand current content and avoid duplication.

Use these as structural references:
- `agents/skills/servicenow-manipulate-data/` — clean data-access skill example
- `agents/skills/servicenow-business-rules/` — good FLUENT.md / CLASSIC.md split pattern
- `agents/skills/servicenow-fluent-development/` — most detailed skill, multiple API reference files

## API Accuracy

Never write API method signatures, class names, or import paths from training data. Always verify via Context7:

- **Fluent SDK** (imports, types, method signatures): resolve and query library `llmstxt/servicenow_github_io_sdk_llms-full_txt`
- **Classic ServiceNow API** (GlideRecord, gs.*, GlideDateTime, GlideAggregate): resolve and query library `/websites/servicenow`

If Context7 is unavailable, fetch `https://servicenow.github.io/sdk/llms.txt` as the Fluent SDK fallback.
