---
name: servicenow-server-security
context: fork
user-invocable: false
description: Secure data and credentials using cryptographic operations, encryption, and authentication primitives. Covers GlideDigest (hashing), GlideCertificateEncryption, KMFCryptoOperation, OAuth credential lifecycle, and request signing. Use when encrypting sensitive data, managing cryptographic keys, signing requests, verifying certificates, performing hash operations, or managing stored credentials. For setting up outbound HTTP API connections to external systems, use the servicenow-http-integrations skill. Trigger this skill whenever the user mentions encryption, hashing, certificate operations, credential management, request signing, or cryptographic security in ServiceNow server-side scripts.
last_verified: "2026-05-18"
---

# Server Security

Use for server-side cryptography, hashing, credential lifecycle, request signing, OAuth token handling, and secure data handling. For outbound HTTP flow implementation, use `servicenow-http-integrations`.

## Security API Selection

| Need | Prefer | Avoid / Notes |
|------|--------|---------------|
| New cryptographic operations | KMF (`sn_kmf_ns.KMFCryptoOperation`) | Legacy `GlideEncrypter` for new work |
| Message hashes | `GlideDigest` SHA-256+ methods | MD5/SHA-1 for sensitive data |
| Password storage | Platform password APIs / credential records | Plaintext fields |
| Request signing / HMAC | `RequestAuthAPI`, certificates, or documented HMAC support | Unverified hand-rolled crypto |
| OAuth lifecycle | `sn_auth.GlideOAuthClient` with profiles | Hardcoded tokens |
| Outbound API transport | `RESTMessageV2` with HTTPS and credentials | Inline credentials or disabled SSL validation |

## Critical Guardrails

- Never hardcode or log passwords, tokens, API keys, client secrets, private keys, or full card/secret values.
- Use ServiceNow credential stores/providers or encrypted properties for secrets; centralize rotation and audit.
- Use KMF for new encryption/key-management work; treat `GlideEncrypter` as legacy.
- Use SHA-256 or stronger for sensitive hashing; do not use MD5 or SHA-1 for security-sensitive data.
- Salt password hashes if custom hashing is unavoidable; prefer platform password handling where available.
- Validate all external/user input before cryptographic or database operations.
- Enforce ACLs and expose only allowed fields; never return entire records to clients.
- Use HTTPS and validate SSL certificates in production; never disable certificate validation in production.
- Rotate OAuth/API credentials and refresh tokens before expiration.
- Use timing-safe comparisons where signature verification APIs support them.
- Log sanitized security events for audit trails; include who/what/when, not secrets.
- Apply least privilege to integration users and credentials.

## Quick Patterns

```javascript
var digest = new GlideDigest();
var hash = digest.getSHA256Hex('input_string');
```

```javascript
var operation = new sn_kmf_ns.KMFCryptoOperation('global.my_crypto_module', 'SYMMETRIC_ENCRYPTION')
    .withData('sensitive_data');
var encrypted = operation.doOperation();
```

```javascript
var oAuthClient = new sn_auth.GlideOAuthClient();
var token = oAuthClient.getToken('requestor_profile_sys_id', 'entity_profile_sys_id');
var accessToken = token.getAccessToken();
```

## Key APIs

| API | Purpose |
|-----|---------|
| `sn_kmf_ns.KMFCryptoOperation` | Modern cryptographic operations |
| `GlideDigest` | Hash generation |
| `GlideCertificateEncryption` | Certificate signing/encryption operations |
| `sn_auth.GlideOAuthClient` | OAuth token lifecycle |
| `sn_auth.RequestAuthAPI` / `AuthCredential` | Request signing and credential-backed auth |
| `sn_cc.StandardCredentialsProvider` | Credential retrieval |
| `GlideSecurityManager` | Permission checks |
| `GlideSecureRandomUtil` | Secure random token material |

## Reference

Classic platform security APIs, OAuth, credential, KMF, hashing, and certificate details: use https://www.servicenow.com/llms.txt as the primary source, and the ServiceNow MCP server if one is configured as a secondary source.
