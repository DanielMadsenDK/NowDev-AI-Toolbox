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

Empty state component with illustration, heading, body text, and action buttons.

```tsx
import {TemplateMessage} from '@servicenow/react-components/TemplateMessage';

<TemplateMessage
  illustration="no-results"
  heading="No incidents found"
  content="Try adjusting your filters or create a new incident."
  actions={[
    {label: 'Clear Filters', variant: 'secondary'},
    {label: 'Create Incident', variant: 'primary'}
  ]}
  onActionClicked={e => {
    if (e.detail.payload.action.label === 'Create Incident') setShowNewForm(true);
  }}
/>
```

---

## Breadcrumbs

Page location hierarchy for navigation context.

```tsx
import {Breadcrumbs} from '@servicenow/react-components/Breadcrumbs';

<Breadcrumbs
  items={[
    {label: 'Home', href: '/'},
    {label: 'Service Desk', href: '/service-desk'},
    {label: 'Incidents', href: '/incidents'},
    {label: 'INC0001234'}  {/* Current page — no href */}
  ]}
/>
```

---

## ContentTree

Hierarchical tree for navigating nested data (e.g. asset trees, org charts, file systems).

```tsx
import {ContentTree} from '@servicenow/react-components/ContentTree';
```
