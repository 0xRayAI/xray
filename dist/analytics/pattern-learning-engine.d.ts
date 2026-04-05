/**
 * Pattern Learning Engine for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Learns from performance data, generates adaptive modifications,
 * and creates self-improving pattern definitions.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import type { PatternUpdate } from "../core/kernel-patterns.js";
export interface LearningResult {
    newPatterns: PatternUpdate[];
    modifiedPatterns: PatternUpdate[];
    removedPatterns: PatternUpdate[];
    thresholdUpdates: PatternUpdate[];
    recommendations: string[];
}
export interface AdaptiveLearningConfig {
    enableAutoAddition: boolean;
    enableAutoRemoval: boolean;
    enableThresholdCalibration: boolean;
    minConfidenceForAddition: number;
    minSuccessRateForAddition: number;
    maxPatterns: number;
}
export declare class PatternLearningEngine {
    private config;
    private learningHistory;
    private readonly maxHistory;
    constructor(config?: Partial<AdaptiveLearningConfig>);
    /**
     * Main learning function - analyzes data and generates adaptive modifications
     */
    learnFromData(outcomes: Array<{
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
    }>): LearningResult;
    /**
     * Generate pattern modifications based on performance
     */
    private generatePatternModifications;
    /**
     * Generate patterns for removal based on poor performance
     */
    private generatePatternRemovals;
    /**
     * Generate adaptive threshold updates
     */
    private generateThresholdUpdates;
    /**
     * Generate new pattern suggestions from emergent patterns
     */
    private generateNewPatterns;
    /**
     * Generate recommendations based on learning results
     */
    private generateRecommendations;
    /**
     * Get learning history
     */
    getLearningHistory(): LearningResult[];
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AdaptiveLearningConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AdaptiveLearningConfig;
}
export declare const patternLearningEngine: PatternLearningEngine;
//# sourceMappingURL=pattern-learning-engine.d.ts.map