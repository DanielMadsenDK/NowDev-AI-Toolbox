---
name: nowdev-ai-toolbox-kb-compliance-check
context: fork
user-invocable: false
description: 'Review and cross-check generated ServiceNow artifacts and code against relevant connected instance Knowledge Base articles for organizational guidelines, development standards, and forbidden patterns. Use this skill when the user asks "does this follow our documented guidelines?", "check compliance", "verify against our KB standards", "audit against KB", or during a code review when checking compliance of any ServiceNow scripts, tables, flows, or other elements.'
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
  - **DO NOT** run `now-sdk install`, `now-sdk build`, or change any local metadata files.
  - **ONLY** use `now-sdk query` to retrieve existing KB articles and verify schema/conventions.
- **Language Alignment & Multilingual Support:** Always communicate with the user, formulate feedback, and write the final audit reports in the **exact language used by the user** in their active prompt or conversation context (e.g., if the user poses questions or requests the audit in Danish, the compliance summary, findings, and remediation advice must be delivered in Danish). Keep programmatic system identifiers (like table names, API paths, or code files) in their technical form, but wrap prose and analysis in the user's language.

---

## 2. Step-by-Step Procedure

### Step 1: Extract Artifact Context & Key Terms
Analyze the code, metadata representation, or implementation plan currently under review in the workspace. Extract:
1. **Artifact Type:** (e.g., Table, Field, Business Rule, Client Script, Flow, Script Include, REST Integration, Widget, UI Policy).
2. **Key Terms:** Name of the artifact, table name involved, system properties used, or key technology (e.g., `GlideRecord`, `RESTMessageV2`, `GlideAjax`, `async`, `x_scope`).
3. **Multilingual Search Keywords:** Adapt keywords based on both English (standard standard platform terms) and the user's detected local language (e.g., Danish). Since KB articles on the instance may be written in either language, prepare search queries that look for both equivalents:
   - General development standards: English (`"development standards"`, `"coding standards"`, `"naming conventions"`, `"forbidden patterns"`) and Danish / Localized equivalents (`"udviklingsstandarder"`, `"kodestandarder"`, `"navngivningskonventioner"`, `"forbudte mønstre"`).
   - Business Rules: English (`"business rule"`, `"scripting guidelines"`, `"recursive business rules"`) and Localized equivalents (`"forretningsregel"`, `"scripting retningslinjer"`, `"rekursive forretningsregler"`).
   - Client scripts: English (`"client script"`, `"GlideAjax"`, `"browser performance"`) and Localized equivalents (`"klientscript"`, `"browser ydeevne"`).

### Step 2: Query the Knowledge Base (`kb_knowledge`)
Search the `kb_knowledge` table on the connected instance via `now-sdk query`.
Since standard ServiceNow search might be keyword-based, use an encoded query (`-q`) looking at fields like `short_description` and `text`.

**Recommended Query Pattern:**
Run `now-sdk query kb_knowledge -q "<query>"` with options `-f "number,short_description,text,sys_id" -o json --limit 10`.

Construct an encoded query using `LIKE` or keywords that targets **both English and the localized language components** to ensure comprehensive discovery. For example:
- Check for general development standards:
  `now-sdk query kb_knowledge -q "short_descriptionLIKEdevelopment standards^ORtextLIKEdevelopment standards^ORshort_descriptionLIKEcoding standards^ORtextLIKEcoding standards^ORshort_descriptionLIKEudviklingsstandarder^ORtextLIKEudviklingsstandarder^ORshort_descriptionLIKEkodestandarder^ORtextLIKEkodestandarder" -f "number,short_description,text,sys_id" -o json --limit 5`
- Check for specific artifact rules (e.g., Business Rules):
  `now-sdk query kb_knowledge -q "short_descriptionLIKEbusiness rule^ORtextLIKEbusiness rule^ORshort_descriptionLIKEforretningsregel^ORtextLIKEforretningsregel^ORshort_descriptionLIKEscripting^ORtextLIKEscripting" -f "number,short_description,text,sys_id" -o json --limit 5`

Ensure all query parameters are correctly single-quoted for the terminal shell, avoiding terminal parsing errors.

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
