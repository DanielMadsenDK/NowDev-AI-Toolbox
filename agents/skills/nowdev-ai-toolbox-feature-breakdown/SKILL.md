---
name: nowdev-ai-toolbox-feature-breakdown
user-invocable: true
disable-model-invocation: true
description: Decomposes a high-level Epic into a structured set of business-outcome Features using the connected project/work management MCP tools. Use this skill whenever the user has an Epic (referenced by ID or name) and wants to "break it down into features", "decompose the epic", "split it up", "plan features for this epic", or asks "what features would deliver this epic", or requests to organize business requirements for an Epic. This skill MUST be used for Product Owner tasks to manage work hierarchy conceptually and must not mention developer-facing concepts or create User Stories; if asked for ServiceNow technical design, defer to 'nowdev-ai-toolbox-instance-grounded-plan'.
---

# ServiceNow Feature Breakdown

This skill provides a structured workflow for a **Product Owner** to decompose a high-level business Epic into multiple incrementally deliverable **Features** within the connected project management (PM) or work tracking tool (e.g., Jira, Azure DevOps, or ServiceNow Agile Development/Strategic Portfolio Management) via MCP integration.

---

## Core Guidelines

1. **Product Owner Perspective & Language:** Maintain a business-centric, value-oriented perspective. Avoid all developer-centric technical terms, database schemas, scripts, flow names, or custom field mappings.
2. **Explicitly NO ServiceNow Implementation Details:** Do not reference specific ServiceNow tables, business rules, client scripts, flows, or other system artifacts. If the user asks for technical implementation, designs, or data models, explicitly state that this is the job of the **developer-facing skill** and direct them to use **nowdev-ai-toolbox-instance-grounded-plan**.
3. **Features Only, No User Stories:** Focus strictly on decomposing the Epic into **Features** (increments of business capability/value). Do not create detailed User Stories during this workflow.
4. **Always Ask for Confirmation:** Before creating, updating, or linking any items in the tracking tool, present your proposed Features to the user in a highly readable format and ask for explicit confirmation.
5. **Language Alignment & Multilingual Support:** Always communicate with the user, write feature titles, draft outcome descriptions, and formulate acceptance criteria in the exact language used by the user in their active prompt or conversation context, detected dynamically rather than assumed.

---

## Feature Requirements
Each proposed Feature must contain:
- **Title:** Clear, concise business name.
- **Outcome Description:** A plain-English description of the user or business outcome (what value is delivered to whom).
- **Business Acceptance Criteria:** Defined purely in terms of business outcomes and user interactions (e.g., "A customer service agent can view all open approvals directly from the case..."). No system-level database checks.
- **Rough Sizing:** S/M/L relative estimate.

---

## The Workflow

### Step 1: Discover Project Management MCP Tools
Upon trigger, scan the available MCP tools in your context to identify the connected project management or issue-tracking system:
- Look for tools with name patterns or descriptions containing: `get_issue`, `get_work_item`, `create_issue`, `create_work_item`, `link_issues`, `add_child`, `jira_`, `azure_`, or similar workspace project management schemas.
- Identify the correct tools to:
  1. Retrieve an issue/work-item.
  2. Create an issue/work-item.
  3. Relate/link issues (specifically parent-to-child or Epic-to-Feature relationships).

### Step 2: Retrieve the Epic Content
Using the discovered Epic ID and the appropriate retrieval tool:
1. Fetch the Epic's details (title, description, objectives).
2. If the retrieval fails or the ID is invalid, politely communicate this and ask the user to verify the Epic ID.
3. Extract the high-level business goals and value propositions of the Epic.

### Step 3: Formulate and Propose the Feature Breakdown
Design a logical, incremental sequence of **Features** (typically 2 to 4) that can be delivered to realize the Epic's objectives.
Format your proposal beautifully in Markdown:

```markdown
### 📋 Proposed Feature Breakdown for Epic [Epic ID]: [Epic Title]

#### 🚀 Feature 1: [Feature Title]
- **Business Outcome:** [Plain-language user/business benefit]
- **Relative Sizing:** [S/M/L]
- **Business Acceptance Criteria:**
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]

#### 🚀 Feature 2: [Feature Title]
- **Business Outcome:** [Plain-language user/business benefit]
- **Relative Sizing:** [S/M/L]
- **Business Acceptance Criteria:**
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]

---
*Would you like me to go ahead and create these Features as children of Epic [Epic ID] in your project tracking system?*
```

### Step 4: Create and Link confirmed Features
Once the user confirms the proposal (or provides adjustments, which you should apply first):
1. For each Feature, call the discovered creation tool to create a new work-item / issue.
   - **Type/Category:** Set to "Feature" (or the closest equivalent supported by the tool, such as "feature").
   - **Title & Description:** Populate with the approved details, description, and acceptance criteria.
2. Link each newly created Feature as a **child** of the origin Epic. Use the discovered link/parenting tools to establish this hierarchical relationship.
3. Confirm successful creation to the user by providing the new item IDs/URLs and a summary of the relationships created.
