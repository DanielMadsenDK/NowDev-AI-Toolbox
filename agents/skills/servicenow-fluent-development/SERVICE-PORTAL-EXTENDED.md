# Service Portal Extended Reference

Extended reference covering OOTB widget/page catalogue, Coral theme SCSS variables, menu item types, Angular provider guidelines, CSS anti-patterns, and troubleshooting.

---

## Menu Item Types

The `SPMenu` `items` array accepts objects with a `type` property. Each type exposes different companion fields.

| Type | Companion Fields | Purpose |
|------|-----------------|---------|
| `page` | `page` (reference, required) | Links to an SP page |
| `url` | `url`, `urlTarget` | External or internal URL |
| `sc` | (none) | Service Catalog home |
| `sc_category` | `scCategory`, `page` | Service Catalog category |
| `sc_cat_item` | `catItem`, `page` | Specific catalog item |
| `kb` | (none) | Knowledge Base home |
| `kb_topic` | `kbTopic`, `page` | Knowledge topic |
| `kb_article` | `kbArticle`, `page` | Specific knowledge article |
| `kb_category` | `kbCategory`, `page` | Knowledge category |
| `filtered` | `table`, `filter`, display fields | Dynamic content based on filter |
| `scripted` | `script` | Server-side generated items |

### OOTB Menu Widgets

Always use an existing OOTB menu widget. Always set the `widget` field on menu records.

| Widget Name | Sys ID | Description |
|-------------|--------|-------------|
| Header Menu | `5ef595c1cb12020000f8d856634c9c6e` | Standard portal navigation |
| Icon Menu List | `88979930cb01020000f8d856634c9caa` | Menu with icon per item |
| Single Icon Menu | `5edf4c21cb21020000f8d856634c9cba` | Compact icon dropdown |

### Menu Example

```typescript
import "@servicenow/sdk/global";
import { SPMenu } from "@servicenow/sdk/core";

export const mainMenu = SPMenu({
    $id: Now.ID["main_menu"],
    title: "Main Menu",
    widget: "5ef595c1cb12020000f8d856634c9c6e",   // Header Menu
    items: [
        {
            $id: Now.ID["home_item"],
            type: "page",
            label: "Home",
            page: "<home_page_sys_id>",
            glyph: "home",
            order: 100
        },
        {
            $id: Now.ID["services_item"],
            type: "sc",
            label: "Services",
            glyph: "briefcase",
            order: 200,
            childItems: [
                {
                    $id: Now.ID["it_services"],
                    type: "sc_category",
                    label: "IT Services",
                    scCategory: "<it_category_sys_id>",
                    page: "<catalog_page_sys_id>",
                    order: 100
                }
            ]
        },
        {
            $id: Now.ID["kb_item"],
            type: "kb",
            label: "Knowledge",
            glyph: "book",
            order: 300
        }
    ]
});
```

---

## Angular Provider Guidelines

Five rules that must be followed for all `SPAngularProvider` records:

1. **Function name MUST match the `name` field exactly** — AngularJS uses the function name for dependency injection
2. **Services and factories must return an object** (not `this`, not primitives)
3. **Directives must return a Directive Definition Object (DDO)**
4. **Link providers to widgets via `angularProviders` array** in `SPWidget()`
5. **Avoid circular dependencies** between providers

| Provider Type | Script Shape | When to Use |
|--------------|-------------|-------------|
| `directive` | Returns DDO | Custom HTML elements/attributes, reusable UI |
| `service` | Returns object with methods | Shared logic, state management, utility functions |
| `factory` | Returns object or primitive | Configurable objects, API integration layers |

### Angular Provider Example: Service

```typescript
import "@servicenow/sdk/global";
import { SPAngularProvider } from "@servicenow/sdk/core";

export const dataService = SPAngularProvider({
    $id: Now.ID["data_service"],
    name: "dataService",   // must match function name
    type: "service",
    script: `function dataService($http) {
        return {
            getRecords: function(table, limit) {
                return $http.get('/api/now/table/' + table, {
                    params: { sysparm_limit: limit || 10 }
                });
            }
        };
    }`
});
```

### Linking Angular Provider to Widget

