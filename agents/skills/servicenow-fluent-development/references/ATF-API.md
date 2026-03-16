# Automated Test Framework (ATF) Test API

ServiceNow Fluent provides the **Test API** for creating automated tests ([sys_atf_test]) that verify your instance works correctly after making changes.

## Overview

Automated Test Framework (ATF) tests allow you to create step-by-step test sequences that:
- Test forms (open, fill, submit, validate)
- Test REST APIs (send requests, assert responses)
- Test server-side operations (insert, update, delete, query records)
- Test email functionality
- Test service catalog items
- Test application navigation

**Related documentation:** See [Automated Test Framework (ATF)](https://docs.servicenow.com/en-US/bundle/washoe-platform-user-interface/page/use/automated-testing/concept_Automated_Test_Framework.html) for general information about ATF tests.

---

## Test Object

A Test is defined using the `Test()` function with properties and a configuration function containing test steps.

### Properties

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `$id` | String or Number | Yes | Unique ID for the metadata object. When you build the application, this ID is hashed into a unique `sys_id`. Format: `Now.ID['String' or Number]` |
| `name` | String | Yes | A unique name for the test. Displayed in the ATF UI. |
| `description` | String | No | A description of what the test does. |
| `active` | Boolean | No | Flag that indicates whether the test is active. Default: `true` |
| `failOnServerError` | Boolean | No | Flag that indicates whether to fail when a server error occurs during the test. Default: `true` |
| `configurationFunction` | Function | Yes | The steps of the test. Test steps are passed as statements within a callback function receiving the `atf` object. Example: `(atf) => { atf.form.openNewForm(...) }` |
| `$meta` | Object | No | Metadata for the application metadata. Controls installation behavior. |

### $meta Property

The `$meta` object uses the `installMethod` property to control when the test is installed:

```ts
$meta: {
  installMethod: 'String'
}
```

**Valid `installMethod` values:**
- `'demo'` — Outputs to `metadata/unload.demo` directory; installed only when "Load demo data" option is selected during app installation
- `'first install'` — Outputs to `metadata/unload` directory; installed only on the first installation of the app on an instance

---

## Test Configuration Function

The configuration function receives an `atf` object containing all available test steps organized by category.

### Function Signature

```ts
(atf) => {
  // Test steps here
  atf.category.stepName({ /* properties */ })
}
```

### Output Variables

Output variables from test steps can be captured and reused in subsequent steps using the syntax:
- **Direct output variable:** `output.<output-variable-name>`
- **Step object template:** `{{step["step-id"].<output-variable-name>}}`

**Example:**
```ts
const output = atf.form.submitForm({ assertType: 'form_submitted_to_server', formUI: 'standard_ui' })
atf.server.recordValidation({
  recordId: output.record_id,  // Use output variable directly
  table: 'sn_table_app_reptile_table',
  assertType: 'record_validated',
  fieldValues: 'reptiles=lizard',
})
atf.server.log({
  log: `Submitted record with sys_id: ${output.record_id} to table ${output.table}`
})
```

---

## Supported Test Steps

Test steps are organized by category. For detailed step properties, see the [Automated Test Framework (ATF) test step categories documentation](https://docs.servicenow.com/en-US/bundle/washoe-platform-user-interface/page/use/automated-testing/concept_Automated_Test_Framework_test_step_categories.html).

> **Note:** Some fields available for test steps on forms in the ATF UI aren't available as properties in ServiceNow Fluent. Check the official documentation for the complete field reference.

### Application Navigator Steps

Navigate and verify application navigation elements.

```ts
atf.applicationNavigator.applicationMenuVisibility({ /* properties */ })
atf.applicationNavigator.moduleVisibility({ /* properties */ })
atf.applicationNavigator.navigateToModule({ /* properties */ })
```

---

### Email Steps

Generate and validate email messages.

```ts
atf.email.generateInboundEmail({ /* properties */ })
atf.email.generateInboundReplyEmail({ /* properties */ })
atf.email.generateRandomString({ /* properties */ })
atf.email.validateOutboundEmail({ /* properties */ })
atf.email.validateOutboundEmailGeneratedByFlow({ /* properties */ })
atf.email.validateOutboundEmailGeneratedByNotification({ /* properties */ })
```

---

### Form Steps

Interact with forms and validate form state.

```ts
atf.form.addAttachmentsToForm({ /* properties */ })
atf.form.clickDeclarativeAction({ /* properties */ })
atf.form.clickModalButton({ /* properties */ })
atf.form.clickUIAction({ /* properties */ })
atf.form.declarativeActionVisibility({ /* properties */ })
atf.form.fieldStateValidation({ /* properties */ })
atf.form.fieldValueValidation({ /* properties */ })
atf.form.openExistingRecord({ /* properties */ })
atf.form.openNewForm({ /* properties */ })
atf.form.setFieldValue({ /* properties */ })
atf.form.submitForm({ /* properties */ })
atf.form.uiActionVisibility({ /* properties */ })
```

**Common Form Properties:**
- `table` — Target table name (e.g., `'sn_table_app_reptile_table'`)
- `formUI` — Form UI type (e.g., `'standard_ui'`)
- `view` — Optional view name
- `fieldValues` — Object containing field name/value pairs to set
- `assertType` — Type of assertion to validate (e.g., `'form_submitted_to_server'`)

---

### Forms in Service Portal Steps

Interact with Service Portal forms.

```ts
atf.form_SP.addAttachmentsToForm({ /* properties */ })
atf.form_SP.clickUIAction_SP({ /* properties */ })
atf.form_SP.fieldStateValidation_SP({ /* properties */ })
atf.form_SP.fieldValueValidation_SP({ /* properties */ })
atf.form_SP.openForm_SP({ /* properties */ })
atf.form_SP.openServicePortalPage({ /* properties */ })
atf.form_SP.setFieldValue_SP({ /* properties */ })
atf.form_SP.submitForm_SP({ /* properties */ })
atf.form_SP.uiActionVisibilityValidation_SP({ /* properties */ })
```

---

### Dashboard Quick Start Tests

Test responsive dashboard functionality.

```ts
atf.reporting.responsiveDashboard({ /* properties */ })
atf.reporting.responsiveDashboardSharing({ /* properties */ })
```

---

### REST API Steps

Send HTTP requests and assert on responses.

```ts
atf.rest.assertJsonResponsePayloadElement({ /* properties */ })
atf.rest.assertResponseHeader({ /* properties */ })
atf.rest.assertResponseJSONPayloadIsValid({ /* properties */ })
atf.rest.assertResponsePayload({ /* properties */ })
atf.rest.assertResponseTime({ /* properties */ })
atf.rest.assertResponseXMLPayloadIsWellFormed({ /* properties */ })
atf.rest.assertStatusCode({ /* properties */ })
atf.rest.assertStatusCodeName({ /* properties */ })
atf.rest.assertXMLResponsePayloadElement({ /* properties */ })
atf.rest.sendRestRequest({ /* properties */ })
```

**Common REST Properties:**
- `method` — HTTP method: `'GET'`, `'POST'`, `'PUT'`, `'DELETE'`, `'PATCH'`
- `path` — Request path (supports output variable substitution: `{{step["step-id"].record_id}}`)
- `headers` — Object with header names and values
- `body` — Request body (JSON/XML string or empty)
- `queryParameters` — Object with query parameter names and values
- `statusCode` — Expected HTTP status code (for assertions)

---

### Server-Side Steps

Execute server-side operations: impersonation, records, queries, logging.

```ts
atf.server.addAttachmentsToExistingRecord({ /* properties */ })
atf.server.checkoutShoppingCart({ /* properties */ })
atf.server.createUser({ /* properties */ })
atf.server.impersonate({ /* properties */ })
atf.server.log({ /* properties */ })
atf.server.recordDelete({ /* properties */ })
atf.server.recordInsert({ /* properties */ })
atf.server.recordQuery({ /* properties */ })
atf.server.recordUpdate({ /* properties */ })
atf.server.recordValidation({ /* properties */ })
atf.server.replayRequestItem({ /* properties */ })
atf.server.runServerSideScript({ /* properties */ })
atf.server.searchForCatalogItem({ /* properties */ })
atf.server.setOutputVariables({ /* properties */ })
```

**Common Server Properties:**
- `table` — Target table name
- `fieldValues` — Object or encoded query string (`'field=value&field2=value2'`)
- `enforceSecurityRules` or `enforceSecurity` — Boolean to enforce ACLs
- `assert` or `assertType` — Type of assertion (e.g., `'record_successfully_inserted'`, `'record_validated'`)
- `user` — Username for impersonation

---

### Service Catalog Steps

Interact with catalog items and variables.

```ts
atf.catalog.addItemToShoppingCart({ /* properties */ })
atf.catalog.openCatalogItem({ /* properties */ })
atf.catalog.openRecordProducer({ /* properties */ })
atf.catalog.orderCatalogItem({ /* properties */ })
atf.catalog.setCatalogItemQuantity({ /* properties */ })
atf.catalog.setVariableValue({ /* properties */ })
atf.catalog.submitRecordProducer({ /* properties */ })
atf.catalog.validatePriceAndRecurringPrice({ /* properties */ })
atf.catalog.variableStateValidation({ /* properties */ })
atf.catalog.validateVariableValue({ /* properties */ })
```

---

### Service Catalog in Service Portal Steps

Interact with Service Portal catalog interfaces.

```ts
atf.catalog_SP.addItemtoShoppingCart_SP({ /* properties */ })
atf.catalog_SP.addOrderGuidetoShoppingCart_SP({ /* properties */ })
atf.catalog_SP.addRowToMultiRowVariableSet_SP({ /* properties */ })
atf.catalog_SP.navigatewithinOrderGuide_SP({ /* properties */ })
atf.catalog_SP.openCatalogItem_SP({ /* properties */ })
atf.catalog_SP.openOrderGuide_SP({ /* properties */ })
atf.catalog_SP.openRecordProducer_SP({ /* properties */ })
atf.catalog_SP.orderCatalogItem_SP({ /* properties */ })
atf.catalog_SP.reviewIteminOrderGuide_SP({ /* properties */ })
atf.catalog_SP.reviewOrderGuideSummary_SP({ /* properties */ })
atf.catalog_SP.saveCurrentRowOfMultiRowVariableSet_SP({ /* properties */ })
atf.catalog_SP.setCatalogItemQuantity_SP({ /* properties */ })
atf.catalog_SP.setVariableValue_SP({ /* properties */ })
atf.catalog_SP.submitOrderGuide_SP({ /* properties */ })
atf.catalog_SP.submitRecordProducer_SP({ /* properties */ })
atf.catalog_SP.validateOrderGuideItem_SP({ /* properties */ })
atf.catalog_SP.validatePriceAndRecurringPrice_SP({ /* properties */ })
atf.catalog_SP.variableStateValidation_SP({ /* properties */ })
atf.catalog_SP.validateVariableValue_SP({ /* properties */ })
```

---

## Examples

### Complete Form and Server Validation Test

This example demonstrates a complete test workflow: opening a form, filling fields, submitting, and validating the server-side record.

```ts
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

Test({
  active: true,
  failOnServerError: true,
  name: 'Reptile Record Creation and Validation',
  description: 'Creates a reptile record via form and validates server-side persistence',
  $id: Now.ID['atf.reptile_test'],
}, (atf) => {
  // Step 1: Open a new form
  atf.form.openNewForm({
    table: 'sn_table_app_reptile_table',
    formUI: 'standard_ui',
    view: '',
  })

  // Step 2: Set field values on the form
  atf.form.setFieldValue({
    table: 'sn_table_app_reptile_table',
    formUI: 'standard_ui',
    fieldValues: {
      reptiles: 'lizard' as any,
    },
  })

  // Step 3: Submit the form and capture output
  const output = atf.form.submitForm({
    assertType: 'form_submitted_to_server',
    formUI: 'standard_ui'
  })

  // Step 4: Validate the record was created on the server
  atf.server.recordValidation({
    recordId: output.record_id,
    table: 'sn_table_app_reptile_table',
    assertType: 'record_validated',
    enforceSecurity: true,
    fieldValues: 'reptiles=lizard',
  })

  // Step 5: Log the result
  atf.server.log({
    log: `Submitted record with sys_id: ${output.record_id} to table ${output.table}`
  })
})
```

### REST API Test

This example tests a REST API endpoint with assertions on status code and response payload.

```ts
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

Test({
  active: true,
  failOnServerError: true,
  name: 'REST API Endpoint Test',
  description: 'Tests a REST API endpoint with response validation',
  $id: Now.ID['atf.rest_test'],
}, (atf) => {
  // Step 1: Send a REST request
  atf.rest.sendRestRequest({
    method: 'get',
    path: '/api/now/v2/table/incident?limit=1',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: '',
    queryParameters: {},
  })

  // Step 2: Assert successful response
  atf.rest.assertStatusCode({
    operation: 'equals',
    statusCode: 200
  })

  // Step 3: Validate JSON response structure
  atf.rest.assertResponseJSONPayloadIsValid({
    assertType: 'valid_json'
  })

  // Step 4: Validate specific JSON element
  atf.rest.assertJsonResponsePayloadElement({
    operation: 'equals',
    elementName: '/result/0/sys_id',
    elementValue: 'some_expected_sys_id',
  })
})
```

### Server-Side Record Operations Test

This example demonstrates creating, updating, and validating records on the server without UI interaction.

```ts
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

Test({
  active: true,
  failOnServerError: true,
  name: 'Server-Side Record Operations',
  description: 'Tests creating, updating, and querying incident records',
  $id: Now.ID['atf.server_ops_test'],
}, (atf) => {
  // Step 1: Impersonate a user
  atf.server.impersonate({
    user: 'admin',
  })

  // Step 2: Create a record on the server
  const insertOutput = atf.server.recordInsert({
    table: 'incident',
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
    fieldValues: {
      short_description: 'Test Incident from ATF',
      urgency: '2',
      impact: '2',
    },
  })

  // Step 3: Update the record
  atf.server.recordUpdate({
    table: 'incident',
    recordId: insertOutput.record_id,
    assertType: 'record_successfully_updated',
    fieldValues: {
      urgency: '1',
      state: 'in_progress',
    },
  })

  // Step 4: Query records to verify
  atf.server.recordQuery({
    table: 'incident',
    assertType: 'record_found',
    queryString: `urgency=1^ORDERBYshort_description`,
  })

  // Step 5: Log results
  atf.server.log({
    log: `Created and updated incident ${insertOutput.record_id}`
  })
})
```

### Multi-Step Form and Server Test with Output Variables

This example shows using output variables across multiple steps.

```ts
import '@servicenow/sdk/global'
import { Test } from '@servicenow/sdk/core'

Test({
  active: true,
  failOnServerError: true,
  name: 'Multi-Step Test with Output Variables',
  description: 'Demonstrates using output variables across test steps',
  $id: Now.ID['atf.output_vars_test'],
}, (atf) => {
  // Step 1: Insert a record on the server
  atf.server.recordInsert({
    $id: 'step1',
    table: 'incident',
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
    fieldValues: {
      short_description: 'Pre-created Incident',
      urgency: '3',
    },
  })

  // Step 2: Open the existing record in a form
  atf.form.openExistingRecord({
    table: 'incident',
    formUI: 'standard_ui',
    recordId: '{{step["step1"].record_id}}',  // Use output variable
  })

  // Step 3: Modify field values
  atf.form.setFieldValue({
    table: 'incident',
    formUI: 'standard_ui',
    fieldValues: {
      urgency: '1',
      category: 'software',
    },
  })

  // Step 4: Submit the form
  atf.form.submitForm({
    assertType: 'form_submitted_to_server',
    formUI: 'standard_ui'
  })

  // Step 5: Validate the server record reflects the changes
  atf.server.recordValidation({
    recordId: '{{step["step1"].record_id}}',  // Reference original record
    table: 'incident',
    assertType: 'record_validated',
    enforceSecurity: true,
    fieldValues: 'urgency=1^category=software',
  })
})
```

---

## Best Practices

1. **Use meaningful step IDs** — When capturing output variables, use clear step identifiers like `'step1'`, `'step_insert_record'`, etc.

2. **Enforce security appropriately** — Use `enforceSecurity: true` in production tests to validate ACLs work correctly; use `false` in test setups where bypassing ACLs is necessary.

3. **Assert on outcomes** — Always include appropriate assertions (`assertType`, status codes, payload validation) to ensure tests fail clearly when something breaks.

4. **Handle server errors** — Set `failOnServerError: true` to fail the test on unexpected server errors; set to `false` if testing error handling.

5. **Organize tests logically** — One test per scenario; use descriptions to explain what each test validates.

6. **Use output variables wisely** — Capture outputs only when needed for subsequent steps; keeps tests readable and maintainable.

7. **Test both happy paths and edge cases** — Create tests for successful operations and also for error conditions and validation failures.

---

## Related Resources

- [Automated Test Framework (ATF) — General Concepts](https://docs.servicenow.com/en-US/bundle/washoe-platform-user-interface/page/use/automated-testing/concept_Automated_Test_Framework.html)
- [ATF Test Step Categories — Detailed Reference](https://docs.servicenow.com/en-US/bundle/washoe-platform-user-interface/page/use/automated-testing/concept_Automated_Test_Framework_test_step_categories.html)
- [ServiceNow Fluent — Test Object API](https://developer.servicenow.com/dev.do#!/learn/courses/washoe/app_store_dev_washoe_fluent/aag_fluent_dev_washoe_atf_tests)
