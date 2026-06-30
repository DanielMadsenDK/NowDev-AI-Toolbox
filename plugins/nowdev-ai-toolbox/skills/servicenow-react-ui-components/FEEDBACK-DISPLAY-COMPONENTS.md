# Feedback, Display & Typography Components — @servicenow/react-components

---

## Alert

Notification banner with severity levels, dismiss/acknowledge actions, and auto-dismiss.

```tsx
import {Alert} from '@servicenow/react-components/Alert';

{/* Dismissable info */}
<Alert
  status="info"
  header="Information"
  content="Your changes were saved."
  action={{type: 'dismiss'}}
  onActionClicked={e => setShowAlert(false)}
/>

{/* Warning with acknowledge */}
<Alert
  status="warning"
  header="Warning"
  content="This action cannot be undone."
  action={{type: 'acknowledge', label: 'I understand'}}
  onActionClicked={e => setShowAlert(false)}
/>

{/* Error */}
<Alert
  status="critical"
  header="Error"
  content="Failed to connect to the server."
  action={{type: 'dismiss'}}
/>

{/* Auto-dismissing success */}
<Alert
  status="positive"
  header="Success"
  content="Record saved!"
  autoDismissConfig={{enableAutoDismiss: true, duration: 3000, showTimer: true}}
  onAutoDismiss={() => setShowAlert(false)}
/>

{/* With HTML content */}
<Alert
  status="info"
  content={{type: 'html', value: '<strong>Important:</strong> Please <a href="/help">click here</a>'}}
/>
```

### Status values

| Status | Color | Use for |
|--------|-------|---------|
| `critical` | Red | Errors, failures |
| `high` | Orange | High priority warnings |
| `warning` | Yellow | Cautions |
| `moderate` | Purple | Moderate notices |
| `info` | Blue | Informational messages |
| `positive` | Green | Success, completion |
| `low` | Gray | Low priority info |

### Action types

| Type | Appearance | Use for |
|------|-----------|---------|
| `dismiss` | X button | User can close |
| `acknowledge` | OK/custom button | Required acknowledgment |
| `open` | Link button | Opens a URL (requires `href`) |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | see above | `'info'` | Severity color |
| `header` | `string` | — | Alert title |
| `content` | `string \| {type, value}` | — | Alert message |
| `action` | `{type, label?, href?}` | — | Action button config |
| `autoDismissConfig` | `{enableAutoDismiss, duration?, showTimer?}` | — | Auto-dismiss settings |
| `icon` | `IconName` | per status | Override default icon |
| `expanded` | `boolean` | `false` | Expand overflow content |

---

## Loader

Animated loading indicator.

```tsx
import {Loader} from '@servicenow/react-components/Loader';

<Loader label="Loading data..." />
<Loader />  {/* No label */}
```

---

## ProgressBar

Linear progress indicator for ongoing processes.

```tsx
import {ProgressBar} from '@servicenow/react-components/ProgressBar';

<ProgressBar value={65} label="Upload progress" />
<ProgressBar value={progress} />  {/* 0-100 */}
```

---

## Tooltip

Contextual help text on hover/focus. Requires a `ref` to the target element.

```tsx
import {Tooltip} from '@servicenow/react-components/Tooltip';
import {useRef} from 'react';

const btnRef = useRef(null);

<button ref={btnRef}>Hover me</button>
<Tooltip targetRef={btnRef.current} content="Click to save the record" />

{/* Custom position and delay */}
<Tooltip
  targetRef={btnRef.current}
  content="Help text here"
  position={['top-center bottom-center', 'bottom-center top-center']}
  delay={{show: 200, hide: 100}}
  offset={12}
/>

{/* Rich content tooltip */}
<Tooltip targetRef={btnRef.current}>
  <div>
    <strong>Details</strong>
    <p>More information here</p>
  </div>
</Tooltip>
```

**Props:** `targetRef`, `content`, `position`, `delay` (ms or `{show, hide}`), `offset`, `opened`, `onOpenedSet`

---

## Heading

Semantic heading elements with consistent platform styling. Use `label` prop — do **not** slot text as children.

