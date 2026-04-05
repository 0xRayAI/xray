/**
 * Tool Executor
 *
 * Handles tool execution via JSON-RPC protocol.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { MCPToolResult, IMcpConnection } from '../types/index.js';
import { JsonRpcRequest, JsonRpcResponse } from '../types/index.js';
export declare class ToolExecutor {
    private requestId;
    /**
     * Execute a tool on an MCP server
     */
    executeTool(connection: IMcpConnection, toolName: string, args: unknown): Promise<MCPToolResult>;
    /**
     * Build a tool call request for JSON-RPC
     */
    buildToolCallRequest(toolName: string, args: unknown, requestId?: number): JsonRpcRequest;
    /**
     * Parse a tool result from JSON-RPC response
     */
    parseToolResult(response: JsonRpcResponse): MCPToolResult;
    /**
     * Execute multiple tools in sequence
     */
    executeTools(connection: IMcpConnection, executions: Array<{
        toolName: string;
        args: unknown;
    }>): Promise<MCPToolResult[]>;
    /**
     * Execute multiple tools in parallel
     */
    executeToolsParallel(connection: IMcpConnection, executions: Array<{
        toolName: string;
        args: unknown;
    }>): Promise<MCPToolResult[]>;
    /**
     * Reset the request ID counter
     */
    resetRequestId(): void;
}
//# sourceMappingURL=tool-executor.d.ts.map