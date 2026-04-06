# Agent Patterns & Maintenance Guide

## What This File Is

This is a **shared maintenance reference** for the NowDev AI Agent system. It documents canonical patterns that all agents should follow to maintain consistency and prevent drift over time.

**Important:** GitHub Copilot does NOT load this file automatically into agent context. However:
- **Humans** can reference this file when editing agent `.agent.md` files
- **AI agents** (via the NowDev AI orchestrator) can explicitly read this file using `read/readFile` when creating or updating agents

The orchestrator's `<documentation>` block instructs: "When creating or editing agent files, read `agents/github-copilot/AGENT-PATTERNS.md` for canonical shared patterns." This makes the file machine-discoverable when the orchestrator is asked to improve agents.

---

## Standard Tool Sets by Agent Role

Use these as templates when creating or modifying agents:

### Orchestrator Agent (NowDev-AI)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Write:** `edit/createDirectory`, `edit/createFile`, `edit/editFiles`
- **Agent Control:** `agent` (to invoke sub-agents)
- **Knowledge:** `io.github.upstash/context7/*` (verify feasibility, docs)
- **Search & Web:** `search`, `web`
- **Tracking:** `todo`
- **Visualization:** `vscode.mermaid-chat-features/renderMermaidDiagram` (for architecture)
- **User Interaction:** `vscode/askQuestions`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal` (for SDK discovery only)
- **Browser (Instance Preview):** `browser/openBrowserPage`, `browser/readPage`, `browser/screenshotPage`, `browser/clickElement`, `browser/typeInPage`, `browser/hoverElement`, `browser/dragElement`, `browser/navigatePage`, `browser/handleDialog`, `browser/runPlaywrightCode`

### Development Agents (Script, BusinessRule, Client, Fluent)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Write:** `edit/createDirectory`, `edit/createFile`, `edit/editFiles`
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*` (mandatory: verify APIs before writing code)
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **Handoff:** Include `handoffs` with "Back to Architect" label pointing to `NowDev AI Agent`
- **Browser:** None — exception: `NowDev-AI-Client-Developer` may include `browser/readPage` and `browser/screenshotPage` (read-only, shared session only) for form inspection during development. It does NOT have `browser/openBrowserPage` — the orchestrator must open the browser first.

### Reviewer Router (NowDev-AI-Reviewer)
- **Read:** `read/readFile`
- **Search:** `search`
- **Tracking:** `todo`
- **Routing:** `agent`
- **NO write tools**, **NO browser tools**, **NO memory tools** (router only — delegates all review work to specialists)
- **Handoff:** Include handoff back to NowDev AI Agent

### Reviewer Specialists (NowDev-AI-Fluent-Reviewer, NowDev-AI-Classic-Reviewer)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*`
- **Tracking:** `todo`
- **Memory:** `vscode/memory` — used for the Dependency Validation pattern (cross-referencing `/memories/session/artifacts.md`)
- **NO write tools** (reviewers only analyze, never modify)
- **NO browser tools** (no instance interaction)
- **Handoff:** Include handoff back to NowDev-AI-Reviewer

### Debugger Agent (NowDev-AI-Debugger)
- **User Interaction:** `vscode/askQuestions` (for Login Verification Checkpoint and clarifying questions)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*`
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **NO write tools** (debuggers only analyze, never implement fixes)
- **Browser (Read-Only & Diagnostic):** `browser/openBrowserPage`, `browser/readPage`, `browser/screenshotPage`, `browser/handleDialog`, `browser/runPlaywrightCode` (for diagnostics only; no interactive tools like clickElement, typeInPage, hoverElement, dragElement)
- **Handoff:** Include handoff back to NowDev AI Agent

### Release Agent (NowDev-AI-Release-Expert)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Write:** `edit/createDirectory`, `edit/createFile`, `edit/editFiles` (for XML files)
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*`
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **Handoff:** Include handoff back to NowDev AI Agent

