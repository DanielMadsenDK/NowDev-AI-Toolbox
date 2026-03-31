# Classic HTTP Integrations (RESTMessageV2/SOAP)

Patterns for outbound HTTP, REST, and SOAP integrations using ServiceNow's classic APIs.

## Table of Contents

1. [REST API Calls](#rest-api-calls)
2. [OAuth Token Management](#oauth-token-management)
3. [SOAP Web Services](#soap-web-services)
4. [Error Handling & Retry](#error-handling--retry)
5. [Best Practices](#best-practices)

---

## REST API Calls

### Basic REST Request

```javascript
var rest = new sn_ws.RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');
rest.setQueryParameter('limit', '10');
rest.setHttpTimeout(30000);

var response = rest.execute();
var statusCode = response.getStatusCode();

if (statusCode === 200) {
    var body = response.getBody();
    var data = JSON.parse(body);
    gs.info('Users retrieved: ' + data.length);
} else {
    gs.error('API call failed with status: ' + statusCode);
}
```

### POST Request with Body

```javascript
var rest = new sn_ws.RESTMessageV2('ExternalAPI', 'POST');
rest.setEndpoint('https://api.example.com/v1/incidents');
rest.setRequestHeader('Content-Type', 'application/json');
rest.setHttpTimeout(30000);

var payload = {
    title: 'New Incident',
    description: 'Created from ServiceNow',
    priority: 1
};

rest.setRequestBody(JSON.stringify(payload));
var response = rest.execute();

if (response.getStatusCode() === 201) {
    var result = JSON.parse(response.getBody());
    gs.info('Incident created: ' + result.id);
} else {
    gs.error('Failed to create incident: ' + response.getStatusCode());
}
```

### Query Parameters and Headers

```javascript
var rest = new sn_ws.RESTMessageV2('APIIntegration', 'GET');
rest.setEndpoint('https://api.example.com/v2/search');

// Add query parameters
rest.setQueryParameter('q', 'ServiceNow');
rest.setQueryParameter('type', 'incident');
rest.setQueryParameter('status', 'open');

// Add request headers
rest.setRequestHeader('Authorization', 'Bearer YOUR_TOKEN');
rest.setRequestHeader('X-API-Key', gs.getProperty('api_key_property'));
rest.setRequestHeader('Accept', 'application/json');

var response = rest.execute();
var contentType = response.getHeader('Content-Type');

gs.info('Response Content-Type: ' + contentType);
```

---

## OAuth Token Management

### Get OAuth Access Token

```javascript
var oauthClient = new sn_auth.GlideOAuthClient();
oauthClient.setCredentialId('credential_sys_id_here');

try {
    var token = oauthClient.getNewAccessToken();
    var accessToken = token.getAccessToken();
    var expiresIn = token.getExpiresIn();

    gs.info('Token retrieved, expires in: ' + expiresIn + ' seconds');

    // Use token in API call
    var rest = new sn_ws.RESTMessageV2('ProtectedAPI', 'GET');
    rest.setEndpoint('https://api.example.com/v1/data');
    rest.setRequestHeader('Authorization', 'Bearer ' + accessToken);

    var response = rest.execute();
    return response.getBody();
} catch (error) {
    gs.error('OAuth token retrieval failed: ' + error.message);
    return null;
}
```

### Refresh OAuth Token

```javascript
function getValidOAuthToken(credentialId) {
    var oauthClient = new sn_auth.GlideOAuthClient();
    oauthClient.setCredentialId(credentialId);

    try {
        var token = oauthClient.getNewAccessToken();

        return {
            accessToken: token.getAccessToken(),
            refreshToken: token.getRefreshToken(),
            expiresIn: token.getExpiresIn(),
            tokenType: token.getTokenType()
        };
    } catch (error) {
        gs.error('Failed to get OAuth token: ' + error.message);
        return null;
    }
}
```

---

## SOAP Web Services

### Call SOAP Service

```javascript
var soap = new sn_ws.SOAPMessageV2('SoapIntegrationName', 'GetUser');
soap.setEndpoint('https://api.example.com/soap/service');

// Set SOAP parameters
soap.setParameter('userId', '12345');
soap.setParameter('includeDetails', 'true');

soap.setHttpTimeout(30000);

try {
    var response = soap.execute();
    var responseBody = response.getBody();

    // Parse SOAP response
    var xmlDocument = new XMLDocument();
    xmlDocument.parseXML(responseBody);

    // Extract data from XML
    var user = xmlDocument.getDocumentElement().getFirstChild();
    gs.info('User retrieved: ' + user.getAttribute('name'));

    return responseBody;
} catch (error) {
    gs.error('SOAP call failed: ' + error.message);
    return null;
}
```

---

## Error Handling & Retry

### Robust Request with Retry Logic

```javascript
function callExternalAPI(endpoint, method, payload, maxRetries) {
    var retries = 0;
    var maxRetries = maxRetries || 3;

    while (retries < maxRetries) {
        try {
            var rest = new sn_ws.RESTMessageV2('ExternalAPI', method);
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
                return {
                    success: true,
                    status: statusCode,
                    body: response.getBody()
                };
            }

            // Retry on server error
            if (statusCode >= 500) {
                retries++;
                gs.warn('Server error (' + statusCode + '), retrying...');
                java.lang.Thread.sleep(2000 * retries); // Exponential backoff
                continue;
            }

            // Client error - don't retry
            gs.error('Client error (' + statusCode + '): ' + response.getBody());
            return {
                success: false,
                status: statusCode,
                body: response.getBody()
            };

        } catch (error) {
            retries++;
            gs.error('Attempt ' + retries + ' failed: ' + error.message);

            if (retries >= maxRetries) {
                return {
                    success: false,
                    error: error.message
                };
            }

            java.lang.Thread.sleep(2000 * retries);
        }
    }

    return {
        success: false,
        error: 'Max retries exceeded'
    };
}
```

---

## Best Practices

✓ **Always check status codes** - Before parsing responses
✓ **Handle timeouts** - Set appropriate HTTP timeouts
✓ **Validate SSL** - In production environments
✓ **Use HTTPS** - Never send sensitive data over HTTP
✓ **Implement retry logic** - For transient failures
✓ **Log requests** - For debugging and audit trails
✓ **Parse errors gracefully** - Unexpected response format
✓ **Store credentials securely** - Use sys_password table
✓ **Test on sub-production** - Before production deployment
✓ **Document API contracts** - External API specifications

---

## Key APIs

| API | Purpose |
|-----|---------|
| `RESTMessageV2` | Outbound REST API calls |
| `SOAPMessageV2` | SOAP web service calls |
| `GlideOAuthClient` | OAuth token retrieval |
| `GlideHTTPRequest` | Basic HTTP operations |
| `XMLDocument` | XML parsing for SOAP |

---

## When to Use Classic HTTP Integrations

- ✓ Existing ServiceNow instances
- ✓ REST/SOAP API integrations
- ✓ OAuth authentication flows
- ✓ Third-party system connections
- ✓ Legacy API compatibility

For SDK-based projects, see [FLUENT.md](FLUENT.md) for modern patterns.
