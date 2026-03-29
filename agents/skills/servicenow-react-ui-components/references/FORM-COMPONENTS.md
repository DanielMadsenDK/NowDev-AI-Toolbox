# Form Components — @servicenow/react-components

Components for displaying and editing ServiceNow records. All require a `RecordProvider` wrapper (except `FormDataConnected` and `Notifications` used standalone).

---

## RecordProvider

Hook-based provider that loads a ServiceNow record and exposes it to all children via context.

```tsx
import {RecordProvider} from '@servicenow/react-components/RecordContext';

<RecordProvider table="incident" sysId="46d44a13c611228801a8a82677c7b8fe">
  {/* All form components go here */}
</RecordProvider>
```

**Key props:** `table` (required), `sysId` (required — use `"-1"` for new records)

**Rules:**
- Never nest `RecordProvider` inside another `RecordProvider`
- Never create two `RecordProvider` instances for the same record — wrap all components for one record in a single provider
- For new records, always use `sysId="-1"` (never `null`, `undefined`, or a custom ID)

**useRecord() hook** (available to any child component):

```tsx
import {useRecord} from '@servicenow/react-components';

function MyChild() {
  const {form, header, actions, notifications, isLoading, table, sysId} = useRecord();

  // Form data
  const fields = form.data.fields;
  const isDirty = form.isDirty;

  // Header
  const title = header.data.recordDisplayValue;
  const primaryValue = header.data.primaryValue;

  // Notifications
  notifications.addNotification({type: 'success', message: 'Saved!'});
  notifications.addNotification({type: 'error', message: 'Failed!'});

  return <div>{isLoading ? 'Loading...' : title}</div>;
}
```

---

## FormColumnLayout

Renders the form fields and sections for the record. Data comes from `RecordProvider`.

```tsx
import {FormColumnLayout} from '@servicenow/react-components/FormColumnLayout';

<FormColumnLayout
  labelValueLayout="stacked"  // or "tabbed"
  isSectionTitleHidden={false}
  onPreviewRecord={e => {
    const {table, sysId} = e.detail.payload;
    console.log('preview record', table, sysId);
  }}
/>
```

All field/section data is auto-supplied by `RecordProvider`. Most props are optional overrides.

**Key optional props:** `labelValueLayout` (`'stacked'` | `'tabbed'`), `isSectionTitleHidden`, `disableCollapse`, `isContextMenuHidden`, `sectionHeadingLevel`

---

## FormActionBar

Renders the Save, Delete, and custom UI action buttons. Must be placed inside a container with explicit width.

```tsx
import {FormActionBar} from '@servicenow/react-components/FormActionBar';

<div style={{width: '100%'}}>
  <FormActionBar
    onUiActionBarClicked={e => {
      const {actionSysId, options} = e.detail.payload;
      console.log('action clicked', actionSysId);
    }}
  />
</div>
```

> Wrap in a container with a defined width — the action bar relies on its container's width to render correctly.

---

## ActivityStream

Shows comments, work notes, emails, and other activity entries for the record. Give it enough height to display its internal scrollbar.

```tsx
import {ActivityStream} from '@servicenow/react-components/ActivityStream';

<ActivityStream
  style={{flex: 1}}  // or minHeight: '300px'
  onPreviewRecord={e => console.log(e.detail.payload)}
/>
```

**Best practice:** Place `ActivityStreamCompose` above `ActivityStream`. Do not give them the same height — Compose is small, Stream needs room to scroll.

---

## ActivityStreamCompose

Input area for adding new comments, work notes, and other activity entries.

```tsx
import {ActivityStreamCompose} from '@servicenow/react-components/ActivityStreamCompose';

{/* Always put compose ABOVE the stream */}
<ActivityStreamCompose />
<ActivityStream style={{flex: 1}} />
```

---

## Attachments

Upload, download, rename, and delete record attachments.

```tsx
import {Attachments} from '@servicenow/react-components/Attachments';

<Attachments
  mode="full"  // or "compact"
  isAttachmentUploadDisabled={false}
  isAttachmentEditDisabled={false}
  isReadOnly={false}
  onAttachmentUploadSucceeded={e => console.log('uploaded', e.detail.payload)}
  onAttachmentDeleteSucceeded={e => console.log('deleted', e.detail.payload)}
  onAttachmentPreviewed={e => console.log('previewed', e.detail.payload)}
  onAttachmentDownloaded={e => console.log('downloaded', e.detail.payload)}
/>
```

