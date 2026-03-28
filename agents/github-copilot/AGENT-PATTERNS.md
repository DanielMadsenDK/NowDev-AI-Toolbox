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
- **Browser:** None (development agents don't need to interact with instances)

### Reviewer Agent (NowDev-AI-Reviewer)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Knowledge:** `io.github.upstash/context7/*`
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **NO write tools** (reviewers only analyze, never modify)
- **NO browser tools** (no instance interaction)
- **Handoff:** Include handoff back to NowDev AI Agent

### Debugger Agent (NowDev-AI-Debugger)
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

---

## Canonical: Login Verification Checkpoint

This pattern appears in agents that interact with the ServiceNow instance (Orchestrator and Debugger).
Copy verbatim to ensure consistency:

```markdown
**Login Verification Checkpoint (MANDATORY)**

Before using ANY browser interaction tools (`readPage`, `clickElement`, `screenshotPage`, etc.):

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
