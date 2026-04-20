/**
 * Dashboard Type Definitions
 *
 * Comprehensive types for the 0xRay monitoring dashboard including:
 * - Real-time orchestration metrics
 * - Agent delegation analytics
 * - Voting outcomes
 * - Historical trends
 * - Anomaly alerts
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
export interface AgentMetrics {
    name: string;
    invocations: number;
    successRate: number;
    avgComplexity: number;
    avgDuration: number;
    lastInvoked: number;
    delegationCount: number;
}
export interface ComplexityMetrics {
    level: "simple" | "moderate" | "complex" | "enterprise";
    count: number;
    percentage: number;
    avgDuration: number;
}
export interface OrchestrationMetrics {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    avgSessionDuration: number;
    totalAgentsUsed: number;
    totalTasksExecuted: number;
    successRate: number;
}
export interface DelegationAnalytics {
    agentInvocations: Record<string, number>;
    complexityByAgent: Record<string, number>;
    successRateByAgent: Record<string, number>;
    avgDurationByAgent: Record<string, number>;
    delegationChainDepth: Record<string, number>;
}
export interface VotingOutcome {
    sessionId: string;
    timestamp: number;
    topic: string;
    strategy: "majority_vote" | "consensus" | "expert_priority";
    participants: string[];
    decision: string;
    confidence: number;
    votes: {
        option: string;
        weight: number;
        voters: string[];
    }[];
    tied: boolean;
    executionTime: number;
}
export interface VotingAnalytics {
    totalVotes: number;
    successfulVotes: number;
    failedVotes: number;
    avgConfidence: number;
    strategyUsage: Record<string, number>;
    agentParticipation: Record<string, number>;
    consensusRate: number;
    majorityRate: number;
}
export interface TrendDataPoint {
    timestamp: number;
    value: number;
    label?: string;
}
export interface HistoricalTrends {
    sessionHistory: TrendDataPoint[];
    agentUsageHistory: Record<string, TrendDataPoint[]>;
    successRateHistory: TrendDataPoint[];
    complexityDistributionHistory: Record<string, TrendDataPoint[]>;
    votingOutcomeHistory: TrendDataPoint[];
}
export interface Alert {
    id: string;
    severity: "info" | "warning" | "error" | "critical";
    category: "orchestration" | "delegation" | "voting" | "performance" | "security";
    title: string;
    message: string;
    timestamp: number;
    metric?: string;
    threshold?: number;
    actualValue?: number;
    agentsInvolved?: string[];
    resolved: boolean;
    resolvedAt?: number;
}
export interface AnomalyDetectionConfig {
    enabled: boolean;
    sensitivity: "low" | "medium" | "high";
    thresholds: {
        successRateMin: number;
        errorRateMax: number;
        avgDurationMax: number;
        concurrentAgentsMax: number;
        delegationDepthMax: number;
        votingConfidenceMin: number;
    };
}
export interface DashboardState {
    metrics: OrchestrationMetrics;
    delegation: DelegationAnalytics;
    voting: VotingAnalytics;
    trends: HistoricalTrends;
    alerts: Alert[];
    agents: AgentMetrics[];
    complexity: ComplexityMetrics[];
    votingOutcomes: VotingOutcome[];
    lastUpdated: number;
}
export interface DashboardConfig {
    refreshInterval: number;
    historyRetention: number;
    anomalyDetection: AnomalyDetectionConfig;
    theme: "dark" | "light" | "auto";
    layout: "compact" | "expanded";
    metricsToTrack: string[];
    alertChannels: ("console" | "log" | "webhook")[];
}
export declare const DEFAULT_DASHBOARD_CONFIG: DashboardConfig;
//# sourceMappingURL=dashboard-types.d.ts.map