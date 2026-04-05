/**
 * Tool Discovery
 *
 * Handles dynamic tool discovery from MCP servers via JSON-RPC protocol.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { JSONRPC_VERSION } from '../protocol/protocol-constants.js';
export class ToolDiscovery {
    /**
     * Discover available tools from an MCP server connection
     */
    async discoverTools(connection) {
        const request = {
            jsonrpc: JSONRPC_VERSION,
            id: 1,
            method: 'tools/list',
        };
        const response = await connection.sendRequest(request);
        if (response.error) {
            throw new Error(`Tool discovery failed: ${response.error.message}`);
        }
        return response.result?.tools || [];
    }
    /**
     * Build a tool list request for JSON-RPC
     */
    buildToolListRequest(requestId = 1) {
        return {
            jsonrpc: JSONRPC_VERSION,
            id: requestId,
            method: 'tools/list',
        };
    }
    /**
     * Parse tools from a JSON-RPC response
     */
    parseTools(response) {
        if (response.error) {
            throw new Error(`Tool discovery failed: ${response.error.message}`);
        }
        return response.result?.tools || [];
    }
    /**
     * Validate that discovered tools have required fields
     */
    validateTools(tools) {
        const validTools = [];
        for (const tool of tools) {
            if (this.isValidTool(tool)) {
                validTools.push(tool);
            }
        }
        return validTools;
    }
    isValidTool(tool) {
        if (typeof tool !== 'object' || tool === null) {
            return false;
        }
        const t = tool;
        return (typeof t.name === 'string' &&
            typeof t.description === 'string' &&
            typeof t.inputSchema === 'object' &&
            t.inputSchema !== null);
    }
}
//# sourceMappingURL=tool-discovery.js.map