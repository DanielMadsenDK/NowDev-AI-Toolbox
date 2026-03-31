---
name: servicenow-fluent-development
user-invocable: false
description: Expert knowledge for authoring ServiceNow Fluent (.now.ts) metadata and TypeScript/JavaScript modules using the ServiceNow SDK. Use this skill when developing full-stack React applications, creating tables (with all 43 column types), records, business rules, ACLs, cross-scope privileges, script includes, flows and subflows (with wfa, triggers, actions, FDTransform), SLAs, service catalog, service portal (ServicePortal, SPMenu, SPPage, SPTheme, SPWidget), UI pages, dashboards, workspaces, email notifications, form layouts, scheduled scripts, instance scan checks, or any other ServiceNow metadata using the Fluent API. Also covers Now.ID, Now.ref, Now.include, Now.attach, Now.UNRESOLVED, AnnotationType, default_view, and global helpers (Duration, Time, TemplateValue, FieldList).
---

# ServiceNow Fluent Development

Expert knowledge for authoring **ServiceNow Fluent (.now.ts)** metadata and TypeScript/JavaScript modules using the ServiceNow SDK.

## Key Differences from Legacy ServiceNow

- Fluent = TypeScript DSL for metadata (`.now.ts` files)
- Use `now-sdk` for build/sync/install
- Type definitions in `@types/servicenow` via `now-sdk dependencies`
- **Fluent Language Constructs:** `Now.ID` (define IDs), `Now.ref` (reference external metadata), `Now.include` (external file content), `Now.attach` (image files) — see [API-REFERENCE.md](./API-REFERENCE.md)
- Full-stack React apps via `UiPage` with client code in `src/client/`
- Flow/workflow automation available via `@servicenow/sdk/automation`
- Service Catalog, Email Notifications, Workspaces, and SLAs all supported as Fluent metadata

## Core Principles

1. **Verify APIs** — use Context7 to confirm method signatures; never assume
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

For code examples covering tables, business rules, REST APIs, ACLs, UI actions, and service catalog items, see [EXAMPLES.md](./EXAMPLES.md)

## Reference Navigation

The following reference files contain detailed guidance on specific topics. **Scroll this section to find what you need:**

