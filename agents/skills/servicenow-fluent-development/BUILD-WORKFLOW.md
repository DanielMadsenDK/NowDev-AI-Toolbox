# Build Workflow & Type Setup

## now-sdk Commands

```bash
now-sdk init                           # Scaffold a new project (one-time)
now-sdk auth --add <url> --type basic  # Add instance credentials
now-sdk dependencies --auth <alias>    # Download types to @types/servicenow/
now-sdk build                          # Compile to dist/app/
now-sdk install --auth <alias>         # Deploy (--reinstall removes non-package metadata)
now-sdk transform --from .             # Convert XML metadata to fluent source
now-sdk download --auth <alias>        # Download records or update sets from instance
now-sdk clean                          # Remove build output and cached artifacts
now-sdk pack                           # Package app into update set XML
```

Use `--auth <alias>` only when multiple auth aliases are configured; otherwise omit it.

`src/fluent/generated/keys.ts` tracks `$id` values for update vs create detection.

### CLI Reference

| Command | Purpose |
|---------|---------|
| `init` | Scaffold a new project. Flags: `--appName`, `--packageName`, `--scopeName`, `--template`, `--from`. |
| `auth` | Authenticate. `--add <url> --type basic\|oauth` to add, `--list` to check, `--use <alias>` to set default. |
| `build` | Compile fluent source files. Validates syntax and reports errors. |
| `install` | Push built artifacts to the instance. Requires prior `auth`. |
| `transform` | Convert XML metadata files into fluent `.now.ts` source files. |
| `download` | Download specific records or update sets from an instance. |
| `dependencies` | Fetch TypeScript type definitions for platform APIs. |
| `clean` | Remove build output and cached artifacts. |
| `pack` | Package the app into an update set XML. |

---

## Development Workflow

1. **`init`** — Scaffold the project (one-time).
2. **`npm install`** — Install SDK and dependencies (one-time).
3. **`auth`** — Authenticate against your instance (or verify existing auth with `--list`).
4. **Write fluent** — Create `.now.ts` files under `src/fluent/`. Write server scripts in `src/server/`.
5. **`build`** — Compile and validate fluent definitions.
6. **`install`** — Install compiled artifacts on the instance.
7. **Iterate** — Repeat steps 4–6.

For brownfield projects, use `transform` to pull instance artifacts into fluent source first.

---

## Project Initialization (init)

### Non-Interactive (Recommended for Agents)

```bash
npx @servicenow/sdk init \
  --appName "My App" \
  --packageName "my-app" \
  --scopeName "x_my_app" \
  --template "base"
```

> **Important:** Scope name must be formatted as `x_<company_code>_<app_name>` (without maint access). The company code is found under sys_property `glide.appcreator.company.code`.

> `init` creates files in the current working directory. It does not create a subdirectory.

After scaffolding:

```bash
npm install
```

### Interactive

```bash
npx @servicenow/sdk init
```

Prompts for app scope, name, and target instance. Run `npm install` after completion.

### Project Structure

```
src/
  fluent/
    index.now.ts           # Main fluent entry point
    example.now.ts         # Example fluent definition
    tsconfig.json          # Fluent TypeScript config
  server/
    script.ts              # Example server-side script
    tsconfig.json          # Server TypeScript config
now.config.json            # App metadata: scope, scopeId, name
package.json
```

Organize artifacts by type using kebab-case naming:

```
src/fluent/
  business-rules/
    my-rule.now.ts
  client-scripts/
    my-script.now.ts
```

---

## Authentication (auth)

### Check Existing Credentials

```bash
npx now-sdk auth --list
```

### Add Credentials (Interactive)

```bash
npx now-sdk auth --add <instance-url> --type <basic|oauth>
```

- **`basic`**: Username and password. Suitable for local development and PDIs.
- **`oauth`**: OAuth-based. Suitable for enterprise instances.

Prompts for alias, username, and password. Credentials stored in `.now-sdk/` (gitignored).

### Set Default

```bash
npx now-sdk auth --use <alias>
```

### Non-Interactive (CI/CD)

```bash
export SN_SDK_INSTANCE_URL=https://myinstance.service-now.com
export SN_SDK_USER=admin
export SN_SDK_USER_PWD=password
```

Environment variables take precedence over stored credentials.

---

## Converting Existing Applications

### From an Instance

Convert a scoped application already installed on an instance:

```bash
npx @servicenow/sdk init --from <sys_id_of_application>
```

Use `--auth <alias>` to specify which instance credentials to use. Without it, the default alias is used. Run `npm install` after.

### From an Existing Repository

If the app already has a git repo with XML metadata:

```bash
npx @servicenow/sdk init --from <path_to_repo>
```

Existing metadata XML and supporting files are placed inside the `metadata` folder, and fluent configuration files are added alongside them.

### Converting XML to Fluent (transform)

After initializing from an instance or repo, metadata will be in `metadata/` in XML form. Use `transform` to convert to fluent code:

```bash
# Transform a single file
npx @servicenow/sdk transform --from metadata/update/sys_script_<sys_id>.xml

# Transform the whole app at once
npx @servicenow/sdk transform --from .

# Transform a specific directory
npx @servicenow/sdk transform --from metadata/update
```

Transformed files are scaffolded into the generated directory (configurable in `now.config.json`) and removed from `metadata` upon successful conversion.

> **Note:** Records that exist as both a fluent entity (`.now.ts` file) and an XML file in `metadata` will use the XML version on `build`. Remove converted XML files to avoid conflicts.

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
