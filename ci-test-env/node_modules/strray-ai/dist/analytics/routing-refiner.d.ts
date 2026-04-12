/**
 * Routing Refiner for 0xRay
 *
 * Suggests new keyword mappings, optimizes existing mappings, and generates
 * configuration updates based on analytics data from the routing system.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
import { type PromptComparisonResult } from "./prompt-pattern-analyzer.js";
import { routingPerformanceAnalyzer } from "./routing-performance-analyzer.js";
export interface KeywordMappingSuggestion {
    keyword: string;
    targetAgent: string;
    targetSkill: string;
    suggestedConfidence: number;
    reason: string;
    evidence: {
        frequency: number;
        successRate: number;
        avgConfidence: number;
        sampleRequests: string[];
    };
    priority: "high" | "medium" | "low";
}
export interface MappingOptimization {
    mappingId: string;
    currentKeywords: string[];
    currentAgent: string;
    currentSkill: string;
    optimizationType: "add_keywords" | "remove_keywords" | "adjust_confidence" | "reassign_agent";
    suggestedChanges: {
        keywordsToAdd?: string[];
        keywordsToRemove?: string[];
        newConfidence?: number;
        newAgent?: string;
    };
    reason: string;
    expectedImpact: string;
}
export interface ConfigurationUpdate {
    version: string;
    generatedAt: Date;
    summary: {
        newMappings: number;
        optimizedMappings: number;
        removedMappings: number;
        estimatedImprovement: string;
    };
    newMappings: KeywordMappingSuggestion[];
    optimizations: MappingOptimization[];
    warnings: string[];
}
export interface RefinementReport {
    promptAnalysis: PromptComparisonResult;
    performanceReport: ReturnType<typeof routingPerformanceAnalyzer.generatePerformanceReport>;
    configurationUpdate: ConfigurationUpdate;
    implementationSteps: string[];
}
declare class RoutingRefiner {
    private readonly minSamplesForSuggestion;
    private readonly minSuccessRateForSuggestion;
    private readonly minConfidenceForSuggestion;
    /**
     * Generate comprehensive routing refinement recommendations
     */
    generateRefinementReport(): RefinementReport;
    /**
     * Generate configuration update suggestions
     */
    private generateConfigurationUpdate;
    /**
     * Suggest new keyword mappings based on analysis
     */
    private suggestNewKeywordMappings;
    /**
     * Suggest optimizations for existing mappings
     */
    private suggestMappingOptimizations;
    /**
     * Generate warnings for configuration updates
     */
    private generateWarnings;
    /**
     * Generate implementation steps
     */
    private generateImplementationSteps;
    /**
     * Get formatted refinement report
     */
    generateFormattedReport(): string;
    /**
     * Export configuration update as JSON
     */
    exportConfigurationUpdate(): string;
    private calculatePriority;
    private extractKeywords;
    private selectBestAgentForMapping;
    private deduplicateSuggestions;
    private calculateRemovals;
    private estimateImprovement;
}
export declare const routingRefiner: RoutingRefiner;
export {};
//# sourceMappingURL=routing-refiner.d.ts.map