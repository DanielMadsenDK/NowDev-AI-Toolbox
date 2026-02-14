---
name: servicenow-server-security
description: Secure outbound requests, encrypt sensitive data, and manage authentication credentials. Covers request signing, OAuth authentication, certificate encryption, key management, and cryptographic operations. Use when securing API communications, encrypting sensitive information, managing credentials, implementing OAuth flows, or performing cryptographic operations.
---

# Server Security

## Quick start

**OAuth token management**:

```javascript
var oauth = new sn_auth.GlideOAuthClient();
oauth.setCredentialId('credential_sys_id_here');

// Get new access token
var token = oauth.getNewAccessToken();
var accessToken = token.getAccessToken();
var expiresIn = token.getExpiresIn();

// Refresh token
var refreshed = oauth.refreshAccessToken('refresh_token_value');
```

**Request signing** (AWS, OAuth, custom):

```javascript
var httpRequest = new sn_auth.HttpRequestData();
httpRequest.setMethod('GET');
httpRequest.setEndpoint('https://api.example.com/data');

var credential = new sn_auth.AuthCredential();
credential.setCredentialId('sys_id');

var signedRequest = new sn_auth.RequestAuthAPI()
    .generateAuth(credential, httpRequest);

var authedData = signedRequest.getAuthorizedRequest();
```

**Data encryption**:

```javascript
// Modern: Use Key Management Framework (KMF)
var operation = new sn_kmf_ns.KMFCryptoOperation()
    .setCryptoModuleID('module_sys_id')
    .setOperation('symmetric_encrypt')
    .setData('sensitive_data');

var encrypted = operation.doOperation();
```

**Certificate operations**:

```javascript
var cert = new GlideCertificateEncryption();
var signature = cert.sign('data_to_sign', 'private_key');
var verified = cert.verify('signature', 'public_key', 'data');
```

**Message digest** (hash generation):

```javascript
var digest = new GlideDigest('SHA256');
var hash = digest.hexDigest('input_string');
```

## Security APIs

| API | Purpose |
|-----|---------|
| GlideOAuthClient | OAuth token lifecycle |
| RequestAuthAPI | Request signing for APIs |
| AuthCredential | Credential management |
| GlideCertificateEncryption | Certificate operations |
| KMFCryptoOperation | Modern cryptography |
| GlideDigest | Hash generation |
| GlideEncrypter | Legacy encryption (deprecated) |

## Best practices

- Use credentials stored in discovery_credentials table
- Never hardcode credentials or API keys in scripts
- Use KMF for new cryptography needs
- Validate SSL certificates in production
- Rotate OAuth tokens before expiration
- Use HMAC for message integrity verification
- Test authentication flows on sub-production first
- Log security operations for audit trails
- Always use HTTPS for outbound requests
- Follow principle of least privilege for credentials

## Authentication patterns

**Standard Credentials Provider**:

```javascript
var provider = new sn_cc.StandardCredentialsProvider();
var credential = provider.getAuthCredentialByID('credential_sys_id');
```

**Security Manager for ACLs**:

```javascript
var secMgr = new GlideSecurityManager();
var hasAccess = secMgr.canRead(grRecord, true); // true = enforcing
```

## Reference

For OAuth security patterns, encryption best practices, and injection prevention, see [BEST_PRACTICES.md](references/BEST_PRACTICES.md)