### Refinement Agent (NowDev-AI-Refinement)
- **Read:** `read/readFile`, `read/problems`
- **User Interaction:** `vscode/askQuestions` (core tool — single batched prompt per round)
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*` (mandatory: validate ServiceNow feasibility before finalizing brief)
- **Tracking:** `todo`
- **NO write tools** (refinement agents analyze and interview only — they produce a brief, not code)
- **NO browser tools** (no instance interaction)
- **NO execution tools** (no terminal access)
- **Handoff:** Handoff to `NowDev AI Agent` with the complete Refined Implementation Brief
- **Invoked when:** User story or implementation request contains vague references (unnamed groups, unspecified URLs, implicit conditions, undefined tables or roles)

### ATF Developer Agent (NowDev-AI-ATF-Developer)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Write:** `edit/createDirectory`, `edit/createFile`, `edit/editFiles`
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*` (mandatory: verify ATF step APIs before writing tests)
- **Tracking:** `todo`
- **Memory:** `vscode/memory` — used for Context Sync Protocol (reads and writes `/memories/session/artifacts.md`)
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask` (for `now-sdk build` validation)
- **Handoff:** Include handoff back to `NowDev-AI-Fluent-Developer`
- **Invoked when:** Logic and Schema artifacts are complete and testable artifacts (REST APIs, Script Includes, Tables, Catalog Items) were generated in the session

---

## Canonical: Login Verification Checkpoint

This pattern appears in agents that interact with the ServiceNow instance (Orchestrator and Debugger).
Copy verbatim to ensure consistency:

```markdown
**Login Verification Checkpoint (MANDATORY)**

**SHARED SESSION SHORT-CIRCUIT:** If the user's message already contains an active browser page attachment (listed in the session context with a page ID and URL), the session is already authenticated. Skip straight to `screenshotPage` using that page ID — do NOT open a new tab, do NOT ask the login question, proceed immediately with browser interaction tools.

Only apply the full checkpoint below when NO shared page is present in context (i.e., you need to open a fresh tab):

1. Open the browser with `browser/openBrowserPage` to the URL you want to inspect
   - If user is not logged in, ServiceNow automatically redirects to the login page
   - If user is logged in, ServiceNow displays the page
2. Ask the user via `askQuestions`: "Are you logged into your ServiceNow instance? (Yes / No)"
   - Message: "I've opened your ServiceNow page. If you're not logged in, you'll see the login page. Please log in manually in the browser. Once logged in, ServiceNow will redirect to the page I wanted to show you."
3. **Only proceed with browser tools after user confirms "Yes"**
   - ServiceNow will have automatically redirected to the requested page once authenticated
   - Browser session persists for the rest of this chat session

