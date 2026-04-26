---
name: servicenow-react-ui-components
user-invocable: false
description: Comprehensive guide for using @servicenow/react-components when building UI in ServiceNow Fluent React applications. Covers the full Horizon Design System component library, CSS Modules, design tokens, and styling patterns. Trigger this skill whenever the user is building any React UI for ServiceNow — UiPage components, workspace UIs, forms, lists, dashboards, or any custom interface that integrates with the platform. Use this instead of generic React libraries (Material UI, Ant Design, plain HTML) — even if the user doesn't mention 'Horizon Design System' or specific component names. Also use when styling or theming custom components to match the ServiceNow platform aesthetic.
---

# ServiceNow React UI Components

The `@servicenow/react-components` package provides React wrappers around ServiceNow's Horizon Design System (HDS) web components. Using these components is strongly preferred when building ServiceNow UIs because they ensure visual and behavioral consistency with the rest of the platform.

> **Always use these components instead of generic alternatives like Material UI, Ant Design, or plain HTML elements** when building ServiceNow UIs. The Horizon Design System is what ServiceNow itself uses throughout its product.

## Installation

The `@servicenow/react-components` package must be installed in the project. Add it to the `dependencies` section of `package.json` and run `npm install`.

```bash
npm install @servicenow/react-components --save
```

**Requirements:**
- Node.js >= 20.0.0
- React >= 18.0.0

The package.json must look like this (at minimum):

```json
{
  "dependencies": {
    "@servicenow/react-components": "latest"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

After modifying `package.json`, remind the user to run `npm install` to install the package.

## Component Categories

### 1. Form Components (Record-Based UI)

These components render ServiceNow record data. They **require a `RecordProvider` wrapper** to supply data.

| Component | Import | Purpose |
|-----------|--------|---------|
| `RecordProvider` | `@servicenow/react-components/RecordContext` | Loads record data and provides it to child components via context |
| `FormColumnLayout` | `@servicenow/react-components/FormColumnLayout` | Renders form sections/fields for the record |
| `FormActionBar` | `@servicenow/react-components/FormActionBar` | Displays Save, Delete, and other UI actions |
| `ActivityStream` | `@servicenow/react-components/ActivityStream` | Shows comments, work notes, email activity |
| `ActivityStreamCompose` | `@servicenow/react-components/ActivityStreamCompose` | Compose area for new activity items |
| `Attachments` | `@servicenow/react-components/Attachments` | Upload, download, manage record attachments |
| `RelatedLists` | `@servicenow/react-components/RelatedLists` | Tabbed related record lists |
| `Notifications` | `@servicenow/react-components/Notifications` | Alert notifications with priority sorting |
| `FormDataConnected` | `@servicenow/react-components/FormDataConnected` | Low-level data provider (use RecordProvider instead) |

### 2. List Components

| Component | Import | Purpose |
|-----------|--------|---------|
| `NowRecordListConnected` | `@servicenow/react-components/NowRecordListConnected` | Configurable paginated list of records |

### 3. Horizon Design System Components

See [COMPONENTS-REFERENCE.md](./COMPONENTS-REFERENCE.md) for full details on each component below.

**Layout & Containers:** `Accordion`/`AccordionItem`, `Card`, `Collapse`, `Tabs`, `Modal`

**Typography:** `Heading`, `RichText`, `StylizedText`, `TextLink`, `LabelValue`, `LabelValueStacked`, `HighlightedValue`

**Buttons & Actions:** `Button`, `ButtonBare`, `ButtonIconic`, `ButtonStateful`, `SplitButton`, `Dropdown`

**Form Inputs:** `Input`, `InputUrl`, `Select`, `Typeahead`, `TypeaheadMulti`, `Checkbox`, `Toggle`, `RadioButtons`, `Textarea`, `DateTime`

**Feedback:** `Alert`, `Loader`, `ProgressBar`, `Badge`, `Tooltip`

**Media & Icons:** `Avatar`, `Icon`, `Illustration`, `Image`

**Navigation:** `Breadcrumbs`, `ContentTree`

**Empty States:** `TemplateMessage`

---

## Critical Rules

### RecordProvider is Required for Form Components

All of these components — `FormColumnLayout`, `FormActionBar`, `ActivityStream`, `ActivityStreamCompose`, `Attachments`, `RelatedLists` — **must be wrapped in a single `RecordProvider`** for a given record. Never create multiple `RecordProvider` instances for the same record, and never nest `RecordProvider` components.

```tsx
// CORRECT: Single RecordProvider
<RecordProvider table="incident" sysId="46d44a13c611228801a8a82677c7b8fe">
  <FormActionBar />
  <FormColumnLayout />
  <ActivityStreamCompose />
  <ActivityStream style={{flex: 1}} />
  <Attachments />
  <RelatedLists />
</RecordProvider>

// WRONG: Multiple RecordProviders for same record
<RecordProvider table="incident" sysId="abc">
  <FormColumnLayout />
</RecordProvider>
<RecordProvider table="incident" sysId="abc"> {/* Never do this */}
  <FormActionBar />
