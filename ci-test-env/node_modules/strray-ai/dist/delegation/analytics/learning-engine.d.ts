/**
 * Learning Engine
 *
 * P9 learning system - analyzes patterns, detects drift, and improves routing.
 * Extracted from task-skill-router.ts as part of Phase 2 refactoring.
 *
 * @version 1.0.0
 * @since 2026-03-12
 */
import { P9LearningStats, PatternDriftAnalysis, LearningResult, AdaptiveThresholds } from '../config/types.js';
/**
 * LearningEngine class
 *
 * Active implementation for P9 learning capabilities:
 * - Pattern drift detection
 * - Automatic routing refinement
 * - Success rate learning
 * - Adaptive confidence thresholds
 */
export declare class LearningEngine {
    private enabled;
    private learningHistory;
    constructor(enabled?: boolean);
    /**
     * Get P9 learning statistics
     */
    getP9LearningStats(): P9LearningStats;
    /**
     * Calculate overall success rate from outcome tracker
     */
    private calculateOverallSuccessRate;
    /**
     * Get pattern drift analysis from performance tracker
     */
    getPatternDriftAnalysis(): PatternDriftAnalysis;
    /**
     * Get adaptive thresholds based on learned data
     */
    getAdaptiveThresholds(): AdaptiveThresholds;
    /**
     * Trigger P9 learning process
     */
    triggerLearning(): Promise<LearningResult>;
    /**
     * Enable or disable learning
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if learning is enabled
     */
    isEnabled(): boolean;
    /**
     * Get learning history
     */
    getLearningHistory(): Array<{
        timestamp: Date;
        patternsAnalyzed: number;
        adaptations: number;
        successRate: number;
    }>;
    /**
     * Clear learning history
     */
    clearHistory(): void;
    /**
     * Analyze a specific pattern for optimization opportunities
     */
    analyzePattern(patternId: string): {
        optimized: boolean;
        recommendations: string[];
        confidence: number;
    };
    /**
     * Suggest routing improvements based on learning
     */
    suggestImprovements(): Array<{
        type: 'mapping' | 'threshold' | 'confidence';
        description: string;
        impact: 'low' | 'medium' | 'high';
    }>;
}
/**
 * Global learning engine instance (enabled by default)
 */
export declare const learningEngine: LearningEngine;
//# sourceMappingURL=learning-engine.d.ts.map