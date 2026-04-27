/**
 * OpenClaw Integration - Main Module
 *
 * Combines all OpenClaw integration components into a single interface.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { BaseIntegration } from '../base/index.js';
import { OpenClawConfigLoader } from './config.js';
import { OpenClawClient } from './client.js';
import { StringRayAPIServer } from './api-server.js';
import { OpenClawHooksManager } from './hooks/strray-hooks.js';
import { mcpClientManager } from '../../mcps/mcp-client.js';
/**
 * Main OpenClaw Integration class
 * Extends BaseIntegration for consistent lifecycle management
 */
export class OpenClawIntegration extends BaseIntegration {
    configLoader;
    client = null;
    apiServer = null;
    hooksManager = null;
    agentInvoker = null;
    // Event subscription tracking for cleanup
    mcpToolBeforeUnsubscribe = null;
    mcpToolAfterUnsubscribe = null;
    constructor(configPath) {
        super('openclaw', '1.0.0', { enabled: true, debug: false, logLevel: 'info' });
        this.configLoader = new OpenClawConfigLoader(configPath);
    }
    /**
     * Set the agent invoker for the API server
     */
    setAgentInvoker(invoker) {
        this.agentInvoker = invoker;
        if (this.apiServer) {
            this.apiServer.setAgentInvoker(invoker);
        }
    }
    /**
     * Perform integration-specific initialization
     * Called by BaseIntegration.initialize() after base setup
     */
    async performInitialization() {
        const config = this.configLoader.getConfig();
        // Merge with base config
        this.config = { ...this.config, ...config };
        if (!config.enabled) {
            await this.log('info', 'Integration disabled in configuration');
            return;
        }
        await this.log('info', 'Initializing...');
        // Initialize API server if enabled
        if (config.apiServer?.enabled) {
            await this.log('info', 'Starting API server...');
            this.apiServer = new StringRayAPIServer(config.apiServer);
            if (this.agentInvoker) {
                this.apiServer.setAgentInvoker(this.agentInvoker);
            }
            await this.apiServer.start();
        }
        // Initialize WebSocket client
        await this.log('info', 'Connecting to OpenClaw Gateway...');
        this.client = new OpenClawClient({
            gatewayUrl: config.gatewayUrl,
            authToken: config.authToken,
            deviceId: config.deviceId,
            deviceKeyPair: config.deviceKeyPair,
            reconnect: config.autoReconnect,
            reconnectAttempts: config.maxReconnectAttempts,
            reconnectDelay: config.reconnectDelay,
        });
        // Set up event listeners using inherited emit
        this.client.onStateChange(async (state, previousState) => {
            this.log('info', `Client state: ${previousState} → ${state}`);
            this.emit('stateChange', { previousState, newState: state });
            // Flush queued events when client reconnects
            if (this.hooksManager && (state === 'connected' || state === 'authorized')) {
                await this.hooksManager.handleReconnect();
            }
        });
        try {
            await this.client.connect();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.log('warning', `Failed to connect to OpenClaw Gateway: ${errorMessage}`);
            // Don't fail - API server can still work independently
        }
        // Initialize hooks if enabled
        if (config.hooks?.enabled) {
            await this.log('info', 'Initializing tool hooks...');
            this.hooksManager = new OpenClawHooksManager(config.hooks);
            if (this.client) {
                this.hooksManager.setClient(this.client);
            }
            await this.hooksManager.initialize();
            // Wire hooks to MCPClient tool events
            await this.wireHooksToMCP();
        }
    }
    /**
     * Wire OpenClaw hooks to MCPClient tool events
     */
    async wireHooksToMCP() {
        if (!this.hooksManager) {
            return;
        }
        await this.log('info', 'Wiring hooks to MCP tool events...');
        // Subscribe to tool.before events and store unsubscribe function
        this.mcpToolBeforeUnsubscribe = await mcpClientManager.onToolEvent('tool.before', async (event) => {
            const toolEvent = event;
            try {
                await this.hooksManager.onToolBefore({
                    toolName: toolEvent.toolName,
                    toolId: `${toolEvent.serverName}:${toolEvent.toolName}`,
                    args: toolEvent.args,
                    duration: 0,
                    timestamp: toolEvent.timestamp,
                    agent: toolEvent.serverName,
                });
            }
            catch (error) {
                await this.log('error', `Error in tool.before handler: ${error}`);
            }
        });
        // Subscribe to tool.after events and store unsubscribe function
        this.mcpToolAfterUnsubscribe = await mcpClientManager.onToolEvent('tool.after', async (event) => {
            const toolEvent = event;
            try {
                const afterEvent = {
                    toolName: toolEvent.toolName,
                    toolId: `${toolEvent.serverName}:${toolEvent.toolName}`,
                    args: toolEvent.args,
                    duration: toolEvent.duration,
                    timestamp: toolEvent.timestamp,
                    agent: toolEvent.serverName,
                };
                if (toolEvent.result !== undefined)
                    afterEvent.result = toolEvent.result;
                if (toolEvent.error !== undefined)
                    afterEvent.error = toolEvent.error;
                await this.hooksManager.onToolAfter(afterEvent);
            }
            catch (error) {
                await this.log('error', `Error in tool.after handler: ${error}`);
            }
        });
        await this.log('success', 'Hooks wired to MCP tool events');
    }
    /**
     * Perform integration-specific shutdown
     * Called by BaseIntegration.shutdown() for cleanup
     */
    async performShutdown() {
        await this.log('info', 'Shutting down...');
        // Unsubscribe from MCP tool events (prevent memory leaks)
        if (this.mcpToolBeforeUnsubscribe) {
            this.mcpToolBeforeUnsubscribe();
            this.mcpToolBeforeUnsubscribe = null;
        }
        if (this.mcpToolAfterUnsubscribe) {
            this.mcpToolAfterUnsubscribe();
            this.mcpToolAfterUnsubscribe = null;
        }
        // Shutdown hooks
        if (this.hooksManager) {
            await this.hooksManager.shutdown();
        }
        // Disconnect client
        if (this.client) {
            this.client.disconnect();
        }
        // Stop API server
        if (this.apiServer) {
            await this.apiServer.stop();
        }
    }
    /**
     * Perform integration-specific health check
     */
    async performHealthCheck() {
        const checks = [];
        // Check API server
        if (this.apiServer) {
            const apiStats = this.apiServer.getStats();
            const apiHealthy = apiStats.startedAt > 0;
            checks.push({
                healthy: apiHealthy,
                component: 'apiServer',
                message: apiHealthy ? 'API server running' : 'API server not started',
            });
        }
        // Check client connection
        if (this.client) {
            const clientState = this.client.getState();
            const clientHealthy = clientState === 'connected' || clientState === 'authorized';
            checks.push({
                healthy: clientHealthy,
                component: 'client',
                message: `Client state: ${clientState}`,
            });
        }
        // Check hooks manager
        if (this.hooksManager) {
            const hooksHealthy = this.hooksManager.isInitialized();
            const queueSize = this.hooksManager.getQueueSize();
            checks.push({
                healthy: hooksHealthy,
                component: 'hooks',
                message: hooksHealthy
                    ? `Hooks initialized (queue: ${queueSize})`
                    : 'Hooks not initialized',
            });
        }
        // Determine overall health
        const allHealthy = checks.length > 0 && checks.every(c => c.healthy);
        const anyHealthy = checks.some(c => c.healthy);
        return {
            healthy: allHealthy || (anyHealthy && checks.length > 0),
            message: checks.length === 0
                ? 'No components to check'
                : checks.map(c => c.message).join('; '),
            details: {
                components: checks.reduce((acc, c) => {
                    acc[c.component] = c.healthy;
                    return acc;
                }, {}),
            },
        };
    }
    /**
     * Get statistics including client, API server, and base stats
     */
    getStatistics() {
        return {
            client: this.client?.getStats() || this.getDefaultClientStats(),
            apiServer: this.apiServer?.getStats() || this.getDefaultAPIServerStats(),
            uptime: this.getStats().uptime,
        };
    }
    /**
     * Get the API server instance
     */
    getAPIServer() {
        return this.apiServer;
    }
    /**
     * Get the client instance
     */
    getClient() {
        return this.client;
    }
    /**
     * Get the hooks manager
     */
    getHooksManager() {
        return this.hooksManager;
    }
    /**
     * Get OpenClaw-specific configuration
     */
    getOpenClawConfig() {
        return this.configLoader.getConfig();
    }
    /**
     * Reload configuration
     */
    reloadConfig() {
        this.configLoader.reload();
    }
    /**
     * Get the agent invoker
     */
    getAgentInvoker() {
        return this.agentInvoker;
    }
    getDefaultClientStats() {
        return {
            messagesSent: 0,
            messagesReceived: 0,
            requestsSent: 0,
            requestsSucceeded: 0,
            requestsFailed: 0,
            reconnects: 0,
            errors: 0,
        };
    }
    getDefaultAPIServerStats() {
        return {
            startedAt: 0,
            requestsTotal: 0,
            requestsByEndpoint: {},
            requestsByStatus: {},
            averageResponseTime: 0,
            errors: 0,
        };
    }
}
/**
 * Global integration instance
 */
let globalIntegration = null;
/**
 * Initialize the global integration
 */
export async function initializeOpenClawIntegration(configPath, agentInvoker) {
    if (globalIntegration) {
        return globalIntegration;
    }
    globalIntegration = new OpenClawIntegration(configPath);
    if (agentInvoker) {
        globalIntegration.setAgentInvoker(agentInvoker);
    }
    await globalIntegration.initialize();
    return globalIntegration;
}
/**
 * Get the global integration
 */
export function getOpenClawIntegration() {
    return globalIntegration;
}
/**
 * Shutdown the global integration
 */
export async function shutdownOpenClawIntegration() {
    if (globalIntegration) {
        await globalIntegration.shutdown();
        globalIntegration = null;
    }
}
// Export all components
export * from './types.js';
export * from './config.js';
export * from './client.js';
export * from './api-server.js';
export { OpenClawHooksManager } from './hooks/strray-hooks.js';
//# sourceMappingURL=index.js.map