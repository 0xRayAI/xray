/**
 * Tool Registry
 *
 * Manages tool registration and lookup across MCP servers.
 * Part of Phase 4 refactoring - Tool Layer extraction.
 */
import { MCPTool, IToolRegistry } from '../types/index.js';
export declare class ToolRegistry implements IToolRegistry {
    private tools;
    /**
     * Register tools for a specific server
     */
    register(serverName: string, tools: MCPTool[]): void;
    /**
     * Get a specific tool by server and tool name
     */
    getTool(serverName: string, toolName: string): MCPTool | undefined;
    /**
     * Get all tools for a specific server
     */
    getTools(serverName: string): MCPTool[];
    /**
     * Check if a tool exists
     */
    hasTool(serverName: string, toolName: string): boolean;
    /**
     * Clear all registered tools
     */
    clear(): void;
    /**
     * Get all registered server names
     */
    getServerNames(): string[];
    /**
     * Remove all tools for a specific server
     */
    unregisterServer(serverName: string): boolean;
    /**
     * Get total tool count across all servers
     */
    getToolCount(): number;
}
//# sourceMappingURL=tool-registry.d.ts.map