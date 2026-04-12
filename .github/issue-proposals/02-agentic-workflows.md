---
title: "Add Agentic Workflows for Automated ServiceNow DevOps"
labels: ["enhancement", "feature"]
---

## Summary

Add **GitHub Actions Agentic Workflows** to the NowDev AI Toolbox — AI-powered repository automations that run in GitHub Actions, triggered by events or schedules, to automate routine ServiceNow development tasks.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository introduces [Agentic Workflows](https://github.com/github/awesome-copilot/tree/main/workflows) — markdown-defined, AI-powered GitHub Actions workflows compiled via `gh aw compile`. Current community workflows include:

- **Daily Issues Report** — generates a daily summary of open issues as a GitHub issue
- **OSPO Org Health Report** — weekly health report surfacing stale issues/PRs, contributor leaderboards
- **OSS Release Compliance Checker** — analyzes a repo against open source release requirements
- **Relevance Check** — slash command to evaluate whether an issue/PR is still relevant

These patterns are directly applicable to ServiceNow development teams using the NowDev AI Toolbox.

## Proposed Work

Create a set of **ServiceNow DevOps agentic workflows** for the NowDev AI Toolbox:

### Workflow 1: `servicenow-daily-dev-report`
- **Trigger:** Schedule (daily)
- **Purpose:** Generate a daily summary of:
  - Open GitHub issues tagged as ServiceNow stories/tasks
  - Recent PRs and their deployment status
  - Pending Update Sets awaiting approval
- **Output:** Creates a GitHub issue with the daily report

### Workflow 2: `servicenow-update-set-compliance-checker`
- **Trigger:** `pull_request`, `workflow_dispatch`
- **Purpose:** Analyze a PR's Update Set XML files against:
  - ServiceNow best practices (no hardcoded sys_ids, proper naming conventions)
  - Security standards (no credentials, no `eval`)
  - Change management requirements (scope, description completeness)
- **Output:** Posts a compliance report as a PR comment

### Workflow 3: `servicenow-release-notes-generator`
- **Trigger:** `workflow_dispatch`, on tag creation
- **Purpose:** Automatically generate release notes for a ServiceNow deployment by:
  - Summarizing all merged PRs since the last release
  - Grouping by artifact type (Business Rules, Flows, Client Scripts, etc.)
  - Generating a deployment guide with rollback instructions
- **Output:** Creates a GitHub issue or release body with structured release notes

### Workflow 4: `servicenow-atf-coverage-report`
- **Trigger:** Schedule (weekly), `workflow_dispatch`
- **Purpose:** Analyze ATF test coverage across the Fluent SDK project and generate a coverage report identifying untested artifacts.
- **Output:** Creates a GitHub issue with coverage gaps and recommendations

## Implementation Notes

- Workflows are defined as `.md` files with YAML frontmatter per the [Agentic Workflows specification](https://github.github.com/gh-aw)
- Requires the `gh aw` CLI extension
- Workflows should be documented in the NowDev AI Toolbox README

## References

- [awesome-copilot workflows](https://github.com/github/awesome-copilot/tree/main/workflows)
- [GitHub Agentic Workflows specification](https://github.github.com/gh-aw)
- [gh aw CLI extension](https://github.com/github/gh-aw)
