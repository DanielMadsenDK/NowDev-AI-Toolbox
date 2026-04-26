# Service Catalog APIs

Fluent provides first-class support for Service Catalog artifacts. All catalog APIs are imported from `@servicenow/sdk/core`.

```ts
import {
  CatalogItem,
  CatalogItemRecordProducer,
  CatalogClientScript,
  CatalogUiPolicy,
  VariableSet,
  // Variable types:
  SingleLineTextVariable,
  MultiLineTextVariable,
  SelectBoxVariable,
  ReferenceVariable,
  EmailVariable,
  DateVariable,
  DateTimeVariable,
  CheckboxVariable,
  // ... and many more
} from '@servicenow/sdk/core'
```

---

## Table of Contents

- [CatalogItem](#catalogitem)
- [VariableSet](#variableset)
- [Catalog Variable Types](#catalog-variable-types)
- [CatalogUiPolicy](#cataloguipolicy)
- [CatalogClientScript](#catalogclientscript)
- [CatalogItemRecordProducer](#catalogitemrecordproducer)
- [Key Guidelines & Best Practices](#key-guidelines--best-practices)

---

## CatalogItem

Creates a `sc_cat_item` record that users can request from a service catalog. A catalog item must reference a flow, workflow, or execution plan that defines how the item request is fulfilled.

**Required properties:** `$id`, `name`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** A unique ID for the metadata object. Format: `Now.ID['my_item_id']` |
| `name` | String | **Required.** Display name in the catalog |
| `active` | Boolean | Whether the item is active and available (default: `true`) |
| `shortDescription` | String | Short description for catalog home, search results, and title bar |
| `description` | String | Detailed description displayed when user selects item. Can embed videos, images, KB links, and external documentation |
| `availability` | String | Device display mode: `'desktopOnly'` \| `'mobileOnly'` \| `'both'` (default: `'desktopOnly'`) |
| `catalogs` | Array | Array of catalog sys_ids or `Record` constants |
| `categories` | Array | Array of category sys_ids or `Record` constants. A catalog must be specified before categories can be assigned |
| `variableSets` | Array | Ordered list of `{ variableSet: ref, order: number }` pairs for reusable variable groups |
| `variables` | Object | Inline variable definitions using `SingleLineTextVariable()`, `SelectBoxVariable()`, etc. Alternative to separate VariableSet |
| `flow` | Reference or String | Reference to a `Flow` constant or sys_id of a flow `[sys_hub_flow]` for fulfillment. **Preferred over workflow/executionPlan** |
| `workflow` | String | **Deprecated.** sys_id of legacy workflow. Use `flow` instead |
| `executionPlan` | Reference or String | Alternative fulfillment via execution plan `[sc_cat_item_delivery_plan]`. When flow, workflow, and executionPlan are all specified, flow takes precedence |
| `deliveryTime` | Object | Estimated delivery time. Format: `{ days: Number, hours: Number }` |
| `fulfillmentAutomationLevel` | String | Level of fulfillment automation: `'unspecified'` \| `'manual'` \| `'semiAutomated'` \| `'fullyAutomated'` |
| `fulfillmentGroup` | Reference or String | Group `[sys_user_group]` responsible for delivering the item |
| `cost` | Number | One-time cost of the item (default: `0`) |
| `billable` | Boolean | Whether the item is billable (default: `false`) |
| `pricingDetails` | Array | Array of `{ amount, currencyType, field: 'price' \| 'recurring_price' }` objects |
| `recurringFrequency` | String | Time interval for recurring prices (e.g., `'monthly'`, `'yearly'`). **Required when pricingDetails contains recurring_price** |
| `displayPriceProperty` | String | System property controlling price display |
| `ignorePrice` | Boolean | Hide price in cart and catalog listing (default: `true`) |
| `omitPrice` | Boolean | Omit price entirely from all views (default: `false`) |
| `mobileHidePrice` | Boolean | Hide price on mobile devices (default: `false`) |
| `requestMethod` | String | Button label and submission experience: `'order'` (Order Now, confirmation shown, editable delivery), `'request'` (Request, confirmation, no delivery shown), `'submit'` (Submit, no confirmation). Default: `'order'` |
| `roles` | Array | Array of `Role` constants or sys_ids that can access the item |
| `availableFor` | Array | Array of user criteria `[user_criteria]` sys_ids defining who can access the item |
| `notAvailableFor` | Array | Array of user criteria sys_ids defining who **cannot** access. Overrides `availableFor` |
| `assignedTopics` | Array | Array of taxonomy topic sys_ids for visibility in Employee Center portal (requires `sn_ect` plugin) |
| `owner` | Reference or String | User `[sys_user]` who owns the item and has edit access |
| `model` | Reference or String | Product model `[cmdb_model]` associated with the item |
| `vendor` | Reference or String | Vendor associated with the item |
| `location` | Reference or String | Location `[cmn_location]` where the item is provided |
| `icon` | String | 27x27 pixel image file for item icon |
| `picture` | String | Picture file displayed for the item |
| `mobilePicture` | String | Picture for mobile devices (applies only if `mobilePictureType: 'mobilePicture'`) |
| `mobilePictureType` | String | Mobile picture display: `'desktopPicture'` \| `'mobilePicture'` \| `'noPicture'` (default: `'desktopPicture'`) |
| `checkedOut` | Boolean | Whether item is checked out for editing (default: `false`) |
| `state` | String | Publication state (e.g., `'draft'` or `'published'`) |
| `order` | Number | Display order within category (default: `0`) |
| `version` | Number | Item version (default: `1`) |
| `meta` | Array | Array of metadata tags for Zing text indexing (not used by AI Search) |
| `showVariableHelpOnLoad` | Boolean | Display variable help text by default (default: `false`) |
| `startClosed` | Boolean | Start item in collapsed state (default: `false`) |
| `hideAddToCart` | Boolean | Hide "Add to Cart" button (default: `false`) |
| `hideAddToWishList` | Boolean | Hide "Add to Wishlist" button (default: `false`) |
| `hideDeliveryTime` | Boolean | Hide delivery time (default: `false`) |
| `hideQuantitySelector` | Boolean | Hide "Quantity" field (default: `false`) |
| `hideSaveAsDraft` | Boolean | Hide "Save as Draft" button (default: `false`) |
| `hideSP` | Boolean | Hide on Service Portal (default: `false`) |
| `mandatoryAttachment` | Boolean | Require attachment to submit request (default: `false`) |
| `hideAttachment` | Boolean | Hide attachment section (default: `false`) |
| `accessType` | String | User access required: `'restricted'` (only authorized users) \| `'delegated'` (others can request on behalf of someone). Default: `'restricted'` |
| `visibleBundle` | Boolean | Item visible in saved bundles (default: `true`) |
| `visibleGuide` | Boolean | Item visible in order guides (default: `true`) |
| `visibleStandalone` | Boolean | Standalone view visibility (default: `true`) |
| `makeItemNonConversational` | Boolean | Prevent request from conversational experiences like Virtual Agent (default: `false`) |
| `customCart` | Reference or String | Custom UI macro `[sys_ui_macro]` for cart rendering |
| `useScLayout` | Boolean | Use Service Catalog layout for display (default: `true`) |
| `entitlementScript` | Script | Script defining entitlement for the item |
| `deliveryPlanScript` | String | Delivery plan script for the catalog item |
| `noCart` | Boolean | Hide cart (legacy). Default: `false` |
| `noOrder` | Boolean | Hide order (legacy). Default: `false` |
| `noOrderNow` | Boolean | Hide order now (legacy). Default: `false` |
| `noProceedCheckout` | Boolean | Hide proceed to checkout (legacy). Default: `false` |
| `noQuantity` | Boolean | Hide quantity (legacy). Default: `false` |
| `noSearch` | Boolean | Hide from search (legacy). Default: `false` |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Example:**

```ts
import { CatalogItem, SelectBoxVariable, MultiLineTextVariable } from "@servicenow/sdk/core";

export const softwareLicenseRequest = CatalogItem({
  $id: Now.ID["software_license_request"],
  name: "Software License Request",
  shortDescription: "Request a software license",
  description: "Submit a request for new software licensing",
  catalogs: [serviceCatalog],
  categories: [softwareCategory],

  variables: {
    software_name: SingleLineTextVariable({
      question: "Software Name",
      mandatory: true,
      order: 100
    }),
    license_type: SelectBoxVariable({
      question: "License Type",
      choices: {
        individual: { label: "Individual", sequence: 1 },
        team: { label: "Team (5 seats)", sequence: 2 },
        enterprise: { label: "Enterprise (unlimited)", sequence: 3 }
      },
      mandatory: true,
      order: 200
    }),
    justification: MultiLineTextVariable({
      question: "Business Justification",
      mandatory: true,
      order: 300
    })
  },

  pricingDetails: [
    { amount: 0, currencyType: "USD", field: "price" },
    { amount: 99, currencyType: "USD", field: "recurring_price" }
  ],
  recurringFrequency: "monthly",

  flow: myFlow,
  deliveryTime: { days: 3, hours: 0 }
})
```

> **Best Practice:** Prefer passing a Fluent `Flow` constant directly to the `flow` property rather than a raw `executionPlan` sys_id. This keeps the flow and catalog item in the same codebase and allows programmatic reference.

### Taxonomy & Catalog Organization

**Taxonomy** (`taxonomy_topic`): Hierarchical classification on catalog items. Organizes items from broad categories to specific subcategories, improving searchability and navigation — particularly in Employee Center, where it maps items to topics and appears above the item name in search results. Assign topics to a catalog item using the `assignedTopics` property.

**Catalog & Category Assignment**: Items must belong to at least one Catalog (`sc_catalog`) and Category (`sc_category`). Categories can be nested into subcategories. Items can appear in multiple catalogs and categories simultaneously.

**Visibility**: Controlled via user criteria on the catalog item: `availableFor` grants access, `notAvailableFor` restricts it. `notAvailableFor` always overrides `availableFor` when both are present.

### Circular Dependency Resolution (Flow + CatalogItem)

When a flow needs to use `getCatalogVariables` with the catalog item's variables, a circular import arises. Break it by having the **flow** import the CatalogItem (so it can use `getCatalogVariables`), while the **CatalogItem** uses `Now.ref()` to reference the flow without importing it:

```ts
// catalog-item.now.ts — Uses Now.ref(), does NOT import flow
export const myCatalogItem = CatalogItem({
  $id: Now.ID["my_catalog_item"],
  flow: Now.ref("sys_hub_flow", "my_flow"), // No import needed
  variables: { ... }
});

// flow.now.ts — Imports catalog item for getCatalogVariables
import { myCatalogItem } from "../catalog-item.now";

export const myFlow = Flow(
  { $id: Now.ID["my_flow"] },
  wfa.trigger(trigger.application.serviceCatalog, ...),
  _params => {
    const vars = wfa.action(action.core.getCatalogVariables, {
      template_catalog_item: `${myCatalogItem}`,
      catalog_variables: [myCatalogItem.variables.field1, ...]
    });
  }
);
```

1. **Flow** → imports CatalogItem (can use `getCatalogVariables` with variables)
2. **CatalogItem** → uses `Now.ref()` to reference Flow (NO import)

---

## VariableSet

Creates an `item_option_new_set` record grouping related catalog variables together. Variable sets are reusable collections that can be attached to multiple catalog items and record producers.

**Required properties:** `$id`, `title`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['varset_id']` |
| `title` | String | **Required.** Display title of the variable set (appears as collapsible header if `displayTitle: true`) |
| `internalName` | String | Internal name for programmatic access via `g_form` and server scripts. Auto-generated from title if not provided |
| `description` | String | Description of the variable set and its intended use |
| `type` | String | Set type: `'singleRow'` (one set per request) or `'multiRow'` (repeating rows users can add/remove). Default: `'singleRow'` |
| `layout` | String | Column layout: `'normal'` (single column) \| `'2down'` (two columns, one side then other) \| `'2across'` (two columns, alternating). Default: `'normal'` |
| `displayTitle` | Boolean | Show collapsible section header with title (default: `false`) |
| `order` | Number | Display order relative to other variable sets (default: `100`) |
| `setAttributes` | String | Additional comma-separated configuration (e.g., `'max_rows=10,collapsible=true'`). Use `max_rows` for multi-row sets. Note: `AttachmentVariable`, `ContainerVariable`, `HtmlVariable`, `CustomVariable` not supported in multi-row |
| `readRoles` | Array | Array of `Role` constants or sys_ids that can **view** the variable set |
| `writeRoles` | Array | Array of `Role` constants or sys_ids that can **modify** variable values in the set |
| `createRoles` | Array | Array of `Role` constants or sys_ids that can **create row instances** (applies only to `multiRow` sets) |
| `variables` | Object | Object of named variable definitions using type-specific functions |
| `name` | String | Optional name for additional identification |
| `version` | Number | Variable set version (default: `0`) |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Key constraints:**
- Variable sets within a catalog item can't have the same internal name
- Within a catalog item, variable names can't duplicate variable set titles or internal names
- Catalog client scripts and UI policy scripts must refer to the internal name of a variable set, not the title

**Single-row with checkbox pricing:**

```ts
import { VariableSet, CheckboxVariable } from '@servicenow/sdk/core'

export const addOnsSet = VariableSet({
    $id: Now.ID['add_ons_set'],
    title: 'Add-on Options',
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Premium Support',
            order: 1,
            selectionRequired: true,
            pricingDetails: [
                { amount: 100, currencyType: 'USD', field: 'price_if_checked' },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 2,
            selectionRequired: false,
        }),
    },
})
```

**Multi-row with checkbox pricing (including recurring):**

`rec_price_if_checked` applies a recurring charge when the checkbox is checked. Multi-row sets allow users to add multiple row instances:

```ts
export const multiRowAddOns = VariableSet({
    $id: Now.ID['multi_row_add_ons'],
    title: 'Multi-Row Add-on Options',
    type: 'multiRow',
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Premium Support',
            order: 1,
            selectionRequired: true,
            pricingDetails: [
                { amount: 100, currencyType: 'USD', field: 'price_if_checked' },
                { amount: 50, currencyType: 'GBP', field: 'rec_price_if_checked' },
            ],
        }),
        extendedWarranty: CheckboxVariable({
            question: 'Extended Warranty',
            order: 2,
            pricingDetails: [
                { amount: 200, currencyType: 'EUR', field: 'price_if_checked' },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 3,
            selectionRequired: false,
        }),
    },
})
```

**Multi-row with SelectBox — table-sourced and custom choices:**

```ts
import { VariableSet, SelectBoxVariable } from '@servicenow/sdk/core'

export const supportTierSet = VariableSet({
    $id: Now.ID['support_tier_set'],
    title: 'Support Tiers',
    type: 'multiRow',
    variables: {
        // Choices driven from an existing table field
        priorityLevel: SelectBoxVariable({
            question: 'Priority (from table)',
            order: 1,
            choiceTable: 'incident',
            choiceField: 'priority',
        }),
        // Manual choices with per-choice pricing
        supportLevel: SelectBoxVariable({
            question: 'Support Level',
            order: 2,
            choices: {
                basic: {
                    label: 'Basic Support',
                    sequence: 1,
                    inactive: false,
                    pricingDetails: [{ field: 'misc', amount: 50, currencyType: 'USD' }],
                },
                standard: {
                    label: 'Standard Support',
                    sequence: 2,
                    inactive: false,
                },
                premium: {
                    label: 'Premium Support',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
        deliveryMethod: SelectBoxVariable({
            question: 'Delivery Method',
            order: 3,
            choices: {
                email: { label: 'Email', sequence: 1, inactive: false },
                download: { label: 'Download', sequence: 2, inactive: false },
                physical: { label: 'Physical Media', sequence: 3, inactive: false },
            },
        }),
    },
})
```

**Single-row with layout and roles:**

```ts
import {
  VariableSet,
  EmailVariable,
  SingleLineTextVariable,
  ReferenceVariable
} from "@servicenow/sdk/core";

export const contactInfoSet = VariableSet({
  $id: Now.ID["contact_info_set"],
  title: "Contact Information",
  description: "Standard contact information fields",
  type: "singleRow",
  layout: "2across",
  order: 100,
  displayTitle: true,
  variables: {
    email: EmailVariable({
      question: "Email Address",
      mandatory: true,
      order: 100
    }),
    phone: SingleLineTextVariable({
      question: "Phone Number",
      mandatory: true,
      order: 200
    }),
    department: ReferenceVariable({
      question: "Department",
      referenceTable: "cmn_department",
      order: 300
    })
  }
})
```

To reference a variable name in `CatalogUiPolicy` conditions or actions:
```ts
contactInfoSet.variables.email   // type-safe variable name reference
```

**Sharing variable sets:** Export and import to use the same set across multiple catalog items:
```ts
// in varsets.now.ts
export const contactInfoSet = VariableSet({ ... })

// in item.now.ts
import { contactInfoSet } from './varsets.now.ts'
export const myItem = CatalogItem({
  variableSets: [{ variableSet: contactInfoSet, order: 100 }],
  ...
})
```

---

## Catalog Variable Types

All variable types are imported from `@servicenow/sdk/core`.

| Category | Types |
|----------|-------|
| **Text** | `SingleLineTextVariable`, `WideSingleLineTextVariable`, `MultiLineTextVariable`, `EmailVariable`, `UrlVariable`, `IpAddressVariable`, `MaskedVariable` |
| **Choice** | `SelectBoxVariable`, `MultipleChoiceVariable`, `CheckboxVariable`, `YesNoVariable`, `NumericScaleVariable` |
| **Lookup** | `LookupSelectBoxVariable`, `LookupMultipleChoiceVariable` |
| **Reference** | `ReferenceVariable`, `RequestedForVariable`, `ListCollectorVariable` |
| **Date/Time** | `DateVariable`, `DateTimeVariable`, `DurationVariable` |
| **Layout** | `ContainerStartVariable`, `ContainerSplitVariable`, `ContainerEndVariable`, `LabelVariable`, `BreakVariable` |
| **Special** | `AttachmentVariable`, `HtmlVariable`, `RichTextLabelVariable`, `CustomVariable`, `CustomWithLabelVariable`, `UIPageVariable` |

---

### Common Variable Properties

Most types share the properties from `BaseVariableConfig` and `VariableConfig`. The `mandatory`, `readOnly`, and `hidden` properties are mutually exclusive: you cannot set `mandatory: true` when `hidden` or `readOnly` is `true`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `question` | String | — | Label shown to the user. Required for most types |
| `order` | Number | — | Sort order on the form |
| `active` | Boolean | `true` | Whether the variable is active |
| `mandatory` | Boolean | `false` | Field is required. Cannot be `true` when `hidden` or `readOnly` is `true` |
| `readOnly` | Boolean | `false` | Field is read-only. Cannot be `true` when `mandatory` is `true` |
| `hidden` | Boolean | `false` | Field is hidden. Cannot be `true` when `mandatory` is `true` |
| `defaultValue` | Type-specific | — | Pre-filled value |
| `tooltip` | String | — | Help text shown in a tooltip icon |
| `showHelp` | Boolean | `false` | Display the help section below the field |
| `helpTag` | String | — | Title of the help section |
| `helpText` | String | — | Content of the help section |
| `instructions` | String | — | Instructions shown above the field |
| `exampleText` | String | — | Example input shown as placeholder text |
| `conversationalLabel` | String | — | Label used in Virtual Agent conversations |
| `width` | Number | — | Column width in percent: `25`, `50`, `75`, or `100` |
| `attributes` | String | — | Comma-separated additional attributes |
| `description` | String | — | Internal description of the variable |
| `mapToField` | Boolean | `false` | Map variable value to a field on the target record (record producers) |
| `field` | String | — | Target field name when `mapToField: true` |
| `readRoles` | Array | — | Roles that can **view** the variable |
| `writeRoles` | Array | — | Roles that can **edit** the variable |
| `createRoles` | Array | — | Roles that can **create** rows in multi-row sets |
| `visibleBundle` | Boolean | `true` | Show in bundle views |
| `visibleGuide` | Boolean | `true` | Show in order guide views |
| `visibleStandalone` | Boolean | `true` | Show in standalone catalog views |
| `visibleSummary` | Boolean | — | Show in request summary |
| `pricingDetails` | Array | — | Pricing associated with the variable: `{ amount, currencyType, field }`. `field` values: `'price'` (one-time price), `'recurring_price'` (recurring), `'price_if_checked'` (checkbox activation price), `'rec_price_if_checked'` (recurring checkbox price), `'misc'` (miscellaneous one-time), `'rec_misc'` (miscellaneous recurring) |
| `pricingImplications` | Boolean | — | Whether variable value affects pricing |
| `useDynamicDefault` | Boolean | — | Use a dynamic default value |
| `dotWalkPath` | String | — | Dot-walk path for dynamic default field resolution |
| `dependentQuestion` | String | — | Variable name that this variable's dynamic default depends on |
| `disableInitialSlotFill` | Boolean | — | Prevent slot filling in Virtual Agent on load |
| `removeFromConversationalInterfaces` | Boolean | — | Hide from Virtual Agent entirely |
| `alwaysExpand` | Boolean | — | Always show expanded (not collapsed) |
| `unique` | Boolean | — | Require a unique value |
| `readScript` | String | — | Server-side script executed when value is read |
| `postInsertScript` | String | — | Server-side script executed after variable is inserted |

---

### Type-Specific Options

#### Text Variables

**`SingleLineTextVariable`** / **`WideSingleLineTextVariable`**
- `validateRegex` — Reference to a `question_regex` record or regex string for validation

**`MultiLineTextVariable`** — No extra options beyond common properties

**`MaskedVariable`** — Masked/password input
- `useConfirmation` — Show a confirmation field to re-enter the value
- `useEncryption` — Encrypt the stored value

**`HtmlVariable`** — Rich HTML content field
- `defaultHTML` — Default HTML content (in addition to `defaultValue`)

**`RichTextLabelVariable`** — Read-only rich text label (no user input)
- Uses `richText` instead of `question` for the HTML content to display
- Does not support `mandatory`, `hidden`, or `readOnly`

**`EmailVariable`** — Email address input. No extra options beyond common properties

**`UrlVariable`** — URL input. No extra options beyond common properties

**`IpAddressVariable`** — IPv4/IPv6 address input. No extra options beyond common properties

---

#### Selection Variables

**`SelectBoxVariable`** — Single-select dropdown
- `choices` — `{ key: { label: string, sequence: number, pricingDetails?: [...] } }` — choice options with optional per-choice pricing
- `choiceTable` — Table to pull choices from (instead of `choices`)
- `choiceField` — Field on `choiceTable` to use as choice values
- `includeNone` — Add a blank "None" option
- `uniqueValuesOnly` — Restrict to unique values only

**`MultipleChoiceVariable`** — Single-select radio buttons
- `choices` — Same format as `SelectBoxVariable`
- `choiceDirection` — `'down'` (vertical list) or `'across'` (horizontal)
- `includeNone` — Add a blank option
- `doNotSelectFirstChoice` — Do not auto-select the first choice

**`CheckboxVariable`** — Boolean checkbox (true/false)
- `selectionRequired` — When `true`, the checkbox must be checked to submit. When `selectionRequired: true`, `mandatory`, `readOnly`, and `hidden` are not supported
- `pricingDetails` — Array of `{ amount, currencyType, field }` pricing entries applied when the checkbox is checked. Use `field: 'price_if_checked'` for one-time price on check

**`YesNoVariable`** — Yes/No radio buttons
- `includeNone` — Add a "None" option in addition to Yes/No

**`NumericScaleVariable`** — Numeric rating scale
- `scaleMin` — Minimum value
- `scaleMax` — Maximum value
- `doNotSelectFirstChoice` — Do not auto-select the minimum value

---

#### Lookup Variables

Lookup variables display choices sourced from a table's field values. Useful when choices should reflect live data from ServiceNow tables.

**`LookupSelectBoxVariable`** — Single-select lookup from table
- `lookupFromTable` — Table to look up values from
- `lookupValueField` — Field on the table to use as the stored value
- `lookupLabelFields` — Array of field names to display as labels
- `lookupPriceField` — Field to read price from
- `lookupRecurringPriceField` — Field to read recurring price from
- `lookupSource` — Set to `'choices'` to use choice field instead of table lookup
- `choiceTable` — Source table when `lookupSource: 'choices'`
- `choiceField` — Source field when `lookupSource: 'choices'`
- `choicesDependOn` — Variable name this lookup depends on (for cascading)
- `referenceQual` — Filter query for records
- `choiceDirection` — `'down'` or `'across'`
- `includeNone` — Add a blank option
- `uniqueValuesOnly` — Restrict to unique values

**`LookupMultipleChoiceVariable`** — Multi-select lookup (radio buttons from table). Same properties as `LookupSelectBoxVariable`.

---

#### Reference Variables

**`ReferenceVariable`** — Single record reference (reference field)
- `referenceTable` — **Required.** Table to reference (e.g., `'sys_user_group'`)
- `useReferenceQualifier` — Filter mode: `'simple'` \| `'dynamic'` \| `'advanced'`
- `referenceQualCondition` — Encoded filter (only with `'simple'`)
- `dynamicRefQual` — Dynamic filter record `[sys_filter_option_dynamic]` (only with `'dynamic'`)
- `referenceQual` — Advanced JavaScript qualifier script (only with `'advanced'`)

**`ListCollectorVariable`** — Multi-record reference (list)
- `listTable` — **Required.** Table to collect records from
- `referenceQual` — Filter query

**`RequestedForVariable`** — "Requested For" user reference (pre-wired to `sys_user`)
- `enableAlsoRequestFor` — Show "Also Request For" additional user field
- `rolesToUseAlsoRequestFor` — Roles that can see the "Also Request For" field
- `useReferenceQualifier` — `'simple'` \| `'dynamic'` \| `'advanced'`
- `referenceQualCondition` — Filter (with `'simple'`)
- `dynamicRefQual` — Dynamic filter (with `'dynamic'`)
- `referenceQual` — Advanced qualifier script (with `'advanced'`)

---

#### Date/Time Variables

**`DateVariable`** — Date picker. No extra options beyond common properties

**`DateTimeVariable`** — Date and time picker. No extra options beyond common properties

**`DurationVariable`** — Duration input. No extra options beyond common properties

---

#### Special Variables

**`AttachmentVariable`** — File upload. No extra options beyond common properties. Not supported in multi-row variable sets

---

#### Custom UI Variables

**`CustomVariable`** — Embeds a custom UI component in the form
- `macro` — UI macro `[sys_ui_macro]` to render
- `summaryMacro` — UI macro shown in the request summary
- `widget` — Service Portal widget `[sp_widget]`
- `macroponent` — UX macroponent `[sys_ux_macroponent]`
- `topicBlock` — Virtual Agent topic block `[sys_cs_topic]`

**`CustomWithLabelVariable`** — Same as `CustomVariable` with a visible label. Does not support `mandatory`, `hidden`, or `readOnly`.

**`UIPageVariable`** — Embeds a UI Page in the form
- `uiPage` — UI Page `[sys_ui_page]` to embed

---

#### Layout Variables

**`LabelVariable`** — Display-only text label (read-only, no input)

**`BreakVariable`** — Horizontal separator line. Only supports `order`, `active`, `disableInitialSlotFill`

**`ContainerStartVariable`** — Starts a collapsible section grouping
- `question` — Section title (only required when `displayTitle: true`)
- `displayTitle` — Show section header (default: `false`)
- `layout` — `'normal'` \| `'2across'` \| `'2down'`

**`ContainerSplitVariable`** — Column split inside a container. Only supports `order`, `active`, `disableInitialSlotFill`

**`ContainerEndVariable`** — Closes a container section. Only supports `order`, `active`, `disableInitialSlotFill`

**Layout container example:**
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

### ExtendedChoices — Per-Choice Pricing

For `SelectBoxVariable` and `MultipleChoiceVariable`, each choice entry can carry its own pricing:

```ts
choices: {
  standard: {
    label: 'Standard License',
    sequence: 1,
    pricingDetails: [{ amount: 99, currencyType: 'USD', field: 'price' }]
  },
  enterprise: {
    label: 'Enterprise License',
    sequence: 2,
    pricingDetails: [{ amount: 499, currencyType: 'USD', field: 'price' }]
  }
}
```

---

## CatalogUiPolicy

Creates a `catalog_ui_policy` record that controls variable behavior on catalog item forms based on conditions. Catalog UI policies can make variables mandatory, read-only, visible, or hidden. For validation, calculations, or asynchronous calls, use catalog client scripts instead.

**Required properties:** `$id`, `shortDescription`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['policy_id']` |
| `shortDescription` | String | **Required.** Short description of what the policy does |
| `description` | String | Detailed description of the policy |
| `catalogItem` | Reference or String | Reference to `CatalogItem` or `CatalogItemRecordProducer` constant, or sys_id of catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]`. Mutually exclusive with `variableSet`. |
| `variableSet` | Reference or String | Reference to `VariableSet` constant, or sys_id of variable set `[item_option_new_set]`. Mutually exclusive with `catalogItem`. |
| `appliesTo` | String | Scope: `'item'` (specific catalog item) or `'set'` (whole variable set). Default: `'item'` |
| `catalogCondition` | String | Encoded query conditions based on variable values. Example: ``${item.variables.priority}=high^EQ`` |
| `active` | Boolean | Whether the policy is active (default: `true`) |
| `global` | Boolean | Whether the policy applies globally across all catalog contexts (default: `false`) |
| `onLoad` | Boolean | Whether the policy runs when the form loads. If `false`, applies only on variable changes (default: `true`) |
| `reverseIfFalse` | Boolean | Reverse UI actions when condition evaluates to false (default: `true`) |
| `isolateScript` | Boolean | Whether policy scripts run in isolated scope (default: `true`) |
| `appliesOnCatalogItemView` | Boolean | Apply to catalog items displayed in order screen (requester view). Default: `true` |
| `appliesOnTargetRecord` | Boolean | Apply to records created for task-extended tables via record producers. Default: `false` |
| `appliesOnCatalogTasks` | Boolean | Apply to catalog task forms (fulfiller view). Default: `false` |
| `appliesOnRequestedItems` | Boolean | Apply to requested item forms (fulfiller view). Default: `false` |
| `runScripts` | Boolean | Whether to run `executeIfTrue` and `executeIfFalse` scripts. Use for behaviors beyond read-only/mandatory/visible (default: `false`) |
| `executeIfTrue` | String | Client-side script that runs when condition is `true`. Must be wrapped in `function onCondition() { }` |
| `executeIfFalse` | String | Client-side script that runs when condition is `false`. Must be wrapped in `function onCondition() { }` |
| `runScriptsInUiType` | String | UI types where scripts run: `'desktop'` \| `'mobileOrServicePortal'` \| `'all'`. Default: `'desktop'` |
| `vaSupported` | Boolean | Whether policy is supported in Virtual Agent conversations (default: `false`) |
| `order` | Number | Evaluation order relative to other policies |
| `actions` | Array | List of variable actions to perform when condition is met. See actions array section |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Minimal policy (no condition or actions):**

```ts
import { CatalogUiPolicy } from '@servicenow/sdk/core'

export const basicPolicy = CatalogUiPolicy({
    $id: Now.ID['basic_catalog_policy'],
    catalogItem: 'my-catalog-item',
    shortDescription: 'Basic catalog UI policy',
})
```

**Policy with variable actions:**

`variableMessage` + `variableMessageType` display inline feedback. `valueAction: 'setValue'` sets a default value on trigger:

```ts
export const actionsPolicy = CatalogUiPolicy({
    $id: Now.ID['catalog_ui_policy_with_actions'],
    catalogItem: 'my-catalog-item',
    shortDescription: 'Policy with field actions',
    actions: [
        {
            variableName: 'var_description',
            visible: true,
            readOnly: true,
            mandatory: true,
        },
        {
            variableName: 'var_urgency',
            visible: true,
            mandatory: true,
            variableMessageType: 'error',
            variableMessage: 'This field is required',
            valueAction: 'setValue',
            value: 'default urgency value',
            order: 200,
        },
    ],
})
```

**Policy with conditional scripts:**

Set `runScripts: true` to enable `executeIfTrue`/`executeIfFalse`. Use `runScriptsInUiType` to limit which UI surfaces run the scripts. Scripts must use the `function onCondition() {}` wrapper:

```ts
export const scriptedPolicy = CatalogUiPolicy({
    $id: Now.ID['catalog_ui_policy_with_scripts'],
    catalogItem: 'my-catalog-item',
    shortDescription: 'Policy with conditional scripts',
    runScripts: true,
    runScriptsInUiType: 'mobileOrServicePortal',
    executeIfTrue: 'function onCondition() { g_form.addErrorMessage("Condition met"); }',
    executeIfFalse: 'function onCondition() { g_form.clearMessages(); }',
    catalogCondition: 'var_short_descriptionENDSWITH^EQ',
    global: true,
    reverseIfFalse: true,
    isolateScript: true,
})
```

**Policy with condition and catalog item reference:**

```ts
import { CatalogUiPolicy } from "@servicenow/sdk/core";

export const managerApprovalPolicy = CatalogUiPolicy({
  $id: Now.ID["manager_approval_policy"],
  shortDescription: "Show manager approval when high priority selected",
  catalogItem: hardwareRequestItem,
  catalogCondition: `${hardwareRequestItem.variables.priority}=high^EQ`,
  active: true,
  onLoad: true,
  appliesOnCatalogItemView: true,
  appliesOnRequestedItems: true,
  actions: [
    {
      variableName: hardwareRequestItem.variables.manager_approval,
      visible: true,
      mandatory: true,
      order: 100
    }
  ]
})
```

---

### actions array

Configures the variable actions `[catalog_ui_policy_action]` that a catalog UI policy performs on variables when its conditions are met.

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `variableName` | String | **Required.** The variable to which the action applies. Use `catalogItem.variables.fieldName` or `variableSet.variables.fieldName` |
| `visible` | Boolean | Make the variable visible (default: `false`) |
| `mandatory` | Boolean | Make the variable required (default: `false`) |
| `readOnly` | Boolean | Make the variable read-only (default: `false`) |
| `cleared` | Boolean | Clear the variable value when condition is met (default: `false`) |
| `variableMessage` | String | Message to display on the variable (requires `variableMessageType` to have a value) |
| `variableMessageType` | String | Message type: `'info'` \| `'warning'` \| `'error'` |
| `value` | String | Value to set on the variable (requires `valueAction: 'setValue'`) |
| `valueAction` | String | Action: `'setValue'` (sets variable to `value` property) \| `'clearValue'` (clears variable) |
| `order` | Number | Evaluation order relative to other actions (default: `100`) |

> **Note:** The `disabled` property does not exist on actions — use `readOnly` to make a field non-editable.

**Example:**

```ts
actions: [
  {
    variableName: laptopRequest.variables.justification,
    mandatory: true,
    variableMessage: "Justification required for urgent requests",
    variableMessageType: "info",
    order: 100
  },
  {
    variableName: laptopRequest.variables.manager_approval,
    visible: true,
    mandatory: true,
    order: 200
  },
  {
    variableName: laptopRequest.variables.delivery_date,
    visible: true,
    value: "2025-04-01",
    valueAction: "setValue",
    order: 300
  }
]
```

---

## CatalogClientScript

Creates a `catalog_script_client` record that runs on the client side to control catalog item form behavior. Use client scripts to validate user input, auto-populate fields, or display alerts. For simple show/hide, mandatory, and read-only logic, use catalog UI policies instead.

**Required properties:** `$id`, `name`, `script`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['script_id']` |
| `name` | String | **Required.** Unique name for the catalog client script |
| `script` | Script | **Required.** Client-side script code. Standard ServiceNow JavaScript (not TypeScript). Use `g_form` APIs. Use `Now.include('./file.js')` to reference external file |
| `type` | String | Event type: `'onLoad'` (runs when form loads, setup/defaults) \| `'onChange'` (runs on variable change, include `if (isLoading) return;` guard) \| `'onSubmit'` (runs on submission, return `false` to block) |
| `catalogItem` | Reference or String | Reference to `CatalogItem` or `CatalogItemRecordProducer` constant, or sys_id of catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]`. Mutually exclusive with `variableSet`. |
| `variableSet` | Reference or String | Reference to `VariableSet` constant, or sys_id of variable set `[item_option_new_set]`. Mutually exclusive with `catalogItem`. |
| `variableName` | String | Variable that triggers script. Only applies when `type` is `'onChange'`. Use `catalogItem.variables.fieldName` for type-safe references |
| `appliesTo` | String | Scope: `'item'` (specific catalog item) or `'set'` (whole variable set). Default: `'item'` |
| `uiType` | String | UI interface: `'desktop'` (desktop interface) \| `'mobileOrServicePortal'` (mobile/Service Portal) \| `'all'` (all interfaces). Default: `'desktop'` |
| `active` | Boolean | Whether the client script is enabled (default: `true`) |
| `global` | Boolean | Whether script runs in global scope (default: `true`) |
| `appliesOnCatalogItemView` | Boolean | Apply to catalog items displayed in order screen (requester view). Default: `true` |
| `appliesOnRequestedItems` | Boolean | Apply to requested item forms after item is requested (fulfiller view). Default: `false` |
| `appliesOnCatalogTasks` | Boolean | Apply to catalog task forms for the item (fulfiller view). Default: `false` |
| `appliesOnTargetRecord` | Boolean | Apply to records created for task-extended tables via record producers. Default: `false` |
| `vaSupported` | Boolean | Whether script is supported in Virtual Agent conversations (default: `false`) |
| `isolateScript` | Boolean | Run script in strict mode — disables direct DOM access, jQuery, prototype, and window (default: `false`) |
| `publishedRef` | String | sys_id of published catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]` this script references |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Script type guidelines:**
- **onLoad:** Set initial field states, default values, visibility. No guard needed
- **onChange:** Include `if (isLoading) return;` guard. Avoid long operations
- **onSubmit:** Return `false` to block submission. Avoid GlideAjax due to async issues — use server-side business rules instead

**onLoad — show a welcome message on form load:**

```ts
import { CatalogClientScript } from '@servicenow/sdk/core'

export const welcomeScript = CatalogClientScript({
    $id: Now.ID['onload_welcome'],
    name: 'Show Welcome Message',
    type: 'onLoad',
    script: `function onLoad() { g_form.addInfoMessage('Welcome to this catalog item') }`,
    catalogItem: 'test-catalog-item',
    uiType: 'all',
})
```

**onLoad — using an external file:**

```ts
export const laptopOnLoadScript = CatalogClientScript({
    $id: Now.ID['laptop_onload'],
    name: 'Laptop Request - OnLoad',
    script: Now.include('../../client/laptop-onload.js'),
    type: 'onLoad',
    catalogItem: laptopRequest,
    active: true,
    uiType: 'all',
    appliesOnCatalogItemView: true,
})
```

```js
// laptop-onload.js
function onLoad() {
    g_form.setReadOnly('estimated_cost', true)
    g_form.setValue('estimated_cost', '$0')
    g_form.setMandatory('justification', true)
}
```

**onChange — clear a dependent field when another changes:**

```ts
export const categoryChangeScript = CatalogClientScript({
    $id: Now.ID['category_change'],
    name: 'Clear dependent field when category changes',
    catalogItem: myItem,
    type: 'onChange',
    variableName: myItem.variables.category,
    script: `
function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || newValue === oldValue) return;
    g_form.setValue('subcategory', '');
    g_form.clearMessages();
}`,
    active: true,
    uiType: 'all',
    appliesOnCatalogItemView: true,
})
```

**onSubmit — validate a variable set before submission:**

Use `variableSet` + `appliesTo: 'set'` when the script belongs to a reusable variable set rather than a specific catalog item. Return `false` to block submission:

```ts
export const validateOnSubmit = CatalogClientScript({
    $id: Now.ID['onsubmit_validation'],
    name: 'Validate on Submit',
    type: 'onSubmit',
    script: `function onSubmit() {
    if (!g_form.getValue('description')) {
        g_form.addErrorMessage('Please provide a description');
        return false;
    }
    return true;
}`,
    variableSet: 'my-variable-set-name',
    appliesTo: 'set',
    uiType: 'mobileOrServicePortal',
    active: true,
    appliesOnCatalogItemView: true,
    appliesOnRequestedItems: false,
    appliesOnCatalogTasks: false,
    appliesOnTargetRecord: false,
})
```

---

## CatalogItemRecordProducer

Creates a `sc_cat_item_producer` record that looks like a catalog item but writes to a target table instead of creating a request. Record producers are typically used for creating incident, change request, or other task records directly from the service catalog.

You can create record producers for tables and database views in the same scope, or for tables that allow create access from applications in other scopes.

**Required properties:** `$id`, `name`, `table`

**All properties (in addition to CatalogItem properties):**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['producer_id']` |
| `name` | String | **Required.** Display name in the catalog |
| `table` | Reference or String | **Required.** Target table where records are created. Can be Fluent `Table` constant's `.name` or table name string (e.g., `'incident'`) |
| `view` | Reference or String | UI view `[sys_ui_view]` to apply. Use `default_view` constant (imported from `'@servicenow/sdk/core'`) for the default view |
| `model` | Reference or String | CMDB model `[cmdb_model]` associated with the producer |
| `shortDescription` | String | Short description displayed in catalog search and title bar |
| `description` | String | Detailed description shown when user selects item. Can embed videos, images, KB links, and documentation |
| `state` | String | Publication state: `'draft'` or `'published'` |
| `variables` | Object | Inline variable definitions. Support `mapToField: true` + `field: 'fieldname'` to auto-populate target table fields |
| `variableSets` | Array | Ordered list of `{ variableSet: ref, order: number }` pairs |
| `availability` | String | Device display: `'desktopOnly'` \| `'mobileOnly'` \| `'both'`. Default: `'desktopOnly'` |
| `active` | Boolean | Whether active and available to order (default: `true`) |
| `order` | Number | Display order within category (default: `0`) |
| `version` | Number | Item version (default: `1`) |
| `script` | String or Function | Server-side script that runs **before** the record is created. Accepts a string, `Now.include('./script.js')`, or a function: `(producer: RecordProducerContext, current: GlideRecord) => void`. **Don't call `current.update()` or `current.insert()`** |
| `postInsertScript` | String or Function | Server-side script that runs **after** the record is inserted. Accepts a string, `Now.include('./script.js')`, or a function: `(producer: RecordProducerContext, current: GlideRecord, cat_item: RecordProducerDefinition) => void`. Can call `current.update()` |
| `saveScript` | String or Function | Script that runs at every step save in Catalog Builder. Accepts a string, `Now.include('./script.js')`, or a function: `(producer: RecordProducerContext, current: GlideRecord, cat_item: RecordProducerDefinition) => void`. Executed before main `script` |
| `saveOptions` | String | Advanced configuration options for saving the record producer |
| `redirectUrl` | String | Redirect destination after record is generated: `'generatedRecord'` (created task record) or `'catalogHomePage'`. Default: `'generatedRecord'` |
| `allowEdit` | Boolean | Whether users can edit the created record after submission (default: `false`) |
| `canCancel` | Boolean | Display Cancel button to return to last-viewed screen (default: `false`) |
| `roles` | Array | Array of `Role` constants or sys_ids that can access the producer |
| `owner` | Reference or String | User `[sys_user]` who owns the producer |
| `catalogs` | Array | Array of catalog sys_ids or `Record` constants in which producer appears |
| `categories` | Array | Array of category sys_ids or `Record` constants (catalog must be specified first) |
| `icon` | String | 27x27 pixel image file for icon |
| `picture` | String | Picture file displayed for the producer |
| `mobilePicture` | String | Mobile-specific picture (applies only if `mobilePictureType: 'mobilePicture'`) |
| `mobilePictureType` | String | Mobile picture type: `'desktopPicture'` \| `'mobilePicture'` \| `'noPicture'`. Default: `'desktopPicture'` |
| `hideAddToCart` | Boolean | Hide "Add to Cart" button (default: `false`) |
| `hideAddToWishList` | Boolean | Hide "Add to Wishlist" button (default: `false`) |
| `hideDeliveryTime` | Boolean | Hide delivery time (default: `false`) |
| `hideQuantitySelector` | Boolean | Hide "Quantity" field (default: `false`) |
| `hideSaveAsDraft` | Boolean | Hide "Save as Draft" button (default: `false`) |
| `hideSP` | Boolean | Hide on Service Portal (default: `false`) |
| `mandatoryAttachment` | Boolean | Require attachment to submit (default: `false`) |
| `hideAttachment` | Boolean | Hide attachment section (default: `false`) |
| `assignedTopics` | Array | Array of taxonomy topic sys_ids for Employee Center portal visibility (requires `sn_ect` plugin) |
| `availableFor` | Array | Array of user criteria `[user_criteria]` sys_ids defining access |
| `notAvailableFor` | Array | Array of user criteria sys_ids defining who **cannot** access. Overrides `availableFor` |
| `meta` | Array | Array of metadata tags for Zing text indexing |
| `visibleBundle` | Boolean | Visible in saved bundles (default: `true`) |
| `visibleGuide` | Boolean | Visible in order guides (default: `true`) |
| `visibleStandalone` | Boolean | Standalone view visible (default: `true`) |
| `checkedOut` | Boolean | Whether checked out for editing (default: `false`) |
| `startClosed` | Boolean | Start in collapsed state (default: `false`) |
| `showVariableHelpOnLoad` | Boolean | Display variable help by default (default: `false`) |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Script context:**
- `script(producer, current)` — runs before record creation. `producer.var_name` accesses variables. Do NOT call `current.update()` or `current.insert()`
- `postInsertScript(producer, current, cat_item)` — runs after insertion. Safe to call `current.update()`. `cat_item` is the Record Producer definition
- `saveScript(producer, current, cat_item)` — runs at each Catalog Builder step save, before `script`

**Module pattern (function form):** Instead of string scripts, you can pass typed functions directly. The platform serializes them for server-side execution:

```ts
export const incidentProducer = CatalogItemRecordProducer({
  $id: Now.ID["incident_producer"],
  name: "Report Incident",
  table: "incident",
  script: (producer, current) => {
    current.urgency = producer.urgency;
    current.short_description = producer.summary;
  },
  postInsertScript: (producer, current, cat_item) => {
    current.work_notes = "Created via Record Producer: " + cat_item.name;
    current.update();
  },
  variables: { ... }
});
```

**Example — checkbox pricing:**

```ts
import { CatalogItemRecordProducer, CheckboxVariable } from '@servicenow/sdk/core'

export const checkboxPricingProducer = CatalogItemRecordProducer({
    $id: Now.ID['checkbox_pricing_rp'],
    name: 'Laptop Request with Add-ons',
    table: 'task',
    shortDescription: 'Request a laptop with optional add-ons',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'],
    variables: {
        premiumSupport: CheckboxVariable({
            question: 'Add Premium Support',
            order: 1,
            selectionRequired: false,
            pricingDetails: [
                { amount: 100, currencyType: 'USD', field: 'price_if_checked' },
            ],
        }),
        rushDelivery: CheckboxVariable({
            question: 'Rush Delivery',
            order: 2,
            selectionRequired: false,
        }),
    },
})
```

**Example — SelectBox from table and with per-choice pricing:**

```ts
import { CatalogItemRecordProducer, SelectBoxVariable } from '@servicenow/sdk/core'

export const supportTierProducer = CatalogItemRecordProducer({
    $id: Now.ID['support_tier_rp'],
    name: 'Support Plan Selection',
    table: 'task',
    shortDescription: 'Choose a support tier',
    catalogs: ['e0d08b13c3330100c8b837659bba8fb4'],
    variables: {
        // Choices sourced from an existing table and field
        priorityLevel: SelectBoxVariable({
            question: 'Priority (from table)',
            order: 1,
            choiceTable: 'task',
            choiceField: 'priority',
        }),
        // Custom choices with per-choice pricing
        supportLevel: SelectBoxVariable({
            question: 'Support Level',
            order: 2,
            choices: {
                basic: {
                    label: 'Basic Support',
                    sequence: 1,
                    inactive: false,
                    pricingDetails: [{ field: 'misc', amount: 50, currencyType: 'USD' }],
                },
                standard: {
                    label: 'Standard Support',
                    sequence: 2,
                    inactive: false,
                    pricingDetails: [
                        { field: 'misc', amount: 100, currencyType: 'USD' },
                        { field: 'rec_misc', amount: 25, currencyType: 'USD' },
                    ],
                },
                premium: {
                    label: 'Premium Support',
                    sequence: 3,
                    inactive: false,
                },
            },
        }),
    },
})
```

**Example — comprehensive variable showcase:**

```ts
import {
    CatalogItemRecordProducer,
    CheckboxVariable,
    DateVariable,
    DateTimeVariable,
    EmailVariable,
    ListCollectorVariable,
    MaskedVariable,
    MultiLineTextVariable,
    ReferenceVariable,
    SelectBoxVariable,
    SingleLineTextVariable,
    UrlVariable,
    YesNoVariable,
} from '@servicenow/sdk/core'

export const softwareInstallProducer = CatalogItemRecordProducer({
    $id: Now.ID['software_install_rp'],
    name: 'Software Installation Request',
    table: 'task',
    shortDescription: 'Request software installation on your company device',
    meta: ['software', 'installation', 'IT'],
    variables: {
        agreedToTerms: CheckboxVariable({ question: 'Agree to Terms', order: 1 }),
        preferredDate: DateVariable({ question: 'Preferred Date', order: 2 }),
        scheduledDateTime: DateTimeVariable({ question: 'Scheduled Date/Time', order: 3 }),
        contactEmail: EmailVariable({ question: 'Contact Email', order: 4 }),
        notifyUsers: ListCollectorVariable({
            question: 'Notify Users',
            order: 5,
            listTable: 'sys_user',
            referenceQual: 'active=true',
        }),
        licenseKey: MaskedVariable({
            question: 'License Key',
            order: 6,
            useConfirmation: false,
            useEncryption: true,
        }),
        additionalNotes: MultiLineTextVariable({ question: 'Additional Notes', order: 7 }),
        assignedTo: ReferenceVariable({
            question: 'Assigned To',
            order: 8,
            referenceTable: 'sys_user',
            referenceQualCondition: 'active=true^EQ',
        }),
        taskState: SelectBoxVariable({
            question: 'Priority',
            order: 9,
            choiceTable: 'task',
            choiceField: 'state',
        }),
        softwareName: SingleLineTextVariable({ question: 'Software Name', order: 10 }),
        downloadUrl: UrlVariable({ question: 'Download URL', order: 11 }),
        isUrgent: YesNoVariable({ question: 'Is this urgent?', includeNone: true, order: 12 }),
    },
})
```

**Example — scripts and fulfillment:**

```ts
import {
  CatalogItemRecordProducer,
  SingleLineTextVariable,
  SelectBoxVariable,
  default_view
} from "@servicenow/sdk/core";

export const incidentProducer = CatalogItemRecordProducer({
  $id: Now.ID["incident_producer"],
  name: "Report Incident with Full Configuration",
  shortDescription: "Complete incident producer with variables and scripts",
  table: "incident",
  view: default_view,

  catalogs: [serviceCatalog],
  categories: [itServicesCategory],

  variables: {
    short_description: SingleLineTextVariable({
      question: "Brief Summary",
      mandatory: true,
      mapToField: true,
      field: "short_description",
      order: 100
    }),
    urgency: SelectBoxVariable({
      question: "Urgency",
      mandatory: true,
      mapToField: true,
      field: "urgency",
      choices: {
        "1": { label: "High", sequence: 1 },
        "2": { label: "Medium", sequence: 2 },
        "3": { label: "Low", sequence: 3 }
      },
      order: 200
    }),
    assignment_group: ReferenceVariable({
      question: "Assignment Group",
      mapToField: true,
      field: "assignment_group",
      referenceTable: "sys_user_group",
      order: 300
    })
  },

  script: Now.include("../../scripts/rp-pre-insert.js"),
  postInsertScript: Now.include("../../scripts/rp-post-insert.js"),

  redirectUrl: "generatedRecord",
  allowEdit: true,
  state: "published"
})
```

**Script file example** (`rp-pre-insert.js`):
```js
/**
 * This script is executed before the record is generated.
 * `current` is the GlideRecord produced by Record Producer.
 * Don't use `current.update()` or `current.insert()` as the record is generated by Record Producer.
 * Use `producer.var1` to access variables.
 */
if (!current.assignment_group.nil()) {
  var groupInfo = new GlideRecord('sys_user_group');
  groupInfo.get(current.assignment_group);
  current.description = "Assigned to: " + groupInfo.name;
}
```

---

## Key Guidelines & Best Practices

### Exports and References
- **Always export catalog constants** — `CatalogUiPolicy` and `CatalogClientScript` reference the parent item/set by constant
- **Share VariableSet** definitions across multiple items by exporting and importing them
- Use type-safe references: `variableSet.variables.fieldName` and `catalogItem.variables.fieldName` in conditions and actions

### Fulfillment & Flows
- **Prefer Fluent Flow constants** over raw `executionPlan` sys_ids. This keeps related code together and enables programmatic reference
- When `flow`, `workflow`, and `executionPlan` are all specified, the system uses `flow` in this order of precedence

### Record Producers
- Set `mapToField: true` + `field: 'fieldname'` on variables to automatically populate target table fields on submission
- Use `script` (pre-insert) for dynamic field assignment; use `postInsertScript` (post-insert) when you need to call `current.update()`
- Avoid `current.setValue('sys_class_name', ...)` in scripts as this triggers reparent flow and can cause data loss
- Avoid `current.setAbortAction()` and instead generate a separate record
- `view: default_view` requires: `import { default_view } from '@servicenow/sdk/core'`

### Catalog Client Scripts
- Script content is standard ServiceNow JavaScript (not TypeScript) — use `g_form` APIs as normal
- For `onChange` scripts, always include `if (isLoading) return;` guard to prevent recursion
- Avoid GlideAjax in `onSubmit` scripts due to asynchronous timing issues — use server-side business rules instead
- Use `Now.include('./script.js')` to reference external `.js` files for two-way sync

### Catalog UI Policies
- For simple show/hide, mandatory, read-only logic, use UI policies (simpler, no scripts needed)
- For complex validation, calculations, or async operations, use catalog client scripts instead
- Use `reverseIfFalse: true` (default) to reverse actions when condition evaluates to false
- The `actions` array is required and must include at least one action

### Variable Sets in Multi-Row Mode
- When `type: 'multiRow'`, use `setAttributes: 'max_rows=10'` to limit rows
- `AttachmentVariable`, `ContainerVariable`, `HtmlVariable`, and `CustomVariable` are **not supported** in multi-row sets
- Use `createRoles` to control who can add rows

### Access Control
- Use `roles`, `availableFor`, and `notAvailableFor` for visibility control
- `notAvailableFor` **overrides** `availableFor` — a user in both will be denied access
- For fine-grained access, use user criteria records and reference them via `availableFor`/`notAvailableFor`

### Performance & UX
- Set `onLoad: false` on UI policies if they should only trigger on variable change (not on page load)
- Use `displayTitle: true` on VariableSet to group related variables under collapsible sections
- Minimize the number of UI policies and scripts that run on page load — they can slow form rendering
- Use `appliesOnRequestedItems: true` and `appliesOnCatalogTasks: true` on client scripts to ensure they run through the full order lifecycle (order → fulfillment → completion)

---

## Decision Guide

Source: https://servicenow.github.io/sdk/guides/service-catalog-guide

### Catalog Item vs Record Producer

| Aspect | Catalog Item | Record Producer |
|--------|-------------|-----------------|
| Creates | REQ + RITM + Fulfillment Tasks | Record in target table (incident, change_request, etc.) |
| Fulfillment | Flow Designer / Workflow / Delivery Plan | Server-side scripts |
| Use when | Ordering goods/services with approvals | Creating task records directly |
| Examples | "Request Laptop", "Software License" | "Report Incident", "Submit HR Case" |

**Core Rule:** Ordering/requesting something → Catalog Item. Creating a task record → Record Producer.

### When to Use What

1. Ordering goods/services → **CatalogItem** with variables and Flow Designer
2. Creating task records → **CatalogItemRecordProducer** with field mapping
3. Reusable form fields → **VariableSet** (`singleRow` or `multiRow`)
4. Simple show/hide/mandatory logic → **CatalogUiPolicy**
5. Complex validation/calculations/async calls → **CatalogClientScript**
6. Grid/table data entry → Multi-Row Variable Set (MRVS)

### UI Policy vs Client Script

| Use Case | UI Policy | Client Script |
|----------|-----------|---------------|
| Show/hide variables | **Preferred** | Supported |
| Make variables mandatory | **Preferred** | Supported |
| Make variables read-only | **Preferred** | Supported |
| Set variable values | Supported | Supported |
| Complex validation | Limited | **Preferred** |
| Dynamic calculations | Limited | **Preferred** |
| API calls / async operations | Not supported | **Preferred** |
| Form submission control | Not supported | **Preferred** |

### Validation Scenarios

| Validation Type | Implementation | Script Type |
|-----------------|----------------|-------------|
| No past dates | Client Script | onChange |
| Date range (start < end) | Client Script | onChange |
| Min/max numeric values | Client Script | onChange |
| Text min/max length | Client Script | onSubmit |
| Format validation (regex) | Client Script | onChange or onSubmit |
| Required based on another field | UI Policy (preferred) or Client Script | onChange |
| Lookup / async validation | Client Script with GlideAjax | onChange |

---

## Things to Avoid

Source: https://servicenow.github.io/sdk/guides/service-catalog-guide

- Never use catalog items for creating task records directly — use Record Producers
- Never create record producers for `sc_request`, `sc_req_item`, `sc_task`
- Never call `current.update()` or `current.insert()` in pre-insert `script` — use `postInsertScript` instead
- Never call `current.setAbortAction()` in Record Producer scripts
- Never set `current.sys_class_name` in scripts (triggers reparent flow, can cause data loss)
- Never use GlideAjax in `onSubmit` scripts — async calls won't complete before submission
- Never manipulate the DOM directly — always use `g_form` API
- Never use the same variable name as a target table field name
- Never skip the `order` property on variables
- Never skip `catalogs` or `categories` assignment on catalog items
- Never hard-code sys_ids without documenting their source
- Variables without names cannot be accessed by client scripts
- Mandatory variables without values that should be hidden by UI policies will block hiding
- Multi-row variable sets do not support: `AttachmentVariable`, container variables, `HtmlVariable`, macro variables
- Container variables must be properly paired (`ContainerStartVariable` / `ContainerSplitVariable` / `ContainerEndVariable`)
- Multi-row variable sets will not display if added inside a container

---

## CatalogUiPolicy — Advanced Details

Source: https://servicenow.github.io/sdk/guides/service-catalog-variables-guide

### Condition Syntax Examples

```ts
// Simple equality
catalogCondition: `${catalogItem.variables.priority}=high^EQ`;

// Multiple conditions with AND
catalogCondition: `${catalogItem.variables.env}=prod^${catalogItem.variables.critical}=true^EQ`;

// Multiple conditions with OR
catalogCondition: `${catalogItem.variables.env}=prod^OR${catalogItem.variables.critical}=true^EQ`;

// Not empty check
catalogCondition: `${catalogItem.variables.reference}ISNOTEMPTY^EQ`;
```

### UI Policy Priority Rules

1. **Mandatory** has highest priority
2. If a variable is mandatory and has no value, `readOnly` / `hidden` actions **do not work** on it
3. If a variable set or container contains a mandatory variable without a value, the **entire set cannot be hidden**
4. The "Clear value" action does not work on variable sets and containers

### Variable Type Limitations (UI Policy Actions)

| Action Type | Not Applicable To |
|-------------|-------------------|
| Mandatory | Fraction, ContainerSplitVariable, ContainerEndVariable, UI Macro, LabelVariable, UIPageVariable |
| Read-only | Fraction, ContainerSplitVariable, ContainerEndVariable, UI Macro, LabelVariable, UIPageVariable |
| Visibility | Fraction, ContainerSplitVariable, ContainerEndVariable |

### Policy with Client Scripts

When `runScripts: true`, provide `executeIfTrue` / `executeIfFalse` via `Now.include(...)`. These scripts run **client-side in the browser** where TypeScript modules are not available. Scripts must be wrapped in `function onCondition() {}`.

```ts
CatalogUiPolicy({
  $id: Now.ID["vm_prod_controls_policy"],
  shortDescription: "VM: Prod/BizCritical Controls",
  catalogItem: cloudVmRequest,
  catalogCondition: `${cloudVmRequest.variables.environment}=prod^OR${cloudVmRequest.variables.business_critical}=true^EQ`,
  active: true,
  onLoad: true,
  reverseIfFalse: true,
  runScripts: true,
  runScriptsInUiType: "all",
  actions: [
    {
      variableName: cloudVmRequest.variables.backup_required,
      value: "true",
      valueAction: "setValue",
      readOnly: true,
      order: 100
    },
    {
      variableName: cloudVmRequest.variables.cost_center,
      mandatory: true,
      order: 200
    }
  ],
  executeIfTrue: Now.include("../../scripts/vm-production-controls.js"),
  executeIfFalse: Now.include("../../scripts/vm-development-controls.js")
});
```

```js
// vm-production-controls.js
function onCondition() {
  var PROD_REGIONS = [
    ["AP-South-1", "AP-South-1 (Mumbai)"],
    ["EU-West-1", "EU-West-1 (Ireland)"]
  ];
  g_form.clearOptions("region");
  PROD_REGIONS.forEach(function (pair) {
    g_form.addOption("region", pair[0], pair[1]);
  });
  g_form.showFieldMsg(
    "environment",
    "Production VMs enforce backup and require cost center.",
    "info"
  );
}
```

### Policy Scoped to a Variable Set

```ts
export const internationalShippingPolicy = CatalogUiPolicy({
  $id: Now.ID["international_shipping_policy"],
  shortDescription: "Show customs fields for international shipping",
  variableSet: shippingVariableSet,
  appliesTo: "set",
  catalogCondition: `${shippingVariableSet.variables.shipping_country}!=US^EQ`,
  appliesOnCatalogItemView: true,
  appliesOnRequestedItems: true,
  actions: [
    {
      variableName: shippingVariableSet.variables.customs_declaration,
      visible: true,
      mandatory: true,
      variableMessage: "Required for international shipping",
      variableMessageType: "warning"
    }
  ]
});
```

---

## CatalogClientScript — Advanced Details

Source: https://servicenow.github.io/sdk/guides/service-catalog-variables-guide

### Catalog Client Script vs Standard Client Script

| Aspect | Catalog Client Script | Standard Client Script |
|--------|-----------------------|------------------------|
| Scope | Catalog item or variable set | Table (e.g., Incident) |
| onChange target | Links to a **variable** | Links to a **field** |
| Context | Catalog ordering, RITM, Catalog Task forms | Table forms |
| Variable access | Direct by variable name | Use `variables.variable_name` prefix |
| Applies to | `item` or `set` | Specific table |

### Scripts on Variable Sets

Scope scripts to a variable set using `variableSet` and `appliesTo: 'set'` so they apply to **all** catalog items using that set. Always use `hasField()` checks since the variable may not exist on every item that includes the set.

When multiple variable sets are attached to a catalog item, scripts execute in the order the variable sets are listed on the item. If both a variable set script and an item-level script target the same variable, the item-level script runs last and takes precedence.

### g_form API Reference

| Method | Description |
|--------|-------------|
| `getValue(fieldName)` | Get variable value |
| `setValue(fieldName, value)` | Set variable value |
| `setDisplay(fieldName, display)` | Show/hide variable |
| `setMandatory(fieldName, mandatory)` | Set mandatory state |
| `setReadOnly(fieldName, readOnly)` | Set read-only state |
| `clearValue(fieldName)` | Clear variable value |
| `hasField(fieldName)` | Check if field exists on the current form |
| `showFieldMsg(fieldName, message, type, scrollForm)` | Show inline field message |
| `hideFieldMsg(fieldName, clearAll)` | Hide field message |
| `addErrorMessage(message)` | Add banner error message |
| `clearMessages()` | Clear all banner messages |
| `clearOptions(fieldName)` | Clear all select options |
| `addOption(fieldName, value, label)` | Add a select option |
| `getReference(fieldName, callback)` | Get referenced record (legacy — prefer GlideAjax for complex lookups) |

### GlideAjax Method Comparison

| Method | Execution | Use When | Avoid When |
|--------|-----------|----------|------------|
| `getXMLAnswer()` | **Async** | Simple lookups, returning a single value/string | You need the full XML response object |
| `getXML()` | **Async** | Need full XML response, complex response parsing | Simple value returns (use `getXMLAnswer`) |
| `getXMLWait()` | **Sync** | Almost never — legacy/global scope only | Scoped apps, any production code |

### GlideAjax Parameter Rules

- All custom parameters **must** start with `sysparm_`
- The **first** `addParam` call must always be `sysparm_name` with the method name

```js
var ga = new GlideAjax("MyScriptInclude");
ga.addParam("sysparm_name", "methodName");    // REQUIRED: always first
ga.addParam("sysparm_user_id", userSysId);    // Custom param: must start with sysparm_
ga.getXMLAnswer(function(response) { ... });
```

### Script Include Patterns for GlideAjax

Script includes used by GlideAjax must be **Client callable = true** and extend `global.AbstractAjaxProcessor`. Retrieve parameters with `this.getParameter('sysparm_param_name')`.

**Security note:** Client callable Script Includes run in the logged-in user's session context. ACLs still apply to GlideRecord queries. Always validate parameters from `this.getParameter()`. Never trust client-side input.

**Single method:**
```js
var AssetLookupUtil = Class.create();
AssetLookupUtil.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getWarrantyStatus: function() {
    var assetTag = this.getParameter("sysparm_asset_tag");
    var gr = new GlideRecord("alm_asset");
    gr.addQuery("asset_tag", assetTag);
    gr.setLimit(1);
    gr.query();
    if (gr.next()) {
      return JSON.stringify({ status: gr.getValue("warranty_expiration") });
    }
    return JSON.stringify({ status: null });
  },
  type: "AssetLookupUtil"
});
```

**Multi-method pattern:**
```js
var CatalogUtils = Class.create();
CatalogUtils.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getItemPrice: function() {
    var itemId = this.getParameter("sysparm_item_id");
    var gr = new GlideRecord("sc_cat_item");
    if (gr.get(itemId)) { return gr.getValue("price"); }
    return "0";
  },
  getManagerName: function() {
    var userId = this.getParameter("sysparm_user_id");
    var gr = new GlideRecord("sys_user");
    if (gr.get(userId)) {
      return JSON.stringify({
        manager_sys_id: gr.getValue("manager"),
        manager_name: gr.getDisplayValue("manager"),
        department: gr.getDisplayValue("department")
      });
    }
    return JSON.stringify({ error: "User not found" });
  },
  type: "CatalogUtils"
});
```

**Input validation pattern:**
```js
getUserInfo: function() {
  var userId = this.getParameter("sysparm_user_id");
  // Validate: check it looks like a sys_id
  if (!userId || userId.length !== 32) {
    return JSON.stringify({ error: "Invalid user ID" });
  }
  var gr = new GlideRecord("sys_user");
  if (gr.get(userId)) {
    return JSON.stringify({ name: gr.getDisplayValue("name") });
  }
  return JSON.stringify({ error: "User not found" });
}
```

### onChange — Dynamic Options via GlideAjax

```js
// Client script (onChange on 'department' variable)
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;
  g_form.clearOptions("category");
  g_form.addOption("category", "", "-- Select --");
  if (!newValue) return;
  var ga = new GlideAjax("CatalogOptionLoader");
  ga.addParam("sysparm_name", "getCategoriesByDept");
  ga.addParam("sysparm_department", newValue);
  ga.getXMLAnswer(function(answer) {
    if (!answer) return;
    var categories = JSON.parse(answer);
    categories.forEach(function(cat) {
      g_form.addOption("category", cat.value, cat.label);
    });
  });
}
```

### onSubmit — Validation with Field Message

```js
function onSubmit() {
  var justification = (g_form.getValue("justification") || "").trim();
  if (justification.length < 20) {
    g_form.showFieldMsg("justification", "Please provide at least 20 characters.", "error", true);
    g_form.addErrorMessage("Justification is too short.");
    return false;
  }
  return true;
}
```

### Client Script Scoped to Variable Set

```ts
import { requesterInfoSet } from "./variable-sets/requester-info-set.now";

CatalogClientScript({
  $id: Now.ID["department_change_script"],
  name: "Department Change - Clear Manager",
  type: "onChange",
  variableSet: requesterInfoSet,
  appliesTo: "set",
  variableName: requesterInfoSet.variables.department,
  script: Now.include("../../client/department-change.js"),
  active: true,
  uiType: "all"
});
```

```js
// department-change.js
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading) return;
  // Use hasField() because this set may be attached to items that don't have manager
  if (!g_form.hasField("manager")) return;
  g_form.clearValue("manager");
  if (!newValue) return;
  g_form.showFieldMsg("manager", "Please select a manager from the new department", "info", false);
}
```