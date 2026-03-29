# Layout & Container Components — @servicenow/react-components

---

## Accordion / AccordionItem

Collapsible sections with keyboard navigation and accessibility. `headingLevel` is required. **AccordionItem has no default slot** — all children must use `slot="content"`, `slot="identifier"`, or `slot="metadata"`.

```tsx
import {Accordion} from '@servicenow/react-components/Accordion';
import {AccordionItem} from '@servicenow/react-components/AccordionItem';

<Accordion headingLevel={3} expandSingle size="sm">
  <AccordionItem header="First Section" expanded>
    <p slot="content">Visible by default. Must use slot="content".</p>
  </AccordionItem>

  <AccordionItem header="Second Section">
    <p slot="content">Click to expand</p>
  </AccordionItem>

  {/* Custom-styled header */}
  <AccordionItem
    header={{label: 'Advanced', variant: 'primary', size: 'lg', weight: 'bold'}}
    caption={{label: 'Optional sub-label', style: 'italic'}}
    onExpandedSet={e => console.log('expanded:', e.detail.payload.value)}
  >
    <p slot="content">Content here</p>
  </AccordionItem>

  {/* With icon and status badge */}
  <AccordionItem header="Incident #12345" caption="Critical">
    <Icon icon="alert-fill" slot="identifier" />
    <HighlightedValue slot="metadata" label="P1" color="critical" size="sm" />
    <div slot="content">Incident details here</div>
  </AccordionItem>
</Accordion>
```

### Accordion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headingLevel` | `1-6` | — | **Required.** HTML heading level for accessibility |
| `expandSingle` | `boolean` | `false` | Allow only one item open at a time |
| `hideDividers` | `boolean` | `false` | Remove separator lines between items |
| `size` | `'xs'\|'sm'\|'md'\|'lg'` | `'sm'` | Horizontal padding around items |
| `triggerIcon` | `{type, position, size}` | chevron/end/md | Icon config |

**triggerIcon.type:** `'chevron'` (rotating) | `'plus-minus'` (toggle)

### AccordionItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `header` | `string \| {label, variant?, size?, weight?}` | — | **Required.** Header text or config |
| `caption` | `string \| {label, variant?, style?}` | — | Sub-label below header |
| `expanded` | `boolean` | `false` | Start expanded |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `onExpandedSet` | function | — | Called when expand state changes |

### AccordionItem Slots

| Slot | Purpose |
|------|---------|
| `slot="content"` | **Required.** Main content shown when expanded |
| `slot="identifier"` | Icon shown left of the header |
| `slot="metadata"` | Element shown right of header (e.g., HighlightedValue) |

---

## Card

Container with optional interaction states, shadow, and colored sidebar.

```tsx
import {Card} from '@servicenow/react-components/Card';

{/* Static card */}
<Card size="md">
  <h3>Card Title</h3>
  <p>Content here</p>
</Card>

{/* Clickable card — aria-label is required for accessibility */}
<Card
  interaction="click"
  configAria={{button: {'aria-label': 'View incident details'}}}
  onClicked={e => navigate(e.detail)}
>
  <p>Click to view</p>
</Card>

{/* Selectable card */}
<Card
  interaction="select"
  selected={isSelected}
  configAria={{button: {'aria-label': 'Select this item'}}}
  onSelectedSet={e => setSelected(!isSelected)}
>
  <p>Toggle selection</p>
</Card>

{/* Card with status sidebar */}
<Card sidebar={{color: 'critical', variant: 'primary'}}>
  <p>High severity alert</p>
</Card>

{/* Minimal card */}
<Card size="sm" hideShadow>
  <p>Compact, no shadow</p>
</Card>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm'\|'md'\|'lg'` | `'lg'` | Padding around content |
| `interaction` | `'none'\|'click'\|'select'` | `'none'` | Interaction mode |
| `hideShadow` | `boolean` | `false` | Remove drop shadow |
| `selected` | `boolean` | `false` | Selected state (use with `interaction="select"`) |
| `variant` | `'initial'\|'ai'` | `'initial'` | Visual variant |
| `sidebar` | `{color, variant}` | — | Colored sidebar indicator |

**Sidebar colors:** `critical`, `high`, `moderate`, `warning`, `info`, `positive`, `low`, `magenta`, `pink`, `orange`, `yellow`, `brown`, `green`, `green-yellow`, `blue`, `gray`, `teal`, `purple`
**Sidebar variants:** `primary`, `secondary`, `tertiary`

