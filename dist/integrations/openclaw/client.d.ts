/**
 * OpenClaw WebSocket Client
 *
 * Implements OpenClaw Gateway Protocol v3 with proper request/response handling,
 * reconnection logic, and event management.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { OpenClawClientConfig, OpenClawClientState, ClientStatistics } from './types.js';
/**
 * OpenClaw WebSocket Client
 */
export declare class OpenClawClient {
    private ws;
    private config;
    private state;
    private pendingRequests;
    private eventListeners;
    private stateListeners;
    private reconnectAttempts;
    private reconnectTimeout;
    private pingInterval;
    private stats;
    private logger;
    constructor(config: OpenClawClientConfig);
    /**
     * Connect to OpenClaw Gateway
     */
    connect(): Promise<void>;
    /**
     * Disconnect from OpenClaw Gateway
     */
    disconnect(): void;
    /**
     * Send request and wait for response
     */
    sendRequest<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
    /**
     * Subscribe to events
     */
    subscribeToEvents(events: string[]): Promise<void>;
    /**
     * Get current state
     */
    getState(): OpenClawClientState;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get statistics
     */
    getStats(): ClientStatistics;
    /**
     * Add event listener
     */
    on(event: string, listener: Function): void;
    /**
     * Remove event listener
     */
    off(event: string, listener: Function): void;
    /**
     * Add state change listener
     */
    onStateChange(listener: Function): void;
    /**
     * Remove state change listener
     */
    offStateChange(listener: Function): void;
    /**
     * Send handshake on connect
     */
    private sendHandshake;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Handle response frame
     */
    private handleResponse;
    /**
     * Handle event frame
     */
    private handleEvent;
    /**
     * Handle disconnection
     */
    private handleDisconnect;
    /**
     * Schedule reconnection
     */
    private scheduleReconnect;
    /**
     * Start ping interval for connection health
     */
    private startPingInterval;
    /**
     * Set client state
     */
    private setState;
    /**
     * Generate unique ID for requests
     */
    private generateId;
    /**
     * Generate nonce for device pairing
     */
    private generateNonce;
    /**
     * Sign device challenge
     */
    private signDeviceChallenge;
}
/**
 * Factory function to create client
 */
export declare function createOpenClawClient(config: OpenClawClientConfig): OpenClawClient;
//# sourceMappingURL=client.d.ts.map