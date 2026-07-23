// Canonical shape: Fluent SDK table definition
// Verify topic table-api through nowdev-ai-toolbox-servicenow-sdk.
import '@servicenow/sdk/global';
import { Table, StringColumn, IntegerColumn, ReferenceColumn, Role, Acl } from '@servicenow/sdk/core';

const adminRole = Role({
  $id: Now.ID['x_myapp.admin'],
  name: 'x_myapp.admin',
  description: 'Administrator role for MyApp',
  grantable: true,
});

const assetTable = Table({
  $id: Now.ID['x_myapp_asset'],
  name: 'x_myapp_asset',
  label: 'Asset',
  schema: {
    name: StringColumn({
      label: 'Name',
      mandatory: true,
      maxLength: 100,
    }),
    status: IntegerColumn({
      label: 'Status',
      choices: {
        '1': { label: 'Active', sequence: 0 },
        '2': { label: 'Retired', sequence: 1 },
      },
      default: '1',
    }),
    assigned_to: ReferenceColumn({
      label: 'Assigned To',
      referenceTable: 'sys_user',
    }),
  },
});

const readAcl = Acl({
  $id: Now.ID['x_myapp_asset.read'],
  type: 'record',
  table: 'x_myapp_asset',
  operation: 'read',
  roles: [adminRole],
});

export { adminRole, assetTable, readAcl };
