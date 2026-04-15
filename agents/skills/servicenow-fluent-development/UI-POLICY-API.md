# UI Policy API - ServiceNow Fluent

## Overview

The UI Policy API defines user interface (UI) policies (`sys_ui_policy`) that dynamically change the behavior of information on a form and control custom process flows for tasks.

UI Policies can make fields mandatory, read-only, visible, hidden, or cleared when certain conditions are met. You can also use client scripts to perform all of these actions, but for faster load times use UI policies when possible.

## Related Concepts
- ServiceNow Fluent
- UiPolicy object
- Related: ServiceNow UI forms, client scripts, form visibility control

---

## UiPolicy Object

Create a UI policy `sys_ui_policy` to configure form behavior.

### Properties

| Name | Type | Description | Required | Default |
|------|------|-------------|----------|---------|
| `$id` | String or Number | A unique ID for the metadata object. When you build the application, this ID is hashed into a unique sys_id. Format: `Now.ID['String' or Number]` | ✅ Yes | N/A |
| `table` | String | The table of the form to modify. | No | N/A |
| `view` | Reference or String | The variable identifier or name of the UI view (`sys_ui_view`) which applies, or the default view. To use the default view, import it: `import { default_view } from '@servicenow/sdk/core'`. If `global` is `true`, the policy applies to all form views. If `global` is `false`/undefined, specify a view to make the policy view-specific. | No | N/A |
| `shortDescription` | String | A description of the policy and its purpose. | ✅ Yes | N/A |
| `active` | Boolean | Flag that indicates whether the policy is applied to the form. | No | `true` |
| `global` | Boolean | Flag that indicates to which form views the policy applies. If `true`, the policy applies to all views of the table. If `false`, the policy is specific to the form view specified with the `view` property. | No | `true` |
| `onLoad` | Boolean | Flag that indicates when the policy executes. If `true`, the policy runs every time a form is loaded if the conditions are satisfied. | No | `true` |
| `reverseIfFalse` | Boolean | Flag that indicates whether to invert the policy behavior when the condition evaluates to false. If `true`, the policy action is undone when the conditions of its policy evaluate to false. | No | `true` |
| `inherit` | Boolean | Flag that indicates whether tables that extend the current table inherit the policy. If `true`, extended tables inherit the policy. When a child table has an inherited policy from its parent table, the policy on the child table runs first, regardless of the order of the policies. | No | `false` |
| `isolateScript` | Boolean | Flag that indicates whether to run scripts in isolated scope. If `true`, the script runs in isolated scope. This property only applies if `runScripts` is set to `true`. | No | `false` |
| `runScripts` | Boolean | Flag that indicates whether advanced behavior can be scripted for both true and false conditions. If `true`, scripts defined with `scriptTrue`, `scriptFalse`, `uiType`, and `isolateScript` properties run when applicable. | No | `false` |
| `scriptTrue` | String | Client-side script that runs if the conditions of the policy are met. This property is **required** if the `runScripts` property is set to `true`. Format: `function onCondition() {}` | Conditional | `function onCondition() {\n\n}` |
| `scriptFalse` | String | Client-side script that runs if the conditions of the policy aren't met and the `reverseIfFalse` property is set to `true`. This property is **required** if the `runScripts` property is set to `true`. Format: `function onCondition() {}` | Conditional | `function onCondition() {\n\n}` |
| `uiType` | String | The type of user interface to which the policy applies. This property is **required** if the `runScripts` property is set to `true`. Valid values: `desktop`, `mobile-or-service-portal`, `all` | Conditional | `desktop` |
| `conditions` | String | A filter query that specifies the fields and values that must be true for users to access the object. See Operators available for filters and queries. To set conditions using a script, use a client script instead. **Note:** Conditions are only rechecked if a user manually changes a field on a form. If the change is made by a UI action, context menu action, or through the list editor, it isn't evaluated. | No | N/A |
| `actions` | Array | A list of field actions to apply if the conditions are met. See `actions` array specification. | No | `[]` |
| `relatedListActions` | Array | A list of visibility controls for related lists. See `relatedListActions` array specification. | No | `[]` |
| `description` | String | Additional information about the policy. | No | N/A |
| `modelId` | String | The sys_id of the parent UI policy to which the policy applies when this policy is inherited. This property works in conjunction with `model_table` property. | No | N/A |
| `modelTable` | String | The name of the parent table to which the policy applies when a UI policy is inherited from a parent table. This property works in conjunction with the `model_id` property. | No | N/A |
| `order` | Number | The execution order in which to apply policies if more than one policy fits the conditions. For inherited UI policies, the extended table's policies are executed first, then the base table policies are executed. | No | `100` |
| `setValues` | String | **(Deprecated)** The field values to set using an encoded string format. Use UI policy actions instead. | No (deprecated) | N/A |

---

## actions Array

Configure the actions (`sys_ui_policy_action`) that the UI policy performs on fields.

Use the `actions` array within the `UiPolicy` object. Actions are processed in the order that they appear in the array. **At least one** of the `visible`, `readOnly`, `mandatory`, or `cleared` properties must be specified for each action in the array.

