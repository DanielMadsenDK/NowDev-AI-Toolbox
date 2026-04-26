# Platform Views, Lists & Relationships — Fluent SDK

Covers Views (`sys_ui_view`), View Rules (`sysrule_view`), List Controls (`sys_ui_list_control`), and Relationships (`sys_relationship`).

For the `List` API (list columns/views), see [LIST-API.md](./LIST-API.md).  
For UI Formatters and the approach decision table, see [platform-view-guide.md](./platform-view-guide.md).

---

## Views (`sys_ui_view`)

Views define which fields, sections, and layout appear on a form or list for a given table. A view definition alone is non-functional — it must be combined with form/list components.

### Key Rules

- Both `name` and `title` must each be globally unique across all scopes — query before creating
- Use `default_view` from `@servicenow/sdk/core` for the "Default view" — never hardcode it
- `hidden: true` makes the view invisible in the platform view selector (for portal/API views)

### CRITICAL: Uniqueness Check

Query before creating to avoid conflicts:
```
table: sys_ui_view
query: name=<proposed_name>^ORtitle=<proposed_title>
```
If results > 0, change both `name` and `title` and re-query. Scope prefixes do not guarantee uniqueness.

### View Type Decision

| Pattern | Type | Configuration |
|---------|------|--------------|
| "default", "standard", "basic" | Default | Use `default_view` constant — no Record needed |
| Role-based ("admins", "managers", "ITIL") | Role-based | Set `roles` array |
| Group-based ("team", "department") | Group-based | Set `group` reference |
| Portal/mobile/API/hidden | Hidden | Set `hidden: true` |
| Named individual | User-specific | Set `user` reference |
| "everyone", "all users" | Public | Omit access control fields |

### UI View Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$id` | `Now.ID[string]` | Yes | Unique identifier |
| `table` | string | Yes | Must be `"sys_ui_view"` |
| `data.name` | string | Yes | Unique technical name (max 80 chars) |
| `data.title` | string | Yes | Unique display name (max 80 chars) |
| `data.roles` | string[] | No | Array of role name strings |
| `data.user` | string | No | sys_id or reference to `sys_user` |
| `data.group` | string | No | sys_id or reference to `sys_user_group` |
| `data.hidden` | boolean | No | Hide from platform view selector |

### View Examples

```typescript
import { Record, default_view } from '@servicenow/sdk/core'

// Public view (no access restriction)
export const mobileView = Record({
  $id: Now.ID['mobile-view'],
  table: 'sys_ui_view',
  data: {
    name: 'incident_mobile',
    title: 'Mobile View',
  },
})

// Role-based view
export const adminView = Record({
  $id: Now.ID['admin-view'],
  table: 'sys_ui_view',
  data: {
    name: 'incident_admin',
    title: 'Admin View',
    roles: ['admin'],
  },
})

// Hidden view (for Service Portal/API)
export const portalView = Record({
  $id: Now.ID['portal-view'],
  table: 'sys_ui_view',
  data: {
    name: 'sp_incident_customer',
    title: 'Customer Portal View',
    hidden: true,
  },
})
```

### Forms Integration with Views

Form hierarchy: `sys_ui_view` → `sys_ui_form` → `sys_ui_section` → `sys_ui_element` (fields/formatters/related lists)

**CRITICAL:** Forms require explicit linking between forms and sections using `sys_ui_form_section`. Without `sys_ui_form_section` records, your form will appear **empty**.

Form element types:

| type | Description |
|------|-------------|
| `element` | Standard field |
| `formatter` | Custom formatter |
| `list` | Related list |
| `.begin_split` | Open 2-column area |
| `.split` | Column divider |
| `.end_split` | Close 2-column area |
| `.space` | Empty space |

