/**
 * Agent Metrics System
 *
 * Comprehensive metrics tracking for all agent invocations including:
 * - Invocation tracking (who, when, success/failure)
 * - Aggregation by agent type, time period, complexity level
 * - History tracking with configurable retention
 * - Export functionality (JSON, CSV, summary reports)
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
import { StringRayStateManager } from "../state/state-manager.js";
export interface AgentInvocation {
    id: string;
    agentName: string;
    agentType: AgentType;
    timestamp: number;
    operation: string;
    description: string;
    complexityLevel: ComplexityLevel;
    complexityScore: number;
    duration: number;
    success: boolean;
    error: string | undefined;
    sessionId: string | undefined;
    parentTaskId: string | undefined;
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    metadata: Record<string, unknown> | undefined;
}
export type AgentType = "orchestrator" | "architect" | "enforcer" | "code-analyzer" | "code-reviewer" | "researcher" | "frontend-engineer" | "backend-engineer" | "devops-engineer" | "security-auditor" | "database-engineer" | "testing-lead" | "performance-engineer" | "refactorer" | "bug-triage-specialist" | "strategist" | "tech-writer" | "content-creator" | "seo-consultant" | "growth-strategist" | "log-monitor" | "multimodal-looker" | "mobile-developer" | "frontend-ui-ux-engineer" | "custom" | "unknown";
export type ComplexityLevel = "simple" | "moderate" | "complex" | "enterprise";
export interface AgentInvocationSummary {
    agentName: string;
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    successRate: number;
    averageDuration: number;
    averageComplexity: number;
    lastInvoked: number;
    firstInvoked: number;
    operations: string[];
}
export interface TimePeriodSummary {
    period: string;
    periodType: "hour" | "day" | "week" | "month";
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    successRate: number;
    averageDuration: number;
    agents: Record<string, number>;
}
export interface ComplexitySummary {
    level: ComplexityLevel;
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    successRate: number;
    averageDuration: number;
    agents: Record<string, number>;
}
export interface AggregatedAgentMetrics {
    summary: {
        totalInvocations: number;
        totalAgents: number;
        timeRange: {
            start: number;
            end: number;
        };
        overallSuccessRate: number;
        averageDuration: number;
    };
    byAgent: Record<string, AgentInvocationSummary>;
    byTimePeriod: Record<string, TimePeriodSummary>;
    byComplexity: Record<string, ComplexitySummary>;
}
export interface MetricsRetentionConfig {
    maxEntries: number;
    maxAgeMs: number;
    enableAutoCleanup: boolean;
    cleanupIntervalMs: number;
}
export interface MetricsExport {
    format: "json" | "csv" | "summary" | "detailed";
    data: unknown;
    exportedAt: number;
    entryCount: number;
    metadata: {
        fromDate: number | undefined;
        toDate: number | undefined;
        filter: Record<string, unknown> | undefined;
    };
}
export interface AgentMetricsFilter {
    agentNames?: string[];
    agentTypes?: AgentType[];
    timeRange?: {
        start: number;
        end: number;
    };
    complexityLevels?: ComplexityLevel[];
    successOnly?: boolean;
    failureOnly?: boolean;
    sessionId?: string;
}
export declare class AgentMetricsSystem {
    private stateManager;
    private retentionConfig;
    private cleanupInterval;
    private initialized;
    constructor(stateManager: StringRayStateManager, retentionConfig?: Partial<MetricsRetentionConfig>);
    initialize(): Promise<void>;
    private startAutoCleanup;
    private performCleanup;
    private getInvocations;
    private saveInvocations;
    private generateId;
    trackInvocation(params: {
        agentName: string;
        agentType: AgentType;
        operation: string;
        description?: string;
        complexityLevel?: ComplexityLevel;
        complexityScore?: number;
        duration?: number;
        success: boolean;
        error?: string;
        sessionId?: string;
        parentTaskId?: string;
        inputTokens?: number;
        outputTokens?: number;
        metadata?: Record<string, unknown>;
    }): AgentInvocation;
    trackSuccess(params: Omit<Parameters<typeof this.trackInvocation>[0], "success" | "error">): AgentInvocation;
    trackFailure(params: Omit<Parameters<typeof this.trackInvocation>[0], "success"> & {
        error: string;
    }): AgentInvocation;
    getInvocationsByAgent(agentName: string): AgentInvocation[];
    getInvocationsBySession(sessionId: string): AgentInvocation[];
    getInvocationsByTimeRange(start: number, end: number): AgentInvocation[];
    filterInvocations(filter: AgentMetricsFilter): AgentInvocation[];
    aggregateMetrics(filter?: AgentMetricsFilter): AggregatedAgentMetrics;
    private getHourKey;
    private getDayKey;
    private getWeekKey;
    private getMonthKey;
    private getWeekNumber;
    private getPeriodType;
    getAgentSummary(agentName: string): AgentInvocationSummary | null;
    getTimePeriodSummary(period: string, periodType: "hour" | "day" | "week" | "month"): TimePeriodSummary | null;
    getComplexitySummary(level: ComplexityLevel): ComplexitySummary | null;
    cleanup(olderThanMs?: number, maxEntries?: number): {
        removed: number;
        total: number;
        byAgent: Record<string, number>;
    };
    resetMetrics(): void;
    exportMetrics(format?: "json" | "csv" | "summary" | "detailed", filter?: AgentMetricsFilter): MetricsExport;
    private toCSV;
    private escapeCSV;
    getStatistics(): {
        totalInvocations: number;
        uniqueAgents: number;
        oldestInvocation: number | null;
        newestInvocation: number | null;
        successRate: number;
        averageDuration: number;
        topAgents: Array<{
            name: string;
            count: number;
        }>;
    };
    updateRetentionConfig(config: Partial<MetricsRetentionConfig>): void;
    destroy(): void;
}
export declare function getAgentMetricsSystem(stateManager?: StringRayStateManager): AgentMetricsSystem;
export declare function initializeAgentMetrics(stateManager: StringRayStateManager): AgentMetricsSystem;
export declare function resetAgentMetricsSystem(): void;
//# sourceMappingURL=agent-metrics.d.ts.map