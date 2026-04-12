---
title: "Add Hooks Support for Copilot Coding Agent Sessions"
labels: ["enhancement", "feature"]
---

## Summary

Add support for GitHub Copilot Coding Agent **hooks** to the NowDev AI Toolbox, enabling automated actions to be triggered at key points during an agent session (session start/end, tool use, prompt submission).

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository has a mature [Hooks system](https://github.com/github/awesome-copilot/tree/main/hooks) that enables automated workflows during Copilot agent sessions. Current hooks in the community include:

- **Secrets Scanner** — scans modified files for credentials/sensitive data at session end
- **Governance Audit** — scans prompts for threat signals and logs governance events
- **Tool Guardian** — blocks dangerous tool operations before the agent executes them
- **Session Logger** — logs all session activity for audit and analysis
- **Session Auto-Commit** — automatically commits and pushes changes at session end
- **Dependency License Checker** — scans newly added dependencies for license compliance

## Proposed Work

Create a set of **ServiceNow-specific hooks** for the NowDev AI Toolbox and document how to install them in `.github/hooks/`:

### Hook 1: `servicenow-pre-deploy-validator`
- **Event:** `sessionEnd`
- **Purpose:** Before any session ends, scan generated/modified files for ServiceNow anti-patterns:
  - Hardcoded `sys_id` values
  - Use of banned APIs (`eval`, `gs.sleep`, direct SQL)
  - Missing `answer` variable in Script Includes
  - Business Rules missing recursion prevention
- **Assets:** `validate-sn-artifacts.sh`, `hooks.json`

### Hook 2: `servicenow-session-logger`
- **Events:** `sessionStart`, `sessionEnd`, `userPromptSubmitted`
- **Purpose:** Log session activity for audit trails — especially useful in enterprise environments that need compliance records of AI-assisted development.
- **Assets:** `log-session.sh`, `hooks.json`

### Hook 3: `servicenow-secrets-scanner`
- **Event:** `sessionEnd`
- **Purpose:** Scan Fluent SDK and Classic script files for leaked credentials, API tokens, instance URLs, or user passwords that should never be committed.
- **Assets:** `scan-secrets.sh`, `hooks.json`

### Hook 4: `servicenow-dependency-license-checker`
- **Event:** `sessionEnd`
- **Purpose:** For Fluent SDK projects, scan `package.json` changes for newly added npm dependencies and flag GPL/AGPL licenses that may conflict with enterprise licensing requirements.
- **Assets:** `check-licenses.sh`, `hooks.json`

## Implementation Notes

- Hooks should be placed in `.github/hooks/` per the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- Each hook folder should contain: `README.md`, `hooks.json`, and any shell scripts
- The NowDev AI Toolbox README should include a "Hooks" section documenting installation and usage

## References

- [awesome-copilot hooks](https://github.com/github/awesome-copilot/tree/main/hooks)
- [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
