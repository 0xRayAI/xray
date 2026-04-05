export interface ActivityLogEntry {
    timestamp: string;
    component: string;
    event: string;
    status: string;
    jobId?: string;
    sessionId?: string;
    data?: any;
}
/**
 * Write an entry to the activity log with job correlation
 */
export declare function writeActivityLog(entry: ActivityLogEntry): Promise<void>;
//# sourceMappingURL=activity-log-writer.d.ts.map