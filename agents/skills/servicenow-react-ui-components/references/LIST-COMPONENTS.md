# List Components — @servicenow/react-components

---

## NowRecordListConnected

Configurable paginated list of records from a ServiceNow table.

```tsx
import {NowRecordListConnected} from '@servicenow/react-components/NowRecordListConnected';

export default function IncidentList() {
  return (
    <NowRecordListConnected
      table="incident"
      listTitle="Incidents"
      columns="number,short_description,priority,state,assigned_to"
      limit={20}
      view="workspace"
      onRowClicked={e => {
        const {sys_id, table} = e.detail.payload;  // CORRECT: nested in payload
        console.log('Clicked:', sys_id, 'in', table);
      }}
      onRefreshRequested={e => console.log('Refreshed', e.detail.payload)}
      onNewActionClicked={e => console.log('New', e.detail.payload)}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `table` | `string` | Yes | Table to query |
| `listTitle` | `string` | Yes | Title shown above the list |
| `limit` | `number` | No | Page size |
| `view` | `string` | No | View name (e.g. `'workspace'`) |
| `columns` | `string` | No | Comma-separated column names |
| `hideHeader` | `boolean` | No | Hide the list header |
| `hideQuickEdit` | `boolean` | No | Disable quick edit |
| `hideInlineEditing` | `boolean` | No | Disable inline editing |
| `hideRowSelector` | `boolean` | No | Hide row checkboxes |

## Events

> **IMPORTANT:** All event payloads are nested at `event.detail.payload`, not `event.detail` directly.

| Callback | Triggered when |
|----------|----------------|
| `onRowClicked` | User clicks a row |
| `onNewActionClicked` | User clicks the New button |
| `onRefreshRequested` | List is refreshed |
| `onQueryUpdated` | Query/filter changes |
| `onSelectedRecordCountUpdated` | Row selection changes |
| `onDataFetchRequested` | Data fetch is initiated |
| `onDataFetchSucceeded` | Data fetch completes |

### Row click payload

```tsx
onRowClicked={e => {
  const payload = e.detail.payload;
  const sys_id = payload.sys_id;       // record sys_id
  const table = payload.table;         // table name
  const row = payload.row;             // full row data
  // payload.row.rowData — Map of column values (only if you need column values)
}}
```

### Common patterns

```tsx
// Navigate to a record when a row is clicked
onRowClicked={e => {
  const {sys_id, table} = e.detail.payload;
  setSelectedRecord({table, sysId: sys_id});
}}

// Show a "New" form
onNewActionClicked={e => {
  setShowNewForm(true);
}}

// Handle query changes (e.g. for analytics)
onQueryUpdated={e => {
  const {query, table} = e.detail.payload;
  console.log('Filter changed to:', query);
}}
```

## List + Form pattern

A common pattern is to show a list and then display the clicked record in a form:

```tsx
import React, {useState} from 'react';
import {NowRecordListConnected} from '@servicenow/react-components/NowRecordListConnected';
import {RecordProvider} from '@servicenow/react-components/RecordContext';
import {FormActionBar} from '@servicenow/react-components/FormActionBar';
import {FormColumnLayout} from '@servicenow/react-components/FormColumnLayout';

export default function IncidentPage() {
  const [selected, setSelected] = useState<{table: string; sysId: string} | null>(null);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)}>← Back to list</button>
        <RecordProvider table={selected.table} sysId={selected.sysId}>
          <div style={{width: '100%'}}>
            <FormActionBar />
          </div>
          <FormColumnLayout />
        </RecordProvider>
      </div>
    );
  }

  return (
    <NowRecordListConnected
      table="incident"
      listTitle="Incidents"
      limit={20}
      view="workspace"
      onRowClicked={e => {
        const {sys_id, table} = e.detail.payload;
        setSelected({table, sysId: sys_id});
      }}
    />
  );
}
```
