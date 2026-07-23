---
name: nowdev-ai-toolbox-notification-delivery-diagnostic
user-invocable: true
description: Systematically diagnoses why a ServiceNow email, alert, notification, or message failed to reach a user. Use for missing notifications, dispatch failures, bounces, preference exclusions, or event trigger issues. It delegates read-only `now-sdk` retrieval to `nowdev-ai-toolbox-servicenow-sdk` and traces the delivery pipeline.
---

# ServiceNow Notification Delivery Diagnostic

This skill provides a systematic and comprehensive workflow to trace, diagnose, and troubleshoot why an expected email, alert, or notification failed to reach an intended recipient in ServiceNow. It operates strictly read-only and traces the entire lifecycle from event trigger to final SMTP delivery.

---

## Core Principles

1. **Strictly Read-Only Safeguard:** NEVER perform write, update, execute, insert, or delete operations on any ServiceNow instance while using this skill. Do NOT trigger a new event or attempt to resend an email. Use `now-sdk` only for read-only retrieval and diagnosis.
2. **SDK Authority:** Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
3. **Deterministic Step-by-Step Tracing:** Systematically retrieve and verify each link in the notification delivery pipeline. No guessing.
4. **Language Alignment / Multilingual Support:** ALWAYS communicate with the user, draft the final delivery trace report, and formulate recommended fixes in the exact language actively used by the user. Programmatic system tokens remain in their original technical form.

---

## The Diagnostic Pipeline & Workflow

Ask `nowdev-ai-toolbox-servicenow-sdk` to perform bounded, read-only retrievals stage by stage using the specification below.

### Stage 1: Trigger / Event Generation (`sysevent`)
Determine how the notification is triggered ("Generation type" in `sysevent_email_action` is either an insertion/update of a record or an explicit Event).
- If triggered by an Event, verify that the event record was successfully generated in the `sysevent` table.
- **Table:** `sysevent`
- **Fields:** `sys_id,name,table,state,processed,user_id,parm1,parm2,sys_created_on`
- **Filter intent:** Match the expected event name and source table or record, newest first.
- **Limit intent:** Five newest matching events.
- **Analysis:**
  - Did the event fire? If there is no matching record in `sysevent`, the trigger failed (meaning the Script Include, Business Rule, or Workflow that fires the event did not execute or had an error).
  - Verify that `state` holds a healthy processed status (e.g. `processed`). If the event is stuck in `ready` or ended in `error`, the system's event queue processor didn't execute it.

---

### Stage 2: Notification Action Rule Definition (`sysevent_email_action`)
Query the notification rule to verify active settings, conditions, and recipients.
- **Table:** `sysevent_email_action`
- **Fields:** `sys_id,name,active,generation_type,event_name,collection,condition,advanced_condition,recipient_users,recipient_groups,recipient_fields,event_parm_1,event_parm_2,send_self`
- **Filter intent:** Match the notification name or ID; include active state and trigger configuration.
- **Limit intent:** One exact notification definition.
- **Analysis:**
  - Is the notification record `active`? If `active=false`, the rule is disabled.
  - Review `collection` (table matches transaction table) and `generation_type` (ensuring it is set to `event` if triggered by an event, or `engine` if triggered by inserts/updates).
  - Inspect `condition` and `advanced_condition`. Could the record state have failed to meet the trigger filter?
  - Inspect `send_self` (Send to creator/event parm 1/2). If the transaction creator is the recipient and `send_self` is `false`, ServiceNow will deliberately suppress the notification.

---

### Stage 3: Email Generation (`sys_email_log` & `sys_email`)
Look up if an email record was actually created because of the event/notification trigger. Service email logs link the Event, Notification, and Email tables together.
- **Table:** `sys_email_log`
- **Fields:** `sys_id,notification,email,event,sys_created_on`
- **Filter intent:** Match the discovered event ID.
- **Limit intent:** Five matching log links.
- **Analysis:**
  - If a log entry exists, use the `email` field (which contains the `sys_id` of the `sys_email` record) to query the exact email.
  - If no log entry is found, query `sys_email` directly by using the expected recipient, subject, target table, or instance sys_id (the sys_id of the record like the specific incident):
- **Table:** `sys_email`
- **Fields:** `sys_id,subject,type,mailbox,recipients,state,user_id,target_table,instance,error_string,sys_created_on`
- **Filter intent:** Match target table and record ID, or expected recipient/subject when no event link exists; newest first.
- **Limit intent:** Five newest candidate emails.
  - If NO `sys_email` was generated, the notification action rule was evaluated but did not result in an email (typically due to recipient list resolving to empty, unsubscribed preferences, or condition mismatch).

