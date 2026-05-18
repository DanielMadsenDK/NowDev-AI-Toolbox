// Canonical shape: Fluent SDK ATF test with server-side record operations
// Reference: agents/skills/servicenow-fluent-development/ATF-API.md
import '@servicenow/sdk/global';
import { Test } from '@servicenow/sdk/core';
import { assetTable } from '../fluent/tables/x_myapp_asset.now.ts';

export const createAssetTest = Test({
  $id: Now.ID['CreateAssetTest'],
  name: 'Create Asset — happy path',
  description: 'Verifies a new asset record can be created with required fields',
  active: true,
  failOnServerError: true,
}, (atf) => {
  const output = atf.server.recordInsert({
    table: assetTable.name,
    assertType: 'record_successfully_inserted',
    enforceSecurity: false,
    fieldValues: {
      name: 'Test Asset',
    },
  });

  atf.server.recordValidation({
    recordId: output.record_id,
    table: assetTable.name,
    assertType: 'record_validated',
    enforceSecurity: false,
    fieldValues: 'name=Test Asset',
  });

  atf.server.log({
    log: `Created asset with sys_id: ${output.record_id}`,
  });
});
