export interface AgentNode {
    id: string;
    shortName: string;
    role: 'orchestrator' | 'coordinator' | 'developer' | 'reviewer' | 'release' | 'support';
    description: string;
    children: AgentNode[];
}

/**
 * Static agent hierarchy matching the agents registered in package.json.
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
            id: 'NowDev-AI-Classic-Developer',
            shortName: 'Classic Developer',
            role: 'coordinator',
            description: 'Coordinates all Classic ServiceNow scripting',
            children: [
                {
                    id: 'NowDev-AI-Script-Developer',
                    shortName: 'Script Developer',
                    role: 'developer',
                    description: 'Script Includes (.js)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-BusinessRule-Developer',
                    shortName: 'Business Rule Dev',
                    role: 'developer',
                    description: 'Business Rules (.js)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Client-Developer',
                    shortName: 'Client Developer',
                    role: 'developer',
                    description: 'Client Scripts (.js)',
                    children: [],
                },
            ],
        },
        {
            id: 'NowDev-AI-Fluent-Developer',
            shortName: 'Fluent Developer',
            role: 'coordinator',
            description: 'Coordinates Fluent SDK metadata and React apps',
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
                    id: 'NowDev-AI-ATF-Developer',
                    shortName: 'ATF Developer',
                    role: 'developer',
                    description: 'ATF Test files (.now.ts Test)',
                    children: [],
                },
                {
                    id: 'NowDev-AI-AI-Studio-Developer',
                    shortName: 'AI Studio Developer',
                    role: 'coordinator',
                    description: 'Coordinates AI Agent and NowAssist artifacts',
                    children: [
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
                    ],
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
            id: 'NowDev-AI-Reviewer',
            shortName: 'Reviewer',
            role: 'reviewer',
            description: 'Routes code review to Classic or Fluent reviewer',
            children: [
                {
                    id: 'NowDev-AI-Classic-Reviewer',
                    shortName: 'Classic Reviewer',
                    role: 'reviewer',
                    description: 'Reviews .js Classic artifacts',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Fluent-Reviewer',
                    shortName: 'Fluent Reviewer',
                    role: 'reviewer',
                    description: 'Reviews .now.ts Fluent artifacts',
                    children: [],
                },
            ],
        },
        {
            id: 'NowDev-AI-Release-Expert',
            shortName: 'Release Expert',
            role: 'release',
            description: 'Routes deployment to Classic XML or Fluent SDK',
            children: [
                {
                    id: 'NowDev-AI-Classic-Release',
                    shortName: 'Classic Release',
                    role: 'release',
                    description: 'XML Update Set packaging',
                    children: [],
                },
                {
                    id: 'NowDev-AI-Fluent-Release',
                    shortName: 'Fluent Release',
                    role: 'release',
                    description: 'now-sdk build & install',
                    children: [],
                },
            ],
        },
    ],
};
