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
- **Knowledge:** Use `{{PRODUCT_DOCS_CONTEXT}}` / `{{SDK_DOCS_CONTEXT}}` tokens in the `<documentation>` block for doc access
- **Search & Web:** `search`, `web`
- **Tracking:** `todo`
- **Visualization:** `vscode.mermaid-chat-features/renderMermaidDiagram` (for architecture)
- **User Interaction:** `vscode/askQuestions`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal` (for SDK discovery only)
- **Browser (Instance Preview):** `browser/openBrowserPage`, `browser/readPage`, `browser/screenshotPage`, `browser/clickElement`, `browser/typeInPage`, `browser/hoverElement`, `browser/dragElement`, `browser/navigatePage`, `browser/handleDialog`, `browser/runPlaywrightCode`

## Canonical: Tool-First Clarification

Agents should answer their own factual questions before asking the user. Ask the user for intent, priorities, credentials, destructive-action approval, or business judgment; use tools for discoverable facts.

**Clarification order:**
1. Workspace facts: read `.vscode/nowdev-ai-config.json`, `now.config.json`, package files, source files, and session memory.
2. SDK/Fluent API facts: use `now-sdk explain` first (`--list`, `--peek`, or raw topic output when useful), then SDK llms.txt/docs only if explain does not cover the topic.
3. Live instance facts: use `now-sdk query` for table metadata, sys_ids, roles, scopes, choices, ACLs, existing artifact collisions, and selected Knowledge Base guideline articles.
4. Product docs: use configured MCP/doc sources or ServiceNow product llms.txt for platform/product behavior not covered by SDK CLI.
5. User questions: ask only when tool results are missing, conflicting, risky, or require human intent.

For `now-sdk` CLI mechanics — flag discovery, the `--peek`/`--format raw` discipline, and the full command surface beyond `explain`/`query` — see `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md`.

When invoking sub-agents, include the same clarification instruction and pass any discovered facts rather than asking downstream agents to rediscover them unnecessarily.

## Canonical: Parallel Sub-Agent Execution

The orchestrator and coordinator agents should build a dependency graph before delegation:

- Run independent discovery tasks in parallel (repo scan, SDK docs lookup, live instance lookup, UX/context review).
- Run independent implementation streams in parallel when they do not write the same files and do not depend on each other's exports.
- Gate dependent tasks explicitly: Schema before Logic; shared Script Include before Business Rule/Client Script; implementation before review; review before release.
- Use multi-perspective reviews in parallel where possible (correctness, security, performance, UX), then synthesize results.
- Prevent write conflicts by assigning each sub-agent an explicit file/artifact ownership boundary.

Sub-agent prompts must specify: task scope, owned files/artifacts, dependencies already complete, expected output, validation command, and what to include in its "Files Touched" handoff list.

## Canonical: Copilot Sub-Agent Controls

Use VS Code Copilot sub-agents when context isolation improves the result: isolated research before implementation, independent parallel analysis, multiple solution exploration, specialized review, or coordinator-to-worker delegation. Do not use sub-agents just to split a small linear task.

Frontmatter must make invocation boundaries explicit:

- `NowDev AI Agent` is the only user-invocable entry point.
- Internal agents must set `user-invocable: false` and `disable-model-invocation: true`.
- Coordinators and routers must define an explicit `agents: [...]` allow-list and include the `agent` tool.
- Leaf agents must define `agents: []` and must not include the `agent` tool.
- Explicit parent allow-lists are the only intended way to invoke protected internal agents as sub-agents.
- Avoid source-level `model` defaults unless there is a documented cost or quality policy for that specific agent role; use sidebar model overrides for normal customization.

Delegation prompts should be narrow and complete. The parent agent passes discovered facts, project style, scope/app context, environment capabilities, owned files/artifacts, dependency outputs, validation expectations, and the exact expected return format. Downstream agents should not redo broad discovery already performed by the parent.

For review work, prefer independent perspectives where useful: correctness, security, performance, architecture/maintainability, and ServiceNow API compliance. Preserve the reviewer's Structured Findings Block when synthesizing.

Validate bundled agent changes before publishing:

```bash
npm run validate:agents
```

This command checks frontmatter shape, invocation boundaries, sub-agent and handoff references, topology coverage, write-tool restrictions for read-only roles, and maximum nested sub-agent depth.

## Canonical: Context Engineering

Agents should spend context only on information that changes the next decision or implementation step. Prefer narrow discovery, explicit handoffs, and reusable shared references over repeatedly loading broad docs or embedding large examples in agent prompts.

### Request Routing

- Route lightweight questions, brainstorming, and quick explanations to `NowDev-AI-Assistant` before loading full-project context.
- Route debugging symptoms to `NowDev-AI-Debugger` before initializing implementation state.
- For full-project work, separate planning from implementation: refine requirements first, then hand the approved brief to implementation agents.
- Start a new chat for unrelated work. Fork a conversation when exploring alternatives from the same context. Use `/compact` when a session becomes long but the task continues.

### Prompt Weight Budget

- **Orchestrators** should contain routing, approval gates, dependency planning, and cross-agent handoff rules. They should reference shared patterns instead of restating specialist implementation details.
- **Coordinators** should contain sequencing rules, dependency gates, and delegation contracts. They should pass explicit discovered facts rather than requiring each specialist to rediscover them.
- **Routers** should contain classification rules only. They should not load product documentation or implementation examples unless routing genuinely depends on them.
- **Specialists** should contain only the role boundary, short workflow, stopping rules, documentation pointers, and output contract. Move durable API guidance, examples, and playbooks to `agents/skills/`, `agents/exemplars/`, or external docs.

### Tool Scope

- Give each agent only the tools needed for its role. Remove write tools from reviewers, routers, and debuggers. Remove browser tools unless the agent directly inspects an instance page.
- Prefer `read/readFile`, `search`, and memory lookups before broader `web` or MCP calls.
- Use terminal execution only when the agent has an execution role and the required runtime appears in `.vscode/nowdev-ai-config.json` under `environment.availableTools`.
- Disable unneeded MCP servers and tools for the current task when possible. Every tool call adds output to the context window.

### Documentation Token Policy

- Include `{{PRODUCT_DOCS_CONTEXT}}` only in agents that verify ServiceNow platform behavior or release-specific APIs.
- Include `{{FLUENT_SDK_EXPLAIN}}` in Fluent agents that need SDK signatures, metadata APIs, or build/deploy behavior. Add `{{SDK_DOCS_CONTEXT}}` only as supplemental context when `now-sdk explain` does not cover the question.
- Include `{{CLASSIC_SCRIPTING_DOCS}}` only in Fluent agents and reviewers that need Glide/platform API verification for script bodies embedded in Fluent metadata.
- Router-only agents should usually omit documentation tokens; they classify and delegate, they do not verify APIs.
- Live instance query guidance belongs only with agents that can execute terminal commands and are expected to resolve instance facts.

### Sub-Agent Context Contract

Every delegation prompt must include:

- Task scope and success criteria.
- Owned files or artifact boundaries.
- Facts already discovered by the parent agent, including project style, scope, instance URL, and environment capabilities.
- Dependencies already completed and the exact files/exports that downstream work may use.
- Validation command or validation expectation for the sub-agent's slice.
- Expected output format, including created/modified files, validation results, warnings, and memory registry updates.

Do not ask downstream agents to repeat broad discovery that the parent has already completed. Pass summaries for orientation, and pass file paths or memory entries when exact details are needed.

## Canonical: Specialist Prompt Contract

Specialist `.agent.md` files should stay lean. Put reusable examples, long API notes, pipeline templates, debugging playbooks, and release recipes in `agents/skills/`, `agents/exemplars/`, or external docs. For Fluent SDK APIs, prefer `now-sdk explain` over local reference docs. The agent prompt itself should contain only:

- A role boundary: what the agent owns and what it must not do.
- A short workflow: discovery, tool-first clarification, implementation or analysis, validation, and handoff.
- Stopping rules: destructive actions, missing credentials, missing environment tools, or work outside the role.
- Documentation pointers: `now-sdk explain`, `now-sdk query`, configured docs for supplemental context, relevant local guardrail skills, and exemplar file paths.
- Output contract: what the caller receives, including changed files, validation results, warnings, and next handoff.

Avoid embedding code samples unless they are tiny enough to prevent a repeated mistake and cannot reasonably live in a skill file. For Fluent SDK API shape, reference `now-sdk explain <topic> --format raw`; for `now-sdk` CLI mechanics and the full command surface, reference `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md`; for NowDev-specific guardrails, prefer `agents/exemplars/` over duplicating the content in every specialist.

## Canonical: Agent Consolidation Policy

Keep specialist agents available as implementation boundaries, but expose them through a smaller user-facing surface:

- The primary user entry point is `NowDev AI Agent`.
- Router/coordinator agents decide between bundles and specialists.
- Optional specialist bundles are enabled as units in the extension UI.
- Do not delete specialist agents just to reduce visible complexity if they still encode useful ownership boundaries or handoff targets.
- When a specialist mostly repeats shared rules, simplify the prompt and point to this file plus the relevant skill docs.

### Development Agents (Fluent specialists)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Write:** `edit/createDirectory`, `edit/createFile`, `edit/editFiles`
- **Search:** `search`, `web`
- **Knowledge:** Use doc tokens in `<documentation>` block (`{{CLASSIC_SCRIPTING_DOCS}}`, `{{SDK_DOCS_CONTEXT}}`, `{{PRODUCT_DOCS_CONTEXT}}`, `{{FLUENT_SDK_EXPLAIN}}` as applicable)
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **Handoff:** Include `handoffs` with "Back to Architect" label pointing to `NowDev AI Agent`
- **Browser:** None — Fluent development specialists do not interact with the instance browser; the orchestrator and Debugger handle instance inspection.

### Reviewer Specialist (NowDev-AI-Fluent-Reviewer)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Knowledge:** Use doc tokens in `<documentation>` block
- **Tracking:** `todo`
- **Memory:** optional legacy context only. Dependency validation uses the cross-agent file handoff protocol described in "Canonical: Cross-Agent File Handoff" below.
- **NO write tools** (reviewers only analyze, never modify)
- **NO browser tools** (no instance interaction)
- **Handoff:** Include a "Back to Architect" handoff to `NowDev AI Agent`, plus a "Fix Issues — Fluent Developer" handoff to `NowDev-AI-Fluent-Developer`

### Debugger Agent (NowDev-AI-Debugger)
- **User Interaction:** `vscode/askQuestions` (for Login Verification Checkpoint and clarifying questions)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/awaitTerminal`, `execute/killTerminal`, `execute/createAndRunTask`
- **NO write tools** (debuggers only analyze, never implement fixes)
- **Browser (Read-Only & Diagnostic):** `browser/openBrowserPage`, `browser/readPage`, `browser/screenshotPage`, `browser/handleDialog`, `browser/runPlaywrightCode` (for diagnostics only; no interactive tools like clickElement, typeInPage, hoverElement, dragElement)
- **Handoff:** Include handoff back to NowDev AI Agent

