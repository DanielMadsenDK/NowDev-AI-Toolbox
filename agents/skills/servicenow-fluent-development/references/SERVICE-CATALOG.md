# Service Catalog APIs

Fluent provides first-class support for Service Catalog artifacts. All catalog APIs are imported from `@servicenow/sdk/core`.

```ts
import {
  CatalogItem,
  CatalogItemRecordProducer,
  CatalogClientScript,
  CatalogUiPolicy,
  VariableSet,
} from '@servicenow/sdk/core'
```

---

## CatalogItem

Creates a `sc_cat_item` record.

Key properties:

| Property | Description |
|----------|-------------|
| `name`, `shortDescription`, `description` | Display text |
| `catalogs` | Array of catalog sys_ids or `Record` constants |
| `categories` | Array of category sys_ids or `Record` constants |
| `variableSets` | Ordered list of `{ variableSet: ref, order: number }` pairs |
| `variables` | Inline variable definitions (alternative to a separate VariableSet) |
| `flow` | Reference to a `Flow` constant for fulfillment automation |
| `executionPlan` | sys_id of a workflow/flow if not using a Fluent `Flow` constant |
| `availability` | `'both'` \| `'desktop'` \| `'mobile'` |
| `fulfillmentAutomationLevel` | `'semiAutomated'` \| `'fullyAutomated'` \| `'manual'` |
| `cost`, `pricingDetails` | Pricing config; pricingDetails is an array of `{ amount, currencyType, field }` |
| `recurringFrequency`, `billable` | Recurring billing settings |
| `requestMethod` | `'order'` \| `'checkout'` |
| `hideAddToCart`, `hideQuantitySelector` | Cart controls |
| `visibleBundle`, `visibleGuide`, `visibleStandalone` | Visibility contexts |
| `roles` | Array of `Role` constants controlling access |
| `availableFor`, `notAvailableFor` | User criteria refs for fine-grained visibility |
| `assignedTopics` | Array of knowledge topic `Record` constants or sys_ids |
| `meta` | Array of tag strings |
| `accessType` | `'public'` \| `'restricted'` |
| `mandatoryAttachment`, `hideAttachment`, `hideSaveAsDraft` | Submission controls |

> **Linking a Flow:** Prefer passing a Fluent `Flow` constant directly to the `flow` property rather than a raw `executionPlan` sys_id. This keeps the flow and catalog item in the same codebase and allows programmatic reference.

---

## VariableSet

Creates an `item_option_new_set` record grouping related catalog variables together.

Key properties:

| Property | Description |
|----------|-------------|
| `title`, `internalName`, `description` | Display and internal identifiers |
| `type` | `'singleRow'` (one set per request) or `'multiRow'` (repeating) |
| `layout` | `'normal'` \| `'2across'` \| `'3across'` |
| `displayTitle` | Whether to show the section header |
| `order` | Sort order on the form |
| `readRoles` | Array of `Role` constants that can view this set |
| `variables` | Object of named variable definitions |

Variables are defined using type-specific functions inside the `variables` object.
A variable set can be shared across multiple catalog items — export it and import it wherever needed.

```ts
export const contactInfoVarSet = VariableSet({
  $id: Now.ID['contact_info_varset'],
  title: 'Contact Information',
  internalName: 'contact_info_varset',
  type: 'singleRow',
  layout: '2across',
  displayTitle: true,
  order: 100,
  variables: {
    full_name: SingleLineTextVariable({ question: 'Full Name', order: 100, mandatory: true }),
    email_addr: EmailVariable({ question: 'Email Address', order: 200, mandatory: true }),
  },
})
```

To reference a variable name in `CatalogUiPolicy` conditions or actions:
```ts
contactInfoVarSet.variables.full_name   // type-safe variable name reference
```

---

## Catalog Variable Types

All variable types are imported from `@servicenow/sdk/core`. Common type-specific options are listed below:

