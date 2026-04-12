/**
 * Server Configuration Registry - Plugin Extension
 *
 * Extends ServerConfigRegistry with plugin support for Phase 2.
 * Enables automatic MCP server registration from plugins.
 *
 * @version 1.2.0
 */
import { ServerConfigRegistry } from "./server-config-registry.js";
import { IServerConfig } from "../types/mcp.types.js";
import type { PluginIntegration } from "../../integrations/plugins/plugin-integration.js";
import type { PluginRegistry } from "../../integrations/plugins/plugin-registry.js";
/**
 * Plugin server configuration
 */
export interface PluginServerConfig extends IServerConfig {
    pluginName: string;
    pluginVersion: string;
    autoReload?: boolean;
    capabilities?: string[];
}
/**
 * Plugin server registration options
 */
export interface PluginServerRegistrationOptions {
    registry?: ServerConfigRegistry;
    autoRegister?: boolean;
    overwrite?: boolean;
}
/**
 * ServerConfigRegistry with plugin support
 */
export declare class PluginServerConfigRegistry {
    private registry;
    private registeredPluginServers;
    private pluginRegistryRef?;
    constructor(registry?: ServerConfigRegistry);
    /**
     * Set the plugin registry reference for dynamic updates
     */
    setPluginRegistry(registry: PluginRegistry): void;
    /**
     * Get the plugin registry reference
     */
    getPluginRegistry(): PluginRegistry | undefined;
    /**
     * Register a plugin's MCP server configuration
     */
    registerPluginServer(plugin: PluginIntegration, options?: PluginServerRegistrationOptions): boolean;
    /**
     * Register all MCP server plugins from a plugin registry
     */
    registerAllPluginServers(pluginRegistry: PluginRegistry, options?: PluginServerRegistrationOptions): number;
    /**
     * Get a server configuration by name
     */
    get(serverName: string): IServerConfig | undefined;
    /**
     * Check if a server configuration exists
     */
    has(serverName: string): boolean;
    /**
     * Get all registered server configurations
     */
    getAll(): IServerConfig[];
    /**
     * Get all registered server names
     */
    getServerNames(): string[];
    /**
     * Get plugin server configuration by server name
     */
    getPluginServer(serverName: string): PluginServerConfig | undefined;
    /**
     * Get all registered plugin servers
     */
    getAllPluginServers(): PluginServerConfig[];
    /**
     * Check if a server is from a plugin
     */
    isPluginServer(serverName: string): boolean;
    /**
     * Unregister a plugin server
     */
    unregisterPluginServer(serverName: string): boolean;
    /**
     * Get servers by capability
     */
    getServersByCapability(capability: string): PluginServerConfig[];
    /**
     * Get registry statistics
     */
    getRegistryStats(): {
        totalServers: number;
        defaultServers: number;
        pluginServers: number;
        pluginServerDetails: Array<{
            name: string;
            plugin: string;
            version: string;
        }>;
    };
    /**
     * Clear all plugin server registrations (keep default servers)
     */
    clearPluginServers(): number;
    /**
     * Register a server configuration
     */
    register(config: IServerConfig): void;
    /**
     * Clear all registrations
     */
    clear(): void;
    /**
     * Create dynamic config for unknown server
     */
    createDynamicConfig(serverName: string): IServerConfig;
}
/**
 * Default singleton instance
 */
export declare const defaultPluginServerRegistry: PluginServerConfigRegistry;
/**
 * Create a new PluginServerConfigRegistry
 */
export declare function createPluginServerRegistry(baseRegistry?: ServerConfigRegistry): PluginServerConfigRegistry;
//# sourceMappingURL=plugin-server-registry.d.ts.map