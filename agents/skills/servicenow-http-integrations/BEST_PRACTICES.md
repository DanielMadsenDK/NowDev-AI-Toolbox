# Best Practices — HTTP Integrations

## REST vs SOAP Selection

### Use REST When
- Modern APIs (most current APIs)
- JSON request/response format
- Lightweight, simple integrations
- Public APIs (AWS, GitHub, Slack, etc.)
- RESTful design principles

### Use SOAP When
- Legacy system integrations
- XML required format
- WSDL contract exists
- Enterprise data exchanges  
- Strict schema validation needed

## RESTMessageV2 Advanced Usage

### Connection Pooling
```javascript
// RESTMessageV2 automatically pools connections
// Reuse same REST message instance when possible
var rest = new sn_ws.RESTMessageV2('MyIntegration', 'GET');
// Instance is reused, improves performance
```

### Timeout Configuration
```javascript
var rest = new sn_ws.RESTMessageV2('endpoint', 'POST');
rest.setHttpTimeout(30000); // 30 seconds
rest.setSocketTimeout(15000); // 15 seconds

// Always set timeouts to handle slow networks
var response = rest.execute();
```

### Header Management
```javascript
var rest = new sn_ws.RESTMessageV2('API', 'GET');

// Set common headers
rest.setHeader('User-Agent', 'ServiceNow/1.0');
rest.setHeader('Accept', 'application/json');
rest.setHeader('Authorization', 'Bearer ' + token);

// Custom headers
rest.setHeader('X-Custom-Header', 'custom-value');
```

## OAuth 2.0 Implementation

### Token Lifecycle
```javascript
// Initial token request
var oauth = new sn_auth.GlideOAuthClient();
oauth.setCredentialId('your_credential_sys_id');
oauth.setTokenEndpoint('https://provider.com/oauth/token');

// Get access token
var token = oauth.getNewAccessToken();
var accessToken = token.getAccessToken();
var expiresIn = token.getExpiresIn(); // Seconds

// Token refresh
if (token.isExpired()) {
    var refreshed = oauth.refreshAccessToken(token.getRefreshToken());
    accessToken = refreshed.getAccessToken();
}
```

### OAuth Error Handling
```javascript
try {
    var token = oauth.getNewAccessToken();
    if (!token) {
        gs.error('OAuth token acquisition failed');
        return null;
    }
} catch (e) {
    gs.error('OAuth exception: ' + e.getMessage());
    // Handle: retry, use cached token, notify admin
}
```

## Request Signing (AWS, Custom)

### AWS Signature Version 4
```javascript
// Use AuthCredential with AWS configured
var request = new sn_auth.HttpRequestData();
request.setMethod('GET');
request.setEndpoint('https://api.amazonaws.com/v1/resources');

var credential = new sn_auth.AuthCredential();
credential.setCredentialId('aws_credential_sys_id');

var authApi = new sn_auth.RequestAuthAPI();
var signedRequest = authApi.generateAuth(credential, request);
var authedData = signedRequest.getAuthorizedRequest();

// Now authedData has Authorization header with AWS signature
```

## Response Parsing

### JSON Response Handling
```javascript
var rest = new sn_ws.RESTMessageV2('API', 'GET');
rest.setEndpoint('https://api.example.com/users');
var response = rest.execute();

if (response.getStatusCode() === 200) {
    var body = response.getBody();
    var data = JSON.parse(body);
    
    // Iterate array response
    if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
            var user = data[i];
            gs.info(user.name);
        }
    }
}
```

### XML Response Handling
```javascript
var rest = new sn_ws.RESTMessageV2('SOAPIntegration', 'POST');
var response = rest.execute();

if (response.getStatusCode() === 200) {
    var xmlBody = response.getBody();
    
    // Parse with XMLUtil
    var xml = new GlideXMLUtil();
    if (!xml.isValid(xmlBody)) {
        gs.error('Invalid XML response');
        return;
    }
    
    // Extract values using path
    var result = new GlideJsonPath(xmlBody).query('root/status');
}
```

## Error Handling Best Practices

