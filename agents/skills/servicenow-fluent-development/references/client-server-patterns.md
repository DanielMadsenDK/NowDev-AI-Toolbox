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
