/**
 * OpenClaw 0xRay Hooks Integration
 *
 * Integrates OpenClaw with 0xRay's tool.before and tool.after hooks
 * to send tool execution events to OpenClaw Gateway.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { OpenClawClient } from '../client.js';
/**
 * Hooks configuration
 */
export interface OpenClawHooksConfig {
    enabled: boolean;
    toolBefore: boolean;
    toolAfter: boolean;
    includeArgs: boolean;
    includeResult: boolean;
    toolFilter?: string[];
}
/**
 * 0xRay tool event
 */
export interface StringRayToolEvent {
    toolName: string;
    toolId: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
    duration: number;
    timestamp: number;
    sessionId?: string;
    agent?: string;
}
/**
 * Hook event callback type
 */
export type ToolEventCallback = (event: StringRayToolEvent) => void | Promise<void>;
/**
 * OpenClaw Hooks Manager
 */
export declare class OpenClawHooksManager {
    private client;
    private config;
    private initialized;
    private toolBeforeCallbacks;
    private toolAfterCallbacks;
    private logger;
    private eventQueue;
    private maxQueueSize;
    private isFlushing;
    constructor(config: OpenClawHooksConfig);
    /**
     * Set the OpenClaw client
     */
    setClient(client: OpenClawClient): void;
    /**
     * Initialize hooks - registers with 0xRay's event system
     */
    initialize(): Promise<void>;
    /**
     * Register a callback for tool.before events
     * Call this to connect to 0xRay's tool.before event system
     */
    registerToolBefore(callback: ToolEventCallback): void;
    /**
     * Unregister a tool.before callback
     */
    unregisterToolBefore(callback: ToolEventCallback): void;
    /**
     * Register a callback for tool.after events
     * Call this to connect to 0xRay's tool.after event system
     */
    registerToolAfter(callback: ToolEventCallback): void;
    /**
     * Unregister a tool.after callback
     */
    unregisterToolAfter(callback: ToolEventCallback): void;
    /**
     * Handle tool.before event from 0xRay
     */
    onToolBefore(event: StringRayToolEvent): Promise<void>;
    /**
     * Handle tool.after event from 0xRay
     */
    onToolAfter(event: StringRayToolEvent): Promise<void>;
    /**
     * Queue an event for later delivery when connection is restored
     */
    private queueEvent;
    /**
     * Flush queued events to OpenClaw Gateway
     */
    private flushEventQueue;
    /**
     * Get the current queue size
     */
    getQueueSize(): number;
    /**
     * Called when client reconnects - flush the event queue
     */
    handleReconnect(): Promise<void>;
    /**
     * Shutdown hooks
     */
    shutdown(): Promise<void>;
    /**
     * Check if hooks are initialized
     */
    isInitialized(): boolean;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<OpenClawHooksConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): OpenClawHooksConfig;
}
/**
 * Factory function to create hooks manager
 */
export declare function createOpenClawHooksManager(config: OpenClawHooksConfig): OpenClawHooksManager;
//# sourceMappingURL=strray-hooks.d.ts.map