```javascript
function callExternalAPI() {
    try {
        var rest = new sn_ws.RESTMessageV2('ExternalService', 'GET');
        rest.setEndpoint('https://api.example.com/data');
        rest.setHttpTimeout(10000);
        
        var response = rest.execute();
        var statusCode = response.getStatusCode();
        
        // Handle HTTP status codes
        switch(statusCode) {
            case 200:
                return handleSuccess(response);
            case 401:
                gs.error('Authentication failed - check credentials');
                return null;
            case 403:
                gs.error('Access denied - insufficient permissions');
                return null;
            case 404:
                gs.error('Resource not found');
                return null;
            case 429:
                gs.warn('Rate limited - retry after delay');
                return null;
            case 500:
                gs.error('Server error - retry later');
                return null;
            default:
                gs.error('Unexpected status: ' + statusCode);
                return null;
        }
    } catch (e) {
        gs.error('Integration exception: ' + e.getMessage());
        return null;
    }
}

function handleSuccess(response) {
    try {
        var data = JSON.parse(response.getBody());
        return data;
    } catch (e) {
        gs.error('Failed to parse response: ' + e.getMessage());
        return null;
    }
}
```

## Security Best Practices

### Never Expose Credentials
```javascript
// ✗ WRONG - credentials visible
var rest = new sn_ws.RESTMessageV2('API', 'GET');
rest.setHeader('Authentication', 'Bearer sk-1234567890abcdef');

// ✓ CORRECT - use credential store
var credential = new sn_cc.StandardCredentialsProvider()
    .getAuthCredentialByID('sys_id');
// Credential provider handles auth securely
```

### SSL Certificate Validation
```javascript
// In production, always validate certificates
var rest = new sn_ws.RESTMessageV2('endpoint', 'GET');
rest.setEndpoint('https://api.example.com/'); // HTTPS required

// MID Server REST calls also validate by default
// Trust store configured by admin
```

### Input Validation
```javascript
function callAPI(userId) {
    // Validate input before building request
    if (!userId || userId.length === 0) {
        gs.error('Invalid user ID');
        return null;
    }
    
    // Encode parameters
    var encoded = encodeURIComponent(userId);
    var rest = new sn_ws.RESTMessageV2('API', 'GET');
    rest.setEndpoint('https://api.example.com/users/' + encoded);
    
    return rest.execute();
}
```

## Retry Logic

```javascript
function callWithRetry(maxRetries) {
    maxRetries = maxRetries || 3;
    var delay = 1000; // 1 second
    
    for (var attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            var response = executeAPICall();
            
            if (response.getStatusCode() === 200) {
                return response;
            }
            
            if (response.getStatusCode() === 429 || 
                response.getStatusCode() >= 500) {
                // Retry on rate limit or server error
                gs.info('Attempt ' + attempt + ' failed, retrying...');
                java.lang.Thread.sleep(delay);
                delay *= 2; // Exponential backoff
            } else {
                // Don't retry on client errors
                return response;
            }
        } catch (e) {
            if (attempt < maxRetries) {
                gs.warn('Exception on attempt ' + attempt + ': ' + e.getMessage());
                java.lang.Thread.sleep(delay);
                delay *= 2;
            } else {
                throw e;
            }
        }
    }
    
    return null;
}
```

## Async REST Calls

```javascript
// Async execution for slow APIs
function callAPIAsync(userId) {
    var rest = new sn_ws.RESTMessageV2('endpoint', 'GET');
    rest.setEndpoint('https://api.example.com/users/' + userId);
    
    rest.executeAsync(
        function(response) {
            // Success callback
            gs.info('Response: ' + response.getBody());
        },
        function(error) {
            // Error callback
            gs.error('API error: ' + error);
        }
    );
}
```

## Webhook Integration Patterns

### Receiving Webhooks
```javascript
// Create Script Include for receiving webhooks
function processWebhook(request) {
    var body = request.getParameter('req_body');
    var data = JSON.parse(body);
    
    // Verify source (signature check)
    var signature = request.getHeader('X-Signature');
    if (!verifySignature(body, signature)) {
        return 'Invalid signature';
    }
    
    // Process event
    if (data.event === 'incident.created') {
        handleIncidentCreated(data);
    }
    
    return 'OK';
}
```
