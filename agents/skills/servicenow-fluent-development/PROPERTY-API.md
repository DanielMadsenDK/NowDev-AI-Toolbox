# Property API - ServiceNow Fluent

The Property API defines system properties [sys_properties] that control instance behavior. System properties are key-value pairs used to store configuration values that applications can read and modify at runtime.

**Related concepts:** [Role API](./ACL-API.md), [Fluent Language Constructs](./API-REFERENCE.md)

## Overview

System properties are configuration entries stored in the `sys_properties` table. They are used for:
- Application-level settings and configuration
- Feature flags and feature toggling
- Environment-specific values (development, staging, production)
- Performance tuning parameters
- Application behavior customization

### Key Characteristics

- **Cached**: System property values are cached server-side for performance
- **Scoped**: Properties are namespaced by application scope (e.g., `x_snc_app.property_name`)
- **Typed**: Properties support multiple data types with validation
- **Accessible**: Retrieved at runtime via `gs.getProperty()` method
- **Importable**: Can be included in update sets for deployment across instances

---

## Property Definition

### Basic Structure

```typescript
import { Property } from '@servicenow/sdk/core'
import '@servicenow/sdk/global'

Property({
   $id: Now.ID['property_id'],
   name: 'x_snc_app.property_name',
   type: 'string',
   value: 'default_value',
   description: 'What this property controls',
})
```

---

## Properties Reference

### Required Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `$id` | String or Number | Unique ID for the metadata object using `Now.ID[]` format. Hashed into unique sys_id during build | `Now.ID['max_results']` |
| `name` | String | Property name in format `<scope>.<name>`. Must begin with application scope | `'x_snc_app.max_results_per_query'` |

### Optional Properties

