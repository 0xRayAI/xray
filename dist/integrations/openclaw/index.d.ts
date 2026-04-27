/**
 * OpenClaw Integration - Main Module
 *
 * Combines all OpenClaw integration components into a single interface.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { BaseIntegration } from '../base/index.js';
import type { OpenClawIntegrationConfig, IntegrationStatistics } from './types.js';
import { OpenClawClient } from './client.js';
import { StringRayAPIServer } from './api-server.js';
import { OpenClawHooksManager } from './hooks/strray-hooks.js';
import type { AgentInvoker } from './api-server.js';
/**
 * Main OpenClaw Integration class
 * Extends BaseIntegration for consistent lifecycle management
 */
export declare class OpenClawIntegration extends BaseIntegration {
    private configLoader;
    private client;
    private apiServer;
    private hooksManager;
    private agentInvoker;
    private mcpToolBeforeUnsubscribe;
    private mcpToolAfterUnsubscribe;
    constructor(configPath?: string);
    /**
     * Set the agent invoker for the API server
     */
    setAgentInvoker(invoker: AgentInvoker): void;
    /**
     * Perform integration-specific initialization
     * Called by BaseIntegration.initialize() after base setup
     */
    protected performInitialization(): Promise<void>;
    /**
     * Wire OpenClaw hooks to MCPClient tool events
     */
    private wireHooksToMCP;
    /**
     * Perform integration-specific shutdown
     * Called by BaseIntegration.shutdown() for cleanup
     */
    protected performShutdown(): Promise<void>;
    /**
     * Perform integration-specific health check
     */
    protected performHealthCheck(): Promise<{
        healthy: boolean;
        message: string;
        details?: Record<string, unknown>;
    }>;
    /**
     * Get statistics including client, API server, and base stats
     */
    getStatistics(): IntegrationStatistics;
    /**
     * Get the API server instance
     */
    getAPIServer(): StringRayAPIServer | null;
    /**
     * Get the client instance
     */
    getClient(): OpenClawClient | null;
    /**
     * Get the hooks manager
     */
    getHooksManager(): OpenClawHooksManager | null;
    /**
     * Get OpenClaw-specific configuration
     */
    getOpenClawConfig(): OpenClawIntegrationConfig;
    /**
     * Reload configuration
     */
    reloadConfig(): void;
    /**
     * Get the agent invoker
     */
    getAgentInvoker(): AgentInvoker | null;
    private getDefaultClientStats;
    private getDefaultAPIServerStats;
}
/**
 * Initialize the global integration
 */
export declare function initializeOpenClawIntegration(configPath?: string, agentInvoker?: AgentInvoker): Promise<OpenClawIntegration>;
/**
 * Get the global integration
 */
export declare function getOpenClawIntegration(): OpenClawIntegration | null;
/**
 * Shutdown the global integration
 */
export declare function shutdownOpenClawIntegration(): Promise<void>;
export * from './types.js';
export * from './config.js';
export * from './client.js';
export * from './api-server.js';
export { OpenClawHooksManager } from './hooks/strray-hooks.js';
//# sourceMappingURL=index.d.ts.map