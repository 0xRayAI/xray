/**
 * Integration Base Types
 *
 * Common TypeScript interfaces for StringRay integrations.
 * Provides a standardized foundation for all integration types.
 *
 * @version 1.0.0
 * @since 2026-03-15
 */
/**
 * Default integration configuration
 */
export const DEFAULT_INTEGRATION_CONFIG = {
    enabled: true,
    debug: false,
    logLevel: "info",
};
/**
 * Default healthy result
 */
export const HEALTHY_RESULT = {
    healthy: true,
    message: "Integration is healthy",
};
/**
 * Default unhealthy result
 */
export function createUnhealthyResult(message, details) {
    if (details && Object.keys(details).length > 0) {
        return {
            healthy: false,
            message,
            details,
        };
    }
    return {
        healthy: false,
        message,
    };
}
/**
 * Creates a default integration stats object
 */
export function createIntegrationStats() {
    return {
        uptime: 0,
        errors: 0,
    };
}
// ============================================================================
// Error Types
// ============================================================================
/**
 * Base error class for integration errors
 */
export class IntegrationError extends Error {
    code;
    recoverable;
    context;
    constructor(message, code, recoverable, context) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.context = context;
        this.name = "IntegrationError";
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Error thrown when integration is not initialized
 */
export class IntegrationNotInitializedError extends IntegrationError {
    constructor(integrationName) {
        super(`Integration '${integrationName}' is not initialized. Call initialize() first.`, "NOT_INITIALIZED", false, { integrationName });
        this.name = "IntegrationNotInitializedError";
    }
}
/**
 * Error thrown when integration is already initialized
 */
export class IntegrationAlreadyInitializedError extends IntegrationError {
    constructor(integrationName) {
        super(`Integration '${integrationName}' is already initialized.`, "ALREADY_INITIALIZED", false, { integrationName });
        this.name = "IntegrationAlreadyInitializedError";
    }
}
/**
 * Error thrown during integration initialization
 */
export class IntegrationInitializationError extends IntegrationError {
    constructor(integrationName, originalError) {
        super(`Failed to initialize integration '${integrationName}': ${originalError.message}`, "INITIALIZATION_FAILED", true, { integrationName, originalError: originalError.message });
        this.name = "IntegrationInitializationError";
    }
}
// ============================================================================
// Utility Types
// ============================================================================
/**
 * Type guard to check if an object is an integration
 */
export function isIntegration(value) {
    return (typeof value === "object" &&
        value !== null &&
        "name" in value &&
        "version" in value &&
        "status" in value &&
        "initialize" in value &&
        "shutdown" in value &&
        "healthCheck" in value &&
        "getStats" in value);
}
/**
 * Type guard to check if an object is a health result
 */
export function isHealthy(result) {
    return result.healthy === true;
}
//# sourceMappingURL=types.js.map