| Property | Type | Default | Description | Valid Values |
|----------|------|---------|-------------|---------------|
| `value` | Any | N/A | Default value for the property. All values stored as strings; treat `gs.getProperty()` results as strings | Any string value |
| `type` | String | `'string'` | Data type for validation and display | See [Type Reference](#type-reference) |
| `description` | String | Empty | Description of what the property controls | Any text |
| `choices` | Array | N/A | Comma-separated list of valid values (when `type: 'choicelist'`) | `['Option1', 'Option2']` or `['Label=value', 'Label2=value2']` |
| `roles` | Object | N/A | Role access control for read/write permissions | See [Role Access](#role-access) |
| `ignoreCache` | Boolean | `false` | Whether to skip cache flushing when property value changes | `true` or `false` |
| `isPrivate` | Boolean | `false` | Whether to exclude from update set imports (prevents instance-specific values from overwriting) | `true` or `false` |
| `$meta` | Object | N/A | Installation metadata | See [$meta Reference](#meta-reference) |

---

## Type Reference

The `type` property determines how the property value is validated and displayed:

| Type | Description | Example Value |
|------|-------------|-----------------|
| `'string'` | Text string (default) | `'hello'` |
| `'integer'` | Integer number | `'42'` |
| `'boolean'` | Boolean flag (stored as string 'true'/'false') | `'true'` |
| `'choicelist'` | Select from predefined choices | `'option1'` |
| `'color'` | HTML color code | `'#FF0000'` |
| `'date_format'` | Date format pattern | `'yyyy-MM-dd'` |
| `'image'` | Image upload/selection | Image sys_id |
| `'password'` | Encrypted password | (encrypted value) |
| `'password2'` | Encrypted password (alternate) | (encrypted value) |
| `'short_string'` | Short text (40 chars) | `'Short text'` |
| `'time_format'` | Time format pattern | `'HH:mm:ss'` |
| `'timezone'` | IANA timezone identifier | `'America/New_York'` |
| `'uploaded_image'` | Uploaded image reference | Image sys_id |

### Important: String Storage

**All property values are stored as strings in the database.** When retrieving properties via `gs.getProperty()`, treat results as strings:

```javascript
// Stored as string 'true', NOT Boolean true
const isFeatureEnabled = gs.getProperty('x_app.feature_flag') === 'true';

// Stored as string '42', NOT Number 42
const maxResults = parseInt(gs.getProperty('x_app.max_results'));
```

---

## Role Access

Control which roles can read or write property values:

```typescript
import { Property, Role } from '@servicenow/sdk/core'

const adminRole = Role({
   $id: Now.ID['admin_role'],
   name: 'x_snc_app.admin'
})

const managerRole = Role({
   $id: Now.ID['manager_role'],
   name: 'x_snc_app.manager',
   containsRoles: [adminRole]
})

Property({
   $id: Now.ID['sensitive_setting'],
   name: 'x_snc_app.sensitive_config',
   type: 'password',
   value: '',
   description: 'Sensitive configuration only admins can see',
   roles: {
      read: [adminRole],           // Only admin can read
      write: [adminRole]           // Only admin can modify
   }
})
```

**Role object format:**
```typescript
roles: {
   read: [role1, role2, 'role_name'],     // Array of Role objects or role names
   write: [role1]                          // Array of Role objects or role names
}
```

---

## $meta Reference

Metadata for controlling installation behavior:

```typescript
Property({
   $id: Now.ID['demo_property'],
   name: 'x_snc_app.demo_setting',
   value: 'demo_value',
   $meta: {
      installMethod: 'demo'  // See valid values below
   }
})
```

### installMethod Values

| Value | Description |
|-------|-------------|
| `'first install'` | Install only on initial application installation |
| `'demo'` | Install only when "Load demo data" option is selected during application installation |

---

## ignoreCache Flag

Controls cache flushing behavior when property values change:

```typescript
Property({
   $id: Now.ID['frequently_changed'],
   name: 'x_snc_app.temp_flag',
   ignoreCache: true,  // Don't flush all caches
})
```

### Behavior

| Value | Behavior | Use Case |
|-------|----------|----------|
| `false` (default) | System flushes ALL server-side caches and retrieves current value from database | Properties changed infrequently (< once monthly) |
| `true` | System skips flushing other caches, only flushes System Properties cache | High-frequency changing properties (> once monthly) |

**Performance Note**: Set `ignoreCache: true` only for properties that change frequently, as it avoids the cost of flushing all server-side caches.

---

## isPrivate Flag

Controls whether property is included in update sets:

```typescript
Property({
   $id: Now.ID['local_setting'],
   name: 'x_snc_app.instance_local_setting',
   isPrivate: true,  // Exclude from update sets
})
```

### Behavior

| Value | Behavior | Use Case |
|-------|----------|----------|
| `false` (default) | Property is included in update sets and deployed across instances | Shared configuration that should be consistent everywhere |
| `true` | Property is excluded from update sets (not exported) | Instance-specific values (API keys, environment-specific URLs, local customizations) |

**Example**: Development instance uses a test API key, production uses a different one—mark as `isPrivate: true`.

---

## Examples

### String Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['app_name'],
   name: 'x_snc_app.application_name',
   type: 'string',
   value: 'My Application',
   description: 'Display name for the application',
})
```

### Boolean Feature Flag

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['feature_new_ui'],
   name: 'x_snc_app.enable_new_ui',
   type: 'boolean',
   value: 'false',
   description: 'Enable new UI features in beta',
})

// At runtime, retrieve as string and convert:
const enableNewUI = gs.getProperty('x_snc_app.enable_new_ui') === 'true';
```

### Integer Configuration

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['max_results'],
   name: 'x_snc_app.max_query_results',
   type: 'integer',
   value: '100',
   description: 'Maximum number of results per query',
})

// At runtime, convert string to integer:
const maxResults = parseInt(gs.getProperty('x_snc_app.max_query_results'));
```

### Choice List Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['log_level'],
   name: 'x_snc_app.logging_level',
   type: 'choicelist',
   value: 'INFO',
   description: 'Application logging level',
   choices: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
})

// With custom labels and values:
Property({
   $id: Now.ID['environment'],
   name: 'x_snc_app.environment',
   type: 'choicelist',
   value: 'dev',
   description: 'Deployment environment',
   choices: [
      'Development=dev',
      'Staging=staging',
      'Production=prod'
   ],
})
```

### Password Property with Role Access

