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
import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "./framework-logger.js";
// Global state
let activityLoggerEnabled = process.env.STRRAY_ACTIVITY_LOGGING !== "false";
let activityLogPath;
let sessionId;
let sessionStartTime;
/**
 * Initialize activity logger with config from features.json
 * Called by boot-orchestrator during initialization
 */
export function initializeActivityLogger(config) {
    // Allow override via config (features.json) or environment
    if (config?.enabled !== undefined) {
        activityLoggerEnabled = config.enabled;
    }
    // Use config path or default
    const logDir = config?.log_path
        ? config.log_path.replace(/\/logs$/, "")
        : path.join(process.cwd(), "logs", "framework");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    activityLogPath = path.join(logDir, "activity.log");
    // Initialize session if not already done
    if (!sessionId) {
        sessionId = generateSessionId();
        sessionStartTime = Date.now();
        initializeLogFile();
        initializeReportFile();
    }
}
/**
 * Initialize the activity logger
 */
function initialize() {
    const cwd = process.cwd();
    const logDir = path.join(cwd, "logs", "framework");
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    activityLogPath = path.join(logDir, "activity.log");
    sessionId = generateSessionId();
    sessionStartTime = Date.now();
    // Initialize files
    initializeLogFile();
    initializeReportFile();
    logActivity("session", "info", "session-started", "Activity logging session started", {
        sessionId,
        cwd,
        pid: process.pid,
        nodeVersion: process.version,
    });
}
/**
 * Generate unique session ID
 */
function generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
}
/**
 * Generate unique activity ID
 */
function generateActivityId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `act-${timestamp}-${random}`;
}
/**
 * Initialize activity log file
 */
function initializeLogFile() {
    if (!fs.existsSync(activityLogPath)) {
        fs.writeFileSync(activityLogPath, "");
    }
}
/**
 * Initialize activity report JSON file
 */
function initializeReportFile() {
    const reportPath = path.join(path.dirname(activityLogPath), "activity-report.json");
    if (!fs.existsSync(reportPath)) {
        fs.writeFileSync(reportPath, JSON.stringify({
            sessions: [],
            activities: [],
            stats: {
                total: 0,
                byCategory: {},
                byLevel: {},
            }
        }, null, 2));
    }
}
/**
 * Check if activity logging is enabled
 */
export function isActivityLoggingEnabled() {
    return activityLoggerEnabled;
}
/**
 * Enable or disable activity logging
 */
export function setActivityLoggingEnabled(enabled) {
    activityLoggerEnabled = enabled;
}
/**
 * Get current session ID
 */
export function getSessionId() {
    return sessionId;
}
/**
 * Log an activity
 */
export function logActivity(category, level, action, message, details, options) {
    if (!activityLoggerEnabled) {
        return;
    }
    const record = {
        timestamp: new Date().toISOString(),
        id: generateActivityId(),
        category,
        level,
        action,
        message,
        sessionId: options?.sessionId || sessionId,
    };
    if (details) {
        record.details = details;
    }
    if (options?.jobId) {
        record.jobId = options.jobId;
    }
    // Write to log file
    writeToLogFile(record);
    // Write to report JSON
    writeToReportFile(record);
    // Console output for debug mode
    if (process.env.STRRAY_ACTIVITY_CONSOLE === "true") {
        frameworkLogger.log("activity-logger", "console-output", "info", { message: `[${record.timestamp}] [${record.category}] ${level.toUpperCase()}: ${message}`, details: details || "" });
    }
}
/**
 * Write activity to log file
 */
function writeToLogFile(record) {
    try {
        const detailsPart = record.details
            ? ` | ${JSON.stringify(record.details)}`
            : "";
        const jobIdPart = record.jobId ? `[${record.jobId}] ` : "";
        const logLine = `${record.timestamp} ${jobIdPart}[${record.category}] ${record.action} - ${record.level.toUpperCase()}${detailsPart}\n`;
        fs.appendFileSync(activityLogPath, logLine);
    }
    catch (error) {
        frameworkLogger.log("activity-logger", "write-log-failed", "error", { error, message: "Failed to write to activity log" });
    }
}
/**
 * Write activity to report JSON
 */
function writeToReportFile(record) {
    try {
        const reportPath = path.join(path.dirname(activityLogPath), "activity-report.json");
        let report;
        try {
            report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
        }
        catch {
            // New file or invalid JSON
            report = { sessions: [], activities: [], stats: { total: 0, byCategory: {}, byLevel: {} } };
        }
        // Add activity
        report.activities.push(record);
        report.stats.total++;
        report.stats.byCategory[record.category] = (report.stats.byCategory[record.category] || 0) + 1;
        report.stats.byLevel[record.level] = (report.stats.byLevel[record.level] || 0) + 1;
        // Keep only last 1000 activities
        if (report.activities.length > 1000) {
            report.activities = report.activities.slice(-1000);
        }
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
    catch (error) {
        frameworkLogger.log("activity-logger", "write-report-failed", "error", { error, message: "Failed to write to activity report" });
    }
}
// Convenience methods
export const activity = {
    framework: (action, message, details) => logActivity("framework", "info", action, message, details),
    development: (action, message, details) => logActivity("development", "info", action, message, details),
    script: (action, message, details) => logActivity("script", "info", action, message, details),
    file: (action, message, details) => logActivity("file", "info", action, message, details),
    test: (action, message, details) => logActivity("test", "info", action, message, details),
    commit: (action, message, details) => logActivity("commit", "info", action, message, details),
    session: (action, message, details) => logActivity("session", "info", action, message, details),
    agent: (action, message, details) => logActivity("agent", "info", action, message, details),
    processor: (action, message, details) => logActivity("processor", "info", action, message, details),
    config: (action, message, details) => logActivity("config", "info", action, message, details),
    success: (category, action, message, details) => logActivity(category, "success", action, message, details),
    error: (category, action, message, details) => logActivity(category, "error", action, message, details),
    warn: (category, action, message, details) => logActivity(category, "warn", action, message, details),
};
// Initialize on module load
initialize();
// Also listen for process events to log session end
process.on("exit", () => {
    logActivity("session", "info", "session-ended", "Activity logging session ended", {
        duration: Date.now() - sessionStartTime,
    });
});
//# sourceMappingURL=activity-logger.js.map