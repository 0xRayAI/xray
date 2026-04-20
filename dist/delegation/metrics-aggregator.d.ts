/**
 * Metrics Aggregator
 *
 * Provides aggregation, reporting, and export functionality for delegation
 * and orchestration metrics stored in stateManager.
 *
 * @version 1.0.0
 * @since 2026-04-16
 */
import type { StringRayStateManager } from "../state/state-manager.js";
export interface DelegationMetricEntry {
    timestamp: number;
    operation: string;
    strategy: string;
    complexity: {
        level: string;
        score: number;
    };
    estimatedDuration: number;
    agents: string[];
    results?: Array<{
        agent: string;
        success: boolean;
    }>;
    totalTime?: number;
    success?: boolean;
    errors?: string[];
    analysisOnly: boolean;
    sessionId?: string;
}
export interface OrchestrationMetricEntry {
    timestamp: number;
    parentTask: string;
    operation: string;
    orchestratorType: string;
    subAgents: Array<{
        name: string;
        role: string;
        confidence: number;
    }>;
    complexityLevel: string;
    complexityScore: number;
    sessionId?: string;
}
export interface AggregatedMetrics {
    summary: {
        totalEntries: number;
        timeRange: {
            start: number;
            end: number;
        };
        oldestEntry: number;
        newestEntry: number;
    };
    byAgent: Record<string, {
        count: number;
        operations: string[];
        avgComplexity: number;
        successRate: number;
    }>;
    byComplexityLevel: Record<string, {
        count: number;
        avgDuration: number;
        operations: string[];
    }>;
    byTimePeriod: Record<string, {
        count: number;
        operations: string[];
    }>;
}
export interface MetricsExport {
    format: "json" | "csv" | "summary";
    data: unknown;
    exportedAt: number;
    entryCount: number;
}
export declare function getDelegationMetrics(stateManager: StringRayStateManager): DelegationMetricEntry[];
export declare function getOrchestrationMetrics(stateManager: StringRayStateManager): OrchestrationMetricEntry[];
export declare function aggregateDelegationMetrics(stateManager: StringRayStateManager): AggregatedMetrics;
export declare function aggregateOrchestrationMetrics(stateManager: StringRayStateManager): AggregatedMetrics;
export declare function summarizeByAgent(stateManager: StringRayStateManager, type?: "delegation" | "orchestration"): Record<string, unknown>;
export declare function summarizeByComplexityLevel(stateManager: StringRayStateManager, type?: "delegation" | "orchestration"): Record<string, unknown>;
export declare function summarizeByTimePeriod(stateManager: StringRayStateManager, type?: "delegation" | "orchestration"): Record<string, unknown>;
export declare function rotateMetrics(stateManager: StringRayStateManager, maxEntries?: number): {
    delegation: number;
    orchestration: number;
};
export declare function cleanupOldMetrics(stateManager: StringRayStateManager, olderThan: number): {
    delegation: number;
    orchestration: number;
};
export declare function exportMetrics(stateManager: StringRayStateManager, format?: "json" | "csv" | "summary"): MetricsExport;
//# sourceMappingURL=metrics-aggregator.d.ts.map