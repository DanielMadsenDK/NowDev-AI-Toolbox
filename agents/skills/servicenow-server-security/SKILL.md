---
name: servicenow-server-security
user-invocable: false
description: Secure data and credentials using cryptographic operations, encryption, and authentication primitives. Covers GlideDigest (hashing), GlideCertificateEncryption, KMFCryptoOperation, OAuth credential lifecycle, and request signing. Use when encrypting sensitive data, managing cryptographic keys, signing requests, verifying certificates, performing hash operations, or managing stored credentials. For setting up outbound HTTP API connections to external systems, use the servicenow-http-integrations skill. Trigger this skill whenever the user mentions encryption, hashing, certificate operations, credential management, request signing, or cryptographic security in ServiceNow server-side scripts.
---

# Server Security

## Quick start

**Data encryption** (KMF — preferred for new code):

```javascript
var operation = new sn_kmf_ns.KMFCryptoOperation()
    .setCryptoModuleID('module_sys_id')
    .setOperation('symmetric_encrypt')
    .setData('sensitive_data');

var encrypted = operation.doOperation();
```

**Message digest** (hashing):

```javascript
var digest = new GlideDigest('SHA256');
var hash = digest.hexDigest('input_string');
```

**Certificate operations**:

```javascript
var cert = new GlideCertificateEncryption();
var signature = cert.sign('data_to_sign', 'private_key');
var verified = cert.verify('signature', 'public_key', 'data');
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

**OAuth token management** (credential lifecycle — for HTTP flows, see `servicenow-http-integrations`):

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

| Practice | Why it matters |
|----------|----------------|
| Use credentials stored in `discovery_credentials` | Centralises rotation and audit without touching code |
| Never hardcode credentials or API keys | Hardcoded secrets end up in version control and logs |
| Use KMF for new cryptographic operations | Platform-managed keys; older GlideEncrypter is deprecated |
| Validate SSL certificates in production | Prevents man-in-the-middle attacks on outbound calls |
| Rotate OAuth tokens before expiration | Prevents silent auth failures mid-transaction |
| Use HMAC for message integrity | Detects tampering even when encryption is not required |
| Test auth flows on sub-production first | Auth errors can lock accounts or exhaust token quotas |
| Log security operations for audit trails | Required for compliance; helps debug failures |
| Use HTTPS for all outbound requests | HTTP exposes credentials and data in transit |
| Follow principle of least privilege | Compromise of a low-privilege credential limits blast radius |

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

For working code examples covering encryption, hashing, OAuth, and certificate operations, see [EXAMPLES.md](./EXAMPLES.md)

For OAuth security patterns, encryption best practices, and injection prevention, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
