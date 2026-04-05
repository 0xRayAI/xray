/**
 * Tool Executor
 *
 * Handles tool execution via JSON-RPC protocol.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { JSONRPC_VERSION } from '../protocol/protocol-constants.js';
export class ToolExecutor {
    requestId = 0;
    /**
     * Execute a tool on an MCP server
     */
    async executeTool(connection, toolName, args) {
        const request = this.buildToolCallRequest(toolName, args);
        const response = await connection.sendRequest(request);
        return this.parseToolResult(response);
    }
    /**
     * Build a tool call request for JSON-RPC
     */
    buildToolCallRequest(toolName, args, requestId) {
        this.requestId = requestId ?? this.requestId + 1;
        return {
            jsonrpc: JSONRPC_VERSION,
            id: this.requestId,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args,
            },
        };
    }
    /**
     * Parse a tool result from JSON-RPC response
     */
    parseToolResult(response) {
        if (response.error) {
            return {
                content: [{ type: 'text', text: response.error.message }],
                isError: true,
            };
        }
        const result = response.result;
        if (!result) {
            return {
                content: [{ type: 'text', text: 'No result returned from tool execution' }],
                isError: true,
            };
        }
        return result;
    }
    /**
     * Execute multiple tools in sequence
     */
    async executeTools(connection, executions) {
        const results = [];
        for (const execution of executions) {
            const result = await this.executeTool(connection, execution.toolName, execution.args);
            results.push(result);
        }
        return results;
    }
    /**
     * Execute multiple tools in parallel
     */
    async executeToolsParallel(connection, executions) {
        return Promise.all(executions.map((execution) => this.executeTool(connection, execution.toolName, execution.args)));
    }
    /**
     * Reset the request ID counter
     */
    resetRequestId() {
        this.requestId = 0;
    }
}
//# sourceMappingURL=tool-executor.js.map