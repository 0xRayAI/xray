/**
 * Emerging Pattern Detector for P9 - ADAPTIVE_PATTERN_LEARNING
 *
 * Discovers new routing patterns from recent task requests,
 * identifies emergent behaviors, and suggests new pattern candidates.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import type { EmergentPattern } from "../core/kernel-patterns.js";
import type { RoutingOutcome } from "../delegation/config/types.js";
export interface ClusterResult {
    clusterId: string;
    patterns: string[];
    frequency: number;
    keywords: string[];
    suggestedAgents: string[];
    suggestedSkills: string[];
    confidence: number;
}
export interface PatternDiscoveryResult {
    emergentPatterns: EmergentPattern[];
    clusters: ClusterResult[];
    recommendations: string[];
}
export declare class EmergingPatternDetector {
    private readonly minFrequencyThreshold;
    private readonly minConfidenceThreshold;
    private readonly clusterSimilarityThreshold;
    private readonly maxClusters;
    private readonly stopWords;
    /**
     * Extract meaningful keywords from task description
     */
    private extractKeywords;
    /**
     * Calculate Jaccard similarity between two keyword sets
     */
    private calculateSimilarity;
    /**
     * Cluster similar task descriptions
     */
    private clusterTasks;
    /**
     * Detect emergent patterns from recent routing outcomes
     */
    detectEmergingPatterns(outcomes: RoutingOutcome[]): PatternDiscoveryResult;
    /**
     * Check if a specific pattern is emerging
     */
    isPatternEmerging(pattern: string, recentOutcomes: RoutingOutcome[], historicalBaseline: number): {
        emerging: boolean;
        trend: 'increasing' | 'decreasing' | 'stable';
        confidence: number;
    };
    /**
     * Get suggested keyword mappings from emergent patterns
     */
    suggestKeywordMappings(emergentPatterns: EmergentPattern[]): Array<{
        keywords: string[];
        suggestedAgent: string;
        suggestedSkill: string;
        confidence: number;
        reason: string;
    }>;
}
export declare const emergingPatternDetector: EmergingPatternDetector;
//# sourceMappingURL=emerging-pattern-detector.d.ts.map