**Props:** `mode` (`'full'` | `'compact'`), `isAttachmentUploadDisabled`, `isAttachmentEditDisabled`, `isReadOnly`

---

## RelatedLists

Tabbed display of related record lists for the current record.

```tsx
import {RelatedLists} from '@servicenow/react-components/RelatedLists';

<RelatedLists
  limit={5}
  onRowClicked={e => {
    const {sys_id, table} = e.detail.payload;  // nested in payload
    console.log('row clicked', sys_id);
  }}
  onSelectedRecordCountUpdated={e => console.log(e.detail.payload)}
/>
```

Emits the same events as `NowRecordListConnected`. See [LIST-COMPONENTS.md](LIST-COMPONENTS.md) for event payload types.

---

## Notifications

Display and manage alert notifications. `RecordProvider` includes notifications automatically — you don't need this unless you're outside a `RecordProvider`.

```tsx
import {NotificationsProvider, Notifications, useNotifications} from '@servicenow/react-components/Notifications';
import {useRecord} from '@servicenow/react-components';
```

### Inside RecordProvider — use useRecord().notifications

```tsx
function MyFormComponent() {
  const {notifications} = useRecord();

  return (
    <button onClick={() => notifications.addNotification({type: 'success', message: 'Done!'})}>
      Save
    </button>
  );
}
```

### Outside RecordProvider — use NotificationsProvider + Notifications

```tsx
function MyStandalonePage() {
  return (
    <NotificationsProvider>
      <Notifications />
      <MyComponent />
    </NotificationsProvider>
  );
}

function MyComponent() {
  const {addNotification, clearNotifications} = useNotifications();
  return <button onClick={() => addNotification({type: 'info', message: 'Hello!'})}>Notify</button>;
}
```

### Unified page notifications

Wrap entire page with `NotificationsProvider` — `RecordProvider` detects and uses the parent:

```tsx
<NotificationsProvider>
  <Notifications />   {/* Single notifications area for whole page */}
  <PageHeader />
  <RecordProvider table="incident" sysId="...">
    {/* RecordProvider detects parent NotificationsProvider */}
    <FormActionBar />
    <FormColumnLayout />
  </RecordProvider>
</NotificationsProvider>
```

> **NEVER** manually add `<Notifications />` inside a `RecordProvider`'s children — it creates duplicates.

**Notification types:** `'info'` | `'error'` | `'warning'` | `'success'` | `'suggestion'` | `'mandatory_error'` | `'field_error'`

---

## FormDataConnected

Low-level data provider. Prefer `RecordProvider` unless you need direct event control or a custom state system.

```tsx
import {FormDataConnected} from '@servicenow/react-components/FormDataConnected';

<FormDataConnected
  table="incident"
  sysId="46d44a13c611228801a8a82677c7b8fe"
  view="workspace"
  workspaceConfigId="7b24ceae5304130084acddeeff7b12a3"
  onFetchStarted={e => console.log('loading...')}
  onFetchSuccess={e => console.log('loaded', e.detail)}
  onFormSubmitCompleted={e => console.log('submitted', e.detail.payload)}
>
  <div>Your custom UI here</div>
</FormDataConnected>
```

---

## Complete Form Layout Example

```tsx
import React from 'react';
import {RecordProvider} from '@servicenow/react-components/RecordContext';
import {FormActionBar} from '@servicenow/react-components/FormActionBar';
import {FormColumnLayout} from '@servicenow/react-components/FormColumnLayout';
import {ActivityStreamCompose} from '@servicenow/react-components/ActivityStreamCompose';
import {ActivityStream} from '@servicenow/react-components/ActivityStream';
import {Attachments} from '@servicenow/react-components/Attachments';
import {RelatedLists} from '@servicenow/react-components/RelatedLists';

export default function IncidentForm({sysId}: {sysId: string}) {
  return (
    <RecordProvider table="incident" sysId={sysId}>
      <div style={{width: '100%'}}>
        <FormActionBar />
      </div>
      <FormColumnLayout />
      <ActivityStreamCompose />
      <ActivityStream style={{flex: 1}} />
      <Attachments />
      <RelatedLists limit={5} />
    </RecordProvider>
  );
}
```
