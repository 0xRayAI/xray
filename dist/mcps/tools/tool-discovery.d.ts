/**
 * Tool Discovery
 *
 * Handles dynamic tool discovery from MCP servers via JSON-RPC protocol.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { MCPTool, IMcpConnection } from '../types/index.js';
import { JsonRpcRequest, JsonRpcResponse } from '../types/index.js';
export declare class ToolDiscovery {
    /**
     * Discover available tools from an MCP server connection
     */
    discoverTools(connection: IMcpConnection): Promise<MCPTool[]>;
    /**
     * Build a tool list request for JSON-RPC
     */
    buildToolListRequest(requestId?: number): JsonRpcRequest;
    /**
     * Parse tools from a JSON-RPC response
     */
    parseTools(response: JsonRpcResponse): MCPTool[];
    /**
     * Validate that discovered tools have required fields
     */
    validateTools(tools: unknown[]): MCPTool[];
    private isValidTool;
}
//# sourceMappingURL=tool-discovery.d.ts.map