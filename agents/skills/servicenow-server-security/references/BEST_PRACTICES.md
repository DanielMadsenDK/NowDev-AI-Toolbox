# Best Practices — Server Security

## OAuth 2.0 Security

### Token Lifecycle
```javascript
// REQUEST TOKEN
var request = new GlideOAuthClientRequest();
request.setClientId('your-client-id');
request.setClientSecret('your-client-secret'); // Secrets never in code!
request.setAuthorizationUrl('https://auth.example.com/oauth/authorize');
request.setTokenUrl('https://auth.example.com/oauth/token');

var oauthClient = new GlideOAuthClient();
var token = oauthClient.requestToken(request);

// VERIFY TOKEN VALIDITY
if (token && !token.isExpired()) {
    // Token is valid
    var accessToken = token.getAccessToken();
    var refreshToken = token.getRefreshToken();
    var expiresIn = token.getExpirationTime();
}

// REFRESH EXPIRING TOKEN
if (token.isExpiredWithinTime(300)) { // Expires in < 5 min
    var newToken = oauthClient.refresh(token);
}

// USE TOKEN
var rest = new sn_ws.RESTMessageV2('API', 'GET');
rest.setAuthenticationType('oauth2');
rest.setOAuthToken(accessToken);
var response = rest.execute();
```

### Token Storage Security
```javascript
// ✗ WRONG - hardcoded credentials
var clientSecret = 'abc123secret';

// ✗ WRONG - unencrypted storage
var config = {
    secret: 'password123'
};

// ✓ CORRECT - use Credential Provider
var credProvider = new sn_auth.CredentialProvider();
var cred = credProvider.getCredential('oauth_client_secret');
var clientSecret = cred.getPassword();

// ✓ CORRECT - use Key Management Framework (KMF)
var keyMgr = new GlideKeyManager();
var key = keyMgr.getKey('oauth_key_id', 'default');

// ✓ CORRECT - store in properties
var secret = gs.getProperty('oauth.client.secret', '');
// Value stored in sys_properties table, encrypted
```

## Encryption and Decryption

### GlideCertificateEncryption
```javascript
var encrypt = new GlideCertificateEncryption();

// Encrypt data
var plaintext = 'sensitive-data-here';
var encrypted = encrypt.encrypt(plaintext);

// Decrypt data
var decrypted = encrypt.decrypt(encrypted);
gs.info('Original: ' + plaintext);
gs.info('Encrypted: ' + encrypted);
gs.info('Decrypted: ' + decrypted);

// Use case: sensitive fields in custom tables
```

### GlideEncrypter for Field Encryption
```javascript
// Encrypt individual fields
var encrypter = new GlideEncrypter();

// Encrypt
var sensitiveValue = 'credit-card-number';
var encrypted = encrypter.encrypt(sensitiveValue);
current.encrypted_field = encrypted;

// Decrypt (only in queries with proper ACL)
var gr = new GlideRecord('my_table');
gr.addQuery('sys_id', sys_id);
gr.query();
if (gr.next()) {
    var decrypted = gr.encrypted_field.decrypted(); // Returns value
}
```

## HMAC and Hashing

### Request Signing (AWS Example)
```javascript
function signRequest(httpMethod, resourcePath, payload) {
    var credential = gs.getProperty('aws.secret.access.key', '');
    
    // Create canonical request
    var canonicalRequest = httpMethod + '\n' +
                          resourcePath + '\n' +
                          'host:api.example.com\n' +
                          '\n' +
                          'host\n' +
                          hashPayload(payload);
    
    // Sign with HMAC-SHA256
    var signer = new GlideCryptoEncryptionHelper();
    var signature = signer.hmacSHA256(credential, canonicalRequest);
    
    return signature;
}

function hashPayload(payload) {
    var crypto = new GlideCryptoEncryptionHelper();
    return crypto.sha256(payload);
}
```

