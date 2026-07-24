---
name: nowdev-ai-toolbox-kb-compliance-check
user-invocable: true
disable-model-invocation: true
description: 'Review and cross-check generated ServiceNow artifacts and code against relevant connected instance Knowledge Base articles for organizational guidelines, development standards, and forbidden patterns. Use this skill when the user asks "does this follow our documented guidelines?", "check compliance", "verify against our KB standards", "audit against KB", or during a code review when checking compliance of any ServiceNow scripts, tables, flows, or other elements.'
argument-hint: "[artifact or file to check]"
---

# ServiceNow KB Compliance Checker

This skill guides the process of finding and cross-checking generated or proposed ServiceNow artifacts and code automatically against the connected instance's **Knowledge Base (KB)** articles, ensuring alignment with organization-specific development standards, naming conventions, performance guides, or forbidden-pattern statements.

---

## When to Use
- A code or artifact review is in progress.
- The organization may have custom ServiceNow guidelines, naming conventions, or style templates documented in local Knowledge Base articles.
- The user explicitly asks to "verify compliance", "check against our guidelines", "does this follow our documented guidelines?" or "audit against our KB", or similar.
- Before final code delivery to verify safety, compliance with local standards, and platform best practices.

---

## 1. Strictly Read-Only Safeguard & Language Alignment
- **Strictly Read-Only:** This skill operates in a strictly **read-only** manner during the compliance audit.
  - **DO NOT** create, mutate, update, or delete any records on the ServiceNow instance.
  - **DO NOT** install, build, deploy, or change local metadata files.
  - Use `now-sdk` only for read-only retrieval of existing KB articles and schema/conventions.
  - Load `nowdev-ai-toolbox-servicenow-sdk` first; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
- **Language Alignment & Multilingual Support:** Always communicate with the user, formulate feedback, and write the final audit reports in the **exact language used by the user** in their active prompt or conversation context, detected dynamically rather than assumed. Keep programmatic system identifiers (like table names, API paths, or code files) in their technical form, but wrap prose and analysis in the user's language.

---

## 2. Step-by-Step Procedure