</RecordProvider>
```

### Creating a New Record

Pass `"-1"` as `sysId` when creating a new record. Never pass `null`, `undefined`, or a custom-generated ID.

```tsx
<RecordProvider table="incident" sysId="-1">
  <FormActionBar />
  <FormColumnLayout />
</RecordProvider>
```

### Accessing Record Data with useRecord

Inside any child of `RecordProvider`, use the `useRecord()` hook:

```tsx
import {useRecord} from '@servicenow/react-components';

function MyChild() {
  const {form, header, actions, notifications, isLoading, table, sysId} = useRecord();
  const fields = form.data.fields;
  const isDirty = form.isDirty;
  const primaryValue = header.data.primaryValue;
  return <div>{isLoading ? 'Loading...' : header.data.recordDisplayValue}</div>;
}
```

### FormActionBar Needs a Container with Width

```tsx
<div style={{width: '100%'}}>
  <FormActionBar onUiActionBarClicked={e => console.log(e.detail.payload)} />
</div>
```

### ActivityStream Layout

Place `ActivityStreamCompose` above `ActivityStream`. Give `ActivityStream` sufficient height for its internal scrollbar.

```tsx
<ActivityStreamCompose />
<ActivityStream style={{flex: 1}} />
```

### NowRecordListConnected Event Payload

Event payload is nested at `event.detail.payload`, not `event.detail`:

```tsx
onRowClicked={e => {
  const { sys_id, table } = e.detail.payload; // CORRECT
  // NOT: e.detail.sys_id  ← WRONG
}}
```

---

## Complete Form Example

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

## Complete List Example

```tsx
import React from 'react';
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
        const {sys_id, table} = e.detail.payload;
        console.log('Clicked:', sys_id, table);
      }}
    />
  );
}
```

## HDS Component Examples

For complete HDS component documentation with all props, see [COMPONENTS-REFERENCE.md](./COMPONENTS-REFERENCE.md).

Quick examples for common patterns:

```tsx
import {Button} from '@servicenow/react-components/Button';
import {Modal} from '@servicenow/react-components/Modal';
import {Tabs} from '@servicenow/react-components/Tabs';
import {Card} from '@servicenow/react-components/Card';
import {Alert} from '@servicenow/react-components/Alert';
import {Heading} from '@servicenow/react-components/Heading';
import {Input} from '@servicenow/react-components/Input';
import {Select} from '@servicenow/react-components/Select';
import {Toggle} from '@servicenow/react-components/Toggle';
import {Badge} from '@servicenow/react-components/Badge';
import {Accordion} from '@servicenow/react-components/Accordion';
import {AccordionItem} from '@servicenow/react-components/AccordionItem';

// Button
<Button label="Save" variant="primary" size="md" onClicked={e => console.log(e.detail)} />

// Alert
<Alert status="info" header="Note" content="Your changes were saved." action={{type: 'dismiss'}} />

// Heading
<Heading label="Page Title" level={1} variant="header-primary" />

// Badge
<Badge value={5} color="critical" variant="primary" />

// Accordion
<Accordion headingLevel={3}>
  <AccordionItem header="Details">
    <div slot="content">Content here</div>
  </AccordionItem>
</Accordion>
```

## Component Reference Files

Load the relevant reference file for detailed props, examples, and patterns:

| When you need... | Read this |
|-----------------|-----------|
| RecordProvider, FormColumnLayout, FormActionBar, ActivityStream, Attachments, RelatedLists, Notifications | [FORM-COMPONENTS.md](./FORM-COMPONENTS.md) |
| NowRecordListConnected (paginated record list) | [LIST-COMPONENTS.md](./LIST-COMPONENTS.md) |
| Accordion, Card, Tabs, Modal, Collapse | [LAYOUT-COMPONENTS.md](./LAYOUT-COMPONENTS.md) |
| Button, ButtonBare, ButtonIconic, ButtonStateful, SplitButton, Dropdown | [BUTTON-ACTION-COMPONENTS.md](./BUTTON-ACTION-COMPONENTS.md) |
| Input, Textarea, Select, Typeahead, Checkbox, Toggle, RadioButtons, DateTime | [INPUT-COMPONENTS.md](./INPUT-COMPONENTS.md) |
| Alert, Loader, ProgressBar, Tooltip, Heading, Badge, HighlightedValue, LabelValue, Avatar, Icon, Breadcrumbs, TemplateMessage | [FEEDBACK-DISPLAY-COMPONENTS.md](./FEEDBACK-DISPLAY-COMPONENTS.md) |
| Full import list and event pattern cheatsheet | [COMPONENTS-REFERENCE.md](./COMPONENTS-REFERENCE.md) |
| CSS Modules setup, Horizon design tokens, custom component styling, theming | [STYLING.md](./STYLING.md) |
| **Horizon Design System theming:** token categories, color roles, layout patterns, controls, dark mode | [ui-page-theming-guide.md](./ui-page-theming-guide.md) |
| **UI Page patterns:** dirty state management, field extraction, service layer, CSS constraints, build system | [ui-page-patterns-guide.md](./ui-page-patterns-guide.md) |
| Complete working examples (form, list, dashboard, styled components, modal) | [EXAMPLES.md](./EXAMPLES.md) |