```tsx
import {Heading} from '@servicenow/react-components/Heading';

<Heading label="Page Title" level={1} variant="header-hero" />
<Heading label="Section Header" level={2} variant="header-primary" />
<Heading label="Sub-section" level={3} variant="title-secondary" align="center" />
<Heading label="Card Title" level={4} variant="title-tertiary" hasNoMargin />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | **Required** heading text |
| `level` | `1-6` | `1` | HTML `<hX>` element |
| `variant` | see below | `'header-primary'` | Typography style |
| `align` | `'start'\|'center'\|'end'\|'justify'` | `'start'` | Text alignment |
| `hasNoMargin` | `boolean` | `false` | Remove bottom margin |

**Variants:** `header-hero`, `header-primary`, `header-secondary`, `header-tertiary`, `title-primary`, `title-secondary`, `title-tertiary`

---

## Badge

Numeric count/status indicator.

```tsx
import {Badge} from '@servicenow/react-components/Badge';

<Badge value={5} color="critical" variant="primary" />
<Badge value={42} color="info" size="lg" />
<Badge value={1000} round color="positive" />       // shows "1K"
<Badge value={99} character="+" color="warning" />   // shows "99+"
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | — | **Required** |
| `color` | see below | `'low'` | Badge color |
| `variant` | `'primary'\|'secondary'` | `'primary'` | Style variant |
| `size` | `'sm'\|'md'\|'lg'` | `'md'` | Badge size |
| `character` | `string` | `''` | Suffix character (e.g. `'+'`) |
| `round` | `boolean` | — | Abbreviate large numbers (K, M, B) |

**Colors:** `critical`, `high`, `moderate`, `warning`, `info`, `positive`, `low`, `magenta`, `pink`, `orange`, `yellow`, `brown`, `green`, `green-yellow`, `blue`, `gray`, `teal`, `purple`

---

## HighlightedValue

Text chip with colored background — good for priority/status labels.

```tsx
import {HighlightedValue} from '@servicenow/react-components/HighlightedValue';

<HighlightedValue label="P1" color="critical" size="sm" />
<HighlightedValue label="Active" color="positive" size="md" />
<HighlightedValue label="Pending" color="warning" />
```

---

## LabelValue / LabelValueStacked

Display label-value pairs in a form-like layout.

```tsx
import {LabelValue} from '@servicenow/react-components/LabelValue';
import {LabelValueStacked} from '@servicenow/react-components/LabelValueStacked';

{/* Single inline pair */}
<LabelValue label="Priority" value="High" />

{/* Multiple stacked pairs */}
<LabelValueStacked
  items={[
    {label: 'State', value: 'Open'},
    {label: 'Priority', value: 'P1'},
    {label: 'Assigned to', value: 'Alice Johnson'}
  ]}
/>
```

---

## RichText

Renders sanitized HTML content safely.

```tsx
import {RichText} from '@servicenow/react-components/RichText';

<RichText content="<p>Hello <strong>world</strong></p>" />
<RichText content={record.description} />
```

---

## TextLink

Styled hyperlink element.

```tsx
import {TextLink} from '@servicenow/react-components/TextLink';

<TextLink label="View record" href="/record/123" />
<TextLink label="Documentation" href="https://docs.example.com" opensWindow underlined />
```

---

## StylizedText

Text with advanced CSS styling.

```tsx
import {StylizedText} from '@servicenow/react-components/StylizedText';
```

---

## Avatar

User profile picture with initials fallback and presence indicator.

```tsx
import {Avatar} from '@servicenow/react-components/Avatar';

<Avatar userName="Alice Johnson" imageSrc="/photos/alice.jpg" presence="available" size="md" />
<Avatar userName="Bob Smith" size="sm" />  {/* Shows initials "BS" */}
<Avatar userName="Jane Doe" presence="busy" size="lg" />
```

**Presence values:** `available`, `busy`, `away`, `offline`

---

## Icon

ServiceNow platform icon by name.

```tsx
import {Icon} from '@servicenow/react-components/Icon';

<Icon icon="gear-fill" size="md" />
<Icon icon="circle-check-outline" size="sm" />
<Icon icon="alert-fill" />
```

---

## Illustration

SVG illustration for empty states, onboarding, or visual feedback.

```tsx
import {Illustration} from '@servicenow/react-components/Illustration';

<Illustration illustration="no-results" />
```

---

## Image

Responsive image with fit mode options.

```tsx
import {Image} from '@servicenow/react-components/Image';

<Image src="/path/to/image.png" alt="Description" fit="cover" />
```

---

## TemplateMessage

Empty state component with illustration, heading, body text, and action buttons. Use for no-results screens, error states, or onboarding prompts.

