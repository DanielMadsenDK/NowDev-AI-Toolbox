# JavaScript Modules Reference

JavaScript modules are the **preferred approach** for all server-side code in Fluent projects. Modules support `import`/`export`, provide access to typed Glide APIs via `@servicenow/glide`, enable code reuse across your application, and integrate with third-party npm libraries.

## When to Use Modules vs Now.include()

Not all Fluent APIs support modules — some `script` properties only accept strings. If the compiler rejects a module import (e.g., `Type '() => void' is not assignable to type 'string'`), the API is string-only and you must use `Now.include()` instead.

### APIs That Accept Functions (Use Modules)

| API | Module-compatible properties |
|-----|------------------------|
| BusinessRule | `script` |
| ScriptAction | `script` |
| UiAction | `script` |
| RestApi route handlers | `script` |
| CatalogItemRecordProducer | `script`, `postInsertScript` |
| ScheduledScript | `script` |

### APIs That Require Now.include() or Inline Strings

| API | String-only properties |
|-----|----------------------|
| ScriptInclude | `script` |
| ClientScript | `script` |
| CatalogClientScript | `script` |
| CatalogUiPolicy | script fields |
| UiPolicy | script fields |
| SPWidget | all script fields |
| Record | data values |

## Import Patterns

### Glide APIs in Module Files

In module files, `gs`, `GlideRecord`, and other Glide APIs are **NOT** automatically available. You must import them:

```javascript
import { gs, GlideRecord } from '@servicenow/glide'
```

### Namespaced APIs

Some APIs live under scope-specific subpaths:

```javascript
import { RESTAPIRequest, RESTAPIResponse } from '@servicenow/glide/sn_ws_int'
```

### Script Include Classes from Other Scopes

Import Script Include classes from other application scopes:

```javascript
import { MyClass } from '@servicenow/glide/x_my_scope'
```

### Consuming Module Exports in Server Scripts

Business rules and other server scripts consume module exports via `require()`:

```javascript
const { myFunction } = require('path/to/module')
```

## Script Include Module Rules

This is the most common source of errors. The rules differ based on file type:

| File Type | Import Glide APIs? | Why |
|-----------|-------------------|-----|
| **Module files** (normal functions) | **YES** — `import { gs } from '@servicenow/glide'` | Glide APIs are NOT auto-available in module context |
| **Script Include class files** (`Class.create`) | **NO** — do NOT import Glide APIs | Glide APIs ARE auto-available in Script Include execution context |
| **Module importing Script Include classes** | Import from `@servicenow/glide/<scopeName>` | Access cross-scope classes |

## Bridging Modules Through Script Includes

Many platform features still require script includes — GlideAjax, cross-scope APIs, and extension points that call script includes by name. When your logic lives in a module but needs to be accessible through these mechanisms, create a thin Script Include bridge.

### When to Use This Pattern

- Module code needs to be callable via GlideAjax from client scripts
- Another scoped app needs to call your logic by script include name
- A platform feature (dynamic reference qualifier, condition script) expects a script include
- You want typed imports and testability in a module while remaining accessible to legacy callers

### How It Works

1. Write business logic in a module file with ES module syntax (`import`/`export`)
2. Create a thin Script Include wrapper that uses `require()` to load the module and delegates to it
3. Define the Fluent record pointing at the wrapper via `Now.include()`

### Example

**Module file** (`src/modules/server/string-utils.js`):

```javascript
export function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.substring(1)
}

export function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}
```

**Wrapper script** (`src/server/script-includes/string-utils.js`):

```javascript
var StringUtils = Class.create()

StringUtils.prototype = {
    initialize: function () {
        this._mod = require('./dist/modules/server/string-utils.js')
    },

    capitalize: function (text) {
        return this._mod.capitalize(text)
    },

    truncate: function (text, maxLength) {
        return this._mod.truncate(text, maxLength)
    },

    type: 'StringUtils',
}
```

**Fluent definition** (`src/fluent/script-includes/string-utils.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['StringUtils'],
    name: 'StringUtils',
    script: Now.include('../../server/script-includes/string-utils.js'),
    description: 'Bridge to string utility module',
})
```

**Key rules for the wrapper:**

- Keep the wrapper as thin as possible — only `require()` the module and delegate
- The wrapper uses `Class.create` and must **NOT** import Glide APIs (auto-available in Script Include context)
- The module file **MUST** import Glide APIs from `@servicenow/glide` (NOT auto-available in module context)
- The `require()` path points to `./dist/modules/...` — the bundled output location
- The `type` property, class name, and Fluent `name` must all match exactly

## Full Pattern: Business Rule with Module

The recommended pattern for server-side scripts in function-accepting APIs:

**Fluent definition** (`src/fluent/business-rules/validate-request.now.ts`):

```typescript
import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { validateRequest } from '../../server/business-rules/validate-request'

BusinessRule({
    $id: Now.ID['validate-request'],
    name: 'Validate Request',
    table: 'x_myapp_request',
    when: 'before',
    action: ['insert', 'update'],
    script: validateRequest,
})
```

**Module file** (`src/server/business-rules/validate-request.js`):

```javascript
import { gs } from '@servicenow/glide'

export function validateRequest(current, previous) {
    var title = current.getValue('short_description');
    if (!title) {
        gs.addErrorMessage('Short description is required');
        current.setAbortAction(true);
    }
}
```

## Subpath Imports

Use subpaths in `package.json` to create shorthand imports for frequently used modules:

```json
{
    "imports": {
        "#calc": "calculus",
        "#derivative": "calculus/derivative"
    },
    "dependencies": {
        "calculus": "1.0.0"
    }
}
```

Then use the shorthand:

```javascript
import { derivative } from '#derivative'
import * as calculus from '#calc'
```

## Third-Party Libraries

Third-party npm libraries can be used in modules:

1. Declare dependencies in `package.json` under `dependencies`
2. Import normally in module files
3. Never modify versions of existing dependencies — only add new entries

```json
{
    "dependencies": {
        "math": "1.0.0"
    }
}
```

```javascript
import { calculate } from 'math'
```

## Limitations

- Modules work only within the application scope — no cross-scope module sharing
- Node.js APIs are not supported
- Third-party libraries cannot access ServiceNow APIs
- CommonJS modules from third-party libs are not supported unless they define exports
- Only a subset of ECMAScript features are supported

---

## Module Resolver Version

Source: https://servicenow.github.io/sdk/config/now-config-reference

The `packageResolverVersion` setting in `now.config.json` controls which Rhino module resolver is used at runtime:

| Value | Notes |
|-------|-------|
| `"1.0.0"` | Default for scoped applications |
| `"2.0.0"` | **Required for Global scope applications.** Also recommended for new scoped apps. |

```json
{
  "scope": "x_myapp",
  "scopeId": "...",
  "packageResolverVersion": "2.0.0"
}
```

Set `packageResolverVersion` to `"2.0.0"` when targeting the Global scope or when you encounter module resolution errors with the default resolver.

## Avoidance

- **Never use Glide APIs without importing them in module files** — they are NOT globally available in module context
- **Never import Glide APIs in Script Include class files** — they ARE globally available in that context
- **Never use methods not in `@servicenow/glide` type definitions** — ServiceNow's Glide objects have specific, limited APIs
- **Never modify existing dependency versions in `package.json`** — only add new dependencies
- **Never use `gs.nowDateTime()` in scoped apps** — use `new GlideDateTime().getDisplayValue()` instead
