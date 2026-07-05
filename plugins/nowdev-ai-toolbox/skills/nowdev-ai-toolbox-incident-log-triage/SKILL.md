---
name: nowdev-ai-toolbox-incident-log-triage
context: fork
user-invocable: false
description: Symptom-first root-cause triage when something in the live ServiceNow instance is broken or erroring and the user has no known file/script to point at. Make sure to use this skill whenever the user mentions "something is broken", "getting an error when I...", "why isn't X working", "something's wrong with the instance", "troubleshoot this incident/problem", "log triage", "instance triage", "integration error", or refers to any unexpected UI/session crash, background job exception, flow execution failure, or email delivery issue on the live instance. Strictly uses read-only queries with 'now-sdk query' across syslog, sys_email, sys_email_log, ecc_queue, sys_trigger, and sys_flow_context.
---

# ServiceNow Live Instance Incident Log Triage

This skill governs the systematic, symptom-first root-cause triage of failures or errors occurring on a live ServiceNow instance when the user has no predefined file or script to debug. It is distinct from `NowDev-AI-Debugger`, which starts from a known, open workspace artifact.

---

## 🗺️ Core Principles

1. **Strictly Read-Only Safeguard:** NEVER perform write, update, delete, or mutation commands on the ServiceNow instance. Only invoke `now-sdk query` or `now-sdk explain`. Do not install, reinstall, or build during log triage. Diagnose only — do not attempt to fix anything.
2. **Symptom-to-Source Mapping:** Start with the reported behavior and an approximate timeframe. Construct queries across various operational database log tables to isolate the cause.
3. **Language Alignment / Multilingual Support:** Always communicate with the user, draft the final Triage Report, and perform discussion in the exact language used by the user in the prompt or conversation. Keep technical system terms (table names like `sys_flow_context`, field names like `sys_id`, `state`, code snippets) in their exact technical/English form, but translate all report headings, descriptions, hypotheses, and next step lists (e.g. in French, use `# Verdict Global` instead of `# Overall Verdict`, `## Prochaines étapes` instead of `## Recommended Next Steps`, etc.).

---

## 🔎 The Diagnostic Sources & Live Field Schemas

Use `now-sdk query <table>` with specific field filters and boundaries. Always keep queries scoped with a `--limit` (defaulting to 10–25 rows) to avoid excessive context consumption.

### 1. System Logs (`syslog`)
For system-level warnings, runtime errors, or script execution stack traces.
- **Table Name:** `syslog`
- **Critical Fields:** `sys_id`, `level`, `message`, `source`, `sys_id`, `sys_created_on`
- **Query Command Template:**
  ```bash
  now-sdk query syslog -q "level=2^sys_created_on>=javascript:gs.minutesAgo(30)" -f "sys_id,level,source,message,sys_created_on" -l 20 -o json
  ```
  *(Note: `level=2` filters for Error status logs.)*

### 2. Notification & Email Failures (`sys_email` and `sys_email_log`)
For delivery issue isolation (failed SMTP states or missing event triggers).
- **Core Email Table:** `sys_email`
- **Critical Fields:** `sys_id`, `subject`, `type`, `recipients`, `notification_type`, `instance`, `sys_created_on`
- **Email Log Table:** `sys_email_log` (links Event records and Notification rules to the generated emails)
- **Critical Fields:** `sys_id`, `notification`, `event`, `email`, `sys_created_on`
- **Query Command Template:**
  ```bash
  now-sdk query sys_email -q "typeINsend-failed,send-ignored^sys_created_on>=javascript:gs.hoursAgo(2)" -f "sys_id,subject,type,recipients,sys_created_on" -l 10 -o json
  ```

### 3. MID Server & Integration Errors (`ecc_queue`)
For failed external integration calls, REST/SOAP messages, or MID Server errors.
- **Table Name:** `ecc_queue`
- **Critical Fields:** `sys_id`, `agent`, `topic`, `name`, `state`, `queue`, `error_string`, `sys_created_on`
- **Query Command Template:**
  ```bash
  now-sdk query ecc_queue -q "queue=input^state=error^sys_created_on>=javascript:gs.hoursAgo(4)" -f "sys_id,agent,topic,name,state,queue,error_string,sys_created_on" -l 10 -o json
  ```

### 4. Scheduled Jobs / Trigger Engines (`sys_trigger` and `sysauto_script`)
For scheduled job processing issues, script exceptions, or delayed runtimes.
- **Execution Engine Table:** `sys_trigger`
- **Critical Fields:** `sys_id`, `name`, `state`, `error_count`, `last_error`, `run_time`, `next_action`, `sys_updated_on`
- **Query Command Template:**
  ```bash
  now-sdk query sys_trigger -q "state=error^ORerror_count>0" -f "sys_id,name,state,error_count,last_error,run_time,next_action" -l 15 -o json
  ```

