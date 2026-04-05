// Framework job ID correlation fix
// Integrate JobContext into all framework loggers
import { JobContext, frameworkLogger } from "../core/framework-logger.js";
// Global job context for correlation - frameworks should populate this
let currentJobContext = null;
export function getCurrentJobId() {
    return currentJobContext?.jobId || null;
}
export function setCurrentJobContext(jobId) {
    currentJobContext = new JobContext(jobId);
    return currentJobContext;
}
export function withJobContext(operation, jobId) {
    const jobContext = setCurrentJobContext(jobId);
    try {
        return operation();
    }
    finally {
        // Auto-complete job on operation finish
        jobContext.complete(true).catch(() => { });
    }
}
// Enhanced log function with implicit job context
export function frameworkLog(component, event, level, options = {}, sessionId, explicitJobId) {
    // Implicit job ID from current context
    const jobId = explicitJobId || options.jobId || getCurrentJobId();
    // Enhanced log entry with job correlation
    const logEntry = {
        timestamp: new Date().toISOString(),
        jobId: jobId, // <- Now included in ALL log entries
        sessionId: sessionId || "global",
        component: component,
        event: event,
        level: level,
        correlationId: options.correlationId || generateCorrelationId(),
        data: { ...options },
    };
    // Log with job correlation
    frameworkLogger.log("job-correlation", "log-entry", "info", {
        message: `[${logEntry.timestamp}] [${logEntry.jobId || "no-job"}] [${logEntry.component}] ${logEntry.event} - ${logEntry.level}`,
    });
    // Write to activity log with job correlation
    // This would integrate with the activity logger
    writeActivityLog(logEntry);
}
//# sourceMappingURL=job-correlation-fix.js.map