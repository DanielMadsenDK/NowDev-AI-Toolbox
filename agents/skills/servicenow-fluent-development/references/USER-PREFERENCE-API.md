# User Preference API

Defines `sys_user_preference` metadata that stores default user-level settings. Use this to ship application defaults that users can override in their personal preferences.

```ts
import { UserPreference } from '@servicenow/sdk/core'
```

---

## Overview

User Preferences are per-user configuration values that control feature behavior. When deployed as Fluent metadata, they act as **system-wide defaults** — each user can override them through the ServiceNow UI, but the deployed value is the starting point for new users or installs.

Common use cases:
- Default notification preferences for a module
- Feature flag defaults (show/hide optional UI elements)
- Default values for user-configurable behavior in scripts

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID using `Now.ID['id']` format |
| `name` | String | Name of the preference, typically dot-notation scoped (e.g., `'x_scope.feature_enabled'`) |
| `type` | String | Data type of the value. See [Type Values](#type-values). |
| `value` | String \| Number \| Boolean | The default value for this preference |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `description` | String | N/A | Short description of what the preference controls |
| `system` | Boolean | `false` | Whether this is a system-wide default (rather than a per-user setting) |
| `$meta` | Object | N/A | Installation control: `{ installMethod: 'demo' \| 'first install' }` |

---

## Type Values

The `type` property uses the same values as the `Property` API's type field:

| Value | Description |
|-------|-------------|
| `'string'` | Text value |
| `'integer'` | Whole number |
| `'boolean'` | `true` or `false` |
| `'choicelist'` | One of a predefined set of values |
| `'color'` | Hex color code |
| `'date_format'` | Date formatting pattern |
| `'image'` | Image reference |
| `'password'` | Masked text value |
| `'timezone'` | Timezone string |

---

## Examples

### Boolean feature flag default

```ts
import { UserPreference } from '@servicenow/sdk/core'

export const showBannerPref = UserPreference({
  $id: Now.ID['pref.show_welcome_banner'],
  name: 'x_myapp.show_welcome_banner',
  type: 'boolean',
  value: true,
  description: 'Show the welcome banner on the application home page',
})
```

### Default string setting

```ts
import { UserPreference } from '@servicenow/sdk/core'

export const defaultViewPref = UserPreference({
  $id: Now.ID['pref.default_view'],
  name: 'x_myapp.default_view',
  type: 'string',
  value: 'summary',
  description: 'Default view shown when opening the application dashboard',
})
```

### System-wide default

```ts
import { UserPreference } from '@servicenow/sdk/core'

export const notifyOnAssignPref = UserPreference({
  $id: Now.ID['pref.notify_on_assign'],
  name: 'x_myapp.notify_on_assign',
  type: 'boolean',
  value: true,
  system: true,
  description: 'Send notification when a record is assigned to the user',
})
```

---

## Reading Preferences at Runtime

Retrieve the current user's preference value in a server-side script:

```js
// Server-side (script include, business rule, etc.)
var value = gs.getPreference('x_myapp.show_welcome_banner')
if (value === 'true') {
  // show banner
}
```

Set a preference programmatically:
```js
gs.setPreference('x_myapp.default_view', 'detail')
```

---

## Best Practices

- **Scope preference names** with your application prefix (e.g., `x_myapp.pref_name`) to avoid collisions with platform or other scoped preferences
- **Use `system: true`** when the value represents a platform-level default rather than something tied to an individual user's personal choice
- **Pair with `Property`** when you need a system-wide configuration that users cannot override — `Property` is for admin-controlled settings, `UserPreference` is for user-overridable defaults

---

## Related APIs

- [Property API](./PROPERTY-API.md) — System properties for admin-controlled configuration (users cannot override)
