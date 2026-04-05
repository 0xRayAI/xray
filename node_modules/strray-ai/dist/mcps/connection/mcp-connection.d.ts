import { EventEmitter } from 'events';
import { IMcpConnection, JsonRpcRequest, JsonRpcResponse, IServerConfig } from '../types/index.js';
/**
 * MCP Connection
 * Manages a single connection to an MCP server via spawned process
 */
export declare class McpConnection extends EventEmitter implements IMcpConnection {
    private config;
    readonly serverName: string;
    private processSpawner;
    private process;
    private _isConnected;
    private requestId;
    private pendingRequests;
    private stdoutBuffer;
    private readonly timeout;
    constructor(config: IServerConfig);
    /**
     * Check if the connection is active
     */
    get isConnected(): boolean;
    /**
     * Connect to the MCP server
     * Spawns the process and sets up event handlers
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the MCP server
     * Kills the process and cleans up resources
     */
    disconnect(): Promise<void>;
    /**
     * Send a JSON-RPC request to the MCP server
     * @param request - The JSON-RPC request to send
     * @returns Promise that resolves with the response
     */
    sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse>;
    /**
     * Set up event handlers for the spawned process
     */
    private setupEventHandlers;
    /**
     * Handle stdout data from the process
     */
    private handleStdout;
    /**
     * Handle a JSON-RPC response
     */
    private handleResponse;
    /**
     * Handle stderr data from the process
     */
    private handleStderr;
    /**
     * Handle process errors
     */
    private handleError;
    /**
     * Handle process close
     */
    private handleClose;
    /**
     * Clean up resources
     */
    private cleanup;
}
//# sourceMappingURL=mcp-connection.d.ts.map