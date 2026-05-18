/**
 * Business Rule: [Name]
 * Table: [Table Name]
 * When: [Before/After/Async/Display]
 * Action: [Insert/Update]
 */
(function executeRule(current, previous /*null when async*/) {

    // 1. Condition check (if not handled by Filter Conditions)
    // if (!current.active) return;

    try {
        // 2. Logic — use getValue(), never current.update() in Before/After rules
        var category = current.getValue('category');

        if (category === 'hardware') {
            // Logic...
        }

    } catch (e) {
        gs.error('BR [Name]: ' + e.message);
    }

})(current, previous);

// ── Display Business Rule (g_scratchpad) ─────────────────────────────────────
// When: Display  Action: (none)  — passes server data to Client Scripts on form load
(function executeRule(current, previous /*null when async*/) {

    g_scratchpad.isManager    = gs.getUser().isMemberOf('Managers');
    g_scratchpad.propValue    = gs.getProperty('my.system.property');

})(current, previous);
