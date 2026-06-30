---
name: servicenow-http-integrations
context: fork
user-invocable: false
description: Establish outbound HTTP connections to external systems using REST, SOAP, and HTTP protocols. Covers RESTMessageV2, SOAPMessageV2, OAuth token retrieval as part of API flows, and response parsing. Use when making outbound API calls to external or third-party systems, consuming REST/SOAP services, or handling full HTTP request/response flows. For encrypting data, managing cryptographic keys, certificate operations, or security primitives, use the servicenow-server-security skill. Trigger this skill whenever the user needs to call an external API, integrate with a third-party service, make outbound HTTP requests from ServiceNow, or consume REST or SOAP web services.
last_verified: "2026-05-18"
---

# HTTP Integrations (REST/SOAP)

Use for outbound HTTP integrations from ServiceNow to external systems. For Fluent SDK REST metadata, use `now-sdk explain --list rest`, `now-sdk explain restapi-api --format raw`, and `now-sdk explain scripted-rest-api-guide --format raw`.

## Choosing Your Integration API

| Requirement | Use | Rationale |
|-------------|-----|-----------|
| External REST/JSON API | `sn_ws.RESTMessageV2` | Standard outbound REST support |
| External SOAP/WSDL service | `sn_ws.SOAPMessageV2` | SOAP envelope/WSDL support |
| OAuth token as part of outbound call | `sn_auth.GlideOAuthClient` | Platform token lifecycle |
| Request signing/HMAC/AWS-style auth | `sn_auth.RequestAuthAPI` / server-security skill | Credential-backed signing |
| Internal browser-to-server call | GlideAjax | Do not use outbound HTTP for internal form calls |
| New SDK REST metadata | Fluent SDK | Verify with `now-sdk explain --list rest` |

## Critical Guardrails

- Use named REST/SOAP Message records where possible; avoid hardcoded endpoints so environments can differ safely.
- Always set explicit HTTP timeouts for outbound calls.
- Always inspect `getStatusCode()` before parsing response bodies.
- Parse JSON/XML only after checking status and content type; handle malformed responses.
- Use HTTPS and validate SSL certificates in production; do not disable certificate validation.
- Store credentials in credential records/providers; never hardcode tokens, passwords, API keys, or Authorization headers.
- Refresh OAuth tokens before expiration and handle token acquisition failures.
- Implement bounded retries with exponential backoff only for transient errors (429 and 5xx); do not retry permanent 4xx errors blindly.
- Validate and encode user-supplied path/query values before building requests.
- Log integration failures with sanitized details; never log secrets or full sensitive payloads.
- Use background/async execution for slow calls that should not block a user transaction.
- Test integrations on sub-production before production deployment.

## Quick Patterns

```javascript
var rest = new sn_ws.RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');
rest.setHttpTimeout(30000);
var response = rest.execute();
var status = response.getStatusCode();
if (status >= 200 && status < 300) {
    var data = JSON.parse(response.getBody());
} else {
    gs.error('API call failed with status ' + status);
}
```

```javascript
var oAuthClient = new sn_auth.GlideOAuthClient();
var token = oAuthClient.getToken('requestor_profile_sys_id', 'entity_profile_sys_id');
var accessToken = token.getAccessToken();
```

## Response and Error Handling

| Status | Handling |
|--------|----------|
| 2xx | Parse according to content type and return success |
| 401/403 | Check credentials/scopes; do not retry indefinitely |
| 404 | Treat as missing resource unless API contract says otherwise |
| 429 | Retry later with bounded backoff if safe |
| 5xx | Retry bounded times, then log/raise failure |
| Network/timeout exception | Catch, log sanitized context, and fail gracefully |

## Key APIs

| API | Purpose |
|-----|---------|
| `sn_ws.RESTMessageV2` | Outbound REST calls |
| `sn_ws.SOAPMessageV2` | SOAP web service calls |
| `sn_auth.GlideOAuthClient` | OAuth token retrieval and refresh |
| `sn_auth.RequestAuthAPI` | Credential-backed request signing |
| `sn_auth.HttpRequestData` | Request data for signing |
| `GlideHTTPRequest` | Simple HTTP; prefer RESTMessageV2 for production |

## Reference

- Fluent SDK REST metadata: `now-sdk explain --list rest`, `now-sdk explain restapi-api --format raw`, and `now-sdk explain scripted-rest-api-guide --format raw`.
- Classic RESTMessageV2, SOAPMessageV2, OAuth, response parsing, retry, and HTTP APIs: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
