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
 * Default complexity thresholds
 * Used across all complexity analyzers for consistency
 *
 * Based on empirical testing:
 * - Low (0-25): Simple tasks, direct agent assignment
 * - Medium (26-50): Moderate complexity, architect review
 * - High (51-75): Complex tasks, orchestrator coordination
 * - Enterprise (76-100): Maximum complexity, full orchestration
 */
export const DEFAULT_THRESHOLDS = {
    simple: 25,
    moderate: 50,
    complex: 75,
    enterprise: 100,
};
/**
 * Operation type weights for complexity calculation
 */
export const OPERATION_WEIGHTS = {
    create: 1.0,
    modify: 1.2,
    refactor: 1.8,
    analyze: 1.5,
    debug: 2.0,
    test: 1.3,
};
/**
 * Risk level multipliers for complexity calculation
 */
export const RISK_MULTIPLIERS = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    critical: 1.6,
};
/**
 * Map complexity level to routing tier
 */
export function levelToTier(level) {
    const mapping = {
        simple: "low",
        moderate: "medium",
        complex: "high",
        enterprise: "enterprise",
    };
    return mapping[level];
}
/**
 * Map routing tier to complexity level
 */
export function tierToLevel(tier) {
    const mapping = {
        low: "simple",
        medium: "moderate",
        high: "complex",
        enterprise: "enterprise",
    };
    return mapping[tier];
}
/**
 * Get complexity level from score using thresholds
 */
export function getLevelFromScore(score, thresholds = DEFAULT_THRESHOLDS) {
    if (score <= thresholds.simple)
        return "simple";
    if (score <= thresholds.moderate)
        return "moderate";
    if (score <= thresholds.complex)
        return "complex";
    return "enterprise";
}
/**
 * Get routing tier from score using thresholds
 */
export function getTierFromScore(score, thresholds = DEFAULT_THRESHOLDS) {
    return levelToTier(getLevelFromScore(score, thresholds));
}
/**
 * Get recommended delegation strategy for a complexity level
 */
export function getStrategyForLevel(level) {
    const strategies = {
        simple: "single-agent",
        moderate: "multi-agent",
        complex: "orchestrator-led",
        enterprise: "orchestrator-led",
    };
    return strategies[level];
}
/**
 * Get recommended agent count for a complexity level
 */
export function getAgentCountForLevel(level) {
    const counts = {
        simple: 1,
        moderate: 2,
        complex: 3,
        enterprise: 5,
    };
    return counts[level];
}
/**
 * Get default confidence score for a complexity tier
 */
export function getConfidenceForTier(tier) {
    const confidence = {
        low: 0.6,
        medium: 0.6,
        high: 0.7,
        enterprise: 0.9,
    };
    return confidence[tier];
}
/**
 * Get recommended agent for a complexity tier
 */
export function getAgentForTier(tier) {
    const agents = {
        low: "code-reviewer",
        medium: "architect",
        high: "orchestrator",
        enterprise: "orchestrator",
    };
    return agents[tier];
}
/**
 * Get recommended skill for a complexity tier
 */
export function getSkillForTier(tier) {
    const skills = {
        low: "code-review",
        medium: "architecture-patterns",
        high: "orchestrator",
        enterprise: "enterprise-coordination",
    };
    return skills[tier];
}
/**
 * Calculate base complexity score from metrics
 */
export function calculateBaseScore(metrics) {
    // Base score from file count (diminishing returns after 10 files)
    const fileScore = Math.min(metrics.fileCount * 3, 30);
    // Change volume score (normalized to 0-25)
    const volumeScore = Math.min(metrics.changeVolume / 10, 25);
    // Dependency score (each dependency adds complexity)
    const dependencyScore = Math.min(metrics.dependencies * 2, 20);
    // Duration score (estimated duration indicates complexity)
    const durationScore = Math.min(metrics.estimatedDuration / 3, 15);
    // Apply operation type weight
    const operationWeight = OPERATION_WEIGHTS[metrics.operationType] || 1.0;
    // Apply risk multiplier
    const riskMultiplier = RISK_MULTIPLIERS[metrics.riskLevel] || 1.0;
    // Calculate weighted score
    const baseScore = (fileScore + volumeScore + dependencyScore + durationScore) * operationWeight * riskMultiplier;
    // Cap at 100
    return Math.min(Math.round(baseScore), 100);
}
/**
 * Generate reasoning for a complexity score
 */
export function generateReasoning(metrics, score, level) {
    const reasoning = [];
    // File count reasoning
    if (metrics.fileCount > 10) {
        reasoning.push(`${metrics.fileCount} files involved (high coordination needed)`);
    }
    else if (metrics.fileCount > 5) {
        reasoning.push(`${metrics.fileCount} files involved (moderate scope)`);
    }
    // Change volume reasoning
    if (metrics.changeVolume > 200) {
        reasoning.push(`${metrics.changeVolume} lines changed (substantial changes)`);
    }
    else if (metrics.changeVolume > 100) {
        reasoning.push(`${metrics.changeVolume} lines changed (moderate changes)`);
    }
    // Operation type reasoning
    if (metrics.operationType === "refactor") {
        reasoning.push("Refactoring requires careful planning and validation");
    }
    else if (metrics.operationType === "debug") {
        reasoning.push("Debugging complexity varies based on issue depth");
    }
    // Risk level reasoning
    if (metrics.riskLevel === "critical") {
        reasoning.push("Critical risk level requires extra validation");
    }
    else if (metrics.riskLevel === "high") {
        reasoning.push("High risk requires careful review");
    }
    // Dependencies reasoning
    if (metrics.dependencies > 5) {
        reasoning.push(`${metrics.dependencies} dependencies increase coordination needs`);
    }
    // Score-based reasoning
    if (score > 75) {
        reasoning.push("Enterprise-level complexity requires full orchestration");
    }
    else if (score > 50) {
        reasoning.push("Complex task benefits from multi-agent coordination");
    }
    else if (score > 25) {
        reasoning.push("Moderate complexity appropriate for specialized agents");
    }
    else {
        reasoning.push("Simple task suitable for direct agent assignment");
    }
    return reasoning;
}
//# sourceMappingURL=complexity-core.js.map