```typescript
import { SPWidget } from "@servicenow/sdk/core";
import { dataService } from "../../sp-angular-provider/provider.now";

export const myWidget = SPWidget({
    $id: Now.ID["my_widget"],
    name: "My Widget",
    angularProviders: [dataService],
    clientScript: Now.include("./client_script.js"),
    htmlTemplate: Now.include("./template.html"),
    serverScript: Now.include("./server_script.js"),
});
```

Client script (use string concatenation for HTML in templates to avoid quote conflicts):

```javascript
// client_script.js
api.controller = function(dataService) {
    var c = this;
    dataService.getRecords("incident", 5).then(function(response) {
        c.data.records = response.data.result;
    });
};
```

---

## Widget Dependency: Bundled Libraries

Service Portal **already includes** these libraries globally. Adding them again causes version conflicts:

- jQuery
- AngularJS
- Bootstrap 3 CSS/JS
- Bootstrap 3 Glyphicons

### Dependency Guidelines

- Lower `order` numbers load first — always load base libraries before plugins
- Use minified CDN URLs with version pinning (e.g., `library@4.17.21`)
- One dependency per library — share across multiple widgets
- Always use HTTPS URLs
- Link dependencies to widgets via `dependencies` array in `SPWidget()`

### Widget Dependency Example

```typescript
import "@servicenow/sdk/global";
import { SPWidgetDependency, JsInclude, CssInclude } from "@servicenow/sdk/core";

export const select2Dep = SPWidgetDependency({
    $id: Now.ID["select2_dep"],
    name: "Select2",
    jsIncludes: [
        {
            order: 100,
            include: JsInclude({
                $id: Now.ID["select2_js"],
                name: "Select2 JS",
                url: "https://cdn.jsdelivr.net/npm/select2@4.1.0/dist/js/select2.min.js"
            })
        }
    ],
    cssIncludes: [
        {
            order: 100,
            include: CssInclude({
                $id: Now.ID["select2_css"],
                name: "Select2 CSS",
                url: "https://cdn.jsdelivr.net/npm/select2@4.1.0/dist/css/select2.min.css"
            })
        }
    ]
});
```

---

## CSS and Theming Reference

### SCSS Variable Rules for Widget CSS

**Never invent custom SCSS variable names.** Service Portal compiles widget CSS as SCSS with only the portal theme's `css_variables` injected. Undefined variables are silently dropped.

Before writing any widget CSS:

1. Look up the portal's theme from the portal definition
2. Only use SCSS variables from the theme's `css_variables` or from the extended Bootstrap/SP defaults
3. If a needed variable does not exist, use SCSS functions (`darken()`, `lighten()`, `rgba()`) on an existing variable
4. Never use hardcoded hex, rgb, or rgba values

### Extended Bootstrap/SP Defaults (Always Available)

`$border-radius-base` · `$border-radius-large` · `$border-radius-small` · `$font-size-base` · `$font-size-small` · `$font-size-large` · `$btn-primary-color` · `$panel-primary-text` · `$link-color` · `$state-success-bg` · `$state-warning-bg` · `$state-danger-bg` · `$state-info-bg` · `$alert-success-border` · `$alert-warning-border` · `$alert-danger-border` · `$alert-info-border` · `$body-bg` · `$component-active-bg` · `$btn-default-border` · `$panel-border-color` · `$input-border` · `$input-border-focus`

### Coral Theme SCSS Variable Reference

#### Backgrounds

| Purpose | Variable |
|---------|----------|
| Card / surface background | `$background-primary` |
| Page background | `$sp-page-bg` |
| Subtle / muted background | `$background-secondary` |
| Heavier subtle background | `$background-tertiary` |
| Input field background | `$sp-form-field--background-color` |

#### Borders

| Purpose | Variable |
|---------|----------|
| Default border (cards, dividers) | `$border-tertiary` |
| Medium emphasis border | `$border-secondary` |
| Strong emphasis border | `$border-primary` |

#### Text

| Purpose | Variable |
|---------|----------|
| Primary text | `$text-color` |
| Secondary text | `$text-secondary` |
| Muted / helper text | `$text-muted` |
| White text (on dark backgrounds) | `$btn-primary-color` |