### 5. Flow Designer & Actions (`sys_flow_context`)
For failed flow executions, subprocess crashes, or action timeouts.
- **Table Name:** `sys_flow_context`
- **Critical Fields:** `sys_id`, `name`, `state`, `error_message`, `error_state`, `flow`, `sys_created_on`
- **Query Command Template:**
  ```bash
  now-sdk query sys_flow_context -q "state=ERROR^ORerror_messageISNOTEMPTY" -f "sys_id,name,state,error_message,error_state,flow,sys_created_on" -l 15 -o json
  ```

---

## 📈 Triage Workflow

Follow this sequence systematically:

### Step 1: Establish Symptom and Time Window
1. Clarify what is misbehaving and identify the approximate timeframe (e.g. "it happened 10 minutes ago", "since yesterday afternoon").
2. Check the active auth alias by calling `now-sdk auth --list`. Assure you query the correct target instance.

### Step 2: Formulate Read-Only Diagnostic Queries
1. Translate the approximate timeframe into ServiceNow encoded query time parameters (e.g. `javascript:gs.minutesAgo(15)`, `javascript:gs.hoursAgo(2)`).
2. Execute target `now-sdk query` commands across the relevant diagnostic tables described above based on the symptom sub-domain (e.g., if emails are failing, scan both `syslog` and `sys_email`/`sys_email_log`; if integrations are failing, scan `syslog` and `ecc_queue`).

### Step 3: Event Correlation and Analysis
Compare output timestamps and correlate records matching the timeframe:
- **Time Proximity:** Do log error timestamps match the exact second/minute the user encountered the issue or the flow was executed?
- **Scope/Table Matches:** Do the log source names, scripts, or application scopes align?
- **Cascading Failures:** Did a scheduled job exception (`sys_trigger` / `syslog`) cause an outbound integration message to fail (`ecc_queue`)?

### Step 4: Formulate the Triage Report
Draft a professional, symptom-first diagnostic report in the user's active language using the layout template below.

---

## 📊 Live Triage Report Template

Ensure you follow this visual structure, translating all titles and prose context to match the user's language, while keeping technical references in English:

```markdown
# [Triage Report Title / e.g., Rapport de Triage de l'Instance]
*Target Instance / Alias:* `[Alias]`
*Triage Time Window:* `[Start Time - End Time]`
*Analyzed Application Scope:* `[Scope Name, if applicable]`

---

## 🚦 [Severity Indicator / e.g., Verdict Global]
- **[🔴 CRITICAL FAULT DETECTED / 🟡 WARNING / 🟢 STABLE WITH ANOMALIES]**
- *Brief 1-2 sentence high-level summary of the root cause identified.*

---

## 🔥 [Critical Source-by-Source Findings / e.g., Constats par Source de Données]
> Summary of exceptions mapped from the diagnostic queries.

### [Diagnostic Table / e.g. syslog ou sys_flow_context]
| sys_created_on | Field / Object | Details / Message | Status |
|---|---|---|---|
| 2026-07-05 10:15:30 | `[Source/Name]` | `[Error message snippet]` | `[State/Level]` |

*(In any table where 0 errors were found, explicitly report "No issues or failures detected in <Table>.")*

---

## ⚡ [Ranked Root-Cause Hypotheses / e.g., Hypothèses Classées de Cause Racine]
Based on the event correlation, some possible causes:

1. **[Hypothesis 1 Title - High Confidence]**
   - **Reasoning:** [Why this match occurs based on time proximity and table relationships.]
   - **Technical Evidence:** `[sys_id, script stack traces, or error strings]`

2. **[Hypothesis 2 Title - Medium Confidence]**
   - **Reasoning:** [Alternative potential cause.]

---

## 📋 [Recommended Next Steps / e.g., Prochaines Étapes Recommandées]
- [ ] **Narrowed Diagnostic Skill Handoff:**
  - If the domain narrows to access control or security rights, transition to `nowdev-ai-toolbox-access-denied-explainer` skill.
  - If the domain narrows to notification delivery issues, transition to `nowdev-ai-toolbox-notification-delivery-diagnostic` skill.
  - If the domain narrows to change audit or deployment conflicts, transition to `nowdev-ai-toolbox-change-correlation` skill.
  - If the domain narrows to a specific file or script in your workspace, open the file and transition to the `NowDev-AI-Debugger` or `NowDev-AI-Fluent-Developer` agent.
- [ ] `[Action Item 1 based on findings]`
- [ ] `[Action Item 2 based on findings]`
```

---

## 📋 Safety Check & Operational Guardrails
- **NEVER** use write methods. Use `now-sdk query` to capture facts and diagnose.
- **Never guess fields**—rely only on the verified field schemas declared in Section 'The Diagnostic Sources & Live Field Schemas'.
- **Gracefully handle missing credentials:** If `now-sdk auth --list` returns no alias or the target alias fails to connect, report the error, list the steps to configure the alias with `now-sdk auth --add`, and wait. Do not assume or guess.
