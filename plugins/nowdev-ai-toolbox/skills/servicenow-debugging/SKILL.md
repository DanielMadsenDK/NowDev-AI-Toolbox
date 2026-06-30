---
name: servicenow-debugging
context: fork
user-invocable: false
description: Diagnostic patterns for debugging ServiceNow client-side issues using Playwright browser automation — field state inspection, GlideAjax timing, hidden field detection, and console error monitoring. Use when the Debugger agent needs to investigate form behavior, client script execution, UI policy visibility, or browser-side performance issues using the runPlaywrightCode tool.
last_verified: "2026-06-13"
---

# ServiceNow Client-Side Debugging — Playwright Patterns

Diagnostic code patterns for use with the `browser/runPlaywrightCode` tool when investigating client-side issues.

For broader debugging workflow, logging, server/client triage, performance checks, and developer handoff format, see [BEST_PRACTICES.md](./BEST_PRACTICES.md).

## Diagnose Field Not Updating (onChange Not Firing)

Problem: User changes one field, a dependent field should update via onChange client script, but doesn't.

```javascript
const formData = await page.evaluate(() => ({
  categoryValue: g_form.getValue('u_category'),
  categoryName: g_form.getDisplayValue('u_category'),
  priorityValue: g_form.getValue('u_priority'),
  isReadonly: g_form.isReadOnly('u_priority'),
  isVisible: !g_form.getControl('u_priority').classList.contains('hidden')
}));
console.log('Form State:', JSON.stringify(formData, null, 2));
const consoleErrors = await page.evaluate(() => {
  return window.__consoleErrors || [];
});
```

Report: "Priority field shows category='Software' but priority is still empty. Priority field visible=true, readonly=false. Check that onChange client script is registered and triggers on category changes."

---

## Diagnose Slow GlideAjax Calls

Problem: Form is slow to respond when changing a lookup field — find which GlideAjax call is the bottleneck.

```javascript
const metrics = await page.evaluate(() => {
  const resources = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('glideajax'))
    .map(r => ({
      url: new URL(r.name).search,
      duration: Math.round(r.duration),
      time: new Date(r.startTime).toLocaleTimeString()
    }));
  return resources;
});
console.log('GlideAjax Calls:', JSON.stringify(metrics, null, 2));
const slowCalls = metrics.filter(m => m.duration > 1000);
```

Report: "GlideAjax call to fetch assigned_to records took 2340ms. Recommend adding debounce to onChange handler or optimizing Script Include query."

---

## Diagnose Hidden Field Issues

Problem: A required field appears missing — inspect DOM visibility and CSS state.

```javascript
const fieldInspection = await page.evaluate(() => {
  const field = document.querySelector('[name="u_critical_field"]');
  if (!field) return { exists: false };

  const styles = window.getComputedStyle(field);
  const parent = document.querySelector('[data-fieldname="u_critical_field"]');

  return {
    exists: true,
    visible: styles.display !== 'none' && styles.visibility !== 'hidden',
    parentVisible: parent ? window.getComputedStyle(parent).display !== 'none' : null,
    display: styles.display,
    visibility: styles.visibility,
    readonly: field.readOnly,
    required: field.hasAttribute('aria-required')
  };
});
console.log('Field State:', JSON.stringify(fieldInspection, null, 2));
```

Report: "u_critical_field exists in DOM but display:none. Check UI Policy or Client Script that may be hiding it — verify business rule conditions."

---

## Monitor Browser Console During Interaction

Problem: Form produces JavaScript errors that block client script execution.

```javascript
let consoleMessages = [];
page.on('console', msg => consoleMessages.push({
  type: msg.type(),
  text: msg.text(),
  location: msg.location()
}));

await page.click('[name="category"]');
await page.waitForTimeout(1000);

const errors = consoleMessages.filter(m => m.type === 'error');
console.log('JavaScript Errors:', JSON.stringify(errors, null, 2));
```

Report with exact error messages and line numbers for the development agent to fix.