| Category | Types |
|----------|-------|
| **Text** | `SingleLineTextVariable`, `MultiLineTextVariable`, `MaskedVariable` |
| **Selection** | `SelectBoxVariable`, `MultipleChoiceVariable`, `CheckboxVariable`, `YesNoVariable` |
| **Reference** | `ReferenceVariable`, `ListCollectorVariable` |
| **Date/Time** | `DateVariable`, `DateTimeVariable` |
| **Numeric** | `NumericScaleVariable` |
| **Data** | `EmailVariable`, `URLVariable`, `IPAddressVariable` |
| **File** | `AttachmentVariable` |
| **Layout** | `ContainerStartVariable`, `ContainerSplitVariable`, `ContainerEndVariable` |
| **Special** | `RequestedForVariable` |

Common options shared by most variable types:

| Option | Description |
|--------|-------------|
| `question` | Label shown to the user |
| `order` | Sort order on the form |
| `mandatory` | Whether the field is required |
| `tooltip` | Help text |
| `defaultValue` | Pre-filled value |

Type-specific options:
- `SelectBoxVariable` / `MultipleChoiceVariable`: `choices` object `{ key: { label: string } }`, `includeNone`, `choiceDirection`
- `ReferenceVariable`: `referenceTable`, `useReferenceQualifier`, `referenceQualCondition`
- `ListCollectorVariable`: `listTable`, `referenceQual`
- `MaskedVariable`: `useConfirmation`
- `NumericScaleVariable`: `scaleMin`, `scaleMax`
- `SingleLineTextVariable`: `validateRegex`
- Variables that map to record fields: `mapToField: true`, `field: 'field_name'`

Layout containers group variables visually:
```ts
variables: {
  section_start: ContainerStartVariable({ question: 'Section Title', displayTitle: true, layout: '2across', order: 100 }),
  field_a: SingleLineTextVariable({ question: 'Field A', order: 110 }),
  section_split: ContainerSplitVariable({ order: 120 }),
  field_b: SingleLineTextVariable({ question: 'Field B', order: 130 }),
  section_end: ContainerEndVariable({ order: 140 }),
}
```

---

## CatalogUiPolicy

Creates a `catalog_ui_policy` record. Controls variable visibility, mandatory state, and read-only state based on conditions.

Key properties:

| Property | Description |
|----------|-------------|
| `shortDescription` | Human-readable label |
| `catalogCondition` | Encoded query string; interpolate variable refs with template literals |
| `catalogItem` | Reference to a `CatalogItem` or `CatalogItemRecordProducer` constant |
| `variableSet` | Reference to a `VariableSet` constant |
| `appliesTo` | `'item'` (specific catalog item) or `'set'` (whole variable set) |
| `active`, `onLoad` | Whether the policy runs and evaluates on page load |
| `reverseIfFalse` | Reverse the action when condition is false |
| `appliesOnCatalogItemView` | Run on the catalog item form |
| `appliesOnRequestedItems` | Run on `sc_req_item` records |
| `order` | Evaluation order |
| `actions` | Array of `{ variableName, mandatory?, visible?, readOnly?, order? }` |

Use `catalogItem.variables.fieldName` or `variableSet.variables.fieldName` for type-safe variable references:

```ts
export const hideSectionPolicy = CatalogUiPolicy({
  $id: Now.ID['hide_section_policy'],
  shortDescription: 'Hide optional section unless checkbox is ticked',
  catalogItem: myItem,
  appliesTo: 'item',
  active: true,
  onLoad: true,
  reverseIfFalse: true,
  catalogCondition: `${myItem.variables.show_extra}=true`,
  appliesOnCatalogItemView: true,
  appliesOnRequestedItems: true,
  order: 100,
  actions: [
    { variableName: myItem.variables.extra_field, visible: true },
  ],
})
```

---

## CatalogClientScript

