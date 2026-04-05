/**
 * Orchestrator MCP Server - Facade
 *
 * Main entry point for the orchestrator MCP server
 * Provides a clean API while hiding internal complexity
 */
/**
 * Orchestrator MCP Server
 * Enterprise-grade orchestration with advanced task management and agent coordination
 */
export declare class OrchestratorServer {
    private server;
    private activeTasks;
    private taskHistory;
    private taskHandler;
    private complexityHandler;
    private statusHandler;
    private coordinator;
    constructor();
    /**
     * Initialize tool definitions
     */
    private initializeTools;
    /**
     * Set up tool request handlers
     */
    private setupToolHandlers;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
}
export declare function createOrchestratorServer(): OrchestratorServer;
//# sourceMappingURL=server.d.ts.map