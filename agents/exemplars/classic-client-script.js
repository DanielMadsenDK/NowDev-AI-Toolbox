// ── onChange Client Script ────────────────────────────────────────────────────
// Guards: isLoading check prevents running during form load.
// Server data: use GlideAjax (async) — never GlideRecord.
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    // 1. Performance: stop if loading or empty
    if (isLoading || newValue === '') {
        return;
    }

    // 2. Performance: stop if value didn't change
    if (newValue === oldValue) {
        return;
    }

    // 3. Async server call via GlideAjax
    var ga = new GlideAjax('MyScriptInclude'); // Script Include name
    ga.addParam('sysparm_name', 'myMethod');   // Method name
    ga.addParam('sysparm_id', newValue);

    ga.getXMLAnswer(function(answer) {
        if (answer) {
            var result = JSON.parse(answer);
            g_form.setValue('short_description', result.msg);

            if (result.isError) {
                g_form.showErrorBox('field_name', 'Error message');
            }
        }
    });
}

// ── onLoad Client Script ──────────────────────────────────────────────────────
// Use g_scratchpad for server data populated by a Display Business Rule.
// Never call GlideAjax on onLoad unless the data cannot be known at render time.
function onLoad() {
    // Check g_scratchpad (populated by a Display Business Rule)
    if (g_scratchpad.isManager) {
        g_form.setReadOnly('sensitive_field', false);
    } else {
        g_form.setReadOnly('sensitive_field', true);
    }
}