| When You Need... | Read This |
|---|---|
| Full GlideAjax & REST code, React patterns, navigation | [CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md) |
| **Fluent Language Constructs** (`Now.ID`, `Now.ref`, `Now.include`, `Now.attach`) **→ Start here** | [API-REFERENCE.md](./API-REFERENCE.md) |
| Fluent API object reference (Table, BusinessRule, etc.) | [API-REFERENCE.md](./API-REFERENCE.md) |
| **Tables:** Table object, columns (all types), schema, label, licensing, auto-numbering, indexes, access control, dynamic values | [TABLE-API.md](./TABLE-API.md) |
| **REST APIs:** RestApi object, routes, parameters, headers, versioning, ACL enforcement, end-to-end examples | [REST-API.md](./REST-API.md) |
| **Lists:** List views (sys_ui_list), columns, views, column ordering, examples | [LIST-API.md](./LIST-API.md) |
| **Properties:** System properties (sys_properties), configuration, types, role access, cache control, examples | [PROPERTY-API.md](./PROPERTY-API.md) |
| **Import Sets:** Transform maps, staging tables, data sources, field mappings, transform scripts, examples | [IMPORT-SETS-API.md](./IMPORT-SETS-API.md) |
| **Email Notifications:** EmailNotification object, trigger conditions, recipients, digests, examples | [EMAIL-NOTIFICATION-API.md](./EMAIL-NOTIFICATION-API.md) |
| **Automated Test Framework (ATF):** Test object, test steps by category, examples | [ATF-API.md](./ATF-API.md) |
| **Dashboards:** Dashboard object, tabs, widgets, permissions, visibilities, dataSources, metrics, trendBy, examples | [DASHBOARD-API.md](./DASHBOARD-API.md) |
| **Workspaces:** Workspace object, UxListMenuConfig, categories, lists, Applicability, role-based access, navigation structure, examples | [WORKSPACE-API.md](./WORKSPACE-API.md) |
| **Roles:** Role object, properties, role hierarchies, delegation, elevated privileges, examples | [ROLE-API.md](./ROLE-API.md) |
| **Access Control Lists (ACLs):** roles, operations, properties, examples | [ACL-API.md](./ACL-API.md) |
| **Cross-Scope Privileges:** runtime access tracking, operations, target types, examples | [CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md) |
| **Script Actions:** ScriptAction object, event-triggered scripts, conditions, execution order, examples | [SCRIPT-ACTION-API.md](./SCRIPT-ACTION-API.md) |
| **Script Includes:** ScriptInclude object, properties, class-based and classless patterns, client-callable via GlideAjax, access control, examples | [SCRIPT-INCLUDE-API.md](./SCRIPT-INCLUDE-API.md) |
| **Application Menus & Navigation:** ApplicationMenu and sys_app_module for module navigation | [APPLICATION-MENU-API.md](./APPLICATION-MENU-API.md) |
| **SLAs:** Sla object, duration, schedule, conditions, retroactive start, whenTo, timezone, flow/workflow linkage, examples | [SLA-API.md](./SLA-API.md) |
| Build commands, tsconfig, now-sdk workflows | [BUILD-WORKFLOW.md](./BUILD-WORKFLOW.md) |
| Error diagnosis, troubleshooting steps, verification | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Advanced topics: Record() seed data, cross-scope pattern, server-side logging, GlideRecord, Now.UNRESOLVED, Now.ref(), AnnotationType, default_view, global helpers (Duration, Time, TemplateValue, FieldList) | [ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md) |
| Flow API: triggers, actions, data pills | [FLOW-API.md](./FLOW-API.md) |
| **Service Catalog:** CatalogItem, CatalogItemRecordProducer, VariableSet, all 22 variable types with full options, CatalogUiPolicy, CatalogClientScript | [SERVICE-CATALOG.md](./SERVICE-CATALOG.md) |
| **Service Portal:** ServicePortal (portal definition), SPMenu, SPPage, SPTheme, SPWidget, Angular providers, dependencies, CSS/JS includes, portal build order | [SERVICE-PORTAL-API.md](./SERVICE-PORTAL-API.md) |
| **Scheduled Scripts:** ScheduledScript object, frequency (daily/weekly/monthly/periodically), conditional execution, run-as user, timezone, offset, protection policy | [SCHEDULED-SCRIPT-API.md](./SCHEDULED-SCRIPT-API.md) |
| **Form Layouts:** Form object, views, sections, one/two-column layouts, element types (table_field, annotation, formatter, related_list), role/user scoping | [FORM-API.md](./FORM-API.md) |
| **UI Actions:** UiAction object, form/list/client/workspace objects, buttons/links/context menu items, conditions, roles, visibility control, examples | [UI-ACTION-API.md](./UI-ACTION-API.md) |
| **UI Policies:** UiPolicy object, field actions (visible/readOnly/mandatory/cleared), related list actions, conditions, script-based behavior, inheritance | [UI-POLICY-API.md](./UI-POLICY-API.md) |
| **UI Pages (React):** UiPage object, React app development, index.html with `<sdk:now-ux-globals>`, React entry points, navigation integration, direct property, endpoint configuration, best practices | [UI-PAGE-API.md](./UI-PAGE-API.md) |
| **React UI Components:** All `@servicenow/react-components` components — RecordProvider, FormColumnLayout, FormActionBar, ActivityStream, NowRecordListConnected, Horizon Design System (Button, Modal, Tabs, Input, Select, Alert, Card, etc.) | Use the `servicenow-react-ui-components` skill |
| **Client Scripts:** ClientScript object, script types (onLoad/onChange/onSubmit/onCellEdit), uiType, field targeting, view scoping, isolateScript, messages, examples | [CLIENT-SCRIPTS-API.md](./CLIENT-SCRIPTS-API.md) |
| **User Preferences:** UserPreference object, per-user defaults, type values, system-wide defaults, runtime retrieval | [USER-PREFERENCE-API.md](./USER-PREFERENCE-API.md) |
| **Sys Attachments:** SysAttachment object, deploying static files as record attachments, MIME types | [SYS-ATTACHMENT-API.md](./SYS-ATTACHMENT-API.md) |
| Adding npm packages: CSS, context, TypeScript, build | [THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md) |

## Detailed References

Load these files when you need detailed guidance on specific topics:

- **[REST-API.md](./REST-API.md)** — **Scripted REST API:** RestApi object, routes, parameters and headers, versions, ACL enforcement, versioning strategies (single version, backward compatibility), request/response examples, authentication patterns, end-to-end example with handler scripts, error handling, best practices
- **[CLIENT-SERVER-PATTERNS.md](./CLIENT-SERVER-PATTERNS.md)** — Full GlideAjax and REST implementation code, React entry patterns, navigation module
- **[API-REFERENCE.md](./API-REFERENCE.md)** — All Fluent API objects: Table, BusinessRule, ClientScript, ScriptInclude, RestApi, UiPage, SPWidget, UiPolicy, ImportSet, Workspace, Sla, helpers; **ApplicationMenu + sys_app_module** navigation modules with full link-type field matrix and examples; **Role** (quick reference only — see ROLE-API.md for comprehensive guide); **Acl**; **CrossScopePrivilege**; **List** (quick reference only — see LIST-API.md for comprehensive guide); **ATF Test** (quick reference only — see ATF-API.md for comprehensive guide)
- **[TABLE-API.md](./TABLE-API.md)** — **Tables:** Complete Table object reference covering all properties (name, schema, extends, label, licensing, access control, actions, audit, indexes), column types and properties, column names and scoping rules, choices object, label object (multilingual support), licensingConfig object (fulfiller/producer models), autoNumber object (prefixes and numbering), dynamic value definitions (calculated values, dependent fields, dynamic defaults, choices from other tables), best practices, and complete working examples
- **[LIST-API.md](./LIST-API.md)** — **List Views:** List object, table and view properties, columns configuration, column ordering, dot-walking field references, metadata installation control (demo, first install), view configuration (custom views and default view), best practices, troubleshooting, and complete examples
- **[PROPERTY-API.md](./PROPERTY-API.md)** — **System Properties:** Property object, required and optional properties, type reference (string, integer, boolean, choicelist, color, date_format, image, password, timezone, etc.), role-based access control, cache behavior (ignoreCache), import control (isPrivate), installation metadata ($meta), runtime retrieval via gs.getProperty(), best practices, and complete examples
- **[IMPORT-SETS-API.md](./IMPORT-SETS-API.md)** — **Import Sets:** Transform maps, staging tables, data sources, field mappings (sourceField, coalesce, sourceScript), transform scripts by stage (onBefore, onAfter, onReject, onStart, onComplete), required setup order, NULL reserved word warning, complete examples
- **[EMAIL-NOTIFICATION-API.md](./EMAIL-NOTIFICATION-API.md)** — **Email Notifications:** EmailNotification object, properties, triggerConditions (generationType, onRecordInsert, onRecordUpdate, weight, condition, advancedCondition, order), emailContent (subject, messageHtml, messageText, contentType, from, replyTo, importance, forceDelivery), recipientDetails (recipientUsers, recipientGroups, recipientFields, isSubscribableByAllUsers, sendToCreator, eventParm1WithRecipient, eventParm2WithRecipient), digest (allow, default, type, defaultInterval, subject, html, text, separatorHtml, separatorText), best practices, and complete working examples
- **[ATF-API.md](./ATF-API.md)** — **Automated Test Framework (ATF):** Test object properties, all supported test steps organized by category (Application Navigator, Email, Form, Service Portal, REST, Server, Service Catalog), output variables, complete examples for form testing, REST API testing, server operations, and multi-step tests
- **[DASHBOARD-API.md](./DASHBOARD-API.md)** — **Dashboards:** Complete Dashboard API reference covering Dashboard object, tabs, widgets, componentProps (dataSources, metrics, groupBy, trendBy), permissions, visibilities, grid positioning, component types (trend, group, simple data), aggregate functions, and full working examples
- **[WORKSPACE-API.md](./WORKSPACE-API.md)** — **Workspaces:** Complete Workspace API reference covering Workspace object, UxListMenuConfig structure, categories and lists arrays for navigation organization, Applicability object for role-based access control, metadata tables created, URL patterns, ACL requirements, dashboard integration, design best practices for navigation and filtering, and complete ITSM workspace example
- **[ROLE-API.md](./ROLE-API.md)** — **Roles:** Role object properties, role naming conventions, role hierarchies with `containsRoles`, delegation control (`canDelegate`, `assignableBy`), elevated privileges, application admin roles, non-grantable roles, installation control via `$meta.installMethod`, best practices, role design patterns, and complete working examples
- **[ACL-API.md](./ACL-API.md)** — **Access Control Lists:** properties, operations, types, script property, condition-based access, field-level security, REST API ACLs, GraphQL ACLs, processor ACLs, client-callable ACLs, deny ACLs, UX data broker ACLs, examples, best practices
- **[CROSS-SCOPE-PRIVILEGE-API.md](./CROSS-SCOPE-PRIVILEGE-API.md)** — **Cross-Scope Privileges:** runtime access tracking for scripts, status values, operations (read, write, create, delete, execute), target types (tables, script includes, script objects), target scopes, installation metadata, approval workflow, best practices, comparison with ACLs
- **[SCRIPT-ACTION-API.md](./SCRIPT-ACTION-API.md)** — **Script Actions:** ScriptAction object properties ($id, name, script, eventName, active, description, order, conditionScript, $meta), three script content options (imported functions, Now.include(), inline JavaScript), event-driven automation patterns, multi-step execution, conditional logic, error handling, installation control, best practices, troubleshooting guide, and complete working examples
- **[SCRIPT-INCLUDE-API.md](./SCRIPT-INCLUDE-API.md)** — **Script Includes:** ScriptInclude object properties ($id, name, script, apiName, description, clientCallable, mobileCallable, sandboxCallable, callerAccess, accessibleFrom, active, protectionPolicy, $meta), class-based and classless patterns, client-callable GlideAjax integration, access control, IP protection, installation metadata, name-matching requirements, best practices, related concepts (ACLs, cross-scope privileges), common patterns, and complete working examples
- **[BUILD-WORKFLOW.md](./BUILD-WORKFLOW.md)** — now-sdk commands, `now-sdk dependencies`, tsconfig setup, `#now:` import alias, `trustedModules`, build behaviour, verification checklist
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** — Common issues, GlideAjax error diagnosis, instance verification steps
- **[ADVANCED-PATTERNS.md](./ADVANCED-PATTERNS.md)** — Record() for seed data and fallback metadata; cross-scope module pattern; server-side logging and typed GlideRecord; common script APIs (g_form, GlideRecord query, GlideAggregate); `Now.UNRESOLVED` sentinel value; `Now.ref()` cross-application references; `AnnotationType` pre-defined UI annotation type constants; `default_view` default system view reference; global helper functions (`Duration()`, `Time()`, `TemplateValue()`, `FieldList()`)
- **[FLOW-API.md](./FLOW-API.md)** — Flow API: triggers (record/scheduled/application), Flow, Subflow, wfa.trigger, wfa.action (30+ built-in actions with examples), wfa.dataPill, wfa.inlineScript, wfa.approvalRules, wfa.approvalDueDate, wfa.flowLogic (if/elseIf/else, forEach, waitForADuration, setFlowVariables, assignSubflowOutputs, exitLoop, endFlow, skipIteration), FDTransform (string/math/dateTime/utilities/sanitize/complexData), FlowObject/FlowArray complex types, ActionDefinition (custom actions), ActionStepDefinition/ActionStep (custom action steps), TriggerDefinition (custom triggers), complete production examples
- **[SLA-API.md](./SLA-API.md)** — **Service Level Agreements:** Sla object, name, table, type, duration (fixed and relative), schedule config (scheduleSource, scheduleSourceField), conditions (start/stop/pause/resume/reset/cancel), advancedConditionType, resetAction, whenTo (resume/cancel), retroactive start (retroactive.start, retroactive.setStartTo, retroactive.pause), timezoneSource, timezone, overrides, flow/workflow linkage, enableLogging, $meta installMethod, complete working examples
- **[SERVICE-CATALOG.md](./SERVICE-CATALOG.md)** — **Service Catalog:** CatalogItem (all properties: fulfillment, pricing, portal settings, access), VariableSet (singleRow/multiRow, roles, layout), all 22 variable types with full per-type options, complete BaseVariableConfig/VariableConfig common properties (width, readOnly, hidden, helpText, mapToField, visibleBundle, pricingDetails, dynamic defaults, etc.), ExtendedChoices per-choice pricing, CatalogUiPolicy (conditions, actions array, scripts, appliesOn* scopes), CatalogClientScript (onLoad/onChange/onSubmit, isolateScript, appliesOn* scopes), CatalogItemRecordProducer (script/postInsertScript/saveScript context, mapToField, redirectUrl)
- **[UI-PAGE-API.md](./UI-PAGE-API.md)** — **UI Pages (React):** UiPage object properties ($id, endpoint, html, direct, category, clientScript, processingScript, $meta), React application development patterns with full-stack examples (index.html, main.jsx, app.tsx), `<sdk:now-ux-globals>` tag requirement for ServiceNow globals initialization, navigation integration via ApplicationMenu and sys_app_module modules, one-way HTML synchronization behavior, GlideAjax vs REST API decision guide for server communication, best practices for React development, security and ACL patterns, complete working examples
- **[SERVICE-PORTAL-API.md](./SERVICE-PORTAL-API.md)** — **Service Portal:** SPWidget object (properties, client/server scripts, option schemas, templates), SPAngularProvider object (directives, factories, services), SPWidgetDependency object (CSS/JS includes, load order, portal targeting), CssInclude and JsInclude objects, ServicePortal portal container (title, urlSuffix, pages, theme, catalog, knowledge base, favorites, AI search), SPMenu (navigation items, nested menus, role restrictions), SPPage (containers/rows/columns/instances layout hierarchy), SPTheme (header/footer, SCSS variables, fixed layout, Next Experience theme mapping), complete portal build order, best practices
- **[SCHEDULED-SCRIPT-API.md](./SCHEDULED-SCRIPT-API.md)** — **Scheduled Scripts:** ScheduledScript object, frequency options (once/daily/weekly/monthly/periodically), time and day scheduling (executionTime, daysOfWeek, dayOfMonth, executionInterval), conditional execution (conditional + condition script), date range (executionStart/executionEnd), run-as user, timezone, offset, upgradeSafe, protection policy, complete examples
- **[FORM-API.md](./FORM-API.md)** — **Form Layouts:** Form object, required table/view/sections structure, default_view constant, one-column and two-column layout blocks, all element types (table_field, annotation, formatter, related_list, split, end_split), role-based access, user personalization, records created (sys_ui_form, sys_ui_form_section, sys_ui_section, sys_ui_element, sys_ui_annotation), complete examples
- **[UI-ACTION-API.md](./UI-ACTION-API.md)** — **UI Actions:** UiAction object properties ($id, table, name, actionName, active, form, list, client, workspace, script, condition, roles, showInsert/Update/Query/MultipleUpdate), form object (showButton, showLink, showContextMenu, style), list object (showButton, showLink, showContextMenu, style, showListChoice, showBannerButton, showSaveWithFormButton), client object (isClient, isUi11/16Compatible, onClick), workspace object (isConfigurableWorkspace, showFormButtonV2/MenuButtonV2, clientScriptV2), conditional visibility, role-based access, script content options (imports, Now.include(), inline), complete examples with form buttons, list actions, context menus, and workspace-specific behaviors, best practices, troubleshooting
- **[UI-POLICY-API.md](./UI-POLICY-API.md)** — **UI Policies:** UiPolicy object properties ($id, table, view, shortDescription, active, onLoad, conditions, reverseIfFalse, runScripts, scriptTrue, scriptFalse, uiType, isolateScript, inherit, order), actions array (field, visible, readOnly, mandatory, cleared, value, fieldMessage, fieldMessageType), relatedListActions array (list references, visibility control), field action properties and configuration options, related list visibility controls, complete examples with conditional field behavior, policy inheritance, script isolation, performance optimization (UI Policies vs client scripts), best practices
- **[CLIENT-SCRIPTS-API.md](./CLIENT-SCRIPTS-API.md)** — **Client Scripts:** ClientScript object properties ($id, name, table, type, uiType, active, global, view, field, appliesExtended, isolateScript, messages, script, $meta), script types (onLoad/onChange/onSubmit/onCellEdit), client script file patterns (onChange isLoading guard, onSubmit cancel), when to use vs UI Policies, best practices, complete examples
- **[USER-PREFERENCE-API.md](./USER-PREFERENCE-API.md)** — **User Preferences:** UserPreference object properties ($id, name, type, value, description, system), type values reference, per-user defaults vs system-wide defaults, runtime read/write via gs.getPreference()/gs.setPreference(), naming conventions, comparison with Property API
- **[SYS-ATTACHMENT-API.md](./SYS-ATTACHMENT-API.md)** — **Sys Attachments:** SysAttachment object properties (id, fileName, contentType, filePath, tableName, tableSysId), deploying static files as record attachments at build time, common MIME types reference, best practices
- **[THIRD-PARTY-LIBRARIES.md](./THIRD-PARTY-LIBRARIES.md)** — Adding npm packages to Fluent React apps: `package.json` layout, Rollup prebuild script, CSS imports, context providers, TypeScript declarations, build-warning suppression, and a full checklist