### Properties

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `field` | String | Required. The name of the field to which the action applies. **Note:** If the specified field isn't found on the form, the UI policy performs the action on the variable with the same name. | ✅ Yes |
| `visible` | Boolean or String | An option to control the visibility of the field. Valid values: `true` (visible), `false` (hidden), `'ignore'` (no change). | No |
| `readOnly` | Boolean or String | An option to control access to edit the field. Valid values: `true` (read-only), `false` (editable), `'ignore'` (no change). | No |
| `mandatory` | Boolean or String | An option to control whether the field is required. Valid values: `true` (required), `false` (optional), `'ignore'` (no change). | No |
| `cleared` | Boolean | Flag that indicates whether the field should be cleared if the conditions of the policy are met. | No |
| `table` | String | The table to which the action applies, which overrides the table specified by the policy. If empty, the table specified by the policy applies. | No |
| `value` | String | The value to set the field to if the policy conditions are met. | No |
| `fieldMessage` | String | A message to display about the field if the policy conditions are met. | No |
| `fieldMessageType` | String | A message type that determines how the field message is presented. Valid values: `error`, `info`, `warning`, `none`. | No |
| `valueAction` | String | An action to perform on the field value. Valid values: `set_value`, `clear_value`, `ignore`. | No |

### Example

```javascript
actions: [
  {
    field: 'assignment_group',
    mandatory: true,
    value: 'Critical Response Team',
    fieldMessage: 'This incident requires immediate attention from the Critical Response Team',
    fieldMessageType: 'error'
  },
  {
    field: 'urgency',
    value: '1',
    fieldMessage: 'Urgency has been automatically set to High',
    fieldMessageType: 'info'
  },
  {
    field: 'impact',
    value: '1',
    fieldMessage: 'Impact has been automatically set to High',
    fieldMessageType: 'warning'
  }
]
```

---

## relatedListActions Array

Configure the visibility of related lists (`sys_ui_policy_rl_action`) on a form for a UI policy.

Use the `relatedListActions` array within the `UiPolicy` object. Related list actions are processed in the order that they appear in the array. **Either** the `list` or `visible` property must be specified for each related list action in the array.

### Properties

| Name | Type | Description | Required |
|------|------|-------------|----------|
| `list` | String | A reference to a related list on the form. If empty, the action applies to all related lists. Format: `sys_ID` (for custom queries, attachments, system-defined related lists) or `table.field` (for reference field-based relationships like `incident.caller_id`). | Conditional |
| `visible` | Boolean or String | An option to control the visibility of the related list. Valid values: `true` (visible), `false` (hidden), `'ignore'` (no change). | Conditional |

### Example

```javascript
relatedListActions: [
  {
    // Using plain GUID for system relationships
    list: 'b9edf0ca0a0a0b010035de2d6b579a03', // Attachments
    visible: false
  },
  {
    // Using table.field format for reference fields
    list: 'x_snc_17sepapp1_expenseitem.expensereport',
    visible: true
  }
]
```

---

## Complete Example

```typescript
import { UiPolicy } from '@servicenow/sdk/core';
import { default_view } from '@servicenow/sdk/core';
import { Now } from '@servicenow/sdk/core';

export const securityIncidentPolicy = UiPolicy({
  $id: Now.ID['security_incident_policy'],
  table: 'incident',
  view: default_view,
  shortDescription: 'Lock critical fields for security incidents',
  active: true,
  global: true,
  onLoad: true,
  conditions: 'category="security"',
  reverseIfFalse: true,
  actions: [
    {
      field: 'security_notes',
      mandatory: true,
      visible: true
    },
    {
      field: 'caller_id',
      readOnly: true
    },
    {
      field: 'assignment_group',
      readOnly: true
    },
    {
      field: 'priority',
      readOnly: true
    }
  ],
  relatedListActions: [
    {
      list: 'b9edf0ca0a0a0b010035de2d6b579a03', // Attachments
      visible: false
    },
    {
      list: 'x_snc_17sepapp1_expenseitem.expensereport',
      visible: true
    }
  ]
});
```

---

## Key Design Patterns

### Performance Considerations
- **UI Policies are preferred over client scripts** for faster load times when you only need to modify field visibility, read-only state, mandatory status, or clear values.
- Use `runScripts` only when custom scripting logic is required.

### Condition Evaluation
- Conditions are **only rechecked if a user manually changes a field** on a form.
- Changes made by UI actions, context menu actions, or through the list editor **do not trigger condition re-evaluation**.

### Field vs. Variable Resolution
- If a specified field isn't found on the form, the UI policy performs the action on the variable with the same name.

### Inheritance Behavior
- When a child table has an inherited policy from its parent table, the **policy on the child table runs first**, regardless of the policy order.
- Extended tables inherit policies when the `inherit` property is set to `true`.

### Policy Execution Order
- Policies are executed in the order specified by the `order` property (default: 100).
- For inherited policies, child table policies execute before parent table policies.

### Script Isolation
- When `isolateScript` is `true`, scripts run in isolated scope, which provides additional security and prevents script conflicts.
- This property only applies when `runScripts` is `true`.

---

## Related APIs
- [UI Forms and g_form Operations](./UI-FORMS-API.md)
- [Client Scripts](./CLIENT-SCRIPTS-API.md) — For complex validation, async calls, or logic beyond field state control
- [Record API - UI Views](./RECORD-API.md)