**Why this checkpoint is critical:** Browser tools fail silently or hang if used on the unauthenticated login page.
```

---

## Canonical: Browser Tool Selection Guide

### Tool Reference (All Available Tools)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| openBrowserPage | Open a URL in a new integrated browser tab | Opening the first tab; only if no shared page exists in context |
| screenshotPage | Capture a screenshot of the current page | Visual inspection; confirming UI state; presenting results to user |
| readPage | Read the DOM content of the current page | Extracting field names, labels, element states, DOM structure |
| navigatePage | Navigate to a URL or reload | Deep-linking to a ServiceNow record; reloading after state change |
| clickElement | Click an element | Button press, link navigation, checkbox toggle, dropdown open |
| typeInPage | Type text or press keys | Form field input; keyboard shortcuts |
| hoverElement | Hover over an element | Triggering tooltips; hover-dependent UI reveal |
| dragElement | Drag an element onto another | Drag-and-drop UI interactions |
| handleDialog | Respond to a browser dialog | Accepting/dismissing browser-native alerts, confirms, and prompts |
| runPlaywrightCode | Run a Playwright code snippet | LAST RESORT ONLY — see decision tree below |

### Priority Hierarchy (MANDATORY)

Always choose the simplest tool that achieves the goal. Work down this ladder:

1. **Passive inspection first** — `screenshotPage`, `readPage`
   Use these before touching anything. Capture state, read DOM, confirm what's visible.

2. **Targeted interaction** — `clickElement`, `typeInPage`, `hoverElement`, `dragElement`, `handleDialog`, `navigatePage`
   Use individual tools for single, well-defined actions.

3. **Playwright — last resort only** — `runPlaywrightCode`
   Only when individual tools provably cannot achieve the goal (see decision tree).

### Decision Tree for runPlaywrightCode

**BEFORE using `runPlaywrightCode`, answer all of these:**

- Is there a shared browser page in context (page ID + URL visible)? → **STOP. Use individual tools with that page ID. Never use runPlaywrightCode.**
- Can the scenario be completed with a linear chain of individual tool calls? → **STOP. Use individual tools.**
- Is this a single action (click, type, screenshot, navigate)? → **STOP. Use the matching individual tool.**

**Only proceed with `runPlaywrightCode` if ALL of the following are true:**
- No shared browser page exists in context
- The scenario requires extracting a dynamic value AND using it conditionally in the next step
- OR the scenario requires waiting for an async operation (GlideAjax, page redirect) that individual tools cannot wait for
- OR performance metrics or network inspection are explicitly needed
- The scenario cannot be achieved by chaining individual tool calls

### Anti-Patterns (NEVER DO)

- Using `runPlaywrightCode` to "simplify" a multi-step scenario that individual tools can handle linearly
- Using `runPlaywrightCode` when a shared browser page is available in context
- Using `runPlaywrightCode` as the default for any browser task without checking the decision tree
- Skipping `screenshotPage` after navigation or interaction (always capture state)

---

## Canonical: Project Configuration Loading

The NowDev AI Toolbox extension writes `.vscode/nowdev-ai-config.json` in the workspace root. This file is the single source of truth for project context available to all agents.

### Config File Structure

```json
{
  "_comment": "Auto-generated by NowDev AI Toolbox. Agents read this file for project context.",
  "instanceUrl": "https://dev342079.service-now.com/",
  "preferredDevelopmentStyle": "fluent",
  "fluentApp": {
    "scope": "x_1118332_userpuls",
    "scopeId": "d3bdfeeaccba4178b19f95980f87fb23",
    "name": "UserPulse",
    "scopePrefix": "x",
    "numericScopeId": "1118332"
  },
  "environment": {
    "os": "linux",
    "osVersion": "6.6.87",
    "arch": "x64",
    "shell": "/bin/bash",
    "availableTools": {
      "node": { "version": "20.11.0", "label": "Node.js", "description": "JavaScript runtime for build tools and SDK" },
      "npm": { "version": "10.2.4", "label": "npm", "description": "Node package manager" },
      "now-sdk": { "version": "1.5.0", "label": "ServiceNow SDK (now-sdk)", "description": "ServiceNow Fluent SDK CLI for build and deploy" },
      "git": { "version": "2.43.0", "label": "Git", "description": "Version control system" },
      "python": { "version": "3.12.1", "label": "Python", "description": "Scripting language for automation and data tasks" }
    }
  }
}
```

### `fluentApp` Object (auto-detected from `now.config.json`)

Present only when the workspace contains a ServiceNow Fluent project (`now.config.json`). Fields:

| Field | Example | Usage |
|-------|---------|-------|
| `scope` | `x_1118332_userpuls` | Prefix for all scoped metadata — tables, roles, properties, ACLs |
| `scopeId` | `d3bdfeeacc...` | Application GUID (used in some API calls, not in URLs) |
| `name` | `UserPulse` | Display name |
| `scopePrefix` | `x` | Vendor prefix |
| `numericScopeId` | `1118332` | Numeric ID for scoped workspace URLs: `/x/1118332/{path}` |

### `environment` Object (auto-detected at extension activation)

Scanned by the extension on startup. Only tools that are both installed and user-enabled appear in `availableTools`. Users can disable tools via the sidebar UI — those choices persist across restarts and the scan respects them.

| Field | Example | Usage |
|-------|---------|-------|
| `os` | `linux` / `windows` / `macos` | OS the agent is running on |
| `osVersion` | `6.6.87` | Kernel / OS build version |
| `arch` | `x64` / `arm64` | CPU architecture |
| `shell` | `/bin/bash` | Default shell |
| `availableTools` | `{ "node": {...}, ... }` | Map of tool key → `{ version, label, description }` |

**Critical rule:** Agents MUST NOT use any scripting language, CLI tool, or runtime that is not present in `availableTools`. If `python` is absent, do not write Python scripts. If `now-sdk` is absent, Fluent build/deploy is not possible. If `powershell` is absent, do not write PowerShell scripts. Always inform the user what is missing and why when a required tool is unavailable.

### Who Loads What

- **Orchestrator (NowDev-AI)**: Reads the full config file in workflow step 3. Passes all fields — including `environment` — to sub-agents.
- **Fluent Developer coordinator**: Receives `fluentApp` and `environment` from orchestrator and forwards to all specialists.
- **Leaf development agents**: Receive scope context and environment capabilities in their delegation prompt. Use `scope` to prefix metadata names, `numericScopeId` for workspace URL construction, and `availableTools` to constrain which external tools they may invoke.

---

## Canonical: File Output Guidelines by Agent Type

### Development Agents (Script, BusinessRule, Client, Fluent)

**Default behavior for new implementations:** Create JavaScript (.js) files automatically without user confirmation.

```markdown
#### When to Create New Files (Automatic):
- **New implementations** (Script Includes, Business Rules, Client Scripts, etc.)
- **New components or modules** that don't exist in the workspace
- When the user explicitly requests new functionality

