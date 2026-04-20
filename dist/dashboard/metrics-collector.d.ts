/**
 * Metrics Collector
 *
 * Collects and aggregates orchestration metrics from:
 * - Activity logs
 * - Orchestrator state
 * - Agent spawning events
 * - Voting outcomes
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
import { DashboardState } from "./dashboard-types.js";
export declare class MetricsCollector {
    private cwd;
    private logPath;
    private reportPath;
    private cachedMetrics;
    private lastCollectTime;
    private trendsHistory;
    constructor(cwd?: string);
    collectMetrics(): Promise<DashboardState>;
    private collectOrchestrationMetrics;
    private collectDelegationAnalytics;
    private collectVotingAnalytics;
    private collectVotingOutcomes;
    private collectHistoricalTrends;
    private collectAgentMetrics;
    private collectComplexityMetrics;
    private detectAnomalies;
    private readLogEntries;
    private readReportData;
    getCachedMetrics(): DashboardState | null;
    getLastCollectTime(): number;
}
export declare const createMetricsCollector: (cwd?: string) => MetricsCollector;
//# sourceMappingURL=metrics-collector.d.ts.map