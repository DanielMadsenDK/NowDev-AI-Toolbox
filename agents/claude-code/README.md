# Claude Code Setup for NowDev AI Toolbox

This directory contains instructions for using the NowDev AI Toolbox skills with Claude Code (Anthropic's Claude in the terminal/IDE).

## Overview

The skills in `agents/skills/` are format-agnostic markdown and work for both GitHub Copilot and Claude Code. The main difference is the tool model — Claude Code uses Read/Write/Edit/Bash/Grep/Glob instead of VS Code-specific tools.

## Setup

### 1. Point Claude Code to the skills

The `CLAUDE.md` file in this directory serves as the main instructions file. Claude Code will automatically load it when working in this repository.

`CLAUDE.md` references skill files by path (e.g. `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md`) instead of duplicating their content, so the `agents/skills/` directory must travel alongside it — copying or symlinking `CLAUDE.md` alone will leave those references dangling.

For use in other repositories, copy or symlink both `CLAUDE.md` and `agents/skills/` into your project root:

```bash
# Option 1: Symlink from your project
ln -s /path/to/NowDev-AI-Toolbox/agents/claude-code/CLAUDE.md .claude/instructions.md
ln -s /path/to/NowDev-AI-Toolbox/agents/skills agents/skills

# Option 2: Copy the files
cp /path/to/NowDev-AI-Toolbox/agents/claude-code/CLAUDE.md .claude/instructions.md
cp -r /path/to/NowDev-AI-Toolbox/agents/skills agents/skills
```

### 2. Skills directory

Skills are located in `agents/skills/` with the following domains:

| Skill | Domain |
|-------|--------|
| `nowdev-ai-toolbox-fluent-development` | Fluent workflow conventions and NowDev-specific guardrails |
| `nowdev-ai-toolbox-servicenow-sdk` | `now-sdk` CLI reference — `explain`, `query`, and every other subcommand |
| `nowdev-ai-toolbox-react-ui-components` | @servicenow/react-components (Horizon) |
| `nowdev-ai-toolbox-release-notes` | Retrieving ServiceNow release notes |

Earlier releases bundled per-domain platform skills (business rules, client scripts, GlideRecord, and so on). Those were removed in favor of installed SDK documentation. Load `nowdev-ai-toolbox-servicenow-sdk` and retrieve the relevant topic for all Fluent SDK API reference.

### 3. Reference documentation

`nowdev-ai-toolbox-servicenow-sdk` is the sole authority for `now-sdk` CLI mechanics, including command construction, flags, output handling, pagination, authentication aliases, safety, and troubleshooting. Load it before every SDK operation; these instructions retain only operational intent and topic IDs.

Local skills provide workflow conventions and ServiceNow platform patterns; installed SDK documentation retrieved through `nowdev-ai-toolbox-servicenow-sdk` is the source of truth for Fluent SDK APIs, and the skill alone owns CLI behavior.

## Usage with Claude Code

When working on ServiceNow development tasks, Claude Code will:

1. Read the relevant skill SKILL.md for the domain
2. Follow the patterns and best practices documented
3. Load `nowdev-ai-toolbox-servicenow-sdk` for Fluent SDK API accuracy and as the sole authority for CLI mechanics
4. Use JavaScript modules as the preferred server-side pattern (for function-accepting APIs)
5. Use `Now.include()` for string-only APIs (ClientScript, ScriptInclude, etc.)
