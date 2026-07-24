---
name: nowdev-ai-toolbox-change-correlation
user-invocable: true
description: Surfaces and correlates recent configuration and code changes in a single live ServiceNow instance to explain a sudden regression ("this used to work"). Trigger this skill whenever a user mentions a regression or asks "what changed recently", "started failing after...", "did someone break this", "regression since last week", or says something was working but is now broken. The skill delegates read-only `now-sdk` retrieval to `nowdev-ai-toolbox-servicenow-sdk`, then maps Customer Updates into a chronological, risk-annotated timeline.
argument-hint: "[symptom] [since when]"
---

# ServiceNow Live Change Correlation & Regression Diagnosis

This skill provides a systematic and read-only workflow to surface, analyze, and correlate recent configuration, metadata, and code changes in a single live ServiceNow instance to diagnose a sudden regression ("this used to work"). By querying the Customer Update table (`sys_update_xml`), the agent can construct an intuitive, chronological timeline of updates made within a regression window, prioritize modification entries based on target symptoms, highlight top suspects, and recommend validation actions.

---

## Core Principles

1. **Strictly Read-Only Safeguard:** Use `now-sdk` only to fetch details. NEVER run any mutating, saving, build, install, or deploy operation inside this skill. NEVER edit, revert, or write any code or records directly on the instance. Only retrieve, analyze, report, and recommend.
2. **SDK Authority:** Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
3. **Time-Window Driven:** Focus specifically on a target time-window (e.g., the last 7 days, 24 hours, or a user-provided regression window) on a single instance to find when the issue was introduced.
4. **Symptom-Implicated Prioritization:** Prioritize configuration updates that touch the same ServiceNow tables, script includes, business rules, or security components mentioned by the user or implicated by the regression symptom.
5. **Scope Boundary & Environment Drift Deferral:** This skill is strictly designed for local, time-based change correlation on a SINGLE instance. If the user's inquiry asks to compare multiple environments, match configurations across separate instances, or check for missing deployment artifacts between instance environments (such as dev vs. prod), do not use this skill; instead, immediately defer to [agents/skills/nowdev-ai-toolbox-environment-drift-audit/SKILL.md](agents/skills/nowdev-ai-toolbox-environment-drift-audit/SKILL.md) and state this redirect to the user.

---

## Language Alignment & Multilingual Support

- **ALWAYS** communicate with the user, formulate response summaries, and draft the entire timeline/report in the exact language the user is actively using in the current prompt or conversation context.
- Translate standard report layout headers (e.g., `# Live Change Correlation Timeline` becomes `# Tidslinje over live ændringskorrelation` in Danish, or `## Top Suspects` becomes `## Prime Misstänkta` in Swedish) so that the entire output is fully aligned and completely native to the user's language.
- Keep technical table names (e.g., `sys_update_xml`, `sys_script`, `sys_security_acl`), field names (e.g., `sys_updated_on`, `sys_updated_by`), specific Sys IDs, and code syntax block text in their original technical English form to preserve absolute precision.

---

## The Correlation Workflow

Follow these steps precisely when triggered to diagnose a sudden regression:

### Step 1: Gather Symptom and Approximate Regression Window
Analyze the conversation or prompt to identify:
- **The symptom/error:** What is failing, which table is implicated (e.g., `incident`), or what function is throwing errors.
- **The regression window:** When the failure started or how far back to look. Define an explicit start date (e.g., "since yesterday" or "regression since last week"). If no explicit timing is provided, use **7 days** as the default window.

### Step 2: Detect Scope and Target Instance
1. Read the current scoped application's scope name (e.g., `x_abc_scope` or `x_123456_my_app`) from [now.config.json](now.config.json) or [package.json](package.json) in the workspace.
2. Ask the canonical SDK skill to resolve available connections and select the user-specified target. If the target instance remains ambiguous, ask the user before retrieval.

### Step 3: Query recent Customer Updates
Ask `nowdev-ai-toolbox-servicenow-sdk` to perform the read-only retrieval described below.

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `sys_update_xml` | Records updated inside the target regression window; additionally match `application.scope=<scope_name>` when scope is known | `sys_id,sys_updated_on,sys_updated_by,type,target_name,name,action,application,payload` | Start bounded; paginate deliberately until the requested time window is covered, and report partial coverage |

Use standard encoded-query date intent:
  - Last 7 days: `sys_updated_onONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()`
  - Last 24 hours: `sys_updated_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()`
  - Custom date range: `sys_updated_on>=javascript:gs.dateGenerate('YYYY-MM-DD','HH:MM:SS')`

