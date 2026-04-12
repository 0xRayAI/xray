/**
 * MCP Client Layer
 *
 * Enables framework components to call MCP servers programmatically.
 * Refactored as a lean facade using extracted modules (Phases 1-5).
 *
 * Architecture:
 * - ToolRegistry: Manages tool registration and lookup
 * - ToolDiscovery: Discovers tools from MCP servers
 * - ToolExecutor: Executes tools via JSON-RPC
 * - ToolCache: Caches discovered tools
 * - SimulationEngine: Provides fallback simulations
 */
import { EventEmitter } from 'events';
import { MCPClientConfig, MCPTool, MCPToolResult } from './types/index.js';
interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}
/**
 * Tool event types for hooks
 */
export interface ToolBeforeEvent {
    toolName: string;
    serverName: string;
    args: unknown;
    timestamp: number;
}
export interface ToolAfterEvent extends ToolBeforeEvent {
    result?: MCPToolResult;
    error?: string;
    duration: number;
    success: boolean;
}
/**
 * MCP Client
 *
 * Facade that orchestrates tool discovery, caching, execution, and simulation.
 */
export declare class MCPClient extends EventEmitter {
    private config;
    private toolRegistry;
    private toolDiscovery;
    private toolExecutor;
    private toolCache;
    private simulationEngine;
    private retryConfig;
    constructor(config: MCPClientConfig, retryConfig?: Partial<RetryConfig>);
    /**
     * Execute with exponential backoff retry
     */
    private executeWithRetry;
    /**
     * Register default simulation implementations
     */
    private registerDefaultSimulations;
    /**
     * Initialize MCP client by discovering and caching tools
     */
    initialize(): Promise<void>;
    /**
     * Discover available tools for this server
     */
    private discoverTools;
    /**
     * Get static tool definitions for a server
     */
    private getStaticTools;
    /**
     * Call a specific MCP server tool
     */
    callTool(toolName: string, args?: unknown): Promise<MCPToolResult>;
    /**
     * Get list of available tools
     */
    getAvailableTools(): MCPTool[];
    /**
     * Check if a tool is available
     */
    hasTool(toolName: string): boolean;
    /**
     * Get tool by name
     */
    getTool(toolName: string): MCPTool | undefined;
    /**
     * Subscribe to tool.before events
     */
    onToolBefore(callback: (event: ToolBeforeEvent) => void): void;
    /**
     * Subscribe to tool.after events
     */
    onToolAfter(callback: (event: ToolAfterEvent) => void): void;
    /**
     * Unsubscribe from tool.before events
     */
    offToolBefore(callback: (event: ToolBeforeEvent) => void): void;
    /**
     * Unsubscribe from tool.after events
     */
    offToolAfter(callback: (event: ToolAfterEvent) => void): void;
}
/**
 * MCP Client Manager
 *
 * Manages MCP client instances and provides unified interface
 * for framework components to access MCP server capabilities.
 */
export declare class MCPClientManager {
    private static instance;
    private clients;
    private constructor();
    static getInstance(): MCPClientManager;
    /**
     * Get or create MCP client for a server
     */
    getClient(serverName: string): Promise<MCPClient>;
    /**
     * Get the event emitter for a specific client
     * Use this to subscribe to tool.before/tool.after events
     */
    getClientEventEmitter(serverName: string): MCPClient | null;
    /**
     * Subscribe to tool events across all clients
     * Note: This creates a subscription for each client - manage subscriptions carefully
     * @returns Unsubscribe function to call to remove all event listeners
     */
    onToolEvent(eventType: 'tool.before' | 'tool.after', callback: (event: ToolBeforeEvent | ToolAfterEvent) => void): Promise<() => void>;
    /**
     * Create client configuration for a server
     */
    createClientConfig(serverName: string): MCPClientConfig;
    /**
     * Call MCP server tool
     */
    callServerTool(serverName: string, toolName: string, args?: unknown): Promise<MCPToolResult>;
    /**
     * Get all available MCP server tools
     */
    getAllAvailableTools(): Promise<Record<string, MCPTool[]>>;
    /**
     * Clear all cached clients
     */
    clearClients(): void;
}
export declare const mcpClientManager: MCPClientManager;
export {};
//# sourceMappingURL=mcp-client.d.ts.map