---

### Stage 4: Recipient Exclusions & Profile Preferences (`sys_user` & `cmn_notif_device`)
If no email was generated or if a recipient is missing from the list, check the user's active configuration and preferences.
- **Tables & Fields:**
  - **User:** `sys_user` (`sys_id,name,email,active,notification,locked_out`)
  - **Device (Primary Email/Push):** `cmn_notif_device` (`sys_id,user,name,type,email_address,active,primary_email`)
  - **Preferences (Sub/Un-sub):** `cmn_notif_message` (`sys_id,user,device,notification,active`)
- **Filter intent:** Exact user ID for `sys_user`; active devices for that user in `cmn_notif_device`; user plus notification ID in `cmn_notif_message`.
- **Limit intent:** One exact user and up to five matching device or preference records.
- **Analysis:**
  - Is the user record `active=false` or `locked_out=true`?
  - Is `sys_user.notification` set to `1` (which represents "Disable")? (Standard is `2` for "Enable").
  - Does the recipient have a valid, active `cmn_notif_device` of type `Email`?
  - Does a subscription preference record `cmn_notif_message` exist indicating they have disabled or unsubscribed from this specific notification?

---

### Stage 5: Delivery Succeeded / Sending Status (`sys_email`)
If the email was generated, trace its outbox state to verify the mail server dispatched it.
- **Table:** `sys_email`
- **Fields:** `sys_id,type,mailbox,recipients,state,error_string,sys_created_on`
- **Analysis:**
  - Check `type`. Is it `sent`? If so, the dispatch was handed over to SMTP.
  - Is `type` set to `send-ignored`? (This usually happens if recipients are empty, if the recipient opted out, if SMTP sending is globally disabled, or if the email is suppressed via filter).
  - Is `type` set to `send-failed`? Look at the `error_string` for SMTP connection failures, SSL/TLS handshake rejects, bounce states, or bad email format records.
  - Is `mailbox` set to `outbox` with `type` as `send-ready`? The email is queued but the SMTP Sender job has not run yet.

---

## 4. Structuring the Diagnostic Report

Once the stages have been checked, synthesize the diagnostic findings using the layout below. Remember to translate all narrative and section headers into the user's active language while preserving the technical tables, fields, sys_ids, and command text exactly.

### Template Structure (Align to User's Language)

```markdown
# [Title: Notification Delivery Trace Report]
*Audited Application Scope: [scope_name if applicable]*
*Target Notification: [Notification Name / sys_id]*
*Target Recipient: [User Name / Email / sys_id]*
*Event / Trigger Source: [Event Name / Record sys_id]*

---

## 🚦 [Overall Pipeline Status / Overall Verdict]
- **[STATUS CHECK: e.g., EVENT FIRED BUT NOTIFICATION DISABLED / DELIVERED / SUPPRESSED BY USER PREFERENCE]**
- *A concise summary of where the delivery chain broke and why.*

---

## 📋 [Delivery Pipeline Trace]
| [Pipeline Stage] | [Table / Component] | [Audited Record / Criteria] | [Status] | [Observations] |
|---|---|---|---|---|
| **M1: Trigger Event** | `sysevent` | Event `[event_name]` | **[PASS/FAIL/SKIP]** | [e.g., Fired at sys_created_on, state is processed] |
| **M2: Notification Rule** | `sysevent_email_action` | Action `[notification_name]` | **[PASS/FAIL]** | [e.g., Active count, conditions checked] |
| **M3: Email Generation** | `sys_email_log` / `sys_email` | Record `[email_sys_id]` | **[PASS/FAIL]** | [e.g., 0 records created for user] |
| **M4: Recipient Config** | `sys_user` / `cmn_notif_device` | Preferences for `[user_name]` | **[PASS/FAIL]** | [e.g., notifications disabled inside sys_user] |
| **M5: Send/SMTP Dispatch** | `sys_email` | Mailbox state & send results | **[PASS/FAIL/SKIP]** | [e.g., Email marked sent or error_string listed] |

*(Fill each row of the trace pipeline meticulously based on your live query results).*

---

## 🔍 [Root Cause Analysis (RCA)]
> [Meticulously detail the exact reason they didn't receive the notification. Be explicit about why the chain broke at the specific stage identified above.]

---

## 🛠️ [Recommended Fix]
1. [Step-by-step instructions to remediate the issue.]
2. [Include exact field names and tables that require editing to restore notification delivery.]
3. [Remind the user of any further verification tests they should execute manually.]
```