```tsx
import {TemplateMessage, TemplateMessageActionClicked} from '@servicenow/react-components/TemplateMessage';

{/* No results */}
<TemplateMessage
  heading={{label: 'No results found', level: 4}}
  content="Try adjusting your filters or create a new record."
  illustration="no-search-results"
/>

{/* With actions */}
<TemplateMessage
  heading={{label: 'No incidents', level: 3}}
  content="Create an incident to get started."
  illustration="no-data"
  alignment="vertical-centered"
  actions={[
    {label: 'Create Incident', variant: 'primary', icon: 'add-outline'},
    {label: 'Learn More', variant: 'secondary'}
  ]}
  onActionClicked={e => {
    const {action} = e.detail.payload;
    if (action.label === 'Create Incident') setShowNewForm(true);
  }}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `heading` | `{label: string, level?: 1-6}` | — | **Required.** Primary heading |
| `content` | `string` | — | Supporting body text |
| `illustration` | see below | — | Illustration name |
| `alignment` | `'adaptive'\|'vertical-centered'` | — | Layout alignment |
| `actions` | `TemplateMessageActionItem[]` | — | Action buttons |
| `onActionClicked` | `TemplateMessageActionClicked` | — | Action click handler |

**Illustration values:** `add-attachment`, `add-data`, `ai-general`, `completed-tasks`, `error`, `first-time-user`, `interrupted`, `no-activities`, `no-data`, `no-search-results`, `offline`, `permissions`, `unconfigured`

**TemplateMessageActionItem:** `{label: string, icon?: string, variant?: string, disabled?: boolean, tooltipContent?: string}`

---

## Breadcrumbs

Page location hierarchy for navigation context.

```tsx
import {Breadcrumbs, BreadcrumbsItemClicked} from '@servicenow/react-components/Breadcrumbs';

<Breadcrumbs
  items={[
    {label: 'Home', href: '/', icon: 'home-fill'},
    {label: 'Service Desk', href: '/service-desk'},
    {label: 'Incidents', href: '/incidents'},
    {label: 'INC0001234'}  // Current page — no href
  ]}
  onItemClicked={e => {
    const item = e.detail.payload;
    if (item.href) navigate(item.href);
  }}
/>

{/* Overflow behaviors */}
<Breadcrumbs items={items} overflow="truncate-collapse" delimiter="arrow" />
<Breadcrumbs items={items} overflow="wrap" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `BreadcrumbsItem[]` | — | **Required.** Array from root to current page |
| `overflow` | `'collapse'\|'truncate-collapse'\|'wrap'` | `'collapse'` | Overflow behavior |
| `delimiter` | `'chevron'\|'arrow'` | `'chevron'` | Separator symbol |
| `overflowMenuPosition` | `'start'\|'end'` | `'start'` | Overflow menu position |
| `onItemClicked` | `BreadcrumbsItemClicked` | — | Click handler |

**BreadcrumbsItem:** `{label: string, href?: string, icon?: string, hideLabel?: boolean}`

---

## ContentTree

Hierarchical tree for navigating nested data (folders, categories, org charts, file systems). Supports selection, async loading, drag-and-drop, and actions.

```tsx
import {ContentTree, ContentTreeItem, ContentTreeItemClicked} from '@servicenow/react-components/ContentTree';

const treeItems: ContentTreeItem[] = [
  {
    id: 'root',
    label: 'Root',
    children: [
      {id: 'child-1', label: 'Child 1'},
      {id: 'child-2', label: 'Child 2', children: [{id: 'grandchild', label: 'Grandchild'}]}
    ]
  }
];

const [selectedItems, setSelectedItems] = React.useState<Array<string | number>>([]);

<ContentTree
  items={treeItems}
  selectedItems={[selectedItems]}  // array of path arrays
  select="single"
  manageSelectedItems
  size="md"
  onItemClicked={e => {
    const item = e.detail.payload.item;
    setSelectedItems([item.id]);
  }}
/>
```

### Key Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ContentTreeItem[]` | — | **Required.** Tree data |
| `selectedItems` | `Array<Array<string\|number>>` | — | Path arrays to selected items |
| `select` | `'none'\|'single'\|'multi'` | — | Selection mode |
| `size` | `'sm'\|'md'` | `'md'` | Item size |
| `overflow` | `'wrap'\|'truncate'` | — | Text overflow behavior |
| `searchTerm` | `string` | — | Highlight matching labels |
| `showDividers` | `boolean` | — | Show item borders |
| `showActionsOnHover` | `boolean` | — | Show item actions on hover |
| `triggerIcon` | `'chevron'\|'plus-minus'\|'caret'` | — | Expand/collapse icon type |
| `dragdropConfig` | `{enableDrag, enableDrop, effect}` | — | Drag-and-drop configuration |
| `manageItems` / `manageSelectedItems` / `manageExpandedItems` | `boolean` | — | Override automatic state management |

