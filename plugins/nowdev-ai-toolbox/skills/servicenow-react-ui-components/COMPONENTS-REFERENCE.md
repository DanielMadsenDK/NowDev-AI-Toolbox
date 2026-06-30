# ServiceNow React Components — Reference Index

All components are from the `@servicenow/react-components` package.

## Installation (devDependencies — REQUIRED)

```json
{
  "devDependencies": {
    "@servicenow/react-components": "latest"
  }
}
```

> **IMPORTANT:** Always add to `devDependencies`, **not** `dependencies`. The ServiceNow SDK build pipeline requires this.

## Reference Files

| Category | File | What's covered |
|----------|------|----------------|
| Form & Record | [FORM-COMPONENTS.md](FORM-COMPONENTS.md) | RecordProvider, useRecord, FormColumnLayout, FormActionBar, ActivityStream, ActivityStreamCompose, Attachments, RelatedLists, Notifications, FormDataConnected |
| Lists | [LIST-COMPONENTS.md](LIST-COMPONENTS.md) | NowRecordListConnected — paginated record lists with row click, filter, and refresh events |
| Layout | [LAYOUT-COMPONENTS.md](LAYOUT-COMPONENTS.md) | Accordion/AccordionItem, Card, CardHeader, CardFooter, CardActions, CardDivider, Tabs, Modal, Collapse |
| Buttons & Dropdowns | [BUTTON-ACTION-COMPONENTS.md](BUTTON-ACTION-COMPONENTS.md) | Button, ButtonBare, ButtonIconic, ButtonStateful, SplitButton, Dropdown |
| Form Inputs | [INPUT-COMPONENTS.md](INPUT-COMPONENTS.md) | Input, InputUrl, Textarea, Select, Typeahead, TypeaheadMulti, Checkbox, Toggle, RadioButtons, DateTime |
| Feedback & Display | [FEEDBACK-DISPLAY-COMPONENTS.md](FEEDBACK-DISPLAY-COMPONENTS.md) | Alert, Loader, ProgressBar, Tooltip, Heading, Badge, HighlightedValue, LabelValue, LabelValueStacked, RichText, StylizedText, TextLink, Avatar, Icon, Illustration, Image, Breadcrumbs, ContentTree, TemplateMessage |

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
import {Accordion, AccordionTriggerIcon} from '@servicenow/react-components/Accordion';
import {AccordionItem, AccordionItemExpandedSet, AccordionItemHeader, AccordionItemCaption} from '@servicenow/react-components/AccordionItem';
import {Card, CardClicked, CardSelectedSet} from '@servicenow/react-components/Card';
import {CardHeader} from '@servicenow/react-components/CardHeader';
import {CardFooter} from '@servicenow/react-components/CardFooter';
import {CardActions} from '@servicenow/react-components/CardActions';
import {CardDivider} from '@servicenow/react-components/CardDivider';
import {Tabs, TabsSelectedItemSet, TabItem} from '@servicenow/react-components/Tabs';
import {Modal, ModalOpenedSet, ModalFooterActionClicked, FooterAction} from '@servicenow/react-components/Modal';
import {Collapse} from '@servicenow/react-components/Collapse';

// Buttons
import {Button, ButtonClicked} from '@servicenow/react-components/Button';
import {ButtonBare} from '@servicenow/react-components/ButtonBare';
import {ButtonIconic} from '@servicenow/react-components/ButtonIconic';
import {ButtonStateful} from '@servicenow/react-components/ButtonStateful';
import {SplitButton} from '@servicenow/react-components/SplitButton';
import {Dropdown, DropdownSelectedItemsSet, DropdownItemClicked} from '@servicenow/react-components/Dropdown';