```typescript
import { Record } from '@servicenow/sdk/core'

// 1. Create Form
export const managerForm = Record({
  $id: Now.ID['manager-form'],
  table: 'sys_ui_form',
  data: { name: 'incident', view: adminView, active: true },
})

// 2. Create Sections
export const detailsSection = Record({
  $id: Now.ID['details-section'],
  table: 'sys_ui_section',
  data: { name: 'incident', view: adminView, caption: 'Case Details', position: 0 },
})

// 3. CRITICAL: Link Sections to Form
export const formDetailsLink = Record({
  $id: Now.ID['form-details-link'],
  table: 'sys_ui_form_section',
  data: { sys_ui_form: managerForm, sys_ui_section: detailsSection, position: 0 },
})

// 4. Add Fields to Sections
export const numberField = Record({
  $id: Now.ID['number-field'],
  table: 'sys_ui_element',
  data: { element: 'number', sys_ui_section: detailsSection, position: 0, type: 'element' },
})
```

---

## View Rules (`sysrule_view`)

View Rules automatically switch the form layout based on conditions, device type, or script logic. Views must exist in `sys_ui_view` first.

### Three Switching Approaches

1. **Device-Based:** Set `device_type` (`'mobile'`, `'tablet'`, `'browser'`)
2. **Condition-Based:** Set `condition` with encoded query (MUST end with `^EQ`)
3. **Script-Based:** Set `advanced: true` with custom `script`

### CRITICAL Rules

- Encoded queries MUST end with `^EQ`
- Use backend field names (from `sys_dictionary`), not display labels
- Use internal values (from `sys_choice`), not display labels
- When multiple advanced (script-based) View Rules share the same table AND `device_type`, **only the rule with the lowest `order` is evaluated** — combine all role/condition checks into a single script
- **NEVER** use Business Rules, Client Scripts, or UI Policies for view switching — always use View Rules

### View Rule Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | `Now.ID[string]` | Yes | — | Unique identifier |
| `table` | string | Yes | — | Must be `"sysrule_view"` |
| `data.name` | string | Yes | — | Descriptive name |
| `data.table` | string | Yes | — | Target table name |
| `data.view` | string | No | — | View name (from `sys_ui_view.name`). Required unless using script |
| `data.condition` | string | No | — | Encoded query ending with `^EQ` |
| `data.device_type` | string | No | — | `'browser'`, `'mobile'`, or `'tablet'` |
| `data.active` | boolean | No | `true` | Whether rule is active |
| `data.overrides_user_preference` | boolean | No | `true` | Override manual selection |
| `data.advanced` | boolean | No | `false` | Enable custom script |
| `data.script` | string | No | — | JavaScript logic (when `advanced: true`) |
| `data.order` | number | No | `100` | Evaluation order (lower first) |

### Advanced Script Variables

| Variable | Type | Available | Description |
|----------|------|-----------|-------------|
| `view` | string | Always | Current view name |
| `is_list` | boolean | Always | `true` for lists, `false` for forms |
| `current` | GlideRecord | Forms only | Current record (undefined for lists) |
| `answer` | string/null | Always | Set to view name to switch |
| `gs` | GlideSystem | Always | GlideSystem API |

Always check `!is_list && typeof current !== 'undefined'` before accessing `current`.

### View Rule Examples

```typescript
import { Record } from '@servicenow/sdk/core'

// Device-based switching
export const mobileRule = Record({
  $id: Now.ID['mobile-rule'],
  table: 'sysrule_view',
  data: {
    name: 'Mobile View Rule',
    table: 'incident',
    view: 'incident_mobile',
    device_type: 'mobile',
    active: true,
    overrides_user_preference: true,
  },
})

// Condition-based switching (must end with ^EQ)
export const criticalRule = Record({
  $id: Now.ID['critical-rule'],
  table: 'sysrule_view',
  data: {
    name: 'Critical Priority Rule',
    table: 'incident',
    view: 'incident_critical',
    condition: 'priority=1^ORpriority=2^EQ',
    active: true,
    overrides_user_preference: true,
  },
})

// Role-based switching via advanced script (combine all roles in ONE script)
export const roleRule = Record({
  $id: Now.ID['role-rule'],
  table: 'sysrule_view',
  data: {
    name: 'Role-Based View Rule',
    table: 'incident',
    view: null,
    advanced: true,
    active: true,
    overrides_user_preference: true,
    script: `(function overrideView(view, is_list) {
      var user = gs.getUser();
      if (user.hasRole('admin')) {
        answer = 'incident_admin';
      } else if (user.hasRole('manager')) {
        answer = 'incident_manager';
      } else if (user.hasRole('itil')) {
        answer = 'incident_agent';
      } else {
        answer = 'ess';
      }
    })(view, is_list)`,
  },
})

// Form-only conditional logic (uses current record)
export const formConditionRule = Record({
  $id: Now.ID['form-condition-rule'],
  table: 'sysrule_view',
  data: {
    name: 'Critical Active Incident View',
    table: 'incident',
    view: null,
    advanced: true,
    active: true,
    overrides_user_preference: true,
    script: `(function overrideView(view, is_list) {
      if (!is_list && typeof current !== 'undefined') {
        var priority = current.priority.toString();
        var state = current.state.toString();
        if (priority === '1' && state === '2') {
          answer = 'incident_critical_active';
        } else if (priority === '1' && state === '7') {
          answer = 'incident_critical_closed';
        } else {
          answer = null;
        }
      }
    })(view, is_list)`,
  },
})
```

