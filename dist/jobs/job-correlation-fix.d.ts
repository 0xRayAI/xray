import { JobContext } from "../core/framework-logger.js";
export declare function getCurrentJobId(): string | null;
export declare function setCurrentJobContext(jobId?: string): JobContext;
export declare function withJobContext<T>(operation: () => T, jobId?: string): T;
export interface FrameworkLogOptions {
    jobId?: string;
    sessionId?: string;
    correlationId?: string;
    [key: string]: any;
}
export declare function frameworkLog(component: string, event: string, level: string, options?: FrameworkLogOptions, sessionId?: string, explicitJobId?: string): void;
//# sourceMappingURL=job-correlation-fix.d.ts.map