// Inputs
import {Input, InputValueSet, InputInvalidSet, InputEnterKeydown} from '@servicenow/react-components/Input';
import {InputUrl, InputUrlValueSet, InputUrlInput, InputUrlInvalidSet} from '@servicenow/react-components/InputUrl';
import {Textarea} from '@servicenow/react-components/Textarea';
import {Select, SelectSelectedItemSet, SelectInvalidSet} from '@servicenow/react-components/Select';
import {Typeahead} from '@servicenow/react-components/Typeahead';
import {TypeaheadMulti} from '@servicenow/react-components/TypeaheadMulti';
import {Checkbox} from '@servicenow/react-components/Checkbox';
import {Toggle, ToggleCheckedSet} from '@servicenow/react-components/Toggle';
import {RadioButtons} from '@servicenow/react-components/RadioButtons';
import {DateTime, DateTimeValueSet, DateTimeInvalidSet} from '@servicenow/react-components/DateTime';

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
import {StylizedText} from '@servicenow/react-components/StylizedText';
import {TextLink} from '@servicenow/react-components/TextLink';
import {Avatar, AvatarClicked} from '@servicenow/react-components/Avatar';
import {Icon} from '@servicenow/react-components/Icon';
import {Illustration} from '@servicenow/react-components/Illustration';
import {Image} from '@servicenow/react-components/Image';
import {Breadcrumbs, BreadcrumbsItemClicked, BreadcrumbsItem} from '@servicenow/react-components/Breadcrumbs';
import {TemplateMessage, TemplateMessageActionClicked} from '@servicenow/react-components/TemplateMessage';
import {ContentTree, ContentTreeItem, ContentTreeItemClicked} from '@servicenow/react-components/ContentTree';
```

## Shared Event Pattern

All events use the `ServiceNowEvent` shape. Payloads are **always** nested at `event.detail.payload`, never directly on `event.detail`:

```tsx
// Value events
onValueSet={e => e.detail.payload.value}         // string value
onCheckedSet={e => e.detail.payload.value}        // boolean (Toggle, Checkbox)
onSelectedItemSet={e => e.detail.payload.value}   // selected ID (Select, Typeahead, Tabs)
onSelectedItemsSet={e => e.detail.payload.value}  // array of IDs (Dropdown multi, TypeaheadMulti)
onExpandedSet={e => e.detail.payload.value}       // boolean (AccordionItem, Collapse)
onOpenedSet={e => e.detail.payload.value}         // boolean (Modal, Dropdown)

// Row click (NowRecordListConnected, RelatedLists)
onRowClicked={e => {
  const {sys_id, table} = e.detail.payload;  // CORRECT: nested in payload
  // NOT: e.detail.sys_id   ← WRONG
}}

// Item click events
onItemClicked={e => e.detail.payload.item}        // DropdownItem object (Dropdown, SplitButton)
onItemClicked={e => e.detail.payload.action}      // action object (TemplateMessage, Modal footer)
onClicked={e => e.detail}                         // Button, ButtonBare, ButtonIconic, Avatar
```

## TypeScript Event Types

Each component exports named event handler types for TypeScript usage:

```tsx
import {Button, ButtonClicked} from '@servicenow/react-components/Button';
import {Input, InputValueSet, InputInvalidSet} from '@servicenow/react-components/Input';
import {Select, SelectSelectedItemSet} from '@servicenow/react-components/Select';
import {Toggle, ToggleCheckedSet} from '@servicenow/react-components/Toggle';
import {Tabs, TabsSelectedItemSet} from '@servicenow/react-components/Tabs';
import {Modal, ModalOpenedSet, ModalFooterActionClicked} from '@servicenow/react-components/Modal';
import {Dropdown, DropdownSelectedItemsSet, DropdownItemClicked} from '@servicenow/react-components/Dropdown';
import {DateTime, DateTimeValueSet} from '@servicenow/react-components/DateTime';
import {Breadcrumbs, BreadcrumbsItemClicked} from '@servicenow/react-components/Breadcrumbs';
import {ContentTree, ContentTreeItemClicked} from '@servicenow/react-components/ContentTree';
import {TemplateMessage, TemplateMessageActionClicked} from '@servicenow/react-components/TemplateMessage';

// Usage pattern with useCallback
const handleClick = useCallback<ButtonClicked>(e => {
  console.log('clicked', e.detail);
}, []);
```
