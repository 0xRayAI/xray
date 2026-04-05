// Framework Job Correlation Fix Implementation
// Global Job Context Integration for Framework-wide Job Tracking
import { setCurrentJobContext, withJobContext, getCurrentJobId, frameworkLogger, } from "../core/framework-logger.js";
/**
 * Framework Job Correlation Manager
 * Provides enterprise-level job tracking and correlation throughout all operations
 */
export class JobCorrelationManager {
    static instance = null;
    activeJobs = new Map();
    static getInstance() {
        if (!JobCorrelationManager.instance) {
            JobCorrelationManager.instance = new JobCorrelationManager();
        }
        return JobCorrelationManager.instance;
    }
    /**
     * Start a new job context for operations
     */
    startJob(jobId) {
        const jobContext = setCurrentJobContext(jobId);
        const actualJobId = jobContext.jobId;
        this.activeJobs.set(actualJobId, true);
        frameworkLogger.log("job-correlation-manager", "job-started", "info", {
            message: `[JOB-CORRELATION] Started job: ${actualJobId}`,
            jobId: actualJobId,
        });
        return actualJobId;
    }
    /**
     * Execute operation within job context
     */
    async executeInJobContext(operation, jobId) {
        const startedJobId = this.startJob(jobId);
        try {
            return await withJobContext(operation, startedJobId);
        }
        finally {
            this.activeJobs.delete(startedJobId);
        }
    }
    /**
     * Get current job ID
     */
    getCurrentJobId() {
        return getCurrentJobId();
    }
    /**
     * Check if job is active
     */
    isJobActive(jobId) {
        return this.activeJobs.has(jobId);
    }
    /**
     * Get active job count
     */
    getActiveJobCount() {
        return this.activeJobs.size;
    }
}
// Export singleton instance for global usage
export const jobCorrelationManager = JobCorrelationManager.getInstance();
//# sourceMappingURL=job-correlation-manager.js.map