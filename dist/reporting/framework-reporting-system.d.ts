import { type ReportConfig, type ScheduleConfig, type RealtimeStatus, type CustomReportTemplate } from "./types.js";
export type { ReportConfig, ReportData, OrchestrationMetrics, ParsedLogEntry, RealtimeStatus, ScheduleConfig, CustomReportTemplate } from "./types.js";
export declare class FrameworkReportingSystem {
    private logRetentionHours;
    private reportCache;
    generateReport(config: ReportConfig): Promise<string>;
    scheduleAutomatedReports(schedule: ScheduleConfig): void;
    getRealtimeStatus(): Promise<RealtimeStatus>;
    createCustomReport(template: CustomReportTemplate): string;
    private generateReportId;
    private getCachedReport;
    private isCacheValid;
    private cacheReport;
    private collectReportData;
    private saveReportToFile;
    private cleanupOldReports;
    private getIntervalMs;
}
export declare const frameworkReportingSystem: FrameworkReportingSystem;
//# sourceMappingURL=framework-reporting-system.d.ts.map