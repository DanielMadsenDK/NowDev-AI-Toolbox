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
| `variables` | Object | **Required.** Object of named variable definitions using type-specific functions |
| `name` | String | Optional name for additional identification |
| `version` | Number | Variable set version (default: `0`) |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Key constraints:**
- Variable sets within a catalog item can't have the same internal name
- Within a catalog item, variable names can't duplicate variable set titles or internal names
- Catalog client scripts and UI policy scripts must refer to the internal name of a variable set, not the title

**Example:**

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

Creates a `catalog_ui_policy` record that controls variable behavior on catalog item forms based on conditions. Catalog UI policies can make variables mandatory, read-only, visible, or hidden. For validation, calculations, or asynchronous calls, use catalog client scripts instead.

**Required properties:** `$id`, `shortDescription`, and either `catalogItem` or `variableSet`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['policy_id']` |
| `shortDescription` | String | **Required.** Short description of what the policy does |
| `catalogItem` | Reference or String | **Required if variableSet not used.** Reference to `CatalogItem` or `CatalogItemRecordProducer` constant, or sys_id of catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]` |
| `variableSet` | Reference or String | **Required if catalogItem not used.** Reference to `VariableSet` constant, or sys_id of variable set `[item_option_new_set]` |
| `appliesTo` | String | Scope: `'item'` (specific catalog item) or `'set'` (whole variable set). Default: `'item'` |
| `catalogCondition` | String | Encoded query conditions based on variable values. Example: ``${item.variables.priority}=high^EQ`` |
| `active` | Boolean | Whether the policy is active (default: `true`) |
| `global` | Boolean | Whether the policy runs on all views of the table (default: `true`) |
| `onLoad` | Boolean | Whether the policy runs when the form loads. If `false`, applies only on variable changes (default: `true`) |
| `reverseIfFalse` | Boolean | Reverse UI actions when condition evaluates to false (default: `true`) |
| `inherit` | Boolean | Whether the policy is inherited (default: `false`) |
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
| `actions` | Array | **Required.** List of variable actions to perform when condition is met. See actions array section |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Example:**

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
| `disabled` | Boolean | Disable the variable (default: `false`) |
| `mandatory` | Boolean | Make the variable required (default: `false`) |
| `readOnly` | Boolean | Make the variable read-only (default: `false`) |
| `cleared` | Boolean | Clear the variable value when condition is met (default: `false`) |
| `variableMessage` | String | Message to display on the variable (requires `variableMessageType` to have a value) |
| `variableMessageType` | String | Message type: `'info'` \| `'warning'` \| `'error'` |
| `value` | String | Value to set on the variable (requires `valueAction: 'setValue'`) |
| `valueAction` | String | Action: `'setValue'` (sets variable to `value` property) \| `'clearValue'` (clears variable) |
| `order` | Number | Evaluation order relative to other actions (default: `100`) |

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

**Required properties:** `$id`, `name`, `script`, `type`, and either `catalogItem` or `variableSet`

**All properties:**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['script_id']` |
| `name` | String | **Required.** Unique name for the catalog client script |
| `script` | Script | **Required.** Client-side script code. Standard ServiceNow JavaScript (not TypeScript). Use `g_form` APIs. Use `Now.include('./file.js')` to reference external file |
| `type` | String | **Required.** Event type: `'onLoad'` (runs when form loads, setup/defaults) \| `'onChange'` (runs on variable change, include `if (isLoading) return;` guard) \| `'onSubmit'` (runs on submission, return `false` to block) |
| `catalogItem` | Reference or String | **Required if variableSet not used.** Reference to `CatalogItem` or `CatalogItemRecordProducer` constant, or sys_id of catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]` |
| `variableSet` | Reference or String | **Required if catalogItem not used.** Reference to `VariableSet` constant, or sys_id of variable set `[item_option_new_set]` |
| `variableName` | String | **Required if type is 'onChange'.** Variable that triggers script. Use `catalogItem.variables.fieldName` |
| `appliesTo` | String | Scope: `'item'` (specific catalog item) or `'set'` (whole variable set). Default: `'item'` |
| `uiType` | String | UI interface: `'desktop'` (desktop interface) \| `'mobileOrServicePortal'` (mobile/Service Portal) \| `'all'` (all interfaces). Default: `'desktop'` |
| `active` | Boolean | Whether the client script is enabled (default: `true`) |
| `global` | Boolean | Whether script runs in global scope (default: `true`) |
| `appliesOnCatalogItemView` | Boolean | Apply to catalog items displayed in order screen (requester view). Default: `true` |
| `appliesOnRequestedItems` | Boolean | Apply to requested item forms after item is requested (fulfiller view). Default: `false` |
| `appliesOnCatalogTasks` | Boolean | Apply to catalog task forms for the item (fulfiller view). Default: `false` |
| `appliesOnTargetRecord` | Boolean | Apply to records created for task-extended tables via record producers. Default: `false` |
| `vaSupported` | Boolean | Whether script is supported in Virtual Agent conversations (default: `false`) |
| `publishedRef` | String | sys_id of published catalog item `[sc_cat_item]` or record producer `[sc_cat_item_producer]` this script references |
| `$meta` | Object | Installation metadata. `{ installMethod: 'demo' \| 'first install' }` |

