/**
 * Routing Performance Analyzer for 0xRay
 *
 * Analyzes routing success rates, keyword effectiveness, and confidence thresholds.
 * Integrates with RoutingOutcomeTracker to provide comprehensive routing metrics.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
export interface AgentPerformanceMetrics {
    agent: string;
    skill: string;
    totalRoutings: number;
    successfulRoutings: number;
    failedRoutings: number;
    escalatedRoutings: number;
    successRate: number;
    avgConfidence: number;
    avgExecutionTime: number;
    confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
    };
    timeRange: {
        earliest: Date;
        latest: Date;
    };
}
export interface KeywordEffectiveness {
    keyword: string;
    totalMatches: number;
    successfulMatches: number;
    failedMatches: number;
    successRate: number;
    avgConfidence: number;
    routedAgent: string;
    routedSkill: string;
    lastUsed: Date;
}
export interface ConfidenceThresholdMetrics {
    threshold: number;
    totalRoutings: number;
    successfulRoutings: number;
    successRate: number;
    escalatedCount: number;
    recommendation: string;
}
export interface RoutingPerformanceReport {
    totalRoutings: number;
    overallSuccessRate: number;
    avgConfidence: number;
    agentMetrics: AgentPerformanceMetrics[];
    keywordEffectiveness: KeywordEffectiveness[];
    confidenceMetrics: ConfidenceThresholdMetrics[];
    timeRange: {
        start: Date;
        end: Date;
    };
    recommendations: string[];
}
declare class RoutingPerformanceAnalyzer {
    private readonly lowConfidenceThreshold;
    private readonly mediumConfidenceThreshold;
    private readonly minSamplesForMetrics;
    /**
     * Generate comprehensive routing performance report
     */
    generatePerformanceReport(): RoutingPerformanceReport;
    /**
     * Calculate performance metrics for each agent
     */
    private calculateAgentMetrics;
    /**
     * Analyze effectiveness of keywords
     */
    private analyzeKeywordEffectiveness;
    /**
     * Analyze confidence threshold performance
     */
    private analyzeConfidenceThresholds;
    /**
     * Calculate overall routing statistics
     */
    private calculateOverallStats;
    /**
     * Calculate time range for routing data
     */
    private calculateTimeRange;
    /**
     * Generate recommendations based on analysis
     */
    private generateRecommendations;
    /**
     * Get performance report as formatted string
     */
    generateFormattedReport(): string;
    private emptyPerformanceReport;
}
export declare const routingPerformanceAnalyzer: RoutingPerformanceAnalyzer;
export {};
//# sourceMappingURL=routing-performance-analyzer.d.ts.map