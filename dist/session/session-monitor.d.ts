/**
 * Session Monitor
 *
 * Provides real-time monitoring of sessions with health checks,
 * performance tracking, and alerting capabilities.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */
import { StringRayStateManager } from "../state/state-manager.js";
import { SessionCoordinator } from "../delegation/session-coordinator.js";
import { SessionCleanupManager } from "./session-cleanup-manager.js";
export interface SessionHealth {
    sessionId: string;
    status: "healthy" | "degraded" | "critical" | "unknown";
    lastCheck: number;
    responseTime: number;
    errorCount: number;
    activeAgents: number;
    memoryUsage: number;
    issues: string[];
}
export interface SessionMetrics {
    sessionId: string;
    timestamp: number;
    totalInteractions: number;
    successfulInteractions: number;
    failedInteractions: number;
    averageResponseTime: number;
    conflictResolutionRate: number;
    coordinationEfficiency: number;
    memoryUsage: number;
    agentCount: number;
}
export interface InteractionRecord {
    timestamp: number;
    duration: number;
    success: boolean;
    agentId?: string;
    operation?: string;
}
export interface MonitorConfig {
    healthCheckIntervalMs: number;
    metricsCollectionIntervalMs: number;
    alertThresholds: {
        maxResponseTime: number;
        maxErrorRate: number;
        maxMemoryUsage: number;
        minCoordinationEfficiency: number;
        maxConflicts: number;
    };
    enableAlerts: boolean;
    enableMetrics: boolean;
}
export interface Alert {
    id: string;
    sessionId: string;
    type: "health" | "performance" | "resource" | "coordination";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: number;
    resolved: boolean;
    resolvedAt?: number;
}
export declare class SessionMonitor {
    private stateManager;
    private sessionCoordinator;
    private cleanupManager;
    private config;
    private healthChecks;
    private metricsHistory;
    private activeAlerts;
    private healthCheckInterval?;
    private metricsInterval?;
    private interactionHistory;
    private sessionResponseTimes;
    private sessionErrors;
    constructor(stateManager: StringRayStateManager, sessionCoordinator: SessionCoordinator, cleanupManager: SessionCleanupManager, config?: Partial<MonitorConfig>);
    private initialize;
    registerSession(sessionId: string): void;
    unregisterSession(sessionId: string): void;
    performHealthCheck(sessionId: string): Promise<SessionHealth>;
    collectMetrics(sessionId: string): SessionMetrics | null;
    getHealthStatus(sessionId: string): SessionHealth | null;
    getMetricsHistory(sessionId: string, limit?: number): SessionMetrics[];
    getActiveAlerts(sessionId?: string): Alert[];
    resolveAlert(alertId: string): boolean;
    getMonitoringStats(): {
        totalSessions: number;
        healthySessions: number;
        degradedSessions: number;
        criticalSessions: number;
        activeAlerts: number;
        totalMetricsPoints: number;
    };
    private startHealthChecks;
    private startMetricsCollection;
    private generateAlerts;
    private loadPersistedData;
    private persistHealthData;
    private persistMetricsData;
    private persistAlertData;
    shutdown(): void;
    /**
     * Record an interaction for tracking
     */
    recordInteraction(sessionId: string, interaction: InteractionRecord): void;
    /**
     * Get interaction history for a session
     */
    getInteractionHistory(sessionId: string, limit?: number): InteractionRecord[];
    /**
     * Perform comprehensive health checks on a session
     */
    private performComprehensiveHealthChecks;
    /**
     * Calculate failure ratio from interactions
     */
    private calculateFailureRatio;
    /**
     * Calculate conflict resolution rate from interactions
     */
    private calculateConflictResolutionRate;
    /**
     * Calculate coordination efficiency from interactions
     */
    private calculateCoordinationEfficiency;
    private persistInteractionData;
    private calculateSessionMemoryUsage;
    private countSessionConflicts;
    private calculateAverageResponseTime;
}
export declare const createSessionMonitor: (stateManager: StringRayStateManager, sessionCoordinator: SessionCoordinator, cleanupManager: SessionCleanupManager, config?: Partial<MonitorConfig>) => SessionMonitor;
//# sourceMappingURL=session-monitor.d.ts.map