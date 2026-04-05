// Activity Log Writer - Integrates with job correlation
// This module writes to the activity log with job ID correlation
import { promises as fs } from "fs";
import { getCurrentJobId, frameworkLogger } from "../core/framework-logger.js";
/**
 * Write an entry to the activity log with job correlation
 */
export async function writeActivityLog(entry) {
    try {
        // Ensure job ID is included from global context if not provided
        const jobId = entry.jobId || getCurrentJobId() || "no-job";
        // Format log entry with job ID correlation
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${jobId}] [${entry.component}] ${entry.event} - ${entry.status}`;
        // Write to activity log file
        const logDir = "./logs/framework/";
        const logFile = logDir + "activity.log";
        // Ensure directory exists
        try {
            await fs.access(logDir);
        }
        catch {
            await fs.mkdir(logDir, { recursive: true });
        }
        // Append log entry
        await fs.appendFile(logFile, logLine + "\n", "utf8");
    }
    catch (error) {
        frameworkLogger.log("activity-log-writer", "write-failed", "error", { error, message: "Failed to write activity log" });
        // Fallback: also log via frameworkLogger since file write failed
        frameworkLogger.log("activity-log-writer", "write-failed-fallback", "error", { message: `[ACTIVITY-LOG-ERROR] Failed to write: ${error}` });
    }
}
//# sourceMappingURL=activity-log-writer.js.map