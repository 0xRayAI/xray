/**
 * Complexity Core
 *
 * Shared complexity types, thresholds, and utilities.
 * Single source of truth for complexity analysis across the framework.
 *
 * This module consolidates duplicate complexity logic from:
 * - complexity-analyzer.ts
 * - complexity-router.ts
 * - complexity-calibrator.ts
 */
/**
 * Complexity metrics for analysis
 */
export interface ComplexityMetrics {
    fileCount: number;
    changeVolume: number;
    operationType: "create" | "modify" | "refactor" | "analyze" | "debug" | "test";
    dependencies: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    estimatedDuration: number;
}
/**
 * Complexity score with recommendations
 */
export interface ComplexityScore {
    score: number;
    level: ComplexityLevel;
    recommendedStrategy: DelegationStrategy;
    estimatedAgents: number;
    reasoning: string[];
}
/**
 * Complexity tiers/levels
 */
export type ComplexityLevel = "simple" | "moderate" | "complex" | "enterprise";
/**
 * Complexity tiers for routing (lowercase variants)
 */
export type ComplexityTier = "low" | "medium" | "high" | "enterprise";
/**
 * Delegation strategies based on complexity
 */
export type DelegationStrategy = "single-agent" | "multi-agent" | "orchestrator-led";
/**
 * Complexity thresholds configuration
 *
 * CALIBRATED: Based on empirical testing and routing requirements
 * - simple (0-25): Simple tasks, direct agent assignment
 * - moderate (26-50): Moderate complexity, architect review
 * - complex (51-75): Complex tasks, orchestrator coordination
 * - enterprise (76-100): Maximum complexity, full orchestration
 */
export interface ComplexityThresholds {
    simple: number;
    moderate: number;
    complex: number;
    enterprise: number;
}
/**
 * Default complexity thresholds
 * Used across all complexity analyzers for consistency
 *
 * Based on empirical testing:
 * - Low (0-25): Simple tasks, direct agent assignment
 * - Medium (26-50): Moderate complexity, architect review
 * - High (51-75): Complex tasks, orchestrator coordination
 * - Enterprise (76-100): Maximum complexity, full orchestration
 */
export declare const DEFAULT_THRESHOLDS: ComplexityThresholds;
/**
 * Operation type weights for complexity calculation
 */
export declare const OPERATION_WEIGHTS: Record<ComplexityMetrics['operationType'], number>;
/**
 * Risk level multipliers for complexity calculation
 */
export declare const RISK_MULTIPLIERS: Record<ComplexityMetrics['riskLevel'], number>;
/**
 * Map complexity level to routing tier
 */
export declare function levelToTier(level: ComplexityLevel): ComplexityTier;
/**
 * Map routing tier to complexity level
 */
export declare function tierToLevel(tier: ComplexityTier): ComplexityLevel;
/**
 * Get complexity level from score using thresholds
 */
export declare function getLevelFromScore(score: number, thresholds?: ComplexityThresholds): ComplexityLevel;
/**
 * Get routing tier from score using thresholds
 */
export declare function getTierFromScore(score: number, thresholds?: ComplexityThresholds): ComplexityTier;
/**
 * Get recommended delegation strategy for a complexity level
 */
export declare function getStrategyForLevel(level: ComplexityLevel): DelegationStrategy;
/**
 * Get recommended agent count for a complexity level
 */
export declare function getAgentCountForLevel(level: ComplexityLevel): number;
/**
 * Get default confidence score for a complexity tier
 */
export declare function getConfidenceForTier(tier: ComplexityTier): number;
/**
 * Get recommended agent for a complexity tier
 */
export declare function getAgentForTier(tier: ComplexityTier): string;
/**
 * Get recommended skill for a complexity tier
 */
export declare function getSkillForTier(tier: ComplexityTier): string;
/**
 * Calculate base complexity score from metrics
 */
export declare function calculateBaseScore(metrics: ComplexityMetrics): number;
/**
 * Generate reasoning for a complexity score
 */
export declare function generateReasoning(metrics: ComplexityMetrics, score: number, level: ComplexityLevel): string[];
//# sourceMappingURL=complexity-core.d.ts.map