#### When to Modify Existing Files (Requires Confirmation):
- **Modifications to existing implementations** when user specifies the target file
- **Updates or bug fixes** to existing code when user provides the file path or name
- Ask: "Should I modify the existing file at [path] or create a new implementation?"

#### Information to Pass to Orchestrator:
- File mode: "new" (default) or "modify"
- Target file path: Only if modifying existing file
- Artifact type: Script Include, Business Rule, Client Script, etc.
```

### Reviewer Agent

```markdown
## File Output Guidelines

### **MANDATORY: Follow Orchestrator File Output Policy**

**NEVER create new files or modify existing files directly.**

- **Analysis Only:** Your role is to analyze issues and provide diagnostic recommendations
- **Suggest Fixes:** Provide specific recommendations for fixes without implementing them
- **Report Findings:** Document issues and suggest solutions that the orchestrator can delegate
- **Delegate Changes:** If code changes are needed, inform the orchestrator to invoke the appropriate development agent
```

### Debugger Agent

```markdown
### **MANDATORY: Follow Orchestrator File Output Policy**

**NEVER create new files or modify existing files directly.**

- **Analysis Only:** You are a debugger agent - your role is to analyze issues and provide diagnostic recommendations
- **Suggest Fixes:** Provide specific recommendations for fixes without implementing them
- **Report Findings:** Document issues and suggest solutions that the orchestrator can delegate
- **Delegate Changes:** If code changes are needed, inform the orchestrator to invoke the appropriate development agent
```

---

## Canonical: Context7 Verification Pattern

All development agents MUST verify APIs before writing code. Include this in your stopping rules:

```markdown
<stopping_rules>
STOP IMMEDIATELY if implementing without Context7 verification
STOP IMMEDIATELY if using training data for ServiceNow APIs
STOP if todo plan not documented
STOP if proceeding before Context7 confirms API validity
</stopping_rules>

