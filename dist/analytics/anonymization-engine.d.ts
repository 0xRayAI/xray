/**
 * Anonymization Engine for StringRay Central Analytics
 *
 * Removes personally identifiable information and project-specific data
 * while preserving learning value through pattern extraction.
 *
 * @version 1.0.0
 * @since 2026-03-06
 */
export interface RawReflectionData {
    projectName: string;
    repositoryUrl: string;
    reflection: string;
    filePath: string;
    author: string;
    authorEmail: string;
    code: string;
    timestamp: Date;
    ipAddress?: string;
    apiKey?: string;
}
export interface AnonymizedReflection {
    submissionId: string;
    metadata: {
        submissionId: string;
        frameworkVersion: string;
        timestampRelative: number;
        region: string | undefined;
    };
    content: {
        taskType: string;
        complexity: number;
        routedAgent: string;
        outcome: "success" | "failure";
        duration: number;
        confidence: number;
        emotionalContext: {
            struggleLevel: "none" | "low" | "medium" | "high" | "extreme";
            frustrationIndicators: number;
            hasCounterfactualAnalysis: boolean;
            depthScore: number;
        };
        patterns: {
            keywordsMatched: string[];
            kernelPattern?: string | undefined;
            successRate: number;
        };
        reflectionStructure: {
            hasInnerDialogue: boolean;
            hasCounterfactual: boolean;
            hasMasterWisdom: boolean;
            emotionalHonestyScore: number;
            lengthCategory: "short" | "medium" | "long";
        };
    };
}
export declare class AnonymizationEngine {
    private frameworkVersion;
    /**
     * Anonymize raw reflection data
     */
    anonymize(rawData: RawReflectionData): AnonymizedReflection;
    /**
     * Extract learning signals from raw data
     */
    private extractLearningSignals;
    /**
     * Detect task type from reflection content
     */
    private detectTaskType;
    /**
     * Estimate complexity from reflection content
     */
    private estimateComplexity;
    /**
     * Detect agent from reflection content using keyword matching
     */
    private extractAgentName;
    /**
     * Detect outcome from reflection
     */
    private detectOutcome;
    /**
     * Extract emotional context indicators
     */
    private extractEmotionalContext;
    /**
     * Extract patterns from reflection
     */
    private extractPatterns;
    /**
     * Analyze reflection structure
     */
    private analyzeReflectionStructure;
    /**
     * Standardize agent names
     */
    private standardizeAgentName;
    /**
     * Anonymize timestamp to relative time
     */
    private anonymizeTimestamp;
    /**
     * Anonymize region from IP address
     */
    private anonymizeRegion;
}
//# sourceMappingURL=anonymization-engine.d.ts.map