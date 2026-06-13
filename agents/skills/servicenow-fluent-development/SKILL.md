---
name: servicenow-fluent-development
context: fork
user-invocable: false
description: Expert knowledge for authoring ServiceNow Fluent (.now.ts) metadata and TypeScript/JavaScript modules using the ServiceNow SDK 4.7.0. Use when developing Fluent apps, .now.ts metadata, now-sdk workflows, tables and augments, records, assignment rules, data policies, business rules, ACLs, script includes, flows and subflows, service catalog, service portal, UI pages, dashboards, workspaces, email notifications, scheduled scripts, instance scan checks, now.config.json, $override, JavaScript modules, Now.ID, Now.ref, Now.include, Now.attach, and other Fluent API artifacts.
last_verified: "2026-05-31"
---

# ServiceNow Fluent Development

Expert knowledge for authoring **ServiceNow Fluent (.now.ts)** metadata and TypeScript/JavaScript modules using the ServiceNow SDK.

## Key Differences from Legacy ServiceNow

- Fluent = TypeScript DSL for metadata (`.now.ts` files)
- Use `now-sdk` for build/sync/install
- Type definitions in `@types/servicenow` via `now-sdk dependencies`
- **Fluent Language Constructs:** `Now.ID` (define IDs), `Now.ref` (reference external metadata), `Now.include` (external file content), `Now.attach` (image files) — use `now-sdk explain now-ref-guide`, `now-sdk explain now-include-guide`, `now-sdk explain now-attach-guide`
- Full-stack React apps via `UiPage` with client code in `src/client/`
- Flow/workflow automation available via `@servicenow/sdk/automation`
- Service Catalog, Email Notifications, Workspaces, Service Portal, Assignment Rules, Data Policies, and SLAs all supported as Fluent metadata

## Primary Documentation Source

**Always use `now-sdk explain` first** for any Fluent SDK question — it is local, offline, and always in sync with the installed SDK version:

```
now-sdk explain <topic> --format raw    # Full documentation
now-sdk explain --list <keyword>        # Discover topics by keyword
now-sdk explain <topic> --peek          # One-line summary
```

The docs in this skill are **supplementary fallback content** for opinionated patterns, examples, and best practices that go beyond the official SDK docs. For API signatures and parameter definitions, `now-sdk explain` is authoritative.

## Core Principles

1. **Verify APIs** — use `now-sdk explain <topic> --format raw`; never assume
2. **Match field names exactly** to `@types/servicenow/schema/` (prevents duplicates on install)
3. **Fluent Language Constructs:**
   - **`Now.ID`** — Define metadata IDs in source code (e.g., `$id: Now.ID['my_rule']`)
   - **`Now.ref`** — Reference metadata in OTHER applications not in your source code
   - **`Now.include`** — Link to external script/HTML files with two-way sync (e.g., `script: Now.include('./file.js')`)
   - **`Now.attach`** — Attach image files to image fields with two-way sync
4. **Use parent constant properties for references** — `parent.$id`, `table.name` — never `Now.ID[...]` to reference your own metadata
5. **Script content is not TypeScript** — ServiceNow JavaScript follows its own conventions; do not apply TypeScript validation to it

## Critical Patterns

### Parent-Child References

```ts
// CORRECT
export const menu = ApplicationMenu({ $id: Now.ID['menu'], title: 'App' })
export const module = Record({ table: 'sys_app_module', data: { application: menu.$id } })

export const table = Table({ name: 'x_app_table', schema: {...} })
export const rule = BusinessRule({ table: table.name })

// WRONG — creates a new ID reference instead of pointing to the constant
data: { application: Now.ID['menu'] }
```

### sys_app_module Field Rules

| Link Type | Required Fields | Notes |
|-----------|----------------|-------|
| **ALL** | `title`, `application`, `active`, `link_type`, `order`, `hint` | Base fields |
| **LIST / NEW** | + `name` (= target table name) | `name: 'x_app_mytable'` |
| **DIRECT** | + `query` (= UI page endpoint) | `query: 'x_app_page.do'`, no `name` |

### Script Patterns

JavaScript modules are the **preferred approach** for server-side scripts. Modules provide typed Glide API access via `import { gs, GlideRecord } from '@servicenow/glide'`, code reuse, and full IDE support. Not all APIs support modules — some `script` properties only accept strings.

**APIs that accept functions (use modules):**

| API | Module-compatible properties |
|-----|-----------------------------|
| BusinessRule | `script` |
| ScriptAction | `script` |
| UiAction | `script` |
| RestApi route handlers | `script` |
| CatalogItemRecordProducer | `script`, `postInsertScript` |
| ScheduledScript | `script` |

**APIs that require `Now.include()` or inline strings (string-only):**

| API | String-only properties |
|-----|------------------------|
| ScriptInclude | `script` |
| ClientScript | `script` |
| CatalogClientScript | `script` |
| CatalogUiPolicy | script fields |
| UiPolicy | script fields |
| SPWidget | all script fields |
| Record | data values |

```ts
// PREFERRED: TypeScript module import (server-side) — typed Glide APIs
import { fn } from '../server/module.ts'
BusinessRule({ script: fn })

// Now.include() for string-only APIs — enables two-way sync
ClientScript({ script: Now.include('./script.client.js') })
ScriptInclude({ script: Now.include('./my-include.js') })

// Inline ServiceNow JavaScript (NOT TypeScript)
ClientScript({ script: `function onLoad() { g_form.addInfoMessage('Hi'); }` })

// script tagged template literal
RestApi({ routes: [{ script: script`(function(req,res){ res.setBody({ok:true}) })(request,response)` }] })
```

