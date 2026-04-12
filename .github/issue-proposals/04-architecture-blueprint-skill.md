---
title: "Add Architecture Blueprint Generator Skill for ServiceNow Applications"
labels: ["enhancement", "new-skill"]
---

## Summary

Add an **Architecture Blueprint Generator skill** that analyzes a ServiceNow Fluent SDK project and automatically produces detailed architectural documentation — including Mermaid diagrams, component inventories, and dependency maps.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes an [architecture-blueprint-generator](https://github.com/github/awesome-copilot/blob/main/skills/architecture-blueprint-generator/SKILL.md) skill that:

> Analyzes codebases to create detailed architectural documentation. Automatically detects technology stacks and architectural patterns, generates visual diagrams, documents implementation patterns, and provides extensible blueprints for maintaining architectural consistency and guiding new development.

ServiceNow Fluent SDK applications can grow complex quickly — multiple tables, roles, ACLs, flows, REST APIs, and UI components spread across many files. A blueprint generator would help teams understand, document, and maintain their applications.

The NowDev AI Toolbox already uses Mermaid diagrams for planning (in the orchestrator workflow), but lacks a standalone skill for comprehensive architectural documentation.

## Proposed Work

Create a new skill: **`servicenow-architecture-blueprint`**

### Skill Structure
```
agents/skills/servicenow-architecture-blueprint/
├── SKILL.md
└── references/
    ├── DIAGRAM-TEMPLATES.md     # Mermaid templates for SN architectures
    ├── COMPONENT-CATALOG.md     # Inventory template for SN artifacts
    └── DEPENDENCY-PATTERNS.md   # Common SN dependency patterns
```

### Skill Capabilities

**1. Automatic Codebase Analysis**
- Scan the Fluent SDK project directory structure
- Identify all artifact types: tables, fields, roles, ACLs, Business Rules, Script Includes, Flows, REST APIs, Client Scripts, UI components, ATF tests
- Extract cross-artifact dependencies (e.g., which flows call which script includes, which ACLs reference which roles)

**2. Mermaid Architecture Diagram Generation**
- Generate layered architecture diagrams showing:
  - Data model (tables and relationships)
  - Business logic layer (Business Rules, Script Includes)
  - Automation layer (Flows, Subflows, Scheduled Scripts)
  - API layer (REST endpoints and integrations)
  - UI layer (React components, Catalog items, Workspaces)
- Use the same `renderMermaidDiagram` tool already used by the orchestrator

**3. Component Inventory Document**
- Generate a structured `ARCHITECTURE.md` file with:
  - Application overview (scope, purpose, key stakeholders)
  - Complete artifact inventory with descriptions
  - Dependency matrix
  - Known technical debt items
  - Extension points for future development

**4. Pattern Detection**
- Identify architectural patterns in use (e.g., Service Layer, Repository Pattern, Event-Driven)
- Flag anti-patterns (e.g., Business Rules querying too many tables, circular dependencies)
- Suggest refactoring opportunities

## Integration Points

- Should be invocable standalone by users via `/` command
- Should be suggested by the orchestrator at the start of large refactoring tasks
- Output `ARCHITECTURE.md` should be placed in the project root
- Should complement the existing `NowDev-AI-Refinement` agent's analysis phase

## References

- [awesome-copilot architecture-blueprint-generator](https://github.com/github/awesome-copilot/blob/main/skills/architecture-blueprint-generator/SKILL.md)
- [ServiceNow Fluent SDK documentation](https://developer.servicenow.com/dev.do#!/reference/now-sdk)
