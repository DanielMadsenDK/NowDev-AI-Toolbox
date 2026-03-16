# UI Action API

Create custom user interface (UI) actions such as buttons, links, and context menu items on forms and lists.

## Overview

The UI Action API defines custom user interface (UI) actions (`[sys_ui_action]`) that display on forms and lists as buttons, links, and context menu items. UI actions execute client-side or server-side scripts when triggered by users, enabling interactive functionality without page refresh or navigation.

## Related Concepts

- **ServiceNow Fluent**: `.now.ts` metadata files using the ServiceNow SDK
- **UiAction Object**: The Fluent metadata object for defining UI actions
- **Client-Side Scripting**: Browser-executed logic for immediate user feedback
- **Server-Side Scripting**: Server-executed logic for secure data operations

---

## UiAction Properties Reference

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `$id` | String or Number | Unique ID for the metadata object (hashed to `sys_id` during build). Use `Now.ID['id']` format. **See [API-REFERENCE.md](API-REFERENCE.md) for ServiceNow Fluent language constructs.** | `Now.ID['car_info']` |
| `table` | String | The name of the table on which the UI action is available. Set to `'global'` to make the action available on all tables. By default, the action also appears on tables that extend the selected table. | `'x_snc_ts_custom_cars'` |
| `name` | String | The text that appears on the button, link, or context menu item. The name must be unique within the table specified. | `'View car info'` |