<documentation>
query-docs('/websites/servicenow') for classic ServiceNow API availability, parameter requirements, usage patterns
query-docs('/servicenow/sdk-examples') for official ServiceNow SDK Fluent API examples (if applicable)
MANDATORY FIRST STEP: Verify every API and pattern before writing code
</documentation>
```

---

## How to Add a New Agent

When creating a new agent (human or AI):

1. **Choose the agent role** (Orchestrator, Development, Reviewer, Debugger, or Release) — this determines the tool set
2. **Use the matching tool set** from the "Standard Tool Sets" section above
3. **Define `<workflow>`, `<stopping_rules>`, `<documentation>`, and `<state_tracking>` XML blocks**
   - These are critical structured directives that Copilot processes before the markdown body
   - Follow existing agents as templates
4. **Write the markdown body** with clear instructions for the agent's specific responsibilities
5. **Include canonical patterns** where applicable:
   - If your agent interacts with instances: include **Login Verification Checkpoint**
   - If your agent creates/modifies files: include **File Output Guidelines** specific to its role
   - If your agent writes code: include **Context7 Verification Pattern** in stopping rules
6. **Include a handoff** back to the orchestrator (except for the orchestrator itself)
7. **Keep the description concise** — it's the primary trigger for Copilot to select your agent
8. **Test the agent** by invoking it from the orchestrator and verifying:
   - All referenced tools are in the tools list
   - Handoffs point to valid agents
   - Instructions are clear and unambiguous

---

## Common Pitfalls to Avoid

- **Missing tools:** Agent code references a tool that's not in the tools list (causes silent failure)
- **Duplicate content:** Same pattern written in multiple agents instead of extracted here and referenced
- **Unclear role boundaries:** Agent attempts to implement when it should only analyze (breaks orchestration pattern)
- **Overly long SKILL.md files:** Aim for <500 lines; use `<references/>` subdirectories for detailed content
- **Weak descriptions:** Users/Copilot won't discover your agent if the description doesn't mention when to use it

---

## Critical VS Code Configuration

The NowDev AI Agent system uses a multi-level agent hierarchy (up to 4 levels deep). GitHub Copilot's `chat.subagents.allowInvocationsFromSubagents` setting **must be enabled** for this to work.

**Without this setting, Level 1 coordinators (Classic-Developer, Fluent-Developer) cannot invoke their Level 2 specialists, and the entire hierarchy silently fails.**

Add this to your VS Code `settings.json`:

```json
{
  "chat.subagents.allowInvocationsFromSubagents": true
}
```

This setting is `false` by default. It must be enabled for any workspace using NowDev AI agents.

---

## Canonical: Session Artifact Registry

When multiple sub-agents work on the same project, they run in **isolated context windows** — each sub-agent receives only the task prompt from its parent and returns only a summary. Siblings cannot see each other's output. This creates a risk of information loss when later agents depend on earlier agents' work (e.g., a Business Rule that calls a Script Include built by a different agent).

The **Session Artifact Registry** uses the built-in `memory` tool's **session scope** (`/memories/session/`) to store a shared artifact dependency graph that all development agents read from and write to. Session memory auto-clears when the conversation ends — no manual cleanup needed.

### How It Works

1. **The root orchestrator** uses the `memory` tool to create `/memories/session/artifacts.md` at the start of every full-project session
2. **Every development agent** uses the `memory` tool to read the registry before starting work (to discover what sibling agents built)
3. **Every development agent** uses the `memory` tool to update the registry after completing work
4. **Coordinator agents** still pass explicit context in prompts — the registry is a safety net, not a replacement
5. **Session memory auto-clears** when the conversation ends — no cleanup step required

### Registry File Format

Location: `/memories/session/artifacts.md` (via the `memory` tool)

```markdown
# Session Artifact Registry

