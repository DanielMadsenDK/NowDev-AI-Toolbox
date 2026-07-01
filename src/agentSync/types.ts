export interface AgentOverride {
    enabled: boolean;        // false → file not written to workspace
    disabledTools: string[]; // tools to strip from the base list
    model?: string;          // qualified model name for the generated agent file
}

export interface McpIntegrationConfig {
    /** 'all' injects servername/*, 'custom' injects only the listed methods */
    mode: 'all' | 'custom';
    allowedMethods?: string[];
}

/** Unified documentation source configuration for a single documentation category. */
export interface DocSource {
    /** How this category's docs are accessed. */
    sourceType: 'llms-txt' | 'mcp' | 'none';
    // llms-txt fields
    llmsUrl?: string;
    llmsMode?: 'remote' | 'local'; // meaningful only for productDocs
    localPath?: string;            // resolved at runtime from global VS Code setting + release
    lastSynced?: string;           // ISO timestamp
    // mcp fields
    mcpServer?: string;
    mcpLibraryHint?: string;
}

export interface AllDocSources {
    /** ServiceNow platform docs (release-specific). Also used for general reference by orchestration agents. */
    productDocs: DocSource & { release?: string };
    /** ServiceNow SDK / Fluent SDK docs. */
    sdkDocs: DocSource;
    /** Classic scripting API docs (GlideRecord, Business Rules, Client Scripts, …). */
    classicScripting: DocSource;
}

export const DEFAULT_ALL_DOC_SOURCES: AllDocSources = {
    productDocs:      { sourceType: 'llms-txt', llmsMode: 'remote', llmsUrl: 'https://www.servicenow.com/llms.txt', release: '', mcpLibraryHint: '' },
    sdkDocs:          { sourceType: 'llms-txt', llmsUrl: 'https://servicenow.github.io/sdk/llms.txt',              mcpLibraryHint: '' },
    classicScripting: { sourceType: 'none',     llmsUrl: 'https://www.servicenow.com/llms.txt',                    mcpLibraryHint: '' },
};

export interface GuidelineArticleRef {
    sysId: string;
    number?: string;
    title: string;
    state?: string;
    updatedOn?: string;
}

export interface GuidelinesConfig {
    enabled: boolean;
    instanceAlias?: string;
    selectedArticles: GuidelineArticleRef[];
    lastSynced?: string;
}

/**
 * Work-item / DevOps integration (Azure DevOps, Jira, etc.). The workflow is
 * driven entirely by an MCP server and folded into the orchestrator — there is
 * no dedicated agent. When enabled, the chosen MCP server's tools are injected
 * into the orchestrator and a task-tracking mandate is added to its body so it
 * proactively reads task details, posts progress comments, and updates status.
 */
export interface DevOpsConfig {
    /** Whether the work-item integration workflow is enabled */
    enabled: boolean;
    /** MCP server name providing work-item tools, injected into the orchestrator */
    mcpServer: string;
    /** Resolved custom instructions text describing task structure, naming, and status values */
    customInstructions: string;
}

export const DEFAULT_DEVOPS_CONFIG: DevOpsConfig = {
    enabled: false,
    mcpServer: '',
    customInstructions: '',
};

// Newest first; supplemented at runtime by GitHub API fetch
export const SERVICENOW_RELEASES: string[] = [
    'Yokohama', 'Xanadu', 'Washington DC', 'Vancouver', 'Utah',
    'Tokyo', 'San Diego', 'Rome', 'Quebec', 'Paris',
];

export interface WorkspaceAgentSyncConfig {
    mcpIntegrations: string[];
    mcpIntegrationConfigs?: Record<string, McpIntegrationConfig>;
    agentOverrides: Record<string, AgentOverride>;
    allDocSources: AllDocSources;
    autoUpdate: boolean;
    /** Work-item / DevOps integration driven by an MCP server, folded into the orchestrator. */
    devopsConfig?: DevOpsConfig;
    /** Agent names suppressed by the active profile — not written and hidden from the Agents tab. */
    profileSuppressedAgents?: ReadonlySet<string>;
    /** Text injected at {{PROFILE_INSTRUCTIONS}} in agent bodies. Empty string removes the token. */
    profileInstructions?: string;
    /** Workspace/user guideline text loaded from the configured custom instructions file. */
    customInstructions?: string;
    /** Instance-backed guideline references resolved from .vscode/nowdev-ai-config.json. */
    agentGuidelines?: string;
    /** Stored in the state hash so profile switches trigger file regeneration. */
    activeProfileId?: string;
}
