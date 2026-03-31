# Script Include API

Defines `sys_script_include` metadata that stores JavaScript functions and classes for use by server-side scripts.

```ts
import { ScriptInclude } from '@servicenow/sdk/core'
```

---

## Table of Contents

- [Important Note](#important-note)
- [Core Concepts](#core-concepts)
- [Properties Reference](#properties-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Related Concepts](#related-concepts)
- [Common Patterns](#common-patterns)

---

## Important Note

For **new scripts**, use **JavaScript modules** instead of script includes when possible to support code reuse and using third-party libraries within an application scope. See [JavaScript modules and third-party libraries](https://docs.servicenow.com/bundle/xanadu-application-development/page/build/applications/concept_javascript_modules.html) for more information.

Script includes remain useful for:
- **Legacy compatibility** — existing code calling script includes
- **GlideAjax client-callable scripts** — server methods invoked from client-side forms
- **Cross-scope access** — exposing functionality across application boundaries with `callerAccess` controls

---

## Core Concepts

### Name-Matching Requirement

The `name` property must match the corresponding JavaScript implementation:
- **Class-based script includes:** `name` must match the class name AND the `type` property
- **Classless (on-demand) script includes:** `name` must match the global function name

Mismatched names will cause lookup failures.

### Client-Callable Script Includes

To make a script include callable from client-side scripts using **GlideAjax**, set `clientCallable: true`. Callers must satisfy the ACL associated with the script include.

```ts
const ga = new GlideAjax('x_scope.MyScriptInclude')
ga.addParam('sysparm_name', 'methodName')
ga.getXMLAnswer(callback)
```

### Server JS Class Pattern

Script includes typically use `Object.extendsObject(global.AbstractAjaxProcessor, ...)` for client-callable methods:

```javascript
Object.extendsObject(global.AbstractAjaxProcessor, {
  methodName: function() {
    return 'result'
  },
  type: 'MyScriptInclude'
})
```

---

## Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID for the metadata object. Format: `Now.ID['script_id']`. When you build the application, this ID is hashed into a unique `sys_id`. |
| `name` | String | The name of the script include. **Must match the class name (for class-based) or function name (for classless/on-demand) in the JavaScript implementation.** |
| `script` | Script | A server-side script to call from other scripts. The script must define a single JavaScript class or a global function. The class or function name must match the `name` property. Supports inline JavaScript or `Now.include('./path/to/file')` reference to another file in the application. |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiName` | String | `<scope>.<name>` | An internal name for the script include, which is used to call the script include from out-of-scope applications. Format: `x_scope.ScriptIncludeName`. |
| `description` | String | Empty | A description of the purpose and function of the script include. |
| `clientCallable` | Boolean | `false` | Flag that indicates whether client-side scripts can call the script include using GlideAjax. When `true`, the script include is available to client scripts, list/report filters, reference qualifiers, or if specified as part of the URL. Client-callable script includes require users to satisfy an ACL associated with the script include. **Valid values:** `true`, `false` |
| `mobileCallable` | Boolean | `false` | Flag that indicates whether the script include is available to client scripts called from mobile devices. **Valid values:** `true`, `false` |
| `sandboxCallable` | Boolean | `false` | Flag that indicates whether the script include is available to scripts invoked from the script sandbox, such as a query condition. **⚠️ Important:** Script includes should only be made available to the script sandbox if necessary for security reasons. **Valid values:** `true`, `false` |
| `callerAccess` | String | (none) | An option for how cross-scope access to the script include is permitted. See [Restricted caller access privilege settings](https://docs.servicenow.com/bundle/xanadu-application-development/page/build/applications/concept_restricted_caller_access.html). **Valid values:** `'restriction'` (calls must be manually approved; tracked in Restricted Caller Access table with status Requested) or `'tracking'` (calls automatically approved; tracked with status Allowed) |
| `accessibleFrom` | String | `'package_private'` | Specifies which applications can access the script include. **Valid values:** `'public'` (all application scopes can call it) or `'package_private'` (only the application scope that contains it can call it) |
| `active` | Boolean | `true` | Flag that indicates whether the script include is enabled. When `false`, the script include is not callable. **Valid values:** `true`, `false` |
| `protectionPolicy` | String | (none) | A policy that determines whether someone can view or edit the script include after the application is installed on their instance. If undefined, other application developers can customize the script include. **Valid values:** `'read'` (allows anyone to read values from the downloaded/installed script include; no one can change script values on the instance) or `'protected'` (provides intellectual property protection for application developers; customers cannot see the contents of the script field and it is encrypted in memory to prevent unauthorized viewing) |
| `$meta` | Object | N/A | Metadata for the application metadata installation behavior. See `$meta.installMethod` below. |

### `$meta.installMethod` Values

The `$meta` property controls when the script include is installed:

| Value | Behavior |
|-------|----------|
| `'demo'` | Script include outputs to `metadata/unload.demo` directory; installed with the application only when the "Load demo data" option is selected during installation |
| `'first install'` | Script include outputs to `metadata/unload` directory; installed only on the initial application installation (not on updates) |

---

## Examples

### Basic Class-Based Script Include

```ts
import { ScriptInclude } from '@servicenow/sdk/core'

export const myScriptInclude = ScriptInclude({
  $id: Now.ID['si.user_utils'],
  name: 'UserUtils',
  apiName: 'x_myapp.UserUtils',
  description: 'User utility functions',
  active: true,
  script: Now.include('./UserUtils.server.js')
})
```

**Corresponding `UserUtils.server.js`:**

```javascript
var UserUtils = Class.create()

UserUtils.prototype = {
  initialize: function() {
    this.table = 'sys_user'
  },

  getUserByName: function(userName) {
    var gr = new GlideRecord(this.table)
    gr.addQuery('user_name', userName)
    gr.query()
    return gr.getNext() ? gr.sys_id.toString() : null
  },

  getUserEmail: function(userId) {
    var gr = new GlideRecord(this.table)
    if (gr.get(userId)) {
      return gr.email.toString()
    }
    return null
  },

  type: 'UserUtils'
}
```

### Classless (On-Demand) Script Include

```ts
import { ScriptInclude } from '@servicenow/sdk/core'

export const dateUtils = ScriptInclude({
  $id: Now.ID['si.date_utils'],
  name: 'dateUtils',
  apiName: 'x_myapp.dateUtils',
  description: 'Date utility functions',
  active: true,
  script: Now.include('./dateUtils.server.js')
})
```

**Corresponding `dateUtils.server.js`:**

```javascript
function dateUtils() {
  this.getDaysDifference = function(date1, date2) {
    var d1 = new GlideDateTime(date1)
    var d2 = new GlideDateTime(date2)
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
  }

  this.addDays = function(date, days) {
    var gdt = new GlideDateTime(date)
    gdt.addDaysUTC(days)
    return gdt.toString()
  }

  this.formatDate = function(date, format) {
    var gdt = new GlideDateTime(date)
    return gdt.format(format)
  }
}
```

### Client-Callable Script Include (GlideAjax)

```ts
import { ScriptInclude } from '@servicenow/sdk/core'

export const incidentUtils = ScriptInclude({
  $id: Now.ID['si.incident_utils'],
  name: 'IncidentUtils',
  apiName: 'x_myapp.IncidentUtils',
  description: 'Incident processing utilities callable from client scripts',
  clientCallable: true,
  mobileCallable: true,
  callerAccess: 'tracking',
  accessibleFrom: 'public',
  active: true,
  script: Now.include('./IncidentUtils.server.js')
})
```

**Corresponding `IncidentUtils.server.js`:**

```javascript
Object.extendsObject(global.AbstractAjaxProcessor, {
  getGroupMembers: function() {
    var groupId = this.getParameter('sysparm_group_id')
    var members = []

    var gr = new GlideRecord('sys_user_grmember')
    gr.addQuery('group', groupId)
    gr.query()

    while (gr.next()) {
      members.push({
        userId: gr.user.sys_id.toString(),
        userName: gr.user.user_name.toString(),
        displayName: gr.user.name.toString()
      })
    }

    return JSON.stringify(members)
  },

  validateIncidentPriority: function() {
    var priority = this.getParameter('sysparm_priority')
    var validPriorities = ['1', '2', '3', '4', '5']

    return JSON.stringify({
      valid: validPriorities.includes(priority),
      message: validPriorities.includes(priority) ? 'Valid priority' : 'Invalid priority'
    })
  },

  type: 'IncidentUtils'
})
```

**Client-side usage:**

```typescript
// In a ClientScript, onLoad handler, etc.
const ga = new GlideAjax('x_myapp.IncidentUtils')
ga.addParam('sysparm_name', 'getGroupMembers')
ga.addParam('sysparm_group_id', groupId)

ga.getXMLAnswer(function(answer) {
  try {
    const members = JSON.parse(answer)
    console.log('Group members:', members)
  } catch (error) {
    console.error('Error parsing response:', error)
  }
})
```

### Script Include with Access Control

```ts
import { ScriptInclude, Acl, Role } from '@servicenow/sdk/core'

export const adminRole = Role({
  $id: Now.ID['admin_role'],
  name: 'x_myapp.admin'
})

export const systemIntegration = ScriptInclude({
  $id: Now.ID['si.system_integration'],
  name: 'SystemIntegration',
  apiName: 'x_myapp.SystemIntegration',
  description: 'System integration utilities (admin only)',
  clientCallable: true,
  callerAccess: 'restriction',  // Requires manual approval
  accessibleFrom: 'public',
  active: true,
  script: Now.include('./SystemIntegration.server.js')
})

// Secure the script include
export const systemIntegrationAcl = Acl({
  $id: Now.ID['acl_system_integration'],
  type: 'client_callable_script_include',
  name: 'x_myapp.SystemIntegration',
  operation: 'execute',
  roles: [adminRole],
  description: 'Only admins can call SystemIntegration'
})
```

### Script Include with Intellectual Property Protection

```ts
import { ScriptInclude } from '@servicenow/sdk/core'

export const proprietaryLogic = ScriptInclude({
  $id: Now.ID['si.proprietary'],
  name: 'ProprietaryLogic',
  apiName: 'x_myapp.ProprietaryLogic',
  description: 'Proprietary business logic (encrypted)',
  protectionPolicy: 'protected',  // Encrypt script content
  active: true,
  script: Now.include('./ProprietaryLogic.server.js')
})
```

### Script Include with Demo Data Installation

```ts
import { ScriptInclude } from '@servicenow/sdk/core'

export const demoDataLoader = ScriptInclude({
  $id: Now.ID['si.demo_loader'],
  name: 'DemoDataLoader',
  apiName: 'x_myapp.DemoDataLoader',
  description: 'Loads demo data (installed with demo option)',
  active: true,
  $meta: {
    installMethod: 'demo'  // Only installs when "Load demo data" is selected
  },
  script: Now.include('./DemoDataLoader.server.js')
})
```

---

## Best Practices

### 1. Name-Matching is Critical

Always ensure the script include `name`, the class/function name, and (for classes) the `type` property all match exactly:

✓ **Correct:**
```ts
ScriptInclude({
  name: 'IncidentProcessor',
  script: Now.include('./IncidentProcessor.server.js')
})

// IncidentProcessor.server.js
var IncidentProcessor = Class.create()
IncidentProcessor.prototype = {
  process: function() { /* ... */ },
  type: 'IncidentProcessor'
}
```

✗ **Wrong — mismatched names:**
```ts
ScriptInclude({
  name: 'IncidentProcessor',
  script: Now.include('./IncidentProcessor.server.js')
})

// IncidentProcessor.server.js — class name doesn't match
var IncidentProc = Class.create() // ❌ Must be 'IncidentProcessor'
```

### 2. Use `callerAccess: 'restriction'` for Sensitive Operations

When cross-scope scripts might access your script include, use `callerAccess: 'restriction'` to require manual approval:

```ts
ScriptInclude({
  name: 'DataExporter',
  callerAccess: 'restriction',  // Requests tracked and manually approved
  accessibleFrom: 'public',
  // ...
})
```

### 3. Protect Intellectual Property with `protectionPolicy`

For proprietary or commercially sensitive logic, use `protectionPolicy: 'protected'` to encrypt the script:

```ts
ScriptInclude({
  name: 'ProprietaryAlgorithm',
  protectionPolicy: 'protected',  // Encrypted in memory; can't be read on instance
  // ...
})
```

### 4. Restrict `sandboxCallable` Unless Necessary

Only set `sandboxCallable: true` if query conditions or other sandbox contexts absolutely need to call your script include:

```ts
ScriptInclude({
  name: 'DataValidator',
  sandboxCallable: false,  // Default; set to true only if needed
  // ...
})
```

### 5. Use `accessibleFrom: 'package_private'` by Default

Most script includes should be scoped to their own application. Only use `accessibleFrom: 'public'` if cross-scope access is intentional:

```ts
ScriptInclude({
  name: 'MyUtils',
  accessibleFrom: 'package_private',  // Default; safer for most cases
  // ...
})
```

### 6. Document `apiName` for Cross-Scope Calls

When creating a public script include, always document its fully-scoped API name:

```ts
ScriptInclude({
  $id: Now.ID['si.public_api'],
  name: 'PublicApi',
  apiName: 'x_myapp.PublicApi',  // Document this for external callers
  accessibleFrom: 'public',
  // ...
})

// External application uses:
// var gr = new GlideRecord('incident')
// gr.setAbortAction(true)
// var result = new x_myapp.PublicApi().doSomething()
```

### 7. Leverage `$meta.installMethod` for Demo Data

Use `installMethod: 'demo'` for script includes that populate demo or sample data:

```ts
ScriptInclude({
  $id: Now.ID['si.demo_setup'],
  name: 'DemoSetup',
  $meta: { installMethod: 'demo' },  // Only when admin selects "Load demo data"
  script: Now.include('./DemoSetup.server.js')
})
```

---

## Related Concepts

### Access Control Lists (ACLs)

Secure client-callable script includes using ACL entries with `type: 'client_callable_script_include'`:

[ACL-API.md](./ACL-API.md)

```ts
Acl({
  $id: Now.ID['acl_my_si'],
  type: 'client_callable_script_include',
  name: 'x_myapp.MyScriptInclude',
  operation: 'execute',
  roles: [myRole]
})
```

### Cross-Scope Privileges

For scripts that call script includes in OTHER application scopes, declare the privilege:

[CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md)

```ts
CrossScopePrivilege({
  $id: Now.ID['csp_call_si'],
  operation: 'execute',
  targetName: 'TheirScriptInclude',
  targetScope: 'x_their_app',
  targetType: 'sys_script_include'
})
```

### Client-Server Communication Patterns

Client-callable script includes are the bridge between React/client code and server data. See full GlideAjax patterns:

[CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md)

### JavaScript Modules (Alternative to Script Includes)

For new code, prefer JavaScript modules for code reuse and third-party library support:

- Use **script includes** for: legacy compatibility, GlideAjax client-callable methods, cross-scope exposure
- Use **JavaScript modules** for: reusable server-side code, third-party npm library imports

---

## Common Patterns

### Pattern 1: Shared Utilities Library

Create a single script include that holds multiple utility functions as a class:

```ts
export const commonUtils = ScriptInclude({
  $id: Now.ID['si.common_utils'],
  name: 'CommonUtils',
  apiName: 'x_myapp.CommonUtils',
  description: 'Shared utility functions across application',
  active: true,
  script: Now.include('./CommonUtils.server.js')
})
```

**CommonUtils.server.js:**
```javascript
var CommonUtils = Class.create()

CommonUtils.prototype = {
  initialize: function() {},

  // String utilities
  sanitizeString: function(str) {
    return (str || '').trim().replace(/[^a-zA-Z0-9_]/g, '')
  },

  // Date utilities
  getDaysBetween: function(date1, date2) {
    var d1 = new GlideDateTime(date1).getNumericValue()
    var d2 = new GlideDateTime(date2).getNumericValue()
    return Math.floor(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24))
  },

  // Array utilities
  uniqueArray: function(arr) {
    return arr.filter(function(v, i, a) { return a.indexOf(v) === i })
  },

  type: 'CommonUtils'
}
```

### Pattern 2: Client-Callable Service for Form Handlers

Create a client-callable script include to support GlideAjax calls from client scripts and forms:

```ts
export const formService = ScriptInclude({
  $id: Now.ID['si.form_service'],
  name: 'FormService',
  apiName: 'x_myapp.FormService',
  clientCallable: true,
  mobileCallable: true,
  callerAccess: 'tracking',
  accessibleFrom: 'package_private',
  active: true,
  script: Now.include('./FormService.server.js')
})
```

**Client-side usage:**
```typescript
const ga = new GlideAjax('x_myapp.FormService')
ga.addParam('sysparm_name', 'checkDuplicate')
ga.addParam('sysparm_value', form.getValue('email'))

ga.getXMLAnswer((response) => {
  const result = JSON.parse(response)
  if (result.isDuplicate) {
    form.addErrorMessage('Email already registered')
  }
})
```

### Pattern 3: Configuration Manager

Create a classless script include for global configuration lookups:

```ts
export const configManager = ScriptInclude({
  $id: Now.ID['si.config_manager'],
  name: 'getConfig',
  apiName: 'x_myapp.getConfig',
  description: 'Retrieve application configuration',
  active: true,
  script: Now.include('./configManager.server.js')
})
```

**configManager.server.js:**
```javascript
function getConfig(configKey) {
  var gr = new GlideRecord('x_myapp_config')
  gr.addQuery('key', configKey)
  gr.query()

  if (gr.next()) {
    return {
      key: gr.key.toString(),
      value: gr.value.toString(),
      type: gr.type.toString()
    }
  }

  return null
}
```

**Usage from other scripts:**
```javascript
var config = new getConfig().getValue('feature_flag_x')
```
