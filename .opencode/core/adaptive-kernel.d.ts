/**
 * Adaptive Kernel Extension for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Composes with existing Kernel to add self-modifying pattern learning capabilities.
 * Enables continuous pattern improvement based on performance data.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import { type KernelInferenceResult, type AdaptiveThresholds, type EmergentPattern, type PatternUpdate } from "../core/kernel-patterns.js";
import { patternPerformanceTracker } from "../analytics/pattern-performance-tracker.js";
import { emergingPatternDetector } from "../analytics/emerging-pattern-detector.js";
import { patternLearningEngine } from "../analytics/pattern-learning-engine.js";
export interface AdaptiveKernelConfig {
    enabled: boolean;
    enableP9Learning: boolean;
    learningIntervalMs: number;
    autoApplyThreshold: number;
    confidenceThreshold: number;
    maxPatternsPerAnalysis: number;
}
export interface P9AnalysisResult extends KernelInferenceResult {
    patternDriftDetected: boolean;
    driftAnalyses: Array<{
        patternId: string;
        driftMagnitude: number;
        driftDirection: 'increasing' | 'decreasing' | 'unstable';
        recommendedAction: string;
    }>;
    emergentPatterns: EmergentPattern[];
    suggestedUpdates: PatternUpdate[];
    adaptiveThresholds?: AdaptiveThresholds;
    learningApplied: boolean;
}
export declare class AdaptiveKernelAnalyzer {
    private adaptiveConfig;
    private baseKernel;
    private lastLearningRun;
    private cachedP9Analysis;
    private cacheValidMs;
    constructor(config?: Partial<AdaptiveKernelConfig>);
    /**
     * Analyze observation using base kernel enhanced with P9 learning
     */
    analyze(observation: string): KernelInferenceResult;
    /**
     * Enhanced analyze with P9 learning capabilities
     */
    analyzeWithP9(observation: string): P9AnalysisResult;
    /**
     * Perform P9 adaptive pattern learning analysis
     */
    private performP9Analysis;
    /**
     * Get current adaptive thresholds
     */
    getAdaptiveThresholds(): AdaptiveThresholds;
    /**
     * Get pattern drift analyses
     */
    getPatternDrift(): Array<{
        patternId: string;
        driftMagnitude: number;
        driftDirection: 'increasing' | 'decreasing' | 'unstable';
        recommendedAction: string;
    }>;
    /**
     * Manually trigger learning cycle
     */
    triggerLearning(outcomes: Array<{
        taskId: string;
        taskDescription: string;
        routedAgent: string;
        routedSkill: string;
        confidence: number;
        success: boolean;
    }>, existingMappings: Array<{
        keywords: string[];
        skill: string;
        agent: string;
        confidence: number;
    }>): {
        newPatterns: number;
        modifiedPatterns: number;
        removedPatterns: number;
        thresholdUpdates: number;
        recommendations: string[];
    };
    /**
     * Get learning statistics
     */
    getLearningStats(): {
        lastLearningRun: Date;
        cacheValid: boolean;
        patternsTracked: number;
        driftDetected: number;
        thresholdsCalibrated: boolean;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AdaptiveKernelConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AdaptiveKernelConfig;
}
export declare function getAdaptiveKernel(config?: Partial<AdaptiveKernelConfig>): AdaptiveKernelAnalyzer;
export { patternPerformanceTracker, emergingPatternDetector, patternLearningEngine };
//# sourceMappingURL=adaptive-kernel.d.ts.map