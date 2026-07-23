---
name: nowdev-ai-toolbox-incident-log-triage
user-invocable: true
description: Symptom-first root-cause triage when something in the live ServiceNow instance is broken or erroring and the user has no known file/script to point at. Use for unexpected UI/session crashes, background job exceptions, flow failures, email delivery issues, integration errors, and general instance triage. It delegates read-only `now-sdk` retrieval to `nowdev-ai-toolbox-servicenow-sdk` across operational diagnostic tables.
---

## 🗺️ Core Principles

1. **Strictly Read-Only Safeguard:** NEVER perform write, update, delete, or mutation operations on the ServiceNow instance. Use `now-sdk` only for read-only retrieval. Do not install, reinstall, or build during log triage. Diagnose only.
2. **SDK Authority:** Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
3. **Symptom-to-Source Mapping:** Start with the reported behavior and an approximate timeframe. Construct query intent across operational database log tables to isolate the cause.
4. **Language Alignment / Multilingual Support:** Always communicate with the user, draft the final Triage Report, and perform discussion in the exact language used by the user in the prompt or conversation. Keep technical system terms (table names like `sys_flow_context`, field names like `sys_id`, `state`, code snippets) in their exact technical/English form, but translate all report headings, descriptions, hypotheses, and next step lists.

---

## 🔎 The Diagnostic Sources & Live Field Schemas

Ask `nowdev-ai-toolbox-servicenow-sdk` to perform bounded, read-only retrievals selected by symptom. Keep the first pass within the reported time window and expand only when evidence requires it.

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `syslog` | Error-level records in the reported window; narrow by source or message terms when known | `sys_id,level,source,message,sys_created_on` | 20 newest relevant records |
| `sys_email` | Failed or ignored sends in the reported window; narrow by recipient, target, or subject when known | `sys_id,subject,type,recipients,notification_type,instance,sys_created_on` | 10 newest relevant records |
| `sys_email_log` | Email-log links for discovered event, notification, or email IDs | `sys_id,notification,event,email,sys_created_on` | 10 newest relevant records |
| `ecc_queue` | Input or output records in error state during the reported integration window | `sys_id,agent,topic,name,state,queue,error_string,sys_created_on` | 10 newest relevant records |
| `sys_trigger` | Error state or positive error count; narrow by job name when known | `sys_id,name,state,error_count,last_error,run_time,next_action,sys_updated_on` | 15 newest relevant records |
| `sysauto_script` | Scheduled job definition for a discovered trigger or job name | `sys_id,name,active,run_type,run_time,script` | Only matching definitions |
| `sys_flow_context` | Error state or populated error message in the reported window | `sys_id,name,state,error_message,error_state,flow,sys_created_on` | 15 newest relevant records |

---

## 📈 Triage Workflow

Follow this sequence systematically:

### Step 1: Establish Symptom and Time Window
1. Clarify what is misbehaving and identify the approximate timeframe (e.g. "it happened 10 minutes ago", "since yesterday afternoon").
2. Determine the target instance. Delegate connection discovery to the canonical SDK skill and ask the user if the target is ambiguous.

### Step 2: Formulate Read-Only Diagnostic Queries
1. Translate the approximate timeframe into ServiceNow encoded query time parameters (e.g. `javascript:gs.minutesAgo(15)`, `javascript:gs.hoursAgo(2)`).
2. Ask the canonical SDK skill to execute the relevant read-only retrievals described above based on the symptom sub-domain.

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
- **NEVER** use write methods. Use `now-sdk` only for read-only fact retrieval and diagnosis through `nowdev-ai-toolbox-servicenow-sdk`.
- **Never guess fields**—rely only on the verified field schemas declared in Section 'The Diagnostic Sources & Live Field Schemas'.
- **Gracefully handle unavailable connections:** Let the canonical SDK skill classify the failure, report the sanitized issue, and ask the user to configure or select a valid connection outside this skill. Do not provide authentication bootstrap mechanics or guess.
