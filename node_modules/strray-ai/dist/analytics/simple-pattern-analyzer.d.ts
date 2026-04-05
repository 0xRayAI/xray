/**
 * Simple Pattern Analyzer for StringRay
 *
 * Reads activity log → Counts patterns → Generates insights
 *
 * This is the "learning" system - simple pattern matching, not ML.
 *
 * @version 1.0.0
 */
import type { Outcome, ComplexityAccuracy } from "../core/framework-logger.js";
export interface ParsedLogEntry {
    timestamp: string;
    jobId: string;
    component: string;
    action: string;
    status: string;
    duration?: number;
    complexityScore?: number;
    agentUsed?: string;
    operationType?: string;
    outcome?: Outcome;
    complexityAccuracy?: ComplexityAccuracy;
}
export interface AgentStats {
    attempts: number;
    successes: number;
    failures: number;
    escalated: number;
    autoFixed: number;
    avgDuration: number;
    totalDuration: number;
}
export interface TaskTypeStats {
    count: number;
    successRate: number;
    avgComplexity: number;
}
export interface ComplexityStats {
    underestimated: number;
    accurate: number;
    overestimated: number;
    total: number;
}
export interface PatternInsights {
    agentStats: Map<string, AgentStats>;
    taskTypeStats: Map<string, TaskTypeStats>;
    complexityStats: ComplexityStats;
    totalEntries: number;
    dateRange: {
        start: string;
        end: string;
    };
}
export declare class SimplePatternAnalyzer {
    private logPath;
    private outcomesPath;
    constructor(logPath?: string);
    /**
     * Main analysis method - reads log and returns insights
     */
    analyze(limit?: number): Promise<PatternInsights>;
    /**
     * Parse a single log line
     */
    private parseLine;
    /**
     * Calculate statistics from parsed entries
     */
    private calculateStats;
    /**
     * Generate human-readable insights
     */
    generateInsights(insights: PatternInsights): string[];
    /**
     * Generate insights as a formatted report
     */
    generateReport(): Promise<string>;
    private emptyInsights;
}
export declare const patternAnalyzer: SimplePatternAnalyzer;
//# sourceMappingURL=simple-pattern-analyzer.d.ts.map