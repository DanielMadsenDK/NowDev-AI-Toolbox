# Fluent SDK HTTP Integrations

Patterns for outbound HTTP integrations in ServiceNow SDK projects.

## Key Fluent Language Constructs

When building HTTP integrations with Fluent SDK, you'll use these language constructs:

- **`Now.ID['api_id']`** — Assign a human-readable ID to REST API definitions
- **`Now.include('./script.server.js')`** — Link to external JavaScript containing integration logic with two-way sync
- **`Now.ref('sys_user', { name: 'admin' })`** — Reference users or external system records

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

## Overview

HTTP integrations in the Fluent SDK use similar underlying mechanisms to the classic approach but with modern TypeScript syntax and improved type safety.

> **Critical: Import rules differ by file type**
> - **`.server.js` files used via `Now.include()`** (Script Include context): `RESTMessageV2`, `SOAPMessageV2`, `GlideOAuthClient`, `GlideRecord`, `gs` are **globally available — no import needed**. These run in Script Include execution context.
> - **TypeScript module files (`.ts`) used in BusinessRule, RestApi routes, etc.**: ALL Glide APIs must be **explicitly imported** from `@servicenow/glide` namespaces. Use `import { RESTMessageV2 } from '@servicenow/glide/sn_ws'`, `import { GlideOAuthClient } from '@servicenow/glide/sn_auth'`.

The examples in this file use `.server.js` handler files (Script Include context via `Now.include()`). For TypeScript module files, add the corresponding imports.

---

## REST API Calls

### Basic REST Request with SDK

```javascript
// Inside your .server.js handler file
var rest = new RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');
rest.setQueryParameter('limit', '10');
rest.setHttpTimeout(30000);

var response = rest.execute();
var statusCode = response.getStatusCode();

if (statusCode == 200) {
    var body = response.getBody();
    var data = JSON.parse(body);
    gs.info('Users retrieved: ' + data.length);
} else {
    gs.error('API call failed with status: ' + statusCode);
}
```

### POST Request with JSON Payload

```javascript
// Inside your .server.js handler file
function createIncident(payload) {
    var rest = new RESTMessageV2('ExternalAPI', 'POST');
    rest.setEndpoint('https://api.example.com/v1/incidents');
    rest.setRequestHeader('Content-Type', 'application/json');
    rest.setHttpTimeout(30000);
    rest.setRequestBody(JSON.stringify(payload));

    try {
        var response = rest.execute();
        var statusCode = response.getStatusCode();

        if (statusCode == 201) {
            var result = JSON.parse(response.getBody());
            gs.info('Incident created: ' + result.id);
            return result;
        } else {
            gs.error('Failed to create incident: ' + statusCode);
            return null;
        }
    } catch (e) {
        gs.error('Error: ' + e.message);
        return null;
    }
}
```

---

## OAuth Token Management

### Get OAuth Token with Error Handling

```javascript
// Inside your .server.js handler file — GlideOAuthClient is a global API
function getOAuthToken(requestorProfileId, entityProfileId) {
    try {
        var oAuthClient = new GlideOAuthClient();

        // getToken(requestorProfileId, entityProfileId)
        var token = oAuthClient.getToken(requestorProfileId, entityProfileId);
        var accessToken = token.getAccessToken();
        var expiresIn = token.getExpiresIn();

        gs.info('Token retrieved, expires in: ' + expiresIn + ' seconds');
        return accessToken;
    } catch (error) {
        gs.error(`OAuth token retrieval failed: ${error.message}`);
        return null;
    }
}

function callProtectedAPI(requestorProfileId, entityProfileId, endpoint) {
    var token = getOAuthToken(requestorProfileId, entityProfileId);

    if (!token) {
        return null;
    }

    var rest = new RESTMessageV2('ProtectedAPI', 'GET');
    rest.setEndpoint(endpoint);
    rest.setRequestHeader('Authorization', 'Bearer ' + token);

    var response = rest.execute();
    return response.getBody();
}
```

---

## SOAP Integration

### Call SOAP Service

