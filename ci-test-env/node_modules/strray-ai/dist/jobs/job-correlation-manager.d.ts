/**
 * Framework Job Correlation Manager
 * Provides enterprise-level job tracking and correlation throughout all operations
 */
export declare class JobCorrelationManager {
    private static instance;
    private activeJobs;
    static getInstance(): JobCorrelationManager;
    /**
     * Start a new job context for operations
     */
    startJob(jobId?: string): string;
    /**
     * Execute operation within job context
     */
    executeInJobContext<T>(operation: () => Promise<T> | T, jobId?: string): Promise<T>;
    /**
     * Get current job ID
     */
    getCurrentJobId(): string | null;
    /**
     * Check if job is active
     */
    isJobActive(jobId: string): boolean;
    /**
     * Get active job count
     */
    getActiveJobCount(): number;
}
export declare const jobCorrelationManager: JobCorrelationManager;
//# sourceMappingURL=job-correlation-manager.d.ts.map