/**
 * Configuration Loader
 *
 * Loads MCP server configurations from various sources including
 * JSON configuration files.
 *
 * Extracted from mcp-client.ts as part of Phase 2 refactoring.
 */
import { IServerConfig } from '../types/index.js';
/**
 * Result of a configuration load operation
 */
export interface ConfigLoadResult {
    success: boolean;
    configs?: IServerConfig[];
    error?: string;
}
/**
 * Loads MCP server configurations from files
 */
export declare class ConfigLoader {
    private configPaths;
    /**
     * Load configurations from available config files
     * Returns empty array if no config file exists (this is valid)
     */
    load(): Promise<ConfigLoadResult>;
    /**
     * Add a custom config path to search
     */
    addConfigPath(configPath: string): void;
    /**
     * Get all configured config paths
     */
    getConfigPaths(): string[];
    /**
     * Reset config paths to defaults
     */
    resetConfigPaths(): void;
    /**
     * Load configuration from a specific file path
     */
    loadFromPath(filePath: string): Promise<ConfigLoadResult>;
    /**
     * Check if any config file exists
     */
    hasConfigFile(): boolean;
}
/**
 * Default singleton instance of the config loader
 */
export declare const defaultConfigLoader: ConfigLoader;
//# sourceMappingURL=config-loader.d.ts.map