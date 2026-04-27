/**
 * 0xRay API Server
 *
 * HTTP API server that OpenClaw skills call to invoke 0xRay capabilities.
 * This is the bridge between OpenClaw skills and 0xRay.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { StringRayAPIServerConfig, AgentInvokeRequest, AgentInvokeResponse, APIServerStatistics } from './types.js';
/**
 * Agent invoker interface - implemented by 0xRay
 */
export interface AgentInvoker {
    invoke(request: AgentInvokeRequest): Promise<AgentInvokeResponse>;
    getStatus?(): Promise<{
        healthy: boolean;
        version: string;
    }>;
}
/**
 * 0xRay API Server
 */
export declare class StringRayAPIServer {
    private server;
    private config;
    private agentInvoker;
    private apiKey;
    private stats;
    private responseTimes;
    private logger;
    constructor(config: StringRayAPIServerConfig);
    /**
     * Set the agent invoker
     */
    setAgentInvoker(invoker: AgentInvoker): void;
    /**
     * Start the API server
     */
    start(): Promise<void>;
    /**
     * Stop the API server
     */
    stop(): Promise<void>;
    /**
     * Check if server is running
     */
    isRunning(): boolean;
    /**
     * Get server statistics
     */
    getStats(): APIServerStatistics;
    /**
     * Handle incoming HTTP request
     */
    private handleRequest;
    /**
     * Handle health check request
     */
    private handleHealth;
    /**
     * Handle agent invoke request
     */
    private handleAgentInvoke;
    /**
     * Handle agent status request
     */
    private handleAgentStatus;
    /**
     * Validate API key using constant-time comparison to prevent timing attacks
     */
    private validateApiKey;
    /**
     * Read request body
     */
    private readBody;
    /**
     * Send JSON response
     */
    private sendResponse;
}
/**
 * Factory function to create API server
 */
export declare function createStringRayAPIServer(config: StringRayAPIServerConfig): StringRayAPIServer;
//# sourceMappingURL=api-server.d.ts.map