| Artifact Name | File | Type | Agent | Exports | Status | Depends On |
|---------------|------|------|-------|---------|--------|------------|
| IncidentUtils | src/script-includes/IncidentUtils.js | Script Include | Script-Developer | `IncidentUtils.getActiveCount(groupSysId)`, `IncidentUtils.reassign(incidentGr, userSysId)` | ✅ Done | — |
| AutoAssignIncident | src/business-rules/AutoAssignIncident.js | Business Rule (before/insert) | BusinessRule-Developer | — | 🏗️ In Progress | IncidentUtils |
| x_myapp_asset | src/fluent/tables/x_myapp_asset.now.ts | Table | Fluent-Schema-Developer | fields: name, status, assigned_to, location | ✅ Done | — |
```

### Column Rules

- **Artifact Name**: short identifier for the artifact (class name, table name, rule name) — used by other agents to reference this artifact in the `Depends On` column
- **File**: relative path to the created/modified file
- **Type**: artifact type (Script Include, Business Rule, Client Script, Table, ACL, Flow, UI Page, AiAgent, NowAssistSkillConfig, etc.)
- **Agent**: which agent created this entry (for traceability)
- **Exports**: class names, method signatures, field names, role names — anything downstream agents need to reference
- **Status**: `🏗️ In Progress` when the agent starts work, updated to `✅ Done` when complete
- **Depends On**: artifact names (from the `Artifact Name` column) that this artifact depends on — used for dependency validation during review

### Memory Tool Operations

The `memory` tool provides these commands for registry management:

| Operation | Memory Tool Command | When to Use |
|-----------|-------------------|-------------|
| Create registry | `memory create` with path `/memories/session/artifacts.md` | Root orchestrator initializes the registry |
| Read registry | `memory view` with path `/memories/session/artifacts.md` | All agents read before starting work |
| Add entry | `memory insert` at end of file | Leaf agents add 🏗️ In Progress entries |
| Update status | `memory str_replace` to change `🏗️ In Progress` → `✅ Done` | Leaf agents update after completing work |

### Context Sync Protocol (All Leaf Development Agents)

Every leaf development agent MUST follow this protocol:

1. **Read**: use the `memory` tool to view `/memories/session/artifacts.md` to discover what exists
2. **Read dependency files**: for each artifact listed in the `Depends On` column of your planned work, use `read/readFile` to read the actual source file to get exact method signatures, class structures, and field names — do not rely solely on the `Exports` summary
3. **Write 🏗️**: use the `memory` tool to insert your entry with `Status: 🏗️ In Progress` before starting implementation
4. **Implement**: write the code
5. **Update ✅**: use the `memory` tool `str_replace` to change your entry's status to `✅ Done` and fill in the `Exports` column with accurate method signatures and key identifiers

### Dependency Validation (Reviewer Agents)

Both `NowDev-AI-Classic-Reviewer` and `NowDev-AI-Fluent-Reviewer` MUST cross-reference `/memories/session/artifacts.md` during review:

1. Use the `memory` tool to view the registry and build a dependency graph
2. For each artifact under review, check its `Depends On` column
3. Verify that every referenced dependency exists in the registry with `Status: ✅ Done`
4. Verify that method signatures used in the reviewed code match the `Exports` column of the dependency
5. Flag any mismatches as **Critical** findings (e.g., calling `IncidentUtils.validate()` when the Script Include exports `IncidentUtils.validatePriority()`)

### Agent Instructions (Copy to Development Agents)

**For leaf development agents** (Script-Developer, BusinessRule-Developer, Client-Developer, Fluent-Schema/Logic/Automation/UI-Developer, AI-Agent-Developer, NowAssist-Developer):

```markdown
## Session Artifact Registry

**Context Sync (MANDATORY first steps):**
1. Use the `memory` tool to view `/memories/session/artifacts.md` (if it exists) to discover artifacts created by sibling agents
2. For each artifact in your `Depends On` list, use `read/readFile` to read the actual source file (not just the registry summary) to get exact method signatures, class names, and field names
3. Use the `memory` tool to insert your entry to the registry with `Status: 🏗️ In Progress` before writing any code

**After completing implementation**, use the `memory` tool `str_replace` to update your registry entry: change status to `✅ Done` and fill in accurate `Exports`.

Registry format:
| Artifact Name | File | Type | Agent | Exports | Status | Depends On |
|---------------|------|------|-------|---------|--------|------------|
| {name} | {relative path} | {artifact type} | {your agent name} | {key exports} | 🏗️ In Progress → ✅ Done | {dependency names or —} |
```

**For coordinator agents** (Classic-Developer, Fluent-Developer):

```markdown
## Session Artifact Registry

Before delegating to the first specialist, use the `memory` tool to check if `/memories/session/artifacts.md` exists. If not, use the `memory` tool to create it with this content:

