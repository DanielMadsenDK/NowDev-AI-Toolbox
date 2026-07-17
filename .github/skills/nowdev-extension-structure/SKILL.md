---
name: nowdev-extension-structure
description: Structural guide for the NowDev AI Toolbox VS Code extension TypeScript source code. Use when working on bug fixes, new commands, webview changes, or any edits to the src/ directory.
---

## Extension Overview

NowDev AI Toolbox is a VS Code extension (`publisher: DanielMadsenDK`, `name: nowdev-ai-toolbox`, version in `package.json`) that installs a sidebar webview and auto-configures VS Code settings to enable multi-tier Copilot agent routing.

- Entry point: `src/extension.ts` → compiled to `out/extension.js`
- Minimum VS Code: `^1.118.0`
- Depends on: `github.copilot-chat`
- Bundles `chatSkills` through `package.json`
- Loads bundled agent templates from `agents/github-copilot/` and syncs workspace-ready agent files into `.github/agents/`

## Source File Responsibilities

| File | Purpose |
|------|---------|
| `src/extension.ts` | Activation function — registers the sidebar, command palette commands, SDK helpers, and first-run VS Code setting defaults |
| `src/WelcomeViewProvider.ts` | Sidebar webview host — renders Home / Project / SDK / Agents / Tools / Activity state, handles `postMessage` traffic, writes `.vscode/nowdev-ai-config.json`, and coordinates lazy tab data loading |
| `src/AgentTopology.ts` | Static `AGENT_TREE` data structure — defines the agent hierarchy for display in the sidebar; must be kept in sync with agents in `agents/github-copilot/` |
| `src/AgentRegistry.ts` | Parses bundled `.agent.md` files into `AgentManifest` objects used by the sidebar and sync pipeline |
| `src/WorkspaceAgentManager.ts` | Writes generated `.github/agents/*.agent.md` files into the workspace, injects MCP tools/doc sources, applies per-agent overrides, and stamps managed hashes |
| `src/ToolScanner.ts` | Environment detection — scans for `node`, `npm`, `now-sdk`, and other CLI tools via `execSync`; returns `EnvironmentInfo` |
| `src/MCPScanner.ts` | Detects MCP servers from settings plus workspace `.mcp.json` / legacy `.vscode/mcp.json` files |
| `src/AuthAliasScanner.ts` | Parses `now-sdk auth --list` output for SDK alias management in the sidebar |
| `media/webview/main.js` | Webview JavaScript — exchanges messages with the extension host via `postMessage` |
| `media/webview/styles.css` | Webview styles |

## Build Commands

```bash
npm ci              # Install dependencies from package-lock.json (deterministic)
npm run compile     # Compile TypeScript (tsc) — validates all types, outputs to out/
npm run watch       # TypeScript watch mode during extension development
```

There is currently no dedicated `npm run build` or `npm run package` script in `package.json`.

**Always run `npm run compile` after TypeScript changes to confirm compilation succeeds.**

## Webview Architecture

`WelcomeViewProvider` exchanges messages with `media/webview/main.js`:

- Extension → Webview: sends `EnvironmentInfo` and agent data as JSON
- Webview → Extension: sends `{ command: 'fixSetting' | 'fixAllSettings' | 'toggleTool' | 'refreshStatus' | ... }`

Webview assets in `media/webview/` are served via `localResourceRoots`.

### Lazy Loading Notes

- The sidebar retains webview state with `retainContextWhenHidden: true`
- SDK-specific data such as auth aliases is lazy-loaded when the SDK tab is activated
- Agent card data is pushed when the Agents tab is activated
- Home-tab onboarding and status summaries must treat unopened lazy slices as unknown, not as missing or empty

## VS Code Settings Auto-Configured on Activation

`extension.ts` sets these global settings if not already configured:

| Setting | Value | Purpose |
|---------|-------|---------|
| `workbench.commandPalette.experimental.askChatLocation` | `chatView` | Opens Copilot questions in chat view |
| `workbench.browser.enableChatTools` | `true` | Enables agentic browser tools (v1.110+) |
| `chat.subagents.allowInvocationsFromSubagents` | `true` | Enables multi-tier agent routing |
| `github.copilot.chat.tools.memory.enabled` | `true` | Persistent memory across sessions |

## Project State Persistence

`WelcomeViewProvider` writes `.vscode/nowdev-ai-config.json` as the workspace state file consumed by agents. It currently persists:

- `instanceUrl`
- `preferredDevelopmentStyle`
- `customInstructions`
- `fluentApp`
- `environment`
- `mcpIntegrations`
- `mcpDocSources`
- `agentOverrides`
- `memoryLocation`
- `devopsConfig`

The Project tab's custom-instructions flow uses the `nowdev-ai-toolbox.customInstructionsFile` setting. Do not document or add a separate workspace Copilot instructions file flow unless the product behavior changes first.

## Common Patterns

**Adding a new command:**
1. Register in `extension.ts` inside `context.subscriptions.push(...)` using `vscode.commands.registerCommand`
2. Add the contribution entry to `package.json` under `contributes.commands`
3. Optionally wire a trigger in `media/webview/main.js`

**Adding a new webview message handler:**
1. Add a `case` to the `switch` in `WelcomeViewProvider.ts` `onDidReceiveMessage`
2. Add the corresponding `postMessage` call in `media/webview/main.js`
3. If the data is lazy-loaded, make sure the Home tab does not assume unopened tabs mean missing data

**Adding a new tool to detect:**
1. Add an entry to `TOOL_DEFINITIONS` in `src/ToolScanner.ts` with `command`, `versionCommand`, `label`, `description`, and `impact`

**Adding a new VS Code agent:**
1. Create the `.agent.md` file in `agents/github-copilot/`
2. Ensure `AgentRegistry.ts` can parse its frontmatter shape (`name`, `description`, `tools`, `user-invocable`, `agents`)
3. Let `WorkspaceAgentManager.ts` sync it into `.github/agents/`
4. Add a corresponding `AgentNode` to `src/AgentTopology.ts` if it should appear in the sidebar topology

**Adding a new bundled skill:**
1. Create or update `agents/skills/<skill-name>/SKILL.md`
2. Add the `SKILL.md` path to `package.json` under `contributes.chatSkills`
3. Add any sibling reference docs only if the skill genuinely needs them

## TypeScript Config

- Target: `ES2020`
- Module: `commonjs`
- Strict mode: enabled
- Output directory: `out/`
