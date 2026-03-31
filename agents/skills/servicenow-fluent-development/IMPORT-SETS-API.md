# Import Sets API

The Import Sets API defines transform maps (`sys_transform_map`) that specify how to transform and map data from import set staging tables to target tables using the ServiceNow Fluent SDK.

Every import operation to a production table requires at least one transform map associated with an import set. The transform map specifies the data relationships between the import set and the target table.

**Import from** `@servicenow/sdk/core`:

```ts
import { Table, Record, ImportSet } from '@servicenow/sdk/core'
```

---

## Core Concepts

### Required Setup Order

To create an import set in ServiceNow Fluent code, you must define the required metadata in the following order:

1. **Staging Table** (`sys_db_object`) — Must extend the Import Set Row (`sys_import_set_row`) table and define all columns that receive imported data
2. **Data Source** (`sys_data_source`) — Defines the connection to external systems (files, databases, APIs) and how to load data into import staging tables
3. **Transform Map** (`sys_import_set_map`) — Defines how to transform data from staging to target table

### Key Restrictions

- **NULL is a reserved word** (all capitals) and should NOT be used as a field value in import set transform maps or in First name/Last name fields
  - Valid alternatives: `Null`, `null` (other cases are acceptable)
  - Use `NULL` only to clear out a particular field
- Staging table name must match `import_set_table_name` in the data source and `sourceTable` in the transform map
- Target table must be within the application scope, global scope, or grant write access to the application

---

## Staging Table Definition

The staging table extends `sys_import_set_row` and holds the raw imported data before transformation.

**Example:**

```ts
export const userStagingTable = Table({
    $id: Now.ID['user-staging-table'],
    name: 'u_user_import_staging',
    label: 'User Import Staging',
    extends: 'sys_import_set_row',
    columns: [
        {
            name: 'u_email_address',
            type: 'email',
            max_length: 100,
            label: 'Email Address'
        },
        {
            name: 'u_full_name',
            type: 'string',
            max_length: 100,
            label: 'Full Name'
        },
        {
            name: 'u_username',
            type: 'string',
            max_length: 40,
            label: 'Username'
        },
    ]
})
```

---

## Data Source Definition

The data source defines how to connect to and load data from external systems into the staging table.

**Example:**

```ts
export const userDataSource = Record({
    $id: Now.ID['user-csv-datasource'],
    table: 'sys_data_source',
    data: {
        name: 'User CSV Data Source',
        type: 'File',
        format: 'CSV',
        file_retrieval_method: 'Attachment',
        csv_delimiter: ',',
        header_row: 1,
        import_set_table_name: 'u_user_import_staging',
        import_set_table_label: 'User Import Staging',
        batch_size: 500,
        active: true,
    },
})
```

---

## Transform Map (ImportSet) Properties

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `$id` | String or Number | Unique ID for the metadata object (e.g., `Now.ID['user-import-transform']`). Hashed into a unique sys_id at build time. |
| `name` | String | An internal name for the transform map. |
| `targetTable` | String | The name of the table in which you want the transformed data to be inserted. Must be within application/global scope or grant write access. |
| `sourceTable` | String | The name of the staging table containing raw import set data. Must extend `sys_import_set_row`. Must match `import_set_table_name` in the data source. |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `order` | Number | `100` | Execution order if more than one map fits the conditions. |
| `active` | Boolean | `false` | Flag indicating whether the transform map is active. |
| `runBusinessRules` | Boolean | `true` | Whether to run business rules, workflows, approval engines, auditing, and field normalization during transformation. If false, `GlideRecord.setWorkflow()` runs with false. |
| `enforceMandatoryFields` | String | `no` | Enforce mandatory fields on target table: `'no'`, `'onlyMappedFields'`, or `'allFields'`. |
| `copyEmptyFields` | Boolean | `false` | Whether to copy empty fields from source and override existing target field values. |
| `createOnEmptyCoalesce` | Boolean | `false` | Whether to create a record when coalesce fields are empty, instead of ignoring the record or overwriting an existing record. |
| `runScript` | Boolean | `false` | Whether to execute the transform map script in addition to field maps. |
| `script` | Script | — | Custom JavaScript function for transforming field values. Expects `(source, target, map, log, isUpdate) => void`. Supports imported functions, `Now.include()`, or inline code. |
| `fields` | Object | — | Key-value pairs of field mappings (target field name → source field name or field object). Each target field name must be unique. |
| `scripts` | Array | — | List of transform scripts that run at different stages of the import process. |

### Transform Map Example

