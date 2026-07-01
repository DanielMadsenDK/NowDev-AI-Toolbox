import { WorkspaceAgentSyncConfig } from './types';

export function buildWorkspaceInstructionsContent(cfg: Pick<WorkspaceAgentSyncConfig, 'activeProfileId' | 'profileInstructions' | 'customInstructions' | 'agentGuidelines'>): string {
    const blocks = [
        '# NowDev AI Workspace Instructions',
        '',
        'These generated instructions make NowDev AI project context available in Copilot contexts outside the bundled agent files.',
        '',
        '## Artifact State',
        '',
        '- Use `.vscode/nowdev-ai-config.json` to find `artifactState.path`.',
        '- Treat `.vscode/nowdev-ai-session/artifacts.json` as the workspace source of truth for session artifacts.',
        '- Do not require Copilot memory for artifact tracking; memory may be unavailable or disabled by organization policy.',
        '- When handing work back to a coordinator, include an `Artifact Manifest` JSON block for created or modified artifacts.',
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

    return ['---', "name: 'NowDev AI Workspace Context'", "description: 'Workspace-wide NowDev AI conventions, artifact state protocol, and selected guidelines.'", "applyTo: '**/*'", '---', '', ...blocks, ''].join('\n');
}

export function buildWorkspacePrompts(): Array<{ filename: string; content: string }> {
    return [
        {
            filename: 'nowdev-start.prompt.md',
            content: [
                '---',
                "name: 'nowdev-start'",
                "description: 'Start a NowDev AI implementation session with artifact-state setup and routing.'",
                "argument-hint: '<feature or task description>'",
                "agent: 'NowDev AI Agent'",
                '---',
                '',
                'Start a NowDev AI implementation session for: ${input:task:Describe the ServiceNow feature or change}.',
                '',
                'Before delegating, read `.vscode/nowdev-ai-config.json`, initialize or read `artifactState.path`, and use the workspace-backed artifact state as the source of truth. Do not require Copilot memory.',
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
                "description: 'Review current NowDev artifacts against the workspace artifact state.'",
                "argument-hint: '<optional focus area>'",
                "agent: 'NowDev-AI-Fluent-Reviewer'",
                '---',
                '',
                'Review the current workspace changes and artifact state. Read `.vscode/nowdev-ai-config.json`, then read `artifactState.path` and the source files referenced by each artifact.',
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
                "description: 'Prepare a compact handoff summary anchored to artifact state.'",
                "argument-hint: '<optional handoff notes>'",
                "agent: 'NowDev AI Agent'",
                '---',
                '',
                'Prepare a compact handoff summary for this NowDev AI session. Anchor the summary to `.vscode/nowdev-ai-config.json` and `artifactState.path`.',
                '',
                'Include active artifacts, completed artifacts, dependencies, files changed, validation results, unresolved decisions, and the next concrete action. Keep memory optional and do not rely on it as the source of truth.',
                '',
            ].join('\n'),
        },
    ];
}
