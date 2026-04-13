/**
 * Activity Logger
 *
 * Comprehensive logging for all 0xRay activities including:
 * - Framework operations
 * - Development sessions
 * - Script executions
 * - File operations
 * - Test results
 *
 * Enable/Disable via:
 *   STRRAY_ACTIVITY_LOGGING=true  (enable)
 *   STRRAY_ACTIVITY_LOGGING=false (disable, default)
 *
 * @module core/activity-logger
 * @version 1.0.0
 */
export type ActivityCategory = "framework" | "development" | "script" | "file" | "test" | "commit" | "session" | "agent" | "processor" | "config";
export type ActivityLevel = "debug" | "info" | "warn" | "error" | "success";
export interface ActivityRecord {
    timestamp: string;
    id: string;
    category: ActivityCategory;
    level: ActivityLevel;
    action: string;
    message: string;
    details?: Record<string, unknown>;
    sessionId?: string;
    jobId?: string;
}
/**
 * Initialize activity logger with config from features.json
 * Called by boot-orchestrator during initialization
 */
export declare function initializeActivityLogger(config?: {
    enabled?: boolean;
    log_path?: string;
}): void;
/**
 * Check if activity logging is enabled
 */
export declare function isActivityLoggingEnabled(): boolean;
/**
 * Enable or disable activity logging
 */
export declare function setActivityLoggingEnabled(enabled: boolean): void;
/**
 * Get current session ID
 */
export declare function getSessionId(): string;
/**
 * Log an activity
 */
export declare function logActivity(category: ActivityCategory, level: ActivityLevel, action: string, message: string, details?: Record<string, unknown>, options?: {
    sessionId?: string;
    jobId?: string;
}): void;
export declare const activity: {
    framework: (action: string, message: string, details?: Record<string, unknown>) => void;
    development: (action: string, message: string, details?: Record<string, unknown>) => void;
    script: (action: string, message: string, details?: Record<string, unknown>) => void;
    file: (action: string, message: string, details?: Record<string, unknown>) => void;
    test: (action: string, message: string, details?: Record<string, unknown>) => void;
    commit: (action: string, message: string, details?: Record<string, unknown>) => void;
    session: (action: string, message: string, details?: Record<string, unknown>) => void;
    agent: (action: string, message: string, details?: Record<string, unknown>) => void;
    processor: (action: string, message: string, details?: Record<string, unknown>) => void;
    config: (action: string, message: string, details?: Record<string, unknown>) => void;
    success: (category: ActivityCategory, action: string, message: string, details?: Record<string, unknown>) => void;
    error: (category: ActivityCategory, action: string, message: string, details?: Record<string, unknown>) => void;
    warn: (category: ActivityCategory, action: string, message: string, details?: Record<string, unknown>) => void;
};
//# sourceMappingURL=activity-logger.d.ts.map