> When using `interaction="click"` or `interaction="select"`, you **must** provide `configAria.button['aria-label']` for accessibility.

### Card Sub-Components

```tsx
import {CardHeader} from '@servicenow/react-components/CardHeader';
import {CardFooter} from '@servicenow/react-components/CardFooter';
import {CardActions} from '@servicenow/react-components/CardActions';
import {CardDivider} from '@servicenow/react-components/CardDivider';
```

---

## Tabs

Navigation between content sections.

```tsx
import {Tabs} from '@servicenow/react-components/Tabs';

const [activeTab, setActiveTab] = React.useState('overview');

const tabItems = [
  {id: 'overview', label: 'Overview'},
  {id: 'details', label: 'Details', icon: 'info-circle-outline'},
  {id: 'history', label: 'History', count: 12},
  {id: 'disabled', label: 'Disabled', disabled: true}
];

<Tabs
  items={tabItems}
  selectedItem={activeTab}
  size="md"
  onSelectedItemSet={e => setActiveTab(e.detail.payload.value)}
/>

{/* Render active content */}
{activeTab === 'overview' && <OverviewPanel />}
{activeTab === 'details' && <DetailsPanel />}
{activeTab === 'history' && <HistoryPanel />}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `TabItem[]` | — | **Required** |
| `selectedItem` | `string\|number` | — | ID of active tab |
| `size` | `'sm'\|'md'` | `'md'` | Tab size |
| `hideLabel` | `boolean` | `false` | Show only icons |
| `fixedWidth` | `boolean` | `false` | Equal-width tabs |
| `maxWidth` | `number` | `240` | Max tab width (px) |
| `hideDivider` | `boolean` | `false` | Hide underline |
| `hidePadding` | `boolean` | `false` | Remove padding |

**TabItem:** `{id, label, icon?, count?, presence?, disabled?, tooltipContent?}`

---

## Modal

Overlay dialog. Blocks access to the page until dismissed.

```tsx
import {Modal} from '@servicenow/react-components/Modal';

const [isOpen, setIsOpen] = React.useState(false);

<button onClick={() => setIsOpen(true)}>Open</button>

<Modal
  opened={isOpen}
  size="md"
  headerLabel="Confirm Action"
  content="Are you sure you want to delete this record?"
  footerActions={[
    {label: 'Cancel', variant: 'secondary'},
    {label: 'Delete', variant: 'primary-negative'}
  ]}
  onOpenedSet={e => setIsOpen(e.detail.payload.value)}
  onFooterActionClicked={e => {
    if (e.detail.payload.action.label === 'Delete') {
      handleDelete();
    }
    setIsOpen(false);
  }}
/>

{/* Modal with complex body content */}
<Modal
  opened={isOpen}
  size="lg"
  headerLabel="Edit Record"
  onOpenedSet={e => setIsOpen(e.detail.payload.value)}
  footerActions={[
    {label: 'Cancel', variant: 'secondary'},
    {label: 'Save', variant: 'primary'}
  ]}
  onFooterActionClicked={e => {
    if (e.detail.payload.action.label === 'Save') handleSave();
    setIsOpen(false);
  }}
>
  {/* Children replace the content prop when provided */}
  <div style={{padding: '1rem'}}>
    <Input label="Name" value={name} onValueSet={e => setName(e.detail.payload.value)} />
  </div>
</Modal>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `opened` | `boolean` | `false` | Show/hide modal |
| `size` | `'sm'\|'md'\|'lg'\|'fullscreen'\|'custom'` | `'sm'` | Modal size |
| `headerLabel` | `string` | — | Dialog title |
| `content` | `string` | — | Body text (ignored when children provided) |
| `footerActions` | `FooterAction[]` | `[]` | Footer buttons (right to left) |
| `disableClose` | `boolean` | `false` | Remove X button (use for required actions) |
| `hidePadding` | `boolean` | `false` | Remove body padding |
| `contentFullWidth` | `boolean` | `false` | Remove horizontal padding |

**FooterAction:** `{label?, variant?, disabled?, tooltipContent?, bare?, icon?, clickActionType?}`

---

## Collapse

Simple collapsible content area.

```tsx
import {Collapse} from '@servicenow/react-components/Collapse';

const [isOpen, setIsOpen] = React.useState(false);

<Collapse
  label="Show advanced options"
  expanded={isOpen}
  onExpandedSet={e => setIsOpen(e.detail.payload.value)}
>
  <div>Hidden content revealed when expanded</div>
</Collapse>
```