---

## List Controls (`sys_ui_list_control`)

List Controls configure UI options on table lists and related lists — role-based New/Edit button visibility, conditional button hiding, pagination control.

### Key Guidance

1. Each list control needs a unique `$id`, `table: 'sys_ui_list_control'`, and valid `name` (target table)
2. For related lists, use `related_list` in `table.field` or `` REL:`${relationship.$id}` `` format
3. **Do not combine** `omit_*_button: true` with `*_roles` — the omit flag overrides role permissions
4. Button visibility is OR logic: hidden if `omit_*_button == true` OR `*_condition` evaluates to `true`
5. Use `omit_count: true` for large tables (>10,000 records) for performance
6. Condition scripts use `Now.include()` for external files

### List Control Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | TableName | — | Target table name |
| `related_list` | string | — | `table.field` or `` REL:`${rel.$id}` `` format |
| `label` | string | — | Display label for list |
| `omit_new_button` | boolean | `false` | Hide New button for everyone |
| `omit_edit_button` | boolean | `true` | Hide Edit button for everyone |
| `omit_links` | boolean | `false` | Hide reference links |
| `omit_drilldown_link` | boolean | `false` | Disable first-column drilldown link |
| `omit_filters` | boolean | `false` | Hide filters/breadcrumbs |
| `omit_if_empty` | boolean | `false` | Hide related list when empty |
| `omit_count` | boolean | `false` | Remove pagination count |
| `omit_related_list_count` | boolean | `false` | Remove related list count in Workspace |
| `new_roles` | string[] | — | Roles that can see New button |
| `edit_roles` | string[] | — | Roles that can see Edit button |
| `filter_roles` | string[] | — | Roles that can see filters |
| `link_roles` | string[] | — | Roles that can see links |
| `new_condition` | Script | — | Condition script to hide New button |
| `edit_condition` | Script | — | Condition script to hide Edit button |
| `list_edit_type` | string | — | `'save_by_row'`, `'disabled'`, or omit for default |
| `hierarchical_lists` | boolean | `false` | Enable hierarchical list display |
| `disable_nlq` | boolean | `false` | Disable Natural Language Query |
| `active` | boolean | `true` | Whether control is active |

### Condition Script Pattern

```javascript
var answer;
if (parent.state == 6 || parent.state == 7) {
  answer = true;   // hide button
} else {
  answer = false;  // show button
}
answer;
```
- `parent` provides access to parent record fields
- `answer = true` hides the button; `answer = false` shows it

### List Control Examples

