# Deployment & Release Management - Code Examples

Examples for Update Sets, XML migration, and deployment strategies.

## Table of Contents

1. [Update Set Basics](#update-set-basics)
2. [XML Data Migration](#xml-data-migration)
3. [Parent-Child Update Sets](#parent-child-update-sets)
4. [Safe Deployment Practices](#safe-deployment-practices)

---

## Update Set Basics

### Create Update Set Programmatically

```javascript
// Create a new update set
var updateSet = new GlideRecord('sys_update_set');
updateSet.initialize();
updateSet.name = 'Custom Incident Configuration - v1.2.3';
updateSet.description = 'Updates to incident table and business rules';
updateSet.release_date = '2026-03-15';
updateSet.type = 'Custom';

var updateSetId = updateSet.insert();
gs.info('Created update set: ' + updateSetId);

// Set as current for capturing changes
var user = gs.getUser();
user.setPreference('sys_update_set', updateSetId);
```

### Query Update Sets

```javascript
// Get recent update sets
var updateSets = new GlideRecord('sys_update_set');
updateSets.addQuery('state', '!=', 'Captured');
updateSets.orderByDesc('sys_created_on');
updateSets.setLimit(10);
updateSets.query();

var results = [];
while (updateSets.next()) {
    results.push({
        name: updateSets.getValue('name'),
        description: updateSets.getValue('description'),
        state: updateSets.getValue('state'),
        created: updateSets.getValue('sys_created_on'),
        recordCount: updateSets.getChildCount()
    });
}

return results;
```

### Preview Update Set Before Deployment

```javascript
function previewUpdateSet(updateSetId) {
    var updateSet = new GlideRecord('sys_update_set');
    updateSet.get(updateSetId);

    var preview = {
        name: updateSet.getValue('name'),
        state: updateSet.getValue('state'),
        changes: []
    };

    // Get all records in this update set
    var updateRecords = new GlideRecord('sys_update_xml');
    updateRecords.addQuery('update_set', updateSetId);
    updateRecords.orderBy('table_name');
    updateRecords.query();

    var currentTable = '';
    while (updateRecords.next()) {
        var tableName = updateRecords.getValue('table_name');

        if (tableName !== currentTable) {
            currentTable = tableName;
            preview.changes.push({
                table: tableName,
                count: 0,
                records: []
            });
        }

        preview.changes[preview.changes.length - 1].records.push({
            operation: updateRecords.getValue('type'),
            name: updateRecords.getValue('name'),
            sys_id: updateRecords.getValue('target_name')
        });

        preview.changes[preview.changes.length - 1].count++;
    }

    return preview;
}
```

---

## XML Data Migration

### Export Records to XML

```javascript
function exportRecordsToXml(tableName, conditions) {
    var xml = new XMLDocument();
    var root = xml.createElement('records');

    var gr = new GlideRecord(tableName);

    // Add conditions
    for (var field in conditions) {
        gr.addQuery(field, conditions[field]);
    }

    gr.query();

    while (gr.next()) {
        var record = xml.createElement('record');

        // Add all fields
        var fields = gr.getFields();
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var fieldElement = xml.createElement(field);
            fieldElement.setNodeValue(gr.getValue(field));
            record.appendChild(fieldElement);
        }

        root.appendChild(record);
    }

    return root.toString();
}

// Usage:
var xml = exportRecordsToXml('incident', {
    priority: '1',
    state: 'resolved'
});
gs.info('Exported ' + xml.length + ' characters');
```

### Import Records from XML

```javascript
function importRecordsFromXml(xmlString, tableName) {
    var xml = new XMLDocument();
    xml.parseXML(xmlString);

    var records = xml.getDocumentElement().getChildNodes();
    var importCount = 0;
    var errorCount = 0;

    for (var i = 0; i < records.getLength(); i++) {
        try {
            var recordNode = records.item(i);
            var gr = new GlideRecord(tableName);
            gr.initialize();

            // Set fields from XML
            var fields = recordNode.getChildNodes();
            for (var j = 0; j < fields.getLength(); j++) {
                var field = fields.item(j);
                var fieldName = field.getNodeName();
                var fieldValue = field.getTextContent();

                gr.setValue(fieldName, fieldValue);
            }

            gr.insert();
            importCount++;

        } catch (error) {
            gs.error('Error importing record ' + i + ': ' + error.message);
            errorCount++;
        }
    }

    return {
        imported: importCount,
        errors: errorCount
    };
}
```

---

## Parent-Child Update Sets

### Create Parent-Child Structure

```javascript
// Best Practice: Create parent update set for logical grouping
var parentUpdateSet = new GlideRecord('sys_update_set');
parentUpdateSet.initialize();
parentUpdateSet.name = 'Release 1.2 - Complete Package';
parentUpdateSet.description = 'All changes for release 1.2';
parentUpdateSet.type = 'Standard';
var parentId = parentUpdateSet.insert();

// Create child update sets for different areas
var businessRulesChild = new GlideRecord('sys_update_set');
businessRulesChild.initialize();
businessRulesChild.name = 'Release 1.2 - Business Rules';
businessRulesChild.parent = parentId;
businessRulesChild.description = 'Business rule updates for release 1.2';
var childId1 = businessRulesChild.insert();

var tablesChild = new GlideRecord('sys_update_set');
tablesChild.initialize();
tablesChild.name = 'Release 1.2 - Table Configuration';
tablesChild.parent = parentId;
tablesChild.description = 'Table field and index updates';
var childId2 = tablesChild.insert();

gs.info('Created parent update set ' + parentId + ' with 2 children');
```

---

## Safe Deployment Practices

### Pre-Deployment Validation

```javascript
function validateUpdateSetForDeployment(updateSetId) {
    var errors = [];
    var warnings = [];

    var updateSet = new GlideRecord('sys_update_set');
    updateSet.get(updateSetId);

    // Check state
    if (updateSet.getValue('state') !== 'Captured') {
        errors.push('Update set state is not "Captured" - cannot deploy');
    }

    // Check for naming convention
    var name = updateSet.getValue('name');
    if (!name.match(/^[A-Z]/)) {
        warnings.push('Update set name should start with uppercase letter');
    }

    // Check for description
    if (!updateSet.getValue('description') || updateSet.getValue('description').length < 10) {
        warnings.push('Update set description is too brief or missing');
    }

    // Count records
    var recordCount = updateSet.getChildCount();
    if (recordCount === 0) {
        errors.push('Update set contains no changes');
    }

    if (recordCount > 1000) {
        warnings.push('Update set contains ' + recordCount + ' changes - consider splitting');
    }

    // Check for risky operations
    var riskRecords = new GlideRecord('sys_update_xml');
    riskRecords.addQuery('update_set', updateSetId);
    riskRecords.addQuery('type', 'IN', 'delete,modify');
    riskRecords.query();

    if (riskRecords.getRowCount() > 50) {
        warnings.push('Update set contains many delete/modify operations - review carefully');
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}
```

### Deployment Checklist

```javascript
/**
 * Pre-Deployment Checklist
 *
 * 1. TEST ON SUB-PRODUCTION FIRST
 *    - Never deploy directly to production
 *    - Test all related functionality
 *    - Verify no data loss
 *
 * 2. VALIDATE UPDATE SET
 *    - Check naming convention
 *    - Verify all changes are intended
 *    - Review XML for risky operations
 *
 * 3. BACKUP BEFORE DEPLOYMENT
 *    - Take instance snapshot
 *    - Document current state
 *    - Have rollback plan
 *
 * 4. DOCUMENT CHANGES
 *    - Update set description
 *    - Add release notes
 *    - Document any breaking changes
 *
 * 5. NOTIFY STAKEHOLDERS
 *    - Send deployment notification
 *    - Provide rollback procedure
 *    - Schedule downtime if needed
 *
 * 6. DEPLOY DURING LOW-TRAFFIC WINDOW
 *    - Avoid business hours if possible
 *    - Have team on standby
 *    - Monitor system after deployment
 *
 * 7. VERIFY POST-DEPLOYMENT
 *    - Run smoke tests
 *    - Check key functionality
 *    - Monitor error logs
 *    - Confirm user feedback
 */

function deploymentChecklist() {
    return [
        { step: 1, task: 'Test on sub-production', status: 'pending' },
        { step: 2, task: 'Validate update set', status: 'pending' },
        { step: 3, task: 'Create backup/snapshot', status: 'pending' },
        { step: 4, task: 'Document all changes', status: 'pending' },
        { step: 5, task: 'Notify stakeholders', status: 'pending' },
        { step: 6, task: 'Schedule deployment window', status: 'pending' },
        { step: 7, task: 'Deploy to production', status: 'pending' },
        { step: 8, task: 'Run post-deployment tests', status: 'pending' },
        { step: 9, task: 'Monitor system health', status: 'pending' },
        { step: 10, task: 'Document results', status: 'pending' }
    ];
}
```

---

## Best Practices

✓ **Always test on sub-production first** before production deployment
✓ **Use meaningful naming** for update sets (include version/date)
✓ **Keep update sets focused** - one feature per update set when possible
✓ **Document changes thoroughly** in description and release notes
✓ **Use parent-child structure** for complex deployments
✓ **Validate before deployment** - check for naming, description, sizing
✓ **Have rollback plan** ready before deploying
✓ **Monitor after deployment** - check logs and user feedback
✓ **Avoid large update sets** - split into smaller, manageable chunks
✓ **Review XML changes** especially for delete/modify operations

---

## Common Deployment Issues

| Issue | Prevention |
|-------|-----------|
| Accidental data deletion | Review XML carefully before deploy |
| Breaking existing workflows | Test thoroughly on sub-prod |
| Naming collisions | Use versioning in names |
| Missing dependencies | Document related changes |
| Failed rollback | Keep previous update sets |
| Lost changes in transit | Use version control for update sets |

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for advanced deployment strategies and troubleshooting.
