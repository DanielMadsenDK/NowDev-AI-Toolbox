# HTTP Integrations - Examples

This file keeps Classic ServiceNow HTTP integration examples only. For Fluent SDK REST metadata, use the installed SDK docs:

```bash
now-sdk explain --list rest
now-sdk explain restapi-api --format raw
now-sdk explain scripted-rest-api-guide --format raw
```

## Classic RESTMessageV2 GET

```javascript
var rest = new sn_ws.RESTMessageV2('Example API', 'GET');
rest.setEndpoint('https://api.example.com/data');
rest.setRequestHeader('Accept', 'application/json');

var response = rest.execute();
var status = response.getStatusCode();
var body = response.getBody();

if (status >= 200 && status < 300) {
    var payload = JSON.parse(body);
    gs.info('Received ' + payload.length + ' records');
} else {
    gs.error('API call failed with status ' + status + ': ' + body);
}
```

## Classic RESTMessageV2 POST

```javascript
var rest = new sn_ws.RESTMessageV2('Example API', 'POST');
rest.setEndpoint('https://api.example.com/items');
rest.setRequestHeader('Content-Type', 'application/json');
rest.setRequestBody(JSON.stringify({ short_description: 'Created from ServiceNow' }));

var response = rest.execute();
if (response.getStatusCode() >= 300) {
    gs.error('Create failed: ' + response.getBody());
}
```

## See Also

- [BEST_PRACTICES.md](BEST_PRACTICES.md) for error handling, retries, and secrets guidance.
- [CLASSIC.md](CLASSIC.md) for instance-based REST/SOAP details.
- `now-sdk explain --list rest` for Fluent SDK REST metadata.
