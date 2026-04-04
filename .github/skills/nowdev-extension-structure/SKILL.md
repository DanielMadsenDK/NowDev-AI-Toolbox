---
name: nowdev-extension-structure
description: Structural guide for the NowDev AI Toolbox VS Code extension TypeScript source code. Use when working on bug fixes, new commands, webview changes, or any edits to the src/ directory.
---

## Extension Overview

NowDev AI Toolbox is a VS Code extension (`publisher: DanielMadsenDK`, `name: nowdev-ai-toolbox`, version in `package.json`) that installs a sidebar webview and auto-configures VS Code settings to enable multi-tier Copilot agent routing.

- Entry point: `src/extension.ts` → compiled to `out/extension.js`
- Minimum VS Code: `^1.113.0`
- Depends on: `github.copilot-chat`

## Source File Responsibilities

| File | Purpose |
|------|---------|
| `src/extension.ts` | Activation function — registers webview, registers commands, auto-configures VS Code global settings on first run |
| `src/WelcomeViewProvider.ts` | Sidebar webview (`nowdev-ai-toolbox.welcome`) — renders agent topology and environment status; handles messages from `media/webview/main.js` |
| `src/AgentTopology.ts` | Static `AGENT_TREE` data structure — defines the agent hierarchy for display in the sidebar; must be kept in sync with agents in `agents/github-copilot/` |
| `src/ToolScanner.ts` | Environment detection — scans for `node`, `npm`, `now-sdk`, and other CLI tools via `execSync`; returns `EnvironmentInfo` |
| `src/ArtifactParser.ts` | Parses the session artifact registry markdown table from `/memories/session/artifacts.md` produced by AI agents |
| `media/webview/main.js` | Webview JavaScript — exchanges messages with the extension host via `postMessage` |
| `media/webview/styles.css` | Webview styles |

## Build Commands

```bash
npm ci              # Install dependencies from package-lock.json (deterministic)
npm run build       # Compile TypeScript (tsc) — validates all types, outputs to out/
npm run package     # Build + package as .vsix for distribution
```

**Always run `npm run build` after TypeScript changes to confirm compilation succeeds.**

## Webview Architecture

`WelcomeViewProvider` exchanges messages with `media/webview/main.js`:

- Extension → Webview: sends `EnvironmentInfo` and agent data as JSON
- Webview → Extension: sends `{ command: 'fixSetting' | 'fixAllSettings' | 'toggleTool' | 'refreshStatus' | ... }`

Webview assets in `media/webview/` are served via `localResourceRoots`.

## VS Code Settings Auto-Configured on Activation

`extension.ts` sets these global settings if not already configured:

| Setting | Value | Purpose |
|---------|-------|---------|
| `workbench.commandPalette.experimental.askChatLocation` | `chatView` | Opens Copilot questions in chat view |
| `workbench.browser.enableChatTools` | `true` | Enables agentic browser tools (v1.110+) |
| `chat.subagents.allowInvocationsFromSubagents` | `true` | Enables multi-tier agent routing |
| `github.copilot.chat.tools.memory.enabled` | `true` | Persistent memory across sessions |

## Common Patterns

**Adding a new command:**
1. Register in `extension.ts` inside `context.subscriptions.push(...)` using `vscode.commands.registerCommand`
2. Add the contribution entry to `package.json` under `contributes.commands`
3. Optionally wire a trigger in `media/webview/main.js`

**Adding a new webview message handler:**
1. Add a `case` to the `switch` in `WelcomeViewProvider.ts` `onDidReceiveMessage`
2. Add the corresponding `postMessage` call in `media/webview/main.js`

**Adding a new tool to detect:**
1. Add an entry to `TOOL_DEFINITIONS` in `src/ToolScanner.ts` with `command`, `versionCommand`, `label`, `description`, and `impact`

**Adding a new VS Code agent:**
1. Create the `.agent.md` file in `agents/github-copilot/`
2. Register it in `package.json` under `contributes.chatAgents`
3. Add a corresponding `AgentNode` to `src/AgentTopology.ts` under the correct parent

## TypeScript Config

- Target: `ES2020`
- Module: `commonjs`
- Strict mode: enabled
- Output directory: `out/`
