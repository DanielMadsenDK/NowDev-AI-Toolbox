---
name: servicenow-http-integrations
context: fork
user-invocable: false
description: Establish outbound HTTP connections to external systems using REST, SOAP, and HTTP protocols. Covers RESTMessageV2, SOAPMessageV2, OAuth token retrieval as part of API flows, and response parsing. Use when making outbound API calls to external or third-party systems, consuming REST/SOAP services, or handling full HTTP request/response flows. For encrypting data, managing cryptographic keys, certificate operations, or security primitives, use the servicenow-server-security skill. Trigger this skill whenever the user needs to call an external API, integrate with a third-party service, make outbound HTTP requests from ServiceNow, or consume REST or SOAP web services.
last_verified: "2026-05-18"
---

# HTTP Integrations (REST/SOAP)

## Quick start

**Outbound REST requests**:

```javascript
var rest = new sn_ws.RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');
rest.setHttpTimeout(30000);

var response = rest.execute();
var responseBody = response.getBody();
var status = response.getStatusCode();

if (status === 200) {
    var data = JSON.parse(responseBody);
}
```

**OAuth token management**:

```javascript
// Retrieve token using OAuth Requestor Profile and Entity Profile sys_ids
var oAuthClient = new sn_auth.GlideOAuthClient();
var token = oAuthClient.getToken('requestor_profile_sys_id', 'entity_profile_sys_id');
var accessToken = token.getAccessToken();
var expiresIn = token.getExpiresIn();
var refreshToken = token.getRefreshToken();
```

**Secure request signing**:

```javascript
var request = new sn_auth.HttpRequestData();
request.setMethod('POST');
request.setEndpoint('https://api.example.com/data');
request.setHeader('Content-Type', 'application/json');
request.setBody('{"key":"value"}');

var credential = new sn_auth.AuthCredential();
var authRequest = new sn_auth.RequestAuthAPI().generateAuth(credential, request);
var authedData = authRequest.getAuthorizedRequest();
```

## Decision Matrix: Which Integration Approach to Use

| Requirement | GlideAjax | RESTMessageV2 | SOAPMessageV2 |
|------------|-----------|---------------|---------------|
| Internal ServiceNow app calling its own server logic | **Best** | Overkill | No |
| External REST API (JSON) | No | **Best** | No |
| External SOAP/WSDL legacy service | No | No | **Best** |
| Mobile or non-browser client | No | **Required** | Possible |
| OpenAPI documentation needed | No | Supported | No |
| ServiceNow native session security | Built-in | Manual | Manual |

**When to use this skill vs. adjacent skills:**

| Need | Skill to use |
|------|--------------|
| Call an external REST or SOAP API | **This skill** |
| OAuth token retrieval as part of an outbound API call | **This skill** (GlideOAuthClient) |
| Encrypt/decrypt data, manage certificates, HMAC/signing primitives | `servicenow-server-security` |
| ServiceNow internal client→server communication (GlideAjax) | `servicenow-client-scripts` |

## HTTP APIs

| API | Use Case |
|-----|----------|
| `sn_ws.RESTMessageV2` | Outbound REST — full control over headers, body, auth |
| `sn_ws.SOAPMessageV2` | SOAP web service calls |
| `sn_auth.GlideOAuthClient` | OAuth token retrieval and refresh |
| `sn_auth.RequestAuthAPI` | Cryptographic request signing (HMAC, etc.) |
| `GlideHTTPRequest` | Simple HTTP; prefer RESTMessageV2 for production use |

## Best practices

| Practice | Why it matters |
|----------|----------------|
| Always check `getStatusCode()` before parsing body | Non-200 responses can return non-JSON |
| Use named REST Message records (not hardcoded URLs) | Keeps endpoints configurable per environment |
| Set `setHttpTimeout()` explicitly | Default timeout can be too long for UI-blocking calls |
| Handle OAuth token expiration and refresh | Tokens expire; build refresh logic or use GlideOAuthClient |
| Validate SSL certificates in production | Disabling SSL validation is a security risk |
| Use `sn_ws.SOAPMessageV2` for WSDL-based services | Handles SOAP envelope, namespace, and WSDL parsing |
| Implement retry logic for transient failures | Network errors are common; exponential backoff is safer |
| Log integration errors with `gs.error()` | Required for audit trail and debugging in production |

## Response handling

```javascript
if (response.getStatusCode() === 200) {
    var body = response.getBody();
    var contentType = response.getHeader('Content-Type');
    
    if (contentType.indexOf('application/json') >= 0) {
        var data = JSON.parse(body);
    }
} else {
    gs.error('API call failed: ' + response.getStatusCode());
}
```

## Detailed Patterns

Choose the pattern that matches your implementation context:

- **[CLASSIC.md](./CLASSIC.md)** — Instance-based HTTP integrations (RESTMessageV2, SOAPMessageV2)
  - REST API calls with query parameters and headers
  - OAuth token management and refresh
  - SOAP web service integration
  - Error handling and retry logic

- Fluent SDK HTTP or REST metadata — use `now-sdk explain --list rest` and route implementation to the appropriate Fluent specialist.

- **[EXAMPLES.md](./EXAMPLES.md)** — Quick reference showing both approaches

## Reference

For complete API reference, examples, and authentication patterns, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
