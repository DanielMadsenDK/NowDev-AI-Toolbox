---
title: "Add Agentic Evaluation Loop Skill for Iterative ServiceNow Code Improvement"
labels: ["enhancement", "new-skill"]
---

## Summary

Add an **Agentic Evaluation Loop skill** that enables the NowDev AI Toolbox to autonomously iterate on ServiceNow code quality by running ATF tests, measuring results, and applying targeted improvements in a loop until quality thresholds are met.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes two highly relevant skills:

- **[agentic-eval](https://github.com/github/awesome-copilot/blob/main/skills/agentic-eval/SKILL.md)** — patterns for evaluating and improving AI agent outputs through self-critique, reflection loops, evaluator-optimizer pipelines, and LLM-as-judge systems
- **[autoresearch](https://github.com/github/awesome-copilot/blob/main/skills/autoresearch/SKILL.md)** — autonomous iterative experimentation loop: define goals, measurable metrics, and run a loop of changes → test → measure → keep/discard

The NowDev AI Toolbox already has:
- `NowDev-AI-ATF-Developer` for writing ATF tests
- `NowDev-AI-Reviewer` for code review

But there's no skill that **closes the loop** by automatically running tests and applying the reviewer's feedback iteratively until the code meets quality standards.

## Proposed Work

Create a new skill: **`servicenow-agentic-eval`**

### Skill Structure
```
agents/skills/servicenow-agentic-eval/
├── SKILL.md
└── references/
    ├── EVAL-RUBRICS.md           # Quality rubrics for SN artifact types
    ├── ITERATION-PATTERNS.md    # Patterns for iterative improvement loops
    └── METRICS.md                # Measurable quality metrics for SN code
```

### Skill Capabilities

**1. Quality Rubric Definition**
Define measurable quality criteria per artifact type:

| Artifact | Metrics |
|---------|---------|
| Business Rule | ATF test passes, no banned patterns, execution time < 200ms |
| Script Include | All methods have ATF coverage, no global scope leakage |
| Flow | All paths have ATF test, error handling present |
| REST API | Schema validation passes, auth tested, error codes documented |
| Client Script | No DOM manipulation, GlideAjax used correctly |

**2. Evaluate-Optimize Pipeline**
Run a configurable improvement loop:
1. **Generate** initial implementation (existing agents handle this)
2. **Evaluate** against rubric: run ATF, check reviewer feedback, measure complexity
3. **Score** each criterion (pass/fail or 0-10)
4. **Identify** lowest-scoring areas
5. **Improve** targeted aspects (delegate back to appropriate developer agent)
6. **Re-evaluate** and repeat until threshold is met or max iterations reached

**3. LLM-as-Judge Review**
Use the `NowDev-AI-Reviewer` agent output as structured evaluation input:
- Parse reviewer findings into structured scores
- Track improvement across iterations
- Detect regressions (score went down)
- Halt if stuck in improvement loop without progress

**4. Experiment Tracking**
- Log each iteration's changes and scores
- Keep the best-scoring version (not necessarily the latest)
- Generate an evaluation report showing improvement trajectory

## Example Usage

```
@NowDev-AI-Agent Run agentic eval on the incident priority business rule until:
- All ATF tests pass
- Reviewer score >= 8/10
- No Critical findings
Max iterations: 5
```

## Integration Points

- Should be optionally invokable at the end of any development task
- Should be triggered automatically for Critical/High-priority artifacts
- The orchestrator should offer "Run quality loop?" at the end of full-project implementations
- Should integrate with the existing Session Artifact Registry

## References

- [awesome-copilot agentic-eval skill](https://github.com/github/awesome-copilot/blob/main/skills/agentic-eval/SKILL.md)
- [awesome-copilot autoresearch skill](https://github.com/github/awesome-copilot/blob/main/skills/autoresearch/SKILL.md)
