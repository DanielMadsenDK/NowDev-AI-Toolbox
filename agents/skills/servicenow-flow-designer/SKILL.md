---
name: servicenow-flow-designer
user-invokable: false
description: Execute custom scripts and logic within Flow Designer and IntegrationHub workflows. Covers FlowAPI methods, flow execution, and subprocess orchestration. Use when building workflow automations, executing flows programmatically from server scripts, or triggering subflows conditionally.
---

# Flow Designer Scripting

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

## Reference

For complete API documentation and advanced patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
