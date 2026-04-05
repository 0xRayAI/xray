/**
 * Server Configuration Registry
 *
 * Manages server configurations with support for default servers
 * and runtime configuration registration.
 *
 * Extracted from mcp-client.ts as part of Phase 2 refactoring.
 */
import { IServerConfig } from '../types/index.js';
/**
 * Registry for managing MCP server configurations
 */
export declare class ServerConfigRegistry {
    private configs;
    constructor();
    /**
     * Register all default server configurations
     */
    private registerDefaultConfigs;
    /**
     * Register a new server configuration
     */
    register(config: IServerConfig): void;
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
     * Clear all registered configurations
     */
    clear(): void;
    /**
     * Create a dynamic configuration for an unknown server
     * Uses the knowledge-skills directory as default location
     */
    createDynamicConfig(serverName: string): IServerConfig;
}
/**
 * Default singleton instance of the server config registry
 */
export declare const defaultServerRegistry: ServerConfigRegistry;
//# sourceMappingURL=server-config-registry.d.ts.map