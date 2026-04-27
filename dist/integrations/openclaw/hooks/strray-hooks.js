/**
 * OpenClaw 0xRay Hooks Integration
 *
 * Integrates OpenClaw with 0xRay's tool.before and tool.after hooks
 * to send tool execution events to OpenClaw Gateway.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
/**
 * OpenClaw Hooks Manager
 */
export class OpenClawHooksManager {
    client = null;
    config;
    initialized = false;
    toolBeforeCallbacks = new Set();
    toolAfterCallbacks = new Set();
    logger;
    // Offline event buffering
    eventQueue = [];
    maxQueueSize = 100;
    isFlushing = false;
    constructor(config) {
        this.config = {
            enabled: config.enabled ?? true,
            toolBefore: config.toolBefore ?? true,
            toolAfter: config.toolAfter ?? true,
            includeArgs: config.includeArgs ?? true,
            includeResult: config.includeResult ?? true,
            ...(config.toolFilter ? { toolFilter: config.toolFilter } : {}),
        };
        this.logger = console;
    }
    /**
     * Set the OpenClaw client
     */
    setClient(client) {
        this.client = client;
    }
    /**
     * Initialize hooks - registers with 0xRay's event system
     */
    async initialize() {
        if (this.initialized) {
            this.logger.warn('[OpenClawHooks] Already initialized');
            return;
        }
        if (!this.config.enabled) {
            this.logger.info('[OpenClawHooks] Hooks disabled in configuration');
            return;
        }
        this.logger.info('[OpenClawHooks] Initializing 0xRay tool hooks...');
        // Register with 0xRay's event system
        // The integration should call registerToolBefore and registerToolAfter
        // to connect to 0xRay's actual tool execution events
        this.initialized = true;
        this.logger.info('[OpenClawHooks] Hooks initialized successfully');
    }
    /**
     * Register a callback for tool.before events
     * Call this to connect to 0xRay's tool.before event system
     */
    registerToolBefore(callback) {
        this.toolBeforeCallbacks.add(callback);
    }
    /**
     * Unregister a tool.before callback
     */
    unregisterToolBefore(callback) {
        this.toolBeforeCallbacks.delete(callback);
    }
    /**
     * Register a callback for tool.after events
     * Call this to connect to 0xRay's tool.after event system
     */
    registerToolAfter(callback) {
        this.toolAfterCallbacks.add(callback);
    }
    /**
     * Unregister a tool.after callback
     */
    unregisterToolAfter(callback) {
        this.toolAfterCallbacks.delete(callback);
    }
    /**
     * Handle tool.before event from 0xRay
     */
    async onToolBefore(event) {
        if (!this.config.enabled || !this.config.toolBefore) {
            return;
        }
        // Filter by tool name if configured
        if (this.config.toolFilter && !this.config.toolFilter.includes(event.toolName)) {
            return;
        }
        try {
            const hookEvent = {
                eventType: 'tool.before',
                toolName: event.toolName,
                toolId: event.toolId,
                args: this.config.includeArgs ? event.args : {},
                duration: event.duration,
                timestamp: event.timestamp,
                ...(event.sessionId !== undefined ? { sessionId: event.sessionId } : {}),
                ...(event.agent !== undefined ? { agent: event.agent } : {}),
            };
            // Send to OpenClaw if connected, otherwise queue
            if (this.client?.isConnected()) {
                await this.client.sendRequest('event.tool.before', hookEvent);
                // Try to flush any queued events
                await this.flushEventQueue();
            }
            else {
                // Queue event for later when connection is restored
                this.queueEvent('tool.before', hookEvent);
            }
            // Also notify registered callbacks
            for (const callback of this.toolBeforeCallbacks) {
                try {
                    await callback(event);
                }
                catch (error) {
                    this.logger.error('[OpenClawHooks] Callback error in tool.before:', error);
                }
            }
            this.logger.debug(`[OpenClawHooks] tool.before: ${event.toolName}`);
        }
        catch (error) {
            this.logger.error('[OpenClawHooks] Error handling tool.before:', error);
        }
    }
    /**
     * Handle tool.after event from 0xRay
     */
    async onToolAfter(event) {
        if (!this.config.enabled || !this.config.toolAfter) {
            return;
        }
        // Filter by tool name if configured
        if (this.config.toolFilter && !this.config.toolFilter.includes(event.toolName)) {
            return;
        }
        try {
            const hookEvent = {
                eventType: 'tool.after',
                toolName: event.toolName,
                toolId: event.toolId,
                args: this.config.includeArgs ? event.args : {},
                result: this.config.includeResult ? event.result : undefined,
                ...(event.error ? { error: event.error } : {}),
                success: !event.error,
                duration: event.duration,
                timestamp: event.timestamp,
                ...(event.sessionId !== undefined ? { sessionId: event.sessionId } : {}),
                ...(event.agent !== undefined ? { agent: event.agent } : {}),
            };
            // Send to OpenClaw if connected, otherwise queue
            if (this.client?.isConnected()) {
                await this.client.sendRequest('event.tool.after', hookEvent);
                // Try to flush any queued events
                await this.flushEventQueue();
            }
            else {
                // Queue event for later when connection is restored
                this.queueEvent('tool.after', hookEvent);
            }
            // Also notify registered callbacks
            for (const callback of this.toolAfterCallbacks) {
                try {
                    await callback(event);
                }
                catch (error) {
                    this.logger.error('[OpenClawHooks] Callback error in tool.after:', error);
                }
            }
            this.logger.debug(`[OpenClawHooks] tool.after: ${event.toolName} (${event.error ? 'error' : 'success'})`);
        }
        catch (error) {
            this.logger.error('[OpenClawHooks] Error handling tool.after:', error);
        }
    }
    /**
     * Queue an event for later delivery when connection is restored
     */
    queueEvent(type, event) {
        if (this.eventQueue.length >= this.maxQueueSize) {
            // Remove oldest event to make room
            this.eventQueue.shift();
            this.logger.warn('[OpenClawHooks] Event queue full, dropping oldest event');
        }
        this.eventQueue.push({ type, event });
        this.logger.debug(`[OpenClawHooks] Queued ${type} event (queue size: ${this.eventQueue.length})`);
    }
    /**
     * Flush queued events to OpenClaw Gateway
     */
    async flushEventQueue() {
        if (this.isFlushing || !this.client?.isConnected() || this.eventQueue.length === 0) {
            return;
        }
        this.isFlushing = true;
        const queue = [...this.eventQueue];
        this.eventQueue.length = 0;
        try {
            for (const item of queue) {
                try {
                    if (item.type === 'tool.before') {
                        await this.client.sendRequest('event.tool.before', item.event);
                    }
                    else {
                        await this.client.sendRequest('event.tool.after', item.event);
                    }
                }
                catch (error) {
                    this.logger.error(`[OpenClawHooks] Failed to send queued ${item.type} event:`, error);
                    // Re-queue failed events
                    this.eventQueue.push(item);
                }
            }
            this.logger.info(`[OpenClawHooks] Flushed ${queue.length} queued events`);
        }
        finally {
            this.isFlushing = false;
        }
    }
    /**
     * Get the current queue size
     */
    getQueueSize() {
        return this.eventQueue.length;
    }
    /**
     * Called when client reconnects - flush the event queue
     */
    async handleReconnect() {
        if (this.eventQueue.length > 0) {
            this.logger.info(`[OpenClawHooks] Client reconnected, flushing ${this.eventQueue.length} queued events...`);
            await this.flushEventQueue();
        }
    }
    /**
     * Shutdown hooks
     */
    async shutdown() {
        // Clear the event queue on shutdown
        const queuedCount = this.eventQueue.length;
        this.eventQueue.length = 0;
        this.initialized = false;
        this.client = null;
        this.logger.info(`[OpenClawHooks] Hooks shutdown complete (${queuedCount} queued events dropped)`);
    }
    /**
     * Check if hooks are initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config,
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Factory function to create hooks manager
 */
export function createOpenClawHooksManager(config) {
    return new OpenClawHooksManager(config);
}
//# sourceMappingURL=strray-hooks.js.map