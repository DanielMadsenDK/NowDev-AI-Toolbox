# Troubleshooting

## Common Issues

| Issue | Solution |
|-------|----------|
| **Duplicates on install** | Fix field mappings; use correct fields per `link_type`; use parent constant refs (`menu.$id` not `Now.ID[...]`) |
| **Type errors** | Run `now-sdk dependencies`; check tsconfig references to `@types/servicenow` |
| **`referenceTable` required error** | `referenceTable` is **required** for `ReferenceColumn` and `ListColumn` — always provide it |
| **Module not in navigator** | Verify `active: true`, correct `application` ref, proper `link_type`/`name`/`query` |
| **Scripts not working** | Check `Now.include()` paths (relative to `.now.ts`); don't mix Fluent TypeScript with ServiceNow JS validation |
| **Import errors** | Use `.js` extension for TS module imports; verify exports are named properly |
| **`#now:` alias not found** | Add `"imports": { "#now:*": "./@types/servicenow/fluent/*/index.js" }` to `package.json`; run `now-sdk dependencies` |
| **Build warnings** | Review `src/fluent/generated/keys.ts`; check for missing `$id` values |

---

## GlideAjax: "HTTP Processor class not found"

This error means one or more of the required steps is missing. Check all four:

1. **Server JS** must use `Object.extendsObject(global.AbstractAjaxProcessor, { ... })`
2. **Client** must use the FULL scoped API name: `new GlideAjax('x_scope.ClassName')`
3. **Fluent `.now.ts`** must have ALL required flags: `callerAccess: 'tracking'`, `clientCallable: true`, `mobileCallable: true`, `sandboxCallable: true`, `accessibleFrom: 'public'`, `active: true`
4. **Script Include must be deployed**: check System Definition → Script Includes in the instance

---

## Instance Verification

- Check `sys_app_module.list` filtered by application for duplicates
- Test LIST/NEW/DIRECT navigator links
- Verify React UI page loads and CRUD operations work
- Test Service Portal widgets in Widget Editor
- For GlideAjax: System Definition → Script Includes → verify "Client callable" is checked and script content matches local file
