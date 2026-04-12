/**
 * Base Integration Class
 *
 * Abstract base class providing common lifecycle management, event emission,
 * configuration handling, and logging for all 0xRay integrations.
 *
 * @version 1.0.0
 * @since 2026-03-15
 */
import { EventEmitter } from "events";
import type { LogStatus } from "../../core/framework-logger.js";
import { type IntegrationConfig, type IntegrationStatus, type IntegrationStats, type HealthResult, type IntegrationEvent, type IntegrationEventType, type IIntegration, type IEventedIntegration, type LogLevel } from "./types.js";
/**
 * Abstract base class for all 0xRay integrations
 *
 * Provides:
 * - Lifecycle management (initialize/shutdown)
 * - Configuration handling with defaults
 * - Event emission for integration events
 * - Common statistics tracking (uptime, errors)
 * - Logging integration with framework logger
 *
 * @example
 * ```typescript
 * class MyIntegration extends BaseIntegration {
 *   constructor() {
 *     super('my-integration', '1.0.0');
 *   }
 *
 *   protected async performInitialization(): Promise<void> {
 *     // Custom initialization logic
 *   }
 *
 *   protected async performShutdown(): Promise<void> {
 *     // Custom cleanup logic
 *   }
 *
 *   protected async performHealthCheck(): Promise<HealthResult> {
 *     return { healthy: true, message: 'OK' };
 *   }
 * }
 * ```
 */
