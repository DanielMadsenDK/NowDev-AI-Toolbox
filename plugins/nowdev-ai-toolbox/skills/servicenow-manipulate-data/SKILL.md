---
name: servicenow-manipulate-data
context: fork
user-invocable: false
description: >-
  Query, insert, update, and delete records in the ServiceNow database with emphasis on performance and security. Covers two approaches: (1) Classic GlideRecord/GlideAggregate API for existing instances and legacy code, and (2) Modern Fluent SDK (GlideQuery, GlideQuery.select, .selectOne, .reduce) for new TypeScript projects. Use when working with database records, aggregating data, or implementing data-driven logic. For legacy/existing instances, recommend Classic patterns; for new SDK projects, recommend Fluent GlideQuery patterns. Trigger this skill whenever the user needs to query, create, update, or delete ServiceNow records, aggregate data with GlideAggregate or GlideQuery, count records, or perform any database operations — even for simple lookups or record iteration.
last_verified: "2026-05-18"
---

# Manipulate ServiceNow Data

Use for querying, inserting, updating, deleting, and aggregating ServiceNow records. For Fluent SDK data helpers, use `now-sdk explain data-helpers-guide --format raw` and the relevant installed SDK topic.

## Choosing Your Approach

| Situation | Use | Rationale |
|-----------|-----|-----------|
| Existing instance scripts, Business Rules, GlideAjax methods | Classic GlideRecord | Maximum compatibility |
| ACL-enforced reads/writes | `GlideRecordSecure` | Respects user permissions |
| Counts, sums, averages, grouping | `GlideAggregate` | Database does aggregation |
| New TypeScript SDK project | Fluent SDK / GlideQuery | Type safety and modern syntax |
| Quick one-off script or legacy code | GlideRecord | Lowest setup cost |

## Performance Guardrails

- Never iterate just to count or sum; use `GlideAggregate` (Classic) or installed Fluent data helpers.
- Use `setLimit()` for existence checks and large datasets.
- Always call `query()` before `next()` and verify `next()` / `get()` succeeded before reading fields.
- Prefer `getValue()` for internal values and `getDisplayValue()` for reference display values; avoid dot-walking in loops.
- Avoid N+1 queries; collect IDs and query related records once, or use joins where appropriate.
- Copy encoded queries from list views for complex filters, then validate on sub-production.
- Use `addQuery()` / `where()` APIs rather than concatenating user input into query strings.
- Refactor repeated query logic into Script Includes or SDK modules.
- For bulk writes/deletes, limit scope, log counts, handle errors, and test on sub-production first.

## Security Guardrails

- Use `GlideRecordSecure` when ACL enforcement matters or data is user-facing.
- Do not expose `gr.getJSON()` or entire records to clients; return only allowed fields.
- Validate table names, field names, sys_ids, and enum values before using user-supplied input.
- Never hardcode secrets or environment-specific sys_ids in data scripts.
- For destructive operations (`deleteRecord`, bulk update), require explicit conditions and guardrails.

## Quick Patterns

```javascript
var incidentGr = new GlideRecord('incident');
incidentGr.addQuery('active', true);
incidentGr.addQuery('priority', '<=', 2);
incidentGr.setLimit(100);
incidentGr.query();
while (incidentGr.next()) {
    gs.info(incidentGr.getValue('number'));
}
```

```javascript
var agg = new GlideAggregate('incident');
agg.addQuery('state', 'open');
agg.addAggregate('COUNT');
agg.query();
if (agg.next()) gs.info(agg.getAggregate('COUNT'));
```

## Key APIs

| API | Purpose |
|-----|---------|
| `GlideRecord` | Classic CRUD and queries |
| `GlideRecordSecure` | ACL-enforced CRUD and queries |
| `GlideAggregate` | Counts, sums, averages, grouping |
| `GlideQuery` | Fluent/modern query API in supported SDK contexts |
| `GlideFilter` | Advanced filtering operations |

## Reference

- Fluent SDK data access: `now-sdk explain data-helpers-guide --format raw` and the relevant installed SDK topic.
- Classic GlideRecord, GlideRecordSecure, GlideAggregate, and data APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
