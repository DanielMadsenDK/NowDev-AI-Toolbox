# Custom Instructions Template

Use this file as a starting point for the `nowdev-ai-toolbox.customInstructionsFile` setting.
Copy it to a location outside this repository (e.g. `~/nowdev-custom-instructions.md`) and set the
VS Code setting to point at your copy.  All NowDev AI agents read this file at the start of every
session and treat its directives with **highest priority**, overriding built-in defaults where they
conflict.

---

## Development Preferences

<!--
Describe the development style and framework version your team has standardised on.
Agents use this to pick the right code patterns without asking every time.
-->

- Always use the **Fluent SDK** (`.now.ts` TypeScript metadata) for all new application development.
- Target **SDK version 4.5.0** or later; use AI Studio APIs when the request involves AI Agents or NowAssist Skills.
- Default to **async** Business Rules unless the logic must read or set values before insert/update.
- Use `GlideRecord` only in legacy Classic scripts; never mix Classic and Fluent patterns in the same feature.
- When generating ATF tests, always cover the happy path and at least one negative / edge-case scenario.

## Naming Conventions

<!--
Set your company-specific naming conventions here to ensure all generated code matches
your organisation's existing codebase.  Agents apply these rules to every artifact they
produce — tables, scripts, flows, tests, and variables — making the output consistent
with your existing code from day one.  These override any SDK defaults or best-practice
recommendations.
-->

- **Script Include names**: `PascalCase`, no scope prefix in the class name itself (e.g. `AssetRequestHelper`).
- **Table names**: `snake_case`, always prefixed with the app scope (auto-detected from `now.config.json`).
- **Flow / Subflow names**: Title Case with spaces (e.g. `Approve Asset Request`).
- **ATF test names**: `[Feature] - [Scenario]` format (e.g. `Asset Request - Approval happy path`).
- **Variables and parameters**: `camelCase`; booleans prefixed with `is` or `has` (e.g. `isApproved`).

## Scope and Application

<!--
Restrict where agents are allowed to make changes.  This prevents accidental edits to unrelated
applications or records.
-->

- All generated code must belong to the current app scope (auto-detected from `now.config.json`) unless the user explicitly requests otherwise.
- Do **not** modify out-of-box (OOB) tables directly; always extend via relationships or override with scoped copies.
- Only propose changes to the **current Fluent workspace** detected in `now.config.json`; do not suggest cross-scope changes.
- If you cannot achieve the goal without modifying an OOB record, **stop** and explain the constraint to the user. Describe at least one extension-safe alternative (e.g. a scoped relationship table, a configuration record, or a cross-scope privilege) before proceeding.

## Excluded Patterns

<!--
List code constructs, APIs, or practices that are **never** acceptable in this project.
Agents must refuse to generate them and explain the policy when asked.
-->

- **Never** use `eval()` or `new Function()` under any circumstances.
- **Never** use `GlideRecord.query()` inside a loop (N+1 query pattern).
- **Never** write synchronous HTTP calls inside Business Rules; use Flow Designer or Scripted REST APIs instead.
- **Never** store credentials, tokens, or passwords in script fields; use System Properties or Credential records.
- **Never** use `gs.log()` in production code; use structured `gs.info()` / `gs.warn()` / `gs.error()` with a meaningful source identifier.
- **Do not** create Classic Business Rules in applications that already use Fluent Logic; keep the paradigm consistent.

## Always Use / Never Use

<!--
Short, unconditional directives.  "Always use X" means generate X by default without asking.
"Never use Y" means refuse to generate Y even if explicitly requested, and explain why.
-->

**Always use:**
- `try / catch` blocks in all server-side Scripted REST endpoints.
- Role-based ACLs defined in the Fluent Schema developer for every new table.
- `GlideAggregate` instead of `GlideRecord` when only counting or summing records.
- Pagination (`setLimit` + `orderBy`) on all `GlideRecord` queries that may return more than 100 rows.
- JSDoc comments on every public Script Include method.

**Never use:**
- `current.setAbortAction(true)` without logging the reason via `gs.warn()`.
- Hard-coded `sys_id` values anywhere in scripts; resolve them by name/number at runtime.
- `GlideRecord.get(sys_id)` without checking the return value before accessing fields.
