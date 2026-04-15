import type { ParsedLogEntry, OrchestrationMetrics, ReportConfig } from "./types.js";
export declare function calculateTimeRange(logs: ParsedLogEntry[], timeRange?: ReportConfig["timeRange"]): {
    start: Date;
    end: Date;
};
export declare function calculateMetrics(logs: ParsedLogEntry[]): OrchestrationMetrics;
export declare function calculatePeakActivity(logs: ParsedLogEntry[]): {
    timestamp: Date;
    eventsPerMinute: number;
};
export declare function calculateHealthScore(logs: ParsedLogEntry[]): number;
export declare function generateInsights(logs: ParsedLogEntry[], metrics: OrchestrationMetrics): string[];
export declare function generateRecommendations(metrics: OrchestrationMetrics): string[];
export declare function generateAlerts(logs: ParsedLogEntry[]): string[];
export declare function getHighFrequencyComponents(logs: ParsedLogEntry[]): string[];
//# sourceMappingURL=metrics.d.ts.map