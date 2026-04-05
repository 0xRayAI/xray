/**
 * Generate a unique job ID for tracking work sessions
 */
export declare function generateJobId(prefix?: string): string;
export declare function getCurrentJobId(): string | null;
export declare function setCurrentJobContext(jobId?: string): JobContext;
export declare function withJobContext<T>(operation: () => Promise<T> | T, jobId?: string): Promise<T>;
export type LogStatus = "success" | "error" | "info" | "debug" | "warning";
/**
 * Job context for tracking work sessions
 * Enhanced with outcome and complexity accuracy tracking for pattern analytics
 */
export type Outcome = "success" | "fail" | "escalated" | "auto-fixed";
export type ComplexityAccuracy = "underestimated" | "accurate" | "overestimated";
export declare class JobContext {
    readonly jobId: string;
    readonly startTime: number;
    complexityScore?: number;
    agentUsed?: string;
    operationType?: string;
    outcome?: Outcome;
    predictedDuration?: number;
    constructor(jobId?: string);
    /**
     * Set the outcome after task completion
     */
    setOutcome(success: boolean, escalated?: boolean, autoFixed?: boolean): void;
    /**
     * Set predicted duration for complexity accuracy comparison
     */
    setPredictedDuration(completionTimeMs: number): void;
    /**
     * Log job completion with diagnostic info
     * Enhanced with outcome and complexity accuracy tracking
     */
    complete(success?: boolean, details?: any): Promise<void>;
}
export interface FrameworkLogEntry {
    timestamp: number;
    component: string;
    action: string;
    status: LogStatus;
    agent: string;
    sessionId?: string;
    jobId?: string;
    details?: any;
}
export declare class FrameworkUsageLogger {
    private logs;
    private maxLogs;
    log(component: string, action: string, status: LogStatus, details?: any, sessionId?: string, jobId?: string): Promise<void>;
    private persistLog;
    getRecentLogs(count?: number): FrameworkLogEntry[];
    getComponentUsage(component: string): FrameworkLogEntry[];
    printRundown(): void;
}
export declare const frameworkLogger: FrameworkUsageLogger;
//# sourceMappingURL=framework-logger.d.ts.map