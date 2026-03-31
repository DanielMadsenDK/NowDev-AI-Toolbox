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
- [Best Practices](#best-practices)

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
| `active` | Boolean | Flag that indicates whether the tab is active. Default: `true` |
| `widgets` | Array | A list of widgets to display in the tab. See [widgets array](#widgets-array). |

Within a dashboard, tabs are ordered using their position in the array.

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
                $id: Now.ID['header-widget'],
                component: 'heading',
                componentProps: {
                    variant: 'header-primary',
                    label: 'Dashboard Metrics',
                    level: '1'
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
        $id: Now.ID['recent-incidents-list'],
        component: 'list',
        componentProps: {
            table: 'incident',
            filter: 'active=true',
            limit: 10,
            columns: ['number', 'short_description', 'priority', 'state']
        },
        height: 8,
        width: 6,
        position: { x: 6, y: 0 },
    }
]
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

Permissions can reference users, groups, or roles using either raw sys_id strings or `Now.ref` for type-safe lookups:

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
        $id: Now.ID['itil-role-permission'],
        role: Now.ref('sys_user_role', { sys_id: '2831a114c611228501d4ea6c309d626d' }),
        canRead: true,
        canWrite: true,
        canShare: false,
        owner: false,
    },
    {
        $id: Now.ID['support-group-permission'],
        group: Now.ref('sys_user_group', { sys_id: 'd625dccec0a8016700a222a0f7900d06' }),
        canRead: true,
        canWrite: false,
        canShare: false,
        owner: false,
    }
]
```

Raw sys_id strings work as well but `Now.ref` is preferred for explicitness:

```ts
{
    $id: Now.ID['read-only-role-permission'],
    role: '2831a114c611228501d4ea6c309d626d',
    canRead: true,
}
```

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
                    $id: Now.ID['recent-incidents-list'],
                    component: 'list',
                    componentProps: {
                        table: 'incident',
                        filter: 'active=true',
                        limit: 10,
                        columns: ['number', 'short_description', 'priority', 'state']
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

## Best Practices

1. **Grid Layout:** Use the 48-point grid system for consistent, responsive layouts
2. **Data Sources:** Use `filterQuery` to limit data at the source for better performance
3. **Metrics:** Use appropriate `aggregateFunction` for your data (COUNT for cardinality, SUM for totals, AVG for averages)
4. **Grouping:** Limit `maxNumberOfGroups` to keep visualizations readable
5. **Permissions:** Always set at least one user or role as the owner (`owner: true`)
6. **Visibilities:** Connect dashboards to workspaces for unified UX experiences
7. **Tabs:** Organize related widgets in logical tabs for better navigation