#### Brand Colors

| Purpose | Variable |
|---------|----------|
| Primary brand | `$brand-primary` |
| Primary dark (hover) | `$brand-primary-dark` |
| Primary lighter (highlights) | `$brand-primary-lighter` |
| Success | `$brand-success` |
| Warning | `$brand-warning` |
| Danger | `$brand-danger` |
| Info | `$brand-info` |
| Link color | `$link-color` |

### Spacing Scale

Use only these values. Never use arbitrary pixel values.

| Variable | Value | Typical Use |
|----------|-------|-------------|
| `$sp-space-1` | 4px | Icon gaps, badge padding |
| `$sp-space-2` | 8px | Input padding, label gaps |
| `$sp-space-3` | 12px | Button padding Y, tight sections |
| `$sp-space-4` | 16px | Base unit — form group gap |
| `$sp-space-5` | 24px | Card padding, section gap |
| `$sp-space-6` | 32px | Between major sections |
| `$sp-space-7` | 48px | Page top padding, empty states |
| `$sp-space-8` | 64px | Full-bleed sections |

### Typography Scale

Every `font-size` must use a theme variable — never a raw pixel value.

| Variable | Value | Typical Use |
|----------|-------|-------------|
| `$sp-text-xs` | 12px | Badges, timestamps, captions |
| `$sp-text-sm` | 14px | Helper text, table metadata |
| `$sp-text-base` | 16px | Body, labels, table cells |
| `$sp-text-md` | 18px | Card titles, sub-headings |
| `$sp-text-lg` | 22px | Section headings |
| `$sp-text-xl` | 26px | Page title |
| `$sp-text-2xl` | 32px | Hero / banner headings |

### Icon Size Scale

| Variable | Value | Typical Use |
|----------|-------|-------------|
| `$sp-icon-xs` | 12px | Badge / chevron icons |
| `$sp-icon-sm` | 16px | Button / inline / alert icons |
| `$sp-icon-md` | 20px | Card / stat tile icons |
| `$sp-icon-lg` | 32px | Section / feature icons |
| `$sp-icon-xl` | 48px | Empty state / hero icons |

### CSS Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| `style=""` inline on elements | Use SCSS class |
| Raw hex values in widget CSS | Use `$brand-primary`, `$text-color`, etc. |
| `<br>` tags for spacing | Use margin/padding utilities |
| `!important` in widget CSS | Increase selector specificity |
| Input without `<label>` | Every input paired with label and matching id |
| `ng-repeat` without `track by` | Always `track by item.sys_id` |
| Missing `type` on `<button>` | Always `type="button"` or `type="submit"` |
| GlideRecord without `setLimit()` | Always call `setLimit(n)` |

---

## OOTB Widgets Reference

Before creating any custom widget, check these commonly reusable OOTB widgets:

| Widget Name | Sys ID | ID | Purpose |
|------------|--------|----|---------|
| Data Table | `5001b062d7101200b0b044580e6103eb` | `widget-data-table` | Record list/table views |
| Form | `fd1f4ec347730200ba13a5554ee490c0` | `widget-form` | Full ServiceNow form |
| Typeahead Search | `fa20ec02cb31020000f8d856634c9ce9` | `typeahead-search` | Search with autocomplete |
| Faceted Search | `12fbe2d287330300a785940307cb0b1b` | `faceted_search` | Filtered search results |
| Login | `6506d341cb33020000f8d856634c9cdc` | `widget-login` | Portal login form |
| User Profile | `6e6ac664d710120023c84f80de610318` | `user-profile` | User profile card |
| Ticket Conversations | `85357f52cb30020000f8d856634c9c24` | `widget-ticket-conversation` | Activity stream |
| Ticket Attachments | `9ee37281d7033100a9ad1e173e24d457` | `widget-ticket-attachments` | File upload/attachment list |
| Breadcrumbs | `0fb269305b3212000d7ec7ad31f91ae2` | `breadcrumbs` | Navigation breadcrumb trail |
| Homepage Search | `200fbd96cb20020000f8d856634c9ca1` | — | Large search bar for landing |
| User Menu | `3333b2ba5b1032000d7ec7ad31f91a27` | `sp-user-menu` | User dropdown in header |
| Stock Header | `bf5ec2f2cb10120000f8d856634c9c0c` | — | Default portal header |
| Sample Footer | `feb4f763df121200ba13a4836bf26320` | — | Default portal footer |
| Header Menu | `5ef595c1cb12020000f8d856634c9c6e` | — | Top navigation menu widget |
| Simple List | `5b255672cb03020000f8d856634c9c28` | `widget-simple-list` | Minimal record list |
| Approvals | `f37aa302cb70020000f8d856634c9cfc` | — | Pending approvals list |
| KB View | `e7ef8eb847101200ba13a5554ee49010` | — | Knowledge article reader |
| KB Categories | `122ac7f0d7101200a9addd173e24d411` | — | Knowledge category browsing |
| My Requests | `f1672671d7301200a9addd173e24d47d` | — | User's open requests |
| Carousel | `cf1a5153cb21020000f8d856634c9c3c` | — | Image/content carousel |

