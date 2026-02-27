# Build Workflow & Type Setup

## now-sdk Commands

```bash
now-sdk transform --auth <alias>     # Sync remote metadata locally (before editing)
now-sdk dependencies --auth <alias>  # Download types to @types/servicenow/
now-sdk build                        # Compile to dist/app/
now-sdk install --auth <alias>       # Deploy (--reinstall removes non-package metadata)
```

Use `--auth <alias>` only when multiple auth aliases are configured; otherwise omit it.

`src/fluent/generated/keys.ts` tracks `$id` values for update vs create detection.

---

## now-sdk dependencies

Run when: project first initialized, `now.config.json` dependencies change, new tables/scopes added, or type-ahead is missing.

**What it downloads to `@types/servicenow/`:**

| File | Content |
|------|---------|
| `glide.server.d.ts` | GlideRecord, GlideAggregate, gs, GlideDateTime, etc. |
| `glide.client.d.ts` | g_form, g_user, g_list, g_navigation, GlideAjax, etc. |
| `script-includes.server.d.ts` | Custom script include types from instance |
| `schema/*.d.now.ts` | Full table schemas with columns, types, choices, references |
| `fluent/*/index.js` | Fluent type imports for roles, tables, etc. from other scopes |

**Schema files are critical** — they supply exact column names, types, choices, reference targets, and inheritance. Always consult them when extending tables or creating `ReferenceColumn` fields.

**Missing a schema?** Add the table to `now.config.json` → `dependencies.applications.<scope>.tables`, then re-run `now-sdk dependencies`.

### now.config.json — Configure Dependencies

```json
{
  "dependencies": {
    "applications": {
      "global": {
        "tables": ["cmdb_ci_server", "sys_user"],
        "roles": ["admin", "itil"]
      },
      "sn_ace": { "tables": ["sn_ace_app_config"] }
    }
  },
  "trustedModules": ["@mycompany/*"]  // opt-in npm packages for Glide code execution
}
```

**`trustedModules`:** Explicitly marks third-party npm packages as trusted to run in the Glide runtime. This enables a standard Node.js dependency model for shared server modules.
- Supports exact package names (`"my-package"`) or organisation wildcards (`"@mycompany/*"`)
- Only wildcard support is at the org prefix level — arbitrary glob patterns are not supported
- ⚠️ Only add packages you fully trust to execute Glide/ServiceNow code

### `#now:` Import Alias

Add to `package.json` to enable instance constant imports:

```json
{
  "imports": {
    "#now:*": "./@types/servicenow/fluent/*/index.js"
  }
}
```

Usage:

```ts
import { role as globalRole } from '#now:global/security'

Acl({
  $id: Now.ID['my_acl'], type: 'record', table: 'incident', operation: 'read',
  roles: [globalRole.admin, globalRole.itil]
})
```

---

## tsconfig Setup

```json
// src/fluent/tsconfig.json — project references
{ "files": [], "references": [{ "path": "./tsconfig.server.json" }, { "path": "./tsconfig.client.json" }] }

// tsconfig.server.json — for .server.js files
{
  "compilerOptions": {
    "lib": ["ES2021"], "noEmit": true, "allowJs": true, "checkJs": false,
    "noEmitHelpers": true, "esModuleInterop": false, "module": "None", "types": []
  },
  "include": ["./**/*.server.js", "../../@types/servicenow/*.server.d.ts"]
}

// tsconfig.client.json — for .client.js files
{
  "compilerOptions": {
    "target": "ES6", "lib": ["DOM", "ES6"], "allowJs": true, "checkJs": false,
    "noEmit": true, "noEmitHelpers": true, "esModuleInterop": false, "module": "None", "types": []
  },
  "include": ["./**/*.client.js", "../../@types/servicenow/*.client.d.ts"]
}
```

- Set `checkJs: true` in `tsconfig.server.json` for richer diagnostics (ES6-style classes work best).
- Use `.server.js` / `.client.js` file extensions for proper type-ahead.

---

## Rich GlideRecord Types in Server Modules

For full generic `GlideRecord<'tablename'>` support in `src/server/` TypeScript modules:

1. Add `"@servicenow/glide"` to `package.json` dependencies (check the current SDK release notes for the matching version)
2. Run `now-sdk dependencies`
3. Add to `src/server/tsconfig.json`:
   ```json
   { "include": ["../../@types/**/*.modules.d.ts"] }
   ```

---

## Build Behaviour

### TypeScript Type Checking for UI Builds

`now-sdk build` performs TypeScript diagnostic validation on `.ts` and `.tsx` files.

- Type errors in client-side code now **fail the build** (previously they were warnings)
- Fix all TypeScript errors in `src/client/**` before running `now-sdk install`
- This does not affect server-side `.server.js` files (those opt in via `checkJs: true` in tsconfig)

### Credential Storage

`keytar` has been replaced with `@napi-rs/keyring` for credential storage.

- Existing stored credentials are **not migrated** — you will need to re-authenticate after upgrading
- Run `now-sdk auth` or the equivalent login command after upgrading
- Windows users are most likely to encounter this due to storage format differences

---

## Verification Checklist

- [ ] Field names match table schema exactly
- [ ] Parent references use `constant.$id` / `constant.name` (not `Now.ID[...]`)
- [ ] LIST/NEW modules have `name` field; DIRECT modules have `query` field
- [ ] All required fields present per `link_type`
- [ ] `$id` values unique and tracked in `keys.ts`
- [ ] Script content NOT validated by TypeScript (ServiceNow JS conventions apply)