### Password Hashing
```javascript
// ✗ WRONG - store plaintext
function createUser(username, password) {
    var gr = new GlideRecord('sys_user');
    gr.name = username;
    gr.password = password; // NEVER!
    gr.insert();
}

// ✓ CORRECT - system handles hashing
function createUser(username, password) {
    var gr = new GlideRecord('sys_user');
    gr.name = username;
    gr.setPassword(password); // Uses bcrypt automatically
    gr.insert();
}

// ✓ CORRECT - verify password
var user = new GlideRecord('sys_user');
user.addQuery('name', username);
user.query();
if (user.next()) {
    if (user.checkPassword(plaintext)) {
        // Password matches
    }
}
```

## Access Control

### ACL Enforcement
```javascript
// ✓ CORRECT - check permissions before expose
var gr = new GlideRecord('incident');
if (!gr.canRead()) {
    gs.error('You do not have permission to read incidents');
    return null;
}

// ✓ CORRECT - only expose allowed fields
function getIncidentData(sysId) {
    var gr = new GlideRecord('incident');
    gr.addQuery('sys_id', sysId);
    gr.query();
    
    if (!gr.next()) return null;
    
    // Check creator or assigned to current user
    var userId = gs.getUserID();
    if (gr.caller_id.toString() !== userId && 
        gr.assignment_group.toString() !== gs.getUser().getDefaultGroupID()) {
        return null; // Forbidden
    }
    
    return {
        number: gr.number.toString(),
        short_description: gr.short_description.toString()
        // Don't expose sensitive fields!
    };
}

// ✗ WRONG - expose all fields
return gr.getJSON(); // Security risk!
```

## HTTPS/TLS Best Practices

### Certificate Validation
```javascript
// ✓ CORRECT - validate SSL certificates
var rest = new sn_ws.RESTMessageV2('API', 'GET');
rest.setEndpoint('https://api.example.com/endpoint');
rest.setHttpTimeout(30000);
// SSL validation enabled by default

// Check certificate details
try {
    var response = rest.execute();
    if (!response.getStatusCode().toString().startsWith('2')) {
        gs.error('API returned error: ' + response.getStatusCode());
    }
} catch (e) {
    gs.error('SSL or connection error: ' + e.getMessage());
}

// ✗ WRONG - disable SSL validation
// rest.setIgnoreSslErrors(true); // NEVER in production!
```

### Connection Security
```javascript
function makeSecureRequest(endpoint, method, body) {
    var rest = new sn_ws.RESTMessageV2(endpoint, method);
    
    // Secure defaults
    rest.setHttpTimeout(30000);                    // Timeout
    rest.setHeader('Content-Type', 'application/json');
    rest.setHeader('User-Agent', 'ServiceNow/1.0');
    
    // Authentication
    rest.setAuthenticationType('oauth2');
    
    // TLS 1.2+
    // (Enforced at platform level)
    
    if (body) {
        rest.setRequestBody(JSON.stringify(body));
    }
    
    var response = rest.execute();
    return response;
}
```

## Injection Prevention

### SQL Injection Prevention
```javascript
// ✗ WRONG - open to SQL injection
var tableName = 'incident';
var query = "WHERE number = '" + userInput + "'";
// User could input: ' OR '1'='1

// ✓ CORRECT - use GlideRecord
var gr = new GlideRecord('incident');
gr.addQuery('number', userInput); // Parameterized automatically
gr.query();

// ✓ CORRECT - use GlideQuery
var query = new GlideQuery('incident')
    .where('number', userInput)
    .select();
```

### Script Injection Prevention
```javascript
// ✗ WRONG - can execute arbitrary code
function executeScript(scriptCode) {
    eval(scriptCode); // NEVER!
}

// ✓ CORRECT - validate and use safe APIs
function processUserScript(userScript) {
    // Whitelist allowed operations
    if (!/^([\w\.]+)\s*=\s*(.+)$/.test(userScript)) {
        gs.error('Invalid script format');
        return;
    }
    
    // Use GlideScopedEvaluator for safe evaluation
    var evaluator = new GlideScopedEvaluator();
    var record = new GlideRecord('incident');
    try {
        var result = evaluator.evaluateScript(
            record,
            userScript,
            {}
        );
    } catch (e) {
        gs.error('Script evaluation error: ' + e);
    }
}
```

