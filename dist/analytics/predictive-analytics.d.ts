/**
 * Predictive Analytics for Optimal Agent Routing
 *
 * Predicts the best agent to route a task to based on historical
 * success rates using simple keyword overlap scoring.
 *
 * @version 1.0.0
 */
export interface RoutingPrediction {
    agent: string;
    confidence: number;
    historicalSuccessRate: number;
    sampleSize: number;
    /** Risk level based on confidence and success probability */
    riskLevel?: "low" | "medium" | "high";
    /** Estimated task duration in milliseconds */
    estimatedDuration?: number;
    /** Agent performance metrics used for prediction */
    agentMetrics?: AgentPerformanceSummary;
}
export interface AgentPerformanceSummary {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    successRate: number;
    recentPerformance: number[];
    taskTypeBreakdown: Record<string, {
        count: number;
        successRate: number;
    }>;
}
export type RiskLevel = "low" | "medium" | "high";
export interface PredictiveAnalytics {
    predict(taskDescription: string): Promise<RoutingPrediction | null>;
    predictOptimalAgent(): Promise<RoutingPrediction | null>;
    /** Synchronous prediction using in-memory data (no disk reload). */
    predictSync(taskDescription: string): RoutingPrediction | null;
    [key: string]: any;
}
export declare const predictiveAnalytics: PredictiveAnalytics;
//# sourceMappingURL=predictive-analytics.d.ts.map