```ts
export const userImportSet = ImportSet({
    $id: Now.ID['user-import-transform'],
    name: 'User Import Transform',
    targetTable: 'sys_user',
    sourceTable: 'u_user_import_staging',
    active: true,
    runBusinessRules: true,
    enforceMandatoryFields: 'onlyMappedFields',
    fields: {
        email: {
            sourceField: 'u_email_address',
            coalesce: true,
        },
        name: 'u_full_name',
        user_name: 'u_username',
    }
})
```

---

## Field Mapping (fields Object)

Define field mappings from source fields to target table fields. Each target field name must be unique within the `fields` object.

### Field Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sourceField` | String | — | The name of the source field from the import table. Required unless using `sourceScript` or coalesce-only configuration. |
| `choiceAction` | String | — | Action if import contains unknown choice/reference values: `'create'` (create choice), `'ignore'` (skip value), `'reject'` (skip entire row). |
| `sourceScript` | Script | — | Custom JavaScript to transform field values. Expects `(source) => any`. Supports imported functions, `Now.include()`, or inline code. |
| `useSourceScript` | Boolean | `false` | Whether to use `sourceScript` instead of `sourceField`. |
| `dateFormat` | String | — | Date format for Date/DateTime fields. Valid: `'dd-MM-yyyy'`, `'yyyy-MM-dd'`, `'yyyy-dd-MM'`, `'MM-dd-yyyy HH:mm:ss z'`, `'yyyy-MM-dd HH:mm:ss'`, `'HH:mm:ss'`, `'MM-dd-yyyy HH:mm:ss'`, `'dd-MM-yyyy HH:mm:ss z'`, `'MM-dd-yyyy'`, `'dd-MM-yyyy HH:mm:ss'`. |
| `referenceValueField` | String | — | Reference field column for matching incoming values to existing records in the reference table. Used when target field is a reference field. |
| `coalesce` | Boolean | `false` | Whether the field is used for record matching (treated as a unique key). |
| `coalesceCaseSensitive` | Boolean | `false` | Whether coalesce values are case-sensitive. Case-insensitive (default) only updates records without creating new ones. |
| `coalesceEmptyFields` | Boolean | `false` | Whether to match an empty source field value to an empty target field value. Requires `coalesce: true`. |

### Field Mapping Examples

**Simple field mapping:**
```ts
fields: {
    email: 'u_email_address',
    name: 'u_full_name',
}
```

**Field with coalesce (record matching):**
```ts
fields: {
    email: {
        sourceField: 'u_email_address',
        coalesce: true,
    },
}
```

**Field with source script transformation:**
```ts
fields: {
    email: {
        sourceField: 'u_email_address',
        coalesce: true,
        useSourceScript: true,
        sourceScript: `(function transformEntry(source) {
            return source.u_email_address.toLowerCase().trim();
        })(source);`
    },
    department: {
        sourceField: 'u_dept_code',
        choiceAction: 'create'
    }
}
```

**Field with date format:**
```ts
fields: {
    start_date: {
        sourceField: 'u_start_date',
        dateFormat: 'dd-MM-yyyy'
    }
}
```

---

## Transform Scripts (scripts Array)

Transform scripts run at different stages of the import process for advanced processing and validation.

### Script Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `$id` | String or Number | — | Unique ID for the script (e.g., `Now.ID['validate-email']`). |
| `active` | Boolean | `true` | Whether the script is active and executes. |
| `order` | Number | `100` | Execution order if more than one script fits the conditions. |
| `when` | String | `onAfter` | Stage of import process: `'onBefore'`, `'onAfter'`, `'onReject'`, `'onStart'`, `'onForeignInsert'`, `'onComplete'`, `'onChoiceCreate'`. |
| `script` | Script | — | Custom JavaScript function. Expects `(source, map, log, target) => void`. Supports imported functions, `Now.include()`, or inline code. |

### Transform Script Stages

| Stage | When | Purpose |
|-------|------|---------|
| `onStart` | Before any row processing | Initialize data, set up counters, etc. |
| `onBefore` | Before field transformation | Validate source data, pre-process values |
| `onAfter` | After field transformation | Post-process transformed data, validate target values |
| `onForeignInsert` | When inserting a new reference record | Customize reference record creation |
| `onChoiceCreate` | When creating a new choice value | Customize choice creation |
| `onReject` | When a row is rejected | Log rejection reasons, cleanup |
| `onComplete` | After all rows processed | Generate reports, cleanup, final validation |

### Script Value Forms

The `script` property on both `ImportSet` (top-level) and entries in `scripts` accepts three forms:

