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
