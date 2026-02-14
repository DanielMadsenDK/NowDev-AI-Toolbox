# NowDev AI Toolbox
<div align="center">
<img width="128" height="128" alt="agent-icon" src="https://github.com/user-attachments/assets/f03d05ef-0023-4282-967c-995321aaef47" />
</div>

<div align="center">

  ![Version](https://img.shields.io/badge/version-0.1.4-blue)
  ![VS Code](https://img.shields.io/badge/VS%20Code-1.109+-blue)
  ![Platform](https://img.shields.io/badge/Platform-ServiceNow-293E40)
  ![License](https://img.shields.io/badge/License-MIT-green)
  <br>
  ![GitHub Copilot](https://img.shields.io/badge/AI-GitHub%20Copilot-black)
  ![Status](https://img.shields.io/badge/Status-Active-success)
</div>

## Overview

NowDev AI Toolbox is a Visual Studio Code extension that provides specialized AI agents for ServiceNow development within GitHub Copilot Chat. Acting as a Lead Architect, the system orchestrates specialized sub-agents to plan, build, review, and deploy full-stack solutions.

The extension integrates ServiceNow Best Practice Skills directly into GitHub Copilot, ensuring generated code adheres to strict performance and security standards. It features an AI Orchestrator that breaks down requirements, visualizes architecture with Mermaid diagrams, and delegates tasks to specialized agents for scripting, business logic, and deployment.

### Key Features

*   **AI Orchestrator**: A master agent that breaks down requirements and delegates tasks to specialized sub-agents.
*   **Built-in Agent Skills**: Automatically equips GitHub Copilot with verified knowledge of ServiceNow best practices.
*   **Automated Governance**: Reviewer agents check artifacts against architectural standards.
*   **Interactive Workflow**: Uses interactive tools to clarify requirements and validate designs.

## Installation & Usage

### Prerequisites
- Visual Studio Code 1.109 or later
- GitHub Copilot Chat extension

The Context7 MCP Server must be installed manually in VS Code to enable the AI agents to reference official ServiceNow documentation and verified best practices during development.

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode:mcp/by-name/io.github.upstash/context7)

Click the button above to install the Context7 MCP server plugin in VS Code.

### Quick Start

1. **Download the VSIX** from the [Releases](https://github.com/DanielMadsenDK/NowDev-AI-Toolbox/releases) section
2. **Install the extension** in VS Code: `Extensions → Install from VSIX...`
3. **Open GitHub Copilot Chat** in VS Code
4. **Select "NowDev AI Agent"** from the dropdown menu
5. **Start chatting** to plan and coordinate your ServiceNow development tasks

All agents are automatically available in every workspace once the extension is installed.

### Recommended Workflow

**Always start with the NowDev-AI-Orchestrator** for any new task or feature. The orchestrator will:
- Analyze your requirements and create a detailed implementation plan
- Break down complex tasks into manageable steps
- Coordinate between specialized agents as needed
- Ensure all work follows ServiceNow best practices

You can also use specialized agents directly for specific tasks, but starting with the orchestrator ensures proper planning and coordination.

### Example Usage
Open GitHub Copilot Chat, select "NowDev AI Agent" from the agent dropdown, and type:
```
I need to create a custom ServiceNow application for managing IT assets with approval workflows
```

## Specialized Agents

The extension provides 7 specialized AI agents, each focused on different aspects of ServiceNow development:

| Agent | Description | Use Case |
|-------|-------------|----------|
| NowDev-AI-Orchestrator | Solution Architecture & Workflow Management | Planning complex ServiceNow implementations |
| NowDev-AI-Script-Developer | Server-side libraries & GlideAjax | Creating Script Includes and server-side logic |
| NowDev-AI-BusinessRule-Developer | Database triggers & automation logic | Implementing Business Rules and workflows |
| NowDev-AI-Client-Developer | Browser-side UI & interaction | Client Scripts and UI customizations |
| NowDev-AI-Reviewer | Code Review, Security & Compliance | Quality assurance and best practices validation |
| NowDev-AI-Debugger | Diagnostics, Logs & Performance Analysis | Troubleshooting and performance optimization |
| NowDev-AI-Release-Expert | Update Sets, XML Data & Deployment | Release management and deployment |

## Architecture

The extension integrates specialized AI agents directly into VS Code through GitHub Copilot Chat's agent system. Each agent is a declarative Copilot Agent with defined capabilities and expertise areas.

### Agent Capabilities
- **Specialized Knowledge**: Deep expertise in specialized ServiceNow domains.
- **Native Skills**: "Mounts" verified Best Practice documentation directly into the agent's context window.
- **Orchestration**: Seamlessly hands off tasks between Planning, Development, and Review agents.

## Included Skills

These best practice modules are now natively registered as Copilot Skills:
- **ServiceNow Scripting**: Naming conventions, `GlideAggregate` vs `GlideRecord`, and forbidden patterns (`eval`).
- **Business Rules**: Execution timing (`before`/`after`/`async`), recursion prevention, and IIFE wrapping.
- **Client Scripts**: `GlideAjax` patterns, performance optimization, and `g_scratchpad` usage.
- **Deployment**: Update Set hygiene, batching strategies, and XML migration rules.

### Agent Definitions
Each AI agent is defined in declarative format:
- [View Agent Definitions](agents/github-copilot/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Daniel Aagren Seehartrai Madsen** - ServiceNow Rising Star 2025

*Dedicated to elevating the standard of ServiceNow development through AI innovation.*
