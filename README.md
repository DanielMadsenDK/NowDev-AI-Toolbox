# NowDev AI Toolbox
<div align="center">
<img width="128" height="128" alt="agent-icon" src="https://github.com/user-attachments/assets/f03d05ef-0023-4282-967c-995321aaef47" />
</div>

<div align="center">

  ![Version](https://img.shields.io/badge/version-0.6.8-blue)
  ![VS Code](https://img.shields.io/badge/VS%20Code-1.120+-blue)
  ![Platform](https://img.shields.io/badge/Platform-ServiceNow-293E40)
  ![License](https://img.shields.io/badge/License-GPL--3.0-blue)
  <br>
  ![GitHub Copilot](https://img.shields.io/badge/AI-GitHub%20Copilot-black)
  ![Status](https://img.shields.io/badge/Status-Active-success)
</div>

## Overview

NowDev AI Toolbox is a Visual Studio Code extension that provides specialized AI agents for ServiceNow development within GitHub Copilot Chat. Acting as a Lead Architect, the system orchestrates specialized sub-agents to plan, build, review, and deploy full-stack solutions.

Developed using the **ServiceNow SDK** official documentation, the extension integrates ServiceNow Best Practice Skills directly into GitHub Copilot, ensuring generated code adheres to strict performance and security standards. It features an AI Orchestrator that breaks down requirements, visualizes architecture with Mermaid diagrams, and delegates tasks to specialized agents for scripting, business logic, and deployment.

### Key Features

*   **AI Orchestrator**: A master agent that breaks down requirements and delegates tasks to specialized sub-agents.
*   **Built-in Agent Skills**: Automatically equips GitHub Copilot with verified knowledge of ServiceNow best practices.
*   **Automated Governance**: Specialized reviewer agents inspect each artifact, dynamically selecting only the best-practice checks relevant to the artifact types actually present in the solution.
*   **Multi-Tier Agent Architecture**: The orchestrator delegates to development agents, which hand off to specialized reviewer agents — agents calling agents — enabling deep, context-aware automation at every layer of the development workflow.
*   **Interactive Workflow**: Uses interactive tools to clarify requirements and validate designs.
*   **Live Instance Preview & Autonomous Verification**: Agents autonomously inspect your ServiceNow instance in real-time—capturing screenshots, reading form field state, validating form behavior, and detecting client-side issues without manual inspection. Perfect for post-deployment verification and debugging client-side problems.
*   **Guided Copilot Setup**: The sidebar now highlights the Project tab custom-instructions flow plus built-in chat logs and diagnostics so teams can configure and troubleshoot Copilot without leaving the extension.
*   **Dynamic Agent Management**: Enable or disable individual agents and their tools directly from the sidebar. Hit Resync to instantly update your workspace agent configuration. MCP server detection is automatic.
*   **Agent Topology Viewer**: Visual panel that renders the full agent hierarchy as a colour-coded tree — see which agents are active and how they relate at a glance.
*   **User Profiles**: Switch between Developer, Junior Developer, and Product Owner profiles. Each profile controls which agents are visible, adjusts communication tone, and (for Junior Developer) adds step-by-step educational commentary to every response — all without changing any configuration files.
*   **Instance Browser**: Connect to your ServiceNow instance (credentials stored securely) to browse dependencies, discover related scripts and Knowledge articles, and prepare KB-backed agent guidelines from one unified panel.

## Installation & Usage

### Prerequisites
- Visual Studio Code 1.122.0 or later
- GitHub Copilot Chat extension
- **Enable nested sub-agents** — add `"chat.subagents.allowInvocationsFromSubagents": true` to your VS Code `settings.json`. Without this setting, the multi-level agent hierarchy will not function (coordinators cannot invoke their specialists).

### Documentation Sources

Agents use three knowledge channels, all configurable from the NowDev AI Toolbox sidebar:

| Source | What it covers | Default |
|--------|----------------|---------|
| **`now-sdk explain`** (always-on) | Fluent SDK API reference, guides, examples, and CLI behavior — local CLI tied to the installed SDK version | Always enabled |
| **SDK llms.txt** | Supplemental SDK documentation index when `now-sdk explain` does not cover a topic | `https://servicenow.github.io/sdk/llms.txt` |
| **Product llms.txt** | General ServiceNow platform docs | `https://www.servicenow.com/llms.txt` |
| **MCP server** | Your own indexed sources (optional) | None |

For Fluent SDK work, agents use `now-sdk explain --list <keyword>`, `now-sdk explain <topic> --peek`, and `now-sdk explain <topic> --format raw` before relying on local skills. Local skills now focus on Classic scripting, ServiceNow platform patterns, NowDev workflows, and small opinionated guardrails. To configure supplemental sources, open the NowDev AI Toolbox sidebar and expand **Documentation Sources**.

### Connecting to Your ServiceNow Instance

The extension can connect directly to a ServiceNow instance for the Instance Browser. Credentials are stored securely using VS Code's built-in secret storage.

1. Open the **NowDev AI Toolbox** sidebar.
2. In the **Instance** row, enter your instance URL and click **Connect**.
3. Once connected, use **Instance Browser** to browse records and add them to `now.config.json`, use **Discover** mode to find related scripts and Knowledge articles, or use **Guidelines** mode to locate KB articles that should inform agent behavior.

To clear stored credentials at any time: Command Palette → **NowDev AI: Clear Stored Credentials**.

### Getting Started with Fluent SDK

If you are starting a new ServiceNow Fluent SDK project, the NowDev AI Toolbox provides a guided onboarding flow:

1. **Install the ServiceNow SDK CLI** globally (requires Node.js):
   ```bash
   npm install -g @servicenow/sdk
   ```
2. **Open the NowDev AI Toolbox sidebar** by clicking the activity bar icon.
3. **Click "Initialize Fluent Project…"** in the sidebar (visible when no `now.config.json` is detected in your workspace). You will be prompted to enter your ServiceNow instance URL, and a terminal will open running `now-sdk init` to scaffold the project.
4. Alternatively, run the command directly from the Command Palette (`Ctrl+Shift+P`) → **NowDev AI: Initialize Fluent Project**, or right-click your workspace folder in the Explorer and select **NowDev AI: Initialize Fluent Project**.

Once `now-sdk init` completes, the sidebar will automatically detect the new `now.config.json` and display your Fluent App details.

### Recommended Workflow

**Always start with NowDev AI Agent** for any new task or feature. The orchestrator will:
- Analyze your requirements and create a detailed implementation plan
- Break down complex tasks into manageable steps
- Coordinate between specialized agents as needed
- Ensure all work follows ServiceNow best practices

You can also use specialized agents directly for specific tasks, but starting with the orchestrator ensures proper planning and coordination.

### Workspace Customizations and Artifact State

NowDev writes modern VS Code Copilot customization files into the workspace when agents are synced:

| File location | Purpose |
|---------------|---------|
| `.github/agents/*.agent.md` | Generated custom agents for the active profile, tools, MCP servers, and enabled agent set |
| `.github/instructions/nowdev-ai.instructions.md` | Workspace-wide NowDev context, artifact protocol, custom instructions, and selected instance guidelines |
| `.github/prompts/nowdev-*.prompt.md` | Slash prompts for starting, reviewing, and compacting NowDev sessions |

Session artifacts are tracked in `.vscode/nowdev-ai-session/artifacts.json`, discovered through `.vscode/nowdev-ai-config.json` under `artifactState.path`. This file is the source of truth for cross-agent handoffs and survives chat context compaction better than a memory-only table. The sidebar summarizes artifact dependencies, reports missing source files, and includes actions to open or reset the artifact state without deleting generated source files.

The Agents tab supports per-agent model overrides and role-aware model presets based on the chat models VS Code reports as available. Keep bundled agents mostly unpinned unless a team has a clear quality, latency, or cost reason to override them.

Memory is optional. If Copilot memory is unavailable or disabled by an organization, NowDev still uses the workspace artifact state. The sidebar reports administrator-managed preview features without showing impossible fix buttons.

Hooks are optional Preview functionality. Use **NowDev AI: Hooks: Create Optional Artifact Templates** to create reviewable `.github/hooks` templates for teams that want deterministic lifecycle automation. The generated template includes a Node-based Artifact Manifest merge script plus Windows and Linux/macOS wrapper commands, but hooks are not required for normal operation.

If hooks are not enabled, agents still end with an `Artifact Manifest` JSON block. Copy an agent response and run **NowDev AI: Artifacts: Merge Manifest from Clipboard** to merge the manifest into the workspace artifact state.

### Example Usage
Open GitHub Copilot Chat, select "NowDev AI Agent" from the agent dropdown, and type:
```
I need to create a custom ServiceNow application for managing IT assets with approval workflows
```

## Customizing Agent Behavior

The `nowdev-ai-toolbox.customInstructionsFile` setting lets you supply a Markdown or plain-text file whose contents are injected into **every** agent session as the highest-priority directives — overriding built-in defaults where they conflict.

This is the primary mechanism for enforcing org-specific standards:
- Coding conventions and framework preferences (e.g. "always use Fluent SDK")
- Naming rules (scope prefix, casing, identifier patterns)
- Forbidden patterns (e.g. `eval()`, N+1 queries, hard-coded `sys_id` values)
- Unconditional "always use / never use" directives

### How to Configure

1. Copy [`agents/github-copilot/CUSTOM-INSTRUCTIONS-TEMPLATE.md`](agents/github-copilot/CUSTOM-INSTRUCTIONS-TEMPLATE.md) to a path of your choice (e.g. `~/nowdev-custom-instructions.md`).
2. Edit the file to reflect your team's standards.
3. Point the extension at your file using **one** of these methods:

   **Option A — Sidebar (recommended):** Click the NowDev AI Toolbox icon in the VS Code Activity Bar to open the sidebar panel. In the *Custom Instructions File* row, click the **Browse…** button and select your file using the OS file picker. The path is saved automatically to your global VS Code settings.

   **Option B — VS Code Settings:** Open Settings (`Ctrl+,`), search for `NowDev AI Toolbox`, and paste the absolute path into the **Custom Instructions File** field.

The extension reads the file on every save, writes its content into `.vscode/nowdev-ai-config.json` under the `customInstructions` key, and injects the same content into generated workspace agents as **Workspace Guidelines** so changes reliably affect agent behavior.

### Instance-Backed Guidelines

Teams can keep coding standards, review rules, and release policies in ServiceNow Knowledge Base articles. Use **Project → KB Guidelines…** or **Instance Browser → Guidelines** to find relevant `kb_knowledge` articles from the authenticated instance. Selected articles are saved in `.vscode/nowdev-ai-config.json` as guideline references and generated agents receive those references plus a `now-sdk query kb_knowledge` lookup command so they can fetch live article content when details are needed.

> **Note**: `.vscode/nowdev-ai-config.json` is auto-generated and is automatically added to `.gitignore`. It should not be committed to source control.

### Project Copilot Instructions

For repository-wide Copilot behavior, create `.github/copilot-instructions.md`. NowDev includes the `servicenow-copilot-instructions-generator` skill to inspect a ServiceNow workspace and draft project-specific instructions from detected facts such as Fluent vs Classic style, scope prefix, artifact folders, naming patterns, validation commands, and forbidden patterns.

Ask the NowDev AI Agent to generate Copilot instructions for the current project when:
- The workspace has no `.github/copilot-instructions.md`
- Copilot suggestions are using the wrong ServiceNow style or scope
- You want team-wide standards committed with the repository
- You changed architecture, folders, validation commands, or naming conventions

If you also want NowDev agents to receive the same standards, keep using the existing custom instructions file flow above. The generated project instructions and NowDev custom instructions solve related but different problems: `.github/copilot-instructions.md` is repository-wide Copilot context, while the NowDev custom instructions file is injected into generated NowDev agents.

### Efficient Copilot Usage

- Use planning/refinement first for multi-artifact work, then implement from the approved brief.
- Start a new chat for unrelated tasks, fork when exploring alternatives, and compact long sessions when continuing the same task.
- Disable unneeded tools or MCP servers for a request when they are not relevant.
- Keep generated files such as `.github/agents/**` and `out/**` excluded from search so agent discovery does not spend context on generated output.
- Use efficient model choices for simple edits and reserve higher reasoning effort for planning, architecture, and debugging.

### Template Sections

The [template](agents/github-copilot/CUSTOM-INSTRUCTIONS-TEMPLATE.md) covers these sections (all optional):

| Section | Purpose |
|---------|---------|
| `## Development Preferences` | Default framework, SDK version, coding style |
| `## Naming Conventions` | Scope prefix, table names, casing rules |
| `## Scope and Application` | Restrict changes to specific scopes/apps |
| `## Excluded Patterns` | Hard-forbidden APIs and practices |
| `## Always Use / Never Use` | Unconditional short-form directives |

## User Profiles

Switch profiles from the NowDev AI Toolbox sidebar to instantly reshape how every agent behaves — no config files needed.

| Profile | Who it's for | What changes |
|---------|-------------|--------------|
| **Developer** | Experienced ServiceNow developers | Full agent set, no restrictions |
| **Junior Developer** | Developers learning ServiceNow | Same full agent set, but every response adds step-by-step explanations, term definitions, pitfall callouts, and follow-up learning suggestions |
| **Product Owner** | Business stakeholders managing requirements | Development agents hidden; only discovery, refinement, and DevOps work-item agents visible; plain-language communication, no code |

## Specialized Agents

The extension provides a hierarchical system of AI agents spanning three tiers. **Tier 1** agents are invoked directly by the orchestrator. **Tier 2** agents are coordinators and routers that delegate to **Tier 3** specialists. All tiers are wired automatically — you only ever interact with the Tier 1 agents.

### Tier 1 — Orchestrator

| Agent | Description |
|-------|-------------|
| NowDev AI Agent | Lead Architect — triages requests, plans solutions, and coordinates all other agents |

### Tier 2 — Domain Coordinators & Routers

| Agent | Description | Routes To |
|-------|-------------|-----------|
| NowDev-AI-Assistant | Lightweight Q&A, brainstorming, and early discovery | — |
| NowDev-AI-Refinement | User story refinement and feasibility validation before development | — |
| NowDev-AI-Classic-Developer | Classic scripting coordinator — analyzes requirements and delegates to Classic sub-agents | Script, BusinessRule, Client developers |
| NowDev-AI-Fluent-Developer | Fluent SDK coordinator — analyzes requirements and delegates to Fluent specialists | Schema, Logic, Automation, UI, AI Studio developers |
| NowDev-AI-AI-Studio-Developer | AI Studio coordinator (SDK 4.4.0+) — routes based on whether request needs an AiAgent/AiAgenticWorkflow or a NowAssist Skill | AI Agent Developer, NowAssist Developer |
| NowDev-AI-Reviewer | Review router — detects Classic vs Fluent and delegates to the right reviewer | Classic Reviewer, Fluent Reviewer |
| NowDev-AI-Release-Expert | Release router — detects Classic vs Fluent and delegates to the right release agent | Classic Release, Fluent Release |
| NowDev-AI-Pipeline-Expert | CI/CD pipeline generator — creates GitHub Actions, Azure DevOps, and Jenkins pipeline YAML for Fluent SDK deployments; covers credential management, branch strategies, and multi-scope deployments | — |
| NowDev-AI-DevOps | DevOps integration — CI/CD pipeline authoring, automated release coordination, and multi-environment deployment strategies | — |
| NowDev-AI-Debugger | Debugging specialist — gathers symptoms, isolates root causes in server-side and client-side scripts, and produces a structured Diagnostic Results report before handing off to the relevant developer | Classic-Developer, Fluent-Developer |

### Tier 3 — Specialists (internal, invoked by coordinators only)

| Agent | Coordinator | Description |
|-------|-------------|-------------|
| NowDev-AI-Script-Developer | Classic-Developer | Server-side Script Includes and GlideAjax |
| NowDev-AI-BusinessRule-Developer | Classic-Developer | Business Rules and database triggers |
| NowDev-AI-Client-Developer | Classic-Developer | Client Scripts, UI Policies, and UI Actions |
| NowDev-AI-Fluent-Schema-Developer | Fluent-Developer | Tables, Roles, ACLs, Properties, Menus, Cross-Scope Privileges, Form Layouts, Instance Scan Checks |
| NowDev-AI-Fluent-Logic-Developer | Fluent-Developer | Business Rules, Script Includes, Script Actions, REST APIs, Email Notifications, SLAs, Scheduled Scripts |
| NowDev-AI-Fluent-Automation-Developer | Fluent-Developer | Flows, Subflows, custom Action Definitions, custom Trigger Definitions |
| NowDev-AI-Fluent-UI-Developer | Fluent-Developer | React UI Pages, Client Scripts, UI Policies, Service Catalog, Service Portal, Workspaces, Dashboards |
| NowDev-AI-ATF-Developer | Fluent-Developer | ATF Test() definitions covering form, REST, server-side, catalog, and navigation test steps |
| NowDev-AI-AI-Agent-Developer | AI-Studio-Developer | AiAgent definitions with tools, triggers, version management, and AiAgenticWorkflow team orchestration |
| NowDev-AI-NowAssist-Developer | AI-Studio-Developer | NowAssistSkillConfig — tool graph, LLM prompts, security controls, and deployment settings |
| NowDev-AI-Classic-Reviewer | Reviewer | Reviews Classic scripts against best practices |
| NowDev-AI-Fluent-Reviewer | Reviewer | Reviews Fluent SDK artifacts against best practices |
| NowDev-AI-Classic-Release | Release-Expert | Generates XML Update Set files for Classic deployment |
| NowDev-AI-Fluent-Release | Release-Expert | Runs `now-sdk build` and `now-sdk install` for Fluent deployment |

## Architecture

The extension integrates specialized AI agents directly into VS Code through GitHub Copilot Chat's agent system. Each agent is a declarative Copilot Agent with defined capabilities and expertise areas.

### Agent Capabilities
- **Specialized Knowledge**: Deep expertise in specialized ServiceNow domains.
- **Native Skills**: "Mounts" verified Best Practice documentation directly into the agent's context window.
- **Orchestration**: Seamlessly hands off tasks between Planning, Development, Review, and Release agents.
- **Three-Tier Agent Hierarchy**: The orchestrator delegates to domain coordinators (Classic Developer, Fluent Developer, Reviewer, Release Expert), which in turn delegate to focused specialists (Script Developer, Business Rule Developer, Classic Reviewer, Fluent Release, etc.). Each tier handles only its own concerns — you never need to pick the right specialist manually.

## Code Examples

### Canonical Exemplars

`agents/exemplars/` contains minimal reference files for each artifact type — the "what good looks like" shapes that agents pattern-match when generating code:

| Category | Files |
|----------|-------|
| Fluent SDK | Table + Role + ACL, ScriptInclude, BusinessRule, ATF Test |
| Classic scripting | GlideRecord, Script Include, GlideAjax, Business Rule, Client Script |
| CI/CD pipelines | GitHub Actions (4 strategies), Azure DevOps, branching strategy docs |

## Included Skills

These best practice modules are now natively registered as Copilot Skills. Fluent SDK API details come from `now-sdk explain`; local skills provide Classic/platform guidance and NowDev-specific workflow patterns:
- **ServiceNow Scripting**: Naming conventions, `GlideAggregate` vs `GlideRecord`, and forbidden patterns (`eval`).
- **Business Rules**: Execution timing (`before`/`after`/`async`), recursion prevention, and IIFE wrapping.
- **Client Scripts**: `GlideAjax` patterns, performance optimization, and `g_scratchpad` usage.
- **Deployment**: Update Set hygiene, batching strategies, and XML migration rules.
- **JavaScript Modules**: NowDev guardrails for module import/export patterns and Script Include bridging; verify SDK details with `now-sdk explain module-guide` and `now-sdk explain now-include-guide`.
- **Fluent SDK Routing**: Agents map Tables, Catalog, Flows, UI Pages, Workspaces, AI Agent Studio, and more to the relevant `now-sdk explain` topics for the installed SDK.

### Agent Definitions
Each AI agent is defined in declarative format:
- [View Agent Definitions](agents/github-copilot/)

### Agent Maintenance

Bundled VS Code agents are maintained in [agents/github-copilot/](agents/github-copilot/). Generated workspace agents in `.github/agents/` are managed output and should be regenerated by the extension rather than edited directly.

Before changing bundled agents, read [agents/github-copilot/AGENT-PATTERNS.md](agents/github-copilot/AGENT-PATTERNS.md). Keep sub-agent boundaries explicit: internal agents use `user-invocable: false` and `disable-model-invocation: true`, coordinators and routers declare an `agents: [...]` allow-list, and leaf agents declare `agents: []`.

Run the validation command before publishing or packaging agent changes:

```bash
npm run validate:agents
```

## Included Examples & Attribution

This project integrates code examples from the [ServiceNow SDK Examples Repository](https://github.com/servicenow/sdk-examples) (MIT License) directly into the agent skills. Each skill's `EXAMPLES.md` file contains working code examples demonstrating best practices.

For details on third-party licenses and attribution, see [THIRD_PARTY.md](THIRD_PARTY.md).

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

Code examples adapted from the ServiceNow SDK Examples Repository are licensed under the MIT License - see [LICENSES/MIT-ServiceNow-SDK.txt](LICENSES/MIT-ServiceNow-SDK.txt) for details.

## Using NowDev AI Toolbox with Claude Code

Claude Code users can leverage the same best practice skills as Copilot users:

1. **Copy the Claude instructions** to your project:
   ```bash
   cp agents/claude-code/CLAUDE.md .claude/instructions.md
   ```

2. **Reference the skills** directly in Claude — all `agents/skills/` documentation works seamlessly with Claude's tools.

3. **Use installed SDK docs** — run `now-sdk explain --list <keyword>` and `now-sdk explain <topic> --format raw` for Fluent SDK API accuracy tied to the user's SDK version.

See [agents/claude-code/README.md](agents/claude-code/README.md) for detailed setup instructions.

## Author

**Daniel Aagren Seehartrai Madsen** - ServiceNow Rising Star 2025

*Dedicated to elevating the standard of ServiceNow development through AI innovation.*
