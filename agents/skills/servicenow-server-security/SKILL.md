---
name: servicenow-server-security
context: fork
user-invocable: false
description: Secure data and credentials using cryptographic operations, encryption, and authentication primitives. Covers GlideDigest (hashing), GlideCertificateEncryption, KMFCryptoOperation, OAuth credential lifecycle, and request signing. Use when encrypting sensitive data, managing cryptographic keys, signing requests, verifying certificates, performing hash operations, or managing stored credentials. For setting up outbound HTTP API connections to external systems, use the servicenow-http-integrations skill. Trigger this skill whenever the user mentions encryption, hashing, certificate operations, credential management, request signing, or cryptographic security in ServiceNow server-side scripts.
last_verified: "2026-05-18"
---

# Server Security

## Quick start

**Data encryption** (KMF — preferred for new code):

```javascript
// Constructor takes (cryptoModuleID, operationName)
var operation = new sn_kmf_ns.KMFCryptoOperation('global.my_crypto_module', 'SYMMETRIC_ENCRYPTION')
    .withData('sensitive_data');

var encrypted = operation.doOperation();
```

**Message digest** (hashing):

```javascript
// Constructor takes no parameters; use algorithm-specific methods
var digest = new GlideDigest();
var hash = digest.getSHA256Hex('input_string');
```

**Certificate operations**:

```javascript
var cert = new GlideCertificateEncryption();
// sign(certificateID, alias, aliasPassword, dataToSign, algorithm)
var signature = cert.sign('cert_sys_id', 'key_alias', 'alias_password', 'data_to_sign', 'SHA-256');

// Generate HMAC for message authentication
var mac = cert.generateMac(GlideStringUtil.base64Encode('secret_key'), 'HmacSHA256', 'data');
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
var oAuthClient = new sn_auth.GlideOAuthClient();

// Retrieve token using OAuth Requestor Profile and Entity Profile sys_ids
var token = oAuthClient.getToken('requestor_profile_sys_id', 'entity_profile_sys_id');
var accessToken = token.getAccessToken();
var expiresIn = token.getExpiresIn();
var refreshToken = token.getRefreshToken();

// Or request token by client name and JSON credentials
var params = {grant_type: 'password', username: 'integration_user', password: 'pwd'};
var tokenResponse = oAuthClient.requestToken('MyOAuthClient', JSON.stringify(params));
var newToken = tokenResponse.getToken();
```

**Message digest** (hash generation):

```javascript
var digest = new GlideDigest();
var hash = digest.getSHA256Hex('input_string');
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
var credential = provider.getCredentialByID('credential_sys_id');
```

**Security Manager for ACLs**:

```javascript
var secMgr = GlideSecurityManager.get();
var grInc = new GlideRecord('incident');
var hasAccess = secMgr.hasRightsTo('record/incident/read', grInc);
```

## Reference

For working code examples covering encryption, hashing, OAuth, and certificate operations, see [EXAMPLES.md](./EXAMPLES.md)

For OAuth security patterns, encryption best practices, and injection prevention, see [BEST_PRACTICES.md](./BEST_PRACTICES.md)
