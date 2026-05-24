---
name: servicenow-flow-designer
context: fork
user-invocable: false
description: Programmatically EXECUTE existing flows, subflows, and actions from server-side scripts using sn_fd.FlowAPI. Use when calling an already-built flow from a Business Rule, Script Include, or scheduled job — not for defining or building new flows. For DEFINING new flows as code in a Fluent SDK project, use servicenow-fluent-development instead. Trigger this skill whenever the user wants to run a flow from a script, trigger a subflow programmatically, call an IntegrationHub action from code, or use FlowAPI.getRunner() to execute workflow logic from a server-side context.
last_verified: "2026-05-18"
---

# Flow Designer Scripting

> **Scope:** This skill covers **Classic FlowAPI** execution — running flows, subflows, and actions programmatically from server-side scripts using `sn_fd.FlowAPI`. For the **Fluent SDK** `wfa` automation API (declarative `Flow()`, `wfa.trigger()`, `wfa.action()`), see [servicenow-fluent-development/FLOW-API.md](../servicenow-fluent-development/FLOW-API.md).

## Classic FlowAPI vs Fluent SDK WFA

| Use Case | Approach |
|----------|----------|
| **Execute an existing flow** from a Business Rule or Script Include | Classic `sn_fd.FlowAPI` (this skill) |
| **Define a new flow** as code in a Fluent SDK project | Fluent `wfa.trigger()` / `wfa.action()` (see FLOW-API.md) |
| Trigger a flow from a GlideAjax handler | Classic `sn_fd.FlowAPI` |
| Event-driven / scheduled automation in a Fluent app | Fluent WFA (`Flow()` with `trigger.record.*` or `trigger.scheduled.*`) |

> **Fluent WFA critical notes:** When building flows with the Fluent SDK, `Time`, `Duration`, and `TemplateValue` are **globally available** — do NOT import them. Data pills (`wfa.dataPill()`) must be used **directly** in action parameters — never assign them to variables first. WFA flows are declarative DSL; do not mix JavaScript abstractions.

## Quick start

**Execute flows programmatically**:

```javascript
var inputs = {};
inputs['sys_id'] = '57af7aec73d423002728660c4cf6a71c';

var result = sn_fd.FlowAPI.getRunner()
    .flow('global.my_flow')
    .inForeground()
    .withInputs(inputs)
    .run();

var contextId = result.getContextId();
var outputs = result.getOutputs();
```

**Execute actions**:

```javascript
var result = sn_fd.FlowAPI.getRunner()
    .action('global.markapproved')
    .inForeground()
    .inDomain('TOP/ACME')
    .withInputs(inputs)
    .run();
```

**Execute subflows**:

```javascript
var result = sn_fd.FlowAPI.getRunner()
    .subflow('my_app.process_request')
    .withInputs(inputs)
    .run();

var success = result.wasSuccessful();
```

## Builder pattern

1. **FlowAPI**: Creates a `getRunner()` builder
2. **ScriptableFlowRunner**: Configure flow/action/subflow:
   - `flow()`, `action()`, `subflow()`, or `datastream()`
   - `withInputs()` - Pass parameters
   - `inForeground()` or `inBackground()`
   - `inDomain()` - For domain-separated instances
3. **ScriptableFlowRunnerResult**: Inspect results:
   - `getContextId()`, `getOutputs()`, `getDomainId()`
   - `wasSuccessful()`, `getDate()`

## Best practices

- Use foreground execution for immediate results
- Use background for long-running flows
- Always check `wasSuccessful()` before accessing outputs
- Domain execution runs as System User in that domain
- Avoid async BR calls; use scheduled jobs instead
- Pass all required inputs explicitly
- Handle flow failures gracefully with error checking

## Key APIs

| API | Purpose |
|-----|---------|
| FlowAPI | Entry point; manages runner lifecycle |
| ScriptableFlowRunner | Builder for flow execution |
| ScriptableFlowRunnerResult | Result container and output handler |

## Examples

For working code examples covering incident escalation, approval workflows, and notification patterns, see [EXAMPLES.md](./EXAMPLES.md)

## Reference

For complete API documentation and advanced patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