### XSS Prevention
```javascript
// ✗ WRONG - stores HTML that executes in browser
current.comments = '<script>alert("hacked")</script>';

// ✓ CORRECT - clean HTML
function addCommentSafely(text) {
    // Encode special characters
    var encoded = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    current.comments = encoded;
}

// ✓ CORRECT - use GlideElementGeoRSSFeed validate()
function validateHTML(userInput) {
    var GlideFilter = Java.type('com.glide.db.filter.GlideFilter');
    var xssFilter = new GlideFilter();
    return xssFilter.sanitizeInput(userInput);
}
```

## Credential Management

### Store Credentials Securely
```javascript
// ✓ CORRECT - Pattern 1: Use sys_user_password table
var cred = new GlideRecord('sys_user_password');
cred.user = gs.getUserID();
cred.password = 'plaintext-will-be-hashed';
cred.insert();

// ✓ CORRECT - Pattern 2: OAuth Credentials Provider
var credProvider = new sn_auth.CredentialProvider();
var cred = new sn_auth.Credential('my_cred', 'oauth');
cred.setUsername('client_id');
cred.setPassword('client_secret');
credProvider.putCredential(cred);

// ✓ CORRECT - Pattern 3: Encrypted System Properties
gs.setProperty('api.key', 'value', {
    encrypt: true,
    private: true
});

// ✗ WRONG - credentials in code
var apiKey = 'secret123'; // NEVER!
var password = 'mypassword'; // NEVER!
```

## API Security

### Input Validation
```javascript
function validateAPIRequest(params) {
    var errors = [];
    
    // Validate presence
    if (!params.incident_id) {
        errors.push('incident_id required');
    }
    
    // Validate format
    if (!/^[a-f0-9]{32}$/.test(params.incident_id)) {
        errors.push('incident_id invalid format');
    }
    
    // Validate length
    if (params.comment && params.comment.length > 4000) {
        errors.push('comment too long');
    }
    
    // Validate enum values
    var validStates = ['open', 'closed', 'resolved'];
    if (params.state && !validStates.includes(params.state)) {
        errors.push('state must be one of: ' + validStates.join(', '));
    }
    
    return errors.length === 0 ? null : errors;
}

function handleAPIRequest(request) {
    var errors = validateAPIRequest(request);
    if (errors) {
        return {
            status: 400,
            errors: errors
        };
    }
    // Process request
}
```

### Rate Limiting
```javascript
function checkRateLimit(userId, action) {
    var keyPrefix = 'ratelimit:' + userId + ':' + action;
    var cache = new GlideCache();
    
    var count = cache.get(keyPrefix) || 0;
    var limit = 100; // per minute
    
    if (count >= limit) {
        gs.warn('Rate limit exceeded: ' + userId);
        return false;
    }
    
    cache.put(keyPrefix, count + 1, 60); // 60 second TTL
    return true;
}
```

## Anti-Patterns

### ✗ Logging Sensitive Data
```javascript
// WRONG - logs passwords
gs.info('User login: ' + username + ' / ' + password);

// WRONG - logs credit cards
gs.debug('Processing card', cardObject);

// CORRECT
gs.info('User login: ' + username);
gs.debug('Processing card: ' + cardObject.cardType + ' **** **** ' + 
         cardObject.cardNumber.slice(-4));
```

### ✗ Hardcoded Secrets
```javascript
// WRONG
var apiKey = 'sk-12345secret';
var clientSecret = 'secret123';

// CORRECT
var apiKey = gs.getProperty('secret.api_key', '');
var clientSecret = gs.getProperty('secret.client_secret', '');
```

### ✗ Trust User Input
```javascript
// WRONG
var input = request.getParameter('id');
gr.addQuery('sys_id', input); // SQL injection possible

// CORRECT
// Validate first
if (!/^[a-f0-9]{32}$/.test(input)) {
    return {error: 'Invalid ID format'};
}
gr.addQuery('sys_id', input);
```