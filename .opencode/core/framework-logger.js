import { isLoggingEnabled, shouldLog, } from "./logging-config.js";
/**
 * Generate a unique job ID for tracking work sessions
 */
export function generateJobId(prefix = "job") {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}
// Global job context for correlation across all framework operations
let currentJobContext = null;
export function getCurrentJobId() {
    return currentJobContext?.jobId || null;
}
export function setCurrentJobContext(jobId) {
    currentJobContext = new JobContext(jobId);
    return currentJobContext;
}
export function withJobContext(operation, jobId) {
    const originalContext = currentJobContext;
    const jobContext = setCurrentJobContext(jobId);
    try {
        const result = operation();
        if (result instanceof Promise) {
            return result.finally(async () => {
                // Auto-complete job on operation finish
                await jobContext.complete(true).catch(() => { });
                // Restore original context
                currentJobContext = originalContext;
            });
        }
        else {
            // Sync operation - complete immediately
            jobContext.complete(true).catch(() => { });
            currentJobContext = originalContext;
            return Promise.resolve(result);
        }
    }
    catch (error) {
        // Error occurred - complete job with failure
        jobContext.complete(false, { error: String(error) }).catch(() => { });
        currentJobContext = originalContext;
        throw error;
    }
}
export class JobContext {
    jobId;
    startTime;
    complexityScore;
    agentUsed;
    operationType;
    // NEW: Outcome tracking for pattern analysis
    outcome;
    // NEW: Predicted duration for accuracy comparison (in ms)
    predictedDuration;
    constructor(jobId) {
        this.jobId = jobId || generateJobId("auto");
        this.startTime = Date.now();
    }
    /**
     * Set the outcome after task completion
     */
    setOutcome(success, escalated = false, autoFixed = false) {
        if (escalated)
            this.outcome = "escalated";
        else if (autoFixed)
            this.outcome = "auto-fixed";
        else
            this.outcome = success ? "success" : "fail";
    }
    /**
     * Set predicted duration for complexity accuracy comparison
     */
    setPredictedDuration(completionTimeMs) {
        this.predictedDuration = completionTimeMs;
    }
    /**
     * Log job completion with diagnostic info
     * Enhanced with outcome and complexity accuracy tracking
     */
    async complete(success = true, details) {
        const actualDuration = Date.now() - this.startTime;
        // Calculate complexity accuracy if we have both predicted and actual
        let complexityAccuracy;
        if (this.complexityScore && this.predictedDuration) {
            const ratio = actualDuration / this.predictedDuration;
            if (ratio > 1.5) {
                complexityAccuracy = "underestimated";
            }
            else if (ratio < 0.5) {
                complexityAccuracy = "overestimated";
            }
            else {
                complexityAccuracy = "accurate";
            }
        }
        else if (this.complexityScore && actualDuration) {
            // Fallback: estimate predicted based on complexity score
            const estimatedPredicted = this.complexityScore * 1000; // 1 second per complexity point
            const ratio = actualDuration / estimatedPredicted;
            if (ratio > 1.5) {
                complexityAccuracy = "underestimated";
            }
            else if (ratio < 0.5) {
                complexityAccuracy = "overestimated";
            }
            else {
                complexityAccuracy = "accurate";
            }
        }
        // Determine final outcome
        const finalOutcome = this.outcome || (success ? "success" : "fail");
        await frameworkLogger.log("job-context", "job-completed", success ? "success" : "error", {
            duration: actualDuration,
            complexityScore: this.complexityScore,
            agentUsed: this.agentUsed,
            operationType: this.operationType,
            outcome: finalOutcome,
            complexityAccuracy,
            predictedDuration: this.predictedDuration,
            ...details,
        }, undefined, // sessionId
        this.jobId);
    }
}
export class FrameworkUsageLogger {
    logs = [];
    maxLogs = 1000;
    buffer = [];
    flushTimer;
    flushing = false;
    FLUSH_INTERVAL_MS = 5000;
    MAX_BUFFER_SIZE = 100;
    async log(component, action, status, details, sessionId, jobId) {
        if (!isLoggingEnabled()) {
            return;
        }
        if (!shouldLog(status)) {
            return;
        }
        const actualJobId = jobId || getCurrentJobId() || generateJobId("auto");
        if (!actualJobId) {
            throw new Error("JobId generation failed");
        }
        const entry = {
            timestamp: Date.now(),
            component,
            action,
            status,
            agent: "orchestrator",
            ...(sessionId && { sessionId }),
            jobId: actualJobId,
            details,
        };
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.bufferEntry(entry);
    }
    bufferEntry(entry) {
        const jobIdPart = entry.jobId ? `[${entry.jobId}] ` : "";
        const detailsPart = entry.details
            ? ` | ${JSON.stringify(entry.details)}`
            : "";
        const line = `${new Date(entry.timestamp).toISOString()} ${jobIdPart}[${entry.component}] ${entry.action} - ${entry.status.toUpperCase()}${detailsPart}\n`;
        this.buffer.push(line);
        if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
            this.flushBuffer();
            return;
        }
        if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = undefined;
                this.flushBuffer();
            }, this.FLUSH_INTERVAL_MS);
            if (this.flushTimer && typeof this.flushTimer === "object" && "unref" in this.flushTimer) {
                this.flushTimer.unref();
            }
        }
    }
    flushBuffer() {
        if (this.flushing || this.buffer.length === 0)
            return;
        this.flushing = true;
        const toWrite = this.buffer.splice(0, this.buffer.length);
        const data = toWrite.join("");
        const fs = require("fs");
        const path = require("path");
        try {
            const cwd = process.cwd();
            if (!cwd)
                return;
            const logDir = path.join(cwd, "logs", "framework");
            const logFile = path.join(logDir, "activity.log");
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            fs.appendFile(logFile, data, (err) => {
                this.flushing = false;
                if (err) {
                    // silent
                }
            });
        }
        catch {
            this.flushing = false;
        }
    }
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }
    getComponentUsage(component) {
        return this.logs.filter((log) => log.component === component);
    }
    printRundown() {
        // Framework usage analytics - available for debugging but should not output to console
        // Use getRecentLogs() directly instead of printing
    }
}
export const frameworkLogger = new FrameworkUsageLogger();
//# sourceMappingURL=framework-logger.js.map