| Form | When to use |
|------|-------------|
| Plain string | Inline scripts without IDE type support |
| `script` tagged template | Inline scripts with IDE syntax highlighting |
| Imported function | Shared logic defined in a separate module |

**Plain string:**
```ts
script: `(function runTransformScript(source, map, log, target) {
    // ...
})(source, map, log, target);`
```

**`script` tagged template (preferred for inline):**
```ts
import { script } from '@servicenow/sdk/core'

script: script`(function runTransformScript(source, map, log, target) {
    // ...
})(source, map, log, target);`
```

**Imported function:**
```ts
import { validateUserData } from './user-validation'

script: validateUserData
```

### Transform Script Examples

**Validation script with row skipping:**

Use `ignore = true` inside an `onBefore` script to discard a row without rejecting it. Note that `target` is `undefined` in `onBefore` — it is only available from `onAfter` onwards:

```ts
import { script } from '@servicenow/sdk/core'

scripts: [
    {
        $id: Now.ID['validate-required-fields'],
        when: 'onBefore',
        script: script`(function runTransformScript(source, map, log, target /*undefined until onAfter*/) {
            if (!source.first_name || !source.last_name) {
                ignore = true;
                log.error('Missing required name fields');
            }
        })(source, map, log, target);`,
    }
]
```

**Post-processing in onAfter:**
```ts
scripts: [
    {
        $id: Now.ID['post-process-user'],
        when: 'onAfter',
        script: `(function runTransformScript(source, map, log, target) {
            // target is available here
            target.setValue('vip', source.employee_level === 'EXEC');
        })(source, map, log, target);`
    }
]
```

**Script with imported function:**
```ts
import { validateUserData } from './user-validation'

scripts: [
    {
        $id: Now.ID['validate-user-script'],
        active: true,
        order: 100,
        when: 'onBefore',
        script: validateUserData
    }
]
```

---

## Complete Example

```ts
import '@servicenow/sdk/global'
import { Table, Record, ImportSet } from '@servicenow/sdk/core'

// STEP 1: Create Staging Table Definition (REQUIRED - MUST BE FIRST)
export const userStagingTable = Table({
    $id: Now.ID['user-staging-table'],
    name: 'u_user_import_staging',
    label: 'User Import Staging',
    extends: 'sys_import_set_row',
    columns: [
        {
            name: 'u_email_address',
            type: 'email',
            max_length: 100,
            label: 'Email Address'
        },
        {
            name: 'u_full_name',
            type: 'string',
            max_length: 100,
            label: 'Full Name'
        },
        {
            name: 'u_username',
            type: 'string',
            max_length: 40,
            label: 'Username'
        },
    ]
})

// STEP 2: Create Data Source (REQUIRED - MUST BE SECOND)
export const userDataSource = Record({
    $id: Now.ID['user-csv-datasource'],
    table: 'sys_data_source',
    data: {
        name: 'User CSV Data Source',
        type: 'File',
        format: 'CSV',
        file_retrieval_method: 'Attachment',
        csv_delimiter: ',',
        header_row: 1,
        import_set_table_name: 'u_user_import_staging',
        import_set_table_label: 'User Import Staging',
        batch_size: 500,
        active: true,
    },
})

// STEP 3: Create Import Set (Transform Map) (REQUIRED - MUST BE THIRD)
export const userImportSet = ImportSet({
    $id: Now.ID['user-import-transform'],
    name: 'User Import Transform',
    targetTable: 'sys_user',
    sourceTable: 'u_user_import_staging',
    active: true,
    runBusinessRules: true,
    enforceMandatoryFields: 'onlyMappedFields',
    fields: {
        email: {
            sourceField: 'u_email_address',
            coalesce: true,
        },
        name: 'u_full_name',
        user_name: 'u_username',
    },
    scripts: [
        {
            $id: Now.ID['validate-email'],
            active: true,
            order: 100,
            when: 'onBefore',
            script: `(function runTransformScript(source, map, log, target) {
                if (!source.u_email_address || source.u_email_address.indexOf('@') === -1) {
                    log.error('Invalid email: ' + source.u_email_address);
                    return;
                }
            })(source, map, log, target);`
        }
    ]
})
```

---

## Related Concepts

- **Fluent Language Constructs**: `Now.ID`, `Now.ref`, `Now.include()` — See [API-REFERENCE.md](./API-REFERENCE.md)
- **Table API**: Define staging tables that extend `sys_import_set_row` — See [API-REFERENCE.md](./API-REFERENCE.md)
- **Record API**: Define data sources — See [API-REFERENCE.md](./API-REFERENCE.md)
- **Import Sets Documentation**: General import set concepts and UI operations
