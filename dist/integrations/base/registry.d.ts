/**
 * Integration Registry
 *
 * Central registry for managing 0xRay integrations.
 * Provides registration, loading, unloading, health checking, and stats retrieval.
 *
 * @version 1.0.0
 * @since 2026-03-15
 */
import { EventEmitter } from "events";
import { type IIntegration, type IntegrationConfig, type HealthResult, type IntegrationStats, type IntegrationStatus } from "./types.js";
/**
 * Integration configuration from config file
 */
export interface IntegrationsConfig {
    integrations: Record<string, {
        enabled: boolean;
        config?: Record<string, unknown>;
    }>;
}
/**
 * Registry event types
 */
export type RegistryEventType = "integration-registered" | "integration-unregistered" | "integration-loaded" | "integration-unloaded" | "load-complete" | "unload-complete" | "health-check-complete" | "error";
/**
 * Registry event
 */
export interface RegistryEvent {
    type: RegistryEventType;
    timestamp: number;
    integrationName?: string | undefined;
    data?: Record<string, unknown> | undefined;
    error?: Error | undefined;
}
/**
 * Loaded integration metadata
 */
interface LoadedIntegration {
    instance: IIntegration;
    config: IntegrationConfig;
    loadedAt: number;
}
/**
 * Error thrown when integration is not found in registry
 */
export declare class IntegrationNotFoundError extends Error {
    constructor(integrationName: string);
}
/**
 * Error thrown when integration is already registered
 */
export declare class IntegrationAlreadyRegisteredError extends Error {
    constructor(integrationName: string);
}
/**
 * Integration Registry
 *
 * Manages registration, loading, and lifecycle of integrations.
 *
 * @example
 * ```typescript
 * const registry = new IntegrationRegistry();
 *
 * // Register an integration
 * registry.register('my-integration', new MyIntegration());
 *
 * // Get an integration
 * const integration = registry.get('my-integration');
 *
 * // List all integrations
 * const names = registry.list();
 *
 * // Load from config
 * await registry.loadAll({
 *   integrations: {
 *     'my-integration': { enabled: true }
 *   }
 * });
 * ```
 */
export declare class IntegrationRegistry extends EventEmitter {
    /** Map of registered integrations (name -> instance) */
    private registeredIntegrations;
    /** Map of loaded integrations (name -> metadata) */
    private loadedIntegrations;
    /** Job ID for registry operations */
    private jobId;
    /**
     * Create a new IntegrationRegistry
     */
    constructor();
    /**
     * Register an integration with the registry
     *
     * @param name - Unique name for the integration
     * @param integration - Integration instance to register
     * @throws IntegrationAlreadyRegisteredError if name already registered
     */
    register(name: string, integration: IIntegration): void;
    /**
     * Unregister an integration from the registry
     *
     * @param name - Name of the integration to unregister
     * @throws IntegrationNotFoundError if integration not found
     */
    unregister(name: string): void;
    /**
     * Get an integration by name
     *
     * @param name - Name of the integration
     * @returns Integration instance or undefined if not found
     */
    get(name: string): IIntegration | undefined;
    /**
     * Get a loaded integration by name
     *
     * @param name - Name of the loaded integration
     * @returns Loaded integration metadata or undefined if not loaded
     */
    getLoaded(name: string): LoadedIntegration | undefined;
    /**
     * List all registered integration names
     *
     * @returns Array of integration names
     */
    list(): string[];
    /**
     * List all loaded integration names
     *
     * @returns Array of loaded integration names
     */
    listLoaded(): string[];
    /**
     * Check if an integration is registered
     *
     * @param name - Name to check
     * @returns true if registered
     */
    isRegistered(name: string): boolean;
    /**
     * Check if an integration is loaded
     *
     * @param name - Name to check
     * @returns true if loaded
     */
    isLoaded(name: string): boolean;
    /**
     * Load an integration by name
     *
     * @param name - Integration name
     * @param config - Optional integration configuration
     * @throws IntegrationNotFoundError if integration not registered
     */
    load(name: string, config?: Partial<IntegrationConfig>): Promise<void>;
    /**
     * Unload an integration by name
     *
     * @param name - Integration name
     * @throws IntegrationNotFoundError if integration not loaded
     */
    unload(name: string): Promise<void>;
    /**
     * Load all enabled integrations from configuration
     *
     * @param config - Integrations configuration
     */
    loadAll(config: IntegrationsConfig): Promise<void>;
    /**
     * Unload all loaded integrations
     */
    unloadAll(): Promise<void>;
    /**
     * Get health status of all loaded integrations
     *
     * @returns Record of integration names to health results
     */
    healthCheckAll(): Promise<Record<string, HealthResult>>;
    /**
     * Get health status of a specific integration
     *
     * @param name - Integration name
     * @returns Health result
     * @throws IntegrationNotFoundError if integration not loaded
     */
    healthCheck(name: string): Promise<HealthResult>;
    /**
     * Get statistics from all loaded integrations
     *
     * @returns Record of integration names to stats
     */
    getAllStats(): Record<string, IntegrationStats>;
    /**
     * Get statistics from a specific integration
     *
     * @param name - Integration name
     * @returns Integration stats
     * @throws IntegrationNotFoundError if integration not loaded
     */
    getStats(name: string): IntegrationStats;
    /**
     * Get status of a specific integration
     *
     * @param name - Integration name
     * @returns Integration status
     */
    getStatus(name: string): IntegrationStatus | undefined;
    /**
     * Get all integration statuses
     *
     * @returns Record of integration names to statuses
     */
    getAllStatuses(): Record<string, IntegrationStatus>;
    /**
     * Clear all registered integrations (not loaded ones)
     */
    clear(): void;
    /**
     * Get registry statistics
     *
     * @returns Registry statistics
     */
    getRegistryStats(): {
        registered: number;
        loaded: number;
        byStatus: Record<IntegrationStatus, number>;
    };
    /**
     * Emit a registry event
     */
    private emitEvent;
}
/**
 * Integration discovery result
 */
export interface DiscoveredIntegration {
    name: string;
    path: string;
    module: unknown;
}
/**
 * Auto-discover integrations from directory index files
 *
 * This function scans the integrations directory for integration modules
 * and returns their discovered information.
 *
 * @param integrationsPath - Path to integrations directory
 * @returns Array of discovered integrations
 *
 * @example
 * ```typescript
 * const discovered = await discoverIntegrations('./src/integrations');
 * for (const d of discovered) {
 *   console.log(`Found: ${d.name} at ${d.path}`);
 * }
 * ```
 */
export declare function discoverIntegrations(integrationsPath: string): Promise<DiscoveredIntegration[]>;
/**
 * Auto-register integrations from discovered modules
 *
 * @param registry - Registry instance to register with
 * @param integrationsPath - Path to integrations directory
 * @returns Number of integrations registered
 *
 * @example
 * ```typescript
 * const registry = new IntegrationRegistry();
 * const count = await autoRegisterIntegrations(registry, './src/integrations');
 * console.log(`Registered ${count} integrations`);
 * ```
 */
export declare function autoRegisterIntegrations(registry: IntegrationRegistry, integrationsPath: string): Promise<number>;
export {};
//# sourceMappingURL=registry.d.ts.map