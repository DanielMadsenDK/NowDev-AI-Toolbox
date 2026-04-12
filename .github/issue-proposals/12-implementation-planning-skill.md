---
title: "Add Implementation Planning Skill for ServiceNow Features"
labels: ["enhancement", "new-skill", "developer-experience"]
---

## Summary

Add an **Implementation Planning skill** that generates detailed, structured implementation plans for ServiceNow features before development begins — reducing ambiguity, improving estimation, and enabling better task delegation to the specialized agent hierarchy.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes several planning-focused skills:

- **[create-implementation-plan](https://github.com/github/awesome-copilot/blob/main/skills/create-implementation-plan/SKILL.md)** — creates detailed implementation plan files for new features, refactoring, or upgrades
- **[breakdown-epic-arch](https://github.com/github/awesome-copilot/blob/main/skills/breakdown-epic-arch/SKILL.md)** — creates high-level technical architecture for an Epic
- **[breakdown-epic-pm](https://github.com/github/awesome-copilot/blob/main/skills/breakdown-epic-pm/SKILL.md)** — creates Epic Product Requirements Documents
- **[breakdown-feature-implementation](https://github.com/github/awesome-copilot/blob/main/skills/breakdown-feature-implementation/SKILL.md)** — creates detailed feature implementation plans
- **[breakdown-plan](https://github.com/github/awesome-copilot/blob/main/skills/breakdown-plan/SKILL.md)** — generates comprehensive project plans with Epic > Feature > Story > Test hierarchy
- **[create-technical-spike](https://github.com/github/awesome-copilot/blob/main/skills/create-technical-spike/SKILL.md)** — creates time-boxed technical spike documents

The NowDev AI Toolbox has `NowDev-AI-Refinement` for story refinement, but this is reactive — it refines already-written stories. A dedicated implementation planning skill would be proactive — helping teams produce better input before engaging the development agents.

## Proposed Work

Create a new skill: **`servicenow-implementation-plan`**

### Skill Structure
```
agents/skills/servicenow-implementation-plan/
├── SKILL.md
└── references/
    ├── PLAN-TEMPLATES.md           # Templates for different plan types
    ├── ARTIFACT-TAXONOMY.md        # SN artifact types and their planning concerns
    ├── ESTIMATION-GUIDE.md         # Complexity estimates for SN artifacts
    └── EXAMPLES.md                 # Example plans for common SN scenarios
```

### Skill Capabilities

**1. Feature Implementation Plan Generation**

Given a feature description, generate a structured plan:

```markdown
# Implementation Plan: Incident Priority Automation

## Overview
Automate priority assignment for incidents based on CI criticality and impact analysis.

## Artifacts Required
| Type | Name | Purpose | Complexity |
|------|------|---------|-----------|
| Table extension | x_myapp_ci_priority_matrix | Store criticality mappings | Low |
| Script Include | IncidentPriorityCalculator | Core priority logic | Medium |
| Business Rule (before-insert) | Calculate Incident Priority | Apply priority on creation | Low |
| Business Rule (before-update) | Recalculate Priority on CI Change | React to CI changes | Low |
| Flow | Notify Team on P1/P2 | Escalation automation | Medium |
| ATF Suite | Incident Priority Tests | Test all scenarios | Medium |

## Dependencies
- Requires: CMDB CI table with criticality field
- Blocked by: CMDB data quality initiative (SNS-1204)

## Risks
- CI criticality data may be incomplete (mitigate: default to Medium)
- High frequency on incident table — BR must be lightweight

## Acceptance Criteria
- P1 incidents auto-assigned within 500ms
- All ATF tests pass
- Priority cannot be manually overridden without ITIL role

## Estimated Effort: 3-5 story points
```

**2. Technical Spike Documents**

For uncertain or novel requirements, generate a time-boxed spike:
- Define the question to be answered
- Set a time box (e.g., 2-4 hours)
- Define done criteria (what "answer" looks like)
- Document findings and recommendations

**3. Epic/Feature Breakdown**

For larger initiatives, break down epics into features, features into stories, and stories into tasks aligned with the NowDev agent specializations:
- Which stories need Classic vs. Fluent development?
- Which stories need the AI Studio Developer?
- What are the dependencies between stories?
- What's the optimal agent invocation sequence?

**4. GitHub Issues Generation**

Optionally generate GitHub Issues from the plan, one per story/task, with:
- Correct labels (artifact type, complexity)
- Structured body following the team's issue template
- Dependencies linked via `Depends on` references

## Integration Points

- Should be invokable before starting any new feature: `@NowDev-AI-Agent Plan the implementation of [feature description]`
- The orchestrator should reference the generated plan throughout execution
- Output plan should be stored as a file (`docs/plans/[feature-name].md`) for reference
- Should feed directly into the `NowDev-AI-Refinement` agent

## References

- [awesome-copilot create-implementation-plan](https://github.com/github/awesome-copilot/blob/main/skills/create-implementation-plan/SKILL.md)
- [awesome-copilot breakdown-plan](https://github.com/github/awesome-copilot/blob/main/skills/breakdown-plan/SKILL.md)
- [awesome-copilot create-technical-spike](https://github.com/github/awesome-copilot/blob/main/skills/create-technical-spike/SKILL.md)
