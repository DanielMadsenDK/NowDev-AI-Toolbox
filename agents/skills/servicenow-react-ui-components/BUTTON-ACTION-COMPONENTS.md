# Button & Action Components — @servicenow/react-components

---

## Button

Standard action button with multiple variants and sizes.

```tsx
import {Button} from '@servicenow/react-components/Button';

<Button label="Save" variant="primary" size="md" onClicked={e => handleSave()} />
<Button label="Delete" variant="primary-negative" icon="trash-fill" />
<Button label="Cancel" variant="secondary" />
<Button label="More info" variant="tertiary" tooltipContent="Click for help" />
<Button label="Disabled" variant="primary" disabled />
<Button label="With Icon" variant="secondary" icon="gear-fill" size="sm" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string\|number` | — | Button text |
| `variant` | see below | `'secondary'` | Visual style |
| `size` | `'sm'\|'md'\|'lg'` | `'md'` | Button size |
| `icon` | `IconName` | — | Icon at start of button |
| `disabled` | `boolean` | `false` | Disable interaction |
| `active` | `boolean` | `false` | Pressed state |
| `tooltipContent` | `string` | — | Tooltip on hover (hidden when disabled) |
| `onClicked` | function | — | Click handler |

**Variants:**
- `primary` — Most prominent; primary call-to-action
- `secondary` — Alternative action
- `tertiary` — Least prominent (cancel, close)
- `primary-positive` — Positive primary (confirm, approve)
- `primary-negative` — Destructive primary (delete, remove)
- `secondary-positive` — Positive secondary
- `secondary-negative` — Destructive secondary

---

## ButtonBare

Button with no background or border. Retains variant style for iconic versions.

```tsx
import {ButtonBare} from '@servicenow/react-components/ButtonBare';

<ButtonBare label="Settings" icon="gear-fill" onClicked={e => console.log(e.detail)} />
<ButtonBare label="Learn more" variant="tertiary" />
```

---

## ButtonIconic

Icon-only button. Use when there is no room for a text label. Requires `tooltipContent` for accessibility.

```tsx
import {ButtonIconic} from '@servicenow/react-components/ButtonIconic';

<ButtonIconic icon="gear-fill" tooltipContent="Settings" onClicked={e => openSettings()} />
<ButtonIconic icon="trash-fill" tooltipContent="Delete" variant="primary-negative" />
<ButtonIconic icon="plus-fill" tooltipContent="Add item" size="sm" />
```

---

## ButtonStateful

Toggles between selected/unselected states. Uses outline icon when unselected, fill icon when selected.

```tsx
import {ButtonStateful} from '@servicenow/react-components/ButtonStateful';

const [isFavorite, setFavorite] = React.useState(false);

<ButtonStateful
  icon="star"
  selected={isFavorite}
  tooltipContent={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  onSelectedSet={e => setFavorite(e.detail.payload.value)}
/>
```

---

## SplitButton

Primary button paired with a dropdown of secondary actions.

```tsx
import {SplitButton} from '@servicenow/react-components/SplitButton';

<SplitButton
  label="Save"
  variant="primary"
  items={[
    {id: 'save-draft', label: 'Save as Draft'},
    {id: 'save-close', label: 'Save and Close'},
    {id: 'save-new', label: 'Save and New'}
  ]}
  onClicked={e => handleSave()}
  onItemClicked={e => {
    const {id} = e.detail.payload.item;
    if (id === 'save-draft') handleSaveDraft();
    if (id === 'save-close') handleSaveAndClose();
  }}
/>
```

---

## Dropdown

Selection control that supports single selection, multi-selection, or menu-style (no selection) interactions.

```tsx
import {Dropdown} from '@servicenow/react-components/Dropdown';

const items = [
  {id: 'open', label: 'Open', icon: 'circle-fill'},
  {id: 'in-progress', label: 'In Progress'},
  {id: 'resolved', label: 'Resolved'},
  {id: 'closed', label: 'Closed', disabled: true}
];
```

### Single selection

```tsx
const [selected, setSelected] = React.useState<string[]>([]);

<Dropdown
  placeholder="Select status"
  items={items}
  select="single"
  selectedItems={selected}
  variant="secondary"
  size="md"
  onSelectedItemsSet={e => setSelected(e.detail.payload.value)}
/>
```

### Multi-selection

```tsx
<Dropdown
  placeholder="Select statuses"
  items={items}
  select="multi"
  selectedItems={selected}
  onSelectedItemsSet={e => setSelected(e.detail.payload.value)}
/>
```

### Action menu (no selection)

```tsx
<Dropdown
  placeholder="Actions"
  items={[
    {id: 'edit', label: 'Edit', icon: 'edit-fill'},
    {id: 'delete', label: 'Delete', icon: 'trash-fill'}
  ]}
  select="none"
  variant="tertiary"
  onItemClicked={e => {
    if (e.detail.payload.item.id === 'delete') handleDelete();
  }}
/>
```

### Sections with headers

```tsx
<Dropdown
  placeholder="Select a category"
  items={[
    {
      id: 'priority',
      label: 'Priority',
      children: [
        {id: 'p1', label: 'P1 - Critical', icon: 'circle-fill'},
        {id: 'p2', label: 'P2 - High'}
      ]
    },
    {
      id: 'impact',
      label: 'Impact',
      children: [
        {id: 'high', label: 'High Impact'},
        {id: 'low', label: 'Low Impact'}
      ]
    }
  ]}
  select="single"
/>
```

### With search

```tsx
<Dropdown
  placeholder="Search and select"
  items={manyItems}
  select="single"
  search="contains"  // or "initial" for prefix matching
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `DropdownItem[] \| DropdownSection[]` | — | **Required** |
| `select` | `'single'\|'multi'\|'none'` | `'single'` | Selection mode |
| `selectedItems` | `string[]\|number[]` | `[]` | Selected item IDs |
| `placeholder` | `string` | — | Trigger label when nothing selected |
| `variant` | `'primary'\|'secondary'\|'tertiary'\|...` | `'secondary'` | Button style |
| `size` | `'sm'\|'md'\|'lg'` | `'md'` | Trigger size |
| `search` | `'none'\|'contains'\|'initial'\|'managed'` | `'none'` | Filter mode |
| `disabled` | `boolean` | `false` | Disable dropdown |
| `icon` | `string` | — | Icon on trigger button |
| `bare` | `boolean` | `false` | Transparent background |
| `hideCaret` | `boolean` | `false` | Hide dropdown arrow |

### DropdownItem shape

```tsx
{
  id: string | number,       // required, unique
  label: string,             // required
  sublabel?: string,
  disabled?: boolean,
  count?: number,
  // Only one visual indicator allowed at a time:
  icon?: string,             // icon name
  avatarProps?: { userName, imageSrc?, presence? },
  presence?: 'available' | 'busy' | 'away' | 'offline',
  image?: { src, alt }
}
```
