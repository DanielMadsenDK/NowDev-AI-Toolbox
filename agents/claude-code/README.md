# Claude Code Setup for NowDev AI Toolbox

This directory contains instructions for using the NowDev AI Toolbox skills with Claude Code (Anthropic's Claude in the terminal/IDE).

## Overview

The skills in `agents/skills/` are format-agnostic markdown and work for both GitHub Copilot and Claude Code. The main difference is the tool model — Claude Code uses Read/Write/Edit/Bash/Grep/Glob instead of VS Code-specific tools.

## Setup

### 1. Point Claude Code to the skills

The `CLAUDE.md` file in this directory serves as the main instructions file. Claude Code will automatically load it when working in this repository.

For use in other repositories, copy `CLAUDE.md` to your project root or reference the skills directory:

```bash
# Option 1: Symlink from your project
ln -s /path/to/NowDev-AI-Toolbox/agents/claude-code/CLAUDE.md .claude/instructions.md

# Option 2: Copy the file
cp /path/to/NowDev-AI-Toolbox/agents/claude-code/CLAUDE.md .claude/instructions.md
```

### 2. Skills directory

Skills are located in `agents/skills/` with the following domains:

| Skill | Domain |
|-------|--------|
| `servicenow-fluent-development` | Fluent SDK (.now.ts) metadata and modules |
| `servicenow-business-rules` | Server-side database triggers |
| `servicenow-client-scripts` | Browser-side form scripts |
| `servicenow-script-server-logic` | Script Includes and server utilities |
| `servicenow-manipulate-data` | GlideRecord, GlideQuery, GlideAggregate |
| `servicenow-flow-designer` | Classic FlowAPI execution |
| `servicenow-deployment` | Update Sets and pipeline deployment |
| `servicenow-http-integrations` | Outbound REST/SOAP calls |
| `servicenow-server-date-time` | Date arithmetic and scheduling |
| `servicenow-server-security` | Cryptographic operations and credentials |
| `servicenow-ui-forms` | g_form API field state manipulation |
| `servicenow-ai-agent-studio` | AI Agent definitions and workflows |
| `servicenow-now-assist` | NowAssist Skill configurations |
| `servicenow-instance-scan` | Instance Scan check definitions |
| `servicenow-react-ui-components` | @servicenow/react-components (Horizon) |

### 3. Reference documentation

For Fluent SDK API accuracy, use the SDK installed in the target workspace:

```bash
now-sdk explain --list <keyword>
now-sdk explain <topic> --peek
now-sdk explain <topic> --format raw
```

Local skills provide workflow conventions and ServiceNow platform patterns; `now-sdk explain` is the source of truth for Fluent SDK APIs and CLI behavior.

## Usage with Claude Code

When working on ServiceNow development tasks, Claude Code will:

1. Read the relevant skill SKILL.md for the domain
2. Follow the patterns and best practices documented
3. Reference `now-sdk explain` for Fluent SDK API and CLI accuracy
4. Use JavaScript modules as the preferred server-side pattern (for function-accepting APIs)
5. Use `Now.include()` for string-only APIs (ClientScript, ScriptInclude, etc.)
