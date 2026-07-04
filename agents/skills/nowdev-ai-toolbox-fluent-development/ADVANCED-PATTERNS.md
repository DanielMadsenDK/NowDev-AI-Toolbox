# Advanced Fluent Patterns

Supplementary NowDev routing notes only. Do not use this file as SDK API reference.

## Verification First

For advanced artifacts, discover and fetch the installed SDK topic before writing code:

```bash
now-sdk explain --list <keyword>
now-sdk explain <topic> --format raw
```

Use local examples only when they describe NowDev workflow boundaries or project layout. API signatures, imports, properties, enums, and supported script/module behavior must come from `now-sdk explain`.

## Routing Notes

| Need | First Step |
|---|---|
| First-class Fluent object exists | Use that object after verifying the topic with `now-sdk explain` |
| No first-class Fluent object exists | Verify whether `Record()` is appropriate with `now-sdk explain record-api --format raw` |
| Cross-scope or external metadata reference | Verify `Now.ref()` behavior with `now-sdk explain now-ref-guide --format raw` |
| File inclusion or script bridge | Verify `now-sdk explain now-include-guide --format raw` and the artifact-specific topic |
| Generated record deletion | Verify `now-sdk explain now.del --format raw` |
| UI Page, Service Portal, Workspace, or Catalog surface | Route to NowDev-AI-Fluent-UI-Developer after fetching the relevant explain topic |
| AI Agent Studio or NowAssist artifact | Route to the AI Studio specialists after fetching the relevant explain topic |

## Guardrails

- Prefer first-class SDK APIs over raw `Record()` when the installed SDK provides them.
- Treat `$override` as an escape hatch; use `now-sdk explain override-guide --format raw` for review policy and gotchas.
- Validate live table names, field names, roles, sys_ids, and plugin availability with workspace or instance facts before finalizing metadata.
- Keep advanced work in the correct specialist boundary so Schema, Logic, Automation, UI, and AI artifacts do not overwrite each other.
