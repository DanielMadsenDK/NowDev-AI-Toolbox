# Scripted REST API

Defines `sys_ws_definition` metadata that creates endpoints for REST web services. Use REST APIs to expose ServiceNow functionality to external systems, mobile applications, or to enable cross-instance communication.

```ts
import { RestApi } from '@servicenow/sdk/core'
```

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [RestApi Object](#restapi-object)
- [routes Object](#routes-object)
- [parameters and headers objects](#parameters-and-headers-objects)
- [versions object](#versions-object)
- [Complete End-to-End Example](#complete-end-to-end-example)
- [Best Practices](#best-practices)
- [Related Concepts](#related-concepts)

---

## Core Concepts

### When to Use REST APIs

Use **REST APIs** when you need:
- **External system integration** — expose ServiceNow data to external applications
- **Mobile app integration** — serve clients beyond ServiceNow's native web interface
- **Cross-instance communication** — enable data exchange between ServiceNow instances
- **OpenAPI documentation** — auto-generated API documentation
- **Stateless, protocol-standard access** — HTTP/REST semantics for API consumers

**Alternative:** For internal ServiceNow apps only, use **GlideAjax** (simpler, built-in security). See the main skill guide for the [GlideAjax vs REST API decision matrix](../SKILL.md#glideajax-vs-rest-api--decision-guide).

### Architecture

A REST API definition consists of:
1. **RestApi object** — the API container, properties, versioning, and ACL enforcement
2. **routes array** — collection of HTTP endpoints (GET, POST, PUT, PATCH, DELETE)
3. **parameters & headers** — query parameters and HTTP headers for each route
4. **versions array** — version management for API lifecycle (active, deprecated, default)

### Design Guidance

- **One route per HTTP method per path:** Each route handles a single HTTP method (GET, POST, PUT, PATCH, DELETE). Create separate routes for different methods on the same path.
- **Use path parameters for resource identifiers:** Define path params with `{id}` syntax in the route path (e.g., `/items/{id}`). Use query parameters for filtering and pagination.
- **Version your API from the start:** Use the `versions` array on the RestApi and set `version` on each route. This generates versioned URIs and allows non-breaking evolution.
- **Set ACLs at the right level:** `enforceAcl` on RestApi applies to all routes. `enforceAcl` on individual routes overrides the API-level setting.

---

## RestApi Object

Create a scripted REST API service definition `[sys_ws_definition]` to define web service endpoints.

### Properties Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | — | Unique ID for the metadata object. Format: `Now.ID['api_id']`. When you build, this ID is hashed into a unique `sys_id`. See [ServiceNow Fluent language constructs](./API-REFERENCE.md). |
| `name` | String | Yes | — | The name of the API, used in API documentation. |
| `serviceId` | String | Yes | — | The API identifier used in URI paths. Must be unique within the API namespace. Example: `custom_api` maps to `/api/custom_api/...` |
| `active` | Boolean | No | `true` | Flag indicating whether the API can serve requests. **Valid values:** `true` (can serve requests), `false` (cannot serve requests). |
| `shortDescription` | String | No | — | A brief description of the API, used in documentation. |
| `consumes` | String | No | `application/json,application/xml,text/xml` | A comma-separated list of media types that resources of the API can consume. |
| `produces` | String | No | `application/json,application/xml,text/xml` | A comma-separated list of media types that resources of the API can produce. |
| `docLink` | String | No | — | A URL that links to static documentation about the API. |
| `enforceAcl` | Array | No | `['Scripted REST External Default']` | A list of **variable identifiers of ACL objects** or **sys_ids of ACLs** to enforce when accessing resources. To disable ACL enforcement, set to an empty array `[]`. See [Access Control List API](./ACL-API.md). |
| `routes` | Array | Yes | — | The resources `[sys_ws_operation]` for the API (HTTP endpoints). See [routes object](#routes-object) below. |
| `policy` | String | No | — | The policy for how application files are protected when downloaded or installed. **Valid values:** `'read'` (files viewable only), `'protected'` (users with password permissions can edit). |
| `versions` | Array | No | — | A list of versions `[sys_ws_version]` for the API. Specifying versions allows you to manage different API versions and their statuses (active, default, deprecated). See [versions object](#versions-object) below. |
| `$meta` | Object | No | — | Metadata for installation behavior. See `$meta.installMethod` below. |

### `$meta.installMethod` Values

| Value | Behavior |
|-------|----------|
| `'demo'` | API outputs to `metadata/unload.demo` directory; installed only when "Load demo data" option is selected during installation |
| `'first install'` | API outputs to `metadata/unload` directory; installed only on the initial application installation (not on updates) |

### Example RestApi Definition

```ts
import { RestApi, Acl } from '@servicenow/sdk/core'
import { process } from '../server/handler.js'

const acl = Acl({
  $id: Now.ID['rest_acl'],
  name: 'Custom API ACL',
  type: 'rest_endpoint',
  script: `answer = (gs.hasRole('api_admin') || gs.hasRole('rest_user'))`,
  active: true,
  operations: ['execute']
})

export const customApi = RestApi({
  $id: Now.ID['rest1'],
  name: 'Custom API',
  serviceId: 'custom_api',
  shortDescription: 'Provides endpoints for custom business operations',
  consumes: 'application/json',
  produces: 'application/json',
  active: true,
  enforceAcl: [acl],
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/home/{id}',
      method: 'GET',
      script: process,
      parameters: [{ $id: Now.ID['param1'], name: 'n_param', required: false }],
      headers: [{ $id: Now.ID['header1'], name: 'n_token', required: true }],
      version: 1
    }
  ],
  versions: [
    {
      $id: Now.ID['v1'],
      version: 1,
      active: true,
      isDefault: true
    }
  ]
})
```

---

## routes Object

Create a scripted REST resource `[sys_ws_operation]` to define HTTP methods, processing scripts, and resource-level settings.

Use the `routes` array within the **RestApi object**.

### Properties Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | — | Unique ID for the metadata object. Format: `Now.ID['route_id']`. Hashed into unique `sys_id` on build. |
| `name` | String | No | (value of `path`) | The name of the API resource, used in documentation. |
| `path` | String | No | `/` | The path of the resource relative to the base API path. Can contain path parameters like `/abc/{id}`. |
| `method` | String | No | `GET` | The HTTP method that the resource implements. **Valid values:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `script` | Script | Yes | — | The custom script that defines how the operation parses and responds to requests. Supports: (1) imported JavaScript function, (2) `Now.include('path/to/file')` reference, or (3) inline JavaScript. See [Script content formats](#script-content-formats) below. |
| `parameters` | Array | No | — | A list of query parameters `[sys_ws_query_parameter]` for the route. See [parameters and headers objects](#parameters-and-headers-objects) below. |
| `headers` | Array | No | — | A list of HTTP headers `[sys_ws_header]` for the route. See [parameters and headers objects](#parameters-and-headers-objects) below. |
| `active` | Boolean | No | `true` | Flag indicating whether the resource is used. **Valid values:** `true`, `false` |
| `shortDescription` | String | No | — | A brief description of the resource, used in documentation. |
| `consumes` | String | No | (parent RestApi value) | Media types the resource can consume. Overrides parent RestApi `consumes` for PUT/PATCH/POST. |
| `produces` | String | No | (parent RestApi value) | Media types the resource can produce. Overrides parent RestApi `produces`. |
| `requestExample` | String | No | — | A valid sample request body payload, used in documentation. |
| `enforceAcl` | Array | No | `['Scripted REST External Default']` | ACL objects or sys_ids to enforce on this resource. Set to `[]` to disable. See [Access Control List API](./ACL-API.md). |
| `authorization` | Boolean | No | `true` | Flag indicating whether users must be authenticated to access the resource. **Valid values:** `true` (authentication required), `false` (anonymous access allowed) |
| `authentication` | Boolean | No | `true` | Flag indicating whether ACLs are enforced when accessing the resource. **Valid values:** `true` (enforce ACLs), `false` (skip ACL checks) |
| `internalRole` | Boolean | No | `true` | Flag indicating whether the route requires the `snc_internal` role. Supported only if the Explicit Roles plugin (`com.glide.explicit_roles`) is enabled. **Valid values:** `true` (requires role), `false` (role not required) |
| `version` | Number | Conditional | — | **Required if `versions` array is specified in parent RestApi.** The version of the API for this route. Automatically generates a versioned URI like `/api/management/v1/table/{tableName}`. |
| `policy` | String | No | — | File protection policy. **Valid values:** `'read'` (viewable only), `'protected'` (edit control). |
| `$meta` | Object | No | — | Installation metadata. See `$meta.installMethod` (same as RestApi). |

### Script Content Formats

#### 1. Imported Function (Preferred)

Module-based handlers are the preferred pattern for route scripts. Import handler functions from `src/server/` files rather than writing inline scripts. This keeps route definitions clean, scripts testable, and enables full IDE support.

```ts
import { handler } from '../server/handler.js'

export const api = RestApi({
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/users/{id}',
      method: 'GET',
      script: handler  // Pass the function reference
    }
  ]
})
```

**Server module (`handler.js`):**

```javascript
export function handler(request, response) {
  const id = request.pathParams.id

  const gr = new GlideRecord('sys_user')
  if (gr.get(id)) {
    response.setBody({
      id: gr.sys_id.toString(),
      name: gr.name.toString(),
      email: gr.email.toString()
    })
  } else {
    response.setStatus(404)
    response.setBody({ error: 'User not found' })
  }
}
```

#### 2. Now.include() (Supports Two-Way Sync)

```ts
export const api = RestApi({
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/home/{id}',
      method: 'GET',
      script: Now.include('./handler.js')
    }
  ]
})
```

**External file (`handler.js`):**

```javascript
(function(request, response) {
  const id = request.pathParams.id
  const gr = new GlideRecord('sys_user')

  if (gr.get(id)) {
    response.setBody({
      id: gr.sys_id.toString(),
      name: gr.name.toString()
    })
  } else {
    response.setStatus(404)
  }
})(request, response)
```

#### 3. Inline Script (Simple Operations)

```ts
export const api = RestApi({
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/status',
      method: 'GET',
      script: `response.setBody({ status: 'ok', timestamp: new Date().toISOString() })`
    }
  ]
})
```

#### 4. Tagged Template Literal (Multi-Line Inline)

```ts
export const api = RestApi({
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/data',
      method: 'POST',
      script: script`
        (function(req, res) {
          const body = JSON.parse(req.body)
          const result = { received: body, timestamp: new Date() }
          res.setBody(result)
        })(request, response)
      `
    }
  ]
})
```

---

## parameters and headers objects

Create query parameters `[sys_ws_query_parameter]` and HTTP headers `[sys_ws_header]` for routes in a scripted REST API.

Query parameters control what values a requesting user can pass in the request URI. Headers specify what the API accepts and can respond with.

Use within the `routes` array in a **RestApi object**.

### Properties Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | — | Unique ID for the metadata object. Format: `Now.ID['param_id']`. |
| `name` | String | Yes | — | The name of the parameter or header, used in documentation. For query parameters, this becomes part of the request URI. For headers, this is the HTTP header name. |
| `required` | Boolean | No | `false` | Flag indicating whether the parameter or header is required. **Valid values:** `true` (required), `false` (optional) |
| `exampleValue` | String | No | — | An example of a valid value, used in API documentation. |
| `shortDescription` | String | No | — | A brief description of the parameter or header, used in documentation. |
| `$meta` | Object | No | — | Installation metadata. See `$meta.installMethod`. |

### Query Parameter Example

```ts
routes: [
  {
    $id: Now.ID['route_search'],
    path: '/incidents',
    method: 'GET',
    script: handler,
    parameters: [
      {
        $id: Now.ID['param_status'],
        name: 'status',
        required: false,
        exampleValue: 'open',
        shortDescription: 'Filter by incident status (open, in_progress, closed)'
      },
      {
        $id: Now.ID['param_limit'],
        name: 'limit',
        required: false,
        exampleValue: '10',
        shortDescription: 'Maximum number of records to return'
      }
    ]
  }
]
```

**Handler script:**

```javascript
export function handler(request, response) {
  const status = request.queryParams.status || 'open'
  const limit = parseInt(request.queryParams.limit) || 10

  const gr = new GlideRecord('incident')
  gr.addQuery('state', status)
  gr.setLimit(limit)
  gr.query()

  const results = []
  while (gr.next()) {
    results.push({
      number: gr.number.toString(),
      state: gr.state.toString(),
      short_description: gr.short_description.toString()
    })
  }

  response.setBody({ incidents: results, count: results.length })
}
```

### HTTP Header Example

```ts
routes: [
  {
    $id: Now.ID['route_auth'],
    path: '/protected/data',
    method: 'GET',
    script: handler,
    headers: [
      {
        $id: Now.ID['header_token'],
        name: 'Authorization',
        required: true,
        exampleValue: 'Bearer abc123token',
        shortDescription: 'Bearer token for API authentication'
      },
      {
        $id: Now.ID['header_version'],
        name: 'X-API-Version',
        required: false,
        exampleValue: '1.0',
        shortDescription: 'API version (defaults to latest)'
      }
    ]
  }
]
```

**Handler script:**

```javascript
export function handler(request, response) {
  const token = request.headers.authorization
  const apiVersion = request.headers['x-api-version'] || '1.0'

  // Validate token
  if (!token || !token.startsWith('Bearer ')) {
    response.setStatus(401)
    response.setBody({ error: 'Invalid or missing authorization token' })
    return
  }

  const actualToken = token.substring(7) // Remove 'Bearer '

  // Validate token and return data
  if (validateToken(actualToken)) {
    response.setBody({
      data: { message: 'Authorized', version: apiVersion }
    })
  } else {
    response.setStatus(403)
    response.setBody({ error: 'Token validation failed' })
  }
}

function validateToken(token) {
  // Implement token validation logic
  return token === 'valid_token_example'
}
```

---

## versions object

Create versions for a scripted REST API `[sys_ws_version]` to define API lifecycle and versioning strategy.

Use the `versions` array within the **RestApi object**. When versions are specified, each route must declare its `version` property.

### Properties Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | — | Unique ID for the metadata object. Format: `Now.ID['version_id']`. |
| `version` | Number | Yes | — | A version number for the REST API. Example: `1`, `2`, `3`. Clients access versioned endpoints like `/api/custom_api/v1/path` or `/api/custom_api/v2/path`. |
| `active` | Boolean | No | `true` | Flag indicating whether this API version can serve requests. **Valid values:** `true` (can serve), `false` (cannot serve) |
| `deprecated` | Boolean | No | `false` | Flag indicating whether this API version is deprecated. Resources belonging to deprecated versions can still serve requests but are marked as deprecated in documentation, signaling to clients they should migrate. **Valid values:** `true` (deprecated), `false` (current) |
| `shortDescription` | String | No | — | A brief description of the version, appears in API documentation. Useful for documenting changes: "Initial release", "Added search filters", "Deprecated in favor of v2", etc. |
| `isDefault` | Boolean | No | `false` | Flag indicating whether this version is the default version. Clients can access the default version using either the **versioned** path (`/api/custom_api/v1/path`) or the **non-versioned** path (`/api/custom_api/path`). **Valid values:** `true` (is default), `false` (not default). Only one version should have `isDefault: true`. |
| `$meta` | Object | No | — | Installation metadata. See `$meta.installMethod`. |

### Versioning Strategy

When using versions, every route must specify which `version` it belongs to. Mark one version as `isDefault: true` — clients can access it with or without the version prefix in the URI. Deprecated versions still serve requests but are marked in API documentation.

- **With versioning:** `/api/{scope_name}/v{version}/{serviceId}/{path}`
- **Without versioning:** `/api/{scope_name}/{serviceId}/{path}`

#### Single Version (Simple API)

```ts
export const api = RestApi({
  $id: Now.ID['rest_simple'],
  name: 'Simple API',
  serviceId: 'simple_api',
  routes: [
    {
      $id: Now.ID['route1'],
      path: '/data',
      method: 'GET',
      script: handler,
      version: 1
    }
  ],
  versions: [
    {
      $id: Now.ID['v1'],
      version: 1,
      active: true,
      isDefault: true,
      shortDescription: 'Initial API release'
    }
  ]
})
```

**Access:**
- Versioned: `GET /api/simple_api/v1/data`
- Non-versioned (default): `GET /api/simple_api/data`

#### Multi-Version Strategy (Backward Compatibility)

```ts
export const api = RestApi({
  $id: Now.ID['rest_multi'],
  name: 'Multi-Version API',
  serviceId: 'multi_api',
  routes: [
    {
      $id: Now.ID['route_v1'],
      path: '/incidents',
      method: 'GET',
      script: incidentsHandlerV1,
      version: 1
    },
    {
      $id: Now.ID['route_v2'],
      path: '/incidents',
      method: 'GET',
      script: incidentsHandlerV2,  // Enhanced response format
      version: 2
    }
  ],
  versions: [
    {
      $id: Now.ID['v1'],
      version: 1,
      active: true,
      isDefault: false,
      deprecated: true,
      shortDescription: 'Deprecated: use v2 for enhanced features'
    },
    {
      $id: Now.ID['v2'],
      version: 2,
      active: true,
      isDefault: true,
      shortDescription: 'Latest version: improved response format and filtering'
    }
  ]
})
```

**Access:**
- V1 (deprecated): `GET /api/multi_api/v1/incidents`
- V2 (default): `GET /api/multi_api/v2/incidents` or `GET /api/multi_api/incidents`

---

## Complete End-to-End Example

### REST API Definition (Fluent)

```ts
import { RestApi, Acl } from '@servicenow/sdk/core'
import { getUserHandler, createUserHandler, updateUserHandler } from '../server/userHandlers.js'

// Define ACL for API access
const userApiAcl = Acl({
  $id: Now.ID['acl_user_api'],
  name: 'User API ACL',
  type: 'rest_endpoint',
  script: `answer = (gs.hasRole('admin') || gs.hasRole('user_manager'))`,
  active: true,
  operations: ['execute']
})

export const userApi = RestApi({
  $id: Now.ID['rest_user_api'],
  name: 'User Management API',
  serviceId: 'user_api',
  shortDescription: 'REST API for user management and profile operations',
  consumes: 'application/json',
  produces: 'application/json',
  active: true,
  enforceAcl: [userApiAcl],

  routes: [
    // GET /api/user_api/v1/users/{id}
    {
      $id: Now.ID['route_get_user'],
      name: 'Get User',
      path: '/users/{id}',
      method: 'GET',
      script: getUserHandler,
      shortDescription: 'Retrieve a user by sys_id',
      parameters: [
        {
          $id: Now.ID['param_include'],
          name: 'include',
          required: false,
          exampleValue: 'groups,roles',
          shortDescription: 'Comma-separated fields to include in response (groups, roles, manager)'
        }
      ],
      headers: [
        {
          $id: Now.ID['header_auth'],
          name: 'Authorization',
          required: true,
          exampleValue: 'Bearer token123',
          shortDescription: 'API token for authentication'
        }
      ],
      version: 1,
      authorization: true,
      authentication: true
    },

    // POST /api/user_api/v1/users
    {
      $id: Now.ID['route_create_user'],
      name: 'Create User',
      path: '/users',
      method: 'POST',
      script: createUserHandler,
      shortDescription: 'Create a new user',
      requestExample: JSON.stringify({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        user_name: 'john.doe'
      }),
      headers: [
        {
          $id: Now.ID['header_auth2'],
          name: 'Authorization',
          required: true,
          exampleValue: 'Bearer token123',
          shortDescription: 'API token for authentication'
        },
        {
          $id: Now.ID['header_content'],
          name: 'Content-Type',
          required: true,
          exampleValue: 'application/json',
          shortDescription: 'Request body content type'
        }
      ],
      version: 1,
      authorization: true,
      authentication: true
    },

    // PUT /api/user_api/v1/users/{id}
    {
      $id: Now.ID['route_update_user'],
      name: 'Update User',
      path: '/users/{id}',
      method: 'PUT',
      script: updateUserHandler,
      shortDescription: 'Update a user record',
      version: 1,
      authorization: true,
      authentication: true
    }
  ],

  versions: [
    {
      $id: Now.ID['v1_user'],
      version: 1,
      active: true,
      isDefault: true,
      shortDescription: 'Initial release: get, create, update user operations'
    }
  ]
})
```

### Handler Scripts

**`userHandlers.js`:**

```javascript
export function getUserHandler(request, response) {
  const userId = request.pathParams.id
  const includeParam = request.queryParams.include
  const includes = includeParam ? includeParam.split(',') : []

  const gr = new GlideRecord('sys_user')
  if (!gr.get(userId)) {
    response.setStatus(404)
    response.setBody({ error: 'User not found' })
    return
  }

  const userData = {
    sys_id: gr.sys_id.toString(),
    first_name: gr.first_name.toString(),
    last_name: gr.last_name.toString(),
    email: gr.email.toString(),
    user_name: gr.user_name.toString(),
    active: gr.active.toString()
  }

  // Include additional data if requested
  if (includes.includes('groups')) {
    const groupMembers = []
    const memberGr = new GlideRecord('sys_user_grmember')
    memberGr.addQuery('user', userId)
    memberGr.query()
    while (memberGr.next()) {
      groupMembers.push(memberGr.group.name.toString())
    }
    userData.groups = groupMembers
  }

  if (includes.includes('manager') && gr.manager.sys_id) {
    userData.manager = {
      sys_id: gr.manager.sys_id.toString(),
      name: gr.manager.name.toString()
    }
  }

  response.setBody(userData)
}

export function createUserHandler(request, response) {
  let body = {}
  try {
    body = JSON.parse(request.body)
  } catch (e) {
    response.setStatus(400)
    response.setBody({ error: 'Invalid JSON in request body' })
    return
  }

  const requiredFields = ['first_name', 'last_name', 'email', 'user_name']
  const missingFields = requiredFields.filter(field => !body[field])

  if (missingFields.length > 0) {
    response.setStatus(400)
    response.setBody({ error: 'Missing required fields: ' + missingFields.join(', ') })
    return
  }

  const gr = new GlideRecord('sys_user')
  gr.setValue('first_name', body.first_name)
  gr.setValue('last_name', body.last_name)
  gr.setValue('email', body.email)
  gr.setValue('user_name', body.user_name)
  gr.setValue('active', body.active !== false)

  const userId = gr.insert()

  if (!userId) {
    response.setStatus(500)
    response.setBody({ error: 'Failed to create user' })
    return
  }

  response.setStatus(201)
  response.setBody({
    sys_id: userId,
    user_name: body.user_name,
    message: 'User created successfully'
  })
}

export function updateUserHandler(request, response) {
  const userId = request.pathParams.id

  let body = {}
  try {
    body = JSON.parse(request.body)
  } catch (e) {
    response.setStatus(400)
    response.setBody({ error: 'Invalid JSON in request body' })
    return
  }

  const gr = new GlideRecord('sys_user')
  if (!gr.get(userId)) {
    response.setStatus(404)
    response.setBody({ error: 'User not found' })
    return
  }

  // Update allowed fields
  if (body.first_name) gr.setValue('first_name', body.first_name)
  if (body.last_name) gr.setValue('last_name', body.last_name)
  if (body.email) gr.setValue('email', body.email)
  if (body.active !== undefined) gr.setValue('active', body.active)

  gr.update()

  response.setBody({
    sys_id: userId,
    message: 'User updated successfully'
  })
}
```

### Request/Response Examples

**Get User:**

```bash
curl -X GET "https://instance.service-now.com/api/user_api/v1/users/sys_id_123?include=groups,manager" \
  -H "Authorization: Bearer token123"
```

**Response (200):**

```json
{
  "sys_id": "sys_id_123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "user_name": "john.doe",
  "active": "true",
  "groups": ["Service Desk", "IT"],
  "manager": {
    "sys_id": "manager_sys_id",
    "name": "Jane Smith"
  }
}
```

**Create User:**

```bash
curl -X POST "https://instance.service-now.com/api/user_api/v1/users" \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "user_name": "jane.smith"
  }'
```

**Response (201):**

```json
{
  "sys_id": "new_sys_id_456",
  "user_name": "jane.smith",
  "message": "User created successfully"
}
```

---

## Best Practices

1. **Always enforce ACLs** — Use `enforceAcl` array to control who can call your API. Start with restrictive roles.
2. **Validate input** — Check required parameters, parse JSON safely, validate data types in handler scripts.
3. **Use versioning** — Deploy multiple versions simultaneously during transitions; mark old versions as deprecated before retiring.
4. **Document endpoints** — Provide `shortDescription`, `requestExample`, example values for parameters to auto-generate OpenAPI docs.
5. **Error handling** — Return appropriate HTTP status codes (400 for bad requests, 401/403 for auth, 404 for not found, 500 for server errors).
6. **Use Now.include() for reusable logic** — Separate complex business logic into external `.js` files that can be called from multiple routes.
7. **Set the default version** — Use `isDefault: true` on one version so clients can access it without specifying a version number.
8. **Limit response scope** — Return only the data clients need; use query parameters (e.g., `?include=groups,manager`) to control response size.

---

## Related Concepts

- **[Script Include API](./SCRIPT-INCLUDE-API.md)** — Server-side functions callable from client scripts via GlideAjax
- **[Access Control List API](./ACL-API.md)** — Define who can execute REST endpoints
- **[CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md)** — Full GlideAjax and REST implementation patterns
- **[API-REFERENCE.md](./API-REFERENCE.md)** — Fluent language constructs (`Now.ID`, `Now.ref`, `Now.include`)

For general information about REST services in ServiceNow, see [Scripted REST APIs](https://docs.servicenow.com/bundle/xanadu-application-development/page/build/applications/concept_scripted_rest_apis.html) in the official documentation.
