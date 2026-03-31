# Table API Reference

The Table API defines tables [sys_db_object] to store data in an application.

Create a table using the Table object. From the schema property, add Column objects, such as StringColumn or IntegerColumn, to define the columns.

For general information about tables, see Table administration.

## Table Object

Create a table [sys_db_object] in an application.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `name` | String | **Required.** A name for the table beginning with the application scope and in all lowercase letters in the following format: `<scope>_<name>`. The name should match the variable identifier of the Table object. Maximum length: 80. |
| `schema` | Array | **Required.** A list of Column objects. For more information, see Column object. |
| `extends` | String | The name of any other table on which the table is based. Extending a base table incorporates all the fields of the original table and creates system fields for the new table. If they are in the same scope or if they can be configured from other scopes, you can extend tables that are marked as extensible. |
| `label` | String or Array | A unique label for the table in list and form views. Field labels can be provided as a string or an array of label objects. Maximum length: 80. Default: the value of the name property |
| `licensingConfig` | Object | The licensing configuration [ua_table_licensing_config] for a table. For more information, see licensingConfig object. |
| `display` | String | The default display column. Use a column name from the schema property. |
| `extensible` | Boolean | Flag that indicates whether other tables can extend the table. Valid values: `true` (Other tables can extend the table), `false` (Other tables can't extend the table). Default: `false`. Changing this property from true to false prevents the creation of additional child tables but existing child tables remain unchanged. |
| `liveFeed` | Boolean | Flag that indicates if live feeds are available for records in the table. Valid values: `true` (Live feeds are provided), `false` (Live feeds aren't provided). Default: `false` |
| `accessibleFrom` | String | The application scopes that can access the table. Valid values: `public` (The table is accessible from all application scopes), `package_private` (The table is accessible from only the application scope it's in). Default: `public` |
| `callerAccess` | String | The access level for cross-scope requests. Valid values: `restricted` (Calls must be manually approved), `tracking` (Calls are auto-approved), `none` (Cross-scope calls are approved/denied based on accessibleFrom property). Default: `none`. For more information, see Restricted caller access privilege settings. |
| `actions` | Array | A list of access options for cross-scope operations. Valid values: `read` (Allow reading records), `create` (Allow creating records), `update` (Allow modifying records), `delete` (Allow deleting records). Read access is required to grant any other API record operations. Default: `read` |
| `allowWebServiceAccess` | Boolean | Flag that indicates whether web services can make calls to the table. Valid values: `true` (Web services can call), `false` (Web services can't call). Default: `false` |
| `allowNewFields` | Boolean | Flag that indicates whether to allow design time configuration of new fields on the table from other application scopes. Valid values: `true`, `false`. Default: `false` |
| `allowUiActions` | Boolean | Flag that indicates whether to allow design time configuration of UI actions on the table from other application scopes. Valid values: `true`, `false`. Default: `false` |
| `allowClientScripts` | Boolean | Flag that indicates whether to allow design time configuration of client scripts on the table from other application scopes. Valid values: `true`, `false`. Default: `false` |
| `audit` | Boolean | Flag that indicates whether to track the creation, update, and deletion of all records in the table. Valid values: `true` (Track operations), `false` (Don't track). Default: `false` |
| `readOnly` | Boolean | Flag that indicates whether users can edit fields in the table. Valid values: `true` (Users can't edit fields), `false` (Users can edit fields). Default: `false` |
| `textIndex` | Boolean | Flag that indicates whether search engines index the text in a table. Valid values: `true` (Text is indexed), `false` (Text isn't indexed). Default: `false` |
| `attributes` | Object | Key and value pairs of any supported dictionary attributes [sys_schema_attribute]. For example: `{ updateSyncCustom: Boolean, nativeRecordLock: Boolean }`. For more information, see Dictionary Attributes. |
| `index` | Array | A list of column references to generate indexes in the metadata XML of the table. A database index increases the speed of accessing data with the expense of additional storage. Format: `[{ name: 'String', element: 'String', unique: Boolean }, ...]` |
| `autoNumber` | Object | The auto-numbering configuration [sys_number] for a table. For more information, see autoNumber object. |
| `scriptableTable` | Boolean | Flag that indicates whether the table is a remote table that uses data retrieved from an external source. Valid values: `true` (The table is a remote table), `false` (The table isn't a remote table). Default: `false`. For more information, see Remote tables. |

### Example

```ts
import { Table, StringColumn } from "@servicenow/sdk/core";
import { myFunction } from "../server/myFunction.js"

export const x_snc_example_to_do = Table({
    name: 'x_snc_example_to_do',
    label: 'My To Do Table',
    extends: 'task',
    schema: {
        status: StringColumn({ label: 'Status' }),
        deadline: StringColumn({
            label: 'Deadline',
            active: true,
            mandatory: false,
            readOnly: false,
            maxLength: 40,
            dropdown: 'none',
            attributes: {
                updateSync: false,
            },
            default: 'today',
            dynamicValueDefinitions: {
                type: 'calculated_value',
                calculatedValue: '',
            },
            choices: {
                choice1: {
                    label: 'Choice1 Label',
                    sequence: 0,
                    inactiveOnUpdate: false,
                    dependentValue: '5',
                    hint: 'hint',
                    inactive: false,
                    language: 'en',
                },
                choice2: { label: 'Choice2 Label', sequence: 1 },
            },
        }),
        dynamic1: StringColumn({
            dynamicValueDefinitions: {
                type: 'calculated_value',
                calculatedValue: myFunction,
            },
        }),
        dynamic2: StringColumn({
            dynamicValueDefinitions: {
                type: 'dynamic_default',
                dynamicDefault: `gs.info()`,
            },
        }),
        dynamic3: StringColumn({
            dynamicValueDefinitions: {
                type: 'dependent_field',
                columnName: 'status',
            },
        }),
        dynamic4: StringColumn({
            dynamicValueDefinitions: {
                type: 'choices_from_other_table',
                table: 'sc_cat_item',
                field: 'display',
            },
        }),
    },
    actions: ['create', 'read'],
    display: 'deadline',
    accessibleFrom: 'package_private',
    allowClientScripts: true,
    allowNewFields: true,
    allowUiActions: true,
    allowWebServiceAccess: true,
    extensible: true,
    liveFeed: true,
    callerAccess: 'none',
    autoNumber: {
        number: 10,
        numberOfDigits: 2,
        prefix: 'abc',
    },
    audit: true,
    readOnly: true,
    textIndex: true,
    attributes: {
        updateSync: true,
    },
    index: [
        {
            name: 'idx',
            element: 'status',
            unique: true,
        },
    ],
})
```

**Note:** For typeahead support for columns, assign the Table object to an exported variable with the same name as the `name` property.

---

## Column Object

Add a column [sys_dictionary] to a table.

Add Column objects in the schema property of the Table object.

There are many types of columns based on the field type. Column objects use the format `<Type>Column` where `<Type>` is the field type. For information about field types, see Field types reference.

### Supported Column Types

`StringColumn`, `IntegerColumn`, `BooleanColumn`, `DecimalColumn`, `DateColumn`, `DateTimeColumn`, `CalendarDateTimeColumn`, `BasicDateTimeColumn`, `DueDateColumn`, `IntegerDateColumn`, `ScheduleDateTimeColumn`, `OtherDateColumn`, `ListColumn`, `RadioColumn`, `ChoiceColumn`, `ScriptColumn`, `VersionColumn`, `DomainIdColumn`, `DomainPathColumn`, `FieldNameColumn`, `ReferenceColumn`, `TableNameColumn`, `UserRolesColumn`, `UserImageColumn`, `BasicImageColumn`, `DocumentIdColumn`, `TranslatedTextColumn`, `TranslatedFieldColumn`, `SystemClassNameColumn`, `GenericColumn`, `Password2Column`, `GuidColumn`, `JsonColumn`, `NameValuePairsColumn`, `UrlColumn`, `EmailColumn`, `HtmlColumn`, `FloatColumn`, `MultiLineTextColumn`, `DurationColumn`, `TimeColumn`, `FieldListColumn`, `TemplateValueColumn`, `SlushBucketColumn`, `ApprovalRulesColumn`, `ConditionsColumn`, `DayOfWeekColumn`, `DaysOfWeekColumn`, `RecordsColumn`

**Column type quick reference:**

| Column Type | ServiceNow Field Type | Use For |
|-------------|----------------------|---------|
| `StringColumn` | `string` | Short text (≤255 chars shown as single-line) |
| `MultiLineTextColumn` | `string` | Long text (>255 chars shown as multi-line) |
| `IntegerColumn` | `integer` | Whole numbers |
| `FloatColumn` | `float` | Floating-point numbers |
| `DecimalColumn` | `decimal` | Fixed-precision decimals |
| `BooleanColumn` | `boolean` | True/false checkbox |
| `ChoiceColumn` | `string` (choice) | Dropdown with defined choices |
| `RadioColumn` | `string` (radio) | Radio button selection |
| `DateColumn` | `glide_date` | Date only (no time) |
| `DateTimeColumn` | `glide_date_time` | Date and time |
| `CalendarDateTimeColumn` | `calendar_date_time` | Calendar date/time picker |
| `ScheduleDateTimeColumn` | `schedule_date_time` | Scheduled date/time |
| `DueDateColumn` | `due_date` | Due date with business time tracking |
| `IntegerDateColumn` | `integer_date` | Date stored as integer |
| `BasicDateTimeColumn` | `glide_date_time` variant | Basic date/time |
| `OtherDateColumn` | Various date types | Other date variants |
| `DurationColumn` | `glide_duration` | Time duration (days/hours/minutes) |
| `TimeColumn` | `glide_time` | Time of day only |
| `ReferenceColumn` | `reference` | Foreign key reference to another table |
| `DocumentIdColumn` | `document_id` | Generic document reference (table+sys_id pair) |
| `TableNameColumn` | `table_name` | Name of a ServiceNow table |
| `FieldNameColumn` | `field_name` | Name of a field on a table |
| `FieldListColumn` | `field_list` | Comma-separated list of field names |
| `ListColumn` | `glide_list` | Multi-value reference list |
| `TemplateValueColumn` | `template_value` | Key-value field value template |
| `ConditionsColumn` | `conditions` | Encoded query / filter conditions |
| `ScriptColumn` | `script` | Server-side script content |
| `JsonColumn` | `json` | JSON data |
| `UrlColumn` | `url` | URL string |
| `EmailColumn` | `email` | Email address |
| `HtmlColumn` | `html` | HTML content |
| `Password2Column` | `password2` | Encrypted password field |
| `GuidColumn` | `GUID` | Globally unique identifier |
| `VersionColumn` | `version` | Software version string |
| `DomainIdColumn` | `domain_id` | Domain identifier |
| `DomainPathColumn` | `domain_path` | Domain path string |
| `UserRolesColumn` | `user_roles` | User roles list |
| `UserImageColumn` | `user_image` | User profile image |
| `BasicImageColumn` | `image` | Basic image attachment |
| `SystemClassNameColumn` | `system_class_name` | Table class name |
| `TranslatedTextColumn` | `translated_text` | Translatable text |
| `TranslatedFieldColumn` | `translated_field` | Field with translations |
| `GenericColumn` | Various | Generic field with explicit `column_type` attribute |
| `NameValuePairsColumn` | `name_value_pairs` | Name-value pair storage |
| `SlushBucketColumn` | `slush_bucket` | Dual-list selector |
| `ApprovalRulesColumn` | `approval_rules` | Approval rule configuration |
| `DayOfWeekColumn` | `day_of_week` | Single day of week selection |
| `DaysOfWeekColumn` | `days_of_week` | Multiple days of week selection |
| `RecordsColumn` | `records` | Array of record references |
| `VersionColumn` | `version` | Version string |

### Properties

| Name | Type | Description |
|------|------|-------------|
| `label` | String or Array | A unique label for the column that appears on list headers and form fields. Field labels can be provided as a string or an array of label objects. Default: the key used for the column object |
| `maxLength` | Number | The maximum length of values in the column. A length of under 254 appears as a single-line text field. Anything 255 characters or over appears as a multi-line text box. Default: varies depending on the column type. **Note:** To avoid data loss, only decrease the length of a string field when you're developing a new application and not when a field contains data. |
| `active` | Boolean | Flag that indicates whether to display the field in lists and forms. Valid values: `true` (Displays the field), `false` (Hides the field). Default: `true` |
| `mandatory` | Boolean | Flag that indicates whether the field must contain a value to save a record. Valid values: `true` (The field must contain a value), `false` (The field isn't required). Default: `false` |
| `readOnly` | Boolean | Flag that indicates whether you can edit the field value. Valid values: `true` (You can't change the value), `false` (You can change the field value). Default: `false` |
| `readOnlyOption` | String | Control the ability to edit read-only fields. Valid values: `instance_configured` (Maintains backwards compatibility), `display_read_only` (Displays read-only in UI, allows changes via client scripts and server-side operations), `client_script_modifiable` (Displays read-only in UI, allows changes via client scripts but not server APIs), `strict_read_only` (Displays read-only in UI, prevents changes everywhere). For more information, see Configuring read-only security options. |
| `default` | Any | The default value of the field when creating a record. The value must use the correct type based on the column type. |
| `choices` | Object | A list of choices [sys_choice] for a column. This property only applies to ChoiceColumn objects and column types that extend choice columns. It can include either an array of primitive values or a series of choice objects. For more information, see choices object. |
| `attributes` | Object | Key and value pairs of any supported dictionary attributes [sys_schema_attribute]. For example: `{ updateSyncCustom: Boolean, nativeRecordLock: Boolean }`. For more information, see Dictionary Attributes. |
| `functionDefinition` | String | The definition of a function that the field performs, such as a mathematical operation, field length computation, or day of the week calculation. Each definition begins with `glidefunction:`, followed by the operation (such as `concat`), followed by function parameters. Constants must be enclosed in single quotes. For example: `'glidefunction:concat(short_description, ' ', caller_id.name)'`. For more information about function definitions, see Function field. |
| `dynamicValueDefinitions` | Object | Default values that are generated dynamically based on dynamic filters. Supports types: `dynamic_default`, `dependent_field`, `calculated_value`, `choices_from_other_table`. For more information, see Dynamic Value Definitions. |
| `dropdown` | String | An option for how a list of choices displays for list and form views. This property only applies to ChoiceColumn objects and column types that extend choice columns. Valid values: `none` (Choices aren't enforced), `dropdown_without_none` (Menu without -- None -- option), `dropdown_with_none` (Menu with -- None -- option), `suggestion` (Choices are displayed as suggested values). Default: `none` |

### Column Names

Column names are provided as object keys paired with the column definitions:

```ts
schema: {
   deadline: DateColumn({ label: 'Deadline' }),
   state: StringColumn({
      label: 'State',
      choices: {
         ready: { label: 'Ready' },
         completed: { label: 'Completed' },
         inProgress: { label: 'In Progress' },
      }
   }),
   task: StringColumn({ label: 'Task', maxLength: 120 }),
}
```

If the table name doesn't include the application scope, column names must be prefixed with the application scope instead:

```ts
schema: {
   x_scope_myColumn: StringColumn({...})
}
```

---

## choices Object

Configure choices [sys_choice] for a column in a table.

The choices object is a property within the Column object. Use the choices object with supported column types in the schema property of a Table object. Only certain column types extend the choice column type (ChoiceColumn) and can include choices.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `label` | String | **Required.** The text to display for the choice in the list. |
| `dependentValue` | String | A value that you map to the dependentField in the dynamicValueDefinitions property of the Column object. |
| `hint` | String | A short description of the choice that displays as tooltip when hovering over it. |
| `language` | String | The BCP 47 code of the language for the translated choice. Default: `en` |
| `sequence` | Integer | The order in the list of choices that a choice occurs. |
| `inactive` | Boolean | Flag that indicates whether to show the choice in the list. Valid values: `true` (The choice is hidden), `false` (The choice appears). Default: `false` |

### Example

The choices object includes a series of choice objects, where the names of the choices are provided as object keys paired with the choices definitions:

```ts
choices: {
   choice1: {
      label: 'Choice1 Label',
      sequence: 0,
      inactiveOnUpdate: false,
      dependentValue: '5',
      hint: 'hint',
      inactive: false,
      language: 'en',
   },
   choice2: { label: 'Choice2 Label', sequence: 1 },
}
```

---

## label Object

Configure a field label [sys_documentation] for a table or column.

The label object is a property within the Table and Column objects.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `language` | String | The BCP 47 code of the language for the field label. A language can have only one label, so each language must be unique within an array of label objects. |
| `label` | String | The text of the field label in the specified language. |
| `hint` | String | A short description that displays as a tooltip when hovering over the field label. |
| `help` | String | Additional information about the field. Help text isn't displayed in form or list views of the table. |
| `plural` | String | The plural form of the field label. |
| `url` | String | A URL for a web page that provides information about the field. When a URL is provided, the label displays as a hyperlink. |
| `urlTarget` | String | Not used (deprecated). |

### Example

```ts
label: [
   {
      label: 'English description',
      language: 'en',
      hint: 'Provide a short description'
   },
   {
      label: 'Description de español',
      language: 'es'
   },
]
```

---

## licensingConfig Object

Create a licensing configuration [ua_table_licensing_config] to track subscription counts for a table.

The licensingConfig object is a property within the Table object. If this property isn't specified, a default licensing configuration with licenseModel set to none is generated for the table on the instance.

**Note:** Specifying a licensing model is not applicable for ServiceNow customers who build custom applications for their own use. Licensing models are used only by partners who sell and monitor the usage of resellable applications on the ServiceNow Store.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `licenseModel` | String | The model for tracking subscription usage. Valid values: `none` (Licensing isn't used), `fulfiller` (Fulfiller/requester operations are tracked), `producer` (Producer operations are tracked). Default: `none` |
| `licenseRoles` | Array | A list of roles for which any operations on records in the table count toward the subscription. |
| `opDelete` | Boolean | Flag that indicates whether a subscription is required to delete records for tables with the producer model. Valid values: `true`, `false`. Default: `true` |
| `opInsert` | Boolean | Flag that indicates whether a subscription is required to insert records for tables with the producer model. Valid values: `true`, `false`. Default: `true` |
| `opUpdate` | Boolean | Flag that indicates whether a subscription is required to update records for tables with the producer model. Valid values: `true`, `false`. Default: `true` |
| `licenseCondition` | String | A filter query that determines conditions for counting operations toward a subscription. For the fulfiller model, specify conditions that determine whether the logged-in user is the fulfiller. For the producer model, specify conditions that determine whether records count toward the subscription. |
| `ownerCondition` | String | A filter query that determines whether a user owns a record for the fulfiller model. |
| `isFulfillment` | Boolean | **Deprecated.** Flag that indicates whether to disallow updates by users who aren't subscribed. Valid values: `true`, `false`. Default: `false` |

### Example

```ts
licensingConfig: {
  licenseModel: 'fulfiller',
  opInsert: false,
  licenseRoles: ['admin'],
}
```

---

## autoNumber Object

Configure auto-numbering [sys_number] for a table.

The autoNumber object is a property within the Table object.

### Properties

| Name | Type | Description |
|------|------|-------------|
| `prefix` | String | A prefix for every record number in the table. For example, INC for Incident. Default: `pre` |
| `number` | Integer | The base record number for this table. Record numbers are automatically incremented, and the next number is maintained in the Counter [sys_number_counter] table. If you set the base number to a value higher than the current counter, the next record number uses the new base number. Otherwise the next record number uses the current counter. The counter doesn't reset to a base number lower than itself. Default: `1000` |
| `numberOfDigits` | Integer | The minimum number of digits to use after the prefix. Leading zeros are added to auto-numbers, if necessary. For example, INC0001001 contains three leading zeros. The number of digits can exceed the minimum length. For example, if numberOfDigits is 2 and more than 99 records are created, the numbers continue past 100 (such as INC101). **Warning:** Changing this field can update all number values for existing records on a table. Take care when changing this field on a production instance. Default: `7` |

### Example

```ts
autoNumber: {
   prefix: 'TODO',
   number: 2000,
   numberOfDigits: 9,
}
```

To use the number in a table, you need to create a number column that uses the number as the default value:

```ts
number: IntegerColumn({
   default: 'javascript:getNextObjNumberPadded();'
})`
```

---

## Dynamic Value Definitions

The `dynamicValueDefinitions` property supports the following types:

### dynamic_default

Provide a function from the Dynamic Filter Options [sys_filter_option_dynamic] table. For more information, see Create a dynamic filter option.

```ts
dynamicValueDefinitions: {
   type: 'dynamic_default',
   dynamicDefault: `gs.info()`,
}
```

### dependent_field

Provide another column name from the same table.

```ts
dynamicValueDefinitions: {
   type: 'dependent_field',
   columnName: 'status',
}
```

### calculated_value

Provide a function for calculating the value. The function can be imported from a JavaScript module or be defined inline.

```ts
dynamicValueDefinitions: {
   type: 'calculated_value',
   calculatedValue: function,
}
```

### choices_from_other_table

Provide choices from a column on another table.

```ts
dynamicValueDefinitions: {
   type: 'choices_from_other_table',
   table: 'sc_cat_item',
   field: 'display',
}
```
