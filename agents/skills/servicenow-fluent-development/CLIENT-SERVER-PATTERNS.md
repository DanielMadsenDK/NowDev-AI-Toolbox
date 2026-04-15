# Client-Server Communication Patterns

## GlideAjax — Full Implementation Pattern

### 1. Server-Side JavaScript (`.server.js`)

```js
// src/fluent/script-includes/MyClass.server.js
// CRITICAL: Must use Object.extendsObject(global.AbstractAjaxProcessor)
var MyClass = Class.create();
MyClass.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getDataForClient: function() {
    var data = this.getData();
    return JSON.stringify(data);  // Always return JSON string
  },

  updateRecordForClient: function() {
    var recordId = this.getParameter('sysparm_record_id');
    var result = this.updateRecord(recordId);
    return JSON.stringify(result);
  },

  type: 'MyClass'  // MUST match class name and .now.ts name field
});
```

### 2. Fluent ScriptInclude Definition (`.now.ts`)

```ts
// src/fluent/script-includes/MyClass.now.ts
export const myClass = ScriptInclude({
  $id: Now.ID['si.my_class'],
  name: 'MyClass',
  apiName: 'x_scope.MyClass',  // CRITICAL: Full scoped API name
  script: Now.include('./MyClass.server.js'),
  description: 'Description of MyClass',
  callerAccess: 'tracking',   // REQUIRED
  clientCallable: true,       // REQUIRED
  mobileCallable: true,       // REQUIRED
  sandboxCallable: true,      // REQUIRED
  accessibleFrom: 'public',   // REQUIRED (not 'package_private')
  active: true                // REQUIRED
})
```

### 3. TypeScript Service Layer (client-side)

```ts
// src/client/services/MyService.ts
export class MyService {
  // CRITICAL: Must match apiName in .now.ts
  private scriptInclude = 'x_scope.MyClass'

  async getData(): Promise<MyData[]> {
    return new Promise((resolve, reject) => {
      const ga = new GlideAjax(this.scriptInclude)
      ga.addParam('sysparm_name', 'getDataForClient')
      ga.getXMLAnswer((response: string) => {
        try { resolve(JSON.parse(response)) }
        catch (e) { reject(new Error('Failed to parse response')) }
      })
    })
  }

  async updateRecord(recordId: string): Promise<UpdateResult> {
    return new Promise((resolve, reject) => {
      const ga = new GlideAjax(this.scriptInclude)
      ga.addParam('sysparm_name', 'updateRecordForClient')
      ga.addParam('sysparm_record_id', recordId)
      ga.getXMLAnswer((response: string) => {
        try { resolve(JSON.parse(response)) }
        catch (e) { reject(new Error('Failed to update')) }
      })
    })
  }
}
```

### 4. global.d.ts Type Declarations

```ts
// src/client/global.d.ts
declare global {
  interface Window { g_ck: string }
  class GlideAjax {
    constructor(scriptInclude: string)
    addParam(name: string, value: string): void
    getXMLAnswer(callback: (response: string) => void): void
  }
}
```

---

## REST API — Full Implementation Pattern

### 1. REST API Definition (`.now.ts`)

```ts
// src/fluent/rest-api/my-api.now.ts
import '@servicenow/sdk/global'
import { RestApi, script } from '@servicenow/sdk/core'

export const myApi = RestApi({
  $id: Now.ID['api.my_api'],
  name: 'My API',
  serviceId: 'my_api',
  consumes: 'application/json',
  routes: [{
    $id: Now.ID['route.get_data'],
    name: 'get-data',
    method: 'GET',
    script: script`
      (function(request, response) {
        var myClass = new MyClass();
        response.setBody(myClass.getData());
      })(request, response)
    `
  }, {
    $id: Now.ID['route.update'],
    name: 'update',
    method: 'POST',
    script: script`
      (function(request, response) {
        var body = request.body.data;
        var myClass = new MyClass();
        response.setBody(myClass.updateRecord(body.recordId));
      })(request, response)
    `
  }]
})
```

### 2. TypeScript Service Layer (client-side)

```ts
// src/client/services/MyService.ts
export class MyService {
  private apiUrl = '/api/x_scope/my_api'

  async getData(): Promise<MyData[]> {
    const response = await fetch(this.apiUrl + '/get-data', {
      headers: { 'X-UserToken': window.g_ck, 'Accept': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to fetch')
    return (await response.json()).result
  }

  async updateRecord(recordId: string): Promise<UpdateResult> {
    const response = await fetch(this.apiUrl + '/update', {
      method: 'POST',
      headers: { 'X-UserToken': window.g_ck, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId })
    })
    if (!response.ok) throw new Error('Failed to update')
    return response.json()
  }
}

// TypeScript declaration
declare global { interface Window { g_ck: string } }
```

**Handle ServiceNow's dual-value field format:**
```ts
const getValue = (field: any) => typeof field === 'object' ? field.value : field
const getDisplay = (field: any) => typeof field === 'object' ? field.display_value : field
```