```javascript
// Inside your .server.js handler file \u2014 SOAPMessageV2 and XMLDocument are global APIs
function callSoapService(userId) {
    try {
        var soap = new SOAPMessageV2('SoapIntegrationName', 'GetUser');
        soap.setEndpoint('https://api.example.com/soap/service');

        soap.setParameter('userId', userId);
        soap.setParameter('includeDetails', 'true');
        soap.setHttpTimeout(30000);

        var response = soap.execute();
        var responseBody = response.getBody();

        // Parse SOAP response
        var xmlDocument = new XMLDocument();
        xmlDocument.parseXML(responseBody);

        var user = xmlDocument.getDocumentElement().getFirstChild();
        gs.info('User retrieved: ' + user.getAttribute('name'));

        return responseBody;
    } catch (e) {
        gs.error('SOAP call failed: ' + e.message);
        return null;
    }
}
```

---

## Robust Error Handling with Retry

```javascript
// Inside your .server.js handler file
function callExternalAPIWithRetry(endpoint, method, payload, maxRetries) {
    maxRetries = maxRetries || 3;
    var retries = 0;

    while (retries < maxRetries) {
        try {
            var rest = new RESTMessageV2('ExternalAPI', method);
            rest.setEndpoint(endpoint);
            rest.setRequestHeader('Content-Type', 'application/json');
            rest.setHttpTimeout(30000);

            if (payload) {
                rest.setRequestBody(JSON.stringify(payload));
            }

            var response = rest.execute();
            var statusCode = response.getStatusCode();

            // Success
            if (statusCode >= 200 && statusCode < 300) {
                gs.info('API call successful');
                return { success: true, status: statusCode, body: response.getBody() };
            }

            // Retry on server error
            if (statusCode >= 500) {
                retries++;
                gs.warn('Server error (' + statusCode + '), retrying...');
                continue;
            }

            // Client error - don't retry
            gs.error('Client error (' + statusCode + '): ' + response.getBody());
            return { success: false, status: statusCode, body: response.getBody() };

        } catch (e) {
            retries++;
            gs.error('Attempt ' + retries + ' failed: ' + e.message);

            if (retries >= maxRetries) {
                return { success: false, error: e.message };
            }
        }
    }

    return { success: false, error: 'Max retries exceeded' };
}
```

> **Note:** ServiceNow's script engine (Rhino) does not support `async/await` or `Promise`. Use synchronous patterns with loops for retry logic.

---

## Best Practices

✓ **Always check status codes** - Before processing responses
✓ **Implement retry logic** - For transient 5xx failures
✓ **No async/await in handlers** - ServiceNow Rhino engine is synchronous
✓ **Handle errors gracefully** - With try-catch
✓ **Log all requests** - For debugging and audit
✓ **Validate SSL certificates** - In production
✓ **Store credentials securely** — Use sys_password table or Connection & Credential Aliases
✓ **Test thoroughly** — On sub-production first
✓ **Document API contracts** — External specifications
✓ **In `.server.js` (Script Include context)** — `RESTMessageV2`, `SOAPMessageV2`, `GlideOAuthClient` are global (no import needed)
✓ **In TypeScript module files** — Import from `@servicenow/glide/sn_ws` and `@servicenow/glide/sn_auth`

---

## Key APIs

| API | Purpose |
|-----|---------|
| `RESTMessageV2` | Outbound REST API calls |
| `SOAPMessageV2` | SOAP web service calls |
| `GlideOAuthClient` | OAuth token retrieval |
| `XMLDocument` | XML parsing for SOAP responses |

---

## Comparison: Classic vs Fluent

| Aspect | Classic | Fluent |
|--------|---------|--------|
| API | RESTMessageV2 | RESTMessageV2 (same) |
| Syntax | JavaScript | TypeScript |
| Error handling | try-catch (optional) | try-catch (recommended) |
| Types | Untyped | Full TypeScript support |
| Testing | Manual | Automated possible |
| IDE support | Limited | Full intellisense |

---

## When to Use Fluent SDK HTTP Integrations

- ✓ New SDK projects
- ✓ TypeScript-based development
- ✓ Need type-safe API interactions
- ✓ Full-stack SDK applications
- ✓ Automated testing with CI/CD

For instance-based integrations, see [CLASSIC.md](CLASSIC.md) for traditional patterns.
