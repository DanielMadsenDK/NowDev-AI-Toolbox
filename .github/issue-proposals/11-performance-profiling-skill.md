---
title: "Add ServiceNow Performance Profiling and Instance Health Skill"
labels: ["enhancement", "new-skill"]
---

## Summary

Add a **ServiceNow Performance Profiling skill** that helps developers identify and resolve performance issues in their ServiceNow instances — including slow Business Rules, inefficient GlideRecord queries, N+1 query patterns, and client-side performance bottlenecks.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes several performance and observability-focused skills:

- **[appinsights-instrumentation](https://github.com/github/awesome-copilot/blob/main/skills/appinsights-instrumentation/SKILL.md)** — instrument a webapp to send useful telemetry data to Azure App Insights
- **[azure-resource-health-diagnose](https://github.com/github/awesome-copilot/blob/main/skills/azure-resource-health-diagnose/SKILL.md)** — analyze resource health, diagnose issues from logs and telemetry
- **[bigquery-pipeline-audit](https://github.com/github/awesome-copilot/blob/main/skills/bigquery-pipeline-audit/SKILL.md)** — audits pipelines for cost safety and production readiness

ServiceNow performance issues are a common pain point — Business Rules that run too slowly degrade the entire platform, inefficient queries cause timeouts, and client scripts block form loading. Developers need guidance on profiling and resolving these issues.

The NowDev AI Toolbox's `NowDev-AI-Debugger` handles runtime errors, but there's no skill focused on **proactive performance optimization**.

## Proposed Work

Create a new skill: **`servicenow-performance-profiling`**

### Skill Structure
```
agents/skills/servicenow-performance-profiling/
├── SKILL.md
└── references/
    ├── QUERY-OPTIMIZATION.md       # GlideRecord and GlideAggregate patterns
    ├── BUSINESS-RULE-PERF.md       # BR timing, async vs sync, batching
    ├── CLIENT-SIDE-PERF.md         # Client Script, UI Policy optimization
    ├── PROFILING-TOOLS.md          # SN profiler, slow query log, event log
    └── ANTI-PATTERNS.md            # N+1 queries, sync in loops, DOM thrashing
```

### Skill Capabilities

**1. Static Code Performance Analysis**

Scan ServiceNow scripts for known performance anti-patterns:

| Anti-Pattern | Impact | Recommendation |
|-------------|--------|---------------|
| `GlideRecord.query()` in a loop | Critical — N+1 queries | Use `GlideRecord` with `IN` query or `GlideAggregate` |
| `.next()` without field limit | High — fetches all columns | Use `addQuery` with field selection |
| Synchronous GlideAjax in `onLoad` | High — blocks form render | Use async callback pattern |
| `gr.getValue()` repeated on same field | Medium — redundant calls | Cache in local variable |
| Business Rule on non-filtered condition | Medium — runs on all records | Add specific query conditions |
| `gs.log()` in production Business Rules | Low — performance overhead | Remove or replace with `gs.debug()` |

**2. Performance Instrumentation Guidance**

Guide developers to use ServiceNow's built-in profiling tools:
- **Slow Query Log** analysis — how to read and act on slow query reports
- **Business Rule Profiler** — how to enable and interpret BR timing data
- **Script Profiler** — for custom server-side script execution times
- **Client Transaction Timings** — for client-side performance data

**3. Query Optimization Patterns**

Provide concrete refactoring suggestions:
- Transform N+1 patterns into single-query alternatives
- Rewrite `GlideRecord` loops to use `GlideAggregate` where appropriate
- Suggest index creation for frequently queried fields
- Recommend encoded query caching patterns

**4. ATF Performance Tests**

Generate ATF tests that include performance assertions:
- Test that a Business Rule completes within a configurable time limit
- Test that a REST API endpoint responds within SLA thresholds
- Test that batch operations don't exceed transaction timeout limits

## Example Usage

```
@NowDev-AI-Agent Profile the performance of my incident_before_update business rule
and suggest optimizations

@NowDev-AI-Agent Analyze all GlideRecord queries in x_myapp_incident_utils.js 
for N+1 patterns
```

## Integration Points

- Should be invocable by `NowDev-AI-Reviewer` as part of the standard review checklist
- Should be triggered automatically when the orchestrator detects large datasets or high-frequency table operations
- Should reference the existing `servicenow-script-server-logic` skill's anti-patterns
- Output should include both findings and ready-to-use refactored code

## References

- [awesome-copilot appinsights-instrumentation skill](https://github.com/github/awesome-copilot/blob/main/skills/appinsights-instrumentation/SKILL.md)
- [ServiceNow Performance Best Practices](https://docs.servicenow.com/bundle/washingtondc-platform-security/page/script/general-scripting-guidelines/concept/c_ScriptingBestPractices.html)
- [ServiceNow Slow Query Log](https://docs.servicenow.com/bundle/washingtondc-platform-administration/page/administer/performance/concept/c_SlowQueryLog.html)
