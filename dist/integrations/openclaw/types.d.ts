/**
 * OpenClaw Integration Types
 *
 * TypeScript interfaces for OpenClaw Gateway Protocol v3
 * and 0xRay integration components.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
/**
 * OpenClaw WebSocket connection handshake parameters
 */
export interface OpenClawConnectParams {
    minProtocol: number;
    maxProtocol: number;
    client: {
        id: string;
        version: string;
        platform: string;
        mode: 'operator' | 'node';
    };
    role: 'operator' | 'node';
    scopes: string[];
    caps: string[];
    commands: string[];
    permissions?: Record<string, boolean>;
    auth?: {
        token?: string;
    };
    device?: {
        id: string;
        publicKey: string;
        signature: string;
        signedAt: number;
        nonce: string;
    };
    locale?: string;
    userAgent: string;
}
/**
 * OpenClaw WebSocket frame - Request (client → server)
 */
export interface OpenClawFrameRequest {
    type: 'req';
    id: string;
    method: string;
    params: Record<string, unknown>;
}
/**
 * OpenClaw WebSocket frame - Response (server → client)
 */
export interface OpenClawFrameResponse {
    type: 'res';
    id: string;
    ok: boolean;
    result?: unknown;
    error?: {
        code: string;
        message: string;
    };
}
/**
 * OpenClaw WebSocket frame - Event (server → client)
 */
export interface OpenClawFrameEvent {
    type: 'event';
    event: string;
    data?: Record<string, unknown>;
    seq?: number;
    stateVersion?: string;
}
/**
 * Union type for all OpenClaw frame types
 */
export type OpenClawFrame = OpenClawFrameRequest | OpenClawFrameResponse | OpenClawFrameEvent;
/**
 * OpenClaw client connection states
 */
export type OpenClawClientState = 'disconnected' | 'connecting' | 'connected' | 'authenticating' | 'authorized' | 'reconnecting' | 'error';
/**
 * Pending request for request/response handling
 */
export interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: NodeJS.Timeout;
    timestamp: number;
}
/**
 * Client configuration options
 */
export interface OpenClawClientConfig {
    gatewayUrl: string;
    authToken?: string | undefined;
    deviceId?: string | undefined;
    deviceKeyPair?: {
        publicKey: string;
        privateKey: string;
    } | undefined;
    reconnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    pingInterval?: number;
    requestTimeout?: number;
}
/**
 * 0xRay API server configuration
 */
export interface StringRayAPIServerConfig {
    port: number;
    host?: string;
    apiKey?: string;
    cors?: boolean;
    rateLimit?: {
        windowMs: number;
        maxRequests: number;
    };
}
/**
 * Agent invocation request from OpenClaw skill
 */
export interface AgentInvokeRequest {
    command: string;
    args?: Record<string, unknown>;
    sessionId?: string;
    agent?: string;
    timeout?: number;
}
/**
 * Agent invocation response
 */
export interface AgentInvokeResponse {
    success: boolean;
    result?: unknown;
    error?: string;
    sessionId?: string;
    executionTime?: number;
}
/**
 * Health check response
 */
export interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    openclaw?: {
        connected: boolean;
        state: OpenClawClientState;
    };
}
/**
 * API route definitions
 */
export interface APIRoute {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    handler: (req: Request, res: Response) => Promise<void>;
    requiresAuth?: boolean;
}
/**
 * OpenClaw Skill metadata (SKILL.md frontmatter)
 */
export interface OpenClawSkillMetadata {
    name: string;
    description: string;
    version?: string;
    metadata?: {
        openclaw?: {
            requires?: {
                bins?: string[];
                env?: string[];
                config?: string[];
            };
            primaryEnv?: string;
            emoji?: string;
        };
        author?: string;
        tags?: string[];
    };
    userInvocable?: boolean;
    commands?: SkillCommand[];
}
/**
 * Skill command definition
 */
export interface SkillCommand {
    name: string;
    description: string;
    usage?: string;
    examples?: string[];
    requiresAuth?: boolean;
}
/**
 * Skill command execution request
 */
export interface SkillExecutionRequest {
    command: string;
    args: Record<string, unknown>;
    userId?: string;
    sessionId?: string;
    channel?: string;
}
/**
 * Skill command execution response
 */
