// Framework Job Correlation Fix Implementation
// Global Job Context Integration for Framework-wide Job Tracking

import { setCurrentJobContext, withJobContext, getCurrentJobId } from "../core/framework-logger.js"

/**
 * Framework Job Correlation Manager
 * Provides enterprise-level job tracking and correlation throughout all operations
 */
export class JobCorrelationManager {
  private static instance: JobCorrelationManager | null = null;
  private activeJobs: Map<string, boolean> = new Map();

  static getInstance(): JobCorrelationManager {
    if (!JobCorrelationManager.instance) {
      JobCorrelationManager.instance = new JobCorrelationManager();
    }
    return JobCorrelationManager.instance;
  }

  /**
   * Start a new job context for operations
   */
  startJob(jobId?: string): string {
    const jobContext = setCurrentJobContext(jobId);
    const actualJobId = jobContext.jobId;
    this.activeJobs.set(actualJobId, true);
    console.log(`🎯 [JOB-CORRELATION] Started job: ${actualJobId}`);
    return actualJobId;
  }

  /**
   * Execute operation within job context
   */
  async executeInJobContext<T>(
    operation: () => Promise<T> | T,
    jobId?: string
  ): Promise<T> {
    const startedJobId = this.startJob(jobId);
    try {
      return await withJobContext(operation, startedJobId);
    } finally {
      this.activeJobs.delete(startedJobId);
    }
  }

  /**
   * Get current job ID
   */
  getCurrentJobId(): string | null {
    return getCurrentJobId();
  }

  /**
   * Check if job is active
   */
  isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  /**
   * Get active job count
   */
  getActiveJobCount(): number {
    return this.activeJobs.size;
  }
}

// Export singleton instance for global usage
export const jobCorrelationManager = JobCorrelationManager.getInstance();