**Script type guidelines:**
- **onLoad:** Set initial field states, default values, visibility. No guard needed
- **onChange:** Include `if (isLoading) return;` guard. Avoid long operations
- **onSubmit:** Return `false` to block submission. Avoid GlideAjax due to async issues — use server-side business rules instead

**Example:**

```ts
import { CatalogClientScript } from "@servicenow/sdk/core";

export const laptopOnLoadScript = CatalogClientScript({
  $id: Now.ID["laptop_onload"],
  name: "Laptop Request - OnLoad",
  script: Now.include("../../client/laptop-onload.js"),
  type: "onLoad",
  catalogItem: laptopRequest,
  active: true,
  uiType: 'all',
  appliesOnCatalogItemView: true
});

export const categoryChangeScript = CatalogClientScript({
  $id: Now.ID["category_change"],
  name: "Clear dependent field when category changes",
  catalogItem: myItem,
  type: "onChange",
  variableName: myItem.variables.category,
  script: `
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading || newValue === oldValue) return;
  g_form.setValue('subcategory', '');
  g_form.clearMessages();
}`,
  active: true,
  uiType: 'all',
  appliesOnCatalogItemView: true
});
```

**Referenced file example** (`laptop-onload.js`):
```js
function onLoad() {
  // Set initial field states
  g_form.setReadOnly("estimated_cost", true);
  g_form.setValue("estimated_cost", "$0");
  g_form.setMandatory("justification", true);
}
```

---

## CatalogItemRecordProducer

Creates a `sc_cat_item_producer` record that looks like a catalog item but writes to a target table instead of creating a request. Record producers are typically used for creating incident, change request, or other task records directly from the service catalog.

You can create record producers for tables and database views in the same scope, or for tables that allow create access from applications in other scopes.

**Required properties:** `$id`, `name`, `table`, `view`

**All properties (in addition to CatalogItem properties):**

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | **Required.** Unique ID. Format: `Now.ID['producer_id']` |
| `name` | String | **Required.** Display name in the catalog |
| `table` | Reference or String | **Required.** Target table where records are created. Can be Fluent `Table` constant's `.name` or table name string (e.g., `'incident'`) |
| `view` | Reference or String | **Required.** UI view `[sys_ui_view]` to apply. Must import `default_view` from `'@servicenow/sdk/core'` for default view |
| `shortDescription` | String | Short description displayed in catalog search and title bar |
| `description` | String | Detailed description shown when user selects item. Can embed videos, images, KB links, and documentation |
| `state` | String | Publication state: `'draft'` or `'published'` |
| `variables` | Object | Inline variable definitions. Support `mapToField: true` + `field: 'fieldname'` to auto-populate target table fields |
| `variableSets` | Array | Ordered list of `{ variableSet: ref, order: number }` pairs |
| `availability` | String | Device display: `'desktopOnly'` \| `'mobileOnly'` \| `'both'`. Default: `'desktopOnly'` |
| `active` | Boolean | Whether active and available to order (default: `true`) |
| `order` | Number | Display order within category (default: `0`) |
| `version` | Number | Item version (default: `1`) |
| `script` | Script | Server-side script that runs **before** the record is created. Assign field values dynamically. **Don't call `current.update()` or `current.insert()`** as the record is generated by the record producer. Use `Now.include('./script.js')` for external files |
| `postInsertScript` | Script | Server-side script that runs **after** the record is inserted. Can call `current.update()` to modify inserted record. Overrides target record values and template values. Use `Now.include('./script.js')` for external files |
| `saveScript` | Script | Script that runs at every step save in Catalog Builder. Executed before main `script`. Use `Now.include('./script.js')` for external files |
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

**Script context:** Both `script` and `postInsertScript` have access to:
- `current` — GlideRecord of the created record
- `producer.var1` — Access variables (replace `var1` with variable name)
- `cat_item` — Reference to the Record Producer itself

**Example:**

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