\```markdown
# Session Artifact Registry

| Artifact Name | File | Type | Agent | Exports | Status | Depends On |
|---------------|------|------|-------|---------|--------|------------|
\```

After each specialist completes, use the `memory` tool to verify they updated their status to ✅ Done and filled in Exports. When delegating to the next specialist, include: "Use the `memory` tool to view `/memories/session/artifacts.md` for artifacts created by previous specialists. Use `read/readFile` to read the actual source files of your dependencies."
```

---

## Canonical: Reviewer Fix Delegation Pattern

This pattern closes the governance loop: **generate → review → fix → re-review**. Reviewer specialists output a machine-parseable findings block; the reviewer router uses it to offer one-click fix delegation to the appropriate developer specialist.

### How It Works

1. **Reviewer specialist** (Classic or Fluent) completes its review and emits a **Structured Findings Block** as a JSON code fence at the end of its response (Section 9 of the output format).
2. **Reviewer router** (`NowDev-AI-Reviewer`) reads the block and — if `review_status` is not PASS — presents a fix delegation summary and instructs the user to click the "Fix Issues" handoff button.
3. **User clicks the handoff** (one-approved action). The router invokes the appropriate developer specialist with the full structured findings as context.
4. **Developer specialist** applies all fixes in priority order (Critical first) using the JSON block for precise targeting.
5. **Developer hands back** to the orchestrator. The orchestrator may then re-invoke the reviewer for a re-review of the changed files.

### Structured Findings JSON Schema

Both `NowDev-AI-Classic-Reviewer` and `NowDev-AI-Fluent-Reviewer` MUST emit this block as the final section (Section 9) of every review response.

```json
{
  "review_status": "<PASS | REQUEST CHANGES | CRITICAL ISSUES>",
  "reviewed_files": ["<relative/path/to/reviewed/file>"],
  "findings": [
    {
      "id": "F001",
      "file": "<relative/path/to/file>",
      "line": 0,
      "artifact_type": "<e.g. Script Include | Table | Flow | Business Rule | ...>",
      "category": "<Security | Performance | Correctness | Maintainability | Best Practice | Schema Mismatch | Deprecated Pattern>",
      "priority": "<Critical | High | Medium | Low>",
      "problem": "<one-sentence description of the deviation from best practice>",
      "recommended_fix": "<one-sentence description of the exact change needed>"
    }
  ]
}
```

**Rules:**

- Emit one entry per finding; `id` values correspond to finding numbers in Section 3 (e.g. F001 = first Detailed Finding).
- Use `[]` for `findings` when `review_status` is `PASS`.
- Always include this block — even on PASS — so the router can reliably branch on `review_status`.

### Handoff Buttons (Router Agent)

`NowDev-AI-Reviewer` includes two fix-delegation handoff buttons in its frontmatter:

| Button Label | Target Agent | When to Use |
|---|---|---|
| Fix Issues — Classic Developer | NowDev-AI-Classic-Developer | Classic-only or Classic portion of Mixed review |
| Fix Issues — Fluent Developer | NowDev-AI-Fluent-Developer | Fluent-only or Fluent portion of Mixed review |

When the user clicks a fix button, the target developer receives the full conversation context (including the Structured Findings Block) and applies corrections in priority order.

### Fix Delegation Rules (Router Workflow Step 6)

After presenting the specialist's full findings:

1. If `review_status` is `REQUEST CHANGES` or `CRITICAL ISSUES`:
   - Count findings by priority level and state the total
   - Identify the correct developer (Classic, Fluent, or both for Mixed)
   - Tell the user to click the matching "Fix Issues" handoff button
2. If `review_status` is `PASS`: confirm no fix delegation is needed and offer "Back to Architect"

### Governance Loop Completion

After the developer specialist returns control to the orchestrator, the orchestrator SHOULD re-invoke `NowDev-AI-Reviewer` with the same file list to verify fixes. This closes the generate → review → fix → re-review loop.
