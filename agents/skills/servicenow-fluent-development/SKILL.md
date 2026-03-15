---
name: servicenow-fluent-development
user-invokable: false
description: Expert knowledge for authoring ServiceNow Fluent (.now.ts) metadata and TypeScript/JavaScript modules using the ServiceNow SDK. Use this skill when developing full-stack React applications, creating tables, business rules, script includes, or other ServiceNow metadata using the Fluent API.
---

# ServiceNow Fluent Development

Expert knowledge for authoring **ServiceNow Fluent (.now.ts)** metadata and TypeScript/JavaScript modules using the ServiceNow SDK.

## Key Differences from Legacy ServiceNow

- Fluent = TypeScript DSL for metadata (`.now.ts` files)
- Use `now-sdk` for build/sync/install
- Type definitions in `@types/servicenow` via `now-sdk dependencies`
- `Now.include()` references external scripts; SDK objects from `@servicenow/sdk/core`
- Full-stack React apps via `UiPage` with client code in `src/client/`
- Flow/workflow automation available via `@servicenow/sdk/automation`
- Service Catalog, Email Notifications, Workspaces, and SLAs all supported as Fluent metadata

## Core Principles

1. **Verify APIs** — use Context7 to confirm method signatures; never assume
2. **Match field names exactly** to `@types/servicenow/schema/` (prevents duplicates on install)
3. **Use parent constant properties** (`parent.$id`, `table.name`) — never `Now.ID[...]` for references
4. **Script content is not TypeScript** — ServiceNow JavaScript follows its own conventions; do not apply TypeScript validation to it

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

```ts
// TypeScript module import (server-side) — compiled to .js
import { fn } from '../server/module.js'
BusinessRule({ script: fn })

// Now.include() for ServiceNow JavaScript — enables two-way sync
ClientScript({ script: Now.include('./script.client.js') })

// Inline ServiceNow JavaScript (NOT TypeScript)
ClientScript({ script: `function onLoad() { g_form.addInfoMessage('Hi'); }` })

// script tagged template literal
RestApi({ routes: [{ script: script`(function(req,res){ res.setBody({ok:true}) })(request,response)` }] })
```

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

**Third-party npm libraries** (component kits, icons, charts, etc.) are supported — install via npm, import normally in client code, and Rollup bundles them automatically. See [references/THIRD-PARTY-LIBRARIES.md](references/THIRD-PARTY-LIBRARIES.md) for the full setup guide including CSS imports, context providers, and build-warning suppression.

## GlideAjax vs REST API — Decision Guide

| Requirement | GlideAjax | REST API |
|------------|-----------|----------|
| Internal ServiceNow app only | **Recommended** | Overkill |
| External system integration | Cannot | **Required** |
| Mobile app / non-React client | Cannot | **Required** |
| Simpler setup | Less code | More boilerplate |
| ServiceNow native security | Built-in | Manual |
| OpenAPI documentation | Limited | Supported |

**Default:** Use **GlideAjax** for internal ServiceNow apps. See [references/CLIENT-SERVER-PATTERNS.md](references/CLIENT-SERVER-PATTERNS.md) for full implementation examples.

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

For code examples covering tables, business rules, REST APIs, ACLs, UI actions, and service catalog items, see [EXAMPLES.md](references/EXAMPLES.md)

## Reference Navigation

The following reference files contain detailed guidance on specific topics. **Scroll this section to find what you need:**

| When You Need... | Read This |
|---|---|
| Full GlideAjax & REST code, React patterns, navigation | [CLIENT-SERVER-PATTERNS.md](references/CLIENT-SERVER-PATTERNS.md) |
| Fluent API object reference (Table, BusinessRule, etc.) | [API-REFERENCE.md](references/API-REFERENCE.md) |
| Build commands, tsconfig, now-sdk workflows | [BUILD-WORKFLOW.md](references/BUILD-WORKFLOW.md) |
| Error diagnosis, troubleshooting steps, verification | [TROUBLESHOOTING.md](references/TROUBLESHOOTING.md) |
| Advanced topics: Record() patterns, logging, GlideRecord | [ADVANCED-PATTERNS.md](references/ADVANCED-PATTERNS.md) |
| Flow API: triggers, actions, data pills | [FLOW-API.md](references/FLOW-API.md) |
| Service Catalog: CatalogItem, variables, policies | [SERVICE-CATALOG.md](references/SERVICE-CATALOG.md) |
| Adding npm packages: CSS, context, TypeScript, build | [THIRD-PARTY-LIBRARIES.md](references/THIRD-PARTY-LIBRARIES.md) |

## Detailed References

Load these files when you need detailed guidance on specific topics:

- **[references/CLIENT-SERVER-PATTERNS.md](references/CLIENT-SERVER-PATTERNS.md)** — Full GlideAjax and REST implementation code, React entry patterns, navigation module
- **[references/API-REFERENCE.md](references/API-REFERENCE.md)** — All Fluent API objects: Table, BusinessRule, ClientScript, ScriptInclude, RestApi, UiPage, SPWidget, ATF Test, UiPolicy, ImportSet, EmailNotification, Workspace, Sla, helpers; **ApplicationMenu + sys_app_module** navigation modules with full link-type field matrix and examples
- **[references/BUILD-WORKFLOW.md](references/BUILD-WORKFLOW.md)** — now-sdk commands, `now-sdk dependencies`, tsconfig setup, `#now:` import alias, `trustedModules`, build behaviour, verification checklist
- **[references/TROUBLESHOOTING.md](references/TROUBLESHOOTING.md)** — Common issues, GlideAjax error diagnosis, instance verification steps
- **[references/ADVANCED-PATTERNS.md](references/ADVANCED-PATTERNS.md)** — Record() usage, cross-scope module pattern, server-side logging, common ServiceNow script APIs (GlideRecord, g_form, gs, GlideAggregate)
- **[references/FLOW-API.md](references/FLOW-API.md)** — Flow API: triggers, actions, flow logic, data pills
- **[references/SERVICE-CATALOG.md](references/SERVICE-CATALOG.md)** — Service Catalog: CatalogItem, VariableSet, variable types, CatalogUIPolicy, CatalogClientScript, CatalogItemRecordProducer
- **[references/THIRD-PARTY-LIBRARIES.md](references/THIRD-PARTY-LIBRARIES.md)** — Adding npm packages to Fluent React apps: `package.json` layout, Rollup prebuild script, CSS imports, context providers, TypeScript declarations, build-warning suppression, and a full checklist
