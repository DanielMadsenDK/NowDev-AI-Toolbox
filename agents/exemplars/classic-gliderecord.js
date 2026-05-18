// Canonical shape: Classic ServiceNow GlideRecord query loop
// Variable naming: gr = GlideRecord, always check next(), never use getRowCount()
// Reference: agents/skills/servicenow-manipulate-data/

var assetGr = new GlideRecord('x_myapp_asset');
assetGr.addQuery('status', 1); // Active
assetGr.addQuery('assigned_to', gs.getUserID());
assetGr.orderBy('name');
assetGr.query();

while (assetGr.next()) {
    gs.info('Asset: ' + assetGr.getDisplayValue('name'));
}

// Canonical shape: secure insert — always check canCreate()
function createAsset(name, assignedTo) {
    var newGr = new GlideRecord('x_myapp_asset');
    if (!newGr.canCreate()) {
        gs.addErrorMessage('Insufficient privileges to create Asset');
        return null;
    }
    newGr.initialize();
    newGr.name = name;
    newGr.assigned_to = assignedTo;
    var sysId = newGr.insert();
    return sysId || null;
}
