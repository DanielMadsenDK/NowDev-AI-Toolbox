# Input & Form Field Components — @servicenow/react-components

---

## Input

Text, email, number, or IP address input with validation, masking, and error messaging.

```tsx
import {Input} from '@servicenow/react-components/Input';

{/* Basic text */}
<Input
  label="Username"
  type="text"
  placeholder="Enter username"
  required
  onValueSet={e => setUsername(e.detail.payload.value)}
/>

{/* Email */}
<Input
  label="Email"
  type="email"
  required
  messages={[{status: 'info', content: 'We\'ll send confirmations here', icon: 'circle-info-outline'}]}
  onValueSet={e => setEmail(e.detail.payload.value)}
  onInvalidSet={e => setEmailInvalid(e.detail.payload.value)}
/>

{/* Number with constraints */}
<Input label="Age" type="number" min={18} max={120} required />

{/* Phone mask */}
<Input
  label="Phone Number"
  type="text"
  maskConfig={{
    mask: '(XXX) XXX-XXXX',
    definitions: {X: /[0-9]/},
    maskPlaceholder: '(000) 000-0000'
  }}
/>

{/* Disabled/readonly */}
<Input label="Account ID" value="12345678" disabled readonly />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Field label |
| `type` | `'text'\|'email'\|'number'\|'ip'` | `'text'` | Input type |
| `value` | `string` | — | Current value |
| `placeholder` | `string` | — | Hint text |
| `required` | `boolean` | `false` | Mark as required |
| `optional` | `boolean` | `false` | Mark as optional |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `readonly` | `boolean` | `false` | Show but prevent editing |
| `invalid` | `boolean` | `false` | Invalid state |
| `min` / `max` | `number` | — | Number bounds |
| `maxlength` | `number` | — | Max characters |
| `pattern` | `string` | — | Regex validation |
| `maskConfig` | `{mask, definitions, maskPlaceholder}` | — | Input masking |
| `messages` | `InputMessage[]` | — | Inline messages below field |
| `helperContent` | `string\|Element` | — | Helper popup next to label |
| `size` | `'sm'\|'md'` | `'md'` | Field size |

**Events:** `onValueSet` (on blur), `onInput` (on keystroke), `onInvalidSet` (on blur if invalid), `onEnterKeydown`

---

## Textarea

Multi-line text input.

```tsx
import {Textarea} from '@servicenow/react-components/Textarea';

<Textarea
  label="Description"
  placeholder="Enter description..."
  rows={4}
  maxlength={2000}
  required
  onValueSet={e => setDescription(e.detail.payload.value)}
/>
```

---

## Select

Single-item dropdown for form contexts. Includes built-in label, validation, and accessibility.

```tsx
import {Select} from '@servicenow/react-components/Select';

const [status, setStatus] = React.useState('');

<Select
  label="Status"
  items={[
    {id: 'open', label: 'Open'},
    {id: 'in_progress', label: 'In Progress'},
    {id: 'resolved', label: 'Resolved'}
  ]}
  selectedItem={status}
  required
  search="contains"
  helperContent="Select the current status of the incident"
  onSelectedItemSet={e => setStatus(e.detail.payload.value)}
  onInvalidSet={e => console.log('invalid:', e.detail.payload.value)}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Field label |
| `items` | `DropdownItem[]\|DropdownSection[]` | — | **Required** |
| `selectedItem` | `string\|number` | — | Selected item ID |
| `required` | `boolean` | — | Mark as required |
| `optional` | `boolean` | — | Mark as optional |
| `disabled` | `boolean` | — | Disable field |
| `readonly` | `boolean` | `false` | Read-only mode |
| `invalid` | `boolean` | `false` | Invalid state |
| `search` | `'none'\|'contains'\|'initial'\|'managed'` | `'none'` | Filter mode |
| `messages` | `SelectMessage[]` | `[]` | Inline messages |
| `helperContent` | `string` | — | Helper popup |
| `size` | `'sm'\|'md'` | `'md'` | Field size |

