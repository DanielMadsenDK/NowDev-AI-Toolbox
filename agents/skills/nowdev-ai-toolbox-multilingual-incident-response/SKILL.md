---
name: nowdev-ai-toolbox-multilingual-incident-response
user-invocable: true
description: 'Draft customer/end-user-facing incident updates and KB-linked replies in the user''s target language. ALWAYS use this skill whenever the user asks to "draft a response to this incident", "write an update for the customer/requester", "reply to this ticket in [language]", or "close this incident with a customer-facing note", even if they do not explicitly ask for multilingual support or KB integration.'
---

# ServiceNow Multilingual Incident Response & KB-Linked Drafter

This skill coordinates drafting of customer/end-user-facing incident replies, updates, or resolution summaries, fully translated and localized into the requester's active target language. It leverages the connected ServiceNow instance to query target incident details, search the Knowledge Base (reusing bilingual queries to find articles regardless of authoring language), perform historical keyword searches for precedent, and output native-language drafts alongside a strict reminder that changes must be manually applied.

---

## 1. Strict Boundaries & Safeguards

### A. Strictly Read-Only Safeguard
- **DO NOT** perform write operations or mutations on any ServiceNow records. Do not attempt to update the incident status, incident notes, or short/long descriptions on the instance.
- **DO NOT** execute stateful SDK operations.
- Use `now-sdk` only for read-only retrieval, and load `nowdev-ai-toolbox-servicenow-sdk` first. It is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting.
- **ALWAYS** include an explicit notice at the bottom of the output reminding the user that this is a read-only chat skill and that they (or a separate write-capable execution pipeline) must copy and post the draft manually to the actual ServiceNow platform record.

### B. Language Alignment / Multilingual Support
- **Detect Target Language:** Identify the user's active/requested language dynamically from the active prompt or context (e.g., Danish, French, Spanish, German). If not specified, default to the language of the user's conversation prompt.
- **Full Structural Translation:** The draft customer-facing update, KB citations list, optional internal work note, and application reminders must be written **entirely in the target language**. This includes translating section headers, structural labels, and metadata keys natively (e.g., `# Draft Customer-Facing Update` and `## Relevant KB References` must be translated into the target language too, not left in English).
- **Retain Programmatic Integrity:** Keep system-specific technical identifiers, table names (e.g., `incident`, `kb_knowledge`), field names (e.g., `short_description`, `sys_id`), state names (`Resolved`), and programmatic code snippets in their original technical/English form to ensure accuracy during implementation/reference.

---

## 2. Step-by-Step Procedure

### Step 1: Detect Target Language & Retrieve Incident
1. Read the user's prompt to determine the target language and locate the record reference (e.g., incident number `INC0010042` or a `sys_id`).
2. Ask the canonical SDK skill to retrieve the key incident context using this intent:

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `incident` | Exact incident number or exact `sys_id` supplied by the user | `number,short_description,description,work_notes` | One incident |

### Step 2: Extract Key Concepts & Construct Bilingual Query
Extract the main issue topic from the retrieved incident `short_description` and `description` (e.g., "VPN login authentication failure"). To ensure successful discovery of knowledge articles regardless of the language they were written in, construct a bilingual query expansion pattern mirroring the exact approach from `kb-compliance-check`:
1. **Identify English Key Terms:** (e.g., `"VPN"`, `"authentication"`, `"login failure"`).
2. **Translate to Target Language equivalents:** (e.g., in Spanish: `"autenticación"`, `"fallo de inicio de sesión"`; in French: `"authentification"`, `"échec de connexion"`).
3. **Assemble Bilingual Encoded Query:** Join all English and Target Language terms under an `OR` (`^OR`) clause to search the Knowledge Base (`kb_knowledge`).

### Step 3: Retrieve Knowledge Base Guidance (`kb_knowledge`)
Ask the canonical SDK skill for a read-only search where `short_description` or `text` contains any English or target-language term. Request `number,short_description,text,sys_id` and limit intent to the five most relevant articles.

### Step 4: Search for Incident Precedent
Perform a keyword-based similar-incident fallback query on the `incident` table using key terms from Step 2 to locate historical precedents that could guide the resolution draft.

Use this retrieval intent:

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| `incident` | `short_description` or `description` contains the extracted issue terms | `number,short_description,close_notes,sys_id` | Five most relevant historical incidents |

### Step 5: Synthesize and Draft the Response
1. **Analyze:** Combine the original incident details, retrieved KB instruction text, and resolution notes from similar incidents to draft an accurate response.
2. **Format Response:** Format the draft response using the native, fully translated structural template defined below.

---

## 3. Native Language Output Template
*All sections, titles, keys, and descriptions below must be translated into the user's active/requested language. The English placeholders below denote the structure to be translated.*

```markdown
# [Translated Title, e.g. "Draft Customer-Facing Update" rendered in the target language]

## [Translated Customer Update Header]
[A clear, professional, empathetic response addressed directly to the customer or end-requester. Write this fully in the target language, explaining the resolution or update clearly. Cite any KB article solutions natively.]

## [Translated Relevant KB Reference Header]
- **[KB Number]** - [KB Article Short Description / Title]
  - **Sys ID:** `[kb_sys_id]`
  - **Summary of solution (Translated):** [Brief summary of why this article applies to the ticket, translated natively.]

## [Translated Internal Work Note Header (Optional)]
[A summary note designed for other service desk analysts, explaining technical investigations, standard incident resolution codes, or precedent references used. Write this fully in the target language.]

---

⚠️ **[Translated Safeguard Header, e.g. "Important: Manual Action Required" rendered in the target language]**
*This draft response was generated in read-only mode. You or an authorized workflow pipeline must manually copy and paste these drafts into the respective incident and work notes fields on the ServiceNow portal.*
```

---

## 4. Best Practices for This Skill
- **Ensure Native Flow:** Don't just translate word-for-word. Make the response sound natural, respectful, and idiomatic in the target language.
- **Accurate Reference Citation:** Always include matching KB numbers and Sys IDs inside the references section to make it simple for analysts to verify the information.
- **Secure Handling:** Never invent internal credentials, credentials of other users, or fabricate system properties. Stick strictly to incident fact-finding.
