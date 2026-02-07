---
name: servicenow-http-integrations
description: Establish secure outbound integration connections using REST, SOAP, and HTTP protocols. Covers RESTMessageV2, OAuth token management, request signing, and response parsing. Use when integrating with external systems, implementing API clients, consuming REST/SOAP services, or managing OAuth authentication.
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
var oauthClient = new sn_auth.GlideOAuthClient();
oauthClient.setCredentialId('5b61c16f73533300f662cff8faf6a74b');

var token = oauthClient.getNewAccessToken();
var accessToken = token.getAccessToken();
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

## HTTP APIs

| API | Use Case |
|-----|----------|
| GlideHTTPRequest | Basic HTTP client operations |
| RESTMessageV2 | Outbound REST messages with full control |
| SOAPMessageV2 | SOAP web service calls |
| GlideOAuthClient | OAuth token retrieval and refresh |
| RequestAuthAPI | Cryptographic request signing |

## Best practices

- Always check response status codes before parsing
- Use RESTMessageV2 for complex REST integrations
- Handle OAuth token expiration and refresh
- Validate SSL certificates in production
- Use SOAP messages for legacy integrations
- Test timeouts on slow connections
- Encrypt sensitive credentials using standard providers

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

## Reference

For complete API reference, examples, and authentication patterns, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
