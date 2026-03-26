# NowDev AI Toolbox
<div align="center">
<img width="128" height="128" alt="agent-icon" src="https://github.com/user-attachments/assets/f03d05ef-0023-4282-967c-995321aaef47" />
</div>

<div align="center">

  ![Version](https://img.shields.io/badge/version-0.2.1-blue)
  ![VS Code](https://img.shields.io/badge/VS%20Code-1.110+-blue)
  ![Platform](https://img.shields.io/badge/Platform-ServiceNow-293E40)
  ![License](https://img.shields.io/badge/License-GPL--3.0-blue)
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
*   **Live Instance Preview & Autonomous Verification**: Agents autonomously inspect your ServiceNow instance in real-time—capturing screenshots, reading form field state, validating form behavior, and detecting client-side issues without manual inspection. Perfect for post-deployment verification and debugging client-side problems.

## Installation & Usage

### Prerequisites
- Visual Studio Code 1.110 or later
- GitHub Copilot Chat extension

The Context7 MCP Server must be installed manually in VS Code to enable the AI agents to reference official ServiceNow documentation and verified best practices during development.

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode:mcp/by-name/io.github.upstash/context7)

Click the button above to install the Context7 MCP server plugin in VS Code.

#### Manual Context7 Setup (If Plugin Installation is Blocked)

If you cannot install the Context7 MCP plugin due to group policy restrictions or other installation issues, you can manually configure the remote Context7 server:

1. Open your VS Code MCP config file:
   - **Windows**: `%APPDATA%\Code\User\mcp.json`
   - **macOS**: `~/Library/Application Support/Code/User/mcp.json`
   - **Linux**: `~/.config/Code/User/mcp.json`

2. Add the following configuration to the `servers` section:
```json
"io.github.upstash/context7": {
  "type": "http",
  "url": "https://mcp.context7.com/mcp"
}
```

3. Your `mcp.json` should look like this:
```json
{
  "servers": {
    "io.github.upstash/context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

4. Restart VS Code for the changes to take effect.

**Note**: If Context7 is unavailable, the agents will automatically fall back to using built-in skills for development guidance and best practices.

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

The extension provides 8 specialized AI agents, each focused on different aspects of ServiceNow development:

| Agent | Description | Use Case |
|-------|-------------|----------|
| NowDev-AI-Orchestrator | Solution Architecture & Workflow Management | Planning complex ServiceNow implementations |
| NowDev-AI-Script-Developer | Server-side libraries & GlideAjax | Creating Script Includes and server-side logic |
| NowDev-AI-BusinessRule-Developer | Database triggers & automation logic | Implementing Business Rules and workflows |
| NowDev-AI-Client-Developer | Browser-side UI & interaction | Client Scripts and UI customizations |
| NowDev-AI-Fluent-Developer | ServiceNow Fluent SDK & TypeScript | Building full-stack applications with the Fluent SDK |
| NowDev-AI-Reviewer | Code Review, Security & Compliance | Quality assurance and best practices validation |
| NowDev-AI-Debugger | Diagnostics, Logs & Performance Analysis | Troubleshooting and performance optimization |
| NowDev-AI-Release-Expert | Update Sets, XML Data & Deployment | Release management and deployment |

## Architecture

The extension integrates specialized AI agents directly into VS Code through GitHub Copilot Chat's agent system. Each agent is a declarative Copilot Agent with defined capabilities and expertise areas.

### Agent Capabilities
- **Specialized Knowledge**: Deep expertise in specialized ServiceNow domains.
- **Native Skills**: "Mounts" verified Best Practice documentation directly into the agent's context window.
- **Orchestration**: Seamlessly hands off tasks between Planning, Development, and Review agents.

## Code Examples

The project includes comprehensive code examples from the official [ServiceNow SDK Examples Repository](https://github.com/servicenow/sdk-examples) integrated directly into the skills. Each skill in the `agents/skills/` directory includes an `EXAMPLES.md` file with production-ready code examples:

- **[servicenow-fluent-development/references/EXAMPLES.md](agents/skills/servicenow-fluent-development/references/EXAMPLES.md)** — Tables, business rules, REST APIs, ACLs, UI actions, service catalog
- **[servicenow-business-rules/references/EXAMPLES.md](agents/skills/servicenow-business-rules/references/EXAMPLES.md)** — Before/after/async rules, validation, recursion prevention
- **[servicenow-http-integrations/references/EXAMPLES.md](agents/skills/servicenow-http-integrations/references/EXAMPLES.md)** — REST APIs, OAuth, error handling, SOAP
- **[servicenow-client-scripts/references/EXAMPLES.md](agents/skills/servicenow-client-scripts/references/EXAMPLES.md)** — Form initialization, GlideAjax, validation
- **[servicenow-script-server-logic/references/EXAMPLES.md](agents/skills/servicenow-script-server-logic/references/EXAMPLES.md)** — Script includes, utilities, database queries
- **[servicenow-flow-designer/references/EXAMPLES.md](agents/skills/servicenow-flow-designer/references/EXAMPLES.md)** — Workflow automation, escalation, approval workflows
- **[servicenow-ui-forms/references/EXAMPLES.md](agents/skills/servicenow-ui-forms/references/EXAMPLES.md)** — Form field manipulation, UI actions, dynamic behavior

## Included Skills

These best practice modules are now natively registered as Copilot Skills:
- **ServiceNow Scripting**: Naming conventions, `GlideAggregate` vs `GlideRecord`, and forbidden patterns (`eval`).
- **Business Rules**: Execution timing (`before`/`after`/`async`), recursion prevention, and IIFE wrapping.
- **Client Scripts**: `GlideAjax` patterns, performance optimization, and `g_scratchpad` usage.
- **Deployment**: Update Set hygiene, batching strategies, and XML migration rules.

### Agent Definitions
Each AI agent is defined in declarative format:
- [View Agent Definitions](agents/github-copilot/)

## Included Examples & Attribution

This project integrates production-ready code examples from the [ServiceNow SDK Examples Repository](https://github.com/servicenow/sdk-examples) (MIT License) directly into the agent skills. Each skill's `EXAMPLES.md` file contains working code examples demonstrating best practices.

For details on third-party licenses and attribution, see [THIRD_PARTY.md](THIRD_PARTY.md).

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

Code examples adapted from the ServiceNow SDK Examples Repository are licensed under the MIT License - see [LICENSES/MIT-ServiceNow-SDK.txt](LICENSES/MIT-ServiceNow-SDK.txt) for details.

## Author

**Daniel Aagren Seehartrai Madsen** - ServiceNow Rising Star 2025

*Dedicated to elevating the standard of ServiceNow development through AI innovation.*
