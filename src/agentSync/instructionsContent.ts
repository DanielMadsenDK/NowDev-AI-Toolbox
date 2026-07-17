import { WorkspaceAgentSyncConfig } from './types';

export function buildWorkspaceInstructionsContent(cfg: Pick<WorkspaceAgentSyncConfig, 'activeProfileId' | 'profileInstructions' | 'customInstructions' | 'agentGuidelines'>): string {
    const blocks = [
        '# NowDev AI Workspace Instructions',
        '',
        'These generated instructions make NowDev AI project context available in Copilot contexts outside the bundled agent files.',
        '',
        '## Cross-Agent File Handoff',
        '',
        '- When handing work back to a coordinator, end the response with a "Files Touched" list: path, purpose, and key exports for every file created or modified.',
        '- Coordinators carry that list verbatim into subsequent delegation prompts.',
        '- Before trusting a claimed export, method name, or field name from another agent, read the actual source file — never trust the handoff list alone.',
        '- Do not require Copilot memory for cross-agent handoff; memory may be unavailable or disabled by organization policy.',
    ];

    if (cfg.customInstructions?.trim()) {
        blocks.push('', '## Workspace Guidelines', '', cfg.customInstructions.trim());
    }
    if (cfg.agentGuidelines?.trim()) {
        blocks.push('', '## Instance-Backed Guidelines', '', cfg.agentGuidelines.trim());
    }
    if (cfg.profileInstructions?.trim()) {
        blocks.push('', `## Active Profile: ${cfg.activeProfileId || 'default'}`, '', cfg.profileInstructions.trim());
    }

    return ['---', "name: 'NowDev AI Workspace Context'", "description: 'Workspace-wide NowDev AI conventions, cross-agent handoff protocol, and selected guidelines.'", "applyTo: '**/*'", '---', '', ...blocks, ''].join('\n');
}

export function buildWorkspacePrompts(): Array<{ filename: string; content: string }> {
    return [
        {
            filename: 'nowdev-start.prompt.md',
            content: [
                '---',
                "name: 'nowdev-start'",
                "description: 'Start a NowDev AI implementation session with cross-agent handoff and routing.'",
                "argument-hint: '<feature or task description>'",
                "agent: 'NowDev AI Agent'",
                '---',
                '',
                'Start a NowDev AI implementation session for: ${input:task:Describe the ServiceNow feature or change}.',
                '',
                'Before delegating, read `.vscode/nowdev-ai-config.json` for project context. Have each specialist end its response with a "Files Touched" list and carry that list into subsequent delegation prompts. Do not require Copilot memory.',
                '',
                'Clarify only what cannot be discovered from workspace files, ServiceNow SDK config, instance queries, selected guidelines, or configured docs.',
                '',
            ].join('\n'),
        },
        {
            filename: 'nowdev-review.prompt.md',
            content: [
                '---',
                "name: 'nowdev-review'",
                "description: 'Review current NowDev workspace changes against the files touched this session.'",
                "argument-hint: '<optional focus area>'",
                "agent: 'NowDev-AI-Fluent-Reviewer'",
                '---',
                '',
                'Review the current workspace changes. Read `.vscode/nowdev-ai-config.json` for project context, then read the actual source files referenced in the session\'s "Files Touched" handoff lists — never trust a claimed export without reading the file.',
                '',
                'Focus on correctness, missing dependencies, ServiceNow API misuse, security, deployment risk, and missing ATF coverage. Report findings first, ordered by severity.',
                '',
            ].join('\n'),
        },
        {
            filename: 'nowdev-compact.prompt.md',
            content: [
                '---',
                "name: 'nowdev-compact'",
                "description: 'Prepare a compact handoff summary anchored to files touched this session.'",
                "argument-hint: '<optional handoff notes>'",
                "agent: 'NowDev AI Agent'",
                '---',
                '',
                'Prepare a compact handoff summary for this NowDev AI session. Anchor the summary to `.vscode/nowdev-ai-config.json` for project context and the "Files Touched" lists returned by each specialist.',
                '',
                'Include files changed with their purpose and key exports, dependencies between them, validation results, unresolved decisions, and the next concrete action. Keep memory optional and do not rely on it as the source of truth.',
                '',
            ].join('\n'),
        },
    ];
}
