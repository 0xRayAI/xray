/**
 * OpenClaw Configuration Loader
 *
 * Handles loading, validation, and management of OpenClaw integration configuration.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { OpenClawIntegrationConfig, ConfigValidationResult } from './types.js';
/**
 * Configuration loader class
 */
export declare class OpenClawConfigLoader {
    private config;
    private configPath;
    private loadedAt;
    constructor(configPath?: string);
    /**
     * Load configuration from file with environment variable overrides
     */
    load(): OpenClawIntegrationConfig;
    /**
     * Reload configuration from file
     */
    reload(): OpenClawIntegrationConfig;
    /**
     * Get current configuration
     */
    getConfig(): OpenClawIntegrationConfig;
    /**
     * Get configuration age in milliseconds
     */
    getConfigAge(): number;
    /**
     * Check if configuration needs reload
     */
    needsReload(maxAgeMs?: number): boolean;
    /**
     * Apply environment variable overrides
     */
    private applyEnvironmentOverrides;
    /**
     * Merge user config with defaults
     */
    private mergeWithDefaults;
    /**
     * Validate configuration
     */
    validateConfig(config: OpenClawIntegrationConfig): ConfigValidationResult;
    /**
     * Get configuration file path
     */
    getConfigPath(): string;
    /**
     * Check if configuration file exists
     */
    configExists(): boolean;
    /**
     * Create sample configuration file
     */
    createSampleConfig(): void;
    /**
     * Get config for API server only
     */
    getAPIServerConfig(): {
        enabled: boolean;
        port: number;
        host?: string;
        apiKey?: string;
    };
    /**
     * Get config for hooks only
     */
    getHooksConfig(): {
        enabled: boolean;
        toolBefore: boolean;
        toolAfter: boolean;
        includeArgs: boolean;
        includeResult: boolean;
        toolFilter?: string[];
    };
    /**
     * Check if integration is enabled
     */
    isEnabled(): boolean;
    /**
     * Check if API server is enabled
     */
    isAPIServerEnabled(): boolean;
    /**
     * Check if hooks are enabled
     */
    areHooksEnabled(): boolean;
}
export declare const configLoader: OpenClawConfigLoader;
export declare function createConfigLoader(configPath?: string): OpenClawConfigLoader;
//# sourceMappingURL=config.d.ts.map