### Step 1: Extract Artifact Context & Key Terms
Analyze the code, metadata representation, or implementation plan currently under review in the workspace. Extract:
1. **Artifact Type:** (e.g., Table, Field, Business Rule, Client Script, Flow, Script Include, REST Integration, Widget, UI Policy).
2. **Key Terms:** Name of the artifact, table name involved, system properties used, or key technology (e.g., `GlideRecord`, `RESTMessageV2`, `GlideAjax`, `async`, `x_scope`).
3. **Multilingual Search Keywords:** Detect the user's active language dynamically from their prompt — do not assume or hardcode any specific non-English language. Since KB articles on the instance may be written in English or the detected local language, prepare search queries that look for both equivalents:
   - General development standards: English (`"development standards"`, `"coding standards"`, `"naming conventions"`, `"forbidden patterns"`) and the detected-language equivalents (translate these same terms into the user's active language).
   - Business Rules: English (`"business rule"`, `"scripting guidelines"`, `"recursive business rules"`) and the detected-language equivalents.
   - Client scripts: English (`"client script"`, `"GlideAjax"`, `"browser performance"`) and the detected-language equivalents.

### Step 2: Retrieve Knowledge Base Guidance (`kb_knowledge`)
Ask `nowdev-ai-toolbox-servicenow-sdk` to perform this read-only retrieval:

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `kb_knowledge` | `short_description` or `text` contains any English or detected-language term for general standards, coding standards, naming conventions, forbidden patterns, and the specific artifact type | `number,short_description,text,sys_id` | Up to 10 relevant articles; start with 5 per general or artifact-specific term group |

Build the filter intent with `LIKE` conditions joined by OR across both fields and both languages. Keep the language expansion and artifact specificity; delegate encoded-query and shell mechanics to the canonical SDK skill.

### Step 3: Analyze KB Articles
For the retrieved KB articles:
1. **Review Content:** Inspect the `kb_knowledge.text` and `kb_knowledge.short_description` fields for:
   - Explicit development standards (e.g., "All business rules must have a description", "naming must start with x_").
   - Performance guidelines (e.g., "Never use gr.query() inside a loops", "GlideAjax must be asynchronous").
   - Forbidden patterns or anti-patterns (e.g., "Do not use gs.log in scoped apps", "Avoid g_form.getReference() without callback").
2. **Handle No Matching Articles:** If the query returns empty or no relevant KB articles are found, communicate this clearly and plainly to the user: *"No organization-specific KB compliance guidelines were found matching these artifacts on the connected instance."* **Do not fabricate guidelines**; stick to known standard platform patterns or plainly state that no specific guidelines rules were found.

### Step 4: Perform the Compliance Audit & Check
Cross-reference the generated or proposed code and system artifacts against the findings from the KB articles:
- **Compare Name/Scope:** Check if naming and scopes align with retrieved KB standards.
- **Line-by-Line Script Check:** Verify any script blocks (JS, TS, Fluent) against scripting rules and forbidden patterns found in the articles.
- **Isolate Violations:** For each violation, detail exactly which line of code/metadata is in violation and cite the specific KB article (including KB Number, title, and sys_id if available).

### Step 5: Format the Compliance Report
Present the review in a clean, highly readable Markdown format using the template below.

---

## 3. Compliance Report Template

Use the following template structure to output the compliance check results. Ensure all file references follow the **File Linkification** guidelines (use markdown links: `[path/to/file.ts](path/to/file.ts#L10)`, no backticks around file links).

```markdown
# ServiceNow KB Compliance Audit Report

## 🔍 KB Articles Discovered
*The following matching guideline articles were found and analyzed from the connected instance:*

| KB Number | Short Description | Source / Sys ID | Verification Status |
| :--- | :--- | :--- | :--- |
| **[KB0010042]** | ServiceNow General Scripting Standards | `[sys_id]` | Analyzed |
| **[KB0010086]** | Business Rule Best Practices & Recursion Prevention | `[sys_id]` | Analyzed |

---

## 📊 Compliance Summary
- **Compliance Status:** 🔴 [Non-Compliant / Attention Required] / 🟢 [Fully Compliant]
- **Artifacts Audited:**
  - `[Artifact Name]` ([Artifact Type]) in [file_path.ts](file_path.ts)
- **Total Violations:** [Count]

---

## 🚫 Compliance Findings & Violations
*Detailed analysis of violations or warning-level issues found against the retrieved guidelines:*

### Finding 1: [Short Title of Violation]
- **Severity:** 🔴 [High / Medium / Low]
- **Target Location:** Line [15](path/to/file.ts#L15) of [path/to/file.ts](path/to/file.ts#L15)
- **Cited KB Guideline:** **[KB0010086]: Business Rule Best Practices**
  > *"[Quote or paraphrase exact requirement from KB article]"*
- **Violation Details:** Describe what’s wrong in the code compared to the guideline.
- **Recommended Remediation:** Provide corrected code block/pattern to fix this.

---

## 🟢 Best Practices Met
*These guidelines from the KB were successfully adhered to in the current code:*
- **Standard 1:** Under [KB0010042] - Scoped naming rules are followed (`[prefix_name]`).
- **Standard 2:** Under [KB0010086] - Asynchronous pattern is correctly implemented.
```

---

## 4. Best Practices for This Skill
- **Precise Encoded Queries:** Always construct encoded queries with specific search filters to prevent fetching thousands of irrelevant articles.
- **Strictly Grounded Guidance:** If no matching guidelines are found, plainly state that no specific guidelines exist in the KB. Do not create guidelines out of thin air under the organization name.
- **Direct Code Linkification:** When indicating violations, provide a direct link to the file and line number in the workspace according to VS Code format rules.
