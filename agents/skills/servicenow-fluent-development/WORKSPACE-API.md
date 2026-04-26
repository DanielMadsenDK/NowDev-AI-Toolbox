# Workspace API

The Workspace API defines configurable workspace experiences for organizing and sharing data visually. Workspaces create application metadata in the following tables depending on the workspace definition:

- UX Application [sys_ux_page_registry]
- UX App Configuration [sys_ux_app_config]
- UX Application Category M2M [sys_ux_registry_m2m_category]
- UX Page Property [sys_ux_page_property]
- UX Screen Collection [sys_ux_screen_type]
- UX App Route [sys_ux_app_route]
- UX Screen [sys_ux_screen]
- UX Macroponent Definition [sys_ux_macroponent]

## Related Concepts

- **Dashboards**: Can be used as the home page of a workspace by referring to one or more workspaces from the `visibilities` array of the Dashboard object. See [Dashboard API](./DASHBOARD-API.md).
- **Access Control**: Workspaces require ACLs to secure workspace routes. The `field` property of an Acl object must match the value of the workspace `path` property with a wildcard pattern: `{workspace.path}.*`
- **ServiceNow Fluent**: Language constructs for `Now.ID`, `Now.ref`, `Now.include`, and `Now.attach`. See [ServiceNow Fluent documentation](./API-REFERENCE.md#fluent-language-constructs).

---

## Build Order

When building a complete workspace with navigation and a dashboard, create components in this order:

1. **Role** and **Applicability** — referenced by UxListMenuConfig lists and dashboard permissions
2. **UxListMenuConfig** — must be created before the Workspace that references it
3. **Workspace** — references `listConfig`; provides the path used by ACLs and dashboard visibilities
4. **Dashboard** — references the Workspace via `visibilities`; must be created after the Workspace
5. **Acl** — secures the workspace route with `field: '{path}.*'`

## Post-Build: Verify and Share Access URLs

After `snc-sdk build` and `snc-sdk install` succeed:

1. **Extract the workspace sys_id** — read `src/fluent/generated/keys.ts` and find the entry for `sys_ux_page_registry` with your workspace's `$id` key. The generated value is the real `sys_id`.

2. **Provide the user with two clickable URLs:**
   - **Access the workspace:** `/now/{path}/{landingPath}` (e.g., `/now/asset-management/home`)
   - **Edit in UI Builder:** `/now/builder/ui/experience/{workspace_sys_id}` (replace `{workspace_sys_id}` with the value extracted from `keys.ts`)

> **File organization:** Place workspace files under `src/fluent/workspaces/{workspace-name}/`: `workspace.now.ts`, `list-menu.now.ts`, `dashboard.now.ts`

---

## Workspace Object

Create a workspace for managing business entities in a single focused working area that enables users to complete an entire job.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `title` | String | Yes | A name for the workspace that appears in navigation and headers. |
| `path` | String | Yes | The URL path segment of the workspace. Workspace URLs follow the pattern `/now/<path>/<landingPath>` and use kebab case. **For custom scoped apps, the URL pattern is different — see note below.** |
| `tables` | Array | No | A list of table names to manage in the workspace. Example: `['incident', 'problem', 'change_request']` |
| `listConfig` | Reference | No | The variable identifier of a UxListMenuConfig object that defines the navigation structure of the workspace. |
| `landingPath` | String | No | The URL path segment of the landing page. Workspace URLs follow the pattern `/now/<path>/<landingPath>` and use kebab case. Default: `'home'` |
| `order` | Number | No | The order in which this workspace appears in the unified navigation. Lower numbers appear first. |
| `active` | Boolean | No | Flag that indicates whether the workspace is accessible to users. Default: `true` |
| `defaultRecordOverrides` | Object | No | Overrides for records not tracked by the plugin. A map of record keys to field overrides: `{ [record: string]: { [key: string]: unknown } }` |
| `$meta` | Object | No | Metadata for installation behavior. `installMethod: 'demo'` (outputs to `metadata/unload.demo`) or `'first install'` (outputs to `metadata/unload`). |

### Basic Example

```ts
import { Workspace } from '@servicenow/sdk/core';

const itsmWorkspace = Workspace({
    $id: Now.ID['itsm_workspace'],
    title: 'IT Service Management',
    path: 'itsm',
    tables: ['incident', 'problem', 'change_request', 'user', 'sys_user_group'],
    listConfig: incidentListConfig
});
```

### With Landing Path and Active Flag

Use `landingPath` to control the default route and `active: false` to deploy a workspace in a disabled state (useful for staged rollouts or demo configurations):

```ts
const stagingWorkspace = Workspace({
    $id: Now.ID['staging-workspace'],
    title: 'Asset Management',
    path: 'asset-mgmt',
    landingPath: 'overview',
    active: false,
    tables: ['alm_asset', 'cmdb_ci'],
});
```

---

## UxListMenuConfig Object

Define a UX list menu configuration [sys_ux_list_menu_config] for the navigation structure and list views of a workspace.

A UX list menu configuration organizes data into categories and lists, enabling users to access different views of business data with filtering, column selection, and role-based visibility. This structure appears in the workspace's navigation panel, providing organized access to different data views.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `name` | String | Yes | A name for the list configuration. |
| `description` | String | No | A description of the list configuration. |
| `active` | Boolean | No | Flag that indicates whether the list configuration is active. Default: `true` |
| `categories` | Array | No | A list of top-level groupings in the list configuration. See [categories array](#categories-array). |

### Example

```ts
import { UxListMenuConfig } from '@servicenow/sdk/core';

const incidentListConfig = UxListMenuConfig({
    $id: Now.ID['incident_list_config'],
    name: 'Incident List Configuration',
    description: 'Navigation for Incident Workspace',
    categories: [
        {
            $id: Now.ID['incidents_category'],
            title: 'Incidents',
            order: 10,
            lists: [
                {
                    $id: Now.ID['incidents_open'],
                    title: 'Open',
                    order: 10,
                    condition: 'active=true^EQ',
                    table: 'incident',
                    columns: 'number,short_description,priority,state',
                    applicabilities: [
                        {
                            $id: Now.ID['incidents_open_applicability'],
                            applicability: applicability
                        }
                    ]
                }
            ]
        }
    ]
});
```

---

## categories Array

Define categories of related lists [sys_ux_list_category] for a UX list menu configuration.

Categories organize list views into logical groupings that appear in the workspace navigation sidebar. Each category can contain multiple list views.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `title` | String | Yes | A title for the category to display in the navigation menu. |
| `lists` | Array | Yes | A list of list views in the category. See [lists array](#lists-array). |
| `order` | Number | No | A number indicating the position of the category in the navigation menu. Categories with lower numbers appear first. |
| `active` | Boolean | No | Flag that indicates whether the category is visible in the navigation menu. Default: `true` |
| `description` | String | No | A description of the category. |

### Example

```ts
categories: [
    {
        $id: Now.ID["incidents_category"],
        title: "Incidents",
        order: 10,
        description: "Incident management views",
        active: true,
        lists: [
            {
                $id: Now.ID["incidents_open"],
                title: "Open",
                order: 10,
                condition: "active=true^EQ",
                table: "incident",
                columns: "number,short_description,priority,state",
                applicabilities: [
                    {
                        $id: Now.ID["incidents_open_applicability"],
                        applicability: applicability
                    }
                ]
            },
            {
                $id: Now.ID["incidents_all"],
                title: "All",
                order: 20,
                condition: "",
                table: "incident",
                columns: "number,short_description,priority,state",
                applicabilities: [
                    {
                        $id: Now.ID["incidents_all_applicability"],
                        applicability: applicability
                    }
                ]
            }
        ]
    }
]
```

---

## lists Array

Define list views of table data [sys_ux_list] with filtering and column configurations for a UX list menu configuration.

List views provide filtered and column-customized displays of table records. Each list can have specific conditions, visible columns, and role-based visibility controls.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `title` | String | Yes | A title for the list to display in the navigation menu. |
| `table` | String | Yes | The name of a table to use for the list. |
| `columns` | String | No | A comma-separated list of column names to display in the list. Example: `'asset_tag,display_name,model_category,assigned_to'` |
| `condition` | String | No | An encoded query string shown in the condition builder as the initial filter. Users can modify this filter. Example: `'install_status=1'` or `'active=true^EQ'` |
| `fixedQuery` | String | No | A permanent invisible filter applied in **addition** to `condition`. Users cannot see or remove it. Use this to enforce data scoping the user should never bypass (e.g. `'company=current_company^EQ'`). |
| `groupByColumn` | String | No | Column name to group list rows by field value with an expand/collapse UI. Example: `'priority'` |
| `enableInfiniteScroll` | Boolean | No | Replaces pagination with continuous scroll. Default: `false` |
| `highlightContentPattern` | String | No | A regex pattern matched against cell values. Matching cells are highlighted. Example: `'^1 - Critical$'` |
| `highlightContentColor` | String | No | Colour for highlighted cells when `highlightContentPattern` matches. Example: `'#ff0000'` |
| `hideColumnGrouping` | Boolean | No | Removes the column grouping UI (column header group rows). Default: `false` |
| `wordWrap` | Boolean | No | Controls cell text wrapping. Default: `false` |
| `view` | String | No | The name of a specific UI view to apply to this list. |
| `order` | Number | No | A number indicating the position of the list within its category. Lists with lower numbers appear first. |
| `active` | Boolean | No | Flag that indicates whether the list is visible to users. Default: `true` |
| `applicabilities` | Array | No | A list of variable identifiers of Applicability objects that control which roles can view the list. See [Applicability object](#applicability-object). |
| `roles` | String | No | Comma-separated list of role names that can access this list (alternative to applicabilities). |
| `hide*` | Boolean | No | Many `hide*` flags are available to control UI element visibility (e.g., `hideHeader`, `hideInlineEditing`, `hidePagination`, `hideColumnSorting`, `hideLinks`, `hideRefreshButton`). |

> **`condition` vs `fixedQuery`:** `condition` is the initial encoded query shown in the condition builder — users can modify it. `fixedQuery` is an additional invisible permanent filter users cannot see or remove. Use both together when you need a default user-editable filter plus a permanent scoping constraint.

### Basic Example

```ts
lists: [
    {
        $id: Now.ID["assets_active"],
        title: "Active",
        order: 10,
        condition: "install_status=1",
        table: "alm_asset",
        columns: "asset_tag,display_name,model_category,assigned_to",
        active: true,
        applicabilities: [
            {
                $id: Now.ID["assets_active_applicability"],
                applicability: assetApplicability
            }
        ]
    },
    {
        $id: Now.ID["assets_all"],
        title: "All",
        order: 20,
        condition: "",
        table: "alm_asset",
        columns: "asset_tag,display_name,model_category,assigned_to",
        active: true,
        applicabilities: [
            {
                $id: Now.ID["assets_all_applicability"],
                applicability: assetApplicability
            }
        ]
    }
]
```

### Advanced Feature Flags Example

All confirmed working feature flags used together:

```ts
lists: [
    {
        $id: Now.ID["incidents_open_rich"],
        title: "Open — by Priority",
        order: 10,
        table: "incident",
        columns: "number,short_description,priority,state,assigned_to",
        condition: "active=true",                    // user-editable initial filter
        fixedQuery: "category=software",             // invisible permanent filter; user cannot remove
        groupByColumn: "priority",                   // groups rows with expand/collapse UI
        enableInfiniteScroll: true,                  // replaces pagination with continuous scroll
        highlightContentPattern: "^1 - Critical$",   // highlights matching cell values
        highlightContentColor: "#ff4444",            // colour for highlighted cells
        hideColumnGrouping: true,                    // hides column header group rows
        wordWrap: false,                             // disable cell text wrapping
        active: true,
        applicabilities: [
            {
                $id: Now.ID["incidents_open_rich_applicability"],
                applicability: itilApplicability
            }
        ]
    }
]
```

---

## Applicability Object

Define the audience [sys_ux_applicability] that can view a list in the UX list menu configuration.

Applicability objects control role-based visibility and access to lists. Multiple applicabilities can be assigned to a single list to support complex permission hierarchies.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `name` | String | Yes | A name for the applicability rule. |
| `description` | String | No | A description of the audience. |
| `active` | Boolean | No | Flag that indicates whether the applicability rule is applied. Default: `true` |
| `roles` | Array | No | A list of variable identifiers of Role objects or sys_ids of roles that a user must have to view the list. For more information, see [Role API](./ROLE-API.md). |
| `roleNames` | String | No | A comma-separated list of role names that a user must have to view the list. This property is an alternative to the `roles` property. Example: `'manager,admin'` |

### Example

```ts
import { Applicability } from '@servicenow/sdk/core';

const managerApplicability = Applicability({
    $id: Now.ID['manager_applicability'],
    name: 'Managers Only',
    description: 'Visible to users with manager role',
    active: true,
    roles: [managerRole]
});
```

### Alternative: Using Role Names String

When you don't need typed Role objects, pass a comma-separated string to `roleNames`:

```ts
const itilApplicability = Applicability({
    $id: Now.ID['itil_applicability'],
    name: 'ITIL Users',
    description: 'Visible to ITIL and admin roles',
    roleNames: 'itil,admin',
});
```

### Alternative: Using String Role Array

You can also pass plain role name strings to the `roles` array without constructing Role objects:

```ts
const adminApplicability = Applicability({
    $id: Now.ID['admin_applicability'],
    name: 'Admin Only Access',
    description: 'Restricts visibility to admin users',
    active: true,
    roles: ['admin'],
});
```

---

## Dashboard Object

Create a Dashboard (`par_dashboard`) as the landing page for a workspace. Dashboards are organized into tabs containing widgets positioned on a 48-point grid. A dashboard is **mandatory** for the workspace to function correctly.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. Format: `Now.ID['String' or Number]` |
| `name` | String | Yes | Display name of the dashboard. |
| `tabs` | Array | Yes | Array of tabs. See [DashboardTab](#dashboardtab). |
| `visibilities` | Array | Yes | Links the dashboard to workspaces. See [DashboardVisibility](#dashboardvisibility). |
| `permissions` | Array | Yes | Access control entries (can be an empty array). See [DashboardPermission](#dashboardpermission). |
| `active` | Boolean | No | Whether the dashboard is active. Default: `true` |
| `topLayout` | Object | No | Array of top-level widgets displayed outside of tabs. Contains a `widgets` array of DashboardWidget objects. |
| `$meta` | Object | No | Metadata for installation behavior. `installMethod: 'demo'` or `'first install'`. |

### DashboardTab

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique identifier for the tab. |
| `name` | String | Yes | Display name of the tab. |
| `widgets` | Array | Yes | Array of DashboardWidget objects. |
| `active` | Boolean | No | Whether the tab is visible. Default: `true` |

### DashboardWidget

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique identifier for the widget. |
| `component` | String | Yes | Visualization type in kebab-case (`'single-score'`, `'vertical-bar'`, `'line'`, `'donut'`, `'pie'`, `'area'`, `'horizontal-bar'`, `'dial'`, `'heading'`, `'rich-text'`, `'image'`) or a component sys_id. |
| `componentProps` | Object | Yes | Component configuration (varies by component type). |
| `height` | Number | Yes | Height in grid units. |
| `width` | Number | Yes | Width in grid units. |
| `position` | Object | Yes | Grid position: `{ x: number, y: number }` (0-based). |

### Grid Layout System

Dashboards use a **48-point grid**. Common layouts:

- **Full width**: `{ width: 48, position: { x: 0, y: 0 } }`
- **Three columns**: widths 14, 17, 17 at x positions 0, 14, 31

### Widget Component Types

**Visualizations:**

| Component | Description | Data Type |
|-----------|-------------|----------|
| `single-score` | Single metric display | Simple |
| `vertical-bar` | Vertical bar chart | Group |
| `horizontal-bar` | Horizontal bar chart | Group |
| `line` | Line chart | Trend |
| `donut` | Donut chart | Group |
| `pie` | Pie chart | Group |
| `area` | Area chart | Trend |
| `dial` | Dial gauge | Simple |

**Supporting widgets:** `heading`, `rich-text`, `image`.

### Data Type Requirements

- **Simple** (`single-score`, `dial`): requires `dataSources` and `metrics` only.
- **Group** (`vertical-bar`, `horizontal-bar`, `donut`, `pie`): requires `dataSources`, `metrics`, and `groupBy`.
- **Trend** (`line`, `area`): requires `dataSources`, `metrics`, and `trendBy`.

### DashboardVisibility

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique identifier. |
| `experience` | String or Workspace | Yes | Reference to a workspace — a sys_id string or a `Workspace` variable reference to `sys_ux_page_registry`. |

### DashboardPermission

Each permission uses a discriminated union — exactly one of `user`, `group`, or `role` must be set:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique identifier. |
| `user` | String or Record | No | Grant permission to a specific user (mutually exclusive with group/role). |
| `group` | String or Record | No | Grant permission to a user group (mutually exclusive with user/role). |
| `role` | String or Record | No | Grant permission to a role (mutually exclusive with user/group). |
| `canRead` | Boolean | No | Whether the subject can view the dashboard. Default: `true` |
| `canWrite` | Boolean | No | Whether the subject can edit the dashboard. Default: `false` |
| `canShare` | Boolean | No | Whether the subject can share the dashboard. Default: `false` |
| `owner` | Boolean | No | Whether the subject is an owner. Default: `false` |

### Dashboard Example

```ts
import { Dashboard } from '@servicenow/sdk/core';

Dashboard({
  $id: Now.ID['incident_dashboard'],
  name: 'Incident Dashboard',
  tabs: [{
    $id: Now.ID['overview_tab'],
    name: 'Overview',
    widgets: [
      {
        $id: Now.ID['open_incidents_widget'],
        component: 'single-score',
        componentProps: {
          dataSources: [{
            label: 'Incident', sourceType: 'table',
            tableOrViewName: 'incident', filterQuery: '',
            id: 'data_source_1',
          }],
          headerTitle: 'Open Incidents',
          metrics: [{
            dataSource: 'data_source_1', id: 'metric_1',
            aggregateFunction: 'COUNT', axisId: 'primary',
          }],
        },
        height: 14, width: 14, position: { x: 0, y: 0 },
      },
      {
        $id: Now.ID['incidents_by_priority_widget'],
        component: 'vertical-bar',
        componentProps: {
          dataSources: [{
            label: 'Incident', sourceType: 'table',
            tableOrViewName: 'incident', filterQuery: '',
            id: 'data_source_1',
          }],
          headerTitle: 'Incidents by Priority',
          metrics: [{
            dataSource: 'data_source_1', id: 'metric_1',
            aggregateFunction: 'COUNT', axisId: 'primary',
          }],
          groupBy: [{
            groupBy: [{ dataSource: 'data_source_1', groupByField: 'priority' }],
            maxNumberOfGroups: 10, showOthers: false,
          }],
          sortBy: 'value',
        },
        height: 14, width: 17, position: { x: 14, y: 0 },
      },
    ],
  }],
  visibilities: [{
    $id: Now.ID['dashboard_visibility'],
    experience: assetWorkspace,  // Workspace variable reference
  }],
  permissions: [],
});
```

### Dashboard with Permissions

```ts
import { Dashboard } from '@servicenow/sdk/core';

Dashboard({
  $id: Now.ID['secure-dashboard'],
  name: 'Secure Dashboard',
  tabs: [],
  visibilities: [],
  permissions: [
    {
      $id: Now.ID['user-permission'],
      canRead: true, canShare: true, canWrite: true, owner: true,
      user: Now.ref('sys_user', { sys_id: '6816f79cc0a8016401c5a33be04be441' }),
    },
    {
      $id: Now.ID['group-permission'],
      group: Now.ref('sys_user_group', { sys_id: 'abc123def456group' }),
      canRead: true, canWrite: false, canShare: false, owner: false,
    },
    {
      $id: Now.ID['role-permission'],
      role: Now.ref('sys_user_role', { sys_id: 'xyz789abc012role' }),
      canRead: true, canWrite: true, canShare: false, owner: false,
    },
  ],
});
```

---

## Complete Example: ITSM Workspace

```ts
import {
    Workspace,
    UxListMenuConfig,
    Applicability,
    Role
} from '@servicenow/sdk/core';

// Define roles
const managerRole = Role({
    $id: Now.ID['manager_user_role'],
    name: 'x_snc_manager.user',
    containsRoles: ['canvas_user']
});

const supportRole = Role({
    $id: Now.ID['support_user_role'],
    name: 'x_snc_support.user',
    containsRoles: ['canvas_user']
});

// Define applicabilities for role-based visibility
const managerApplicability = Applicability({
    $id: Now.ID['manager_applicability'],
    name: 'Managers Only',
    roles: [managerRole]
});

const supportApplicability = Applicability({
    $id: Now.ID['support_applicability'],
    name: 'Support Team',
    roles: [supportRole]
});

// Define list configuration with categories and lists
const itsmListConfig = UxListMenuConfig({
    $id: Now.ID['itsm_list_config'],
    name: 'ITSM Navigation',
    description: 'Navigation structure for ITSM Workspace',
    categories: [
        {
            $id: Now.ID['incidents_category'],
            title: 'Incidents',
            order: 10,
            description: 'Incident management',
            lists: [
                {
                    $id: Now.ID['incidents_open'],
                    title: 'Open',
                    order: 10,
                    condition: 'active=true^EQ',
                    table: 'incident',
                    columns: 'number,short_description,priority,state,assigned_to',
                    applicabilities: [
                        {
                            $id: Now.ID['incidents_open_support'],
                            applicability: supportApplicability
                        },
                        {
                            $id: Now.ID['incidents_open_manager'],
                            applicability: managerApplicability
                        }
                    ]
                },
                {
                    $id: Now.ID['incidents_critical'],
                    title: 'Critical',
                    order: 5,
                    condition: 'priority=1^EQ^active=true^EQ',
                    table: 'incident',
                    columns: 'number,short_description,priority,state,assigned_to,urgency',
                    applicabilities: [
                        {
                            $id: Now.ID['incidents_critical_manager'],
                            applicability: managerApplicability
                        }
                    ]
                }
            ]
        },
        {
            $id: Now.ID['problems_category'],
            title: 'Problems',
            order: 20,
            description: 'Problem management',
            lists: [
                {
                    $id: Now.ID['problems_open'],
                    title: 'Open',
                    order: 10,
                    condition: 'state!=6^EQ',
                    table: 'problem',
                    columns: 'number,short_description,priority,state,assigned_to',
                    applicabilities: [
                        {
                            $id: Now.ID['problems_open_applicability'],
                            applicability: managerApplicability
                        }
                    ]
                }
            ]
        }
    ]
});

// Define the workspace
const itsmWorkspace = Workspace({
    $id: Now.ID['itsm_workspace'],
    title: 'IT Service Management',
    path: 'itsm',
    landingPath: 'home',
    tables: ['incident', 'problem', 'change_request', 'user', 'sys_user_group'],
    listConfig: itsmListConfig,
    active: true
});
```

---

## Best Practices

### Navigation Design
- Use logical category groupings (e.g., Active items, By Priority, By Assignee)
- Order categories and lists with lower `order` numbers appearing first
- Include both filtered views (e.g., "Critical Only") and comprehensive views (e.g., "All")

### Role-Based Access
- Use `Applicability` objects to control which users see which lists
- Leverage the `roleNames` property for simpler role-based configurations
- Combine multiple applicabilities on a single list for complex permission models

### Column Selection
- Select columns that provide essential context without overwhelming the user
- Include fields like status, assignment, and due dates for operational views
- Limit to 5-7 key columns for optimal readability

### Filtering
- Use encoded query strings for consistent filtering across environments
- Use `condition` for the user-visible initial filter (users can modify it in the condition builder)
- Use `fixedQuery` for permanent invisible scoping constraints the user should never bypass
- Both `condition` and `fixedQuery` are applied — they are additive, not alternatives
- Test queries before deployment to ensure they return expected results

### List UX Enhancement Flags
- `groupByColumn` — groups list rows by a field value with expand/collapse UI; great for priority or state grouping
- `enableInfiniteScroll` — replaces pagination with continuous scroll; best for long lists users browse sequentially
- `highlightContentPattern` + `highlightContentColor` — highlight cells matching a regex; use to draw attention to critical values (e.g. `'^1 - Critical$'`)
- `hideColumnGrouping` — hides column header group rows for a cleaner look
- `wordWrap` — controls cell text wrapping; disable for dense operational views

### URL Paths
- Use kebab-case for workspace and landing page paths
- Ensure paths are descriptive and align with user mental models
- Platform workspaces (ITSM, Asset, etc.) use: `/now/<path>/<landingPath>`
- **Custom scoped app workspaces use a different URL pattern: `/x/{numericScopeId}/{path}/{landingPath}`**

> **Scoped App URL Pattern:** The numeric scope ID used in workspace URLs (e.g. `1118332`) can be extracted from the `scope` field in `now.config.json`. A scope like `"x_1118332_userpuls"` follows the pattern `{prefix}_{numericId}_{appName}`. The NowDev AI Toolbox automatically parses this and writes it to `.vscode/nowdev-ai-config.json` under `fluentApp.numericScopeId` and `fluentApp.scopePrefix`. Use these values to construct the correct workspace URL: `{instanceUrl}/x/{numericScopeId}/{path}/{landingPath}`.
>
> **Note:** The `scopeId` GUID in `now.config.json` (e.g. `"d3bdfeeacc..."`) is a different identifier — it is **not** used in URLs.

---

## Related APIs

- [Role API](./ROLE-API.md) — Define and manage roles for workspace access control
- [Dashboard API](./DASHBOARD-API.md) — Create dashboards that can reference workspaces in visibility rules
- [ACL API](./ACL-API.md) — Secure workspace routes with access control lists
- [UI Page API](./UI-PAGE-API.md) — Create custom pages within workspaces