```typescript
import { Record } from '@servicenow/sdk/core'

// Performance optimization for large table
export const auditControl = Record({
  $id: Now.ID['audit-list-control'],
  table: 'sys_ui_list_control',
  data: {
    name: 'sys_audit',
    omit_count: true,
    omit_related_list_count: true,
  },
})

// Role-based button access
export const roleControl = Record({
  $id: Now.ID['role-based-access'],
  table: 'sys_ui_list_control',
  data: {
    name: 'incident',
    new_roles: ['admin', 'itil'],
    edit_roles: ['admin'],
  },
})

// Conditional button hiding on related list
export const conditionalControl = Record({
  $id: Now.ID['incident-conditional-button'],
  table: 'sys_ui_list_control',
  data: {
    name: 'incident',
    related_list: 'incident.parent_incident',
    new_condition: Now.include('../scripts/hideForClosedIncident.js'),
    edit_condition: Now.include('../scripts/hideForClosedIncident.js'),
  },
})

// Hide related list when empty
export const hideIfEmpty = Record({
  $id: Now.ID['omit-if-empty'],
  table: 'sys_ui_list_control',
  data: {
    name: 'incident',
    related_list: 'incident.parent_incident',
    omit_if_empty: true,
  },
})

// Disable list editing
export const disableEdit = Record({
  $id: Now.ID['disable-list-edit'],
  table: 'sys_ui_list_control',
  data: {
    name: 'x_snc_financial_records',
    list_edit_type: 'disabled',
  },
})

// List control on custom relationship
export const customRelControl = Record({
  $id: Now.ID['custom-rel-control'],
  table: 'sys_ui_list_control',
  data: {
    name: 'sn_sportshub_sports',
    related_list: `REL:${activeHighPriorityRelationship.$id}`,
    omit_related_list_count: true,
  },
})
```

---

## Relationships (`sys_relationship`)

Relationships define how tables relate for related lists and cross-table queries.

### Relationship Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Descriptive name |
| `basic_apply_to` | TableName | Table where relationship is defined (basic mode) |
| `basic_query_from` | TableName | Table being referenced (basic mode) |
| `reference_field` | FieldName | Field containing the reference |
| `query_with` | Script | Script to refine the query |
| `advanced` | boolean | Whether this is an advanced relationship |
| `simple_reference` | boolean | Whether this is a simple reference |
| `apply_to` | Script | Script for advanced mode: which table applies |
| `query_from` | Script | Script for advanced mode: which table to query |

**Use either** basic fields (`basic_apply_to`, `basic_query_from`) **or** advanced fields (`apply_to`, `query_from`) — never both.

### Related List Configuration

Related lists use two tables:
- `sys_ui_related_list` — container for a table's related lists in a view
- `sys_ui_related_list_entry` — individual entries linking to relationships

For referential relationships: use `table.reference_field` format in the entry.  
For non-referential relationships: use `` REL:`${relationship.$id}` `` format.

### Relationship Examples

```typescript
import { Record } from '@servicenow/sdk/core'

// Basic relationship between custom tables
export const deptAllocation = Record({
  $id: Now.ID['department-rel-id'],
  table: 'sys_relationship',
  data: {
    advanced: false,
    basic_apply_to: 'sn_foo_department',
    basic_query_from: 'sn_foo_student',
    name: 'Department Allocation Relationship',
    query_with: `(function refineQuery(current, parent) {
      current.addQuery('department', parent.id);
    })(current, parent)`,
    simple_reference: false,
  },
})

// Related list container with entries
const deptRelatedList = Record({
  $id: Now.ID['department-related-list-id'],
  table: 'sys_ui_related_list',
  data: {
    calculated_name: 'Department - Default view',
    name: 'sn_foo_department',
    view: 'Default view',
  },
})

Record({
  $id: Now.ID['department-related-list-entry-id'],
  table: 'sys_ui_related_list_entry',
  data: {
    list_id: deptRelatedList.$id,
    position: '0',
    related_list: `REL:${deptAllocation.$id}`,
  },
})

// Multiple related lists on one table (using referential table.field format)
const productContainer = Record({
  $id: Now.ID['products-related-lists'],
  table: 'sys_ui_related_list',
  data: { name: 'sn_product_life_products', view: 'Default view' },
})

Record({
  $id: Now.ID['feature-requests-entry'],
  table: 'sys_ui_related_list_entry',
  data: {
    list_id: productContainer.$id,
    position: 0,
    related_list: 'feature_requests.product',  // table.reference_field format
  },
})

Record({
  $id: Now.ID['testing-reports-entry'],
  table: 'sys_ui_related_list_entry',
  data: {
    list_id: productContainer.$id,
    position: 1,
    related_list: 'testing_reports.product',
  },
})
```
