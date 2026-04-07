/**
 * Plugin Registry
 *
 * Industrial-grade plugin registry for managing StringRay plugins.
 * Provides discovery, loading, lifecycle management, dependency resolution,
 * and comprehensive observability.
 *
 * Features:
 * - Auto-discovery from filesystem
 * - Dependency resolution and validation
 * - Plugin state management
 * - Batch operations with error recovery
 * - Comprehensive health monitoring
 * - Metrics aggregation
 * - Event-driven architecture
 *
 * @version 1.1.0
 */
import { EventEmitter } from "events";
import { IntegrationRegistry } from "../base/registry.js";
import { PluginIntegration, PluginRoutingMapping, PluginType, PluginState } from "./plugin-integration.js";
export interface PluginRegistryConfig {
    pluginsDir: string;
    configPath?: string;
    autoStart?: boolean;
    enableMetrics?: boolean;
    maxRestarts?: number;
    restartDelayMs?: number;
}
export interface PluginLoadResult {
    name: string;
    success: boolean;
    error?: string;
    plugin?: PluginIntegration;
}
export interface PluginStatus {
    name: string;
    type: string;
    version: string;
    state: PluginState;
    enabled: boolean;
    healthy: boolean;
    uptime: number;
    restarts: number;
}
export interface RegistryMetrics {
    totalPlugins: number;
    activePlugins: number;
    enabledPlugins: number;
    errorPlugins: number;
    totalToolCalls: number;
    totalErrors: number;
    pluginsByType: Record<string, number>;
}
export interface DependencyInfo {
    name: string;
    version: string;
    satisfied: boolean;
    optional: boolean;
}
/**
 * Plugin Registry Events
 */
export type PluginRegistryEventType = "plugin-loaded" | "plugin-unloaded" | "plugin-enabled" | "plugin-disabled" | "plugin-reloaded" | "plugin-error" | "discovery-complete" | "dependency-resolved" | "dependency-missing" | "metrics-updated" | "error";
export interface PluginRegistryEvent {
    type: PluginRegistryEventType;
    timestamp: number;
    pluginName?: string | undefined;
    data?: Record<string, unknown> | undefined;
    error?: Error | undefined;
}
/**
 * Plugin Registry
 *
 * Manages plugins as integrations, leveraging:
 * - IntegrationRegistry for lifecycle management
 * - ServerConfigRegistry for MCP server registration
 * - Enforcer routing for skill mappings
 */
export declare class PluginRegistry extends EventEmitter {
    private pluginsDir;
    private configPath;
    private autoStart;
    private enableMetrics;
    private enableHotReload;
    private maxRestarts;
    private restartDelayMs;
    private plugins;
    private integrationRegistry;
    private initialized;
    private metricsInterval?;
    private watcher?;
    private reloadDebounce;
    constructor(config?: Partial<PluginRegistryConfig & {
        enableHotReload?: boolean;
    }>);
    /**
     * Initialize the registry and discover plugins
     */
    initialize(): Promise<void>;
    /**
     * Ensure required directories exist
     */
    private ensureDirectories;
    /**
     * Discover and load plugins from plugins directory
     */
    private discoverPlugins;
    /**
     * Validate plugin dependencies
     */
    private validateDependencies;
    /**
     * Load a single plugin
     */
    loadPlugin(name: string): Promise<PluginIntegration | null>;
    /**
     * Parse plugin type from string
     */
    private parsePluginType;
    /**
     * Unload a plugin
     */
    unloadPlugin(name: string): Promise<boolean>;
    /**
     * Enable a plugin
     */
    enablePlugin(name: string): Promise<boolean>;
    /**
     * Disable a plugin
     */
    disablePlugin(name: string): Promise<boolean>;
    /**
     * Restart a plugin
     */
    restartPlugin(name: string): Promise<boolean>;
    /**
     * Get a plugin by name
     */
    getPlugin(name: string): PluginIntegration | undefined;
    /**
     * Get all plugins
     */
    getAllPlugins(): PluginIntegration[];
    /**
     * Get plugins by type
     */
    getPluginsByType(type: PluginType): PluginIntegration[];
    /**
     * Get plugins by state
     */
    getPluginsByState(state: PluginState): PluginIntegration[];
    /**
     * Get active MCP server configurations
     */
    getMcpServerConfigs(): Array<{
        serverName: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
        timeout?: number;
    }>;
    /**
     * Get all routing mappings from plugins
     */
    getAllRoutingMappings(): PluginRoutingMapping[];
    /**
     * Get all tools from plugins
     */
    getAllTools(): Array<{
        name: string;
        description: string;
        plugin: string;
    }>;
    /**
     * Health check all plugins
     */
    healthCheckAll(): Promise<Record<string, {
        healthy: boolean;
        message: string;
        details?: Record<string, unknown>;
    }>>;
    /**
     * Get aggregated metrics
     */
    getMetrics(): RegistryMetrics;
    /**
     * Start metrics collection interval
     */
    private startMetricsCollection;
    /**
     * Start file watcher for hot-reload
     */
    private startFileWatcher;
    /**
     * Debounce plugin reload to avoid multiple reloads during file writes
     */
    private debounceReload;
    /**
     * Hot-reload a single plugin
     */
    private hotReloadPlugin;
    /**
     * Shutdown all plugins
     */
    shutdown(): Promise<void>;
    /**
     * Get status summary
     */
    getStatus(): {
        initialized: boolean;
        pluginCount: number;
        plugins: PluginStatus[];
        metrics: RegistryMetrics;
    };
    /**
     * Get the underlying IntegrationRegistry
     */
    getIntegrationRegistry(): IntegrationRegistry;
    /**
     * Emit a registry event
     */
    private emitEvent;
}
//# sourceMappingURL=plugin-registry.d.ts.map