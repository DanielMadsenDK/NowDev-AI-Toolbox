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

## Workspace Object

Create a workspace for managing business entities in a single focused working area that enables users to complete an entire job.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` |
| `title` | String | Yes | A name for the workspace that appears in navigation and headers. |
| `path` | String | Yes | The URL path segment of the workspace. Workspace URLs follow the pattern `/now/<path>/<landingPath>` and use kebab case. |
| `tables` | Array | Yes | A list of table names to manage in the workspace. Example: `['incident', 'problem', 'change_request']` |
| `listConfig` | Reference | Yes | The variable identifier of a UxListMenuConfig object that defines the navigation structure of the workspace. |
| `landingPath` | String | No | The URL path segment of the landing page. Workspace URLs follow the pattern `/now/<path>/<landingPath>` and use kebab case. Default: `'home'` |
| `active` | Boolean | No | Flag that indicates whether the workspace is accessible to users. Default: `true` |

### Example

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
| `condition` | String | No | An encoded query string to filter the records displayed in the list. Example: `'install_status=1'` or `'active=true^EQ'` |
| `order` | Number | No | A number indicating the position of the list within its category. Lists with lower numbers appear first. |
| `active` | Boolean | No | Flag that indicates whether the list is visible to users. Default: `true` |
| `applicabilities` | Array | No | A list of variable identifiers of Applicability objects that control which roles can view the list. See [Applicability object](#applicability-object). |

### Example

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

### Alternative: Using Role Names

```ts
const managerApplicability = Applicability({
    $id: Now.ID['manager_applicability'],
    name: 'Managers Only',
    roleNames: 'x_snc_manager.user,canvas_user'
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
- Test queries before deployment to ensure they return expected results
- Document complex query logic in list titles or descriptions

### URL Paths
- Use kebab-case for workspace and landing page paths
- Ensure paths are descriptive and align with user mental models
- Follow the pattern `/now/<path>/<landingPath>` for consistent URLs

---

## Related APIs

- [Role API](./ROLE-API.md) — Define and manage roles for workspace access control
- [Dashboard API](./DASHBOARD-API.md) — Create dashboards that can reference workspaces in visibility rules
- [ACL API](./ACL-API.md) — Secure workspace routes with access control lists
- [UI Page API](./UI-PAGE-API.md) — Create custom pages within workspaces