### Release Agent (NowDev-AI-Fluent-Release)
- **Read:** `read/readFile`, `read/problems`, `read/terminalLastCommand`
- **Search:** `search`, `web`
- **Tracking:** `todo`
- **Execution:** `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/killTerminal`, `execute/createAndRunTask` (for `now-sdk build` and `now-sdk install`)
- **NO write tools** (deploys via the SDK; never edits application source)
- **Handoff:** Include handoff back to NowDev AI Agent

### Refinement Agent (NowDev-AI-Refinement)
- **Read:** `read/readFile`, `read/problems`
- **User Interaction:** `vscode/askQuestions` (core tool — single batched prompt per round)
- **Search:** `search`, `web`
- **Knowledge:** Use `{{PRODUCT_DOCS_CONTEXT}}` in `<documentation>` block to validate feasibility
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
- **Knowledge:** Use `{{FLUENT_SDK_EXPLAIN}}` and `{{SDK_DOCS_CONTEXT}}` in `<documentation>` block to verify ATF step APIs
- **Tracking:** `todo`
- **Memory:** optional legacy context only. Cross-agent handoff uses the protocol described in "Canonical: Cross-Agent File Handoff" below.
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
  "fluentApp": {
    "scope": "x_your_scope_id",
    "scopeId": "d3bdfeeaccba4178b19f95980f87fb23",
    "name": "YourAppName",
    "scopePrefix": "x",
    "numericScopeId": "1234567"
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
| `scope` | `x_your_scope_id` | Prefix for all scoped metadata — tables, roles, properties, ACLs |
| `scopeId` | `d3bdfeeacc...` | Application GUID (used in some API calls, not in URLs) |
| `name` | `YourAppName` | Display name |
| `scopePrefix` | `x` | Vendor prefix |
| `numericScopeId` | `1234567` | Numeric ID for scoped workspace URLs: `/x/1234567/{path}` |

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

### Development Agents (Fluent specialists)

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

## Canonical: API Verification Pattern

All development agents MUST verify APIs before writing code. Include doc tokens in the `<documentation>` block and a stopping rule:

```markdown
<stopping_rules>
STOP IMMEDIATELY if using training data for Fluent SDK APIs — verify with `now-sdk explain <topic> --format raw`
STOP IMMEDIATELY if using training data for Classic or platform APIs — verify with the configured product or scripting docs source
STOP if todo plan not documented
</stopping_rules>

<documentation>
{{FLUENT_SDK_EXPLAIN}}           <!-- always-on for Fluent SDK topics -->
{{SDK_DOCS_CONTEXT}}             <!-- supplemental SDK docs only when now-sdk explain does not cover the topic -->
{{CLASSIC_SCRIPTING_DOCS}}       <!-- user-configured Classic API docs -->
{{PRODUCT_DOCS_CONTEXT}}         <!-- user-configured general platform docs -->
</documentation>
```

Use only the tokens relevant to the agent's artifact types. Agents are free to omit tokens that don't apply.

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
   - If your agent writes code: include **API Verification Pattern** in stopping rules and `<documentation>` block
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

**Without this setting, Level 1 coordinators (Fluent-Developer) cannot invoke their Level 2 specialists, and the entire hierarchy silently fails.**

Add this to your VS Code `settings.json`:

```json
{
  "chat.subagents.allowInvocationsFromSubagents": true
}
```

This setting is `false` by default. It must be enabled for any workspace using NowDev AI agents.

---

## Canonical: Cross-Agent File Handoff

When multiple sub-agents work on the same project, they run in **isolated context windows** — each sub-agent receives only the task prompt from its parent and returns only a summary. Siblings cannot see each other's output. This creates a risk of information loss when later agents depend on earlier agents' work (e.g., a Business Rule that calls a Script Include built by a different agent).

Handoffs are carried **in-context**, through the delegation prompts themselves — there is no persisted registry file to keep in sync. The VS Code `memory` tool is optional legacy context only — never the source of truth.

This section is the canonical source for the handoff format, coordinator responsibilities, reviewer dependency validation, and context-compaction recovery. Keep agent prompts brief and reference this section instead of restating the convention in every agent.

**Source of truth:** The actual source files on disk are always the source of truth. A sibling agent's claimed exports (method names, class names, table names, field names, roles, REST paths, test names) are a pointer to go read — never trust them without opening the file.

**Agent responsibilities before implementation or dependent review:**
1. Read `.vscode/nowdev-ai-config.json` for project context (instance URL, Fluent app scope, environment capabilities).
2. Read the "Files Touched" list carried forward from the coordinator's delegation prompt, if any.
3. For every dependency, read the actual source file before trusting a method name, class name, table name, field name, role, REST path, or test name claimed for it.
4. Do not require Copilot memory for handoff tracking — memory may be preview, unavailable, or disabled by policy.

**Agent responsibilities after implementation:**
1. List every created or modified file.
2. Include each file's relative path and a one-line purpose.
3. Include key exports downstream agents can safely consume (class/method/table/field/role names).
4. End the response with a **"Files Touched"** markdown list — no JSON block required:

```markdown
### Files Touched
- `<relative/path>` — <purpose>. Exports: <class/method/table/field/role names>
```

**Coordinator responsibilities:** Before delegating to the first specialist, coordinators pass along any "Files Touched" list already gathered in the session. After each specialist returns, coordinators carry its "Files Touched" list verbatim into subsequent delegation prompts for any dependent work, and tell the next specialist to read those files directly before using anything from them.

**Reviewer responsibilities:** Reviewers must cross-reference each specialist's claimed exports against the actual source code. Flag wrong method names, missing parameters, missing fields, or calls to non-existent exports as findings.

**Context compaction recovery:** After compaction or resumptions, re-read `.vscode/nowdev-ai-config.json` and re-derive the touched-file list from the conversation, a `git status`/`git diff --stat` check, or by asking the user. Do not rely on compressed chat memory for file names, signatures, or dependencies.

---

## Canonical: Reviewer Fix Delegation Pattern

This pattern closes the governance loop: **generate → review → fix → re-review**. The Fluent reviewer outputs a machine-parseable findings block and exposes a one-click fix-delegation handoff to the Fluent developer.

### How It Works

1. **`NowDev-AI-Fluent-Reviewer`** completes its review and emits a **Structured Findings Block** as a JSON code fence at the end of its response (Section 9 of the output format).
2. If `review_status` is not PASS, the reviewer presents a fix delegation summary and instructs the user to click the "Fix Issues — Fluent Developer" handoff button.
3. **User clicks the handoff** (one-approved action). `NowDev-AI-Fluent-Developer` receives the full structured findings as context.
4. **Fluent developer** applies all fixes in priority order (Critical first) using the JSON block for precise targeting.
5. **Developer hands back** to the orchestrator. The orchestrator may then re-invoke the reviewer for a re-review of the changed files.

### Structured Findings JSON Schema

`NowDev-AI-Fluent-Reviewer` MUST emit this block as the final section (Section 9) of every review response.

```json
{
  "review_status": "<PASS | REQUEST CHANGES | CRITICAL ISSUES>",
  "reviewed_files": ["<relative/path/to/reviewed/file>"],
  "findings": [
    {
      "id": "F001",
      "file": "<relative/path/to/file>",
      "line": 0,
      "artifact_type": "<e.g. Table | Flow | ScriptInclude | UiPage | React | ...>",
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
- Always include this block — even on PASS — so the reviewer can reliably branch on `review_status`.

### Handoff Buttons (Reviewer Agent)

`NowDev-AI-Fluent-Reviewer` includes these handoff buttons in its frontmatter:

| Button Label | Target Agent | When to Use |
|---|---|---|
| Back to Architect | NowDev AI Agent | Always — return control and findings to the orchestrator |
| Fix Issues — Fluent Developer | NowDev-AI-Fluent-Developer | When `review_status` is REQUEST CHANGES or CRITICAL ISSUES |

When the user clicks the fix button, `NowDev-AI-Fluent-Developer` receives the full conversation context (including the Structured Findings Block) and applies corrections in priority order.

### Fix Delegation Rules (Reviewer Workflow)

After presenting the full findings:

1. If `review_status` is `REQUEST CHANGES` or `CRITICAL ISSUES`:
   - Count findings by priority level and state the total
   - Tell the user to click the "Fix Issues — Fluent Developer" handoff button
2. If `review_status` is `PASS`: confirm no fix delegation is needed and offer "Back to Architect"

### Governance Loop Completion

After `NowDev-AI-Fluent-Developer` returns control to the orchestrator, the orchestrator SHOULD re-invoke `NowDev-AI-Fluent-Reviewer` with the same file list to verify fixes. This closes the generate → review → fix → re-review loop.

---

## Plan Format

Present the solution plan in chat during the Planning Phase using this structure:

```markdown
# Plan: {Task Title}

## Summary
{2-4 sentence overview: what is being built, why, and how}

## ServiceNow Artifacts
| Artifact | Type | Table | Purpose |
|---|---|---|---|
| {name} | Fluent | {.now.ts} | {why it is needed} |

## Implementation Phases
### Phase 1: {Title}
**Objective:** {Clear goal}
**Sub-agent:** {NowDev-AI-Fluent-Developer}
**Acceptance Criteria:**
- [ ] {Specific, testable criteria}

---
{Repeat for each artifact}

## Open Questions
1. {Question}?
   - **Option A:** {approach and tradeoffs}
   - **Option B:** {approach and tradeoffs}
   - **Recommendation:** {your suggestion with reasoning}

## Risks & Mitigation
- **Risk:** {potential issue} — **Mitigation:** {how to address it}

## Success Criteria
- [ ] All artifacts created and reviewed
- [ ] Fluent SDK API usage verified with `now-sdk explain`; Classic/platform API usage verified with configured product or scripting docs
- [ ] XML imports generated (if requested)
```

---

## Instance Preview

Use `browser/openBrowserPage` in two situations:
- **Post-deployment review**: show the user the live result on their ServiceNow instance after artifacts have been installed.
- **Context gathering**: when you need visual feedback to better understand the user's environment before or during planning.

### Resolving the Instance URL

1. Check `environment.availableTools` from `.vscode/nowdev-ai-config.json`. If `now-sdk` is listed, run `now-sdk auth --list` to list configured SDK endpoints.
2. Evaluate the output:
   - **`default = Yes` entry**: use that entry's `host` as the base URL. Proceed to opening the browser.
   - **Multiple entries, no clear default**: use `askQuestions` to ask the user which instance to open.
   - **Command not found / auth error / no entries**: use `askQuestions` to ask the user for the URL directly.

### Opening the Browser

- **NEVER open a new tab if one is already open** — reuse the existing tab. Only open a new one if no integrated browser tab is currently active.
- Append a deep-link path when possible so the user lands directly on the artifact:
  - Script Include: `/nav_to.do?uri=sys_script_include.do?sys_id={sys_id}`
  - Business Rule: `/nav_to.do?uri=sys_script.do?sys_id={sys_id}`
  - Client Script: `/nav_to.do?uri=sys_script_client.do?sys_id={sys_id}`

### Post-Deployment Review Gate

After confirming artifacts have been deployed, ask: "Would you like to see what we just built on your instance?" Only open the browser if the user confirms.

### Visual Context Gathering

When you need a better understanding of the user's environment before finalising a plan (e.g. to inspect an existing form or list view), proactively open the browser and ask the user to navigate to the relevant area. Use visual feedback to refine requirements or detect conflicts before delegating.

### Autonomous Visual Verification

After opening the browser, use autonomous browser tools to verify implementation:
- `screenshotPage` — capture current UI state
- `readPage` — verify form field labels, element visibility, rendered content
- `navigatePage` — jump directly to artifact detail pages via deep links
