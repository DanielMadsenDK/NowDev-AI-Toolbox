# Dashboard API

The Dashboard API defines dashboards (`par_dashboard`) for organizing and sharing data visually.

A dashboard consists of tabs, widgets, visibilities, and permissions. Each tab contains widgets that display data visualizations, headings, rich text, and other components.

Dashboards can be used as the home page of a workspace by referring to one or more workspaces from the `visibilities` array of the Dashboard object. To create a workspace, see [Workspace API - ServiceNow Fluent](./API-REFERENCE.md#workspace).

## Table of Contents

- [Dashboard Object](#dashboard-object)
- [tabs Array](#tabs-array)
- [widgets Array](#widgets-array)
- [componentProps Object](#componentprops-object)
- [permissions Array](#permissions-array)
- [visibilities Array](#visibilities-array)
- [Complete Dashboard Example](#complete-dashboard-example)
- [Component Compatibility Matrix](#component-compatibility-matrix)
- [Multi-Datasource Charts](#multi-datasource-charts)
- [Discovering Correct Config via Background Scripts](#discovering-correct-config-via-background-scripts)
- [Deployment: Dashboard Cache](#deployment-dashboard-cache)
- [Known Non-Functional Properties](#known-non-functional-properties)
- [Best Practices](#best-practices)
- [Post-Deployment Checklist](#post-deployment-checklist)

---

## Dashboard Object

Creates a shareable dashboard with data visualizations, filters, tabs, widgets, permissions, and visibility rules.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['String' or Number]`. When you build the application, this ID is hashed into a unique `sys_id`. |
| `name` | String | **Required.** A name to display for the dashboard. |
| `active` | Boolean | Flag that indicates whether the dashboard is active. Default: `true` |
| `topLayout` | Object | An array of widgets displayed outside of tabs, at the top of the dashboard. See [widgets array](#widgets-array) for widget properties. |
| `tabs` | Array | A list of tabs to display in the dashboard. See [tabs array](#tabs-array). |
| `permissions` | Array | A list of user permissions required to access the dashboard. See [permissions array](#permissions-array). |
| `visibilities` | Array | A list of visibility rules that control which UX experiences display the dashboard. Default: A default visibility rule is used. See [visibilities array](#visibilities-array). |
| `$meta` | Object | Metadata for the application metadata. With the `installMethod` property, you can map the application metadata to an output directory that loads only in specific circumstances. Valid values: `'demo'` (outputs to `metadata/unload.demo`), `'first install'` (outputs to `metadata/unload`). |

### Import

```ts
import { Dashboard } from '@servicenow/sdk/core'
```

### Basic Example

```ts
import '@servicenow/sdk/global'
import { Dashboard } from '@servicenow/sdk/core'

Dashboard({
    $id: Now.ID['incident-dashboard'],
    name: 'Incident Management Dashboard',
    tabs: [
        {
            $id: Now.ID['overview'],
            name: 'Overview',
            widgets: [
                {
                    $id: Now.ID['incident-count-chart'],
                    component: 'vertical-bar',
                    componentProps: {
                        title: 'Incident Count',
                        dataSource: 'incident',
                        aggregation: 'count'
                    },
                    height: 8,
                    width: 6,
                    position: { x: 0, y: 0 },
                },
            ],
        },
    ],
    permissions: [],
    visibilities: []
})
```

---

## tabs Array

Create tabs that contain widgets for a dashboard.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['String' or Number]`. |
| `name` | String | **Required.** A name to display on the tab. |
| `active` | Boolean | ⚠️ **Non-functional.** Accepted by the SDK but has no observable effect at runtime — the tab renders and is clickable regardless. Do not use to hide tabs. See [Known Non-Functional Properties](#known-non-functional-properties). |
| `widgets` | Array | A list of widgets to display in the tab. See [widgets array](#widgets-array). |

Within a dashboard, tabs are ordered using their position in the array.

> **topLayout:** Place persistent cross-tab widgets (e.g. global KPIs) in `topLayout`. These render **above the tab bar** and stay visible regardless of which tab the user selects. `topLayout` is a direct sibling of `tabs` in the Dashboard object — it has no `$id` or `name`. A collapse arrow (^) appears automatically so users can hide it. See [topLayout pattern](#toplayout-persistent-cross-tab-widgets).

### Example

```ts
tabs: [
    {
        $id: Now.ID['overview-tab'],
        name: 'Overview',
        widgets: [
            {
                $id: Now.ID['chart-widget'],
                component: 'line',
                componentProps: {
                    selectedElements: [],
                    chartVariation: 'stacked',
                    yAxisPosition: 'bottom'
                },
                height: 12,
                width: 12,
                position: { x: 0, y: 0 },
            },
            {
                $id: Now.ID['open-incidents-widget'],
                component: 'single-score',
                componentProps: {
                    headerTitle: 'Open Incidents',
                    dataSources: [
                        {
                            label: 'Incident',
                            sourceType: 'table',
                            tableOrViewName: 'incident',
                            filterQuery: 'active=true',
                            id: 'data_source_open'
                        }
                    ],
                    metrics: [
                        {
                            dataSource: 'data_source_open',
                            id: 'metric_open',
                            aggregateFunction: 'COUNT',
                            axisId: 'primary'
                        }
                    ]
                },
                height: 4,
                width: 12,
                position: { x: 0, y: 12 },
            }
        ],
    },
    {
        $id: Now.ID['details-tab'],
        name: 'Details',
        widgets: []
    }
]
```

---

## widgets Array

Create widgets within a tab in a grid layout.

Dashboards use a **48-point grid system** for positioning widgets.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['String' or Number]`. |
| `component` | Reference or String | **Required.** The name of a component (such as `'line'`, `'single-score'`) or the sys_id of a component from the UX Macroponent Definition (`sys_ux_macroponent`) table. Component names are case-insensitive and resolve to their sys_ids during the build process. |
| `height` | Number | **Required.** The height of the widget in grid units. |
| `width` | Number | **Required.** The width of the widget in grid units. Maximum value: 48 |
| `position` | Object | **Required.** The position of the widget in the grid layout with `x` and `y` properties. Example: `{ x: 0, y: 0 }` positions the widget in the top-left corner. |
| `componentProps` | Object | The property configuration of a component. See [componentProps object](#componentprops-object). |

### Example

```ts
widgets: [
    {
        $id: Now.ID['incident-count-chart'],
        component: 'vertical-bar',
        componentProps: {
            title: 'Incident Count',
            dataSource: 'incident',
            aggregation: 'count'
        },
        height: 8,
        width: 6,
        position: { x: 0, y: 0 },
    },
    {
        $id: Now.ID['recent-incidents-score'],
        component: 'single-score',
        componentProps: {
            headerTitle: 'Critical Incidents',
            dataSources: [
                {
                    label: 'Incident',
                    sourceType: 'table',
                    tableOrViewName: 'incident',
                    filterQuery: 'active=true^priority=1',
                    id: 'data_source_critical'
                }
            ],
            metrics: [
                {
                    dataSource: 'data_source_critical',
                    id: 'metric_critical',
                    aggregateFunction: 'COUNT',
                    axisId: 'primary'
                }
            ]
        },
        height: 8,
        width: 6,
        position: { x: 6, y: 0 },
    }
]
```

---

## topLayout — Persistent Cross-Tab Widgets

The `topLayout` property places widgets **above the tab bar**. These widgets remain visible on every tab — ideal for global KPI tiles. It is a sibling of `tabs`, not a tab itself.

- No `$id` or `name` on the `topLayout` object itself
- Uses the same `widgets` array structure as a tab
- A collapse/expand arrow (^) appears automatically in the UI
- Always deploy with `--reinstall` when adding or changing `topLayout` widgets

```ts
Dashboard({
    $id: Now.ID['my-dashboard'],
    name: 'My Dashboard',
    topLayout: {
        widgets: [
            {
                $id: Now.ID['kpi-open-incidents'],
                component: 'single-score',
                componentProps: {
                    headerTitle: 'Open Incidents',
                    dataSources: [
                        {
                            label: 'Incident',
                            sourceType: 'table',
                            tableOrViewName: 'incident',
                            filterQuery: 'active=true',
                            id: 'ds_open'
                        }
                    ],
                    metrics: [
                        {
                            dataSource: 'ds_open',
                            id: 'm_open',
                            aggregateFunction: 'COUNT',
                            axisId: 'primary'
                        }
                    ]
                },
                height: 4,
                width: 16,
                position: { x: 0, y: 0 }
            },
            {
                $id: Now.ID['kpi-open-changes'],
                component: 'single-score',
                componentProps: {
                    headerTitle: 'Open Changes',
                    dataSources: [
                        {
                            label: 'Change',
                            sourceType: 'table',
                            tableOrViewName: 'change_request',
                            filterQuery: 'active=true',
                            id: 'ds_change'
                        }
                    ],
                    metrics: [
                        {
                            dataSource: 'ds_change',
                            id: 'm_change',
                            aggregateFunction: 'COUNT',
                            axisId: 'primary'
                        }
                    ]
                },
                height: 4,
                width: 16,
                position: { x: 16, y: 0 }
            }
        ]
    },
    tabs: [/* ... */],
})
```

---

## componentProps Object

Configure the properties of widgets.

The available properties are determined by the component specified with the `component` property of the Dashboard object.

### Component Types

**Trend data components** require `dataSources`, `metrics`, and `trendBy` properties. The `groupBy` property is optional.

**Group data components** require `dataSources`, `metrics`, and `groupBy` properties. The `trendBy` property isn't supported in these visualizations.

**Simple data components** require `dataSources` and `metrics` properties. The `groupBy` and `trendBy` properties aren't supported in these visualizations.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `dataSources` | Array | A list of data sources for the component. See [dataSources structure](#datasources-structure). |
| `headerTitle` | String | A title to display with the widget. |
| `metrics` | Array | A list of metrics to measure for the data source. See [metrics structure](#metrics-structure). |
| `groupBy` | Array | A list of configurations for grouping and organizing data by data source. See [groupBy structure](#groupby-structure). |
| `trendBy` | Object | A configuration for trend charts. See [trendBy structure](#trendby-structure). |
| `sortBy` | String | The method of sorting data. Valid values: `'value'`, `'label'`, `'field'` |

### dataSources Structure

```ts
dataSources: [
  {
    label: "Incident",              // Human-readable label
    sourceType: "table",            // Type of data source
    tableOrViewName: "incident",    // ServiceNow table name
    filterQuery: "",                // Optional encoded query filter
    id: "data_source_1"             // Unique data source ID
  },
  // ... more data sources
]
```

### metrics Structure

```ts
metrics: [
    {
        dataSource: 'data_source_1',      // Must match dataSource id
        id: 'metric_1',                   // Unique metric ID
        aggregateFunction: 'AVG',         // COUNT, SUM, AVG, MIN, MAX, COUNT_DISTINCT
        aggregateField: 'business_duration',  // Field to be used for aggregation
        axisId: 'primary',                // Which axis to display the series
    },
    // ... more metrics
]
```

**Aggregate functions:** `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `COUNT_DISTINCT`

### groupBy Structure

```ts
groupBy: [
  {
    groupBy: [
      {
        dataSource: "data_source_1",  // Must match dataSource id
        groupByField: "state"         // Field to group by
      }
    ],
    maxNumberOfGroups: 10,            // Maximum categories to show
    showOthers: false                 // Show "Others" category
  },
  // ... more group configurations
]
```

### trendBy Structure

```ts
trendBy: {
  "trendByFrequency": "year",  // Frequency: date, week, month, year
  "trendByFields": [
    {
      "field": "sys_created_on",     // Field to trend on (from the table of the dataSource)
      "metric": "metric_1"            // ID of the metric
    }
  ]
}
```

### Trend Example (Line Chart)

In this example, the line component (a trend data type visualization) shows how a metric changes over time:

```ts
{
    component: 'line',
    componentProps: {
        dataSources: [
            {
                label: 'Incident',
                sourceType: 'table',
                tableOrViewName: 'incident',
                filterQuery: '',
                id: 'data_source_1',
            },
        ],
        headerTitle: 'Incidents by State',
        metrics: [
            {
                dataSource: 'data_source_1',
                id: 'metric_1',
                aggregateFunction: 'COUNT',
                axisId: 'primary',
            },
        ],
        trendBy: {
            trendByFrequency: "year",
            trendByFields: [
                {
                    field: "sys_created_on",
                    metric: "metric_1"
                }
            ]
        },
    },
    height: 14,
    width: 17,
    position: { x: 0, y: 0 },
}
```

### Simple Data Example (Single Score)

In this example, the single-score component (a simple data type visualization) shows a single count metric:

```ts
{
    component: 'single-score',
    componentProps: {
        dataSources: [
            {
                label: 'Incident',
                sourceType: 'table',
                tableOrViewName: 'incident',
                filterQuery: '',
                id: 'data_source_1',
            },
        ],
        headerTitle: 'Open Incidents',
        metrics: [
            {
                dataSource: 'data_source_1',
                id: 'metric_1',
                aggregateFunction: 'COUNT',
                axisId: 'primary',
            },
        ]
    },
    height: 14,
    width: 14,
    position: { x: 0, y: 0 },
}
```

---

## permissions Array

Define permissions to read, edit, and share a dashboard.

At least one of the `user`, `group`, or `role` properties must be specified for each permission in the array.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['String' or Number]`. |
| `user` | Reference or String | The variable identifier or sys_id of a user (`sys_user`) to which to grant permissions. To define a user, use the Record API. |
| `group` | Reference or String | The variable identifier or sys_id of a user group (`sys_user_group`) to which to grant permissions. |
| `role` | Reference or String | The variable identifier or sys_id of a role (`sys_user_role`) to which to grant permissions. |
| `canRead` | Boolean | Flag that indicates whether the user, group, or role can view the dashboard. Default: `true` |
| `canWrite` | Boolean | Flag that indicates whether the user, group, or role can edit the dashboard. Default: `false` |
| `canShare` | Boolean | Flag that indicates whether the user, group, or role can share the dashboard. Default: `false` |
| `owner` | Boolean | Flag that indicates whether the user, group, or role is the owner of the dashboard. For at least one user, the `owner` property should be set to `true`. Default: `false` |

### Example

The `role` property accepts a **role name string directly** (e.g. `'admin'`, `'itil'`). This is the simplest and most portable approach — no sys_id lookup required:

```ts
permissions: [
    {
        $id: Now.ID['owner-permission'],
        role: 'admin',          // role name string — simplest approach
        canRead: true,
        canWrite: true,
        canShare: true,
        owner: true,
    },
    {
        $id: Now.ID['itil-read-permission'],
        role: 'itil',
        canRead: true,
        canWrite: false,
        canShare: false,
        owner: false,
    }
]
```

`Now.ref` lookups and raw sys_id strings also work when you need to target a specific user, group, or scoped role by sys_id:

```ts
permissions: [
    {
        $id: Now.ID['owner-user-permission'],
        user: Now.ref('sys_user', { sys_id: 'a8f98bb0eb32010045e1a5115206fe3a' }),
        canRead: true,
        canWrite: true,
        canShare: true,
        owner: true,
    },
    {
        $id: Now.ID['support-group-permission'],
        group: Now.ref('sys_user_group', { sys_id: 'd625dccec0a8016700a222a0f7900d06' }),
        canRead: true,
    }
]
```

> **Best practice:** Always include at least one `owner: true` permission in every Dashboard definition. Without explicit permissions the dashboard may default to open access.

---

## visibilities Array

Define visibility rules for which UX experiences display the dashboard.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['String' or Number]`. |
| `experience` | Reference or String | **Required.** The variable identifier of a Workspace object or sys_id of a UX application (`sys_ux_page_registry`). |

### Example

Reference a Workspace object directly (most common):

```ts
visibilities: [
  {
    $id: Now.ID['dashboard-visibility'],
    experience: myWorkspace,
  }
]
```

Or reference an existing UX page registry record by sys_id using `Now.ref`:

```ts
visibilities: [
  {
    $id: Now.ID['dashboard-visibility'],
    experience: Now.ref('sys_ux_page_registry', { sys_id: 'abc123def456789' }),
  }
]
```

---

## Complete Dashboard Example

```ts
import '@servicenow/sdk/global'
import { Dashboard, Workspace } from '@servicenow/sdk/core'

// Define your workspace first
export const myWorkspace = Workspace({
  $id: Now.ID["my_workspace"],
  title: "My Workspace",
  path: "my-workspace",
  tables: ["incident"],
  listConfig: myListConfig
})

// Create the dashboard
export const incidentDashboard = Dashboard({
    $id: Now.ID['incident-dashboard'],
    name: 'Incident Management Dashboard',
    active: true,
    tabs: [
        {
            $id: Now.ID['overview'],
            name: 'Overview',
            widgets: [
                {
                    $id: Now.ID['incident-count-chart'],
                    component: 'vertical-bar',
                    componentProps: {
                        headerTitle: 'Incident Count by Priority',
                        dataSources: [
                            {
                                label: 'Incident',
                                sourceType: 'table',
                                tableOrViewName: 'incident',
                                filterQuery: 'active=true',
                                id: 'data_source_1'
                            }
                        ],
                        metrics: [
                            {
                                dataSource: 'data_source_1',
                                id: 'metric_1',
                                aggregateFunction: 'COUNT',
                                axisId: 'primary'
                            }
                        ],
                        groupBy: [
                            {
                                groupBy: [
                                    {
                                        dataSource: 'data_source_1',
                                        groupByField: 'priority'
                                    }
                                ],
                                maxNumberOfGroups: 10,
                                showOthers: false
                            }
                        ]
                    },
                    height: 12,
                    width: 24,
                    position: { x: 0, y: 0 },
                },
                {
                    $id: Now.ID['recent-incidents-score'],
                    component: 'single-score',
                    componentProps: {
                        headerTitle: 'Critical Incidents',
                        dataSources: [
                            {
                                label: 'Incident',
                                sourceType: 'table',
                                tableOrViewName: 'incident',
                                filterQuery: 'active=true^priority=1',
                                id: 'data_source_critical'
                            }
                        ],
                        metrics: [
                            {
                                dataSource: 'data_source_critical',
                                id: 'metric_critical',
                                aggregateFunction: 'COUNT',
                                axisId: 'primary'
                            }
                        ]
                    },
                    height: 12,
                    width: 24,
                    position: { x: 0, y: 12 },
                }
            ],
        },
        {
            $id: Now.ID['analytics'],
            name: 'Analytics',
            widgets: [
                {
                    $id: Now.ID['metrics-widget'],
                    component: 'single-score',
                    componentProps: {
                        dataSources: [
                            {
                                label: 'Incident',
                                sourceType: 'table',
                                tableOrViewName: 'incident',
                                filterQuery: 'state!=resolved',
                                id: 'data_source_1'
                            }
                        ],
                        headerTitle: 'Open Incidents',
                        metrics: [
                            {
                                dataSource: 'data_source_1',
                                id: 'metric_1',
                                aggregateFunction: 'COUNT',
                                axisId: 'primary'
                            }
                        ]
                    },
                    height: 12,
                    width: 12,
                    position: { x: 0, y: 0 },
                }
            ],
        }
    ],
    permissions: [
        {
            $id: Now.ID['admin-user-permission'],
            user: '6816f79cc0a8016401c5a33be04be441',
            canRead: true,
            canWrite: true,
            canShare: true,
            owner: true,
        },
        {
            $id: Now.ID['itil-role-permission'],
            role: '2831a114c611228501d4ea6c309d626d',
            canRead: true,
        },
        {
            $id: Now.ID['support-group-permission'],
            group: '287ebd7da9fe198100f92cc8d1d2154e',
            canRead: true,
        }
    ],
    visibilities: [
        {
            $id: Now.ID['workspace-visibility'],
            experience: myWorkspace,
        }
    ]
})
```

---

## Component Compatibility Matrix

All working components use the same `componentProps` structure: `{ headerTitle, dataSources, metrics, groupBy? }` unless noted. Confirmed against the SDK's `dashboard-component-resolver.ts`.

| Component | Status | Props pattern | Notes |
|---|---|---|---|
| `single-score` | ✅ Working | simple (dataSources + metrics) | KPI / numeric metric tile |
| `vertical-bar` | ✅ Working | group (+ groupBy) | Standard bar chart |
| `horizontal-bar` | ✅ Working | group (+ groupBy) | Better than vertical-bar for long labels |
| `line` | ✅ Working | trend (+ trendBy) | Line / trend chart |
| `area` | ✅ Working | trend (+ trendBy) | Area chart variant of line |
| `spline` | ✅ Working | trend (+ trendBy) | Smooth-curve line |
| `step` | ✅ Working | trend (+ trendBy) | Stepped line |
| `donut` | ✅ Working | group (+ groupBy) | Same props as vertical-bar |
| `pie` | ✅ Working | group (+ groupBy) | Same as donut |
| `semi-donut` | ✅ Working | group (+ groupBy) | Half-arc donut |
| `pareto` | ✅ Working | group (+ groupBy) | Bar + cumulative % line |
| `gauge` | ✅ Working | simple | No groupBy needed |
| `dial` | ✅ Working | simple | No groupBy needed |
| `scatter` | ✅ Working | trend + group (trendBy **AND** groupBy both required) | Unlike line/area/column, scatter needs both; trendBy for X-axis time, groupBy for series dimension |
| `heatmap` | ✅ Working | group — 2-field groupBy in ONE outer item | See heatmap groupBy pattern below |
| `pivot-table` | ✅ Working | group — 2-field groupBy as TWO outer items | Completely different from heatmap; requires `categoryIndex`, `numberOfGroupsBasedOn`, `maxNumberOfGroups: 'ALL'` (string), and `newReporting: true` — see pivot-table groupBy pattern below |
| `list` | ✅ Working | group (+ groupBy) | Full interactive data grid — see note below |
| `column` | ✅ Working | trend (trendBy required) | groupBy alone → "Invalid configuration"; must use trendBy |
| `boxplot` | ✅ Working | trend + group (trendBy + groupBy) | Statistical distribution over time per group; behaves like a time-series chart |
| `geomap` | ✅ Working | group — requires `mapSysId` + `colorConfig` | See geomap pattern below |
| `heading` | ❌ Broken | n/a | Crashes analytics bundle — renders as blank box |
| `rich-text` | ❌ Broken | n/a | Same crash as heading |
| `image` | ❌ Broken | n/a | Same crash as heading |
| `bubble` | ❌ Unsupported | n/a | Requires undocumented internal API — standard dataSources+metrics pattern fails; do not generate |
| `calendar-report` | ❌ Unsupported | n/a | Requires undocumented internal API — standard trendBy/startDateField patterns fail; do not generate |

### The `list` Component

The `list` component is one of the most useful for operational dashboards. It renders a **full interactive sortable data grid** — not a chart — with:
- Clickable record number links (e.g. INC links navigate to the incident form)
- Colored priority/state badges
- Column headers, real-time filtering, sorting, and pagination
- URL state updates as users interact

Use the same `componentProps` structure as any other data visualization component:

```ts
{
    $id: Now.ID['open-incidents-list'],
    component: 'list',
    componentProps: {
        headerTitle: 'Open Incidents',
        dataSources: [
            {
                label: 'Incident',
                sourceType: 'table',
                tableOrViewName: 'incident',
                filterQuery: 'active=true',
                id: 'data_source_1'
            }
        ],
        metrics: [
            {
                dataSource: 'data_source_1',
                id: 'metric_1',
                aggregateFunction: 'COUNT',
                axisId: 'primary'
            }
        ]
    },
    height: 14,
    width: 48,
    position: { x: 0, y: 0 },
}
```

### Why `heading`, `rich-text`, and `image` Crash

The `ui-core-analytics-bundle.jsdbx` analytics runtime assumes every dashboard widget is a data-visualization component with a data state manager. When it encounters `heading`, `rich-text`, or `image` — which have no data state manager — it calls `.set()` on an undefined object, throwing `TypeError: Cannot read properties of undefined (reading 'set')`. The TypeError is thrown but is non-fatal — other data-driven widgets on the same tab still render. The static layout components themselves render as blank empty containers. Do not use them.

### Why `bubble` and `calendar-report` Are Unsupported

These components exist in the component registry but require an **undocumented internal API** that is not the standard `dataSources + metrics + groupBy/trendBy` pattern. The SDK type accepts `componentProps` as `Record<string, unknown>`, so no type error is raised, but the component renders with errors like "Both the X and Y axis must be selected" (bubble) or "Select a Table to configure the calendar" (calendar-report) regardless of the props provided.

Approaches that **all fail** for `bubble`: `axisId: 'primary'`, `axisId: 'xAxis'/'yAxis'`, `axisId: 'x'/'y'`, two datasources with separate axis IDs.

Approaches that **all fail** for `calendar-report`: `trendBy`, `startDateField: 'opened_at'`, `table: 'incident'` + `startDateField`.

No native `par_dashboard_widget` examples exist on PDI instances to reverse-engineer from. **Do not generate code for these components** until working examples are found via the Background Script discovery method.

### geomap Pattern

`geomap` renders a world or region map with data-driven pins. It requires:
- `mapSysId` — references a `par_reporting_map` record. The standard **world map sys_id on PDI instances is `93b8a3a2d7101200bd4a4ebfae61033a`**
- `colorConfig: { type: 'default' }` — required (not optional); omitting it causes the map to render without colour intensity
- `groupByField` must be a **location-typed reference field** (e.g. `location` on `sys_user`)

```ts
{
    $id: Now.ID['user-location-map'],
    component: 'geomap',
    componentProps: {
        headerTitle: 'Users by Location',
        mapSysId: '93b8a3a2d7101200bd4a4ebfae61033a',  // world map — PDI standard
        colorConfig: { type: 'default' },               // required
        dataSources: [
            {
                label: 'Users',
                sourceType: 'table',
                tableOrViewName: 'sys_user',
                filterQuery: 'active=true',
                id: 'ds_users'
            }
        ],
        metrics: [
            {
                dataSource: 'ds_users',
                id: 'm_users',
                aggregateFunction: 'COUNT',
                axisId: 'primary'
            }
        ],
        groupBy: [
            {
                groupBy: [
                    { dataSource: 'ds_users', groupByField: 'location' }  // must be location-type field
                ],
                maxNumberOfGroups: 25,
                showOthers: false
            }
        ]
    },
    height: 14,
    width: 48,
    position: { x: 0, y: 0 }
}
```

### Two-Field groupBy Pattern (heatmap)

`heatmap` requires two dimensions. Both fields must be placed inside **a single `groupBy` item**:

```ts
// heatmap: both fields inside ONE outer groupBy item
groupBy: [
    {
        groupBy: [
            { dataSource: 'data_source_1', groupByField: 'category' },
            { dataSource: 'data_source_1', groupByField: 'priority' }
        ],
        maxNumberOfGroups: 25,   // number (not string) for heatmap
        showOthers: false
    }
]
```

### Pivot-Table groupBy Pattern (fundamentally different from heatmap)

`pivot-table` also requires two dimensions, but the structure is **completely different** from heatmap. Each dimension must be its **own separate outer `groupBy` item**, each with exactly **one field** and a `categoryIndex`:

```ts
// pivot-table: TWO separate outer groupBy items, each with ONE field
groupBy: [
    {
        groupBy: [
            { dataSource: 'data_source_1', groupByField: 'category' }
        ],
        categoryIndex: 0,                                      // 0 = rows
        numberOfGroupsBasedOn: 'NO_OF_GROUP_BASED_ON_PER_METRIC',  // required string enum
        maxNumberOfGroups: 'ALL'                               // must be string "ALL", not a number
    },
    {
        groupBy: [
            { dataSource: 'data_source_1', groupByField: 'priority' }
        ],
        categoryIndex: 1,                                      // 1 = columns
        numberOfGroupsBasedOn: 'NO_OF_GROUP_BASED_ON_PER_METRIC',
        maxNumberOfGroups: 'ALL'
    }
]
```

Pivot-table also requires these **top-level `componentProps`** or the table renders only a "Total" row:

| Property | Value | Purpose |
|---|---|---|
| `newReporting` | `true` | Required for pivot rows to render |
| `showTotalAggregate` | `true` | Enables the grand total row/column |
| `showFirstGroupAggregate` | `true` | Enables subtotals for the first group (rows) |
| `showSecondGroupAggregate` | `true` | Enables subtotals for the second group (columns) |

Full pivot-table example:

```ts
{
    $id: Now.ID['incident-pivot'],
    component: 'pivot-table',
    componentProps: {
        headerTitle: 'Incidents by Category and Priority',
        newReporting: true,
        showTotalAggregate: true,
        showFirstGroupAggregate: true,
        showSecondGroupAggregate: true,
        dataSources: [
            {
                label: 'Incident',
                sourceType: 'table',
                tableOrViewName: 'incident',
                filterQuery: 'active=true',
                id: 'data_source_1'
            }
        ],
        metrics: [
            {
                dataSource: 'data_source_1',
                id: 'metric_1',
                aggregateFunction: 'COUNT',
                axisId: 'primary'
            }
        ],
        groupBy: [
            {
                groupBy: [{ dataSource: 'data_source_1', groupByField: 'category' }],
                categoryIndex: 0,
                numberOfGroupsBasedOn: 'NO_OF_GROUP_BASED_ON_PER_METRIC',
                maxNumberOfGroups: 'ALL'
            },
            {
                groupBy: [{ dataSource: 'data_source_1', groupByField: 'priority' }],
                categoryIndex: 1,
                numberOfGroupsBasedOn: 'NO_OF_GROUP_BASED_ON_PER_METRIC',
                maxNumberOfGroups: 'ALL'
            }
        ]
    },
    height: 14,
    width: 48,
    position: { x: 0, y: 0 }
}
```

> **Common mistake:** Using the heatmap pattern (two fields in one outer item) for pivot-table causes the component to render only a "Total" row. The two patterns are not interchangeable.

---

## Multi-Datasource Charts

A single widget can compare data from multiple tables by defining multiple `dataSources` and `metrics` entries. This works on all standard chart types (`vertical-bar`, `line`, `area`, etc.).

**Rule:** The `groupBy[].groupBy` array must contain **one entry per datasource**, each with a matching `groupByField` name.

```ts
{
    $id: Now.ID['incidents-vs-changes'],
    component: 'vertical-bar',
    componentProps: {
        headerTitle: 'Incidents vs Changes by Priority',
        dataSources: [
            {
                label: 'Incidents',
                sourceType: 'table',
                tableOrViewName: 'incident',
                filterQuery: 'active=true',
                id: 'ds_incident'
            },
            {
                label: 'Changes',
                sourceType: 'table',
                tableOrViewName: 'change_request',
                filterQuery: 'active=true',
                id: 'ds_change'
            }
        ],
        metrics: [
            {
                dataSource: 'ds_incident',
                id: 'm_incident',
                aggregateFunction: 'COUNT',
                axisId: 'primary'
            },
            {
                dataSource: 'ds_change',
                id: 'm_change',
                aggregateFunction: 'COUNT',
                axisId: 'primary'
            }
        ],
        groupBy: [
            {
                groupBy: [
                    { dataSource: 'ds_incident', groupByField: 'priority' },
                    { dataSource: 'ds_change',   groupByField: 'priority' }
                ],
                maxNumberOfGroups: 5,
                showOthers: false
            }
        ]
    },
    height: 14,
    width: 48,
    position: { x: 0, y: 0 }
}
```

---

### Known Component Sys IDs (Advanced Charts Tab)

Some components can also be referenced by their `sys_ux_macroponent` sys_id instead of their string name:

| Component | Sys ID |
|---|---|
| `pivot-table` | `06f6aacbd1818110f877d87436272684` |
| `heatmap` | Web component name: `now-vis-heatmap-wrapper` |

### Discovering Correct Config via Background Scripts

When a widget renders incorrectly (e.g., pivot-table shows only "Total"), query live native platform widgets to find working examples. This is the authoritative approach for any undocumented component API.

1. Navigate to `{instance}/sys.scripts.do` (use the direct URL — not via the nav wrapper, for compatibility)
2. Run a GlideRecord query to find native platform widgets using the target component:

```javascript
var gr = new GlideRecord('par_dashboard_widget');
gr.addQuery('component', '06f6aacbd1818110f877d87436272684'); // pivot-table sys_id
gr.setLimit(3);
gr.query();
while (gr.next()) {
    gs.info(gr.getValue('component_props'));
}
```

3. Extract the `component_props` JSON from a working native widget — this is the ground truth for the component's expected configuration shape.

---

## Deployment: The Correct Install Command

> **Always use `--reinstall` when deploying dashboard changes.**

```bash
now-sdk build && now-sdk install --reinstall
```

`now-sdk install` (without `--reinstall`) is **idempotent on `component_props`**: once a widget record exists on the instance, its props are never updated by a plain install — only newly created records get fresh props. This means every componentProps fix is silently ignored.

`--reinstall` fully uninstalls then reinstalls all records, ensuring widget props are updated. It also **automatically regenerates `par_dashboard_cache`**, so manual cache deletion is not needed. It also **creates new tabs reliably**, so the two-install workaround is not needed.

Always run `now-sdk build` first — `--reinstall` without a fresh build deploys the stale cached artifact.

---

## Known Non-Functional Properties

> **Important for skill maintainers and agents:** The SDK type definitions are aspirational — they describe what the API *accepts*, not what the runtime *honours*. A property existing in TypeScript with a JSDoc comment does not guarantee the platform version on a PDI implements it. Before generating code that uses any property, verify by observable effect: "Can I see the difference when I toggle this?" If not, do not include it.
>
> **Before attempting any undocumented or suspect property**, query `par_dashboard_widget` via Background Script on `sys.scripts.do` to find native examples — do not use trial-and-error with componentProps.

### Confirmed Non-Functional SDK Properties

| Property | Location | Documented Behaviour | Actual Behaviour | Verdict |
|---|---|---|---|---|
| `active: false` | `tabs[]` item | Hide/deactivate the tab | Tab renders fully, is clickable, indistinguishable from `active: true` | Not implemented on PDI — do not use |

### Confirmed Broken/Unsupported Components

These components are accepted by the SDK type system but fail at runtime on PDI instances. **Do not generate code for any of these.** Use the Background Script discovery method (see [Discovering Correct Config via Background Scripts](#discovering-correct-config-via-background-scripts)) if you need to attempt them.

| Component | Failure Mode | Notes |
|---|---|---|
| `heading` | `TypeError` at runtime — renders as blank box | Analytics bundle calls `.set()` on undefined state manager |
| `rich-text` | Same as `heading` | Same root cause |
| `image` | Same as `heading` | Same root cause |
| `bubble` | Renders with "Both the X and Y axis must be selected" | Requires undocumented internal API; all standard prop patterns fail |
| `calendar-report` | Renders with "Select a Table to configure the calendar" | Requires undocumented internal API; all standard prop patterns fail |
| `indicator-scorecard` | Not functional on PDI instances | No native `par_dashboard_widget` examples found to reverse-engineer |
| `compatibility-mode-widget` | Not functional on PDI instances | Internal/legacy component — not configurable via standard API |

---

## Best Practices

1. **Grid Layout:** Use the 48-point grid system for consistent, responsive layouts
2. **Data Sources:** Use `filterQuery` to limit data at the source for better performance
3. **Metrics:** Use appropriate `aggregateFunction` for your data (COUNT for cardinality, SUM for totals, AVG for averages)
4. **Grouping:** Limit `maxNumberOfGroups` to keep visualizations readable
5. **Permissions:** Always include `permissions` in every Dashboard definition. Use role name strings (e.g. `role: 'admin'`) for portability. Always set at least one entry as `owner: true`.
6. **Visibilities:** Connect dashboards to workspaces for unified UX experiences. The link is **one-directional**: the Dashboard references the Workspace via `visibilities[].experience`. The Workspace object has no dashboard property. Without this link, the workspace home tab shows "You don't have any dashboards yet."
7. **Tabs:** Organize related widgets in logical tabs for better navigation. Always deploy with `--reinstall` to ensure new tabs are created reliably.
8. **topLayout for global KPIs:** Use `topLayout` for KPI tiles (single-score) that should remain visible on every tab. Keep these brief — 2-4 KPI tiles at full 48-wide span works well.
9. **Unique `$id` tokens:** Use unique `$id` values across the **entire** dashboard — not just within one tab. Duplicate `$id` values across tabs cause silent widget duplication where only one of the duplicates is persisted. Naming convention: include a tab abbreviation, e.g. `my_widget_overview_tab` vs `my_widget_incidents_tab`.
10. **Use `list` for record browsing:** The `list` component renders a full sortable, paginated data grid with clickable record links and colored badges. It uses the same `componentProps` structure as all other data viz components (`dataSources` + `metrics`). Prefer it over custom UI pages when users need to browse and drill into individual records from a workspace dashboard.
11. **Never generate `bubble` or `calendar-report`:** These components require an undocumented internal API — the standard dataSources+metrics pattern fails. Exclude them from all generated Dashboard code.

---

## Post-Deployment Checklist

After every dashboard change:

- [ ] Run `now-sdk build && now-sdk install --reinstall` — this updates widget props, regenerates `par_dashboard_cache`, and reliably creates new tabs in one step
- [ ] Hard-reload the workspace (Ctrl+Shift+R)
- [ ] Click every tab — tab content is lazy-loaded; unvisited tabs won't appear in screenshots
- [ ] Check browser console for `TypeError` crashes — these indicate a widget using `heading`, `rich-text`, or `image`
- [ ] Verify widget counts per tab match the `.now.ts` definition
- [ ] Verify any new property by observable effect before shipping — if you can't see the difference, the property likely has no runtime effect on this platform version
