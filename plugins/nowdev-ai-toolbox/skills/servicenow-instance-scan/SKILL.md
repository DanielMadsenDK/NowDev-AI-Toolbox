---
name: servicenow-instance-scan
context: fork
user-invocable: false
description: Navigation and guardrails for creating ServiceNow Instance Scan checks with the Fluent SDK. Use when building automated governance checks, but verify all SDK API shapes with `now-sdk explain` first.
---

# ServiceNow Instance Scan

Use this skill for Instance Scan intent, check selection, and NowDev routing. Do **not** use it as local API reference for Fluent SDK constructors, imports, or properties.

## Authoritative SDK Source

Always verify the installed SDK documentation before writing code:

```bash
now-sdk explain instance-scan-guide --format raw
now-sdk explain tablecheck-api --format raw
now-sdk explain lintercheck-api --format raw
now-sdk explain columntypecheck-api --format raw
now-sdk explain scriptonlycheck-api --format raw
```

If a topic name changes, discover it with:

```bash
now-sdk explain --list instance-scan
now-sdk explain --list scan
```

## Check Selection

| Need | Likely Check Type |
|---|---|
| Evaluate records from one table with a condition or script | TableCheck |
| Evaluate script-like columns across many tables | ColumnTypeCheck |
| Apply lint-style rules to scripts | LinterCheck |
| Run standalone governance logic | ScriptOnlyCheck |

Treat this table as routing guidance only. Confirm available APIs and required properties with `now-sdk explain`.

## NowDev Routing

- For Fluent implementation, invoke NowDev-AI-Fluent-Schema-Developer because Instance Scan checks are structural/governance metadata.
- For review, invoke NowDev-AI-Fluent-Reviewer and require it to fetch the relevant `now-sdk explain` topics.
- For Classic/background diagnostic scripts that are not Fluent metadata, use the relevant Classic scripting/data skill instead.

## Guardrails

- Do not copy constructor examples from local docs; fetch the installed SDK topic.
- Validate table names, script columns, categories, priorities, and target scope against live instance/workspace facts before finalizing checks.
- Keep complex check logic readable and testable, but verify whether the installed SDK recommends inline script content or file inclusion for the specific check type.
