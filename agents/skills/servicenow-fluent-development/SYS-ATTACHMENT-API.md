# SysAttachment API

Defines `sys_attachment` metadata that deploys a static file as an attachment linked to a specific ServiceNow record.

```ts
import { SysAttachment } from '@servicenow/sdk/core'
```

---

## Overview

`SysAttachment` ships a local file from your project as an attachment to a target record in ServiceNow. The file is read from `filePath` at build time and deployed alongside your application metadata.

Common use cases:
- Attaching default templates or documents to catalog items
- Pre-loading images or icons linked to a configuration record
- Seeding knowledge articles with attached reference files

---

## Properties Reference

All properties are required.

| Property | Type | Description |
|----------|------|-------------|
| `id` | String | Unique identifier for this attachment record |
| `fileName` | String | The filename as it will appear in ServiceNow |
| `contentType` | String | MIME type of the file (e.g., `'image/png'`, `'application/pdf'`, `'text/plain'`) |
| `filePath` | String | Path to the local file, relative to the `.now.ts` file |
| `tableName` | String | Name of the table that the attachment is linked to |
| `tableSysId` | String | `sys_id` of the specific record the attachment is linked to |

> **Note:** `SysAttachment` uses `id` (not `$id` like most other Fluent metadata objects). There is no `Now.ID[]` reference needed — provide a plain string identifier.

---

## Examples

### Attaching a PDF to a catalog item

```ts
import { SysAttachment } from '@servicenow/sdk/core'

export const laptopRequestGuide = SysAttachment({
  id: 'attach.laptop_request_guide',
  fileName: 'laptop-request-guide.pdf',
  contentType: 'application/pdf',
  filePath: './assets/laptop-request-guide.pdf',
  tableName: 'sc_cat_item',
  tableSysId: '1234567890abcdef1234567890abcdef',
})
```

### Attaching a default image to a record

```ts
import { SysAttachment } from '@servicenow/sdk/core'

export const appIcon = SysAttachment({
  id: 'attach.app_icon',
  fileName: 'app-icon.png',
  contentType: 'image/png',
  filePath: './assets/app-icon.png',
  tableName: 'sys_app',
  tableSysId: 'abcdef1234567890abcdef1234567890',
})
```

### Attaching a text template

```ts
import { SysAttachment } from '@servicenow/sdk/core'

export const emailTemplate = SysAttachment({
  id: 'attach.welcome_email_template',
  fileName: 'welcome-email.html',
  contentType: 'text/html',
  filePath: './templates/welcome-email.html',
  tableName: 'sys_email_account',
  tableSysId: 'fedcba0987654321fedcba0987654321',
})
```

---

## Common MIME Types

| File type | `contentType` value |
|-----------|-------------------|
| PDF | `'application/pdf'` |
| PNG image | `'image/png'` |
| JPEG image | `'image/jpeg'` |
| GIF image | `'image/gif'` |
| SVG image | `'image/svg+xml'` |
| Plain text | `'text/plain'` |
| HTML | `'text/html'` |
| CSV | `'text/csv'` |
| JSON | `'application/json'` |
| ZIP archive | `'application/zip'` |
| Word document | `'application/vnd.openxmlformats-officedocument.wordprocessingml.document'` |
| Excel spreadsheet | `'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'` |

---

## Best Practices

- **Keep attached files small** — large files increase build and deployment time; for large assets consider referencing an external URL instead
- **Use relative paths** for `filePath` so the project remains portable across machines
- **Verify `tableSysId`** — attaching to the wrong record `sys_id` causes silent failures on deployment; double-check the target record's sys_id on your instance

---

## Related APIs

- [Now.attach()](./API-REFERENCE.md) — For attaching images to application scope records using `Now.attach(imageFile)` (different from SysAttachment — used for app-level images, not record attachments)
- [Record API](./ADVANCED-PATTERNS.md) — For creating records that the attachment will be linked to
