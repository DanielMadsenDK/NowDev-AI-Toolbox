# HTTP Integrations - Code Examples

Quick reference guide for integrating with external REST and SOAP APIs. This page provides navigation to detailed pattern references organized by approach.

## Table of Contents

- [Choose Your Approach](#choose-your-approach)
- [Integration Types](#integration-types)
- [Quick Decision Guide](#quick-decision-guide)
- [Key Differences at a Glance](#key-differences-at-a-glance)
- [See Also](#see-also)
- [Simple REST API - GET/POST](#simple-rest-api---getpost)
- [Modular REST API with CRUD Operations](#modular-rest-api-with-crud-operations)
- [OAuth Token Management](#oauth-token-management)
- [Error Handling and Retries](#error-handling-and-retries)
- [SOAP Web Service Integration](#soap-web-service-integration)
- [Best Practices Demonstrated](#best-practices-demonstrated)
- [Common Patterns](#common-patterns)

---

## Choose Your Approach

### **[CLASSIC.md](CLASSIC.md) — Instance-Based HTTP Integrations**
Use for direct ServiceNow instance integrations with REST/SOAP APIs.

**Quick example:**
```javascript
var rest = new sn_ws.RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');

var response = rest.execute();
if (response.getStatusCode() === 200) {
    var data = JSON.parse(response.getBody());
}
```

**When to use:**
- ✓ Existing ServiceNow instances
- ✓ REST/SOAP API integrations
- ✓ Third-party system connections
- ✓ OAuth authentication flows
- ✓ Legacy API compatibility

---

### **[FLUENT.md](FLUENT.md) — SDK-Based HTTP Integrations**
Use for TypeScript projects with modern patterns.

**Quick example:**
```typescript
const rest = new RESTMessageV2('IntegrationName', 'GET');
rest.setEndpoint('https://api.example.com/v1/users');
rest.setQueryParameter('page', '1');

const response = rest.execute();
if (response.getStatusCode() === 200) {
    const data = JSON.parse(response.getBody());
}
```

**When to use:**
- ✓ New SDK projects
- ✓ TypeScript-based development
- ✓ Type-safe API interactions
- ✓ Automated testing
- ✓ Full-stack SDK applications

---

## Integration Types

| Type | Use Case | Learn More |
|------|----------|------------|
| **REST API** | JSON-based APIs | See respective guide |
| **SOAP** | Legacy web services | See respective guide |
| **OAuth** | Secured API calls | See respective guide |
| **Error handling** | Retry logic | See respective guide |

---

## Quick Decision Guide

| Question | Answer | Use |
|----------|--------|-----|
| Is this an existing instance? | Yes | [CLASSIC.md](CLASSIC.md) |
| Is this a new SDK project? | Yes | [FLUENT.md](FLUENT.md) |
| Do we use TypeScript? | Yes | [FLUENT.md](FLUENT.md) |
| Need REST API integration? | Yes | Both supported |
| Need SOAP integration? | Yes | Both supported |

---

## Key Differences at a Glance

### Classic: Instance Integration
```javascript
// Instance-based REST call
var rest = new sn_ws.RESTMessageV2('API', 'GET');
rest.setEndpoint('https://api.example.com/data');
var response = rest.execute();
var data = JSON.parse(response.getBody());
```

### Fluent: SDK Integration
```typescript
// SDK-based REST call with types
const rest = new RESTMessageV2('API', 'GET');
rest.setEndpoint('https://api.example.com/data');
const response = rest.execute();
const data: ApiResponse = JSON.parse(response.getBody());
```

---

## See Also

- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Advanced patterns and error handling
- **[CLASSIC.md](CLASSIC.md)** — Full reference for instance integrations
- **[FLUENT.md](FLUENT.md)** — Full reference for SDK integrations

---

## Simple REST API - GET/POST

**File:** `simple-rest-api.now.ts`

```typescript
import { RestApi } from '@servicenow/sdk/core'

export default RestApi({
    $id: Now.ID['simple_rest_api'],
    name: 'Simple Incident API',
    serviceId: 'simple_incident_api',
    description: 'Basic API for incident operations',
    consumes: 'application/json',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['api_get_incidents'],
            name: 'get_incidents',
            method: 'GET',
            script: Now.include('./api-handlers/get-incidents.server.js'),
        },

        {
            $id: Now.ID['api_create_incident'],
            name: 'create_incident',
            method: 'POST',
            script: Now.include('./api-handlers/create-incident.server.js'),
        },
    ],
})
```

---

## Modular REST API with CRUD Operations

**File:** `modular-rest-api.now.ts`

```typescript
import { RestApi } from '@servicenow/sdk/core'
import { getIncidentsHandler } from '../server/api-handlers/get-incidents.js'
import { createIncidentHandler } from '../server/api-handlers/create-incident.js'
import { updateIncidentHandler } from '../server/api-handlers/update-incident.js'
import { deleteIncidentHandler } from '../server/api-handlers/delete-incident.js'

export default RestApi({
    $id: Now.ID['modular_rest_api'],
    name: 'Modular Incident Management API',
    serviceId: 'incident_management_api',
    description: 'Complete incident management API with CRUD operations',
    consumes: 'application/json',
    produces: 'application/json',
    routes: [
        {
            $id: Now.ID['api_list_incidents'],
            name: 'list_incidents',
            method: 'GET',
            script: getIncidentsHandler,
        },

        {
            $id: Now.ID['api_create_incident'],
            name: 'create_incident',
            method: 'POST',
            script: createIncidentHandler,
        },

        {
            $id: Now.ID['api_update_incident'],
            name: 'update_incident',
            method: 'PUT',
            path: '/:incident_id',
            script: updateIncidentHandler,
        },

        {
            $id: Now.ID['api_delete_incident'],
            name: 'delete_incident',
            method: 'DELETE',
            path: '/:incident_id',
            script: deleteIncidentHandler,
        },
    ],
})
```

**File:** `api-handlers/get-incidents.js`

```javascript
export function getIncidentsHandler() {
    var response = {
        status: 'success',
        count: 0,
        incidents: []
    };

    try {
        var incidentGr = new GlideRecord('incident');

        // Add filters from query parameters
        if (request.uri.parameters.active) {
            incidentGr.addQuery('active', request.uri.parameters.active);
        }

        if (request.uri.parameters.priority) {
            incidentGr.addQuery('priority', request.uri.parameters.priority);
        }

        if (request.uri.parameters.state) {
            incidentGr.addQuery('state', request.uri.parameters.state);
        }

        // Handle pagination
        var limit = parseInt(request.uri.parameters.limit) || 10;
        var offset = parseInt(request.uri.parameters.offset) || 0;

        incidentGr.orderByDesc('created_on');
        incidentGr.setLimit(limit);
        incidentGr.setStartRow(offset);
        incidentGr.query();

        while (incidentGr.next()) {
            response.incidents.push({
                sys_id: incidentGr.getValue('sys_id'),
                number: incidentGr.getValue('number'),
                short_description: incidentGr.getValue('short_description'),
                priority: incidentGr.getValue('priority'),
                state: incidentGr.getValue('state'),
                assignment_group: incidentGr.getValue('assignment_group'),
                created_on: incidentGr.getValue('created_on')
            });
        }

        response.count = response.incidents.length;
        response.offset = offset;
        response.limit = limit;

    } catch (error) {
        response.status = 'error';
        response.message = error.message;
    }

    return response;
}
```

**File:** `api-handlers/create-incident.js`

```javascript
export function createIncidentHandler() {
    var response = {
        status: 'success',
        message: 'Incident created successfully'
    };

    try {
        var body = request.body;

        // Validate required fields
        if (!body.short_description) {
            response.status = 'error';
            response.message = 'short_description is required';
            return response;
        }

        // Create new incident
        var incident = new GlideRecord('incident');
        incident.initialize();
        incident.short_description = body.short_description;
        incident.description = body.description || '';
        incident.category = body.category || 'general';
        incident.priority = body.priority || '3';
        incident.assignment_group = body.assignment_group || '';
        incident.assigned_to = body.assigned_to || '';

        var incidentId = incident.insert();

        response.incident = {
            sys_id: incidentId,
            number: incident.getValue('number'),
            short_description: incident.getValue('short_description'),
            state: incident.getValue('state'),
            created_on: incident.getValue('created_on')
        };

    } catch (error) {
        response.status = 'error';
        response.message = error.message;
    }

    return response;
}
```

---

## OAuth Token Management

**Use Case:** Secure API calls to external systems with OAuth authentication

```javascript
(function executeOAuthFlow() {
    var response = {
        status: 'success',
        data: null
    };

    try {
        // Initialize OAuth client
        var oauthClient = new sn_auth.GlideOAuthClient();
        oauthClient.setCredentialId('5b61c16f73533300f662cff8faf6a74b');

        // Get new access token (with automatic refresh if expired)
        var token = oauthClient.getNewAccessToken();
        var accessToken = token.getAccessToken();

        // Make API call with OAuth token
        var rest = new sn_ws.RESTMessageV2('ExternalAPI', 'GET');
        rest.setEndpoint('https://api.example.com/v1/data');
        rest.setHeader('Authorization', 'Bearer ' + accessToken);
        rest.setHeader('Content-Type', 'application/json');
        rest.setHttpTimeout(30000);

        var apiResponse = rest.execute();
        var statusCode = apiResponse.getStatusCode();

        if (statusCode === 200) {
            var responseBody = apiResponse.getBody();
            response.data = JSON.parse(responseBody);
        } else if (statusCode === 401) {
            // Token might be invalid, request new one
            var newToken = oauthClient.getNewAccessToken();
            // Retry the request...
            response.status = 'error';
            response.message = 'Authentication failed - token refreshed, please retry';
        } else {
            response.status = 'error';
            response.message = 'API call failed: ' + statusCode;
        }

    } catch (error) {
        response.status = 'error';
        response.message = error.message;
        gs.error('OAuth error: ' + error.message);
    }

    return response;
})();
```

---

## Error Handling and Retries

**Use Case:** Robust API integration with automatic retries and fallback handling

```javascript
(function executeWithRetry() {
    var MAX_RETRIES = 3;
    var RETRY_DELAY = 2000; // 2 seconds
    var response = {
        status: 'success',
        data: null,
        retries: 0
    };

    function makeRequest(attempt) {
        try {
            var rest = new sn_ws.RESTMessageV2('ExternalService', 'GET');
            rest.setEndpoint('https://api.example.com/v1/users');
            rest.setQueryParameter('page', '1');
            rest.setHttpTimeout(30000);

            var apiResponse = rest.execute();
            var statusCode = apiResponse.getStatusCode();

            // Success
            if (statusCode === 200) {
                response.data = JSON.parse(apiResponse.getBody());
                response.retries = attempt - 1;
                return true;
            }

            // Client error - don't retry
            if (statusCode >= 400 && statusCode < 500) {
                response.status = 'error';
                response.message = 'Client error: ' + statusCode;
                return false;
            }

            // Server error - retry if attempts remain
            if (statusCode >= 500) {
                if (attempt < MAX_RETRIES) {
                    gs.info('Server error ' + statusCode + ', retrying...');
                    // Wait before retry
                    java.lang.Thread.sleep(RETRY_DELAY);
                    return makeRequest(attempt + 1);
                } else {
                    response.status = 'error';
                    response.message = 'Server error after ' + MAX_RETRIES + ' retries: ' + statusCode;
                    return false;
                }
            }

            // Timeout - retry
            if (statusCode === 0) {
                if (attempt < MAX_RETRIES) {
                    gs.info('Request timeout, retrying...');
                    java.lang.Thread.sleep(RETRY_DELAY);
                    return makeRequest(attempt + 1);
                } else {
                    response.status = 'error';
                    response.message = 'Request timeout after ' + MAX_RETRIES + ' retries';
                    return false;
                }
            }

        } catch (error) {
            if (attempt < MAX_RETRIES) {
                gs.info('Request failed: ' + error.message + ', retrying...');
                java.lang.Thread.sleep(RETRY_DELAY);
                return makeRequest(attempt + 1);
            } else {
                response.status = 'error';
                response.message = 'Request failed after ' + MAX_RETRIES + ' retries: ' + error.message;
                return false;
            }
        }
    }

    makeRequest(1);
    return response;
})();
```

---

## SOAP Web Service Integration

**Use Case:** Call legacy SOAP services from external systems

```javascript
(function executeSOAPCall() {
    var response = {
        status: 'success',
        data: null
    };

    try {
        // Create SOAP message
        var soap = new sn_ws.SOAPMessageV2('WeatherService', 'GetWeather');

        // Set request body
        soap.setParameter('city', 'New York');
        soap.setParameter('country', 'USA');

        // Set authentication if needed
        soap.setAuthentication('basic', 'username', 'password');

        // Set timeout
        soap.setHttpTimeout(30000);

        // Execute SOAP request
        var soapResponse = soap.execute();

        // Parse SOAP response
        var statusCode = soapResponse.getStatusCode();

        if (statusCode === 200) {
            // Extract data from SOAP response
            var xmlDocument = soapResponse.getXML();

            // Parse XML (assuming ns is the namespace)
            var weather = xmlDocument.getElementsByTagName('weather');
            if (weather) {
                response.data = {
                    city: xmlDocument.selectSingleNode('//ns:city').getTextContent(),
                    temperature: xmlDocument.selectSingleNode('//ns:temperature').getTextContent(),
                    condition: xmlDocument.selectSingleNode('//ns:condition').getTextContent()
                };
            }
        } else {
            response.status = 'error';
            response.message = 'SOAP call failed: ' + statusCode;
            response.fault = soapResponse.getFault();
        }

    } catch (error) {
        response.status = 'error';
        response.message = 'SOAP error: ' + error.message;
        gs.error('SOAP integration error: ' + error.message);
    }

    return response;
})();
```

---

## Best Practices Demonstrated

✓ **Error Handling** - Try-catch with detailed error messages
✓ **Status Code Checking** - Validate response before parsing
✓ **JSON Parsing** - Safe parsing with error handling
✓ **Authentication** - OAuth and basic auth patterns
✓ **Retry Logic** - Automatic retries for transient failures
✓ **Timeout Management** - Setting appropriate timeouts
✓ **Logging** - Using gs.info() and gs.error()
✓ **Response Validation** - Checking required fields

---

## Common Patterns

| Pattern | Use When |
|---------|----------|
| Simple REST call | Quick integration, no complex logic |
| Modular handlers | Large API with many endpoints |
| OAuth | External system requires secure auth |
| Retry logic | Unreliable network or API |
| SOAP | Legacy system integration |

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for detailed API reference and advanced authentication patterns.
