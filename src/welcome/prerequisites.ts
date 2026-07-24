import * as vscode from 'vscode';
import { PrerequisiteStatus, PrerequisiteStatusKind, RequiredSetting, InspectWithPolicy } from './welcomeTypes';

/** Tracks and fixes the small set of VS Code / Copilot Chat settings this extension depends on. */
export class PrerequisiteChecker {
    private policyBlockedSettings = new Set<string>();

    getRequiredSettings(): Record<string, RequiredSetting> {
        return {
            subAgents: { section: 'chat.subagents', prop: 'allowInvocationsFromSubagents', expected: true, label: 'Sub-agent invocations' },
            memory: { section: 'github.copilot.chat.tools.memory', prop: 'enabled', expected: true, label: 'Memory tool', preview: true, optional: true },
            customAgentHooks: { section: 'chat', prop: 'useCustomAgentHooks', expected: true, label: 'Agent-scoped hooks', preview: true, optional: true },
            browserTools: { section: 'workbench.browser', prop: 'enableChatTools', expected: true, label: 'Browser tools' },
        };
    }

    getStatuses(): Record<string, PrerequisiteStatus> {
        const statuses: Record<string, PrerequisiteStatus> = {};
        for (const [id, setting] of Object.entries(this.getRequiredSettings())) {
            statuses[id] = this.getStatus(id, setting);
        }
        return statuses;
    }

    getStatus(id: string, setting: RequiredSetting): PrerequisiteStatus {
        const config = vscode.workspace.getConfiguration(setting.section);
        const actual = config.get(setting.prop);
        const ok = actual === setting.expected;
        const inspect = config.inspect(setting.prop) as InspectWithPolicy | undefined;
        const managedByPolicy = this.policyBlockedSettings.has(id) || (inspect?.policyValue !== undefined && inspect.policyValue !== setting.expected);
        const status: PrerequisiteStatusKind = ok ? 'enabled' : managedByPolicy ? 'disabled-by-policy' : actual === undefined ? 'unknown' : 'disabled-by-user';
        const fixable = !setting.optional && !ok && !managedByPolicy;
        const message = ok
            ? setting.optional ? 'Available.' : 'Configured.'
            : managedByPolicy
                ? 'Disabled or managed by your organization or administrator.'
                : setting.optional
                    ? 'Optional preview capability; the toolbox works without it.'
                    : 'Can be enabled automatically for this user.';

        return {
            id,
            label: setting.label,
            setting: `${setting.section}.${setting.prop}`,
            ok,
            status,
            fixable,
            managedByPolicy,
            preview: setting.preview,
            optional: setting.optional,
            message,
        };
    }

    async fixSetting(key: string): Promise<void> {
        const setting = this.getRequiredSettings()[key];
        if (!setting) { return; }

        const status = this.getStatus(key, setting);
        if (!status.fixable) {
            if (status.managedByPolicy) {
                vscode.window.showInformationMessage(`${status.label} is disabled by your organization or administrator.`);
            }
            return;
        }

        const config = vscode.workspace.getConfiguration(setting.section);
        try {
            await config.update(setting.prop, setting.expected, vscode.ConfigurationTarget.Global);
        } catch (error) {
            this.policyBlockedSettings.add(key);
            console.warn(`NowDev AI Toolbox could not update ${status.setting}; it may be managed by policy.`, error);
        }
    }

    async fixAllSettings(): Promise<void> {
        for (const key of Object.keys(this.getRequiredSettings())) {
            const setting = this.getRequiredSettings()[key];
            const status = this.getStatus(key, setting);
            if (status.fixable) {
                await this.fixSetting(key);
            }
        }
    }
}