### Optional Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `actionName` | String | N/A | A unique name to use when referencing the UI action in scripts. | `'Car Information'` |
| `active` | Boolean | `true` | Flag that indicates whether the UI action is enabled. | `true` |
| `form` | Object | N/A | Options for how UI actions appear on forms. See [form object](#form-object). | See example below |
| `list` | Object | N/A | Options for how UI actions appear on the list view. See [list object](#list-object). | See example below |
| `client` | Object | N/A | Options to execute the script in the browser. See [client object](#client-object). | See example below |
| `workspace` | Object | N/A | Options for how UI actions function and appear in workspaces. See [workspace object](#workspace-object). | See example below |
| `overrides` | Reference or String | N/A | The name or variable identifier of another UI action that the UI action overrides. | `'existing_action'` |
| `showInsert` | Boolean | `false` | Flag indicating whether to show a button on new records before they're inserted. | `true` |
| `showUpdate` | Boolean | `true` | Flag indicating whether to show a button on existing records. | `true` |
| `showQuery` | Boolean | `false` | Flag indicating whether the UI action is visible on a list when a filter query is applied. | `true` |
| `showMultipleUpdate` | Boolean | `false` | Flag indicating whether to show a button when multiple records are selected. | `true` |
| `condition` | String | N/A | A JavaScript conditional statement that specifies the fields and values that must be true for the script to run. | `"current.type == 'SUV'"` |
| `script` | Script | N/A | A client-side or server-side script that runs when the UI action is executed. Supports inline JavaScript or a reference to another file. | See [Script Content Options](#script-content-options) |
| `comments` | String | N/A | Internal notes about the UI action. | `'Displays car information modal'` |
| `messages` | String | N/A | Text strings that the UI action can use as keys to look up localized message alternatives from the Message [sys_ui_message] table. Each message key is on a separate line. | `'msg_confirm\nmsg_success'` |
| `hint` | String | N/A | A short description of the UI action that displays as a tooltip when hovering over it. | `'View car info'` |
| `order` | Number | `100` | The order in which the UI action appears. The order applies to buttons from left to right and to menu actions from top to bottom. | `100` |
| `isolateScript` | Boolean | `false` | Flag indicating whether the script runs in strict mode, with access to direct DOM, jQuery, prototype, and the window object turned off. | `false` |
| `roles` | Array | N/A | A list of variable identifiers of Role objects or names of roles required for the UI action to apply. | `['u_requestor']` |
| `includeInViews` | Array | N/A | A list of names of views in which the UI action is included. | `['specialView']` |
| `excludeFromViews` | Array | N/A | A list of names of views from which the UI action is excluded. | `['adminView']` |
| `$meta` | Object | N/A | Metadata for the application metadata with `installMethod` property for controlling installation. | `{ installMethod: 'first install' }` |

### Property Details

#### Script Content Options

UI actions support three content delivery methods for the `script` property:

1. **JavaScript function import** (for server-side logic modules):
   ```typescript
   import { updateCarInfo } from '../server/handlers.js'
   script: updateCarInfo
   ```

2. **File reference with `Now.include()`** (enables two-way sync):
   ```typescript
   script: Now.include('./car-action.js')
   ```
   See [API-REFERENCE.md](API-REFERENCE.md#nowinclude) for details.

3. **Inline JavaScript** (for simple scripts):
   ```typescript
   script: "current.name = 'updated'; current.update();"
   ```
   Or with template literals for multi-line code:
   ```typescript
   script: `
     current.name = "updated by script";
     current.update();
   `
   ```

#### Condition Property Format

The `condition` property specifies when the UI action is visible and executable:

```typescript
// Simple field condition
condition: "current.type == 'SUV'"

// Complex multi-field condition
condition: "current.status === 'open' && current.priority < 3"

// File reference with two-way sync
condition: Now.include('./visibility-condition.js')

// Parent record reference (on related lists)
condition: "parent.active"
```

**Notes:**
- The current object isn't available for conditions on a list context menu
- If you leave a field empty in your condition, that condition defaults to true
- For related list buttons, you can reference the parent record (e.g., `parent.active`)

#### `$meta.installMethod` Valid Values

- `'first install'` — Metadata is installed only on initial application installation
- `'demo'` — Metadata is installed only when "Load demo data" option is selected during installation

---

## form Object

Configure how a UI action appears on a form.

### Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `showButton` | Boolean | `false` | Flag indicating whether to include a button on a form. | `true` |
| `showLink` | Boolean | `false` | Flag indicating whether to include a link in the Related Links section of a form. | `true` |
| `showContextMenu` | Boolean | `false` | Flag indicating whether to include an item in the context menu of a form. | `false` |
| `style` | String | N/A | A style that defines how UI action buttons appear on a form. Valid values: `'primary'` (blue), `'destructive'` (red), `'unstyled'`. | `'destructive'` |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property. | `{ installMethod: 'demo' }` |

### Example

```typescript
form: {
  showButton: true,
  showLink: true,
  showContextMenu: false,
  style: 'destructive',
}
```

---

## list Object

Configure how a UI action appears on the list view.

### Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `showButton` | Boolean | `false` | Flag indicating whether to include a button at the bottom of a list. Note: Buttons appear regardless of condition and are evaluated per record on execution. | `true` |
| `showLink` | Boolean | `false` | Flag indicating whether to include a link in the Related Links section of a list. | `true` |
| `showContextMenu` | Boolean | `false` | Flag indicating whether to include an item in the context menu of a list. | `false` |
| `style` | String | N/A | A style that defines how UI action buttons appear on the list view. Valid values: `'primary'` (blue), `'destructive'` (red), `'unstyled'`. | `'primary'` |
| `showListChoice` | Boolean | `false` | Flag indicating whether to include a choice in the Actions list of a list. Note: Choices appear regardless of condition and are evaluated per record on execution. | `true` |
| `showBannerButton` | Boolean | `false` | Flag indicating whether to include a button on the banner of a list. Note: Not intended for record-specific conditions; only the first row is considered. | `true` |
| `showSaveWithFormButton` | Boolean | `false` | Flag indicating whether the form is saved when accessed from a list before executing the UI action button. | `true` |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property. | `{ installMethod: 'demo' }` |

### Example

```typescript
list: {
  showButton: true,
  showLink: true,
  showContextMenu: false,
  style: 'primary',
  showListChoice: false,
  showBannerButton: true,
  showSaveWithFormButton: true,
}
```

---

## client Object

Configure options to execute the UI action script in the browser.

### Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `isClient` | Boolean | `false` | Flag indicating where the UI action script runs. `true` = client (browser), `false` = server. | `true` |
| `isUi11Compatible` | Boolean | `false` | Flag indicating whether the UI action is supported in the legacy UI 11. | `true` |
| `isUi16Compatible` | Boolean | `false` | Flag indicating whether the UI action is supported in the Core UI (UI16+). | `true` |
| `onClick` | String | N/A | The name of the JavaScript function to run when the UI action is executed. The function is defined with the `script` property. | `'reopenIncident()'` |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property. | `{ installMethod: 'demo' }` |

### Example

```typescript
client: {
  isClient: true,
  isUi11Compatible: true,
  isUi16Compatible: true,
  onClick: 'reopenIncident()'
}
```

---

## workspace Object

Configure how a UI action functions and appears in workspaces.

### Properties

| Property | Type | Default | Description | Example |
|----------|------|---------|-------------|---------|
| `isConfigurableWorkspace` | Boolean | `false` | Flag indicating the type of workspace. `true` = Configurable Workspaces, `false` = Legacy Workspaces. | `true` |
| `showFormButtonV2` | Boolean | `false` | Flag indicating whether to include a button on forms in a workspace. | `true` |
| `showFormMenuButtonV2` | Boolean | `false` | Flag indicating whether to include an item in the More Actions menu in a workspace. | `true` |
| `clientScriptV2` | String | N/A | A script that runs when the UI action is executed in workspaces. Supports inline JavaScript or file reference via `Now.include()`. | See example below |
| `$meta` | Object | N/A | Installation metadata with `installMethod` property. | `{ installMethod: 'demo' }` |

### Example

```typescript
workspace: {
  isConfigurableWorkspace: true,
  showFormButtonV2: true,
  showFormMenuButtonV2: true,
  clientScriptV2: `function onClick(g_form) {
    // Workspace-specific logic
  }`,
}
```

---

## Complete Example

### Metadata Definition (.now.ts)

```typescript
import { UiAction } from '@servicenow/sdk/core'

export const carInfoAction = UiAction({
    $id: Now.ID['car_info'],
    table: 'x_snc_ts_custom_cars',
    actionName: 'Car Information',
    name: 'View car info',
    active: true,
    showInsert: true,
    showUpdate: true,
    hint: 'View car info',
    condition: "current.type == 'SUV'",
    form: {
        showButton: true,
        showLink: true,
        showContextMenu: false,
        style: 'destructive',
    },
    list: {
        showLink: true,
        style: 'primary',
        showButton: true,
        showContextMenu: false,
        showListChoice: false,
        showBannerButton: true,
        showSaveWithFormButton: true,
    },
    workspace: {
        isConfigurableWorkspace: true,
        showFormButtonV2: true,
        showFormMenuButtonV2: true,
        clientScriptV2: `function onClick(g_form) {
            // Workspace-specific logic here
        }`,
    },
    script: `current.name = "updated by script"; current.update();`,
    roles: ['u_requestor'],
    client: {
        isClient: true,
        isUi11Compatible: true,
        isUi16Compatible: true,
    },
    order: 100,
    showQuery: false,
    showMultipleUpdate: false,
    isolateScript: false,
    includeInViews: ['specialView'],
    excludeFromViews: [],
})
```

---

## Usage Patterns

### Pattern 1: Form Action Button

Create a button on forms that performs an update:

```typescript
import { UiAction } from '@servicenow/sdk/core'

export const approveIncident = UiAction({
    $id: Now.ID['approve_incident'],
    table: 'incident',
    name: 'Approve',
    actionName: 'ApproveIncident',
    active: true,
    condition: "current.state === '2' && gs.hasRole('manager')",
    form: {
        showButton: true,
        style: 'primary',
    },
    script: Now.include('./approve-handler.js'),
    roles: ['manager'],
    order: 10,
})
```

**Handler:**
```javascript
// approve-handler.js
current.state = '3'
current.approval = 'approved'
current.approver = gs.getUserID()
current.update()
gs.info('Incident approved by ' + gs.getUserName())
```

### Pattern 2: List Context Menu Action

Create a context menu item on list views:

```typescript
export const bulkUpdate = UiAction({
    $id: Now.ID['bulk_update_status'],
    table: 'task',
    name: 'Mark Complete',
    actionName: 'MarkComplete',
    form: {
        showContextMenu: false,
    },
    list: {
        showContextMenu: true,
        style: 'primary',
    },
    script: `current.state = '7'; current.update();`,
    showMultipleUpdate: true,
    order: 20,
})
```

### Pattern 3: Client-Side Interactive Action

Create a client-side button for immediate user feedback:

```typescript
export const refreshData = UiAction({
    $id: Now.ID['refresh_view'],
    table: 'dashboard',
    name: 'Refresh',
    actionName: 'RefreshDashboard',
    form: {
        showButton: true,
        style: 'primary',
    },
    client: {
        isClient: true,
        isUi16Compatible: true,
        onClick: 'refreshDashboard()',
    },
    script: `
        function refreshDashboard() {
            location.reload();
        }
    `,
    order: 50,
})
```

### Pattern 4: Conditional Visibility with Roles

Show different actions based on user role and record state:

```typescript
export const escalateTicket = UiAction({
    $id: Now.ID['escalate_ticket'],
    table: 'incident',
    name: 'Escalate to Manager',
    actionName: 'EscalateTicket',
    condition: "current.priority === '1' && current.state !== 'resolved'",
    form: {
        showButton: true,
        showLink: true,
        style: 'destructive',
    },
    script: Now.include('./escalation-handler.js'),
    roles: ['support_team', 'manager'],
    order: 5,
})
```

### Pattern 5: Workspace-Specific Action

Define actions for modern workspace interfaces:

```typescript
export const quickAction = UiAction({
    $id: Now.ID['workspace_quick_action'],
    table: 'incident',
    name: 'Quick Fix',
    actionName: 'WorkspaceQuickFix',
    workspace: {
        isConfigurableWorkspace: true,
        showFormButtonV2: true,
        showFormMenuButtonV2: true,
        clientScriptV2: `
            function onClick(g_form) {
                g_form.setValue('state', '7');
                g_form.save();
            }
        `,
    },
    order: 30,
})
```

---

## Best Practices

### ✓ Do's

- ✓ **Use `showButton` for primary actions** — Buttons are discoverable and prominent
- ✓ **Use `showLink` for secondary actions** — Links take less space in the Related Links section
- ✓ **Set explicit `order`** values to control button/link ordering
- ✓ **Use `condition`** property to hide actions when not applicable
- ✓ **Use `roles`** to restrict actions to authorized users
- ✓ **Use `Now.include()`** for external script files to enable two-way synchronization
- ✓ **Add `hint`** text for clear user guidance via tooltips
- ✓ **Test on both UI11 and UI16** if supporting legacy interfaces (`isUi11Compatible`, `isUi16Compatible`)
- ✓ **Use client-side scripts** (`isClient: true`) for immediate feedback without page reload
- ✓ **Set `showSaveWithFormButton: true`** when the action depends on form data being saved first
- ✓ **Use `$meta.installMethod: 'first install'`** for initial setup actions
- ✓ **Validate conditions thoroughly** to avoid script errors

### ✗ Don'ts

- ✗ **Don't use context menu actions in lists** without testing the condition evaluation (current object unavailable)
- ✗ **Don't create many actions** on the same table — group related actions or use a menu
- ✗ **Don't assume `current` is available** in list context menu conditions
- ✗ **Don't use heavy processing** in client-side scripts — consider server-side execution for complex operations
- ✗ **Don't hardcode sys_ids** — reference fields by name or use queries
- ✗ **Don't forget error handling** — wrap scripts in try-catch blocks for robustness
- ✗ **Don't use `showBannerButton`** for record-specific logic — banners only evaluate the first row
- ✗ **Don't mix client and server logic** in the same script — keep concerns separate
- ✗ **Don't rely on `isolateScript: false`** for production code — it reduces security

---

## Common Patterns and Examples

### Update Record Server-Side

```typescript
export const updateStatus = UiAction({
    $id: Now.ID['update_status'],
    table: 'task',
    name: 'Set To In Progress',
    form: { showButton: true },
    script: `
        current.state = '2';
        current.assignment_group = gs.getUser().getID();
        current.update();
    `,
    order: 10,
})
```

### Client-Side Modal/Alert

```typescript
export const confirmAction = UiAction({
    $id: Now.ID['confirm_action'],
    table: 'incident',
    name: 'Confirm and Proceed',
    form: { showButton: true, style: 'primary' },
    client: {
        isClient: true,
        isUi16Compatible: true,
        onClick: 'confirmAndProceed()',
    },
    script: `
        function confirmAndProceed() {
            if (confirm('Are you sure?')) {
                g_form.save();
            }
        }
    `,
})
```

### Restrict to Multiple Roles

```typescript
export const adminAction = UiAction({
    $id: Now.ID['admin_only_action'],
    table: 'sys_user',
    name: 'Admin Panel',
    form: { showButton: true, style: 'destructive' },
    script: Now.include('./admin-handler.js'),
    roles: ['admin', 'system_admin', 'security_admin'],
    order: 1,
})
```

---

## Error Handling

Always include error handling in UI action scripts:

```typescript
import { UiAction } from '@servicenow/sdk/core'

export const safeUpdateAction = UiAction({
    $id: Now.ID['safe_update'],
    table: 'incident',
    name: 'Safe Update',
    form: { showButton: true },
    script: `
        try {
            if (!current.getUniqueValue()) {
                gs.error('Cannot update unsaved record');
                return;
            }
            current.state = '3';
            current.update();
            gs.info('Record updated successfully');
        } catch (e) {
            gs.error('Error updating record: ' + e.message);
        }
    `,
})
```

---

## Related References

- **[API-REFERENCE.md](API-REFERENCE.md)** — UiAction quick reference, Fluent language constructs (`Now.ID`, `Now.include`)
- **[CLIENT-SERVER-PATTERNS.md](CLIENT-SERVER-PATTERNS.md)** — Client-side and server-side script patterns
- **[TABLE-API.md](TABLE-API.md)** — Table definitions and field references for conditions
- **[EXAMPLES.md](EXAMPLES.md)** — Complete working examples of UI actions in context

---

## Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Action not appearing | Hidden by condition or role restriction | Check `condition`, `roles`, `showInsert`/`showUpdate` properties; verify user's roles |
| Condition not evaluating | `current` unavailable in list context menu | Don't use `current` in list context menu conditions; use record-specific conditions in list buttons instead |
| Script not executing | Client/server mode mismatch | Verify `client.isClient` setting; test script syntax in browser/server console |
| Wrong button order | Missing or duplicate `order` values | Set explicit `order` values; lower numbers appear first |
| Permission denied | Insufficient user roles | Add user's role to `roles` array; verify role definitions |
| Performance issues | Heavy processing in action | Move complex logic to Script Includes; use server-side execution for data operations |
| Form not saved | `showSaveWithFormButton` not set | Set `showSaveWithFormButton: true` if action depends on form data |
| Workspace action not working | Incorrect workspace settings | Use `workspace.isConfigurableWorkspace: true` for modern workspaces; test `clientScriptV2` syntax |
