---
name: servicenow-artifact-state
context: fork
user-invocable: false
description: Coordinate workspace-backed NowDev artifact state across ServiceNow development agents. Use when agents need to read sibling outputs, validate dependencies, recover after context compaction, or emit final Artifact Manifest JSON blocks.
last_verified: "2026-06-25"
---

# NowDev Artifact State Protocol

Use this skill whenever a NowDev agent coordinates, implements, reviews, tests, or releases artifacts that may depend on outputs from another agent in the same session.

## Source Of Truth

The artifact registry is a workspace-backed JSON file. Read `.vscode/nowdev-ai-config.json` first, then use `artifactState.path` to locate the registry. The default path is `.vscode/nowdev-ai-session/artifacts.json`.

Memory is optional legacy context only. Do not require `/memories/session/artifacts.md`, `vscode/memory`, or memory URI resolution for artifact tracking, because memory may be preview, unavailable, or disabled by policy.

## Agent Responsibilities

Before implementation or dependent review:

1. Read `.vscode/nowdev-ai-config.json`.
2. Read the artifact state file at `artifactState.path` when it exists.
3. If only `memoryLocation` exists, treat it as read-only legacy context.
4. For every dependency, read the actual source files listed by that artifact before trusting method names, class names, table names, field names, roles, REST paths, or test names.
5. Do not manually edit memory tables or perform markdown table surgery.

After implementation:

1. List every created or modified artifact.
2. Include relative file paths for every file touched.
3. Include exports that downstream agents can safely consume.
4. Include dependency artifact ids in `dependsOn`.
5. End the response with an `Artifact Manifest` JSON block.

## Artifact Manifest Format

```json
{
  "artifacts": [
    {
      "id": "<stable artifact id>",
      "name": "<artifact name>",
      "type": "<artifact type>",
      "files": ["<relative/path>"],
      "ownerAgent": "<agent name>",
      "exports": ["<class names, method signatures, table names, field names, roles, REST paths, or test names>"],
      "status": "done",
      "dependsOn": ["<dependency artifact ids>"]
    }
  ]
}
```

## Coordinator Responsibilities

Before delegating to the first specialist, coordinators must read the artifact state path and pass it to each specialist.

After each specialist returns, coordinators must parse the final `Artifact Manifest` block and carry exact files, exports, and dependency ids into later delegation prompts. When delegating dependent work, tell the specialist to read the artifact state and then read the actual dependency source files before using an export.

## Reviewer Responsibilities

Reviewers must cross-reference `dependsOn` entries with the artifact exports and the actual source code. Flag wrong method names, missing parameters, missing fields, stale `in_progress` dependencies, or calls to non-existent exports as findings.

## Context Compaction Recovery

After compaction or resumptions, re-read `.vscode/nowdev-ai-config.json`, the artifact state file, and dependency source files. Do not rely on compressed chat memory for artifact names, signatures, or dependencies.
