/**
 * OpenClaw Integration Types
 *
 * TypeScript interfaces for OpenClaw Gateway Protocol v3
 * and 0xRay integration components.
 *
 * @version 1.0.0
 * @since 2026-03-14
 */
// ============================================================================
// Error Types
// ============================================================================
/**
 * OpenClaw integration error codes
 */
export var OpenClawErrorCode;
(function (OpenClawErrorCode) {
    // Connection errors
    OpenClawErrorCode["CONNECTION_FAILED"] = "CONNECTION_FAILED";
    OpenClawErrorCode["CONNECTION_TIMEOUT"] = "CONNECTION_TIMEOUT";
    OpenClawErrorCode["AUTH_FAILED"] = "AUTH_FAILED";
    OpenClawErrorCode["TOKEN_MISMATCH"] = "TOKEN_MISMATCH";
    OpenClawErrorCode["DEVICE_NOT_PAIRED"] = "DEVICE_NOT_PAIRED";
    // Protocol errors
    OpenClawErrorCode["INVALID_FRAME"] = "INVALID_FRAME";
    OpenClawErrorCode["UNSUPPORTED_METHOD"] = "UNSUPPORTED_METHOD";
    OpenClawErrorCode["OUT_OF_SCOPE"] = "OUT_OF_SCOPE";
    OpenClawErrorCode["PROTOCOL_VERSION_MISMATCH"] = "PROTOCOL_VERSION_MISMATCH";
    // Request errors
    OpenClawErrorCode["REQUEST_TIMEOUT"] = "REQUEST_TIMEOUT";
    OpenClawErrorCode["REQUEST_CANCELLED"] = "REQUEST_CANCELLED";
    // Server errors
    OpenClawErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    OpenClawErrorCode["SERVER_UNAVAILABLE"] = "SERVER_UNAVAILABLE";
    // Skill errors
    OpenClawErrorCode["SKILL_NOT_FOUND"] = "SKILL_NOT_FOUND";
    OpenClawErrorCode["SKILL_LOAD_FAILED"] = "SKILL_LOAD_FAILED";
    OpenClawErrorCode["SKILL_EXECUTION_FAILED"] = "SKILL_EXECUTION_FAILED";
    // 0xRay errors
    OpenClawErrorCode["STRINGRAY_UNAVAILABLE"] = "STRINGRAY_UNAVAILABLE";
    OpenClawErrorCode["STRINGRAY_TIMEOUT"] = "STRINGRAY_TIMEOUT";
    OpenClawErrorCode["STRINGRAY_ERROR"] = "STRINGRAY_ERROR";
    // Configuration errors
    OpenClawErrorCode["CONFIG_INVALID"] = "CONFIG_INVALID";
    OpenClawErrorCode["CONFIG_MISSING"] = "CONFIG_MISSING";
    // Unknown
    OpenClawErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(OpenClawErrorCode || (OpenClawErrorCode = {}));
/**
 * Base error class for OpenClaw integration
 */
export class OpenClawError extends Error {
    code;
    recoverable;
    context;
    constructor(message, code, recoverable, context) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.context = context;
        this.name = 'OpenClawError';
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Connection error
 */
export class OpenClawConnectionError extends OpenClawError {
    originalError;
    constructor(message, originalError) {
        super(message, OpenClawErrorCode.CONNECTION_FAILED, true, {
            originalError: originalError?.message,
        });
        this.originalError = originalError;
        this.name = 'OpenClawConnectionError';
    }
}
/**
 * Authentication error
 */
export class OpenClawAuthError extends OpenClawError {
    authType;
    constructor(message, authType) {
        super(message, OpenClawErrorCode.AUTH_FAILED, false, { authType });
        this.authType = authType;
        this.name = 'OpenClawAuthError';
    }
}
/**
 * Request timeout error
 */
export class OpenClawTimeoutError extends OpenClawError {
    method;
    timeout;
    constructor(method, timeout) {
        super(`Request to ${method} timed out after ${timeout}ms`, OpenClawErrorCode.REQUEST_TIMEOUT, true, {
            method,
            timeout,
        });
        this.method = method;
        this.timeout = timeout;
        this.name = 'OpenClawTimeoutError';
    }
}
/**
 * Configuration error
 */
export class OpenClawConfigError extends OpenClawError {
    field;
    constructor(message, field) {
        super(message, OpenClawErrorCode.CONFIG_INVALID, false, { field });
        this.field = field;
        this.name = 'OpenClawConfigError';
    }
}
// ============================================================================
// Type Guards
// ============================================================================
/**
 * Check if frame is a request frame
 */
export function isOpenClawRequest(frame) {
    return (typeof frame === 'object' &&
        frame !== null &&
        frame.type === 'req' &&
        typeof frame.id === 'string' &&
        typeof frame.method === 'string');
}
/**
 * Check if frame is a response frame
 */
export function isOpenClawResponse(frame) {
    return (typeof frame === 'object' &&
        frame !== null &&
        frame.type === 'res' &&
        typeof frame.id === 'string' &&
        typeof frame.ok === 'boolean');
}
/**
 * Check if frame is an event frame
 */
export function isOpenClawEvent(frame) {
    return (typeof frame === 'object' &&
        frame !== null &&
        frame.type === 'event' &&
        typeof frame.event === 'string');
}
/**
 * Check if error is recoverable
 */
export function isRecoverableError(error) {
    return error.recoverable;
}
//# sourceMappingURL=types.js.map