export declare abstract class BaseIntegration extends EventEmitter implements IIntegration, IEventedIntegration {
    /** Unique name of the integration */
    readonly name: string;
    /** Version of the integration */
    readonly version: string;
    /** Current lifecycle status */
    protected _status: IntegrationStatus;
    /** Current configuration */
    protected config: IntegrationConfig;
    /** Statistics tracking */
    protected stats: IntegrationStats;
    /** Start time for uptime calculation */
    protected startTime: number;
    /** Job ID for current operation */
    protected jobId: string;
    /**
     * Create a new base integration
     *
     * @param name - Unique name for this integration
     * @param version - Version string
     * @param initialConfig - Optional initial configuration
     */
    constructor(name: string, version: string, initialConfig?: Partial<IntegrationConfig>);
    /**
     * Get current integration status (readonly accessor)
     */
    get status(): IntegrationStatus;
    /**
     * Initialize the integration
     *
     * Calls performInitialization() after setting up the base state.
     * Handles errors and emits appropriate events.
     *
     * @param config - Optional partial configuration to merge
     */
    initialize(config?: Partial<IntegrationConfig>): Promise<void>;
    /**
     * Gracefully shutdown the integration
     *
     * Calls performShutdown() to clean up resources.
     *
     * @example
     * ```typescript
     * // Using await
     * await integration.shutdown();
     * ```
     */
    shutdown(): Promise<void>;
    /**
     * Perform a health check
     *
     * Default implementation checks status and calls performHealthCheck().
     * Subclasses should override performHealthCheck() for custom checks.
     *
     * @returns Health result indicating integration health
     *
     * @example
     * ```typescript
     * const health = await integration.healthCheck();
     * if (!health.healthy) {
     *   console.error('Integration unhealthy:', health.message);
     * }
     * ```
     */
    healthCheck(): Promise<HealthResult>;
    /**
     * Get current integration statistics
     *
     * Calculates uptime since initialization and includes error count.
     *
     * @returns Current stats object
     *
     * @example
     * ```typescript
     * const stats = integration.getStats();
     * console.log(`Uptime: ${stats.uptime}ms, Errors: ${stats.errors}`);
     * ```
     */
    getStats(): IntegrationStats;
    /**
     * Get the event emitter for this integration
     *
     * Returns `this` since BaseIntegration extends EventEmitter.
     *
     * @returns The event emitter instance
     */
    getEventEmitter(): EventEmitter;
    /**
     * Ensure the integration is initialized
     *
     * @throws IntegrationNotInitializedError if not initialized
     */
    protected ensureInitialized(): void;
    /**
     * Record an error in statistics
     *
     * @param error - Optional error to record
     */
    protected recordError(error?: Error): void;
    /**
     * Update custom statistics
     *
     * @param customStats - Partial stats to merge
     */
    protected updateCustomStats(customStats: Record<string, unknown>): void;
    /**
     * Get current configuration
     *
     * @returns Current configuration object (copy)
     */
    protected getConfig(): IntegrationConfig;
    /**
     * Update configuration
     *
     * @param config - Partial configuration to merge
     */
    protected updateConfig(config: Partial<IntegrationConfig>): void;
    /**
     * Log a message using the framework logger
     *
     * @param status - Log status level
     * @param message - Message to log
     * @param details - Optional details object
     */
    protected log(status: LogStatus, message: string, details?: Record<string, unknown>): Promise<void>;
    /**
     * Emit a typed integration event
     *
     * @param type - Event type
     * @param data - Event data
     * @param error - Optional error
     */
    protected emitEvent(type: IntegrationEventType, data?: Record<string, unknown>, error?: Error): void;
    /**
     * Perform integration-specific initialization
     *
     * Called during initialize() after base setup.
     * Subclasses should implement custom initialization logic here.
     *
     * @example
     * ```typescript
     * protected async performInitialization(): Promise<void> {
     *   // Connect to external service
     *   await this.connect();
     *
     *   // Setup event handlers
     *   this.on('data', this.handleData);
     * }
     * ```
     */
    protected abstract performInitialization(): Promise<void>;
    /**
     * Perform integration-specific shutdown
     *
     * Called during shutdown() for cleanup.
     * Subclasses should implement cleanup logic here.
     *
     * @example
     * ```typescript
     * protected async performShutdown(): Promise<void> {
     *   // Remove event handlers
     *   this.off('data', this.handleData);
     *
     *   // Close connections
     *   await this.disconnect();
     * }
     * ```
     */
    protected abstract performShutdown(): Promise<void>;
    /**
     * Perform integration-specific health check
     *
     * Called by healthCheck() to determine integration health.
     * Subclasses should implement custom health checks here.
     *
     * @returns Health result
     *
     * @example
     * ```typescript
     * protected async performHealthCheck(): Promise<HealthResult> {
     *   const connected = await this.isConnected();
     *
     *   if (connected) {
     *     return { healthy: true, message: 'Connection active' };
     *   }
     *
     *   return { healthy: false, message: 'Not connected' };
     * }
     * ```
     */
    protected abstract performHealthCheck(): Promise<HealthResult>;
    /**
     * Check if an object is a BaseIntegration instance
     *
     * @param value - Value to check
     * @returns True if value is a BaseIntegration
     */
    static isBaseIntegration(value: unknown): value is BaseIntegration;
}
/**
 * Create a simple integration with minimal implementation
 *
 * Useful for testing or simple integrations that don't need much logic.
 *
 * @param name - Integration name
 * @param version - Integration version
 * @param healthCheck - Custom health check function
 * @param shutdown - Custom shutdown function
 * @returns New integration instance
 *
 * @example
 * ```typescript
 * const simple = createSimpleIntegration(
 *   'simple',
 *   '1.0.0',
 *   async () => ({ healthy: true, message: 'OK' }),
 *   async () => {}
 * );
 *
 * await simple.initialize();
 * ```
 */
export declare function createSimpleIntegration(name: string, version: string, healthCheck: () => Promise<HealthResult>, shutdown?: () => Promise<void>): BaseIntegration;
export type { IntegrationConfig, IntegrationStatus, IntegrationStats, HealthResult, IntegrationEvent, IntegrationEventType, IIntegration, IEventedIntegration, LogLevel, };
//# sourceMappingURL=Integration.d.ts.map