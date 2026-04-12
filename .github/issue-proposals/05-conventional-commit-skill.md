---
title: "Add Conventional Commit Skill for ServiceNow Fluent SDK Projects"
labels: ["enhancement", "new-skill", "developer-experience"]
---

## Summary

Add a **Conventional Commit skill** that generates standardized, descriptive commit messages for ServiceNow Fluent SDK changes — including references to artifact types, update set names, story IDs, and deployment targets.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes a [conventional-commit](https://github.com/github/awesome-copilot/blob/main/skills/conventional-commit/SKILL.md) skill that guides users to create standardized commit messages following the [Conventional Commits specification](https://www.conventionalcommits.org/).

ServiceNow developers using the Fluent SDK work with many artifact types in a single commit (tables, business rules, flows, UI components). Without a convention, commit history quickly becomes meaningless. This skill would bridge the gap between standard commit conventions and ServiceNow-specific artifacts.

The NowDev AI Toolbox already has a `NowDev-AI-Release-Expert` that handles deployments, but there's no skill for standardizing the commit messages that feed into those deployments.

## Proposed Work

Create a new skill: **`servicenow-conventional-commit`**

### Skill Structure
```
agents/skills/servicenow-conventional-commit/
├── SKILL.md
└── references/
    ├── COMMIT-TYPES.md           # SN-specific commit type definitions
    ├── SCOPE-CONVENTIONS.md      # Scope naming for SN artifact types
    └── EXAMPLES.md               # Real-world SN commit message examples
```

### Skill Capabilities

**1. ServiceNow-Aware Commit Type Classification**

Extend conventional commit types with ServiceNow-specific scopes:

```
feat(table/incident_extension): add priority_reason field and ACL
fix(business-rule/incident-priority): prevent recursion on after-update rule
feat(flow/approval-workflow): add parallel approval path for CAB
feat(rest-api/incident-export): add pagination and date filter support
feat(client-script/incident-form): auto-populate assignment group on category change
test(atf/incident-crud): add regression test for priority calculation
chore(schema/roles): add x_myapp_incident_manager role definition
deploy(fluent/prod): release v2.3.0 to production instance
```

**2. Change Analysis**
- Analyze git diff to identify which ServiceNow artifact types changed
- Detect the scope automatically from file paths and artifact names
- Suggest the appropriate conventional commit type (`feat`, `fix`, `refactor`, `test`, `chore`, `deploy`)

**3. Story/Ticket Reference Integration**
- Detect story IDs from branch names (e.g., `feature/SNS-1234-incident-form`)
- Automatically append `Refs: SNS-1234` or `Closes: SNS-1234` footers
- Support Jira, GitHub Issues, and Azure DevOps ticket formats

**4. Update Set Traceability**
- Optionally reference the Update Set name in the commit body
- Generate a one-line summary suitable for Update Set descriptions

## Example Output

```
feat(flow/incident-escalation): add automated manager escalation after 4h SLA breach

- Added Subflow trigger on SLA breach event for P1/P2 incidents
- Sends SMS via Notify integration and creates follow-up task
- Includes 15-minute retry logic before manager escalation

Update-Set: INC-Escalation-v1.2
Refs: SNS-4521
Tested-On: dev-instance.service-now.com
```

## Integration Points

- Should be invocable via the `NowDev-AI-Release-Expert` before generating releases
- Should be suggested by the orchestrator as part of the deployment checklist
- Can be used standalone at any time during development

## References

- [awesome-copilot conventional-commit skill](https://github.com/github/awesome-copilot/blob/main/skills/conventional-commit/SKILL.md)
- [Conventional Commits specification](https://www.conventionalcommits.org/)
