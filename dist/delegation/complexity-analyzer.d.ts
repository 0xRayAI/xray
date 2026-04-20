/**
 * Complexity Analyzer
 *
 * Assesses operation complexity to determine optimal agent delegation strategy.
 * Implements metrics-based complexity scoring for intelligent task distribution.
 *
 * CALIBRATED: Thresholds lowered to enable multi-agent orchestration with voting
 * - simple: 15 - single agent tasks
 * - moderate: 25 - multi-agent preparation
 * - complex: 50+ - multi-agent orchestration with voting
 * - enterprise: 75+ - maximum orchestration
 *
 * @version 1.2.0
 * @since 2026-01-07
 */
import { ComplexityMetrics, ComplexityScore, ComplexityThresholds, ComplexityLevel, DelegationStrategy } from "./complexity-core.js";
export type { ComplexityMetrics, ComplexityScore, ComplexityThresholds, ComplexityLevel, DelegationStrategy, };
/**
 * Complexity Analyzer
 * Analyzes operations and calculates complexity scores
 */
export declare class ComplexityAnalyzer {
    private static readonly MAX_CALIBRATION_HISTORY;
    /**
     * CALIBRATED: Adjusted thresholds for balanced orchestration utilization
     * - simple: 15 - single agent tasks
     * - moderate: 25 - multi-agent preparation
     * - complex: 50 - complex tasks get multi-agent coordination with voting
     * - enterprise: 75 - maximum orchestration (only extreme cases)
     */
    private thresholds;
    private operationWeights;
    private riskMultipliers;
    /**
     * Analyze operation complexity and return detailed metrics
     */
    analyzeComplexity(operation: string, context: unknown): ComplexityMetrics;
    /**
     * Calculate complexity score and delegation strategy
     *
     * CALIBRATED: Weights increased to properly utilize orchestration
     * - File count: 4 pts/file (was 2) - better reflects multi-file complexity
     * - Change volume: 0.2/line (was 0.1) - better reflects code volume
     * - Dependencies: 5 each (was 3) - better reflects coordination needs
     */
    calculateComplexityScore(metrics: ComplexityMetrics): ComplexityScore;
    /**
     * Performance data structure for calibration
     */
    private calibrationHistory;
    /**
     * Update thresholds based on historical performance data
     * Analyzes: task score vs completion time vs success rate
     * to automatically adjust thresholds for better accuracy
     */
    updateThresholds(performanceData: unknown): void;
    /**
     * Analyze calibration data to find patterns
     */
    private analyzeCalibrationData;
    /**
     * Apply calibration analysis to adjust thresholds
     */
    private applyCalibrationAnalysis;
    /**
     * Get calibration history for diagnostics
     */
    getCalibrationHistory(): ReadonlyArray<{
        complexityScore: number;
        actualDuration: number;
        estimatedDuration: number;
        success: boolean;
        timestamp: number;
    }>;
    /**
     * Reset calibration history
     */
    resetCalibration(): void;
    /**
     * Get current complexity thresholds
     */
    getThresholds(): ComplexityThresholds;
    /**
     * Set custom complexity thresholds
     */
    setThresholds(thresholds: Partial<ComplexityThresholds>): void;
    /**
     * Set operation type weights (from calibrator)
     */
    setOperationWeights(weights: Partial<Record<string, number>>): void;
    /**
     * Set risk level multipliers (from calibrator)
     */
    setRiskMultipliers(multipliers: Partial<Record<string, number>>): void;
    /**
     * Calibrate analyzer based on calibrator recommendations
     */
    calibrate(settings: {
        thresholds?: Partial<ComplexityThresholds>;
        operationWeights?: Partial<Record<string, number>>;
        riskMultipliers?: Partial<Record<string, number>>;
    }): void;
    private calculateFileCount;
    private calculateChangeVolume;
    private determineOperationType;
    private calculateDependencies;
    private assessRiskLevel;
    private estimateDuration;
}
export declare function getComplexityAnalyzer(): ComplexityAnalyzer;
export declare const complexityAnalyzer: ComplexityAnalyzer;
//# sourceMappingURL=complexity-analyzer.d.ts.map