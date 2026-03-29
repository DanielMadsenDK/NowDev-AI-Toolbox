# ServiceNow React Components — Reference Index

All components are from the `@servicenow/react-components` package (install: `npm install @servicenow/react-components --save`).

## Reference Files

| Category | File | What's covered |
|----------|------|----------------|
| Form & Record | [FORM-COMPONENTS.md](FORM-COMPONENTS.md) | RecordProvider, useRecord, FormColumnLayout, FormActionBar, ActivityStream, ActivityStreamCompose, Attachments, RelatedLists, Notifications, FormDataConnected |
| Lists | [LIST-COMPONENTS.md](LIST-COMPONENTS.md) | NowRecordListConnected — paginated record lists with row click, filter, and refresh events |
| Layout | [LAYOUT-COMPONENTS.md](LAYOUT-COMPONENTS.md) | Accordion/AccordionItem, Card, Tabs, Modal, Collapse |
| Buttons & Dropdowns | [BUTTON-ACTION-COMPONENTS.md](BUTTON-ACTION-COMPONENTS.md) | Button, ButtonBare, ButtonIconic, ButtonStateful, SplitButton, Dropdown |
| Form Inputs | [INPUT-COMPONENTS.md](INPUT-COMPONENTS.md) | Input, Textarea, Select, Typeahead, TypeaheadMulti, Checkbox, Toggle, RadioButtons, DateTime, InputUrl |
| Feedback & Display | [FEEDBACK-DISPLAY-COMPONENTS.md](FEEDBACK-DISPLAY-COMPONENTS.md) | Alert, Loader, ProgressBar, Tooltip, Heading, Badge, HighlightedValue, LabelValue, RichText, TextLink, Avatar, Icon, Illustration, Image, Breadcrumbs, ContentTree, TemplateMessage |

## Quick Import Reference

```tsx
// Form components
import {RecordProvider, useRecord} from '@servicenow/react-components/RecordContext';
import {FormColumnLayout} from '@servicenow/react-components/FormColumnLayout';
import {FormActionBar} from '@servicenow/react-components/FormActionBar';
import {ActivityStream} from '@servicenow/react-components/ActivityStream';
import {ActivityStreamCompose} from '@servicenow/react-components/ActivityStreamCompose';
import {Attachments} from '@servicenow/react-components/Attachments';
import {RelatedLists} from '@servicenow/react-components/RelatedLists';
import {NotificationsProvider, Notifications, useNotifications} from '@servicenow/react-components/Notifications';
import {FormDataConnected} from '@servicenow/react-components/FormDataConnected';

// Also available from root
import {useRecord} from '@servicenow/react-components';

// List
import {NowRecordListConnected} from '@servicenow/react-components/NowRecordListConnected';

// Layout
import {Accordion} from '@servicenow/react-components/Accordion';
import {AccordionItem} from '@servicenow/react-components/AccordionItem';
import {Card} from '@servicenow/react-components/Card';
import {Tabs} from '@servicenow/react-components/Tabs';
import {Modal} from '@servicenow/react-components/Modal';
import {Collapse} from '@servicenow/react-components/Collapse';

// Buttons
import {Button} from '@servicenow/react-components/Button';
import {ButtonBare} from '@servicenow/react-components/ButtonBare';
import {ButtonIconic} from '@servicenow/react-components/ButtonIconic';
import {ButtonStateful} from '@servicenow/react-components/ButtonStateful';
import {SplitButton} from '@servicenow/react-components/SplitButton';
import {Dropdown} from '@servicenow/react-components/Dropdown';

// Inputs
import {Input} from '@servicenow/react-components/Input';
import {Textarea} from '@servicenow/react-components/Textarea';
import {Select} from '@servicenow/react-components/Select';
import {Typeahead} from '@servicenow/react-components/Typeahead';
import {TypeaheadMulti} from '@servicenow/react-components/TypeaheadMulti';
import {Checkbox} from '@servicenow/react-components/Checkbox';
import {Toggle} from '@servicenow/react-components/Toggle';
import {RadioButtons} from '@servicenow/react-components/RadioButtons';
import {DateTime} from '@servicenow/react-components/DateTime';
import {InputUrl} from '@servicenow/react-components/InputUrl';

// Display & Feedback
import {Alert} from '@servicenow/react-components/Alert';
import {Loader} from '@servicenow/react-components/Loader';
import {ProgressBar} from '@servicenow/react-components/ProgressBar';
import {Tooltip} from '@servicenow/react-components/Tooltip';
import {Heading} from '@servicenow/react-components/Heading';
import {Badge} from '@servicenow/react-components/Badge';
import {HighlightedValue} from '@servicenow/react-components/HighlightedValue';
import {LabelValue} from '@servicenow/react-components/LabelValue';
import {LabelValueStacked} from '@servicenow/react-components/LabelValueStacked';
import {RichText} from '@servicenow/react-components/RichText';
import {TextLink} from '@servicenow/react-components/TextLink';
import {Avatar} from '@servicenow/react-components/Avatar';
import {Icon} from '@servicenow/react-components/Icon';
import {Illustration} from '@servicenow/react-components/Illustration';
import {Image} from '@servicenow/react-components/Image';
import {Breadcrumbs} from '@servicenow/react-components/Breadcrumbs';
import {TemplateMessage} from '@servicenow/react-components/TemplateMessage';
import {ContentTree} from '@servicenow/react-components/ContentTree';

// Card sub-components
import {CardHeader} from '@servicenow/react-components/CardHeader';
import {CardFooter} from '@servicenow/react-components/CardFooter';
import {CardActions} from '@servicenow/react-components/CardActions';
import {CardDivider} from '@servicenow/react-components/CardDivider';
```

## Shared Event Pattern

All events use the `ServiceNowEvent` shape:

```tsx
// Most value events
onValueSet={e => e.detail.payload.value}    // the new value
onCheckedSet={e => e.detail.payload.value}  // boolean
onSelectedItemSet={e => e.detail.payload.value}  // selected ID

// Row click (NowRecordListConnected)
onRowClicked={e => {
  const {sys_id, table} = e.detail.payload;  // nested in payload, not detail
}}

// Item click (Dropdown, SplitButton)
onItemClicked={e => e.detail.payload.item}  // the item object
```