```typescript
import { Property, Role } from '@servicenow/sdk/core'

const adminRole = Role({
   $id: Now.ID['admin_role'],
   name: 'x_snc_app.admin'
})

Property({
   $id: Now.ID['api_key'],
   name: 'x_snc_app.external_api_key',
   type: 'password',
   value: '',
   description: 'API key for external service (encrypted)',
   roles: {
      read: [adminRole],
      write: [adminRole]
   },
   isPrivate: true  // Don't export in update sets
})
```

### Date Format Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['date_format'],
   name: 'x_snc_app.date_format',
   type: 'date_format',
   value: 'yyyy-MM-dd',
   description: 'Date format for display throughout app',
})
```

### Timezone Configuration

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['app_timezone'],
   name: 'x_snc_app.default_timezone',
   type: 'timezone',
   value: 'America/New_York',
   description: 'Default timezone for date/time calculations',
})
```

### Color Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['brand_color'],
   name: 'x_snc_app.brand_primary_color',
   type: 'color',
   value: '#0066FF',
   description: 'Primary brand color for UI theming',
})
```

### Frequently Changed Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['request_counter'],
   name: 'x_snc_app.request_count_today',
   type: 'integer',
   value: '0',
   description: 'Daily request counter (resets at midnight)',
   ignoreCache: true  // Avoid cache flush overhead
})
```

### Demo-Only Property

```typescript
import { Property } from '@servicenow/sdk/core'

Property({
   $id: Now.ID['demo_data'],
   name: 'x_snc_app.demo_api_endpoint',
   type: 'string',
   value: 'https://demo.example.com/api',
   description: 'Demo API endpoint (included with demo data)',
   $meta: {
      installMethod: 'demo'
   }
})
```

---

## Retrieving Properties at Runtime

Properties are read-only at runtime via the `gs` (GlideSystem) API:

```javascript
// String property
const appName = gs.getProperty('x_snc_app.application_name');

// Boolean (remember: stored as string)
const isEnabled = gs.getProperty('x_snc_app.feature_enabled') === 'true';

// Integer (convert from string)
const maxResults = parseInt(gs.getProperty('x_snc_app.max_results'));

// With default fallback
const timeout = gs.getProperty('x_snc_app.request_timeout') || '30000';

// From business rule, script include, or any server-side context
const myProperty = gs.getProperty('x_snc_app.some_property');
```

---

## Best Practices

✓ **Use scope prefix** - Always begin property name with application scope (e.g., `x_snc_app.`)

✓ **Treat all values as strings** - `gs.getProperty()` returns strings; convert explicitly if needed

✓ **Provide meaningful descriptions** - Help other developers understand what each property controls

✓ **Use type validation** - Set appropriate `type` to catch invalid values early

✓ **Set sensible defaults** - Always provide a `value` that works without modification

✓ **Control access via roles** - Use `roles` to restrict who can read/modify sensitive properties

✓ **Mark instance-specific properties private** - Use `isPrivate: true` for environment-specific values (API keys, URLs, etc.)

✓ **Document cache behavior** - Only use `ignoreCache: true` for properties changed > once monthly

✓ **Use choicelist for enums** - When property has fixed set of valid values, use `type: 'choicelist'`

✗ **Don't assume Boolean type** - Always convert string 'true'/'false' explicitly

✗ **Don't skip descriptions** - Future maintainers need to understand purpose

✗ **Don't forget scope prefix** - Property names without scope can conflict with ServiceNow core properties

---

## When to Use Properties

Use system properties for:
- ✓ Configuration that changes per environment
- ✓ Feature flags and beta features
- ✓ Performance tuning parameters
- ✓ API keys and credentials
- ✓ User preferences
- ✓ Audit trail and logging settings

Avoid for:
- ✗ Large data storage (use tables instead)
- ✗ Frequently accessed high-performance data (cache separately)
- ✗ Data that belongs in a table (use records instead)

---

## Related APIs

- **[Role API](./ACL-API.md)** - Define roles referenced in property `roles` object
- **[Fluent Language Constructs](./API-REFERENCE.md)** - `Now.ID[]` and other language features
- **[ServiceNow Fluent](./FLUENT.md)** - Overview of Fluent SDK metadata types
