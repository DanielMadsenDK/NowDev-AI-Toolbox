---
name: nowdev-ai-toolbox-story-artifact-mapping
user-invocable: true
disable-model-invocation: true
description: Technical breakdown skill for mapping Features into developer-facing User Stories with ServiceNow Fluent artifacts. This skill explicitly triggers whenever a user references a Feature or Story ID (e.g., FEAT-123, US-456) and asks to plan, draft, map, outline, or implement it, or when they ask to "update traceability", "record what was built", "sync build artifacts to Jira/Azure DevOps", or "conclude development on Story X" after completing a build. It inspects the workspace's git changes to append actual build files, status, and test coverage to the User Stories. Keep this developer-facing mapping skill extremely focused on Fluent artifact generation and traceability.
---

# ServiceNow Story Artifact Mapping & Traceability

This skill maps business-oriented **Features** into detailed, developer-facing **User Stories** complete with ServiceNow Fluent technical artifacts, dependencies, and implementation-geared acceptance criteria. It also functions as the post-build feedback loop: updating those same User Stories with exact build traceability information derived from the workspace's git changes.

---

## 1. Strict Boundaries & Scope

To ensure clear ownership layers across Product Owner and Developer personas:
- **NEVER create, modify, or update Epics or Features.** Epics are owned by the organizational enterprise skills (like `nowdev-ai-toolbox-epic-charter`), and Features are governed by Product Owner skills (like `nowdev-ai-toolbox-feature-breakdown`).
- **ONLY create or update child User Stories.** All technical analyses and implementation specifications must be written inside of **User Stories** that are linked as children to their originating Feature.
- If asked to modify an Epic or Feature, explicitly state that it is out of scope for this developer-facing skill, and redirect the user.
- **Language Alignment / Multilingual Support:** Always communicate with the user, write story titles, draft story descriptions, formulate acceptance criteria, and output traceability summaries in the exact language used by the user in their active prompt or conversation context (e.g., if the user asks in Danish, translate all generated User Story text and agent responses to Danish). Keep programmatic system identifiers (like table names, React class handles, or `.now.ts` paths) in their natural code representation (usually English), but keep all human-facing context fully aligned with their preferred language.

---

## 2. Dynamic Discovery of Project Management MCP Tools

Before writing or updating anything, discover the connected workspace project-management MCP system.
- Look at available tools in your context (such as those prefixed with `jira-`, `azure-devops-`, `project-management`, or platform-level work management tools).
- Identify tools for:
  - Retrieve issue/work-item contents (e.g. `get_issue`, `get_work_item`).
  - Create child issue/work-item (e.g. `create_issue`, `create_work_item`, `add_child`).
  - Link/relate work items.
  - Append comments or update descriptions.

---

## 3. Workflow A: Feature-To-Story Technical Breakdown (Pre-Build)

When a developer references a Feature ID and asks to plan, map, or prepare it for implementation:

### Step 3.1: Retrieve Feature details
Invoke the discovered PM tool to fetch the Feature's title, description, and business acceptance criteria.

### Step 3.2: Decompose Feature into Developer-Facing User Stories
For each logically separate piece of implementation, design a developer-facing **User Story**. Each Story must have a clear implementation scope and include:

#### A. ServiceNow Fluent Artifact List
Detail every required ServiceNow metadata artifact needed for this story. Use precise Fluent naming conventions:
- **Tables** (`sys_db_object`): E.g., `x_snc_app.u_custom_table`, path `src/tables/MyTable.now.ts`.
- **Roles & ACLs** (`sys_user_role`, `sys_security_acl`): Exact roles needed and operation mappings (create, read, write, write). Use typical Fluent format in `.now.ts`.
- **Business Logic** (`sys_script`, Script Includes): Specify Business Rule timings (before, after, async) and purpose.
- **Workflows & Flows** (`sys_hub_flow`): Inputs/outputs and actions.
- **REST APIs**: Paths, methods, request/response payloads, and security.
- **UI Components** (@servicenow/react-components): Workspace structures, forms, fields, and custom modules.
- **ATF Tests** (`sys_atf_test`): Define tests that must be written to cover these artifacts.
- *For each artifact, state its exact purpose, filename, and development complexity (Low, Medium, High).*

#### B. Dependencies
Clearly state dependencies on other stories (e.g., "Story US-102 depends on Story US-101 for the underlying table schema").

#### C. Technical/Implementation Acceptance Criteria
Write objective criteria phrased in developer terms:
- [ ] Database schema is defined with correct field types (String, Choice, GlideDateTime, Reference).
- [ ] Business rule runs after insert/update and prevents recursive loops.
- [ ] Web component handles empty states gracefully and aligns with ServiceNow tokens.
- [ ] ATF test suite covers all CRUD operations and executes with 100% pass rate.

### Step 3.3: Create User Stories under the Feature
1. Format the designed User Stories and present them to the user for confirmation.
2. Once approved, invoke the PM create tool to instantiate each Story.
3. **Linking:** Use the discovered linking tools to establish the parent-child relationship (Feature -> default child Story relationship).

---

## 4. Workflow B: Post-Build Traceability Update (Post-Build)

Once the toolbox's development agents (like `nowdev-ai-toolbox-fluent-development` or others) have completed building the artifacts, re-invoking this skill allows you to map actual workspace outputs back to the story for complete auditable traceability.

### Step 4.1: Determine the Built File List
1. Run `git status --porcelain` and `git diff --stat` (against the base branch, or since the session's first commit) to enumerate created/modified files in the workspace.
2. If the delegating agent or coordinator carried forward a "Files Touched" list earlier in the session, prefer that list — it already has purpose and exports noted per file.
3. If the workspace is not a git repository or no relevant changes are found, ask the user directly which files were built for this story, or scan `src/` and Fluent project folders for recently modified files as a last resort. Do not fabricate a file list.

### Step 4.2: Extract Traceability Details
From the built file list, gather:
- **Built Files/Artifacts:** Exact paths of all created/updated Fluent `.now.ts` metadata, JavaScript logic, and components.
- **Test Integrity:** Which ATF or unit tests have been written and run to cover these files.
- **Deployment Status:** Where the build is currently deployed (e.g., local codebase, specific PDI, current Update Set, package status) — ask the user if this isn't evident from the workspace.

### Step 4.3: Append Traceability Section
Never overwrite or delete the original Story description or requirement specifications! Instead, generate a highly structured **traceability markdown update** and either append it to the bottom of the Story's description field or add it as a PM work item comment.

Use this identical Markdown template for the traceability summary:

```markdown
## 🔍 NOWDEV AI TRACEABILITY UPDATE

### 🛠️ Built Artifacts
- **[Artifact Type]**: [Artifact Name]
  - **File Path:** `[Workspace Relative Path]`
  - **Purpose:** [What this artifact achieves]

### 🧪 Automated Testing (ATF)
- **Test Case:** [ATF Test Name / Path]
  - **Covered Components:** [List of tables/logic verified]
  - **Verification Method:** [E.g., Client-side UI steps, server-side execution check]

### 🚀 Deployment & Integrity Status
- **Current environment/PDI:** [PDI Target / instance, e.g., PDI-dev-12345]
  - **Build Status:** [Success/Failed/Pending]
  - **Traceability Reference:** `[git commit hash or deployment package reference]`
```

---

## 5. Summary Response Structure

After executing either Workflow A or Workflow B, summarize the outcomes for the developer in a concise, impersonal response. Link to the actual code files in the workspace (NO BACKTICKS - see formatting instructions) and outline any immediate implementation hand-offs.
