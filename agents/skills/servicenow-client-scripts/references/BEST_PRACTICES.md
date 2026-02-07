# Best Practices — Client Scripts

## Purpose
Practical, implementation-focused guidance for browser‑side ServiceNow client scripts (OnLoad, OnChange, OnSubmit, UI Policies, Catalog Client Scripts). Content aligns with official ServiceNow APIs: `g_form`, `GlideAjax`, `g_scratchpad`, and workspace compatibility considerations.

## Principles
- Keep client logic focused on UI/UX and validation — do not perform data-intensive or authoritative operations in the browser.
- Favor async communication with the server; never block the browser UI.
- Use platform APIs (`g_form`, `g_scratchpad`, `GlideAjax`) rather than direct DOM access or third‑party libraries that may break in the Next Experience.

## GlideAjax (Server Calls)

Best practices:
- Always use asynchronous methods (`getXMLAnswer`, `getXML`) — never `getXMLWait`.
- Debounce user-triggered calls (typing/rapid changes) to avoid excessive requests.
- Use parameter names and only send minimal data required for the server operation.
- Check `isLoading` in handlers to avoid duplicate behavior.

Example (async GlideAjax):
```javascript
function fetchRelatedValue() {
	if (g_form.isLoading() || !g_form.getValue('source_field')) return;

	var ga = new GlideAjax('MyScriptInclude');
	ga.addParam('sysparm_name', 'getValue');
	ga.addParam('sysparm_sys_id', g_form.getValue('source_field'));
	ga.getXMLAnswer(function(answer) {
		if (answer) g_form.setValue('target_field', answer);
	});
}
```

Server-side Script Include guidance:
- Use PascalCase for Script Include names and expose only whitelisted methods invoked by `sysparm_name`.
- Validate inputs on server side and enforce ACLs — client-side checks are for UX only.

## `g_form` API Usage

Best practices:
- Use `g_form` methods (setValue/getValue/setMandatory/setReadOnly/setVisible) — avoid direct DOM manipulation.
- When setting reference fields, use the 3-arg form to include display value: `g_form.setValue('ref', id, display)`.
- Always check `g_form.isNewRecord()` and `g_form.isLoading()` within lifecycle handlers to prevent unintended runs.

Examples:
```javascript
// Set reference with display
g_form.setValue('caller_id', '46d44a1b0a0a0a0a0a0a0a0a', 'Jane Doe');

// Prevent OnChange work during load
function onChange(control, oldValue, newValue, isLoading) {
	if (isLoading) return;
	// ...
}
```

## Use `g_scratchpad` for server → client data

- Populate `g_scratchpad` in a Display Business Rule to pass small, precomputed values to client scripts without additional Ajax calls.
- Keep `g_scratchpad` lightweight; it's delivered with the form payload.

Server Display BR example:
```javascript
// Display BR
g_scratchpad.vip = (current.annual_revenue > 1000000);
```

Client OnLoad consume:
```javascript
function onLoad() {
	if (g_scratchpad.vip) g_form.setLabel('priority', 'VIP Priority');
}
```

## UI Policies vs Client Scripts

- Prefer UI Policies for simple visibility/mandatory/read-only logic configured in the platform UI — they are easier to maintain and are executed consistently.
- Use Client Scripts for complex conditional logic, cross-field computation, or interactions not supported by UI Policies.

## Performance and Throttling

- Debounce rapid events (typing). Use a short timeout (300–800ms) before firing expensive operations.
- Cache results when possible (per form lifetime) to avoid repeated server calls.
- Avoid large synchronous operations on OnLoad; prefer deferred init via setTimeout or background GlideAjax calls.

Debounce example:
```javascript
var _debounceTimer;
function onChange_description() {
	clearTimeout(_debounceTimer);
	_debounceTimer = setTimeout(function() {
		// expensive call
	}, 500);
}
```

## Security and Input Validation

- Never trust client input; validate and sanitize on the server. Use server-side Script Includes to enforce data constraints and ACLs.
- Do not embed API keys, credentials, or secrets in client scripts.

## Avoid Forbidden/Deprecated Patterns

- Do not use `GlideRecord` on client side — it does not exist in browser context.
- Never use `getXMLWait()` or synchronous XHR; they block the UI and are disallowed.
- Avoid `document`/`jQuery` DOM access — Next Experience and mobile clients may not support it.

## Workspace / Next Experience Considerations

- Test client scripts in the target UI experience (classic vs workspace) — some methods and DOM assumptions differ.
- Prefer platform APIs which are supported across experiences (`g_form`, `g_scratchpad`, `GlideAjax`).

## Catalog Client Scripts and Variable Sets

- Use `g_form.getValue()` and `g_form.setValue()` for catalog variables; catalog client scripts run in a slightly different context (variable name vs field name).
- Keep heavy integrations to server side; catalog forms should remain responsive.

## Debugging and Testing

- Use `console.log()` in browser console for quick debugging of client scripts; use `gs.log()` only on server side.
- Test with different form layouts, view roles, and mobile clients.
- Write small, focused unit tests where possible (automated Selenium/Playwright tests for UI flows).

## Naming & Organization

- Name client scripts with the table and purpose: `incident.onChange_assignment_group` or `catalog_item.onLoad_setDefaults`.
- Document `sys_script_client` records with a short description and `glide.ui.type` restrictions if needed.

## Example Patterns

OnSubmit validation pattern:
```javascript
function onSubmit() {
	if (!g_form.getValue('assignment_group')) {
		g_form.addErrorMessage('Assignment Group is required');
		return false;
	}
	return true;
}
```

GlideAjax server call with input validation (server-side):
```javascript
// Client: send minimal data
var ga = new GlideAjax('MySecureSI');
ga.addParam('sysparm_name', 'lookupEmail');
ga.addParam('sysparm_user_id', g_form.getValue('assigned_to'));
ga.getXMLAnswer(function(answer) { g_form.setValue('assigned_email', answer); });

// Server (MySecureSI): validate sysparm_user_id and enforce read ACLs
```

---
End of file.
