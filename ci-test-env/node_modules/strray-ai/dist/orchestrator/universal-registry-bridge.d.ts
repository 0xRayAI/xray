/**
 * Universal Registry Bridge
 *
 * Connects 0xRay to external agent registries.
 * Enables dynamic agent configuration loading from external sources.
 *
 * @version 1.0.0
 * @since 2026-02-14
 */
import type { AgentConfig } from "../agents/types.js";
export interface ExternalRegistryConfig {
    type: "file" | "http" | "npm";
    location: string;
    refreshInterval?: number;
}
export interface RegistryAgentDefinition {
    name: string;
    description: string;
    version: string;
    capabilities?: string[];
    config?: Record<string, unknown>;
}
export interface BridgeOptions {
    registries: ExternalRegistryConfig[];
    cacheDir?: string;
    autoRefresh?: boolean;
}
export declare class UniversalRegistryBridge {
    private registries;
    private cacheDir;
    private autoRefresh;
    private cache;
    private logger;
    constructor(options: BridgeOptions);
    /**
     * Load agents from all configured registries
     */
    loadAgents(): Promise<RegistryAgentDefinition[]>;
    /**
     * Fetch agents from a specific registry
     */
    private fetchFromRegistry;
    /**
     * Load agents from a local file
     */
    private loadFromFile;
    /**
     * Simple YAML parser for agent definitions
     * Handles basic agent registry format
     */
    private parseYamlAgents;
    /**
     * Load agents from HTTP endpoint
     */
    private loadFromHttp;
    /**
     * Load agents from npm package
     */
    private loadFromNpm;
    /**
     * Convert registry definition to AgentConfig
     */
    toAgentConfig(registryDef: RegistryAgentDefinition): Partial<AgentConfig>;
    /**
     * Get cached agents from a specific registry
     */
    getCached(registryType: string, location: string): RegistryAgentDefinition[] | undefined;
    /**
     * Clear the cache
     */
    clearCache(): void;
    /**
     * Add a new registry dynamically
     */
    addRegistry(registry: ExternalRegistryConfig): void;
    /**
     * Get all configured registries
     */
    getRegistries(): ExternalRegistryConfig[];
}
/**
 * Create a bridge from integration config
 */
export declare function createRegistryBridge(configPath?: string): Promise<UniversalRegistryBridge>;
export declare function getDefaultBridge(): UniversalRegistryBridge;
//# sourceMappingURL=universal-registry-bridge.d.ts.map