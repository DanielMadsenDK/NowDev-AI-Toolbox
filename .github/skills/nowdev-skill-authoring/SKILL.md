---
name: nowdev-skill-authoring
description: Guide for creating and updating skill documentation in this repository. Use when asked to add, update, or review bundled skills in agents/skills/ or repository-maintenance skills in .github/skills/.
---

## Two Skill Layers

This repository has two skill locations with different consumers:

| Location | Purpose | Registration |
|----------|---------|--------------|
| `agents/skills/<skill-name>/` | Product skills bundled with the VS Code extension | `SKILL.md` must be listed in `package.json -> contributes.chatSkills` |
| `.github/skills/<skill-name>/` | Repository-local maintenance guidance for contributors and coding agents | Discovered from the workspace; do not add to `contributes.chatSkills` |

For bundled skills, `SKILL.md` is the only file guaranteed to be loaded automatically by Copilot Chat. Sibling Markdown files are reference material for humans or agents that explicitly read them.

## Product Scope Gate

Skills are the preferred way to add reusable ServiceNow capabilities to this project. Add a new agent only when the work needs a distinct delegation boundary, permission profile, or long-lived orchestration role; otherwise add or extend a skill.

Every bundled skill under `agents/skills/` is copied verbatim into the public plugin distribution. It must therefore be broadly useful across organizations and must not encode one customer's business process.

### Allowed in This Project

A bundled skill may:

- expose a general ServiceNow capability such as read-only data retrieval, schema discovery, API lookup, ACL diagnosis, notification tracing, environment comparison, anonymization, or generic artifact validation
- define safe technical mechanics such as query limits, field selection, redaction, error handling, least privilege, and evidence reporting
- discover instance-specific tables, fields, roles, choices, and configuration at runtime instead of assuming them
- accept organization-specific values as explicit user/configuration inputs without interpreting them as universal policy
- return neutral facts or reusable technical structures that a consuming organization can process further

### Not Allowed in This Project

Do not bundle a skill that embeds:

- a named company's terminology, organizational structure, owners, groups, environments, or approval bodies
- fixed business statuses, approval chains, escalation paths, release gates, Definition of Done, or work-item hierarchy presented as universal
- proprietary naming rules, compliance rules, Knowledge content, support procedures, or communication templates
- business-specific scoring, classification, prioritization, eligibility, routing, or decisions applied to retrieved data
- assumptions about which records should be created, updated, approved, rejected, or closed for a particular organization

Organization-specific skills belong in the consuming company's own repository-level skill directory or a separate private plugin/extension. They may call the generic skills from this project and add company policy on top.

## SDK Authority Gate

`nowdev-ai-toolbox-servicenow-sdk` is the sole authority for `now-sdk` command syntax and execution mechanics. Any bundled skill that mentions or requires `now-sdk` must explicitly delegate command construction to that skill.

Domain skills own the retrieval purpose, relevant tables and fields, encoded-query intent, evidence model, redaction requirements, interpretation, and output structure. They must not duplicate complete commands, aliases, flags, output formats, pagination syntax, authentication setup, or CLI troubleshooting. Documentation topic IDs are allowed because they describe domain knowledge to retrieve; the SDK skill determines how to invoke the CLI.

### Capability Versus Policy

Use this boundary when the distinction is unclear:

| Generic capability for this project | Organization-specific policy outside this project |
|-------------------------------------|---------------------------------------------------|
| Retrieve records safely with `now-sdk query` | Decide which retrieved records violate a company's policy |
| Discover tables, fields, choices, and roles | Require one company's exact table, status, group, or role names |
| Trace ACL evaluation or notification delivery | Apply a company-specific escalation or remediation workflow |
| Compare technical configuration between instances | Enforce a company's release approval or environment promotion process |
| Redact PII and produce a neutral fixture shape | Generate fixtures that reproduce proprietary production processes |
| Provide generic evidence and validation results | Decide readiness against a company-specific Definition of Done |

Technical safety processing such as limiting, normalizing, deduplicating, summarizing, and redacting data is in scope when it is policy-neutral. Business interpretation of that data must be supplied by the consuming organization.

