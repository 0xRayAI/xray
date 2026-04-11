/**
 * Prompt Pattern Analyzer for 0xRay
 *
 * Analyzes actual vs. template prompts to detect gaps and emerging patterns.
 * Integrates with RoutingOutcomeTracker to provide insights for template optimization.
 *
 * @version 1.0.0
 * @since 2026-03-05
 */
export interface TemplateGap {
    gapType: "missing_template" | "pattern_mismatch" | "emerging_pattern";
    userRequest: string;
    generatedPrompt: string;
    suggestedAgent: string;
    suggestedSkill: string;
    frequency: number;
    lastSeen: Date;
    confidence: number;
}
export interface EmergingPattern {
    patternId: string;
    keywords: string[];
    sampleRequests: string[];
    suggestedAgent: string;
    suggestedSkill: string;
    confidence: number;
    frequency: number;
    avgConfidence: number;
    successRate: number;
}
export interface PromptComparisonResult {
    totalPrompts: number;
    templateMatches: number;
    nonTemplatePrompts: number;
    templateMatchRate: number;
    gaps: TemplateGap[];
    emergingPatterns: EmergingPattern[];
    topMissedKeywords: Array<{
        keyword: string;
        count: number;
        suggestedMappings: string[];
    }>;
    agentCoverage: Map<string, {
        total: number;
        withTemplate: number;
        withoutTemplate: number;
    }>;
}
export interface TemplateOptimizationSuggestion {
    suggestionType: "add_template" | "update_keywords" | "merge_patterns" | "remove_template";
    templateName?: string;
    keywords: string[];
    targetAgent: string;
    targetSkill: string;
    confidence: number;
    expectedImpact: string;
    reasoning: string;
}
declare class PromptPatternAnalyzer {
    private readonly minFrequencyThreshold;
    private readonly confidenceThreshold;
    private readonly emergingPatternMinSamples;
    /**
     * Analyze prompt patterns and compare against templates
     */
    analyzePromptPatterns(): PromptComparisonResult;
    /**
     * Detect gaps where templates don't match user requests
     */
    private detectTemplateGaps;
    /**
     * Identify emerging patterns from real usage
     */
    private identifyEmergingPatterns;
    /**
     * Analyze frequently missed keywords
     */
    private analyzeMissedKeywords;
    /**
     * Calculate agent coverage metrics
     */
    private calculateAgentCoverage;
    /**
     * Generate template optimization suggestions
     */
    generateOptimizationSuggestions(comparisonResult: PromptComparisonResult): TemplateOptimizationSuggestion[];
    /**
     * Get analytics summary as formatted report
     */
    generateReport(comparisonResult: PromptComparisonResult): string;
    private classifyGapType;
    private normalizeRequest;
    private extractKeywords;
    private generatePatternId;
    private selectBestAgent;
    private emptyComparisonResult;
}
export declare const promptPatternAnalyzer: PromptPatternAnalyzer;
export {};
//# sourceMappingURL=prompt-pattern-analyzer.d.ts.map