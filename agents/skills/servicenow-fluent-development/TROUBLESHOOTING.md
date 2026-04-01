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
   - In custom app scopes, `AbstractAjaxProcessor` without the `global.` prefix **does not resolve** — the `global.` prefix is mandatory. In the global scope, either form works, but always use `global.AbstractAjaxProcessor` for portability.
2. **Client** must use the FULL scoped API name: `new GlideAjax('x_scope.ClassName')`
3. **Fluent `.now.ts`** must have ALL required flags: `callerAccess: 'tracking'`, `clientCallable: true`, `mobileCallable: true`, `sandboxCallable: true`, `accessibleFrom: 'public'`, `active: true`
4. **Script Include must be deployed**: check System Definition → Script Includes in the instance

---

## React Build: TS2689 "Cannot extend an interface" / conflicting @types errors

If `now-sdk build` fails with errors like `TS2689: Cannot extend an interface 'Electron.Event'` or similar errors from packages you didn't install, the cause is a **missing `tsconfig.json` in `src/client/`**.

Without a `tsconfig.json`, the TypeScript compiler uses default options and picks up **every** `@types/*` package installed in `node_modules` — including packages like `@types/electron` that conflict with DOM types. This produces hard build failures.

**Fix:** Create `src/client/tsconfig.json` with an explicit `types` array and `exclude` for `node_modules`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "types": ["react", "react-dom"]
  },
  "include": ["./**/*.ts", "./**/*.tsx"],
  "exclude": ["node_modules"]
}
```

The key parts are:
- `"types": ["react", "react-dom"]` — explicitly limits which `@types/*` packages are included
- `"exclude": ["node_modules"]` — prevents the compiler from crawling `node_modules` for ambient declarations

> **Note:** `now-sdk` may warn "No tsconfig.json found in src/client directory" — this warning means the build will proceed with default options, which **can cause hard failures** when conflicting `@types/*` packages are present.

---

## Instance Verification

- Check `sys_app_module.list` filtered by application for duplicates
- Test LIST/NEW/DIRECT navigator links
- Verify React UI page loads and CRUD operations work
- Test Service Portal widgets in Widget Editor
- For GlideAjax: System Definition → Script Includes → verify "Client callable" is checked and script content matches local file
