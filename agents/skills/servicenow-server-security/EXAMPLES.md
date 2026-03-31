# Server Security - Code Examples

Examples for cryptographic operations, encryption, hashing, credential management, and security primitives.

## Table of Contents

1. [Hashing & Message Digests](#hashing--message-digests)
2. [Encryption & Decryption](#encryption--decryption)
3. [Credential Management](#credential-management)
4. [Request Signing](#request-signing)
5. [Security Best Practices](#security-best-practices)

---

## Hashing & Message Digests

### Hash Strings (SHA-256, MD5, etc.)

```javascript
// MD5 hash (legacy, not recommended for sensitive data)
var text = 'password123';
var md5 = new GlideDigest('MD5', text).getDigest();
gs.info('MD5: ' + md5);

// SHA-256 hash (recommended)
var sha256 = new GlideDigest('SHA-256', text).getDigest();
gs.info('SHA-256: ' + sha256);

// SHA-512 hash (stronger)
var sha512 = new GlideDigest('SHA-512', text).getDigest();
gs.info('SHA-512: ' + sha512);

// SHA-1 (legacy, acceptable for non-cryptographic uses)
var sha1 = new GlideDigest('SHA-1', text).getDigest();
gs.info('SHA-1: ' + sha1);
```

### Hash with Salt (Password Hashing)

```javascript
function hashPassword(password, salt) {
    // Generate salt if not provided
    if (!salt) {
        salt = gs.generateSecureRandomString(16);
    }

    // Create digest with salt
    var digest = new GlideDigest('SHA-256', salt + password).getDigest();

    return {
        hash: digest,
        salt: salt,
        algorithm: 'SHA-256'
    };
}

function verifyPassword(password, storedHash, salt) {
    var rehashed = new GlideDigest('SHA-256', salt + password).getDigest();
    return rehashed === storedHash;
}

// Usage
var userPassword = 'MyPassword123';
var hashed = hashPassword(userPassword);
gs.info('Hash: ' + hashed.hash);
gs.info('Salt: ' + hashed.salt);

// Verify
var isValid = verifyPassword(userPassword, hashed.hash, hashed.salt);
gs.info('Password valid: ' + isValid);
```

### HMAC (Hash-Based Message Authentication Code)

```javascript
function createHMAC(message, secretKey) {
    // Create HMAC for API authentication
    var algorithm = 'HmacSHA256';

    // ServiceNow uses javax.crypto.Mac
    var mac = Packages.javax.crypto.Mac.getInstance(algorithm);
    var key = new Packages.javax.crypto.spec.SecretKeySpec(
        secretKey.getBytes(),
        0,
        secretKey.length,
        algorithm
    );

    mac.init(key);
    var bytes = mac.doFinal(message.getBytes());

    // Convert to hex
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
        var b = bytes[i] & 0xFF;
        if (b < 16) hex += '0';
        hex += b.toString(16);
    }

    return hex;
}

// Usage
var message = 'important_data';
var secret = 'my_secret_key';
var signature = createHMAC(message, secret);
gs.info('HMAC: ' + signature);
```

---

## Encryption & Decryption

### Encrypt Sensitive Data

```javascript
function encryptSensitiveData(plaintext) {
    try {
        // Use GlideCertificateEncryption for field-level encryption
        var encrypted = new GlideCertificateEncryption().encrypt(plaintext);
        return encrypted;
    } catch (error) {
        gs.error('Encryption error: ' + error.message);
        return null;
    }
}

function decryptSensitiveData(ciphertext) {
    try {
        var decrypted = new GlideCertificateEncryption().decrypt(ciphertext);
        return decrypted;
    } catch (error) {
        gs.error('Decryption error: ' + error.message);
        return null;
    }
}

// Usage
var apiKey = 'sk_live_12345abcde';
var encrypted = encryptSensitiveData(apiKey);
gs.info('Encrypted: ' + encrypted);

var decrypted = decryptSensitiveData(encrypted);
gs.info('Decrypted: ' + decrypted);
```

### Store and Retrieve Encrypted Credentials

```javascript
function storeEncryptedCredential(name, username, password) {
    var credential = new GlideRecord('sys_password');
    credential.initialize();
    credential.name = name;
    credential.user_name = username;
    credential.password = password; // Automatically encrypted by system
    credential.type = 'Basic'; // Or 'OAuth', 'API Key', etc.

    var credentialId = credential.insert();
    gs.info('Stored credential: ' + credentialId);

    return credentialId;
}

function retrieveCredential(credentialId) {
    var credential = new GlideRecord('sys_password');
    if (credential.get(credentialId)) {
        return {
            name: credential.getValue('name'),
            username: credential.getValue('user_name'),
            password: credential.getValue('password'), // Automatically decrypted
            type: credential.getValue('type')
        };
    }
    return null;
}

// Usage
var credId = storeEncryptedCredential(
    'External API Credentials',
    'api_user@example.com',
    'encrypted_password_here'
);

var cred = retrieveCredential(credId);
gs.info('Retrieved username: ' + cred.username);
```

---

## Credential Management

### OAuth Credential Lifecycle

```javascript
function createOAuthCredential(name, clientId, clientSecret, tokenUrl) {
    var credential = new GlideRecord('sys_password');
    credential.initialize();
    credential.name = name;
    credential.user_name = clientId;
    credential.password = clientSecret;
    credential.type = 'OAuth';
    credential.oauth_url = tokenUrl;

    var id = credential.insert();
    return id;
}

function getOAuthToken(credentialId) {
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
        gs.error('OAuth token error: ' + error.message);
        return null;
    }
}

// Usage
var credId = createOAuthCredential(
    'Third Party API',
    'client_id_123',
    'client_secret_456',
    'https://api.example.com/oauth/token'
);

var token = getOAuthToken(credId);
gs.info('Access Token: ' + token.accessToken);
```

### API Key Management

```javascript
function generateAPIKey(userId) {
    var keyLength = 32;
    var apiKey = gs.generateSecureRandomString(keyLength);

    // Store in database
    var apiKeyRecord = new GlideRecord('x_api_keys');
    apiKeyRecord.initialize();
    apiKeyRecord.user = userId;
    apiKeyRecord.api_key = apiKey;
    apiKeyRecord.created_on = new GlideDateTime();
    apiKeyRecord.status = 'active';

    var recordId = apiKeyRecord.insert();

    return {
        apiKey: apiKey,
        recordId: recordId
    };
}

function validateAPIKey(apiKey) {
    var keyRecord = new GlideRecord('x_api_keys');
    keyRecord.addQuery('api_key', apiKey);
    keyRecord.addQuery('status', 'active');
    keyRecord.query();

    if (keyRecord.next()) {
        return {
            valid: true,
            userId: keyRecord.getValue('user'),
            createdOn: keyRecord.getValue('created_on')
        };
    }

    return { valid: false };
}

function revokeAPIKey(apiKey) {
    var keyRecord = new GlideRecord('x_api_keys');
    keyRecord.addQuery('api_key', apiKey);
    keyRecord.query();

    if (keyRecord.next()) {
        keyRecord.status = 'revoked';
        keyRecord.revoked_on = new GlideDateTime();
        keyRecord.update();
        return true;
    }

    return false;
}

// Usage
var key = generateAPIKey('5eb8d5a4c611227b004e15b10febe9f6');
gs.info('Generated API Key: ' + key.apiKey);

var validation = validateAPIKey(key.apiKey);
gs.info('Valid: ' + validation.valid);
```

---

## Request Signing

### Sign HTTP Requests

```javascript
function signRequest(method, endpoint, body, secretKey) {
    // Create canonical string
    var timestamp = new GlideDateTime().toString();
    var canonical = method + '\n' + endpoint + '\n' + timestamp;

    if (body) {
        canonical += '\n' + body;
    }

    // Create HMAC signature
    var algorithm = 'HmacSHA256';
    var mac = Packages.javax.crypto.Mac.getInstance(algorithm);
    var key = new Packages.javax.crypto.spec.SecretKeySpec(
        secretKey.getBytes(),
        0,
        secretKey.length,
        algorithm
    );

    mac.init(key);
    var signature = mac.doFinal(canonical.getBytes());

    // Convert to Base64
    var encoded = Packages.java.util.Base64.getEncoder().encodeToString(signature);

    return {
        signature: encoded,
        timestamp: timestamp
    };
}

function verifyRequestSignature(method, endpoint, body, signature, timestamp, secretKey) {
    // Recreate canonical string
    var canonical = method + '\n' + endpoint + '\n' + timestamp;

    if (body) {
        canonical += '\n' + body;
    }

    // Create HMAC
    var algorithm = 'HmacSHA256';
    var mac = Packages.javax.crypto.Mac.getInstance(algorithm);
    var key = new Packages.javax.crypto.spec.SecretKeySpec(
        secretKey.getBytes(),
        0,
        secretKey.length,
        algorithm
    );

    mac.init(key);
    var computedSignature = mac.doFinal(canonical.getBytes());
    var encoded = Packages.java.util.Base64.getEncoder().encodeToString(computedSignature);

    // Compare signatures (timing-safe comparison)
    return encoded === signature;
}

// Usage
var signed = signRequest('POST', '/api/v1/incidents', '{"priority":"1"}', 'my_secret');
gs.info('Signature: ' + signed.signature);

var isValid = verifyRequestSignature(
    'POST',
    '/api/v1/incidents',
    '{"priority":"1"}',
    signed.signature,
    signed.timestamp,
    'my_secret'
);
gs.info('Signature valid: ' + isValid);
```

---

## Security Best Practices

### Input Validation

```javascript
function validateAndSanitize(input, type) {
    switch (type) {
        case 'email':
            // Validate email format
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(input);

        case 'url':
            // Validate URL
            try {
                new java.net.URL(input);
                return true;
            } catch (e) {
                return false;
            }

        case 'alphanumeric':
            // Only letters and numbers
            return /^[a-zA-Z0-9]+$/.test(input);

        case 'phone':
            // Basic phone format
            return /^\d{10,}$/.test(input.replace(/\D/g, ''));

        default:
            return false;
    }
}

// Usage
gs.info('Email valid: ' + validateAndSanitize('user@example.com', 'email'));
gs.info('Phone valid: ' + validateAndSanitize('(555) 123-4567', 'phone'));
```

### Secure Random Generation

```javascript
function generateSecureToken(length) {
    return gs.generateSecureRandomString(length || 32);
}

function generateSecurePassword(length) {
    var length = length || 16;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    var password = '';

    for (var i = 0; i < length; i++) {
        var randomIndex = Math.floor(Math.random() * chars.length);
        password += chars.charAt(randomIndex);
    }

    return password;
}

// Usage
var token = generateSecureToken(32);
var password = generateSecurePassword(16);
gs.info('Secure token: ' + token);
gs.info('Secure password: ' + password);
```

### Audit Logging for Security Events

```javascript
function logSecurityEvent(eventType, details) {
    var auditLog = new GlideRecord('sys_audit_log');
    auditLog.initialize();
    auditLog.event_type = eventType;
    auditLog.user = gs.getUserID();
    auditLog.timestamp = new GlideDateTime();
    auditLog.details = JSON.stringify(details);
    auditLog.ip_address = gs.getProperty('glide.system.remote_addr');

    auditLog.insert();

    gs.info('Security event logged: ' + eventType);
}

// Usage
logSecurityEvent('PASSWORD_CHANGE', {
    userId: userId,
    action: 'password_reset',
    timestamp: new GlideDateTime().toString()
});

logSecurityEvent('API_KEY_GENERATED', {
    generatedFor: userId,
    keyLength: 32
});

logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
    username: attemptedUsername,
    attempts: 3,
    ipAddress: clientIp
});
```

---

## Best Practices

✓ **Never log passwords or secrets** - use audit logs with sanitized data
✓ **Use SHA-256 or stronger** for hashing - avoid MD5 or SHA-1 for sensitive data
✓ **Always use salt** when hashing passwords
✓ **Store credentials securely** - use sys_password table or encrypted fields
✓ **Rotate API keys regularly** - implement expiration
✓ **Validate all inputs** - prevent injection attacks
✓ **Use HTTPS for all external communication** - never send credentials over HTTP
✓ **Keep secrets in credentials** - don't hardcode in scripts
✓ **Implement rate limiting** - prevent brute force attacks
✓ **Use timing-safe comparisons** - prevent timing attacks

---

## Security Checklist

- [ ] All passwords hashed with salt
- [ ] Sensitive data encrypted at rest
- [ ] API keys rotated regularly
- [ ] Input validation on all user data
- [ ] Security events logged and monitored
- [ ] Credentials stored in sys_password, not hardcoded
- [ ] OAuth tokens refreshed appropriately
- [ ] HTTPS used for external APIs
- [ ] Rate limiting implemented
- [ ] Audit logs reviewed regularly

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for advanced cryptography, certificate management, and security patterns.
