/**
 * Pattern Performance Tracker for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Monitors pattern effectiveness over time, detects pattern drift,
 * and provides metrics for adaptive kernel modifications.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import type { AdaptiveThresholds } from "../core/kernel-patterns.js";
export interface PatternMetrics {
    patternId: string;
    totalUsages: number;
    successfulUsages: number;
    failedUsages: number;
    successRate: number;
    avgConfidence: number;
    avgResponseTime: number;
    lastUpdated: Date;
    timeSeries: Array<{
        timestamp: Date;
        successRate: number;
        avgConfidence: number;
        usageCount: number;
    }>;
}
export interface PatternDriftAnalysis {
    drifted: boolean;
    patternId: string;
    currentMetrics: PatternMetrics;
    historicalBaseline: PatternMetrics;
    driftMagnitude: number;
    driftDirection: 'increasing' | 'decreasing' | 'unstable';
    confidence: number;
    recommendedAction: string;
}
export interface SystemPerformanceSummary {
    overallSuccessRate: number;
    overallAvgConfidence: number;
    totalPatternsTracked: number;
    patternsWithDrift: string[];
    patternsNeedingAttention: string[];
    recommendations: string[];
}
export declare class PatternPerformanceTracker {
    private patternMetrics;
    private readonly maxTimeSeriesPoints;
    private readonly driftThreshold;
    private readonly minSamplesForDrift;
    private readonly baselineWindowSize;
    /**
     * Track performance metrics for a pattern
     */
    trackPatternPerformance(patternId: string, outcome: {
        success: boolean;
        confidence: number;
        responseTime?: number;
        complexity?: number;
    }): void;
    /**
     * Detect if a pattern has drifted from its historical baseline
     */
    detectPatternDrift(patternId: string): PatternDriftAnalysis | null;
    /**
     * Get all pattern drift analyses
     */
    getAllDriftAnalyses(): PatternDriftAnalysis[];
    /**
     * Calculate adaptive confidence thresholds based on performance
     */
    calculateAdaptiveThresholds(): AdaptiveThresholds;
    /**
     * Get system performance summary
     */
    getSystemPerformanceSummary(): SystemPerformanceSummary;
    /**
     * Get metrics for a specific pattern
     */
    getPatternMetrics(patternId: string): PatternMetrics | null;
    /**
     * Get all tracked patterns
     */
    getAllPatternMetrics(): PatternMetrics[];
    /**
     * Clear all metrics (for testing or reset)
     */
    clear(): void;
    /**
     * Save metrics to disk for persistence
     */
    saveToDisk(): void;
    /**
     * Load metrics from disk
     */
    loadFromDisk(): void;
}
export declare const patternPerformanceTracker: PatternPerformanceTracker;
//# sourceMappingURL=pattern-performance-tracker.d.ts.map