See [MODULE-GUIDE.md](./MODULE-GUIDE.md) for the complete module pattern reference.

**Sync directives:** `@fluent-ignore`, `@fluent-disable-sync`, `@fluent-disable-sync-for-file` — use sparingly with a comment explaining why.

## Full-Stack React Architecture

```
src/fluent/ui-pages/page.now.ts         → UiPage({ html: htmlEntry, endpoint: 'x_app.do' })
src/fluent/script-includes/*.now.ts     → ScriptInclude with clientCallable: true
src/fluent/script-includes/*.server.js  → Class.create() with client-callable methods
src/client/index.html                   → <sdk:now-ux-globals>, <script src="./main.tsx" type="module">
src/client/main.tsx                     → ReactDOM.createRoot(root).render(<App />)
src/client/app.tsx                      → State, CRUD handlers, components
src/client/services/Service.ts          → GlideAjax or REST service layer
src/client/components/*.tsx             → UI components
src/client/global.d.ts                  → declare global { Window.g_ck, GlideAjax }
```

**Third-party npm libraries** (component kits, icons, charts, etc.) are supported — install via npm, import normally in client code, and Rollup bundles them automatically. See [THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md) for the full setup guide including CSS imports, context providers, and build-warning suppression.

> **UI Components:** When designing any React UI for ServiceNow, **always use the `servicenow-react-ui-components` skill**. It documents the `@servicenow/react-components` package — the official ServiceNow Horizon Design System React components — which includes form components (`RecordProvider`, `FormColumnLayout`, `FormActionBar`, `ActivityStream`, `Attachments`, `RelatedLists`), list components (`NowRecordListConnected`), and a full set of Horizon Design System components (buttons, modals, tabs, inputs, alerts, and more). Using these components guarantees visual consistency with the rest of ServiceNow. Install with `npm install @servicenow/react-components --save`.

## GlideAjax vs REST API — Decision Guide

| Requirement | GlideAjax | REST API |
|------------|-----------|----------|
| Internal ServiceNow app only | **Recommended** | Overkill |
| External system integration | Cannot | **Required** |
| Mobile app / non-React client | Cannot | **Required** |
| Simpler setup | Less code | More boilerplate |
| ServiceNow native security | Built-in | Manual |
| OpenAPI documentation | Limited | Supported |

**Default:** Use **GlideAjax** for internal ServiceNow apps. See [CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md) for full implementation examples.

## Development Workflow

1. Create Table in `src/fluent/tables/*.now.ts`
2. Create ScriptInclude in `src/fluent/script-includes/*.now.ts` (with `clientCallable: true` for GlideAjax)
3. Create UiPage in `src/fluent/ui-pages/*.now.ts`
4. Create `src/client/index.html` with `<sdk:now-ux-globals>`
5. Create `src/client/main.tsx` (React bootstrap) and `src/client/app.tsx` (state, handlers)
6. Create service layer in `src/client/services/*.ts` (GlideAjax or REST)
7. Create components in `src/client/components/*.tsx`
8. Add navigation module (`link_type: 'DIRECT'`)
9. Build & deploy: `now-sdk build && now-sdk install --auth <alias>`

## Best Practices

- **Naming:** `x_[vendor]_[app]_[name]` for tables, `snake_case` fields, `PascalCase` exported constants
- **Security:** Use roles not broad permissions; `gs.hasRole()` in script-based ACLs; validate all input
- **Performance:** Async business rules for non-blocking ops; index queried fields; cache expensive ops
- **Error handling:** `abortAction` for validation failures; `isValidRecord()` after `get()`; `gs.error()` for logging
- **Types:** Use `GlideRecord<'tablename'>` generics in server modules; run `now-sdk dependencies` for schema files

## Examples

For canonical code examples (tables, business rules, REST APIs, script includes, ATF tests), see [EXAMPLES.md](./EXAMPLES.md)

## Reference Navigation

For API signatures and parameters, use `now-sdk explain <topic> --format raw`. Use `now-sdk explain --list <keyword>` to discover topics.

**Local supplementary files (opinionated patterns not in SDK docs):**

| When You Need... | Read This |
|---|---|
| GlideAjax & REST client-server patterns, service layer, React navigation | [CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md) |
| JavaScript modules: import/export, Script Include bridging, function-vs-string API table | [MODULE-GUIDE.md](./MODULE-GUIDE.md) |
| npm packages in React (Rollup, CSS, context providers, TypeScript, build config) | [THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md) |
| $override: escape hatch for unmodeled metadata fields | [OVERRIDE-GUIDE.md](./OVERRIDE-GUIDE.md) |
| Platform views decision table, UI Formatters, Activity/Process Flow/Checklist | [platform-view-guide.md](./platform-view-guide.md) |
| Views, View Rules, List Controls, Relationships (sys_ui_view, sysrule_view, sys_ui_list_control) | [platform-view-lists-guide.md](./platform-view-lists-guide.md) |
| LDAP / External Services (ldap_server_config, failover, load balancing) | [external-services-guide.md](./external-services-guide.md) |
| Advanced patterns: Record() seed data, cross-scope modules, Now.UNRESOLVED, AI/LLM integration | [ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md) |
| Error diagnosis, troubleshooting steps | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
