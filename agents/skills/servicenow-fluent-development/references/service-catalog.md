# Service Catalog APIs

Fluent provides first-class support for Service Catalog artifacts. All catalog APIs are imported from `@servicenow/sdk/core`.

```ts
import {
  CatalogItem, CatalogClientScript, CatalogUIPolicy,
  VariableSet, CatalogItemRecordProducer
} from '@servicenow/sdk/core'
```

---

## CatalogItem

Creates a `sc_cat_item` record. References `ApplicationCategory` (for `catalogs`) and `sc_category` (for `categories`).

Key properties:
- `name`, `shortDescription`, `description` — display text
- `catalogs` — array of catalog references (e.g., the Service Catalog)
- `categories` — array of category references
- `variableSets` — ordered list of `{ variableSet: ref, order: number }` pairs
- `executionPlan` — sys_id of the workflow or flow that fulfils the request
- `availableFor` — array of user criteria references controlling visibility
- `hideSaveAsDraft`, `mandatoryAttachment`, `hideAttachment` — submission controls

---

## VariableSet

Creates a `item_option_new_set` record grouping related catalog variables together.

Key properties:
- `title`, `internalName`, `description`
- `type` — `'singleRow'` (one set per request) or `'multiRow'` (repeating)
- `order`

Variables are defined separately and associated with the set. A variable set can be shared across multiple catalog items.

---

## Catalog Variables (31 types)

Variables are defined using type-specific functions and attached to a `VariableSet`.
Common variable types include:

| Category | Types |
|----------|-------|
| **Text** | `TextField`, `MultiLineTextField`, `Label`, `Macro`, `MacroWithLabel` |
| **Selection** | `SelectBox`, `CheckBox`, `RadioButton`, `YesNoField`, `MultipleChoiceField` |
| **Date/Time** | `DateField`, `DateTimeField` |
| **Reference** | `ReferenceField`, `LookupSelectBox`, `LookupMultipleChoice` |
| **Data** | `NumberField`, `IPAddressField`, `URLField`, `EmailField` |
| **File** | `AttachmentField` |
| **Layout** | `ContainerStart`, `ContainerEnd`, `SplitField`, `BreakField` |
| **Custom** | `CustomFieldType` |

Each variable function accepts at minimum a `name`, `questionText`, and `order`. Additional type-specific options apply (e.g., `referenceTable` for `ReferenceField`, `choices` for `SelectBox`).

To reference a variable in a `CatalogUIPolicy` condition or action, use the `variables` property on the `VariableSet` constant:

```ts
// Access the variable name reference via the set constant
variableSet.variables.myVariableName
```

---

## CatalogUIPolicy

Creates a `catalog_ui_policy` record. Controls variable visibility, mandatory state, and read-only state based on conditions.

Key properties:
- `shortDescription`, `catalogCondition` — human label and encoded condition string
- `variableSet` — the variable set this policy applies to
- `appliesTo` — `'set'` (the whole set) or `'item'` (a specific catalog item)
- `actions` — array of `{ variableName, mandatory?, visible?, readOnly?, order }` objects

Use `variableSet.variables.fieldName` to reference variable names safely.

---

## CatalogClientScript

Creates a `catalog_script_client` record. Mirrors the standard `ClientScript` API but targets catalog forms.

Key properties:
- `name`, `script`, `type` — same as `ClientScript` (`'onLoad'`, `'onChange'`, `'onSubmit'`)
- `catalogItem` — reference to the `CatalogItem` constant
- `appliesOnRequestedItems` — apply on Request Items (`sc_req_item`)
- `appliesOnCatalogTasks` — apply on Catalog Tasks (`sc_task`)
- `appliesOnTargetRecord` — apply on the target record (for record producers)
- `vaSupported` — whether the script runs in the Virtual Agent portal

The `script` property contains standard ServiceNow JavaScript (not TypeScript). Use `g_form` APIs as normal.

---

## CatalogItemRecordProducer

Creates a `sc_cat_item_producer` record. A record producer looks like a catalog item but creates a record in a target table instead of a request.

Key properties:
- Same top-level fields as `CatalogItem` (`name`, `shortDescription`, `description`, `catalogs`, `categories`, `variableSets`, `availableFor`)
- `table` — the target table that will be populated (e.g., `'incident'`)
- `hideSaveAsDraft`, `mandatoryAttachment`, `hideAttachment` — submission controls

---

## Key Guidelines

- Always export catalog constants so they can be referenced by `CatalogUIPolicy`, `CatalogClientScript`, and `CatalogItemRecordProducer`
- Share `VariableSet` definitions across multiple items by exporting and re-importing them
- Use `variableSet.variables.fieldName` for type-safe variable references in conditions and actions
- `CatalogClientScript.script` is standard ServiceNow JavaScript — use `g_form` and catalog APIs as usual
- Set `appliesOnRequestedItems: true` and `appliesOnCatalogTasks: true` on catalog client scripts to ensure they run in the full order lifecycle
- For the `executionPlan` on a `CatalogItem`, provide the sys_id of the flow or workflow; consider creating the flow in Fluent so it can be referenced programmatically