### Step 4: Group, Prioritize, and Risk-Annotate Changes
Extract the JSON results and parse the records. For each record, analyze the fields and:
1. **Group by Artifact Type:** Group the updates by type (e.g., Business Rule, Script Include, Access Control, Flow, System Property).
2. **Prioritize Symptom Matches:** Sort and surface updates first if their `target_name`, `table`, or XML `<payload>` mentions the specific table, script, or feature experiencing the regression.
3. **Assign Risk Levels:**
   - **HIGH RISK:** Access Control (ACL) rules (`sys_security_acl`, `sys_security_acl_role`), Dictionary/Schema modifications, or security properties. These can immediately cause security exceptions or break database-level integrations.
   - **MEDIUM RISK:** Business Rules (`sys_script`), Script Includes (`sys_script_include`), Client Scripts (`sys_script_client`), Flow Designer Flows (`sys_hub_flow`), or Scheduled Jobs (`sysauto_script`). These contain active logic or automation scripts that are major sources of code regressions.
   - **LOW RISK:** Comments/formatting inside scripts, UI cosmetics, documentation/labels, simple metadata, or predictable `sys_updated_on`/`sys_updated_by` timing.

---

## Step 5: Generate the Live Change Correlation Report
Compile the grouped, sorted, and prioritized results into a structured Markdown format translated into the user's active language. Follow this template:

```markdown
# [Localized Title: e.g., Live Change Correlation Report]
*Localized Scoped App Context:* [scope_name]
*Localized Target Instance Alias:* [alias_name]
*Localized Regression Diagnostic Window:* [Begin Timestamp] - [End Timestamp]

---

## 🚦 [Localized Verdict Summary Header: e.g., Diagnostic Summary]
- **[SUSPECTED IMPACT DETECTED / INFO / CLEAN VERDICT]**
- *[Localized concise sentence detailing whether changes have been identified and how they correspond to the reported regression.]*

---

## 🕒 [Localized Historical Timeline Header: e.g., Chronological Update Timeline]
> [Localized explanation of the chronological timeline of updates.]

| Timestamp (`sys_updated_on`) | Type (`type`) | Name / Target (`target_name`) | Changed By (`sys_updated_by`) | Risk Annotation |
|---|---|---|---|---|
| [YYYY-MM-DD HH:MM:SS] | [Artifact Type] | [Record Name] | [User] | **[HIGH / MEDIUM / LOW]** - [Brief localized description of potential impact] |

*(If no recent updates found in scope, display localized text: "No recent updates found within the diagnostic time window.")*

---

## 🔍 [Localized Top Suspects Header: e.g., Prime Suspects]
> [Localized caption explaining why these specific records are suspicious.]

1. **[Artifact Name]** (`type`)
   - **Change Details:** Updated on [Timestamp] by `sys_updated_by` via Action `INSERT_OR_UPDATE` / `DELETE`.
   - **Reason for Suspicion:** [Localized analytical text linking this change with the user's reported error or table.]
   - **Payload Audit:** [If code changes are parsed from the payload, include a raw diff, or cite the changed script lines/settings of the XML `<payload>`.]

*(If no prime suspects can be linked, name the most critical changes that occurred nearest to the failure timestamp.)*

---

## 📋 [Localized Recommended Verification Steps Header: e.g., Suggested Verification Checklist]
- [ ] [Verify recent script check modifications inside the record]
- [ ] [Test localized behavior using live test fixtures]
```

---

## Technical Field and Schema Verification Guide

When querying the Customer Update (`sys_update_xml`) table, always keep in mind these actual structural properties verified on the ServiceNow platform:
- `sys_id`: Unique identifier of the local update log entry.
- `sys_updated_on`: When the update was recorded on the instance.
- `sys_updated_by`: The username of the modifier.
- `type`: Logical artifact classification (e.g., "Business Rule", "Access Control", "Client Script").
- `target_name`: Human-readable name of the modified record.
- `name`: Technical database identifier (e.g., `sys_security_acl_925ff5fbc3333010a282a539e540dd6c`).
- `action`: Operations like `INSERT_OR_UPDATE` or `DELETE`.
- `application`: Scoped application reference (supports dot-walking like `application.scope=<scope>`).
- `payload`: XML serialized content of the real record being updated. This contain the actual JavaScript/scripts (within `<script>` tags, standard CDATA, etc.) and runtime active flags (e.g., `<active>true</active>`).
