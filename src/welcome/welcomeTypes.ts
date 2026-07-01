export interface SdkCommandStatus {
    ok: boolean;
    timestamp: string;
    message: string;
}

export interface InstallInfoState {
    loading: boolean;
    ok: boolean;
    output: string;
    timestamp: string;
}

export interface ConnectionState {
    checking: boolean;
    reachable: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    timestamp: string;
}

export interface CheckChangesState {
    checking: boolean;
    ok: boolean;
    count: number;
    output?: string;
    error?: string;
    timestamp: string;
}

export interface AvailableAgentModel {
    label: string;
    value: string;
}

export type PrerequisiteStatusKind = 'enabled' | 'disabled-by-user' | 'disabled-by-policy' | 'unknown';

export interface PrerequisiteStatus {
    id: string;
    label: string;
    setting: string;
    ok: boolean;
    status: PrerequisiteStatusKind;
    fixable: boolean;
    managedByPolicy: boolean;
    preview?: boolean;
    optional?: boolean;
    message: string;
}

export interface RequiredSetting {
    section: string;
    prop: string;
    expected: unknown;
    label: string;
    preview?: boolean;
    optional?: boolean;
}

export type InspectWithPolicy = { policyValue?: unknown };