Item format: see [Dropdown DropdownItem shape](BUTTON-ACTION-COMPONENTS.md#dropdownitem-shape)

---

## Typeahead

Autocomplete text input — users type freely or select from suggestions.

```tsx
import {Typeahead} from '@servicenow/react-components/Typeahead';

const [value, setValue] = React.useState('');
const [selectedId, setSelectedId] = React.useState<string|null>(null);

<Typeahead
  label="Assigned To"
  items={[
    {id: 'usr1', label: 'Alice Johnson', avatarProps: {userName: 'Alice Johnson', presence: 'available'}},
    {id: 'usr2', label: 'Bob Smith', avatarProps: {userName: 'Bob Smith', presence: 'away'}}
  ]}
  value={value}
  selectedItem={selectedId}
  search="contains"
  placeholder="Search by name..."
  required
  onValueSet={e => setValue(e.detail.payload.value)}
  onSelectedItemSet={e => {
    setValue(e.detail.payload.item.label);
    setSelectedId(e.detail.payload.value);
  }}
/>
```

**Search modes:** `'managed'` (default, no filtering), `'initial'` (prefix match), `'contains'` (substring match)

**Key props:** same as Select plus `value` (current text), `selectedItem`, `search`, `maxlength`

---

## TypeaheadMulti

Multi-select autocomplete — allows selecting multiple items.

```tsx
import {TypeaheadMulti} from '@servicenow/react-components/TypeaheadMulti';

const [tags, setTags] = React.useState<string[]>([]);

<TypeaheadMulti
  label="Tags"
  items={tagItems}
  selectedItems={tags}
  search="contains"
  placeholder="Add tags..."
  onSelectedItemsSet={e => setTags(e.detail.payload.value)}
/>
```

---

## Checkbox

Boolean checkbox with indeterminate support.

```tsx
import {Checkbox} from '@servicenow/react-components/Checkbox';

{/* Standard checkbox */}
<Checkbox
  label="Accept terms and conditions"
  checked={accepted}
  required
  manageChecked
  onCheckedSet={e => setAccepted(e.detail.payload.value)}
/>

{/* "Select all" with indeterminate state */}
<Checkbox
  label="Select all"
  checked={allChecked ? true : noneChecked ? false : 'indeterminate'}
  manageChecked
  onCheckedSet={handleSelectAll}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Checkbox label |
| `checked` | `boolean \| 'indeterminate'` | `false` | Checked state |
| `required` | `boolean` | `false` | Must be checked to submit |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `readonly` | `boolean` | `false` | Visible but not editable |
| `invalid` | `boolean` | `false` | Invalid state |
| `size` | `'sm'\|'md'` | `'md'` | Checkbox size |
| `labelPosition` | `'start'\|'end'` | `'end'` | Label position |
| `fullWidth` | `boolean` | `false` | Span full width |
| `manageChecked` | `boolean` | `false` | Control state externally |

---

## Toggle

On/off switch control.

```tsx
import {Toggle} from '@servicenow/react-components/Toggle';

<Toggle
  label="Enable notifications"
  checked={enabled}
  size="md"
  labelPosition="start"
  onCheckedSet={e => setEnabled(e.detail.payload.value)}
/>

{/* Full-width, label at start */}
<Toggle label="Auto-save" fullWidth checked={autoSave} labelPosition="start" />

{/* Small, disabled */}
<Toggle label="Read-only setting" size="sm" checked={true} disabled />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Toggle label |
| `checked` | `boolean` | `false` | On/off state |
| `size` | `'sm'\|'md'` | `'md'` | Toggle size |
| `labelPosition` | `'start'\|'end'\|'top'\|'bottom'` | `'start'` | Label position |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `fullWidth` | `boolean` | `false` | Span full width |
| `manageChecked` | `boolean` | `false` | Control state externally |

---

## RadioButtons

Mutually exclusive option selector.

```tsx
import {RadioButtons} from '@servicenow/react-components/RadioButtons';

<RadioButtons
  label="Priority"
  items={[
    {id: 'low', label: 'Low'},
    {id: 'medium', label: 'Medium'},
    {id: 'high', label: 'High'},
    {id: 'critical', label: 'Critical', disabled: true}
  ]}
  selectedItem={priority}
  required
  onSelectedItemSet={e => setPriority(e.detail.payload.value)}
/>
```

---

## DateTime

Date and/or time picker with calendar.

```tsx
import {DateTime} from '@servicenow/react-components/DateTime';

{/* Date only */}
<DateTime
  label="Due Date"
  type="date"
  value={dueDate}
  required
  onValueSet={e => setDueDate(e.detail.payload.value)}
/>

{/* Date and time */}
<DateTime
  label="Schedule"
  type="date-time"
  value={schedule}
  onValueSet={e => setSchedule(e.detail.payload.value)}
/>
```

---

## InputUrl

URL input with edit/display mode switching.

```tsx
import {InputUrl} from '@servicenow/react-components/InputUrl';

<InputUrl
  label="Reference URL"
  value={url}
  required
  onValueSet={e => setUrl(e.detail.payload.value)}
/>
```
