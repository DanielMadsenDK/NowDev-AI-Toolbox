---
title: "Add ServiceNow Documentation Writer Skill (Diátaxis Framework)"
labels: ["enhancement", "new-skill", "documentation"]
---

## Summary

Add a **Documentation Writer skill** specialized for ServiceNow that generates high-quality, structured documentation for ServiceNow applications, APIs, and processes using the [Diátaxis documentation framework](https://diataxis.fr/).

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes a [documentation-writer](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md) skill that acts as:

> An expert technical writer specializing in creating high-quality software documentation, guided by the principles and structure of the Diátaxis technical documentation authoring framework.

The Diátaxis framework organizes documentation into four distinct types:
1. **Tutorials** — learning-oriented, guides a beginner through a task
2. **How-to Guides** — task-oriented, practical step-by-step instructions  
3. **Reference** — information-oriented, technical descriptions of the system
4. **Explanation** — understanding-oriented, discusses concepts and context

ServiceNow applications are notoriously under-documented. Development teams build complex Business Rules, Flows, and integrations that are hard to onboard new developers to. The NowDev AI Toolbox generates code but doesn't generate the documentation that should accompany it.

## Proposed Work

Create a new skill: **`servicenow-documentation-writer`**

### Skill Structure
```
agents/skills/servicenow-documentation-writer/
├── SKILL.md
└── references/
    ├── DIATAXIS-FRAMEWORK.md        # Diátaxis concepts applied to SN
    ├── DOC-TEMPLATES.md             # Templates for each doc type
    ├── SERVICENOW-GLOSSARY.md       # SN-specific terms and concepts
    └── EXAMPLES.md                  # Example docs for SN artifacts
```

### Skill Capabilities

**1. Application Documentation**
Generate a complete documentation set for a ServiceNow application:
- **README** — Application overview, purpose, and quick start
- **Architecture** — How the application is structured and why
- **Data Model** — Tables, fields, relationships, and their business meaning
- **Processes** — Business processes the application supports

**2. Artifact-Level Documentation**

| Artifact | Doc Types Generated |
|---------|---------------------|
| Script Include | API reference (methods, parameters, return values) + How-to guides |
| Business Rule | Reference (when/what triggers) + Explanation (why this logic) |
| Flow | Tutorial (walk through a flow) + How-to (modify the flow) |
| REST API | Full OpenAPI-style reference + Integration how-to guide |
| ATF Suite | Reference (what's tested) + How-to (run and extend tests) |
| Scheduled Script | Reference (schedule, purpose) + Ops runbook |

**3. ServiceNow-Specific Doc Patterns**
- Generate **Update Set descriptions** that summarize what's included and why
- Generate **Instance configuration guides** for post-deployment setup
- Generate **Troubleshooting guides** based on known error conditions in the code
- Generate **Admin guides** for platform administrators who manage the application

**4. Markdown and Wiki Output**
- Output documentation as GitHub-flavored Markdown
- Organize into a `docs/` directory with logical structure
- Generate a navigation `docs/README.md` index
- Optionally format for ServiceNow's own knowledge base articles

## Example Output Structure

```
docs/
├── README.md                      # Application overview
├── tutorials/
│   ├── getting-started.md         # First deployment guide
│   └── your-first-incident.md     # End-user tutorial
├── how-to/
│   ├── configure-approvals.md     # Admin configuration guide
│   └── add-custom-fields.md       # Developer extension guide
├── reference/
│   ├── data-model.md              # Tables and fields reference
│   ├── api-reference.md           # REST API documentation
│   └── script-includes.md        # Script Include API reference
└── explanation/
    ├── architecture.md            # Why it's designed this way
    └── approval-workflow.md       # Business process explanation
```

## Integration Points

- Should be invocable after any completed development session
- The orchestrator should optionally offer "Generate documentation?" after completing a full-project implementation
- Should analyze existing code to extract documentation content automatically
- Output should be committed to the repository alongside the code

## References

- [awesome-copilot documentation-writer skill](https://github.com/github/awesome-copilot/blob/main/skills/documentation-writer/SKILL.md)
- [Diátaxis framework](https://diataxis.fr/)
- [ServiceNow Developer Documentation standards](https://docs.servicenow.com/)