export interface SkillExecutionResponse {
    success: boolean;
    output?: string;
    error?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Tool execution event from 0xRay
 */
export interface ToolExecutionEvent {
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
 * Tool before execution event
 */
export interface ToolBeforeEvent extends ToolExecutionEvent {
    eventType: 'tool.before';
}
/**
 * Tool after execution event
 */
export interface ToolAfterEvent extends ToolExecutionEvent {
    eventType: 'tool.after';
    success: boolean;
}
/**
 * Tool event subscription options
 */
export interface ToolEventSubscription {
    toolNames?: string[];
    includeArgs?: boolean;
    includeResult?: boolean;
    includeMetadata?: boolean;
}
/**
 * Complete OpenClaw integration configuration
 */
export interface OpenClawIntegrationConfig {
    gatewayUrl: string;
    authToken?: string;
    deviceId?: string;
    deviceKeyPair?: {
        publicKey: string;
        privateKey: string;
    };
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    apiServer: {
        enabled: boolean;
        port: number;
        host?: string;
        apiKey?: string;
    };
    hooks: {
        enabled: boolean;
        toolBefore: boolean;
        toolAfter: boolean;
        includeArgs: boolean;
        includeResult: boolean;
        toolFilter?: string[];
    };
    enabled: boolean;
    debug: boolean;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
}
/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
    valid: boolean;
    errors: ConfigValidationError[];
    warnings: ConfigValidationWarning[];
}
export interface ConfigValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ConfigValidationWarning {
    field: string;
    message: string;
}
/**
 * OpenClaw integration error codes
 */
export declare enum OpenClawErrorCode {
    CONNECTION_FAILED = "CONNECTION_FAILED",
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
    AUTH_FAILED = "AUTH_FAILED",
    TOKEN_MISMATCH = "TOKEN_MISMATCH",
    DEVICE_NOT_PAIRED = "DEVICE_NOT_PAIRED",
    INVALID_FRAME = "INVALID_FRAME",
    UNSUPPORTED_METHOD = "UNSUPPORTED_METHOD",
    OUT_OF_SCOPE = "OUT_OF_SCOPE",
    PROTOCOL_VERSION_MISMATCH = "PROTOCOL_VERSION_MISMATCH",
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
    REQUEST_CANCELLED = "REQUEST_CANCELLED",
    SERVER_ERROR = "SERVER_ERROR",
    SERVER_UNAVAILABLE = "SERVER_UNAVAILABLE",
    SKILL_NOT_FOUND = "SKILL_NOT_FOUND",
    SKILL_LOAD_FAILED = "SKILL_LOAD_FAILED",
    SKILL_EXECUTION_FAILED = "SKILL_EXECUTION_FAILED",
    STRINGRAY_UNAVAILABLE = "STRINGRAY_UNAVAILABLE",
    STRINGRAY_TIMEOUT = "STRINGRAY_TIMEOUT",
    STRINGRAY_ERROR = "STRINGRAY_ERROR",
    CONFIG_INVALID = "CONFIG_INVALID",
    CONFIG_MISSING = "CONFIG_MISSING",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * Base error class for OpenClaw integration
 */
export declare class OpenClawError extends Error {
    code: OpenClawErrorCode;
    recoverable: boolean;
    context?: Record<string, unknown> | undefined;
    constructor(message: string, code: OpenClawErrorCode, recoverable: boolean, context?: Record<string, unknown> | undefined);
}
/**
 * Connection error
 */
export declare class OpenClawConnectionError extends OpenClawError {
    originalError?: Error | undefined;
    constructor(message: string, originalError?: Error | undefined);
}
/**
 * Authentication error
 */
export declare class OpenClawAuthError extends OpenClawError {
    authType?: "token" | "device" | undefined;
    constructor(message: string, authType?: "token" | "device" | undefined);
}
/**
 * Request timeout error
 */
export declare class OpenClawTimeoutError extends OpenClawError {
    method: string;
    timeout: number;
    constructor(method: string, timeout: number);
}
/**
 * Configuration error
 */
export declare class OpenClawConfigError extends OpenClawError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
/**
 * Check if frame is a request frame
 */
export declare function isOpenClawRequest(frame: unknown): frame is OpenClawFrameRequest;
/**
 * Check if frame is a response frame
 */
export declare function isOpenClawResponse(frame: unknown): frame is OpenClawFrameResponse;
/**
 * Check if frame is an event frame
 */
export declare function isOpenClawEvent(frame: unknown): frame is OpenClawFrameEvent;
/**
 * Check if error is recoverable
 */
export declare function isRecoverableError(error: OpenClawError): boolean;
/**
 * Client statistics
 */
export interface ClientStatistics {
    connectedAt?: number;
    lastMessageAt?: number;
    messagesSent: number;
    messagesReceived: number;
    requestsSent: number;
    requestsSucceeded: number;
    requestsFailed: number;
    reconnects: number;
    errors: number;
}
/**
 * API server statistics
 */
export interface APIServerStatistics {
    startedAt: number;
    requestsTotal: number;
    requestsByEndpoint: Record<string, number>;
    requestsByStatus: Record<number, number>;
    averageResponseTime: number;
    errors: number;
}
/**
 * Integration statistics
 */
export interface IntegrationStatistics {
    client: ClientStatistics;
    apiServer: APIServerStatistics;
    uptime: number;
}
/**
 * OpenClaw client events
 */
export type OpenClawClientEvent = 'connecting' | 'connected' | 'disconnected' | 'authorized' | 'reconnecting' | 'error' | 'frame' | 'event';
/**
 * Client event listener type
 */
export type OpenClawEventListener = (data?: unknown) => void | Promise<void>;
/**
 * State change event
 */
export interface StateChangeEvent {
    previousState: OpenClawClientState;
    newState: OpenClawClientState;
    timestamp: number;
}
//# sourceMappingURL=types.d.ts.map