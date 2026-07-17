---
name: nowdev-ai-toolbox-change-correlation
user-invocable: true
description: Surfaces and correlates recent configuration and code changes in a single live ServiceNow instance to explain a sudden regression ("this used to work"). Trigger this skill whenever a user mentions a regression or asks "what changed recently", "started failing after...", "did someone break this", "regression since last week", or says something was working but is now broken. The skill queries the Customer Update table ('sys_update_xml') using 'now-sdk query' over a target time window (default 7 days) and options like scope to group recent changes, map them into a chronological risk-annotated timeline, prioritize suspects related to the symptoms, and recommend verification steps.
---

# ServiceNow Live Change Correlation & Regression Diagnosis

This skill provides a systematic and read-only workflow to surface, analyze, and correlate recent configuration, metadata, and code changes in a single live ServiceNow instance to diagnose a sudden regression ("this used to work"). By querying the Customer Update table (`sys_update_xml`), the agent can construct an intuitive, chronological timeline of updates made within a regression window, prioritize modification entries based on target symptoms, highlight top suspects, and recommend validation actions.

---

## Core Principles

1. **Strictly Read-Only Safeguard:** Only use `now-sdk query` and `now-sdk explain` to fetch details. NEVER run any mutating, saving, build, install, or deploy commands inside this skill. NEVER edit, revert, or write any code or records directly on the instance. Only query, analyze, report, and recommend.
2. **Time-Window Driven:** Focus specifically on a target time-window (e.g., the last 7 days, 24 hours, or a user-provided regression window) on a single instance to find when the issue was introduced.
3. **Symptom-Implicated Prioritization:** Prioritize configuration updates that touch the same ServiceNow tables, script includes, business rules, or security components mentioned by the user or implicated by the regression symptom.
4. **Scope Boundary & Environment Drift Deferral:** This skill is strictly designed for local, time-based change correlation on a SINGLE instance. If the user's inquiry asks to compare multiple environments, match configurations across separate instances, or check for missing deployment artifacts between instance environments (such as dev vs. prod), do not use this skill; instead, immediately defer to [agents/skills/nowdev-ai-toolbox-environment-drift-audit/SKILL.md](agents/skills/nowdev-ai-toolbox-environment-drift-audit/SKILL.md) and state this redirect to the user.

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

### Step 2: Detect Scope and Auth Alias
1. Read the current scoped application's scope name (e.g., `x_abc_scope` or `x_123456_my_app`) from [now.config.json](now.config.json) or [package.json](package.json) in the workspace.
2. Run `now-sdk auth --list` to determine the stored authentication credentials (alias names) and choose the appropriate active/default alias or the one specified by the user.

### Step 3: Query recent Customer Updates
Query the Customer Update table (`sys_update_xml`) using `now-sdk query`. Look up updates made during the target time window, filtering by the application scope if known.

- **Table:** `sys_update_xml`
- **Fields:** `sys_id,sys_updated_on,sys_updated_by,type,target_name,name,action,application,payload`
- **ServiceNow Date/Time Helpers:** Apply standard encoded query date conditions:
  - Last 7 days: `sys_updated_onONLast 7 days@javascript:gs.beginningOfLast7Days()@javascript:gs.endOfLast7Days()`
  - Last 24 hours: `sys_updated_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()`
  - Custom date range: `sys_updated_on>=javascript:gs.dateGenerate('YYYY-MM-DD','HH:MM:SS')`
- **Scoped Query Example Cmd:**
  `now-sdk query sys_update_xml -q "sys_updated_on>=javascript:gs.beginningOfLast7Days()^application.scope=<scope_name>" -f "sys_id,sys_updated_on,sys_updated_by,type,target_name,name,action,application,payload" -a <alias> -o json`

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
