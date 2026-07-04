import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WelcomeViewProvider } from './WelcomeViewProvider';
import { showAgentTopologyPanel } from './AgentTopologyPanel';
import { mergeArtifactManifestContent } from './ArtifactStateManager';
import { getWorkspaceFolder, getArtifactStatePath, ensureGitignoreEntry } from './extensionUtils';
import {
    buildArtifactHookManifest,
    buildArtifactMergeHookScript,
    buildArtifactMergeShellWrapper,
    buildArtifactMergePowerShellWrapper,
    executeIfAvailable,
    executeFirstAvailable,
} from './artifactHook';
import { registerInitFluentProject } from './commands/initFluentProject';
import { registerSdkCommands } from './commands/sdkCommands';

// ?? Extension activation ???????????????????????????????????????????????????

export function activate(context: vscode.ExtensionContext) {
    // Ensure sensitive/generated workspace files are listed in .gitignore
    ensureGitignoreEntry('.vscode/nowdev-ai-config.json');
    ensureGitignoreEntry('.vscode/nowdev-ai-session/');
    // Register the sidebar welcome webview
    const welcomeProvider = new WelcomeViewProvider(context.extensionUri);

    // Scan for available tools/environment on activation (async; never blocks activation)
    void welcomeProvider.scanTools();
    welcomeProvider.scanMcp();
    welcomeProvider.loadAgentRegistry();

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(WelcomeViewProvider.viewType, welcomeProvider, {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('nowdev-ai-toolbox.openCopilotChat', () => {
            vscode.commands.executeCommand('workbench.action.chat.open');
            vscode.window.setStatusBarMessage('Select NowDev AI Agent from the chat agent picker.', 5000);
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'nowdev-ai-toolbox');
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.collectCopilotDiagnostics', async () => {
            await executeIfAvailable(
                'github.copilot.debug.collectDiagnostics',
                'Collect Diagnostics is not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.showCopilotChatLogs', async () => {
            await executeIfAvailable(
                'github.copilot.debug.showChatLogView',
                'Chat logs are not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.openAgentCustomizations', async () => {
            await executeFirstAvailable(
                ['workbench.action.chat.openCustomizations', 'github.copilot.chat.openCustomizations'],
                'The Agent Customizations editor is not available in this VS Code + Copilot Chat build.'
            );
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.refreshStatus', () => {
            welcomeProvider.refreshStatus();
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.showAgentTopology', () => {
            showAgentTopologyPanel(welcomeProvider.getAgentManifests(), welcomeProvider.getAgentOverrides());
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.mergeArtifactManifest', async () => {
            const workspaceRoot = getWorkspaceFolder();
            if (!workspaceRoot) {
                vscode.window.showWarningMessage('Open a workspace before merging an Artifact Manifest.');
                return;
            }
            const artifactStatePath = getArtifactStatePath(workspaceRoot);
            if (!artifactStatePath) {
                vscode.window.showWarningMessage('Artifact state path is not valid. Check .vscode/nowdev-ai-config.json.');
                return;
            }
            const clipboard = (await vscode.env.clipboard.readText()).trim();
            const input = clipboard.includes('Artifact Manifest')
                ? clipboard
                : await vscode.window.showInputBox({
                    title: 'Merge Artifact Manifest',
                    prompt: 'Paste an agent response containing an Artifact Manifest JSON block.',
                    ignoreFocusOut: true,
                });
            if (!input) { return; }
            const result = mergeArtifactManifestContent(artifactStatePath, input);
            welcomeProvider.refreshStatus();
            if (result.merged > 0) {
                vscode.window.showInformationMessage(`Merged ${result.merged} artifact${result.merged === 1 ? '' : 's'} into the session artifact state.`);
            } else {
                vscode.window.showWarningMessage('No Artifact Manifest blocks were found to merge.');
            }
        }),
        vscode.commands.registerCommand('nowdev-ai-toolbox.createHookTemplates', async () => {
            const workspaceRoot = getWorkspaceFolder();
            if (!workspaceRoot) {
                vscode.window.showWarningMessage('Open a workspace before creating hook templates.');
                return;
            }
            const hooksDir = path.join(workspaceRoot, '.github', 'hooks');
            const scriptsDir = path.join(workspaceRoot, '.vscode', 'nowdev-ai-hooks');
            fs.mkdirSync(hooksDir, { recursive: true });
            fs.mkdirSync(scriptsDir, { recursive: true });
            const hookPath = path.join(hooksDir, 'nowdev-artifact-state.json');
            const jsScriptPath = path.join(scriptsDir, 'merge-artifact-manifest.js');
            const shScriptPath = path.join(scriptsDir, 'merge-artifact-manifest.sh');
            const psScriptPath = path.join(scriptsDir, 'merge-artifact-manifest.ps1');
            if (!fs.existsSync(hookPath)) {
                fs.writeFileSync(hookPath, buildArtifactHookManifest(), 'utf-8');
            }
            if (!fs.existsSync(jsScriptPath)) {
                fs.writeFileSync(jsScriptPath, buildArtifactMergeHookScript(), 'utf-8');
                fs.chmodSync(jsScriptPath, 0o755);
            }
            if (!fs.existsSync(shScriptPath)) {
                fs.writeFileSync(shScriptPath, buildArtifactMergeShellWrapper(), 'utf-8');
                fs.chmodSync(shScriptPath, 0o755);
            }
            if (!fs.existsSync(psScriptPath)) {
                fs.writeFileSync(psScriptPath, buildArtifactMergePowerShellWrapper(), 'utf-8');
            }
            ensureGitignoreEntry('.vscode/nowdev-ai-hooks/');
            vscode.window.showInformationMessage('Created optional hook templates. Review them before enabling or relying on Preview hooks.');
        }),
    );

    registerInitFluentProject(context, welcomeProvider);
    registerSdkCommands(context, welcomeProvider);

    // Enable agentic browser tools (v1.110+)
    const browserConfig = vscode.workspace.getConfiguration('workbench.browser');
    const chatToolsEnabled = browserConfig.get<boolean>('enableChatTools');

    if (chatToolsEnabled !== true) {
        browserConfig.update('enableChatTools', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled workbench.browser.enableChatTools setting');
        }, (error: any) => {
            console.error('Failed to enable workbench.browser.enableChatTools:', error);
        });
    }

    // Enable sub-agent invocations from sub-agents (required for multi-tier agent routing)
    const subagentsConfig = vscode.workspace.getConfiguration('chat.subagents');
    const subagentsEnabled = subagentsConfig.get<boolean>('allowInvocationsFromSubagents');

    if (subagentsEnabled !== true) {
        subagentsConfig.update('allowInvocationsFromSubagents', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled chat.subagents.allowInvocationsFromSubagents setting');
        }, (error: any) => {
            console.error('Failed to enable chat.subagents.allowInvocationsFromSubagents:', error);
        });
    }

    // Memory is preview and may be disabled by organization policy. The sidebar
    // reports availability and offers enablement only when VS Code allows it.

    // Enable dedicated skill context isolation (v1.118+) — prevents skill content flooding main agent context
    const skillToolConfig = vscode.workspace.getConfiguration('github.copilot.chat');
    if (skillToolConfig.get<boolean>('skillTool.enabled') !== true) {
        skillToolConfig.update('skillTool.enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.skillTool.enabled');
        }, (error: any) => {
            console.error('Failed to enable skillTool:', error);
        });
    }

    // Enable background todo agent (v1.119+) — offloads todo tracking from main model in multi-tier sessions
    const todoAgentConfig = vscode.workspace.getConfiguration('github.copilot.chat.agent');
    if (todoAgentConfig.get<boolean>('backgroundTodoAgent.enabled') !== true) {
        todoAgentConfig.update('backgroundTodoAgent.enabled', true, vscode.ConfigurationTarget.Global).then(() => {
            console.log('Enabled github.copilot.chat.agent.backgroundTodoAgent.enabled');
        }, (error: any) => {
            console.error('Failed to enable backgroundTodoAgent:', error);
        });
    }

    // Agents are delivered as generated .github/agents/*.agent.md files, synced
    // by WorkspaceAgentManager via the welcome view — no registration step here.

}

export function deactivate() {}