**Table API endpoints:** `/api/now/table/{tableName}` — GET (list), POST (create), GET `/{sys_id}` (read), PATCH `/{sys_id}` (update), DELETE `/{sys_id}`

---

## Essential React Patterns

### HTML Entry (`src/client/index.html`)

```html
<sdk:now-ux-globals></sdk:now-ux-globals>  <!-- Required: provides window.g_ck and GlideAjax -->
<script src="./main.tsx" type="module"></script>
<div id="root"></div>
```

### React Bootstrap (`src/client/main.tsx`)

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
```

### Navigation Module for UI Page

```ts
Record({
  table: 'sys_app_module',
  data: {
    title: 'My Page', application: menu.$id, active: true,
    link_type: 'DIRECT', query: 'x_app_page.do', order: 100
  }
})
```

---

## Lazy / On-Demand GlideAjax Fetching

Not all data needs to be loaded upfront. For expensive or rarely-needed fields (e.g. large script
bodies, long descriptions), fetch them only when the user actually requests them. This keeps
initial load fast and avoids transferring data that may never be viewed.

### Pattern: fast bulk load + deferred detail fetch

**Server side — two separate methods:**

```js
// MyClass.server.js
var MyClass = Class.create();
MyClass.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

  // Fast: returns lightweight list (omits heavy fields)
  getItems: function() {
    var items = [];
    var gr = new GlideRecord('my_table');
    gr.query();
    while (gr.next()) {
      items.push({
        sys_id:  gr.getUniqueValue(),
        name:    gr.getValue('name'),
        active:  gr.getValue('active') === '1',
      });
    }
    return JSON.stringify(items);
  },

  // Deferred: fetches one heavy field by sys_id
  getDetail: function() {
    var sysId = this.getParameter('sysparm_sys_id');
    var gr = new GlideRecord('my_table');
    if (!gr.get(sysId)) return JSON.stringify({ error: 'Not found' });
    return JSON.stringify({ detail: gr.getValue('large_field') });
  },

  type: 'MyClass'
});
```

**Client side — React with `useEffect` keyed on selection:**

```ts
// services/MyService.ts
const SI = 'x_scope.MyClass'

export async function getItems(): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const ga = new GlideAjax(SI)
    ga.addParam('sysparm_name', 'getItems')
    ga.getXMLAnswer(r => { try { resolve(JSON.parse(r)) } catch { reject(new Error('Parse error')) } })
  })
}

export async function getDetail(sysId: string): Promise<{ detail: string }> {
  return new Promise((resolve, reject) => {
    const ga = new GlideAjax(SI)
    ga.addParam('sysparm_name', 'getDetail')
    ga.addParam('sysparm_sys_id', sysId)
    ga.getXMLAnswer(r => { try { resolve(JSON.parse(r)) } catch { reject(new Error('Parse error')) } })
  })
}
```

```tsx
// In a React component — fetch detail only when a row is selected
const [detail, setDetail] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
const [error, setError]   = useState<string | null>(null)

useEffect(() => {
  setDetail(null)
  setError(null)
  if (!selectedId) return          // nothing selected — skip

  setLoading(true)
  getDetail(selectedId)
    .then(data => setDetail(data.detail))
    .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
    .finally(() => setLoading(false))
}, [selectedId])               // re-runs only when the selected item changes
```

### When to use this pattern

| Condition | Recommendation |
|---|---|
| Field is large (script body, HTML, long text) | Always defer |
| Field is needed on every item in a list | Include in bulk load |
| User may never open the detail view | Always defer |
| Initial page load performance matters | Split bulk + deferred |

---

## Service Portal Widget Communication

Service Portal widgets use a built-in `c.server` mechanism instead of GlideAjax or REST APIs.
**Never use GlideAjax in widgets** — use `c.server.get()` instead.

### Server Script (`server_script.js`)

```js
(function() {
  // Initial load — populate data for the client
  data.records = [];
  data.message = '';

  if (input && input.action === 'refresh') {
    // Handle client request (c.server.get)
    var gr = new GlideRecord(options.table || 'incident');
    gr.addQuery('active', true);
    gr.setLimit(options.max_records || 25);
    gr.query();
    while (gr.next()) {
      data.records.push({
        sys_id: gr.getUniqueValue(),
        name: gr.getValue('short_description')
      });
    }
    return;
  }

  // Default load
  data.title = 'My Widget';
})();
```

### Client Script (`client_script.js`)

```js
api.controller = function() {
  var c = this;

  c.loading = false;

  c.refresh = function() {
    c.loading = true;
    c.server.get({ action: 'refresh' }).then(function(response) {
      c.data.records = response.data.records;
      c.loading = false;
    });
  };
};
```

### Communication Methods

| Method | Behavior | Use Case |
|---|---|---|
| `c.server.get(input)` | Sends `input` to server, returns response (does not modify `c.data` automatically) | Fetching data without overwriting client state |
| `c.server.update()` | Sends current `c.data` as `input` to server, updates `c.data` with response | Submitting form data or saving changes |
| `c.server.refresh()` | Re-executes server script with no input, replaces `c.data` entirely | Full widget reload |
