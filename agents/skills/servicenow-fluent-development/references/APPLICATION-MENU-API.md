# Application Menu API

The Application Menu API defines menus in the application navigator using the ServiceNow Fluent SDK. Application menus (`sys_app_application`) are the top-level entries that organize navigation for your application.

For general information about application menus, see [Create an application menu](https://docs.servicenow.com/en/bundle/washingtondc-platform-application-development/page/develop/reference/r_ApplicationMenuAPI.html).

**Import from** `@servicenow/sdk/core`:

```ts
import { ApplicationMenu, Record } from '@servicenow/sdk/core'
```

---

## Core Concepts

An **ApplicationMenu** creates a top-level entry in the ServiceNow application navigator sidebar. Each menu:
- Must have a unique `$id` that is referenced by `sys_app_module` records (navigation modules)
- Can control visibility based on roles
- Can be associated with a menu category that defines styling and navigation behavior
- Can include a hint (tooltip) and description for users

Application menus work alongside **navigation modules** (`sys_app_module` records) that define the individual links within the menu.

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID for the metadata object (e.g., `Now.ID['app_menu']`). Hashed into a unique sys_id at build time. Format: `Now.ID['String' or Number]` |
| `title` | String | The label for the menu displayed in the application navigator. |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `active` | Boolean | `true` | Flag that indicates whether the menu appears in the application navigator. Valid values: `true` (visible), `false` (hidden) |
| `roles` | Array | — | A list of variable identifiers of Role objects or names of roles that can access the menu. Format: array of Role constants or role name strings. If not specified, all users can see the menu. |
| `category` | Reference | — | The variable identifier of a menu category (`sys_app_category`) that defines the navigation menu style and behavior. Reference using a Record constant or `Now.ref()`. For general information, see Customize menu categories. |
| `hint` | String | — | A short description of the menu that displays as a tooltip when hovering over it in the navigator. |
| `description` | String | — | Additional detailed information about what the application does. Can be longer than `hint`. |
| `name` | String | — | An internal name to differentiate between applications with the same title. Used in system processing; not visible to end users. |
| `order` | Number | `100` | The relative position of the application menu in the application navigator. Lower numbers appear first. Default: 100. |
| `$meta` | Object | — | Metadata for the application metadata. Controls installation behavior. |

#### $meta Property

The `$meta` property controls when and how the application metadata is installed:

```ts
$meta: {
  installMethod: 'String'
}
```

**Valid values for `installMethod`:**
- `'demo'` — Outputs the application metadata to the `metadata/unload.demo` directory. Installed only when the "Load demo data" option is selected.
- `'first install'` — Outputs the application metadata to the `metadata/unload` directory. Installed only the first time the application is installed on an instance.

---

## Menu Categories

A **menu category** defines the styling and behavior of how a menu appears in the navigator. You reference a menu category using the Record API targeting the `sys_app_category` table.

Categories allow you to:
- Group related menus visually
- Apply custom CSS styling (border color, background color, etc.)
- Control the menu's appearance in the navigator

**Define a category using Record():**

```ts
import { Record } from '@servicenow/sdk/core'

export const appCategory = Record({
  table: 'sys_app_category',
  $id: Now.ID[9],
  data: {
    name: 'example',
    style: 'border-color: #a7cded; background-color: #e3f3ff;',
  },
})
```

Then reference the category constant in your ApplicationMenu:

```ts
ApplicationMenu({
  $id: Now.ID['my_app_menu'],
  title: 'My App Menu',
  category: appCategory,
})
```

---

## Examples

### Basic Application Menu

```ts
import '@servicenow/sdk/global'
import { ApplicationMenu } from '@servicenow/sdk/core'

export const menu = ApplicationMenu({
  $id: Now.ID['my_app_menu'],
  title: 'My Application',
  hint: 'Manage My Application records',
  active: true,
})
```

### Menu with Description and Tooltip

```ts
export const menu = ApplicationMenu({
  $id: Now.ID['crm_app_menu'],
  title: 'CRM Application',
  hint: 'Customer relationship management system',
  description: 'Comprehensive CRM solution for managing customer interactions, sales pipelines, and customer data.',
  active: true,
})
```

### Menu with Role-Based Access

```ts
import { Role } from '@servicenow/sdk/core'

export const crmAdminRole = Role({
  $id: Now.ID['crm_admin'],
  name: 'x_myapp.crm_admin'
})

export const crmUserRole = Role({
  $id: Now.ID['crm_user'],
  name: 'x_myapp.crm_user'
})

export const menu = ApplicationMenu({
  $id: Now.ID['crm_app_menu'],
  title: 'CRM Application',
  hint: 'Customer relationship management',
  roles: [crmAdminRole, crmUserRole],  // Only users with these roles see this menu
  active: true,
})
```

### Menu with Category Styling

```ts
import { Record } from '@servicenow/sdk/core'

export const crmCategory = Record({
  table: 'sys_app_category',
  $id: Now.ID['crm_category'],
  data: {
    name: 'crm_category',
    style: 'border-color: #2e7d32; background-color: #c8e6c9;',
  },
})

export const menu = ApplicationMenu({
  $id: Now.ID['crm_app_menu'],
  title: 'CRM Application',
  hint: 'Customer relationship management',
  category: crmCategory,
  active: true,
})
```

### Menu with All Properties

```ts
import '@servicenow/sdk/global'
import { ApplicationMenu, Record, Role } from '@servicenow/sdk/core'

export const menuCategory = Record({
  table: 'sys_app_category',
  $id: Now.ID['app_category'],
  data: {
    name: 'operations',
    style: 'border-color: #1565c0; background-color: #bbdefb;',
  },
})

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_myapp.manager'
})

export const menu = ApplicationMenu({
  $id: Now.ID['operations_menu'],
  title: 'Operations',
  hint: 'Operational dashboards and tools',
  description: 'Central hub for operations management, including incident tracking, change management, and performance metrics.',
  name: 'operations_app',
  order: 50,
  active: true,
  roles: [managerRole],
  category: menuCategory,
})
```

### Menu with Demo Data Only

```ts
export const demoMenu = ApplicationMenu({
  $id: Now.ID['demo_app_menu'],
  title: 'Demo Application',
  hint: 'Demo environment application',
  active: true,
  $meta: {
    installMethod: 'demo'  // Only installed when loading demo data
  },
})
```

### Menu with First Install Only

```ts
export const setupMenu = ApplicationMenu({
  $id: Now.ID['setup_app_menu'],
  title: 'Setup Assistant',
  hint: 'First-time setup wizard',
  active: true,
  $meta: {
    installMethod: 'first install'  // Only installed on first instance install
  },
})
```

---

## Relationship with Navigation Modules

After defining an ApplicationMenu, you create `sys_app_module` records (navigation modules) that define the individual links within the menu. Each module references the menu's `$id`:

```ts
import { ApplicationMenu, Record } from '@servicenow/sdk/core'

export const menu = ApplicationMenu({
  $id: Now.ID['my_app_menu'],
  title: 'My Application',
})

// Navigation module that belongs to this menu
Record({
  $id: Now.ID['module.list'],
  table: 'sys_app_module',
  data: {
    title: 'All Records',
    application: menu.$id,  // Reference the menu's $id
    active: true,
    link_type: 'LIST',
    name: 'my_table',
    order: 100,
  },
})
```

---

## Complete Application Menu Example

```ts
// src/fluent/navigation.now.ts
import '@servicenow/sdk/global'
import { ApplicationMenu, Record, Role } from '@servicenow/sdk/core'

// Define application role
export const appAdminRole = Role({
  $id: Now.ID['app_admin_role'],
  name: 'x_myapp.admin'
})

// Define menu category with custom styling
export const appCategory = Record({
  table: 'sys_app_category',
  $id: Now.ID['app_category'],
  data: {
    name: 'myapp_category',
    style: 'border-color: #ff6f00; background-color: #ffe0b2;',
  },
})

// Create the main application menu
export const menu = ApplicationMenu({
  $id: Now.ID['my_app_menu'],
  title: 'My Application',
  hint: 'Main application for company operations',
  description: 'Comprehensive application for managing operations, including workflows, dashboards, and data management.',
  name: 'my_application',
  order: 100,
  active: true,
  roles: [appAdminRole],
  category: appCategory,
})

// Define navigation modules for the menu
export const listModule = Record({
  $id: Now.ID['module.list'],
  table: 'sys_app_module',
  data: {
    title: 'View Records',
    application: menu.$id,
    active: true,
    link_type: 'LIST',
    name: 'x_myapp_table',
    order: 100,
    hint: 'View all application records',
  },
})

export const newModule = Record({
  $id: Now.ID['module.new'],
  table: 'sys_app_module',
  data: {
    title: 'Create Record',
    application: menu.$id,
    active: true,
    link_type: 'NEW',
    name: 'x_myapp_table',
    order: 200,
    hint: 'Create a new record',
  },
})

export const dashboardModule = Record({
  $id: Now.ID['module.dashboard'],
  table: 'sys_app_module',
  data: {
    title: 'Dashboard',
    application: menu.$id,
    active: true,
    link_type: 'DIRECT',
    query: 'x_myapp_dashboard.do',
    order: 300,
    hint: 'View the application dashboard',
  },
})
```

Export from your main fluent file:

```ts
// src/fluent/index.now.ts
export { menu, listModule, newModule, dashboardModule } from './navigation.now.js'
```

---

## Best Practices

1. **Export menu constants:** Always export your `ApplicationMenu` definition so it can be referenced by navigation modules.
2. **Use descriptive IDs:** Make `$id` values meaningful (e.g., `app_menu`, not `menu_1`).
3. **Organize by functionality:** If you have multiple related applications, use naming conventions to distinguish them.
4. **Set appropriate roles:** Use `roles` to control who sees the menu in their navigator.
5. **Provide helpful hints:** Use `hint` for short, actionable tooltips.
6. **Use categories for styling:** Apply menu categories to group visually related menus.
7. **Document intent:** Use `description` to explain the application's purpose for administrators.
8. **Order strategically:** Use the `order` property to position menus logically in the navigator.
9. **Consider demo data:** Use `$meta: { installMethod: 'demo' }` for demo-only menus.
10. **Default visibility:** Ensure at least one menu has `active: true` to give users entry points to your application.

---

## Common Patterns

### Multi-Environment Menus

```ts
export const productionMenu = ApplicationMenu({
  $id: Now.ID['prod_menu'],
  title: 'Production Application',
  active: true,
})

export const stagingMenu = ApplicationMenu({
  $id: Now.ID['staging_menu'],
  title: 'Staging Application (Dev Only)',
  roles: [devRole],  // Only developers see this
  active: true,
})
```

### Role-Scoped Menu Access

```ts
const adminRole = Role({ $id: Now.ID['admin'], name: 'x_app.admin' })
const userRole = Role({ $id: Now.ID['user'], name: 'x_app.user' })

export const adminMenu = ApplicationMenu({
  $id: Now.ID['admin_menu'],
  title: 'Administration',
  roles: [adminRole],
  order: 10,
})

export const userMenu = ApplicationMenu({
  $id: Now.ID['user_menu'],
  title: 'My Application',
  roles: [adminRole, userRole],  // Both admins and users can see this
  order: 20,
})
```

### Conditional Menu Installation

```ts
// Production-only menu
export const productionMenu = ApplicationMenu({
  $id: Now.ID['prod_menu'],
  title: 'Production',
  active: true,
})

// Demo/evaluation menu
export const demoMenu = ApplicationMenu({
  $id: Now.ID['demo_menu'],
  title: 'Demo Environment',
  active: true,
  $meta: { installMethod: 'demo' },
})

// Initial setup wizard
export const setupMenu = ApplicationMenu({
  $id: Now.ID['setup_menu'],
  title: 'First-Time Setup',
  active: true,
  $meta: { installMethod: 'first install' },
})
```

---

## See Also

- [ApplicationMenu in API-REFERENCE.md](./API-REFERENCE.md#applicationmenu-and-navigation-modules)
- [Navigation Modules (sys_app_module)](./API-REFERENCE.md#sys_app_module--navigation-modules)
- [Role API — ServiceNow Fluent](./API-REFERENCE.md#role)
- [Record API — ServiceNow Fluent](./API-REFERENCE.md#record)
- [Create an application menu — ServiceNow Docs](https://docs.servicenow.com/en/bundle/washingtondc-platform-application-development/page/develop/application-development-guide/task/create-application-menu.html)
