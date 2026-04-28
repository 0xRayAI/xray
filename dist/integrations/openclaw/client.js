/**
 * OpenClaw WebSocket Client
 *
 * Implements OpenClaw Gateway Protocol v3 with proper request/response handling,
 * reconnection logic, and event management.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
import { WebSocket } from 'ws';
import * as crypto from 'crypto';
import { isOpenClawResponse, isOpenClawEvent, OpenClawTimeoutError, OpenClawConnectionError, } from './types.js';
/**
 * OpenClaw WebSocket Client
 */
export class OpenClawClient {
    ws = null;
    config;
    state = 'disconnected';
    pendingRequests = new Map();
    eventListeners = new Map();
    stateListeners = new Set();
    reconnectAttempts = 0;
    reconnectTimeout = null;
    pingInterval = null;
    stats = {
        messagesSent: 0,
        messagesReceived: 0,
        requestsSent: 0,
        requestsSucceeded: 0,
        requestsFailed: 0,
        reconnects: 0,
        errors: 0,
    };
    logger;
    constructor(config) {
        this.config = {
            gatewayUrl: config.gatewayUrl || 'ws://127.0.0.1:18789',
            authToken: config.authToken || '',
            deviceId: config.deviceId || '',
            deviceKeyPair: config.deviceKeyPair || { publicKey: '', privateKey: '' },
            reconnect: config.reconnect ?? true,
            reconnectAttempts: config.reconnectAttempts ?? 5,
            reconnectDelay: config.reconnectDelay ?? 1000,
            pingInterval: config.pingInterval ?? 30000,
            requestTimeout: config.requestTimeout ?? 30000,
        };
        // Use console but can be replaced with proper logger
        this.logger = console;
    }
    /**
     * Connect to OpenClaw Gateway
     */
    handshakeResolve = null;
    handshakeReject = null;
    _handshakeTimeout = null;
    async connect() {
        if (this.state === 'connected' || this.state === 'authenticating') {
            this.logger.warn('[OpenClawClient] Already connected or connecting');
            return;
        }
        this.setState('connecting');
        this._handshakeTimeout = setTimeout(() => {
            if (this.handshakeReject) {
                this.handshakeReject(new OpenClawConnectionError('Handshake timeout — gateway never sent connect.challenge'));
                this.handshakeResolve = null;
                this.handshakeReject = null;
            }
        }, 10000);
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.gatewayUrl);
                this.ws.on('open', () => {
                    this.logger.info('[OpenClawClient] WebSocket connected, waiting for challenge...');
                    this.handshakeResolve = resolve;
                    this.handshakeReject = reject;
                });
                this.ws.on('message', (data) => {
                    const message = typeof data === 'string' ? data : String(data);
                    this.handleMessage(message);
                });
                this.ws.on('close', (code, reason) => {
                    this.logger.info(`[OpenClawClient] Connection closed: ${code} ${String(reason)}`);
                    this.handleDisconnect(Number(code), String(reason));
                });
                this.ws.on('error', (error) => {
                    this.logger.error('[OpenClawClient] WebSocket error:', error instanceof Error ? error.message : String(error));
                    this.stats.errors++;
                    if (this.state === 'connecting') {
                        reject(new OpenClawConnectionError(`Failed to connect to ${this.config.gatewayUrl}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined));
                    }
                });
                this.ws.on('ping', () => {
                    this.logger.debug('[OpenClawClient] Received ping');
                });
                this.ws.on('pong', () => {
                    this.logger.debug('[OpenClawClient] Received pong');
                });
            }
            catch (error) {
                this.setState('error');
                reject(new OpenClawConnectionError('Failed to create WebSocket connection', error));
            }
        });
    }
    /**
     * Disconnect from OpenClaw Gateway
     */
    disconnect() {
        this.logger.info('[OpenClawClient] Disconnecting...');
        if (this._handshakeTimeout) {
            clearTimeout(this._handshakeTimeout);
            this._handshakeTimeout = null;
        }
        // Clear reconnection
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        // Reject pending requests
        for (const [id, request] of this.pendingRequests.entries()) {
            clearTimeout(request.timeout);
            request.reject(new Error('Connection closed'));
            this.pendingRequests.delete(id);
        }
        // Close WebSocket
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
        }
        this.setState('disconnected');
    }
    /**
     * Send request and wait for response
     */
    async sendRequest(method, params = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to OpenClaw Gateway');
        }
        const id = this.generateId();
        const frame = {
            type: 'req',
            id,
            method,
            params,
        };
        this.logger.debug(`[OpenClawClient] Sending request: ${method} (${id})`);
        this.stats.requestsSent++;
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                this.stats.requestsFailed++;
                reject(new OpenClawTimeoutError(method, this.config.requestTimeout));
            }, this.config.requestTimeout);
            // Store pending request
            this.pendingRequests.set(id, {
                resolve: (value) => {
                    clearTimeout(timeout);
                    this.stats.requestsSucceeded++;
                    resolve(value);
                },
                reject: (reason) => {
                    clearTimeout(timeout);
                    this.stats.requestsFailed++;
                    reject(reason);
                },
                timeout,
                timestamp: Date.now(),
            });
            // Send frame
            try {
                this.ws.send(JSON.stringify(frame));
                this.stats.messagesSent++;
            }
            catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                this.stats.errors++;
                reject(error);
            }
        });
    }
    /**
     * Subscribe to events
     */
    async subscribeToEvents(events) {
        await this.sendRequest('events.subscribe', { events });
    }
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.state === 'connected' || this.state === 'authorized';
    }
    /**
     * Get statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Add event listener
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(listener);
    }
    /**
     * Remove event listener
     */
    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    /**
     * Add state change listener
     */
    onStateChange(listener) {
        this.stateListeners.add(listener);
    }
    /**
     * Remove state change listener
     */
    offStateChange(listener) {
        this.stateListeners.delete(listener);
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    /**
     * Send handshake on connect
     */
    sendHandshake() {
        const params = {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
                id: 'openclaw-tui',
                version: '1.0.0',
                platform: process.platform,
                mode: 'cli',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write', 'operator.admin'],
            caps: [],
            commands: [],
            userAgent: `OpenClaw-TUI/2026.4.25`,
        };
        // Add auth if provided
        if (this.config.authToken) {
            params.auth = { token: this.config.authToken };
        }
        // Add device if provided
        if (this.config.deviceId && this.config.deviceKeyPair) {
            params.device = {
                id: this.config.deviceId,
                publicKey: this.config.deviceKeyPair.publicKey,
                signature: this.signDeviceChallenge(this.config.deviceId),
                signedAt: Date.now(),
                nonce: this.generateNonce(),
            };
        }
        // Send connect request — gateway may send `authorized` event OR just a response
        this.sendRequest('connect', params).then(() => {
            if (this._handshakeTimeout) {
                clearTimeout(this._handshakeTimeout);
                this._handshakeTimeout = null;
            }
            this.setState('authorized');
            this.startPingInterval();
            if (this.handshakeResolve) {
                this.logger.info('[OpenClawClient] Handshake complete (connect response ok)');
                this.handshakeResolve();
                this.handshakeResolve = null;
                this.handshakeReject = null;
            }
        }).catch((error) => {
            this.logger.error('[OpenClawClient] Handshake failed:', error);
            this.setState('error');
            if (this.handshakeReject) {
                this.handshakeReject(error);
                this.handshakeResolve = null;
                this.handshakeReject = null;
            }
        });
    }
    /**
     * Handle incoming WebSocket message
     */
    handleMessage(data) {
        this.stats.messagesReceived++;
        try {
            const frame = JSON.parse(data);
            if (isOpenClawResponse(frame)) {
                this.handleResponse(frame);
            }
            else if (isOpenClawEvent(frame)) {
                this.handleEvent(frame);
            }
            else {
                this.logger.warn('[OpenClawClient] Unknown frame type:', frame);
            }
        }
        catch (error) {
            this.logger.error('[OpenClawClient] Failed to parse message:', error);
            this.stats.errors++;
        }
    }
    /**
     * Handle response frame
     */
    handleResponse(frame) {
        const pending = this.pendingRequests.get(frame.id);
        if (pending) {
            this.pendingRequests.delete(frame.id);
            if (frame.ok) {
                pending.resolve(frame.result);
            }
            else {
                const error = new Error(frame.error?.message || 'Request failed');
                error.code = frame.error?.code;
                pending.reject(error);
            }
        }
        else {
            this.logger.warn('[OpenClawClient] Received response for unknown request:', frame.id);
        }
    }
    /**
     * Handle event frame
     */
    handleEvent(frame) {
        this.logger.debug('[OpenClawClient] Event:', frame.event);
        // Handle specific events
        if (frame.event === 'connect.challenge') {
            this.logger.info('[OpenClawClient] Received challenge, sending handshake...');
            this.sendHandshake();
            return;
        }
        if (frame.event === 'authorized') {
            if (this._handshakeTimeout) {
                clearTimeout(this._handshakeTimeout);
                this._handshakeTimeout = null;
            }
            this.setState('authorized');
            this.startPingInterval();
            if (this.handshakeResolve) {
                this.handshakeResolve();
                this.handshakeResolve = null;
                this.handshakeReject = null;
            }
        }
        // Notify listeners
        const listeners = this.eventListeners.get(frame.event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(frame.data);
                }
                catch (error) {
                    this.logger.error('[OpenClawClient] Event listener error:', error);
                }
            }
        }
        // Notify all-event listeners
        const allListeners = this.eventListeners.get('*');
        if (allListeners) {
            for (const listener of allListeners) {
                try {
                    listener(frame.event, frame.data);
                }
                catch (error) {
                    this.logger.error('[OpenClawClient] All-event listener error:', error);
                }
            }
        }
    }
    /**
     * Handle disconnection
     */
    handleDisconnect(code, reason) {
        // Stop ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        // Set state
        if (this.state !== 'disconnected') {
            this.setState('disconnected');
        }
        // Attempt reconnection
        if (this.config.reconnect && this.reconnectAttempts < this.config.reconnectAttempts) {
            this.scheduleReconnect();
        }
    }
    /**
     * Schedule reconnection
     */
    scheduleReconnect() {
        if (this.reconnectTimeout) {
            return;
        }
        this.reconnectAttempts++;
        this.stats.reconnects++;
        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        const maxDelay = 30000;
        const actualDelay = Math.min(delay, maxDelay);
        this.logger.info(`[OpenClawClient] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts} in ${actualDelay}ms`);
        this.setState('reconnecting');
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect().catch((error) => {
                this.logger.error('[OpenClawClient] Reconnection failed:', error);
            });
        }, actualDelay);
    }
    /**
     * Start ping interval for connection health
     */
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, this.config.pingInterval);
    }
    /**
     * Set client state
     */
    setState(newState) {
        const previousState = this.state;
        this.state = newState;
        if (previousState !== newState) {
            this.logger.info(`[OpenClawClient] State: ${previousState} → ${newState}`);
            // Notify state listeners
            for (const listener of this.stateListeners) {
                try {
                    listener(newState, previousState);
                }
                catch (error) {
                    this.logger.error('[OpenClawClient] State listener error:', error);
                }
            }
        }
    }
    /**
     * Generate unique ID for requests
     */
    generateId() {
        return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
    /**
     * Generate nonce for device pairing
     */
    generateNonce() {
        return crypto.randomBytes(16).toString('base64');
    }
    /**
     * Sign device challenge
     */
    signDeviceChallenge(deviceId) {
        if (!this.config.deviceKeyPair) {
            return '';
        }
        const hmac = crypto.createHmac('sha256', this.config.deviceKeyPair.privateKey);
        hmac.update(deviceId);
        return hmac.digest('base64');
    }
}
/**
 * Factory function to create client
 */
export function createOpenClawClient(config) {
    return new OpenClawClient(config);
}
//# sourceMappingURL=client.js.map