---

## OOTB Pages Reference

Before creating any custom page, check these commonly reusable OOTB pages:

| Page Name | URL ID | Sys ID | Purpose |
|-----------|--------|--------|---------|
| Form | `form` | `ed5f8ec347730200ba13a5554ee49046` | Generic record form |
| List | `list` | `b574e51147132100ba13a5554ee4903e` | Generic record list |
| Ticket Form | `ticket` | `84af292247132100ba13a5554ee4909e` | Ticket/case detail |
| Login | `login` | `6995a144cb11120000f8d856634c9c25` | Portal login |
| Not Found | `404` | `3c2c9063cb11020000f8d856634c9c1f` | 404 error page |
| Search | `search` | `87466b63c3223100c8b837659bba8feb` | Search results |
| Approvals | `approvals` | `d3485112cb13310000f8d856634c9c3e` | Approval list |
| My Requests | `requests` | `31ed6a51d7130200a9ad1e173e24d479` | User's requests |
| User Profile | `user_profile` | `edcbce64d710120023c84f80de610305` | User profile |
| Catalog Home (v2) | `sc_landing` | `53261e3487100300e0ef0cf888cb0b7c` | Service Catalog landing |
| Catalog Item | `sc_cat_item` | `9f12251147132100ba13a5554ee490f4` | Catalog item order form |
| KB View | `kb_view` | `db9fcab847101200ba13a5554ee490cf` | Knowledge base home |
| KB Article | `kb_article` | `dea5792147132100ba13a5554ee4902d` | Knowledge article reader |

---

## Troubleshooting

### Portal not accessible

- Verify `urlSuffix` is unique and does not conflict with existing portals
- Check user has access permissions

### Navigation menu not showing (most common)

- Verify portal has `theme` configured
- Verify theme has `header` configured (`sp_header_footer`)
- Verify portal has `mainMenu` configured
- Query `sp_widget` to confirm the menu widget sys_id is correct on this instance

### Theme not applying

- Confirm theme sys_id exists on the instance
- Verify theme is linked to portal (`sp_portal.theme`)
- Check SCSS compilation errors in browser console

### Widget not displaying

- Check widget is active
- Verify page/instance configuration
- Check browser console for JavaScript errors

### Data not updating in widget

- Verify server script IIFE syntax is correct: `(function() { /* ... */ })()`
- Check `c.server.get()` / `c.server.update()` calls match `input.action` handling in server script

### Styling issues

- Confirm SCSS token variables are used (not raw hex)
- Check Bootstrap 3 class names (not Bootstrap 4/5)
- Confirm `turnOffScssCompilation` is `false` on theme

### CSS variables not working

- Never invent token names — use hex directly when no CSS token exists
- Verify `sp-rgb()` is only used when a `--now-*` token exists

### Library not loading

- Verify CDN URL is accessible from the instance network
- Check `order` values — base libraries must load before plugins
- Confirm dependency is linked to widget via `dependencies` array

### Provider not available in widget

- Verify provider is in `angularProviders` array on `SPWidget()`
- Check function name matches `name` field exactly
- Verify script syntax is valid
