---
title: "Add ServiceNow Security Audit Skill (OWASP/Agent Governance)"
labels: ["enhancement", "security", "new-skill"]
---

## Summary

Add a **ServiceNow Security Audit skill** to the NowDev AI Toolbox that checks ServiceNow code and AI agent configurations against security best practices, inspired by the OWASP Agentic Security Initiative and agent governance patterns from awesome-copilot.

## Background

The [awesome-copilot](https://github.com/github/awesome-copilot) repository includes several security-focused skills:

- **[agent-governance](https://github.com/github/awesome-copilot/blob/main/skills/agent-governance/SKILL.md)** — patterns for adding governance, safety, and trust controls to AI agent systems
- **[agent-owasp-compliance](https://github.com/github/awesome-copilot/blob/main/skills/agent-owasp-compliance/SKILL.md)** — check AI agent codebases against OWASP Agentic Security Initiative (ASI) Top 10 risks
- **[agent-supply-chain](https://github.com/github/awesome-copilot/blob/main/skills/agent-supply-chain/SKILL.md)** — verify supply chain integrity for AI agent plugins and dependencies
- **[ai-prompt-engineering-safety-review](https://github.com/github/awesome-copilot/blob/main/skills/ai-prompt-engineering-safety-review/SKILL.md)** — comprehensive safety review for AI prompts

ServiceNow handles sensitive enterprise data (HR records, ITSM tickets, security incidents) and the NowDev AI Toolbox generates code that runs on these systems. A security audit skill is critical.

## Proposed Work

Create a new skill: **`servicenow-security-audit`**

### Skill Structure
```
agents/skills/servicenow-security-audit/
├── SKILL.md
└── references/
    ├── OWASP-TOP10.md          # OWASP risks mapped to ServiceNow context
    ├── SN-SECURITY-CHECKLIST.md # ServiceNow-specific security checklist
    ├── ACL-PATTERNS.md         # ACL best practices for ServiceNow
    └── INJECTION-PREVENTION.md # Script injection prevention patterns
```

### Skill Capabilities

**1. ServiceNow Code Security Review**
- Scan Business Rules, Script Includes, and Client Scripts for:
  - SQL/GlideRecord injection vulnerabilities
  - `eval()` and dynamic code execution
  - Hardcoded credentials or API keys
  - Insecure direct object references (raw `sys_id` in user-facing code)
  - Missing input sanitization (`gs.xmlEscape`, `gs.htmlEscape`)
  - Privilege escalation via `gs.setUser()` or scope bypass

**2. ACL and Access Control Review**
- Analyze ACL definitions for:
  - Overly permissive `true` conditions
  - Missing field-level access controls
  - Script-based ACLs using banned patterns
  - Cross-scope privilege escalation risks

**3. NowAssist/AI Agent Security (OWASP ASI Alignment)**
- For AI-generated `AiAgent` and `NowAssistSkillConfig` artifacts:
  - Prompt injection prevention
  - Tool permission scoping
  - Output sanitization before display
  - Audit trail completeness
  - Data leakage via LLM prompt construction

**4. Compliance Report Generation**
- Generate a structured security report with:
  - Findings categorized by severity (Critical, High, Medium, Low)
  - Exact file/line references
  - Remediation recommendations
  - OWASP ASI risk mapping

## Integration Points

- Should be invocable by `NowDev-AI-Reviewer` and `NowDev-AI-Fluent-Reviewer` agents
- Should be suggested by the orchestrator when deployments involve sensitive tables
- Should be documented as a standalone skill users can invoke directly

## References

- [awesome-copilot agent-governance skill](https://github.com/github/awesome-copilot/blob/main/skills/agent-governance/SKILL.md)
- [awesome-copilot agent-owasp-compliance skill](https://github.com/github/awesome-copilot/blob/main/skills/agent-owasp-compliance/SKILL.md)
- [OWASP Agentic Security Initiative](https://owasp.org/www-project-agentic-security-initiative/)
- [ServiceNow Security Best Practices](https://docs.servicenow.com/bundle/washingtondc-platform-security/page/administer/security/concept/c_SecurityBestPractices.html)
