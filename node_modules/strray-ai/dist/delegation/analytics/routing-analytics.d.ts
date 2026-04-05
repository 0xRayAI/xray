/**
 * Routing Analytics
 *
 * Provides analytics aggregation and insights generation for routing data.
 * Extracted from task-skill-router.ts as part of Phase 2 refactoring.
 *
 * @version 1.0.0
 * @since 2026-03-12
 */
import { DailyAnalyticsSummary, RoutingAnalyticsData, RoutingRefinementResult } from '../config/types.js';
import { RoutingOutcomeTracker } from './outcome-tracker.js';
/**
 * RoutingAnalytics class
 *
 * Aggregates routing data and provides analytics insights.
 * Works with RoutingOutcomeTracker to generate reports and recommendations.
 */
export declare class RoutingAnalytics {
    private tracker;
    constructor(tracker: RoutingOutcomeTracker);
    /**
     * Get daily analytics summary for reporting
     * @returns Daily summary with metrics and insights
     */
    getDailySummary(): DailyAnalyticsSummary;
    /**
     * Get full routing analytics data
     * @returns Comprehensive analytics data
     */
    getFullAnalytics(): RoutingAnalyticsData;
    /**
     * Apply routing refinements based on analytics
     * @param apply Whether to actually apply the changes
     * @returns Refinement result with changes list
     */
    applyRoutingRefinements(apply: boolean): RoutingRefinementResult;
    /**
     * Generate insights from routing data
     * @returns Array of insight strings
     */
    generateInsights(): string[];
    /**
     * Get raw statistics from the tracker
     * @returns Record of agent statistics
     */
    getRawStats(): Record<string, {
        attempts: number;
        successes: number;
        successRate: number;
    }>;
    /**
     * Compare current performance to historical baseline
     * @returns Comparison metrics
     */
    compareToBaseline(): {
        improved: boolean;
        changePercent: number;
        currentRate: number;
        baselineRate: number;
    };
}
//# sourceMappingURL=routing-analytics.d.ts.map