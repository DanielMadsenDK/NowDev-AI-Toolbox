# Fluent SDK HTTP Integrations

Patterns for outbound HTTP integrations in ServiceNow SDK projects.

## Key Fluent Language Constructs

When building HTTP integrations with Fluent SDK, you'll use these language constructs:

- **`Now.ID['api_id']`** — Assign a human-readable ID to REST API definitions
- **`Now.include('./script.server.js')`** — Link to external JavaScript containing integration logic with two-way sync
- **`Now.ref('sys_user', { name: 'admin' })`** — Reference users or external system records

See [servicenow-fluent-development: Fluent Language Constructs](../../servicenow-fluent-development/references/API-REFERENCE.md) for comprehensive documentation.

## Overview

HTTP integrations in the Fluent SDK use similar underlying mechanisms to the classic approach but with modern TypeScript syntax and improved type safety.

---

## REST API Calls

### Basic REST Request with SDK

```typescript
import { RESTMessageV2 } from '@servicenow/sdk/core'

const rest = new RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');
rest.setQueryParameter('limit', '10');
rest.setHttpTimeout(30000);

const response = rest.execute();
const statusCode = response.getStatusCode();

if (statusCode === 200) {
    const body = response.getBody();
    const data = JSON.parse(body);
    gs.info(`Users retrieved: ${data.length}`);
} else {
    gs.error(`API call failed with status: ${statusCode}`);
}
```

### POST Request with Typed Payload

```typescript
interface IncidentPayload {
    title: string;
    description: string;
    priority: number;
}

async function createIncident(payload: IncidentPayload) {
    const rest = new RESTMessageV2('ExternalAPI', 'POST');
    rest.setEndpoint('https://api.example.com/v1/incidents');
    rest.setRequestHeader('Content-Type', 'application/json');
    rest.setHttpTimeout(30000);

    rest.setRequestBody(JSON.stringify(payload));

    try {
        const response = rest.execute();
        const statusCode = response.getStatusCode();

        if (statusCode === 201) {
            const result = JSON.parse(response.getBody());
            gs.info(`Incident created: ${result.id}`);
            return result;
        } else {
            throw new Error(`Failed to create incident: ${statusCode}`);
        }
    } catch (error) {
        gs.error(`Error: ${error.message}`);
        return null;
    }
}
```

---

## OAuth Token Management

### Get OAuth Token with Error Handling

```typescript
import { GlideOAuthClient } from '@servicenow/sdk/core'

async function getOAuthToken(credentialId: string): Promise<string | null> {
    try {
        const oauthClient = new GlideOAuthClient();
        oauthClient.setCredentialId(credentialId);

        const token = oauthClient.getNewAccessToken();
        const accessToken = token.getAccessToken();
        const expiresIn = token.getExpiresIn();

        gs.info(`Token retrieved, expires in: ${expiresIn} seconds`);
        return accessToken;
    } catch (error) {
        gs.error(`OAuth token retrieval failed: ${error.message}`);
        return null;
    }
}

async function callProtectedAPI(credentialId: string, endpoint: string) {
    const token = await getOAuthToken(credentialId);

    if (!token) {
        return null;
    }

    const rest = new RESTMessageV2('ProtectedAPI', 'GET');
    rest.setEndpoint(endpoint);
    rest.setRequestHeader('Authorization', `Bearer ${token}`);

    const response = rest.execute();
    return response.getBody();
}
```

---

## SOAP Integration

### Call SOAP Service

```typescript
import { SOAPMessageV2 } from '@servicenow/sdk/core'
import { XMLDocument } from '@servicenow/sdk/core'

function callSoapService(userId: string): string | null {
    try {
        const soap = new SOAPMessageV2('SoapIntegrationName', 'GetUser');
        soap.setEndpoint('https://api.example.com/soap/service');

        soap.setParameter('userId', userId);
        soap.setParameter('includeDetails', 'true');
        soap.setHttpTimeout(30000);

        const response = soap.execute();
        const responseBody = response.getBody();

        // Parse SOAP response
        const xmlDocument = new XMLDocument();
        xmlDocument.parseXML(responseBody);

        const user = xmlDocument.getDocumentElement().getFirstChild();
        gs.info(`User retrieved: ${user.getAttribute('name')}`);

        return responseBody;
    } catch (error) {
        gs.error(`SOAP call failed: ${error.message}`);
        return null;
    }
}
```

---

## Robust Error Handling with Retry

```typescript
interface ApiCallResult {
    success: boolean;
    status?: number;
    body?: string;
    error?: string;
}

async function callExternalAPIWithRetry(
    endpoint: string,
    method: string,
    payload?: object,
    maxRetries: number = 3
): Promise<ApiCallResult> {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const rest = new RESTMessageV2('ExternalAPI', method);
            rest.setEndpoint(endpoint);
            rest.setRequestHeader('Content-Type', 'application/json');
            rest.setHttpTimeout(30000);

            if (payload) {
                rest.setRequestBody(JSON.stringify(payload));
            }

            const response = rest.execute();
            const statusCode = response.getStatusCode();

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
                gs.warn(`Server error (${statusCode}), retrying...`);
                await sleep(2000 * retries); // Exponential backoff
                continue;
            }

            // Client error - don't retry
            gs.error(`Client error (${statusCode}): ${response.getBody()}`);
            return {
                success: false,
                status: statusCode,
                body: response.getBody()
            };

        } catch (error) {
            retries++;
            gs.error(`Attempt ${retries} failed: ${error.message}`);

            if (retries >= maxRetries) {
                return {
                    success: false,
                    error: error.message
                };
            }

            await sleep(2000 * retries);
        }
    }

    return {
        success: false,
        error: 'Max retries exceeded'
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Best Practices

✓ **Use TypeScript types** - For request/response payloads
✓ **Always check status codes** - Before processing responses
✓ **Implement retry logic** - For transient failures
✓ **Use async/await patterns** - When possible
✓ **Handle errors gracefully** - With try-catch
✓ **Log all requests** - For debugging and audit
✓ **Validate SSL certificates** - In production
✓ **Store credentials securely** - Use sys_password table
✓ **Test thoroughly** - On sub-production first
✓ **Document API contracts** - External specifications

---

## Key APIs

| API | Purpose |
|-----|---------|
| `RESTMessageV2` | Outbound REST API calls |
| `SOAPMessageV2` | SOAP web service calls |
| `GlideOAuthClient` | OAuth token retrieval |
| `XMLDocument` | XML parsing for SOAP responses |

---

## Comparison: Classic vs Fluent

| Aspect | Classic | Fluent |
|--------|---------|--------|
| API | RESTMessageV2 | RESTMessageV2 (same) |
| Syntax | JavaScript | TypeScript |
| Error handling | try-catch (optional) | try-catch (recommended) |
| Types | Untyped | Full TypeScript support |
| Testing | Manual | Automated possible |
| IDE support | Limited | Full intellisense |

---

## When to Use Fluent SDK HTTP Integrations

- ✓ New SDK projects
- ✓ TypeScript-based development
- ✓ Need type-safe API interactions
- ✓ Full-stack SDK applications
- ✓ Automated testing with CI/CD

For instance-based integrations, see [CLASSIC.md](CLASSIC.md) for traditional patterns.
