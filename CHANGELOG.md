# Changelog

All notable changes to the NowDev AI Toolbox extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Repaired the skill path injected into generated agents: `agents/skills/now-sdk/SKILL.md` → `agents/skills/nowdev-ai-toolbox-servicenow-sdk/SKILL.md`, and regenerated the Copilot CLI plugin bundle.
- Removed references to the retired `NowDev-AI-AI-Studio-Developer` agent; the fluent-development skill now routes AiAgent/AiAgenticWorkflow work to `NowDev-AI-AI-Agent-Developer` and NowAssistSkillConfig work to `NowDev-AI-NowAssist-Developer`.
- Rewrote the Claude Code instructions (`agents/claude-code/CLAUDE.md`, `README.md`) to reference the four bundled skills instead of 17 removed/renamed ones.
- Corrected the agent hierarchy in the agent-authoring skill and pruned stale generated-agent entries (the removed Classic tier) from `.gitignore`.
- README now documents all four profiles, including Advanced Developer, and no longer advertises the removed `servicenow-copilot-instructions-generator` skill.
- Aligned `.github/plugin/marketplace.json` version (was stuck at 0.7.1).

### Added
- CI workflow (lint, compile, unit tests, agent validation, bundle, plugin-drift check).
- ESLint (flat config, typescript-eslint) and a unit test suite (`npm test`, Node built-in test runner) covering token expansion, agent registry parsing, frontmatter helpers, and full agent/skill validation.
- Content-integrity validation in `validate:agents`: skill path references and `NowDev-AI-*` agent names in shipped content must resolve, so reference rot now fails the prepublish gate.

### Changed
- `.vscodeignore` cleanup: removed dead entries; excluded dev tooling, eval workspaces, and packaged `.skill` archives from the VSIX payload.

### Removed
- Dead `McpToolDiscovery.ts` module (unused MCP process-spawning surface).

### Internal
- Extracted `nowdev-ai-config.json` / `now.config.json` file I/O into `src/welcome/configFile.ts` and GitHub docs helpers into `src/welcome/githubDocs.ts`, trimming `WelcomeViewProvider.ts` from ~1,500 to ~1,240 lines.

## [0.7.4] - 2026-07-01

### Added
- ServiceNow release notes skill (`nowdev-ai-toolbox-release-notes`).
- `now-sdk` CLI reference skill (`nowdev-ai-toolbox-servicenow-sdk`) and comprehensive React UI component documentation.

### Changed
- Standardized Session Artifact Registry protocol citations across agent documentation.
- Removed deprecated per-domain platform skills in favor of `now-sdk explain` (External Source Strategy).

## [0.7.2] - 2026-06

### Changed
- Improved terminal shell handling and Windows compatibility.

## [0.7.1] - 2026-06

### Changed
- Improved SDK integration.

## [0.7.0] - 2026-06

### Added
- GitHub Copilot CLI / desktop plugin distribution (`plugins/nowdev-ai-toolbox`, built via `npm run build:plugin`).
- Skills for ServiceNow server-side operations, date/time handling, security, and UI forms (later consolidated in 0.7.4).
- Markdown table and code-highlighting support in the SDK Explain panel.

## [0.6.2] - 2026-05

### Added
- `now-sdk query` functionality (live instance data lookups) with dedicated panel.
- User profiles (Developer, Advanced Developer, Junior Developer, Product Owner) controlling agent visibility and communication tone.
- Project-specific Copilot instructions generation; workspace instructions and prompt file management.
- Work-item (DevOps) MCP integration.

## [0.6.1] - 2026-05

### Changed
- `now-sdk explain` established as the primary Fluent SDK documentation source; removed outdated local guides.

## [0.5.x] - 2026-04

### Added
- Initial multi-agent architecture: NowDev AI orchestrator, Fluent Developer coordinator, and Schema/Logic/Automation/UI/ATF specialists.
- Welcome sidebar with MCP server discovery, tool selection, and agent topology view.
- ServiceNow product documentation sources; instance browser; auth alias management.
