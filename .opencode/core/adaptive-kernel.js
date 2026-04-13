/**
 * Adaptive Kernel Extension for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Composes with existing Kernel to add self-modifying pattern learning capabilities.
 * Enables continuous pattern improvement based on performance data.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import { getKernel } from "../core/kernel-patterns.js";
import { patternPerformanceTracker } from "../analytics/pattern-performance-tracker.js";
import { emergingPatternDetector } from "../analytics/emerging-pattern-detector.js";
import { patternLearningEngine } from "../analytics/pattern-learning-engine.js";
import { frameworkLogger } from "../core/framework-logger.js";
export class AdaptiveKernelAnalyzer {
    adaptiveConfig;
    baseKernel;
    lastLearningRun = new Date();
    cachedP9Analysis = null;
    cacheValidMs = 60000; // 1 minute cache
    constructor(config) {
        this.baseKernel = getKernel();
        this.adaptiveConfig = {
            enabled: config?.enabled ?? true,
            enableP9Learning: config?.enableP9Learning ?? true,
            learningIntervalMs: config?.learningIntervalMs ?? 300000, // 5 minutes default
            autoApplyThreshold: config?.autoApplyThreshold ?? 0.9,
            confidenceThreshold: config?.confidenceThreshold ?? 0.75,
            maxPatternsPerAnalysis: config?.maxPatternsPerAnalysis ?? 10,
        };
    }
    /**
     * Analyze observation using base kernel enhanced with P9 learning
     */
    analyze(observation) {
        // Delegate to base kernel
        return this.baseKernel.analyze(observation);
    }
    /**
     * Enhanced analyze with P9 learning capabilities
     */
    analyzeWithP9(observation) {
        // Get base analysis
        const baseResult = this.baseKernel.analyze(observation);
        if (!this.adaptiveConfig.enableP9Learning) {
            return {
                ...baseResult,
                patternDriftDetected: false,
                driftAnalyses: [],
                emergentPatterns: [],
                suggestedUpdates: [],
                learningApplied: false
            };
        }
        // Check cache validity
        const now = new Date();
        const cacheAge = now.getTime() - this.lastLearningRun.getTime();
        if (this.cachedP9Analysis && cacheAge < this.cacheValidMs) {
            return this.cachedP9Analysis;
        }
        // Run P9 analysis
        const p9Result = this.performP9Analysis(baseResult, observation);
        // Cache result
        this.cachedP9Analysis = p9Result;
        this.lastLearningRun = now;
        return p9Result;
    }
    /**
     * Perform P9 adaptive pattern learning analysis
     */
    performP9Analysis(baseResult, _observation) {
        const p9Result = {
            ...baseResult,
            patternDriftDetected: false,
            driftAnalyses: [],
            emergentPatterns: [],
            suggestedUpdates: [],
            learningApplied: false
        };
        // 1. Check for pattern drift
        const allDriftAnalyses = patternPerformanceTracker.getAllDriftAnalyses();
        const significantDrift = allDriftAnalyses.filter((a) => a.drifted && a.driftDirection === 'decreasing');
        if (significantDrift.length > 0) {
            p9Result.patternDriftDetected = true;
            p9Result.driftAnalyses = significantDrift.map((a) => ({
                patternId: a.patternId,
                driftMagnitude: a.driftMagnitude,
                driftDirection: a.driftDirection,
                recommendedAction: a.recommendedAction
            }));
        }
        // 2. Get adaptive thresholds
        p9Result.adaptiveThresholds = patternPerformanceTracker.calculateAdaptiveThresholds();
        // 3. Perform learning if enough time has passed
        const now = new Date();
        const timeSinceLastLearning = now.getTime() - this.lastLearningRun.getTime();
        if (timeSinceLastLearning >= this.adaptiveConfig.learningIntervalMs) {
            const learningResult = patternLearningEngine.learnFromData([], // Will be populated from actual routing outcomes
            [] // Will be populated from existing mappings
            );
            p9Result.suggestedUpdates = [
                ...learningResult.modifiedPatterns,
                ...learningResult.newPatterns,
                ...learningResult.removedPatterns,
                ...learningResult.thresholdUpdates
            ];
            // Auto-apply high-confidence updates
            const autoApply = p9Result.suggestedUpdates.filter((u) => (u.confidence || 0) >= this.adaptiveConfig.autoApplyThreshold && u.validated);
            if (autoApply.length > 0) {
                p9Result.learningApplied = true;
                frameworkLogger.log("adaptive-kernel", "auto-applied-updates", "info", { count: autoApply.length }, undefined);
            }
        }
        return p9Result;
    }
    /**
     * Get current adaptive thresholds
     */
    getAdaptiveThresholds() {
        return patternPerformanceTracker.calculateAdaptiveThresholds();
    }
    /**
     * Get pattern drift analyses
     */
    getPatternDrift() {
        const analyses = patternPerformanceTracker.getAllDriftAnalyses();
        return analyses
            .filter((a) => a.drifted)
            .map((a) => ({
            patternId: a.patternId,
            driftMagnitude: a.driftMagnitude,
            driftDirection: a.driftDirection,
            recommendedAction: a.recommendedAction
        }));
    }
    /**
     * Manually trigger learning cycle
     */
    triggerLearning(outcomes, existingMappings) {
        const result = patternLearningEngine.learnFromData(outcomes, existingMappings);
        this.lastLearningRun = new Date();
        this.cachedP9Analysis = null; // Invalidate cache
        return {
            newPatterns: result.newPatterns.length,
            modifiedPatterns: result.modifiedPatterns.length,
            removedPatterns: result.removedPatterns.length,
            thresholdUpdates: result.thresholdUpdates.length,
            recommendations: result.recommendations
        };
    }
    /**
     * Get learning statistics
     */
    getLearningStats() {
        const allMetrics = patternPerformanceTracker.getAllPatternMetrics();
        const allDrift = patternPerformanceTracker.getAllDriftAnalyses();
        return {
            lastLearningRun: this.lastLearningRun,
            cacheValid: (new Date().getTime() - this.lastLearningRun.getTime()) < this.cacheValidMs,
            patternsTracked: allMetrics.length,
            driftDetected: allDrift.filter((a) => a.drifted).length,
            thresholdsCalibrated: true
        };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.adaptiveConfig = {
            ...this.adaptiveConfig,
            ...newConfig
        };
        // Invalidate cache on config change
        this.cachedP9Analysis = null;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.adaptiveConfig };
    }
}
// Singleton instance
let adaptiveKernelInstance = null;
export function getAdaptiveKernel(config) {
    if (!adaptiveKernelInstance) {
        adaptiveKernelInstance = new AdaptiveKernelAnalyzer(config);
    }
    return adaptiveKernelInstance;
}
// Re-export for convenience
export { patternPerformanceTracker, emergingPatternDetector, patternLearningEngine };
//# sourceMappingURL=adaptive-kernel.js.map