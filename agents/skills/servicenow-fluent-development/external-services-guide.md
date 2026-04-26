# Configuring External Services (LDAP) — Fluent SDK

Guide for configuring external LDAP directory connections in ServiceNow using the Record API.  
Use for LDAP server setup, failover, and load balancing. Requires SDK 4.2.0+.  
For LDAP **data imports** (staging tables, data sources, transform maps), see [IMPORT-SETS-API.md](./IMPORT-SETS-API.md).

---

## When to Use

- Configuring external LDAP directory connections in ServiceNow
- Setting up LDAP server configs, connection URLs, failover, or load balancing
- Mentions of LDAP, Active Directory, OpenLDAP, or directory servers
- NOT for LDAP data imports — use importing-data knowledge for that

---

## Key Concepts

- **LDAP vendors:** `active_directory`, `open_ldap`, `sun`, `edirectory`, `domino`, `other` — determines how responses are interpreted
- **Connection modes:** Standard (`ldap://`, port 389) vs Secure (`ldaps://`, port 636)
- **URL ordering:** Different order values = failover (priority-based); same order = load balancing (distributed)
- **Record object references:** Pass the variable from `Record()` calls as the `server` field, never sys_id strings
- **Relationship to data import:** LDAP server config → LDAP OU config → Data Source (see importing-data skill for full chain)

---

## Instructions

### LDAP Server Configuration

1. Every config requires at minimum: `name`, `server_url`, `dn`, `password`, and `vendor`
2. Always set `password: ''` with a `// LEAVE EMPTY` comment — passwords are set manually in ServiceNow after deployment
3. Set the `vendor` field to match the directory server type
4. Enable `paging: true` for directories with large result sets (>1000 entries)
5. Set `ssl: true` and use `ldaps://` URLs with port 636 for production; only use `ldap://` (port 389) for development
6. Configure `connect_timeout` and `read_timeout` appropriate to network conditions (defaults: 10s connect, 30s read)

### LDAP URL Management

7. LDAP Server URL records are optional — only create them for failover or load balancing
8. For **failover**: assign different `order` values (e.g., 100, 200, 300) — lower order tried first
9. For **load balancing**: assign the same `order` value to all URLs
10. Always include protocol (`ldap://` or `ldaps://`) and port in the URL field

### Record References

11. Always reference LDAP server config via the record object variable, never by hardcoded sys_id
12. When defined in a separate file, import it and use the imported variable as the `server` field value

---

## Avoidance

- **NEVER** use `ldap://` (unencrypted) for production — always use `ldaps://` with port 636
- **NEVER** omit protocol or port from LDAP URLs
- **NEVER** hardcode sys_id strings in the `server` field
- **NEVER** create `ldap_server_url` records without an existing `ldap_server_config`
- **NEVER** include passwords in generated code — always leave empty with a comment

---

## LDAP Server Config API Reference

Table: `ldap_server_config`

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique name for the configuration |
| `server_url` | string | LDAP server URL (e.g., `'ldap://ldap.example.com'`) |
| `dn` | string | Distinguished Name for binding |
| `password` | string | Binding password — **always leave empty `''` in code** |
| `vendor` | string | Server vendor: `'active_directory'`, `'open_ldap'`, `'sun'`, `'edirectory'`, `'domino'`, `'other'` |

### Common Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `active` | boolean | `true` | Whether the server is active |
| `authenticate` | boolean | `true` | Whether to authenticate |
| `connect_timeout` | number | `10` | Connection timeout in seconds |
| `read_timeout` | number | `30` | Read timeout in seconds |
| `listener` | boolean | `false` | Enable LDAP event listener |
| `paging` | boolean | `true` | Use paged results |
| `ssl` | boolean | `false` | Use SSL (set `true` for production) |
| `listen_interval` | number | `5` | Polling interval in minutes |
| `rdn` | string | — | Root DN (e.g., `'dc=example,dc=com'`) |
| `attributes` | string | — | Additional LDAP attributes to retrieve |

---

## LDAP Server URL API Reference

Table: `ldap_server_url`

### Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `server` | reference | Yes | — | Reference to `ldap_server_config` record variable |
| `url` | string | Yes | — | LDAP URL (e.g., `'ldaps://server:636'`) |
| `active` | boolean | No | `true` | Whether URL is active |
| `order` | integer | No | `100` | Priority (lower = tried first); equal values = load balancing |
| `operational_status` | boolean | No | `true` | Whether operationally available |

---

## Examples

### Active Directory (Basic Config)

```typescript
import { Record } from '@servicenow/sdk/core'

export const adLdapConfig = Record({
  $id: Now.ID['ad-ldap-config'],
  table: 'ldap_server_config',
  data: {
    name: 'Corporate AD',
    server_url: 'ldap://ad.corporate.com',
    dn: 'CN=Service Account,CN=Users,DC=corp,DC=corporate,DC=com',
    password: '',  // LEAVE EMPTY - User will set manually
    vendor: 'active_directory',
    active: true,
    authenticate: true,
    connect_timeout: 10,
    read_timeout: 30,
    paging: true,
    ssl: false,
    rdn: 'DC=corp,DC=corporate,DC=com',
    attributes: 'mail,telephoneNumber,department,title',
  },
})
```

### OpenLDAP with SSL

```typescript
export const openLdapConfig = Record({
  $id: Now.ID['openldap-ssl-config'],
  table: 'ldap_server_config',
  data: {
    name: 'OpenLDAP with SSL',
    server_url: 'ldaps://ldap.example.com:636',
    dn: 'cn=admin,dc=example,dc=com',
    password: '',  // LEAVE EMPTY
    vendor: 'open_ldap',
    active: true,
    ssl: true,
    connect_timeout: 15,
    read_timeout: 45,
    rdn: 'dc=example,dc=com',
  },
})
```

### Complete Config with Primary URL + Failover Pattern

```typescript
import '@servicenow/sdk/global'
import { Record } from '@servicenow/sdk/core'

export const corporateLdapConfig = Record({
  $id: Now.ID['corporate-ldap-config'],
  table: 'ldap_server_config',
  data: {
    name: 'Corporate LDAP',
    server_url: 'ldap://ldap-primary.example.com:389',
    dn: 'cn=service-account,dc=corp,dc=example,dc=com',
    password: '',  // LEAVE EMPTY
    vendor: 'active_directory',
    active: true,
    authenticate: true,
    connect_timeout: 10,
    read_timeout: 30,
    paging: true,
    rdn: 'dc=corp,dc=example,dc=com',
  },
})

// Failover URLs (different order = priority-based)
export const primaryLdapUrl = Record({
  $id: Now.ID['primary-ldap-url'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,  // Reference to config above
    url: 'ldaps://ldap-primary.example.com:636',
    active: true,
    order: 100,
    operational_status: true,
  },
})

export const secondaryLdapUrl = Record({
  $id: Now.ID['secondary-ldap-url'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-secondary.example.com:636',
    active: true,
    order: 200,  // Higher = tried second
  },
})

export const tertiaryLdapUrl = Record({
  $id: Now.ID['tertiary-ldap-url'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-tertiary.example.com:636',
    active: true,
    order: 300,  // Last resort
  },
})
```

### Load Balancing Pattern (Same Order Values)

```typescript
// All URLs have the same order = distributed load balancing
Record({
  $id: Now.ID['ldap-lb-url-1'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-lb1.example.com:636',
    active: true,
    order: 100,  // Same priority
  },
})

Record({
  $id: Now.ID['ldap-lb-url-2'],
  table: 'ldap_server_url',
  data: {
    server: corporateLdapConfig,
    url: 'ldaps://ldap-lb2.example.com:636',
    active: true,
    order: 100,  // Same priority = load balancing
  },
})
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `ldap_server_config` | Main LDAP server configuration |
| `ldap_server_url` | LDAP server URLs (failover/load balancing) |
| `ldap_ou_config` | LDAP Organizational Unit configuration |
| `sys_user_ldap` | LDAP user records |
| `ldap_server_stats` | LDAP server statistics |
