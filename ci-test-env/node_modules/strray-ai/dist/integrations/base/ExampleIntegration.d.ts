/**
 * Example Integration - Demonstrates using the BaseIntegration class
 *
 * This is a simple example showing how to create a custom integration
 * that extends the BaseIntegration class.
 *
 * @version 1.0.0
 * @since 2026-03-15
 */
import { BaseIntegration, type HealthResult, type IntegrationConfig } from "./index.js";
/**
 * Example custom integration
 *
 * Demonstrates how to extend BaseIntegration with custom logic.
 */
declare class ExampleIntegration extends BaseIntegration {
    /** Custom property for this integration */
    private connectionString;
    private connected;
    /**
     * Create a new ExampleIntegration
     *
     * @param config - Optional configuration
     */
    constructor(config?: Partial<IntegrationConfig>);
    /**
     * Set connection string
     */
    setConnectionString(connStr: string): void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Perform integration-specific initialization
     */
    protected performInitialization(): Promise<void>;
    /**
     * Perform integration-specific shutdown
     */
    protected performShutdown(): Promise<void>;
    /**
     * Perform integration-specific health check
     */
    protected performHealthCheck(): Promise<HealthResult>;
}
export { ExampleIntegration };
//# sourceMappingURL=ExampleIntegration.d.ts.map