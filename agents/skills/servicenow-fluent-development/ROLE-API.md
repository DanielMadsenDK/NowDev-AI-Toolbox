# Role API

The Role API defines roles (`sys_user_role`) that grant specific permissions to users of an application using the ServiceNow Fluent SDK.

For general information about user roles, see [Managing roles](https://docs.servicenow.com/en-US/bundle/washoe-platform-administration/task/t_ManageRoles.html) in the ServiceNow documentation.

**Import from** `@servicenow/sdk/core`:

```ts
import { Role } from '@servicenow/sdk/core'
```

---

## Core Concepts

Roles are fundamental to ServiceNow access control. A role grants specific permissions to users of an application. Roles can:

- **Contain other roles** — Create role hierarchies where one role includes the permissions of other roles
- **Be assigned by other roles** — Control who can delegate role assignments to users
- **Support delegation** — Allow users with a role to grant that role to other users (optional)
- **Require elevation** — Enforce users to manually accept responsibility before accessing protected features
- **Be scoped to applications** — Follow naming convention: `<scope>.<name>` (e.g., `x_snc_example.manager`)

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID for the metadata object (e.g., `Now.ID['manager_role']`). Hashed into a unique sys_id at build time. |
| `name` | String | A name for the role beginning with the application scope in the format `<scope>.<name>`. Example: `x_snc_example.manager` |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `assignableBy` | String | — | Other roles that can assign this role to users. A role name string. |
| `canDelegate` | Boolean | `true` | Flag indicating if the role can be delegated to other users. When `true`, users with this role can grant it to other users. See [Delegating roles](https://docs.servicenow.com/en-US/bundle/washoe-platform-administration/concept/c_DelegatingRoles.html) for more information. |
| `description` | String | — | A description of what the role can access and its purpose. |
| `elevatedPrivilege` | Boolean | `false` | Flag indicating whether manually accepting responsibility of using the role is required before users can access its features. When `true`, users must explicitly accept the role before it takes effect. See [Elevated privilege roles](https://docs.servicenow.com/en-US/bundle/washoe-platform-administration/concept/c_ElevatedPrivilegeRoles.html) for more information. |
| `grantable` | Boolean | `true` | Flag indicating whether the role can be granted independently. When `true`, the role can be assigned to users directly. When `false`, the role can only be used as a contained role within another role. |
| `containsRoles` | Array | — | Array of other Role constants (or role name strings) that this role contains. Users with this role automatically have all permissions of the contained roles. |
| `scopedAdmin` | Boolean | `false` | Flag indicating whether the role is an Application Administrator role. When `true`, the role grants application-level administrative permissions. See [Application administration](https://docs.servicenow.com/en-US/bundle/washoe-platform-administration/concept/c_ApplicationAdministration.html) for more information. |
| `$meta` | Object | — | Metadata for installation control. Use `installMethod` property to control when the role is installed. |
| `$meta.installMethod` | String | — | Controls installation timing. Valid values: `'demo'` (install with demo data), `'first install'` (install only on first application installation). |

---

## Examples

### Basic Role

```ts
import { Role } from '@servicenow/sdk/core'

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_snc_example.manager',
  description: 'Managers can view and update team records'
})
```

### Role with Contained Roles (Role Hierarchy)

```ts
import { Role } from '@servicenow/sdk/core'

export const employeeRole = Role({
  $id: Now.ID['employee_role'],
  name: 'x_snc_example.employee',
  description: 'Base employee role with basic permissions'
})

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_snc_example.manager',
  description: 'Managers have all employee permissions plus team management',
  containsRoles: [employeeRole]  // Manager inherits all employee permissions
})

export const adminRole = Role({
  $id: Now.ID['admin_role'],
  name: 'x_snc_example.admin',
  description: 'Admins have full application control',
  containsRoles: [managerRole, employeeRole]  // Can include multiple roles
})
```

### Role with Assignment Control

```ts
export const contractorRole = Role({
  $id: Now.ID['contractor_role'],
  name: 'x_snc_example.contractor',
  description: 'Contractors have limited access',
  assignableBy: 'admin',  // Only users with admin role can assign contractor role
  canDelegate: false  // Contractors cannot delegate their role to others
})

export const restrictedRole = Role({
  $id: Now.ID['restricted_role'],
  name: 'x_snc_example.restricted',
  description: 'Restricted access role',
  assignableBy: [adminRole, 'x_snc_example.manager'],  // Admin or manager can assign
  canDelegate: true  // Users with this role can delegate it
})
```

### Elevated Privilege Role

```ts
export const securityAuditRole = Role({
  $id: Now.ID['security_audit_role'],
  name: 'x_snc_example.security_auditor',
  description: 'Access to sensitive security audit records',
  elevatedPrivilege: true,  // Users must explicitly accept this role
  containsRoles: [employeeRole],
  canDelegate: false
})
```

### Application Administrator Role

```ts
export const appAdminRole = Role({
  $id: Now.ID['app_admin_role'],
  name: 'x_snc_example.app_admin',
  description: 'Application administrator with full control',
  scopedAdmin: true,  // Marks this as an application admin role
  assignableBy: 'admin',
  canDelegate: true
})
```

### Non-Grantable Role (Container Only)

```ts
export const powerUserPermissions = Role({
  $id: Now.ID['power_user_perms'],
  name: 'x_snc_example.power_user_permissions',
  description: 'Internal role containing power user permissions',
  grantable: false  // This role can only be contained in other roles, not granted directly
})

export const reportingRole = Role({
  $id: Now.ID['reporting_role'],
  name: 'x_snc_example.reporting',
  description: 'Users can run reports',
  containsRoles: [powerUserPermissions],  // Includes the non-grantable role
  grantable: true
})
```

### Role with Installation Metadata

```ts
export const demoUserRole = Role({
  $id: Now.ID['demo_user_role'],
  name: 'x_snc_example.demo_user',
  description: 'Role for demo data only',
  $meta: {
    installMethod: 'demo'  // Only installed when loading demo data
  }
})

export const initialSetupRole = Role({
  $id: Now.ID['initial_setup_role'],
  name: 'x_snc_example.initial_setup',
  description: 'Role for initial application setup',
  $meta: {
    installMethod: 'first install'  // Only installed on first application installation
  }
})
```

### Complex Role Hierarchy Example

```ts
import { Role } from '@servicenow/sdk/core'

// Base roles
export const viewerRole = Role({
  $id: Now.ID['viewer_role'],
  name: 'x_snc_example.viewer',
  description: 'Can view records'
})

export const editorRole = Role({
  $id: Now.ID['editor_role'],
  name: 'x_snc_example.editor',
  description: 'Can edit records',
  containsRoles: [viewerRole]  // Editors inherit viewer permissions
})

export const moderatorRole = Role({
  $id: Now.ID['moderator_role'],
  name: 'x_snc_example.moderator',
  description: 'Can moderate content',
  containsRoles: [editorRole]  // Moderators inherit editor permissions
})

export const applicationAdminRole = Role({
  $id: Now.ID['app_admin'],
  name: 'x_snc_example.application_admin',
  description: 'Full application administration',
  scopedAdmin: true,
  containsRoles: [moderatorRole],  // Admins inherit all lower-level permissions
  assignableBy: 'admin',
  canDelegate: false
})
```

---

## Best Practices

### 1. Follow Naming Conventions
- Use format `<scope>.<name>` where scope is your application ID (e.g., `x_snc_example.manager`)
- Use lowercase with underscores for multi-word names
- Be descriptive: `x_snc_example.incident_manager` is better than `x_snc_example.mgr`

### 2. Create Role Hierarchies
- Use `containsRoles` to build role hierarchies instead of duplicating permissions
- Define base roles (viewer, editor) and layer specialized roles on top
- Reduces maintenance burden when updating permissions

### 3. Control Delegation and Assignment
- Use `assignableBy` to restrict who can assign roles
- Use `canDelegate` to prevent unauthorized role delegation
- Consider security implications: contractor roles should typically have `canDelegate: false`

### 4. Use Elevated Privileges Sparingly
- Apply `elevatedPrivilege: true` only to sensitive roles requiring explicit user consent
- Document why elevation is necessary in the `description`
- Examples: security auditor, compliance officer, system administrator

### 5. Plan Application Admin Roles
- Define exactly one `scopedAdmin: true` role per application for main administrators
- Reserve admin roles for operational management, not routine access control
- Document the scope of admin capabilities in the role description

### 6. Version and Document Changes
- Update role descriptions when adding or removing contained roles
- Consider backward compatibility when changing role hierarchies
- Document why roles are added or removed in commit messages

### 7. Use Non-Grantable Roles for Reuse
- Create non-grantable roles (`grantable: false`) for common permission sets
- Reference them with `containsRoles` to maintain consistency
- Example: `incident_editor_permissions` as a non-grantable base

### 8. Install Control with Metadata
- Use `installMethod: 'demo'` for demo-only roles
- Use `installMethod: 'first install'` for roles only needed during initial setup
- Omit `$meta` for roles that should be installed every time

---

## Related Concepts

### Access Control Lists (ACLs)
Roles are typically referenced in ACLs to enforce permissions. See [ACL-API.md](ACL-API.md) for how to use roles in access control rules.

```ts
import { Acl, Role } from '@servicenow/sdk/core'

export const managerRole = Role({
  $id: Now.ID['manager_role'],
  name: 'x_snc_example.manager'
})

export const managerEditAcl = Acl({
  $id: Now.ID['manager_edit'],
  type: 'record',
  table: 'incident',
  operation: 'write',
  roles: [managerRole],  // Reference the role constant
  description: 'Allow managers to edit incidents'
})
```

### Cross-Scope Privileges
For scripts and code within roles that need to access objects in other application scopes, use Cross-Scope Privileges. See [CROSS-SCOPE-PRIVILEGE-API.md](CROSS-SCOPE-PRIVILEGE-API.md).

### User Assignment
Roles are assigned to users through ServiceNow's user interface or programmatically. Use `gs.hasRole('role_name')` in server scripts to check if a user has a specific role.

```ts
// In a Business Rule or Script Include
if (gs.hasRole('x_snc_example.manager')) {
  // Perform manager-specific logic
}
```

---

## Common Patterns

### Pattern 1: Read-Only vs Edit Access

```ts
export const viewOnlyRole = Role({
  $id: Now.ID['view_only'],
  name: 'x_snc_example.incident_viewer',
  grantable: false
})

export const editRole = Role({
  $id: Now.ID['edit_role'],
  name: 'x_snc_example.incident_editor',
  containsRoles: [viewOnlyRole],  // Editors can also view
  grantable: true
})
```

### Pattern 2: Team-Based Roles

```ts
export const teamMemberRole = Role({
  $id: Now.ID['team_member'],
  name: 'x_snc_example.team_member',
  description: 'Access to team records'
})

export const teamLeadRole = Role({
  $id: Now.ID['team_lead'],
  name: 'x_snc_example.team_lead',
  containsRoles: [teamMemberRole],
  description: 'Team lead with additional capabilities',
  assignableBy: 'x_snc_example.manager',
  canDelegate: true
})

export const departmentManagerRole = Role({
  $id: Now.ID['dept_manager'],
  name: 'x_snc_example.department_manager',
  containsRoles: [teamLeadRole],
  description: 'Department manager',
  assignableBy: 'admin'
})
```

### Pattern 3: External User Roles

```ts
export const partnerRole = Role({
  $id: Now.ID['partner'],
  name: 'x_snc_example.partner',
  description: 'External partner access',
  canDelegate: false,  // Partners cannot assign roles
  assignableBy: 'admin',  // Only admins can create partner accounts
  grantable: true
})

export const customerRole = Role({
  $id: Now.ID['customer'],
  name: 'x_snc_example.customer',
  description: 'Customer self-service access',
  canDelegate: false,
  elevatedPrivilege: false
})
```
