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
}
export interface PredictiveAnalytics {
    predict(taskDescription: string): Promise<RoutingPrediction | null>;
    predictOptimalAgent(): Promise<RoutingPrediction | null>;
    /** Synchronous prediction using in-memory data (no disk reload). */
    predictSync(taskDescription: string): RoutingPrediction | null;
    [key: string]: any;
}
export declare const predictiveAnalytics: PredictiveAnalytics;
//# sourceMappingURL=predictive-analytics.d.ts.map