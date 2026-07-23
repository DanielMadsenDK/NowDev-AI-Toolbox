# Advanced Fluent Patterns

Supplementary NowDev routing notes only. Do not use this file as SDK API reference.

## Verification First

Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for CLI command construction, topic discovery, flags, output handling, and troubleshooting. For advanced artifacts, ask that skill to discover and fetch the relevant installed SDK topic before writing code.

Use local examples only when they describe NowDev workflow boundaries or project layout. API signatures, imports, properties, enums, and supported script/module behavior must come from installed SDK documentation retrieved through the canonical SDK skill.

## Routing Notes

| Need | First Step |
|---|---|
| First-class Fluent object exists | Use that object after the canonical SDK skill verifies the artifact topic |
| No first-class Fluent object exists | Ask the canonical SDK skill to retrieve topic `record-api` and verify whether `Record()` is appropriate |
| Cross-scope or external metadata reference | Ask the canonical SDK skill to retrieve topic `now-ref-guide` and verify `Now.ref()` behavior |
| File inclusion or script bridge | Ask the canonical SDK skill to retrieve topic `now-include-guide` and the artifact-specific topic |
| Generated record deletion | Ask the canonical SDK skill to retrieve topic `now.del` |
| UI Page, Service Portal, Workspace, or Catalog surface | Route to NowDev-AI-Fluent-UI-Developer after the canonical SDK skill fetches the relevant topic |
| AI Agent Studio or NowAssist artifact | Route to the AI Studio specialists after the canonical SDK skill fetches the relevant topic |

## Guardrails

- Prefer first-class SDK APIs over raw `Record()` when the installed SDK provides them.
- Treat `$override` as an escape hatch; ask `nowdev-ai-toolbox-servicenow-sdk` to retrieve topic `override-guide` for review policy and gotchas.
- Validate live table names, field names, roles, sys_ids, and plugin availability with workspace or instance facts before finalizing metadata.
- Keep advanced work in the correct specialist boundary so Schema, Logic, Automation, UI, and AI artifacts do not overwrite each other.
