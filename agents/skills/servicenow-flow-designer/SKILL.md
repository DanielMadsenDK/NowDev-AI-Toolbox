---
name: servicenow-flow-designer
context: fork
user-invocable: false
description: Programmatically EXECUTE existing flows, subflows, and actions from server-side scripts using sn_fd.FlowAPI. Use when calling an already-built flow from a Business Rule, Script Include, or scheduled job — not for defining or building new flows. For DEFINING new flows as code in a Fluent SDK project, use servicenow-fluent-development instead. Trigger this skill whenever the user wants to run a flow from a script, trigger a subflow programmatically, call an IntegrationHub action from code, or use FlowAPI.getRunner() to execute workflow logic from a server-side context.
last_verified: "2026-05-18"
---

# Flow Designer Scripting

Use for Classic FlowAPI execution: programmatically running existing flows, subflows, actions, and datastreams from server-side scripts with `sn_fd.FlowAPI`. For defining new flows as code in Fluent SDK projects, use `now-sdk explain wfa-flow-guide --format raw` and the artifact-specific Fluent WFA topic.

## Classic FlowAPI vs Fluent SDK WFA

| Use Case | Approach |
|----------|----------|
| Execute an existing flow from a Business Rule, Script Include, or scheduled job | Classic `sn_fd.FlowAPI` |
| Execute an existing subflow or IntegrationHub action from code | Classic `sn_fd.FlowAPI` |
| Define a new flow as code in an SDK project | Fluent WFA after `now-sdk explain wfa-flow-guide --format raw` |
| Event-driven/scheduled automation in a Fluent app | Fluent WFA / Script Action docs via installed SDK lookup |

## Execution Mode Guardrails

| Mode | Use When | Guardrail |
|------|----------|-----------|
| `inForeground()` | Caller needs outputs immediately | Subject to timeout; check `wasSuccessful()` before outputs |
| `inBackground()` | Long-running or non-blocking work | Caller cannot rely on immediate outputs |
| `inDomain(domain)` | Domain-separated execution | Runs as System User in specified domain; respect data isolation |

## Critical Guardrails

- This skill executes existing flows; do not use it as guidance for defining new Fluent flows.
- Always pass required inputs explicitly with `withInputs()`.
- Always check `result.wasSuccessful()` before reading `getOutputs()`.
- Use background execution for heavy work or flows expected to run longer than a few seconds.
- Avoid launching flows from async Business Rules; use scheduled jobs or a deliberate background orchestration pattern instead.
- Do not hardcode flow/action/subflow names when they vary by environment; use System Properties or configuration.
- Capture `getContextId()` for troubleshooting and execution history correlation.
- Handle exceptions and flow errors with sanitized `gs.error()` logging.
- Validate inputs before execution, especially sys_ids and user-supplied values.
- In domain-separated instances, be explicit about domain execution and access boundaries.

## Quick Patterns

```javascript
var result = sn_fd.FlowAPI.getRunner()
    .flow('global.my_flow')
    .inForeground()
    .withInputs({ sys_id: current.getUniqueValue() })
    .run();
if (result.wasSuccessful()) {
    var outputs = result.getOutputs();
} else {
    gs.error('Flow failed: ' + result.getErrorMessage());
}
```

```javascript
sn_fd.FlowAPI.getRunner()
    .subflow('my_app.process_request')
    .inBackground()
    .withInputs({ request_id: current.getUniqueValue() })
    .run();
```

## Builder Pattern

1. `sn_fd.FlowAPI.getRunner()` initializes the runner.
2. Choose one: `flow()`, `subflow()`, `action()`, or `datastream()`.
3. Set execution context with `inForeground()`, `inBackground()`, and optionally `inDomain()`.
4. Pass inputs with `withInputs()`.
5. Execute with `run()`.
6. Inspect `ScriptableFlowRunnerResult`: `wasSuccessful()`, `getOutputs()`, `getContextId()`, `getDomainId()`, `getDate()`.

## Key APIs

| API | Purpose |
|-----|---------|
| `sn_fd.FlowAPI` | Entry point for programmatic flow execution |
| `ScriptableFlowRunner` | Builder for flow/action/subflow/datastream execution |
| `ScriptableFlowRunnerResult` | Result, outputs, context, and success metadata |

## Reference

- Fluent WFA flow definitions: `now-sdk explain wfa-flow-guide --format raw` and the artifact-specific installed SDK topic.
- Classic FlowAPI, ScriptableFlowRunner, and Flow Designer execution APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
