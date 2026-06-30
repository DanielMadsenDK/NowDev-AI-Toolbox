export interface AgentNode {
    id: string;
    shortName: string;
    role: 'orchestrator' | 'coordinator' | 'developer' | 'reviewer' | 'release' | 'support';
    description: string;
    children: AgentNode[];
}

/**
 * Static agent hierarchy matching the bundled agents in agents/github-copilot/.
 * Update this when agents are added or removed.
 */
export const AGENT_TREE: AgentNode = {
    id: 'NowDev-AI',
    shortName: 'NowDev AI',
    role: 'orchestrator',
    description: 'Solution architect that orchestrates all sub-agents',
    children: [
        {
            id: 'NowDev-AI-Assistant',
            shortName: 'Assistant',
            role: 'support',
            description: 'Lightweight Q&A, brainstorming, and quick discovery',
            children: [],
        },
        {
            id: 'NowDev-AI-Refinement',
            shortName: 'Refinement',
            role: 'support',
            description: 'User story refinement and feasibility validation',
            children: [],
        },
        {
            id: 'NowDev-AI-Fluent-Developer',
            shortName: 'Fluent Developer',
            role: 'coordinator',
            description: 'Coordinates Fluent SDK metadata, React apps, and AI Studio artifacts',
            children: [
                {
                    id: 'NowDev-AI-Fluent-Schema-Developer',
                    shortName: 'Schema Developer',
                    role: 'developer',
                    description: 'Tables, Roles, ACLs, Forms (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Fluent-Logic-Developer',
                    shortName: 'Logic Developer',
                    role: 'developer',
                    description: 'Business Rules, Script Includes, REST APIs (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Fluent-Automation-Developer',
                    shortName: 'Automation Developer',
                    role: 'developer',
                    description: 'Flows, Subflows, Custom Actions (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Fluent-UI-Developer',
                    shortName: 'UI Developer',
                    role: 'developer',
                    description: 'React UI, Catalog Items, Workspaces (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-AI-Agent-Developer',
                    shortName: 'AI Agent Developer',
                    role: 'developer',
                    description: 'AiAgent, AiAgenticWorkflow (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-NowAssist-Developer',
                    shortName: 'NowAssist Developer',
                    role: 'developer',
                    description: 'NowAssistSkillConfig (.now.ts)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-ATF-Developer',
                    shortName: 'ATF Developer',
                    role: 'developer',
                    description: 'ATF Test files (.now.ts Test)',
                    children: [],
                },
            ],
        },
        {
            id: 'NowDev-AI-Debugger',
            shortName: 'Debugger',
            role: 'support',
            description: 'Runtime error diagnosis and performance analysis',
            children: [],
        },
        {
            id: 'NowDev-AI-Fluent-Reviewer',
            shortName: 'Fluent Reviewer',
            role: 'reviewer',
            description: 'Reviews .now.ts Fluent artifacts',
            children: [],
        },
        {
            id: 'NowDev-AI-Fluent-Release',
            shortName: 'Fluent Release',
            role: 'release',
            description: 'now-sdk build & install',
            children: [],
        },
        {
            id: 'NowDev-AI-Pipeline-Expert',
            shortName: 'Pipeline Expert',
            role: 'release',
            description: 'CI/CD pipeline generation and release workflow automation',
            children: [],
        },
    ],
};
