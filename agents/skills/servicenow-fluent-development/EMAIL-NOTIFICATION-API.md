# Email Notification API

The **Email Notification API** defines notifications (`sysevent_email_action`) that send automated emails based on database operations, custom events, or manual triggers.

For general information about email notifications, see [Email and SMS notifications](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_EmailNotifications.html) in the ServiceNow documentation.

## Related Concepts

- **ServiceNow Fluent** — Metadata-as-code using Fluent SDK
- **EmailNotification object** — Core object for creating email notifications
- **Fluent Language Constructs** — `Now.ID`, `Now.ref`, `Now.include` for metadata references

---

## EmailNotification Object

Create an email notification (`sysevent_email_action`) specifying when to send it, who receives it, what it contains, and if it can be delivered in an email digest.

For general information about creating email notifications, see the ServiceNow [Create an email notification](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/task/t_CreateEmailNotification.html) documentation.

### Properties

| Name | Type | Description |
|------|------|-------------|
| **table** | Reference or String | **Required.** The variable identifier or name of a table to which the notification applies. To define a table, use the Table API. **Note:** Don't select the Task `[task]` table, which is for extending other tables. Notifications that run on the Task table directly aren't supported. |
| **triggerConditions** | Object | **Required.** The conditions that trigger the notification. See [triggerConditions object](#triggerconditions-object). |
| **name** | String | A unique name for the email notification. |
| **description** | String | A description of the purpose of the email notification. |
| **category** | Reference or String | The variable identifier or name of a notification category for grouping notifications. Default: The default email category (`c97d83137f4432005f58108c3ffa917a`). |
| **notificationType** | String | The type of notification. Valid values: `email` (standard email), `vcalendar` (meeting invitation — not supported with email digests). Default: `email`. |
| **active** | Boolean | Flag that indicates whether the notification is active. Default: `true`. |
| **mandatory** | Boolean | Flag that indicates whether the notification is required. Default: `false`. |
| **enableDynamicTranslation** | Boolean | Flag that indicates whether to enable dynamic translation for the notification. Default: `false`. |
| **emailContent** | Object | The email content and formatting. See [emailContent object](#emailcontent-object). |
| **recipientDetails** | Object | The email recipients. See [recipientDetails object](#recipientdetails-object). |
| **digest** | Object | The email digest content and formatting. See [digest object](#digest-object). |
| **$meta** | Object | Metadata for the application metadata. With the `installMethod` property, you can map the application metadata to an output directory that loads only in specific circumstances. Valid values for `installMethod`: `demo` (outputs to `metadata/unload.demo`), `first install` (outputs to `metadata/unload` on first install only). |

### Basic Example

```typescript
import { EmailNotification } from '@servicenow/sdk/core'

EmailNotification({
    table: 'incident',
    name: 'Custom Event Notification',
    description: 'Triggered by custom event',
    category: 'c97d83137f4432005f58108c3ffa917a',  // Default email category sys_id
    triggerConditions: {
        generationType: 'event',
        eventName: 'custom.incident.escalated',
        order: 100
    },
    recipientDetails: {
        recipientUsers: ['6816f79cc0a8016401c5a33be04be441'],  // Admin user sys_id
        eventParm1WithRecipient: true,  // Event param 1 contains recipient
        isSubscribableByAllUsers: true
    },
    emailContent: {
        contentType: 'text/html',
        subject: 'Incident Escalated',
        messageHtml: '<p>An incident has been escalated.</p>'
    }
})
```

---

## Trigger Types

### Engine-Based (`generationType: 'engine'`)

Auto-triggers on record insert/update. The notification engine handles triggering automatically — **do not create business rules** to trigger engine-based notifications. Most common type for standard CRUD operations.

Choose when:
- Notification should fire on record insert/update
- No custom business logic needed to determine when to send
- Standard CRUD operation monitoring

### Event-Based (`generationType: 'event'`)

Triggers on custom ServiceNow events. Requires the Event Registry to register the event first. Requires a Business Rule (or equivalent) to fire the event via `gs.eventQueue()`.

Choose when:
- Custom workflow events trigger notification
- Complex business logic determines when to send
- Event parameters contain recipient information

### Triggered (`generationType: 'triggered'`)

Manual/script-triggered. Requires explicit triggering logic via scripts or business rules. Other trigger properties (`onRecordInsert`, `onRecordUpdate`, etc.) don't apply.

Choose when:
- Manual/on-demand sending required
- Script-controlled timing needed
- Maximum control over when notification sends

---

## triggerConditions Object

Configure the conditions that must be met for the notification to be sent.

**Important:** If the same trigger generates multiple notifications, the system sends only one notification. The system considers all other notifications, even if they have a different subject and body, as duplicates. The **Ignore Duplicates** business rule controls this functionality.

### Properties

| Name | Type | Description |
|------|------|-------------|
| **generationType** | String | **Required.** The method of triggering the email notification. Valid values: `engine` (sends when record inserted/updated), `event` (sends when custom events occur), `triggered` (manually triggered — other properties don't apply). |
| **onRecordInsert** | Boolean | Flag that indicates whether to send the notification when a record is inserted. **Note:** Either this or `onRecordUpdate` must be `true`. Default: `false`. |
| **onRecordUpdate** | Boolean | Flag that indicates whether to send the notification when a record is updated. **Note:** Either this or `onRecordInsert` must be `true`. Default: `false`. |
| **eventName** | String | The name of a custom event to trigger sending the notification. **Required if** `generationType` is `event`. |
| **affectedFieldOnEvent** | String | The event parameter that contains the affected field. **Applies only if** `generationType` is `event`. Valid values: `parm1`, `parm2`. |
| **weight** | Number | The notification priority relative to duplicate notifications. Notifications with the same target table and recipients are considered duplicates if weights differ. If weights are the same, additional evaluation checks if the subject and body (excluding watermark) are identical. When duplicate notifications exist, the system sends only the notification with the highest weight; all others move from Outbox to Skipped mailbox. Default: `0` (sends the notification). Maximum: `1000`. |
| **condition** | String | A filter query specifying fields and values that must be true for the notification. Supports operators available for filters and queries. |
| **advancedCondition** | String | A JavaScript conditional statement that must return `true` or set a global `answer` variable to `true` to send the notification. **Important:** This property is evaluated in addition to other conditions. Both `condition` and `advancedCondition` must evaluate to `true` to send the notification. |
| **itemTable** | Reference or String | The variable identifier or name of the table to which the notification item refers. |
| **item** | String | The item to use for the notification context. |
| **order** | Number | The execution order of the notification. Default: `100`. Maximum: `9999`. |

### Example: Engine-Based Trigger (Record Update)

```typescript
triggerConditions: {
    generationType: "engine",
    onRecordInsert: false,
    onRecordUpdate: true,
    weight: 100,
    condition: "priority=1^ORpriority=2^state!=6^state!=7", // High/Critical priority, not resolved/closed
    order: 100
}
```

### Example: Event-Based Trigger

```typescript
triggerConditions: {
    generationType: "event",
    eventName: "custom.incident.escalated",
    affectedFieldOnEvent: "parm1",
    weight: 50,
    order: 200
}
```

---

## emailContent Object

Configure the contents of an email notification.

### Properties

| Name | Type | Description |
|------|------|-------------|
| **contentType** | String | The type of email content. Valid values: `text/html`, `text/plain`, `multipart/mixed`. Default: `text/html`. |
| **template** | Reference or String | The variable identifier or sys_id of an email template (`sysevent_email_template`). Can only reference a template that: (1) has the same scope and table as the notification, (2) has the same scope but no specified table, or (3) has the same table and is in the global scope. |
| **style** | Reference or String | The variable identifier or sys_id of an email style (`sys_email_style`). |
| **subject** | String | A subject line for the email. If empty, the system uses the Subject value from the email template. Supports `${variable}` format for variable references (map to column names from the notification table, parent tables, and reference tables). |
| **smsAlternate** | String | A notification message for SMS devices (limited to 140 characters). If empty, uses SMS alternate from template. Supports `${variable}` format. |
| **importance** | String | The level of importance of the message. Valid values: `low`, `high`. |
| **includeAttachments** | Boolean | Flag that indicates whether to include attachments from the notification trigger record. Default: `false`. |
| **omitWatermark** | Boolean | Flag that indicates whether to omit the watermark attached to each email. Default: `false`. |
| **from** | String | The email address from which to send the notification. |
| **replyTo** | String | The email address to which recipients can reply. |
| **pushMessageOnly** | Boolean | Flag that indicates whether to send the notification only as a push notification to a mobile device. Default: `false`. |
| **pushMessageList** | Array | A list of variable identifiers or sys_ids of push messages (`sys_push_notif_msg`). **Note:** Push message and notification must be for the same table. |
| **forceDelivery** | Boolean | Flag that indicates whether to bypass user notification preferences and send the notification anyway. Default: `false`. |
| **messageHtml** | String | The HTML content of the notification message. If empty, uses message HTML from template. Supports `${variable}` format. **Required if** `contentType` is `text/html` or `multipart/mixed`. |
| **messageText** | String | The plain text content of the notification message. If empty, uses message text from template. Supports `${variable}` format. **Required if** `contentType` is `text/plain` or `multipart/mixed`. |
| **message** | String | **Deprecated.** Message contents. Use `messageHtml` or `messageText` instead. |

### Example: Critical Incident Notification

```typescript
emailContent: {
    contentType: "text/html",
    subject: "CRITICAL: Incident ${number} - ${short_description}",
    messageHtml: `
        <div style="background-color: #ff4444; color: white; padding: 10px; border-radius: 5px;">
            <h2>CRITICAL INCIDENT ALERT</h2>
            <p><strong>Incident:</strong> ${number}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Description:</strong> ${short_description}</p>
            <p><strong>Assigned To:</strong> ${assigned_to.name}</p>
            <p><strong>Created:</strong> ${sys_created_on}</p>
            <p><a href="${instance_url}/incident.do?sys_id=${sys_id}" style="color: #ffffff; text-decoration: underline;">View Incident</a></p>
        </div>
    `,
    smsAlternate: "CRITICAL: Incident ${number} - ${short_description}. Priority: ${priority}. Assigned: ${assigned_to.name}",
    pushMessageList: ["mobile_push_notification_sys_id"],
    forceDelivery: true,
    importance: "high"
}
```

---

## recipientDetails Object

Configure who receives an email notification.

**Important:** Notification recipients must be active users defined in the User (`sys_user`) table with a valid email address in the Notification Device (`cmn_notif_device`) table. Recipients must also have appropriate notification preferences enabled.

### Properties

| Name | Type | Description |
|------|------|-------------|
| **recipientUsers** | Array | A list of variable identifiers, sys_ids of users (`sys_user`), or email addresses to receive the notification. |
| **recipientFields** | Array | A list of fields that reference users or user groups to receive the notification. Fields must be reference fields. Example: for the Incident table, use `opened_by` to send to the user who opened the incident. Can also select fields with email address strings. |
| **recipientGroups** | Array | A list of variable identifiers or sys_ids of user groups (`sys_user_group`) to receive the notification. **Note:** Group members receive individual notifications only if "Include members" is selected in the group record. |
| **excludeDelegates** | Boolean | Flag that indicates whether to exclude delegated users. Set to `true` to prevent sending to delegates of selected users and group members. Default: `false`. |
| **isSubscribableByAllUsers** | Boolean | Flag that indicates whether to allow all users to subscribe to the notification. **Important:** If the record contains sensitive data, restrict the recipient list to users/groups with normal access, leaving this as `false`. Consider inserting a link to the record instead of revealing details in the notification. Default: `false`. |
| **sendToCreator** | Boolean | Flag that indicates whether to send the notification to the person who performed the action that started the notification process (if the person is also a recipient). If the event creator isn't in a recipient field, they don't receive a notification regardless of this setting. Default: `false`. |
| **eventParm1WithRecipient** | Boolean | Flag that indicates whether event parameter 1 contains one or more notification recipients. **Applies only to event-based notifications.** |
| **eventParm2WithRecipient** | Boolean | Flag that indicates whether event parameter 2 contains one or more notification recipients. **Applies only to event-based notifications.** |

### Example: Incident Notification to IT Support

```typescript
recipientDetails: {
    recipientGroups: ["d625dccec0a8016700a222a0f7900d06"], // IT Support group sys_id
    recipientFields: ["assigned_to", "caller_id"],
    sendToCreator: false,
    isSubscribableByAllUsers: false
}
```

---

## digest Object

Configure the contents of an email digest that summarizes activity for a selected notification and its target records during a specified time interval.

For general information about email digests, see the ServiceNow [Email digests](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_EmailDigests.html) documentation.

### Properties

| Name | Type | Description |
|------|------|-------------|
| **allow** | Boolean | Flag that indicates whether users can receive this notification as a digest. If `false`, all other digest properties are ignored. Default: `false`. |
| **default** | Boolean | Flag that indicates whether digest mode is enabled by default for this notification. Default: `false`. |
| **type** | String | The type of digest. Valid values: `single` (summarizes multiple triggers for a single target record, e.g., INC001 only), `multiple` (summarizes multiple triggers for multiple target records, e.g., INC001, INC002, etc.). |
| **defaultInterval** | Reference or String | The variable identifier or sys_id of a digest interval (`sys_email_digest_interval`) to use as the default time interval for digest delivery. |
| **subject** | String | A subject line for the email digest. If empty, uses the Subject value from the email template. Supports `${variable}` format. |
| **html** | String | The HTML content of the email digest. Supports `${variable}` format. |
| **text** | String | The plain text content of the email digest. Supports `${variable}` format. |
| **template** | String | The variable identifier or sys_id of an email template (`sysevent_email_template`). |
| **separatorHtml** | String | An HTML separator between items in the digest. Default: `<p>&nbsp;</p>\n<hr>\n<p>&nbsp;</p>`. Supports `${variable}` format. |
| **separatorText** | String | A plain text separator between items in the digest. Default: `--------------------------------------------------------------------------------\n`. Supports `${variable}` format. |
| **from** | String | The email address from which to send the digest. |
| **replyTo** | String | The email address to which recipients can reply. |

### Example: Incident Escalation Digest

```typescript
digest: {
    allow: true,
    defaultInterval: hourlyDigest,
    template: escalationTemplate,
    subject: "Incident Escalation Digest - ${digest_count} incidents require attention",
    html: `<div>
           <div>Incident Escalation Digest</div>
           </div>`,
    separatorHtml: '<hr style="margin: 15px 0;">',
    from: "noreply@company.com",
    replyTo: "itsupport@company.com"
}
```

---

## Calendar Invitations (vCalendar)

Set `notificationType: 'vcalendar'` to send meeting invitations instead of standard emails. vCalendar notifications are **not supported** with email digests.

### Example

```typescript
import { EmailNotification } from '@servicenow/sdk/core'

EmailNotification({
    $id: Now.ID['incident-review-meeting'],
    table: 'incident',
    name: 'Incident Review Meeting',
    notificationType: 'vcalendar',
    triggerConditions: {
        generationType: 'event',
        eventName: 'incident.severity.1',
        condition: 'active=true^EQ'
    },
    recipientDetails: {
        recipientFields: ['assignment_group', 'assigned_to']
    },
    emailContent: {
        subject: 'Incident ${number} Review Meeting',
        messageHtml: '<div>You are invited to review incident ${number}</div>'
    }
})
```

---

## Supporting Record Types

These are created using the `Record` API, not dedicated Fluent constructors.

### Email Template (`sysevent_email_template`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Template name (max 100, unique). |
| `subject` | `String` | No | Email subject (max 100). |
| `message_html` | `HTMLScript` | No | HTML message (max 4000). |
| `message_text` | `EmailScript` | No | Plain text message (max 4000). |
| `collection` | `TableName` | No | Target table. Default: `'incident'`. |
| `sys_version` | `String` | No | Version. Default: `'2'`. |
| `email_layout` | `Reference` | No | Reference to `sys_email_layout`. |

### Email Style (`sysevent_email_style`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Style name (max 100, unique). |
| `style` | `HTML` | No | CSS/HTML style content (max 65000). |

### Email Script (`sys_script_email`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Script name (max 100, unique). |
| `script` | `String` | No | Script contents (max 4000). |
| `new_lines_to_html` | `Boolean` | No | Convert newlines to HTML. Default: `false`. |

The script must maintain the structure `(function runMailScript(current, template, email, email_action, event) {...})(current, template, email, email_action, event);` and use `template.print()` to output content.

### Email Access Restriction (`email_access_restriction`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notification` | `Reference` | Yes | Reference to `sysevent_email_action`. |
| `conditions` | `Conditions` | Yes | Access conditions (max 8000). |
| `description` | `String` | No | Description (max 1000). |

Only one restriction per notification. Combine multiple conditions using `^` (AND) or `^OR` (OR). Do not use `Now.ID` for the notification field — use `notificationVariable.$id` or a queried sys_id.

### Email Digest Interval (`sys_email_digest_interval`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `TranslatedText` | Yes | Interval name (max 100, unique). |
| `interval` | `GlideDuration` | Yes | Duration in format `YYYY-MM-DD HH:MM:SS`. |

Common intervals: Hourly `1970-01-01 01:00:00`, Daily `1970-01-02 00:00:00`, Weekly `1970-01-08 00:00:00`. Range: one hour to one week.

### Notification Category (`sys_notification_category`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `String` | Yes | Category name (max 32, unique). |
| `short_description` | `String` | No | Short description (max 1000). |

Default category sys_id: `c97d83137f4432005f58108c3ffa917a`.

### Template Example

```typescript
import { EmailNotification, Record } from '@servicenow/sdk/core'

const incidentTemplate = Record({
    $id: Now.ID['incident_update_template'],
    table: 'sysevent_email_template',
    data: {
        name: 'Incident Update Template',
        subject: 'Incident \${number} has been updated',
        message_html: `<h1>Incident Update</h1>
            <p>Incident \${number} has been updated:</p>
            <ul>
                <li>State: \${state}</li>
                <li>Priority: \${priority}</li>
                <li>Assigned To: \${assigned_to}</li>
            </ul>`,
        collection: 'incident',
        sys_version: '2'
    }
})

EmailNotification({
    $id: Now.ID['incident-with-template'],
    table: 'incident',
    name: 'Incident Notification With Template',
    active: true,
    triggerConditions: {
        generationType: 'engine',
        onRecordUpdate: true
    },
    recipientDetails: {
        recipientFields: ['assigned_to']
    },
    emailContent: {
        template: incidentTemplate
    }
})
```

---

## Complete Example: Critical Incident Notification with Digest

```typescript
import { EmailNotification } from '@servicenow/sdk/core'

export const criticalIncidentNotification = EmailNotification({
    $id: Now.ID['notification.critical_incident'],
    table: 'incident',
    name: 'Critical Incident Notification',
    description: 'Notifies IT Support of critical incidents requiring immediate attention',
    active: true,
    mandatory: false,

    triggerConditions: {
        generationType: "engine",
        onRecordInsert: true,
        onRecordUpdate: true,
        weight: 100,
        condition: "priority=1^ORpriority=2^state!=6^state!=7", // Critical/High, not resolved/closed
        advancedCondition: "answer = (current.priority.getDisplayValue() === '1 - Critical' || current.priority.getDisplayValue() === '2 - High')",
        order: 100
    },

    emailContent: {
        contentType: "text/html",
        subject: "🚨 CRITICAL: Incident ${number} - ${short_description}",
        messageHtml: `
            <div style="background-color: #ff4444; color: white; padding: 15px; border-radius: 5px; font-family: Arial, sans-serif;">
                <h2>⚠️ CRITICAL INCIDENT ALERT</h2>
                <hr style="border: none; border-top: 2px solid white;">
                <table style="width: 100%; color: white;">
                    <tr><td><strong>Incident:</strong></td><td>${number}</td></tr>
                    <tr><td><strong>Priority:</strong></td><td>${priority}</td></tr>
                    <tr><td><strong>Description:</strong></td><td>${short_description}</td></tr>
                    <tr><td><strong>Assigned To:</strong></td><td>${assigned_to.name}</td></tr>
                    <tr><td><strong>Created:</strong></td><td>${sys_created_on}</td></tr>
                </table>
                <hr style="border: none; border-top: 2px solid white; margin-top: 15px;">
                <p><a href="${instance_url}/incident.do?sys_id=${sys_id}" style="color: #ffffff; text-decoration: underline; font-weight: bold;">👉 View Full Incident Details</a></p>
            </div>
        `,
        smsAlternate: "CRITICAL: Incident ${number} - ${short_description}. Priority: ${priority}. Assigned: ${assigned_to.name}",
        importance: "high",
        forceDelivery: true,
        includeAttachments: true
    },

    recipientDetails: {
        recipientGroups: ["d625dccec0a8016700a222a0f7900d06"], // IT Support group
        recipientFields: ["assigned_to", "caller_id"],
        sendToCreator: false,
        excludeDelegates: true,
        isSubscribableByAllUsers: false
    },

    digest: {
        allow: true,
        default: true,
        type: "multiple",
        defaultInterval: Now.ref('sys_email_digest_interval', { name: 'hourly' }),
        subject: "📊 Incident Digest - ${digest_count} Critical Incidents",
        html: `
            <h3>Critical Incidents Summary (Hourly)</h3>
            <p>The following critical incidents require attention:</p>
        `,
        separatorHtml: '<hr style="margin: 15px 0; border: 1px solid #ccc;">',
        from: "noreply@company.com",
        replyTo: "itsupport@company.com"
    }
})
```

---

## InboundEmailAction Object

Create an Inbound Email Action record (`sys_email_action`) that defines how ServiceNow processes incoming emails — creating records, updating existing records, or running custom logic when emails are received.

**Import from** `@servicenow/sdk/core`:

```ts
import { InboundEmailAction } from '@servicenow/sdk/core'
```

### Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `$id` | String or Number | Yes | — | Unique identifier for the record. |
| `action` | String | Yes | `'record_action'` | Action type. Valid values: `'record_action'` (creates/updates a record), `'reply_email'` (sends auto-reply). |
| `name` | String | No | — | Name of the inbound email action. |
| `description` | String | No | — | Documentation explaining the purpose and function of the action. |
| `table` | String | No | — | Target table the action operates on (e.g., `'incident'`). |
| `type` | String | No | `'new'` | When to trigger. Valid values: `'new'`, `'reply'`, `'forward'`. |
| `active` | Boolean | No | `false` | Whether the inbound email action is active. |
| `order` | Number | No | `100` | Execution order when multiple inbound actions match. |
| `eventName` | String | No | `'email.read'` | Event name that triggers this action. |
| `stopProcessing` | Boolean | No | `false` | When `true`, stops processing subsequent inbound email actions after this one executes. |
| `conditionScript` | String | No | — | Condition that must evaluate to `true` for the action to execute. |
| `filterCondition` | String | No | — | Encoded query string to filter which records this action applies to. |
| `from` | String or Record | No | — | Restrict to emails from a specific user (GUID or Record reference). |
| `requiredRoles` | Array | No | — | Roles the sender must have for the action to trigger. |
| `script` | String or Function | No | — | Script executed when the action triggers. Available objects: `current` (GlideRecord), `event` (sysevent), `email` (EmailWrapper), `logger` (ScopedEmailLogger), `classifier` (EmailClassifier). Supports `Now.include()` and module function imports. |
| `fieldAction` | String | No | — | Field action template defining field values to set on the target record. Uses encoded query format with support for static values (`field=value`), dynamic values (`fieldDYNAMIC<sys_id>`), and datetime values. Only available for `'record_action'` action type. |
| `assignmentOperator` | String | No | — | Assignment operator for field actions. Only available for `'record_action'`. |
| `replyEmail` | String | No | — | HTML content for auto-reply emails. Only available for `'reply_email'` action type. |

### Example: Record Action with Field Actions

```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

export const createIncidentFromEmail = InboundEmailAction({
    $id: Now.ID['create-incident-from-email'],
    name: 'Create Incident from Email',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    order: 100,
    fieldAction: 'short_descriptionDYNAMICb637bd21ef3221002841f7f775c0fbb6^priority=2^EQ',
})
```

### Example: Auto-Reply

```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

export const autoReply = InboundEmailAction({
    $id: Now.ID['auto-reply-on-email'],
    name: 'Auto Reply to Sender',
    action: 'reply_email',
    type: 'new',
    active: true,
    order: 200,
    replyEmail: '<p>Thank you for contacting us. We have received your email and will respond shortly.</p>',
})
```

### Example: Script-Based Processing

```typescript
import { InboundEmailAction } from '@servicenow/sdk/core'

export const scriptAction = InboundEmailAction({
    $id: Now.ID['script-email-action'],
    name: 'Process Inbound Email',
    action: 'record_action',
    table: 'incident',
    type: 'new',
    active: true,
    script: Now.include('../../server/email-actions/process-email.js'),
})
```

---

## Best Practices

1. **Table Selection** — Avoid using the Task table directly; notifications on Task aren't supported
2. **Duplicate Management** — Use `weight` property strategically to control which notification is sent when duplicates are detected
3. **Recipient Security** — Don't expose sensitive data in emails; use links back to the record instead
4. **Variable References** — Use `${variable}` format for field references; supports notation like `${assigned_to.name}` for reference fields
5. **Conditional Logic** — Use `advancedCondition` for complex business logic requiring JavaScript evaluation
6. **Digest Configuration** — Enable digests for high-volume notifications to reduce email flooding
7. **Performance** — Test notifications with large datasets; use filters and conditions to limit scope
8. **Translation** — Enable `enableDynamicTranslation` if supporting multilingual users

---

## Related APIs

- **Table API** — Define tables that notifications reference
- **Record API** — Define email templates, styles, digest intervals, and categories
- **Fluent Language Constructs** — `Now.ID`, `Now.ref` for metadata references

## Reference

- [ServiceNow Email Notifications Documentation](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_EmailNotifications.html)
- [Email and SMS Notifications](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_EmailNotifications.html)
- [Create an Email Notification](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/task/t_CreateEmailNotification.html)
- [Email Digests](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_EmailDigests.html)
- [Advanced Conditions for Email Notifications](https://docs.servicenow.com/en-US/bundle/vancouver-platform-administration/page/administer/general-notification/concept/c_AdvancedConditionsEmailNotifications.html)