### Mandatory Admission Check

Before creating or expanding a bundled skill, answer all of these questions:

1. Would the skill be useful without changing its workflow at several unrelated ServiceNow customers?
2. Are all organization-specific names, rules, thresholds, states, and decisions supplied externally rather than embedded?
3. Does the skill provide a technical capability or neutral evidence rather than enforce business policy?
4. Can a company-specific skill compose this capability and add its own workflow without modifying the bundled skill?
5. Are examples synthetic and free of customer names, proprietary process details, and production data?

If any answer is no, do not add the skill to `agents/skills/` or `package.json -> contributes.chatSkills`. Explain the boundary and recommend a repository-local or private company skill instead.

## Skill Directory Patterns

Bundled product skills under `agents/skills/` intentionally use mixed directory shapes. Do not assume every skill needs the same file set.

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
- Reference-heavy skills such as `nowdev-ai-toolbox-fluent-development/` and `nowdev-ai-toolbox-react-ui-components/` with focused support docs

## SKILL.md Frontmatter

Required fields:
```yaml
---
name: nowdev-ai-toolbox-<domain-name>   # bundled product skill
description: <one sentence purpose>. Use when <trigger condition>.
---
```

Repository-maintenance skills currently use the shorter `nowdev-<domain-name>` prefix. In both layers, names are lowercase and hyphenated and must match the containing directory.

When adding a new bundled skill, add `./agents/skills/<skill-name>/SKILL.md` to `package.json -> contributes.chatSkills` or VS Code will not load it. Do not register `.github/skills/` there.

## Writing Quality Checklist

1. Pass the Product Scope Gate and Mandatory Admission Check above
2. Frontmatter `description` must state both the purpose and when the skill applies
3. `SKILL.md` should stand on its own even if no sibling docs are loaded
4. Fluent examples must use TypeScript (`.now.ts`) and real `@servicenow/sdk` imports
5. Classic examples must use platform globals (`GlideRecord`, `gs.*`, `GlideDateTime`, etc.) and must not invent SDK-style imports
6. When `BEST_PRACTICES.md` contrasts patterns, make correct and incorrect examples unambiguous
7. Any API signatures, import paths, enum names, or method names must be verified against live docs before writing
8. Only create extra files when the topic is large enough to justify them

## Current Good Reference Shapes

```
agents/skills/nowdev-ai-toolbox-my-domain/
├── SKILL.md              ← always required
├── BEST_PRACTICES.md     ← optional
├── FLUENT.md             ← optional
├── CLASSIC.md            ← optional
├── EXAMPLES.md           ← optional
└── MY-DOMAIN-API.md      ← optional
```

Keep the directory name identical to the frontmatter `name`.

## Read Before Writing

Before creating or editing any skill file, always read the corresponding existing files in `agents/skills/<domain>/` to understand current content and avoid duplication.

Use these as structural references:
- `agents/skills/nowdev-ai-toolbox-incident-log-triage/` — focused operational skill
- `agents/skills/nowdev-ai-toolbox-fluent-development/` — detailed development guidance
- `agents/skills/nowdev-ai-toolbox-react-ui-components/` — reference-heavy UI skill
- `.github/skills/nowdev-agent-authoring/` — repository-maintenance skill

## API Accuracy

Never write API method signatures, class names, enum values, or import paths from memory alone. Always verify against live documentation first.

Preferred verification order for Fluent SDK material:

1. Load `nowdev-ai-toolbox-servicenow-sdk` and use the installed SDK documentation for the required topic
2. Use the configured documentation source, such as Context7, when `now-sdk explain` does not cover the topic
3. Fall back to the official SDK source below if configured documentation is unavailable

If the configured documentation source is unavailable, fetch `https://servicenow.github.io/sdk/llms.txt` as the Fluent SDK fallback.

For classic platform APIs, use the official ServiceNow docs site as the fallback rather than hardcoding unverifiable signatures.

## Validation

After adding or changing a bundled skill, run:

```bash
npm run validate:agents
```

The validator checks that every discovered bundled skill is registered in `contributes.chatSkills` and that every contributed path exists. Repository-local `.github/skills/` are outside that package validation surface.
