---
name: nowdev-ai-toolbox-notification-delivery-diagnostic
user-invocable: true
description: Systematically diagnoses and traces why a ServiceNow email, alert, notification, or message failed to deliver or send to a user. Make sure to use this skill whenever the user mentions that a "notification/email didn't send", "user didn't get an email", "why wasn't X notified", or wants to troubleshoot any kind of missing notification, dispatch failure, email bounce, preference exclusion, or event trigger issues of the notification delivery pipeline. It runs strictly read-only 'now-sdk query' commands against tables like sysevent, sysevent_email_action, sys_email, sys_email_log, cmn_notif_device, and sys_user to isolate and report the exact point of delivery failure.
---

# ServiceNow Notification Delivery Diagnostic

This skill provides a systematic and comprehensive workflow to trace, diagnose, and troubleshoot why an expected email, alert, or notification failed to reach an intended recipient in ServiceNow. It operates strictly read-only and traces the entire lifecycle from event trigger to final SMTP delivery.

---

## Core Principles

1. **Strictly Read-Only Safeguard:** NEVER perform write, update, execute, insert, or delete commands on any ServiceNow instance while using this skill. Do NOT trigger a new event or attempt to resend an email. Only query data using `now-sdk query` and inspect definition/schemas using `now-sdk explain`. Only diagnose.
2. **Deterministic Step-by-Step Tracing:** Systematically query and verify each link in the notification delivery pipeline. No guessing.
3. **Language Alignment / Multilingual Support:** ALWAYS communicate with the user, draft the final delivery trace report, and formulate recommended fixes in the **exact language actively used by the user** in their conversation context (e.g., if the user asks or communicates in Danish, translate the overall verdict, table headers, root cause analysis, and recommendation text into Danish). Programmatic system tokens (such as table names, field names, sys_ids, or code blocks) must remain in their original technical/English form, but all prose and headers must align to the active language.

---

## The Diagnostic Pipeline & Workflow

Trace delivery failures stage-by-stage using `now-sdk query` (always outputting `-o json` and limiting to 10-25 results by default to save token context).

### Stage 1: Trigger / Event Generation (`sysevent`)
Determine how the notification is triggered ("Generation type" in `sysevent_email_action` is either an insertion/update of a record or an explicit Event).
- If triggered by an Event, verify that the event record was successfully generated in the `sysevent` table.
- **Table:** `sysevent`
- **Fields:** `sys_id,name,table,state,processed,user_id,parm1,parm2,sys_created_on`
- **Example Command:**
  ```bash
  now-sdk query sysevent -q "name=incident.inserted^table=incident^ORDERBYdesc=sys_created_on" -l 5 -f "sys_id,name,table,state,processed,user_id,parm1,parm2,sys_created_on" -a PDI -o json
  ```
- **Analysis:**
  - Did the event fire? If there is no matching record in `sysevent`, the trigger failed (meaning the Script Include, Business Rule, or Workflow that fires the event did not execute or had an error).
  - Verify that `state` holds a healthy processed status (e.g. `processed`). If the event is stuck in `ready` or ended in `error`, the system's event queue processor didn't execute it.

---

### Stage 2: Notification Action Rule Definition (`sysevent_email_action`)
Query the notification rule to verify active settings, conditions, and recipients.
- **Table:** `sysevent_email_action`
- **Fields:** `sys_id,name,active,generation_type,event_name,collection,condition,advanced_condition,recipient_users,recipient_groups,recipient_fields,event_parm_1,event_parm_2,send_self`
- **Example Command:**
  ```bash
  now-sdk query sysevent_email_action -q "name=Incident Assigned^active=true" -l 1 -a PDI -o json
  ```
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
- **Example Command:**
  ```bash
  now-sdk query sys_email_log -q "event=<event_sys_id>" -l 5 -a PDI -o json
  ```
- **Analysis:**
  - If a log entry exists, use the `email` field (which contains the `sys_id` of the `sys_email` record) to query the exact email.
  - If no log entry is found, query `sys_email` directly by using the expected recipient, subject, target table, or instance sys_id (the sys_id of the record like the specific incident):
- **Table:** `sys_email`
- **Fields:** `sys_id,subject,type,mailbox,recipients,state,user_id,target_table,instance,error_string,sys_created_on`
- **Direct Query Example:**
  ```bash
  now-sdk query sys_email -q "target_table=incident^instance=<incident_sys_id>^ORDERBYdesc=sys_created_on" -l 5 -a PDI -o json
  ```
  - If NO `sys_email` was generated, the notification action rule was evaluated but did not result in an email (typically due to recipient list resolving to empty, unsubscribed preferences, or condition mismatch).

---

### Stage 4: Recipient Exclusions & Profile Preferences (`sys_user` & `cmn_notif_device`)
If no email was generated or if a recipient is missing from the list, check the user's active configuration and preferences.
- **Tables & Fields:**
  - **User:** `sys_user` (`sys_id,name,email,active,notification,locked_out`)
  - **Device (Primary Email/Push):** `cmn_notif_device` (`sys_id,user,name,type,email_address,active,primary_email`)
  - **Preferences (Sub/Un-sub):** `cmn_notif_message` (`sys_id,user,device,notification,active`)
- **Example Commands:**
  ```bash
  # Check if recipient user is active and has notifications enabled
  now-sdk query sys_user -q "sys_id=<user_sys_id>" -l 1 -a PDI -o json

  # Check if the user has active primary notification devices
  now-sdk query cmn_notif_device -q "user=<user_sys_id>^active=true" -l 5 -a PDI -o json

  # Check if the user opted out / unsubscribed from this notification
  now-sdk query cmn_notif_message -q "user=<user_sys_id>^notification=<notification_sys_id>" -l 5 -a PDI -o json
  ```
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
