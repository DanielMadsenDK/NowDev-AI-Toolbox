// Canonical shape: Fluent SDK ScriptInclude with Now.include() bridge pattern
// String-only API — must use Now.include(), NOT ES module import/export
// Verify topic script-include-guide through nowdev-ai-toolbox-servicenow-sdk.
import '@servicenow/sdk/global';
import { ScriptInclude } from '@servicenow/sdk/core';

export const AssetUtils = ScriptInclude({
  $id: Now.ID['AssetUtils'],
  name: 'AssetUtils',
  apiName: 'x_myapp.AssetUtils',
  clientCallable: false,
  script: Now.include('./AssetUtils.js'),
});
