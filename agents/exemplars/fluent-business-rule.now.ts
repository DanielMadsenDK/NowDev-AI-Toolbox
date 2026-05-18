// Canonical shape: Fluent SDK BusinessRule using ES module import (function-accepting API)
// Reference: agents/skills/servicenow-fluent-development/MODULE-GUIDE.md
import '@servicenow/sdk/global';
import { BusinessRule } from '@servicenow/sdk/core';
import { gs } from '@servicenow/glide';
import { assetTable } from '../fluent/tables/x_myapp_asset.now';

export const autoAssignAsset = BusinessRule({
  $id: Now.ID['AutoAssignAsset'],
  name: 'AutoAssignAsset',
  table: assetTable.name,
  when: 'before',
  order: 100,
  action: ['insert'],
  filterCondition: 'assigned_toISEMPTY',
  script: (current, _previous) => {
    const defaultAssignee = gs.getProperty('x_myapp.default_assignee');
    if (defaultAssignee) {
      current.assigned_to = defaultAssignee;
    }
  },
});