Creates a `catalog_script_client` record. Mirrors the standard `ClientScript` API but targets catalog forms.

Key properties:

| Property | Description |
|----------|-------------|
| `name` | Script name |
| `type` | `'onLoad'` \| `'onChange'` \| `'onSubmit'` |
| `catalogItem` | Reference to a `CatalogItem` or `CatalogItemRecordProducer` constant |
| `variableSet` | Reference to a `VariableSet` constant (when `appliesTo: 'set'`) |
| `appliesTo` | `'item'` or `'set'` |
| `variableName` | Variable that triggers `onChange` (use `catalogItem.variables.fieldName`) |
| `script` | Standard ServiceNow JavaScript — use `g_form` APIs as normal |
| `active`, `uiType` | Whether active; `'all'` \| `'mobile'` \| `'desktop'` |
| `appliesOnCatalogItemView` | Run on the catalog item form |
| `appliesOnRequestedItems` | Run on `sc_req_item` records |
| `appliesOnCatalogTasks` | Run on `sc_task` records |
| `appliesOnTargetRecord` | Run on the target record (record producers) |

The `script` property contains standard ServiceNow JavaScript (not TypeScript).
Use `Now.include('./script.client.js')` to load an external `.js` file instead of an inline string.

```ts
export const clearDependentFieldScript = CatalogClientScript({
  $id: Now.ID['clear_dependent_field_script'],
  name: 'Clear dependent field when category changes',
  catalogItem: myItem,
  type: 'onChange',
  variableName: myItem.variables.category,
  active: true,
  uiType: 'all',
  appliesOnCatalogItemView: true,
  script: `
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading || newValue === oldValue) return;
  g_form.setValue('sub_category', '');
  g_form.clearMessages();
}`,
})
```

---

## CatalogItemRecordProducer

Creates a `sc_cat_item_producer` record. Looks like a catalog item but writes to a target table instead of creating a request.

Key properties (in addition to those shared with `CatalogItem`):

| Property | Description |
|----------|-------------|
| `table` | Target table to create a record in (can be a Fluent `Table` constant's `.name` or a string) |
| `redirectUrl` | `'generatedRecord'` to redirect to the created record after submission |
| `canCancel` | Whether the user can cancel the submission |
| `state` | `'published'` \| `'draft'` |
| `variables` | Inline variable definitions; support `mapToField: true` + `field` to auto-populate target table fields |

```ts
export const accessRequestProducer = CatalogItemRecordProducer({
  $id: Now.ID['access_request_producer'],
  name: 'Request System Access',
  shortDescription: 'Use this form to request access to a business application',
  table: accessRequestTable.name,   // reference a Fluent Table constant
  state: 'published',
  availability: 'both',
  redirectUrl: 'generatedRecord',
  canCancel: true,
  variables: {
    application_name: SingleLineTextVariable({
      question: 'Application name',
      order: 100,
      mandatory: true,
      mapToField: true,
      field: 'application',
    }),
    justification: MultiLineTextVariable({
      question: 'Business justification',
      order: 200,
      mandatory: true,
      mapToField: true,
      field: 'justification',
    }),
  },
})
```

---

## Key Guidelines

- Always export catalog constants — `CatalogUiPolicy` and `CatalogClientScript` reference the parent item/set by constant
- Share `VariableSet` definitions across multiple items by exporting and importing them
- Use `variableSet.variables.fieldName` and `catalogItem.variables.fieldName` for type-safe references in conditions and actions
- `CatalogClientScript.script` is standard ServiceNow JavaScript — use `g_form` APIs as normal
- Reference a Fluent `Flow` constant via the `flow` property on `CatalogItem` rather than using a raw `executionPlan` sys_id
- For record producers, set `mapToField: true` on variables to automatically populate target table fields on submission
- Use `appliesOnRequestedItems: true` and `appliesOnCatalogTasks: true` on client scripts to ensure they run through the full order lifecycle