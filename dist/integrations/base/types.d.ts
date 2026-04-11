/**
 * Integration Base Types
 *
 * Common TypeScript interfaces for 0xRay integrations.
 * Provides a standardized foundation for all integration types.
 *
 * @version 1.0.0
 * @since 2026-03-15
 */
import type { EventEmitter } from "events";
/**
 * Log levels for integration logging
 */
export type LogLevel = "error" | "warn" | "info" | "debug";
/**
 * Integration configuration options
 */
export interface IntegrationConfig {
    /** Whether the integration is enabled */
    enabled: boolean;
    /** Enable debug mode for additional logging */
    debug: boolean;
    /** Log level for the integration */
    logLevel: LogLevel;
    /** Optional custom configuration options */
    custom?: Record<string, unknown>;
}
/**
 * Default integration configuration
 */
export declare const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig;
/**
 * Integration lifecycle status
 */
export type IntegrationStatus = "uninitialized" | "initializing" | "initialized" | "error" | "shutting-down" | "shutdown";
/**
 * Health check result
 */
export interface HealthResult {
    /** Whether the integration is healthy */
    healthy: boolean;
    /** Human-readable message describing the health status */
    message: string;
    /** Optional additional details about the health status */
    details?: Record<string, unknown> | undefined;
}
/**
 * Default healthy result
 */
export declare const HEALTHY_RESULT: HealthResult;
/**
 * Default unhealthy result
 */
export declare function createUnhealthyResult(message: string, details?: Record<string, unknown>): HealthResult;
/**
 * Base integration statistics
 */
export interface IntegrationStats {
    /** Time since initialization in milliseconds */
    uptime: number;
    /** Number of errors encountered */
    errors: number;
    /** Optional custom statistics */
    custom?: Record<string, unknown>;
}
/**
 * Creates a default integration stats object
 */
export declare function createIntegrationStats(): IntegrationStats;
/**
 * Base integration events
 */
export type IntegrationEventType = "initialized" | "initializing" | "shutdown" | "shutting-down" | "error" | "health-check" | "stats-updated" | "config-updated";
/**
 * Integration event payload
 */
export interface IntegrationEvent<T = unknown> {
    /** Event type */
    type: IntegrationEventType;
    /** Timestamp when the event occurred */
    timestamp: number;
    /** Event data */
    data?: T | undefined;
    /** Optional error if event represents an error */
    error?: Error | undefined;
}
/**
 * Integration interface
 * All 0xRay integrations must implement this interface
 */
export interface IIntegration {
    /** Unique name of the integration */
    readonly name: string;
    /** Version of the integration */
    readonly version: string;
    /** Current lifecycle status */
    readonly status: IntegrationStatus;
    /**
     * Initialize the integration with optional configuration
     * @param config - Optional partial configuration to merge with defaults
     */
    initialize(config?: Partial<IntegrationConfig>): Promise<void>;
    /**
     * Gracefully shutdown the integration
     * Should clean up resources and close connections
     */
    shutdown(): Promise<void>;
    /**
     * Perform a health check
     * @returns Promise resolving to health result
     */
    healthCheck(): Promise<HealthResult>;
    /**
     * Get current integration statistics
     * @returns Current stats object
     */
    getStats(): IntegrationStats;
}
/**
 * Extended integration interface with event support
 */
export interface IEventedIntegration extends IIntegration {
    /** Get the event emitter for this integration */
    getEventEmitter(): EventEmitter;
}
/**
 * Integration factory function type
 */
export type IntegrationFactory<T extends IIntegration = IIntegration> = (config?: Partial<IntegrationConfig>) => T;
/**
 * Integration constructor type
 */
export type IntegrationConstructor<T extends IIntegration = IIntegration> = new (config?: Partial<IntegrationConfig>) => T;
/**
 * Base error class for integration errors
 */
export declare class IntegrationError extends Error {
    readonly code: string;
    readonly recoverable: boolean;
    readonly context?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, recoverable: boolean, context?: Record<string, unknown> | undefined);
}
/**
 * Error thrown when integration is not initialized
 */
export declare class IntegrationNotInitializedError extends IntegrationError {
    constructor(integrationName: string);
}
/**
 * Error thrown when integration is already initialized
 */
export declare class IntegrationAlreadyInitializedError extends IntegrationError {
    constructor(integrationName: string);
}
/**
 * Error thrown during integration initialization
 */
export declare class IntegrationInitializationError extends IntegrationError {
    constructor(integrationName: string, originalError: Error);
}
/**
 * Type guard to check if an object is an integration
 */
export declare function isIntegration(value: unknown): value is IIntegration;
/**
 * Type guard to check if an object is a health result
 */
export declare function isHealthy(result: HealthResult): boolean;
//# sourceMappingURL=types.d.ts.map