/**
 * Plugin Integration
 *
 * Industrial-grade plugin system extending the existing Integration architecture.
 * Plugins are integrations that can provide MCP servers, skills, and capabilities.
 *
 * Features:
 * - Lifecycle management with state machine
 * - Security sandboxing and permission system
 * - Dependency resolution and validation
 * - Semantic version compatibility checking
 * - Resource limits and quotas
 * - Comprehensive observability with metrics
 * - Graceful shutdown with retry logic
 * - Plugin isolation with process spawning
 *
 * @version 1.1.0
 */
import { BaseIntegration, type IntegrationConfig, type HealthResult } from "../base/index.js";
/**
 * Plugin types matching the plugin architecture spec
 */
export declare enum PluginType {
    MCP_SERVER = "mcp-server",
    SKILL = "skill",
    INTEGRATION = "integration",
    AGENT = "agent"
}
/**
 * Plugin lifecycle states
 */
export declare enum PluginState {
    UNINSTALLED = "uninstalled",
    INSTALLED = "installed",
    ENABLED = "enabled",
    ACTIVE = "active",
    ERROR = "error",
    DISABLING = "disabling",
    ENABLING = "enabling"
}
/**
 * Plugin configuration
 */
export interface PluginConfig extends IntegrationConfig {
    type: PluginType;
    autoStart: boolean;
    config?: Record<string, unknown>;
    resourceLimits?: PluginResourceLimits;
    permissions?: PluginPermissions;
}
/**
 * Resource limits for plugin
 */
export interface PluginResourceLimits {
    maxMemoryMB?: number;
    maxCpuPercent?: number;
    maxProcessTime?: number;
    maxFileDescriptors?: number;
}
/**
 * Plugin permissions
 */
export interface PluginPermissions {
    allowedPaths?: string[];
    allowedCommands?: string[];
    networkAccess?: boolean;
    filesystemAccess?: boolean;
    envWhitelist?: string[];
}
/**
 * Plugin manifest (from plugin.yaml)
 */
export interface PluginManifest {
    name: string;
    version: string;
    type: PluginType;
    description: string;
    license?: string | undefined;
    author?: string | undefined;
    homepage?: string | undefined;
    repository?: string | undefined;
    minStringrayVersion?: string | undefined;
    runtime?: {
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        timeout?: number | undefined;
        workingDir?: string | undefined;
    } | undefined;
    tools?: Array<{
        name: string;
        description: string;
        inputSchema?: object | undefined;
        outputSchema?: object | undefined;
    }> | undefined;
    capabilities?: string[] | undefined;
    dependencies?: Record<string, string> | undefined;
    optionalDependencies?: Record<string, string> | undefined;
    routing?: Array<{
        keywords: string[];
        skill: string;
        agent: string;
        confidence: number;
    }> | undefined;
    resourceLimits?: PluginResourceLimits | undefined;
    permissions?: PluginPermissions | undefined;
}
/**
 * Plugin routing mapping for enforcer
 */
export interface PluginRoutingMapping {
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
}
/**
 * Plugin metrics for observability
 */
export interface PluginMetrics {
    name: string;
    uptime: number;
    totalRestarts: number;
    lastStartTime: number;
    lastError?: string | undefined;
    memoryUsageMB?: number | undefined;
    cpuUsagePercent?: number | undefined;
    toolCallsCount: number;
    errorsCount: number;
}
/**
 * Validation result for plugin
 */
export interface PluginValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Default plugin configuration
 */
export declare const DEFAULT_PLUGIN_CONFIG: PluginConfig;
/**
 * Parse YAML manifest (shared utility)
 */
export declare function parseYamlManifest(content: string): Record<string, unknown>;
/**
 * Semantic version comparison
 */
export declare function satisfiesVersion(version: string, range: string): boolean;
/**
 * Validate plugin manifest
 */
export declare function validatePluginManifest(manifest: PluginManifest): PluginValidationResult;
/**
 * Plugin Integration Class
 *
 * Extends BaseIntegration to leverage existing:
 * - Lifecycle management (initialize/shutdown)
 * - Configuration handling
 * - Event emission
 * - Health checking
 * - Logging
 */
export declare class PluginIntegration extends BaseIntegration {
    private manifest;
    private childProcess;
    private pluginPath;
    private pluginType;
    private autoStart;
    private pluginState;
    private restarts;
    private lastStartTime;
    private lastError?;
    private toolCallsCount;
    private errorsCount;
    private resourceLimits;
    private permissions;
    constructor(name: string, version: string, pluginPath: string, type?: PluginType, config?: Partial<PluginConfig>);
    /**
     * Load plugin from plugin.yaml
     */
    load(): Promise<PluginManifest>;
    /**
     * Initialize the plugin
     */
    protected performInitialization(): Promise<void>;
    /**
     * Shutdown the plugin
     */
    protected performShutdown(): Promise<void>;
    /**
     * Health check implementation
     */
    protected performHealthCheck(): Promise<HealthResult>;
    /**
     * Get plugin uptime in milliseconds
     */
    getUptime(): number;
    /**
     * Start the MCP server process
     */
    startPlugin(): Promise<void>;
    /**
     * Stop the MCP server process gracefully
     */
    stopPlugin(): Promise<void>;
    /**
     * Enable the plugin
     */
    enable(): Promise<void>;
    /**
     * Disable the plugin
     */
    disable(): Promise<void>;
    /**
     * Restart the plugin
     */
    restart(): Promise<void>;
    /**
     * Get MCP server configuration (if type is MCP_SERVER)
     */
    getMcpServerConfig(): {
        serverName: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
        timeout?: number;
    } | null;
    /**
     * Get tools provided by this plugin
     */
    getTools(): Array<{
        name: string;
        description: string;
    }>;
    /**
     * Record a tool call
     */
    recordToolCall(): void;
    /**
     * Get capabilities
     */
    getCapabilities(): string[];
    /**
     * Get routing mappings for this plugin
     */
    getRoutingMappings(): PluginRoutingMapping[];
    /**
     * Set auto-start preference
     */
    setAutoStart(autoStart: boolean): void;
    /**
     * Get plugin type
     */
    getPluginType(): PluginType;
    /**
     * Get plugin state
     */
    getPluginState(): PluginState;
    /**
     * Get manifest
     */
    getManifest(): PluginManifest | null;
    /**
     * Check if plugin is enabled
     */
    isEnabled(): boolean;
    /**
     * Get resource limits
     */
    getResourceLimits(): PluginResourceLimits;
    /**
     * Get permissions
     */
    getPermissions(): PluginPermissions;
    /**
     * Get comprehensive metrics
     */
    getMetrics(): PluginMetrics;
    /**
     * Get dependencies
     */
    getDependencies(): Record<string, string>;
    /**
     * Get optional dependencies
     */
    getOptionalDependencies(): Record<string, string>;
}
//# sourceMappingURL=plugin-integration.d.ts.map