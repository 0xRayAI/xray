/**
 * Session Monitor
 *
 * Provides real-time monitoring of sessions with health checks,
 * performance tracking, and alerting capabilities.
 *
 * @since 2026-01-07
 */

import { XrayStateManager } from "../state/state-manager.js";
import { SessionCoordinator } from "../delegation/session-coordinator.js";
import { SessionCleanupManager } from "./session-cleanup-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";

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

export class SessionMonitor {
  private stateManager: XrayStateManager;
  private sessionCoordinator: SessionCoordinator;
  private cleanupManager: SessionCleanupManager | undefined;
  private config: MonitorConfig;
  private healthChecks = new Map<string, SessionHealth>();
  private metricsHistory = new Map<string, SessionMetrics[]>();
  private activeAlerts = new Map<string, Alert>();
  private healthCheckInterval?: NodeJS.Timeout | undefined;
  private metricsInterval?: NodeJS.Timeout | undefined;
  private interactionHistory = new Map<string, InteractionRecord[]>();
  private sessionResponseTimes = new Map<string, number[]>();
  private sessionErrors = new Map<string, number>();
  /** Stable store records. A field write patches one session instead of cloning the map. */
  private healthRecord: Record<string, SessionHealth> = {};
  private metricsRecord: Record<string, SessionMetrics[]> = {};
  private alertRecord: Record<string, Alert> = {};
  private interactionRecord: Record<string, InteractionRecord[]> = {};
  private responseTotals = new Map<string, { sum: number; count: number }>();
  private outcomeTotals = new Map<string, { success: number; failed: number }>();

  constructor(
    stateManager: XrayStateManager,
    sessionCoordinator: SessionCoordinator,
    cleanupManager: SessionCleanupManager,
    config: Partial<MonitorConfig> = {},
  ) {
    this.stateManager = stateManager;
    this.sessionCoordinator = sessionCoordinator;
    this.cleanupManager = cleanupManager;
    this.config = {
      healthCheckIntervalMs: 30000,
      metricsCollectionIntervalMs: 60000,
      alertThresholds: {
        maxResponseTime: 5000,
        maxErrorRate: 0.1,
        maxMemoryUsage: 100 * 1024 * 1024,
        minCoordinationEfficiency: 0.8,
        maxConflicts: 10,
      },
      enableAlerts: true,
      enableMetrics: true,
      ...config,
    };

    this.loadPersistedData();
  }

  start(): void {
    if (this.config.enableAlerts) {
      this.startHealthChecks();
    }

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  registerSession(sessionId: string): void {
    const health: SessionHealth = {
      sessionId,
      status: "unknown",
      lastCheck: 0,
      responseTime: 0,
      errorCount: 0,
      activeAgents: 0,
      memoryUsage: 0,
      issues: [],
    };

    this.healthChecks.set(sessionId, health);
    this.metricsHistory.set(sessionId, []);
    this.persistHealth(sessionId);

    frameworkLogger.log("session-monitor", "session-registered", "info", {
      sessionId,
    });
  }

  unregisterSession(sessionId: string): void {
    this.healthChecks.delete(sessionId);
    this.metricsHistory.delete(sessionId);

    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.sessionId === sessionId) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
      }
    }

    this.persistHealth(sessionId);
    frameworkLogger.log("session-monitor", "session-unregistered", "info", {
      sessionId,
    });
  }

  async performHealthCheck(sessionId: string): Promise<SessionHealth> {
    const jobId = `session-health-check-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();
    const health = this.healthChecks.get(sessionId);

    if (!health) {
      throw new Error(`Session ${sessionId} not registered for monitoring`);
    }

    const issues: string[] = [];
    let status: SessionHealth["status"] = "healthy";

    try {
      const sessionStatus = this.sessionCoordinator.getSessionStatus(sessionId);
      if (!sessionStatus) {
        // Session was cleaned up but monitor wasn't notified - auto-unregister silently
        frameworkLogger.log(
          "session-monitor",
          "auto-unregister-cleaned-session",
          "info",
          { jobId, sessionId },
        );
        this.unregisterSession(sessionId);
        // Return a basic health status for the cleaned up session
        return {
          sessionId,
          status: "unknown" as const,
          lastCheck: Date.now(),
          responseTime: 0,
          errorCount: 0,
          activeAgents: 0,
          memoryUsage: 0,
          issues: ["Session was cleaned up"],
        };
      } else {
        health.activeAgents = sessionStatus.agentCount;

        this.performComprehensiveHealthChecks(sessionId, health, issues, sessionStatus);

        if (health.errorCount > 10) {
          issues.push(`High error count: ${health.errorCount} errors detected`);
          status = "degraded";
        }

        if (health.responseTime > this.config.alertThresholds.maxResponseTime * 2) {
          issues.push(`Critical response time: ${health.responseTime}ms (exceeded 2x threshold)`);
          status = "critical";
        }

        const failedRatio = this.calculateFailureRatio(sessionId);
        if (failedRatio > this.config.alertThresholds.maxErrorRate) {
          issues.push(`High failure rate: ${(failedRatio * 100).toFixed(1)}% failed interactions`);
          status = status === "healthy" ? "degraded" : status;
        }
      }

      const metadata = this.cleanupManager?.getSessionMetadata(sessionId);
      if (metadata) {
        health.memoryUsage = metadata.memoryUsage;
        health.activeAgents = metadata.agentCount;

        if (metadata.memoryUsage > this.config.alertThresholds.maxMemoryUsage) {
          issues.push(
            `High memory usage: ${Math.round(metadata.memoryUsage / 1024 / 1024)}MB`,
          );
          status = "degraded";
        }
      } else {
        // Calculate real session metrics when metadata not available
        health.memoryUsage = this.calculateSessionMemoryUsage(sessionId);
        health.activeAgents = sessionStatus.agentCount;
      }

      // Check for coordination issues
      const conflictCount = this.countSessionConflicts(sessionId);
      if (conflictCount > this.config.alertThresholds.maxConflicts) {
        issues.push(
          `High conflict rate: ${conflictCount} unresolved conflicts`,
        );
        status = "degraded";
      }

      // Check for communication delays
      const avgResponseTime = this.calculateAverageResponseTime(sessionId);
      if (avgResponseTime > this.config.alertThresholds.maxResponseTime) {
        issues.push(`Slow response time: ${avgResponseTime}ms average`);
        status = "degraded";
      }
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      status = "critical";
      health.errorCount++;
    }

    const responseTime = Date.now() - startTime;

    if (responseTime > this.config.alertThresholds.maxResponseTime) {
      issues.push(`Slow response time: ${responseTime}ms`);
      status = "degraded";
    }

    health.status = status;
    health.lastCheck = Date.now();
    health.responseTime = responseTime;
    health.issues = issues;

    this.persistHealth(sessionId);

    if (issues.length > 0 && this.config.enableAlerts) {
      this.generateAlerts(sessionId, issues, status);
    }

    return health;
  }

  collectMetrics(sessionId: string): SessionMetrics | null {
    const sessionStatus = this.sessionCoordinator.getSessionStatus(sessionId);
    if (!sessionStatus) return null;

    const metadata = this.cleanupManager?.getSessionMetadata(sessionId);
    const interactions = this.interactionHistory.get(sessionId) || [];
    const { success: successfulInteractions, failed: failedInteractions, total: totalInteractions } =
      this.outcomeOf(sessionId);

    const avgResponseTime = this.responseAverage(sessionId);

    const conflictResolutionRate = this.calculateConflictResolutionRate(sessionId);
    const coordinationEfficiency = this.calculateCoordinationEfficiency(sessionId, interactions ?? []);

    const metrics: SessionMetrics = {
      timestamp: Date.now(),
      sessionId,
      totalInteractions,
      successfulInteractions,
      failedInteractions,
      averageResponseTime: avgResponseTime,
      conflictResolutionRate,
      coordinationEfficiency,
      memoryUsage: metadata?.memoryUsage || this.calculateSessionMemoryUsage(sessionId),
      agentCount: sessionStatus.agentCount,
    };

    let history = this.metricsHistory.get(sessionId);
    if (!history) {
      history = [];
      this.metricsHistory.set(sessionId, history);
    }
    history.push(metrics);

    if (history.length > 100) {
      history.shift();
    }

    this.metricsRecord[sessionId] = history;
    for (const key of Object.keys(this.metricsRecord)) {
      if (!this.metricsHistory.has(key)) delete this.metricsRecord[key];
    }
    this.stateManager.set("monitor:metrics", this.metricsRecord);

    return metrics;
  }

  getHealthStatus(sessionId: string): SessionHealth | null {
    return this.healthChecks.get(sessionId) || null;
  }

  getMetricsHistory(sessionId: string, limit = 50): SessionMetrics[] {
    const history = this.metricsHistory.get(sessionId) || [];
    return history.slice(-limit);
  }

  getActiveAlerts(sessionId?: string): Alert[] {
    if (!sessionId) return Array.from(this.activeAlerts.values());
    const matched: Alert[] = [];
    for (const alert of this.activeAlerts.values()) {
      if (alert.sessionId === sessionId) matched.push(alert);
    }
    return matched;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      delete this.alertRecord[alertId];
      this.stateManager.set("monitor:alerts", this.alertRecord);
      frameworkLogger.log("session-monitor", "alert-resolved", "info", {
        alertId,
      });
      return true;
    }
    return false;
  }

  getMonitoringStats(): {
    totalSessions: number;
    healthySessions: number;
    degradedSessions: number;
    criticalSessions: number;
    activeAlerts: number;
    totalMetricsPoints: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let critical = 0;

    for (const health of this.healthChecks.values()) {
      switch (health.status) {
        case "healthy":
          healthy++;
          break;
        case "degraded":
          degraded++;
          break;
        case "critical":
          critical++;
          break;
      }
    }

    let totalMetrics = 0;
    for (const history of this.metricsHistory.values()) {
      totalMetrics += history.length;
    }

    return {
      totalSessions: this.healthChecks.size,
      healthySessions: healthy,
      degradedSessions: degraded,
      criticalSessions: critical,
      activeAlerts: this.activeAlerts.size,
      totalMetricsPoints: totalMetrics,
    };
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const sessionId of this.healthChecks.keys()) {
        try {
          await this.performHealthCheck(sessionId);
        } catch (error) {
          frameworkLogger.log("session-monitor", "health-check-failed", "error", {
            error,
            message: `Health check failed for ${sessionId}`,
          });
        }
      }
    }, this.config.healthCheckIntervalMs);

    frameworkLogger.log("session-monitor", "health-checks-started", "info", {
      intervalMs: this.config.healthCheckIntervalMs,
    });
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      for (const sessionId of this.metricsHistory.keys()) {
        try {
          this.collectMetrics(sessionId);
        } catch (error) {
          frameworkLogger.log("session-monitor", "metrics-collection-failed", "error", {
            error,
            message: `Metrics collection failed for ${sessionId}`,
          });
        }
      }
    }, this.config.metricsCollectionIntervalMs);

    frameworkLogger.log(
      "session-monitor",
      "metrics-collection-started",
      "info",
      { intervalMs: this.config.metricsCollectionIntervalMs },
    );
  }

  private generateAlerts(
    sessionId: string,
    issues: string[],
    status: SessionHealth["status"],
  ): void {
    const severity =
      status === "critical" ? "high" : status === "degraded" ? "medium" : "low";

    for (const issue of issues) {
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        sessionId,
        type: "health",
        severity,
        message: issue,
        timestamp: Date.now(),
        resolved: false,
      };

      this.activeAlerts.set(alert.id, alert);
      this.alertRecord[alert.id] = alert;
      frameworkLogger.log("session-monitor", "alert-generated", "info", {
        sessionId,
        issue,
      });
    }

    this.stateManager.set("monitor:alerts", this.alertRecord);
  }

  private loadPersistedData(): void {
    const healthData =
      this.stateManager.get<Record<string, SessionHealth>>("monitor:health");
    if (healthData && typeof healthData === "object" && !Array.isArray(healthData)) {
      this.healthRecord = healthData;
      for (const [sessionId, health] of Object.entries(healthData)) {
        this.healthChecks.set(sessionId, health);
      }
    }

    const metricsData =
      this.stateManager.get<Record<string, SessionMetrics[]>>(
        "monitor:metrics",
      );
    if (metricsData && typeof metricsData === "object" && !Array.isArray(metricsData)) {
      this.metricsRecord = metricsData;
      for (const [sessionId, history] of Object.entries(metricsData)) {
        this.metricsHistory.set(sessionId, history);
      }
    }

    const alertData =
      this.stateManager.get<Record<string, Alert>>("monitor:alerts");
    if (alertData && typeof alertData === "object" && !Array.isArray(alertData)) {
      this.alertRecord = alertData;
      for (const [alertId, alert] of Object.entries(alertData)) {
        this.activeAlerts.set(alertId, alert);
      }
    }
  }

  private persistHealth(sessionId: string): void {
    const health = this.healthChecks.get(sessionId);
    if (health) this.healthRecord[sessionId] = health;
    else delete this.healthRecord[sessionId];
    this.stateManager.set("monitor:health", this.healthRecord);
  }

  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    frameworkLogger.log("session-monitor", "shutdown-complete", "info");
  }

  /**
   * Record an interaction for tracking
   */
  recordInteraction(
    sessionId: string,
    interaction: InteractionRecord,
  ): void {
    let interactions = this.interactionHistory.get(sessionId);
    if (!interactions) {
      interactions = [];
      this.interactionHistory.set(sessionId, interactions);
      this.interactionRecord[sessionId] = interactions;
    }
    interactions.push(interaction);

    let outcomes = this.outcomeTotals.get(sessionId);
    if (!outcomes) {
      outcomes = { success: 0, failed: 0 };
      this.outcomeTotals.set(sessionId, outcomes);
    }
    if (interaction.success) outcomes.success += 1;
    else outcomes.failed += 1;

    if (interactions.length > 100) {
      const removed = interactions.shift();
      if (removed) {
        if (removed.success) outcomes.success -= 1;
        else outcomes.failed -= 1;
      }
    }

    let responseTimes = this.sessionResponseTimes.get(sessionId);
    if (!responseTimes) {
      responseTimes = [];
      this.sessionResponseTimes.set(sessionId, responseTimes);
    }
    responseTimes.push(interaction.duration);
    const totals = this.responseTotals.get(sessionId) ?? { sum: 0, count: 0 };
    totals.sum += interaction.duration;
    totals.count += 1;
    this.responseTotals.set(sessionId, totals);

    if (!interaction.success) {
      const currentErrors = this.sessionErrors.get(sessionId) || 0;
      this.sessionErrors.set(sessionId, currentErrors + 1);
    }

    this.stateManager.set("monitor:interactions", this.interactionRecord);
  }

  /**
   * Get interaction history for a session
   */
  getInteractionHistory(sessionId: string, limit = 50): InteractionRecord[] {
    const history = this.interactionHistory.get(sessionId) || [];
    return history.slice(-limit);
  }

  /**
   * Perform comprehensive health checks on a session
   */
  private performComprehensiveHealthChecks(
    sessionId: string,
    health: SessionHealth,
    issues: string[],
    sessionStatus: { active: boolean; agentCount: number },
  ): void {
    if (!sessionStatus.active) {
      issues.push("Session is not active");
      health.status = "degraded";
    }

    const interactions = this.interactionHistory.get(sessionId);
    const lastInteraction = interactions && interactions.length > 0
      ? interactions[interactions.length - 1]
      : undefined;
    const staleThreshold = 5 * 60 * 1000;

    if (lastInteraction) {
      const timeSinceLastInteraction = Date.now() - lastInteraction.timestamp;

      if (timeSinceLastInteraction > staleThreshold) {
        issues.push(`Stale session: no activity for ${Math.round(timeSinceLastInteraction / 1000)}s`);
        health.status = "degraded";
      }
    }

    const avgResponseTime = this.responseAverage(sessionId);
    if (avgResponseTime > this.config.alertThresholds.maxResponseTime * 1.5) {
      issues.push(`Elevated response time: ${avgResponseTime.toFixed(0)}ms average`);
    }

    const coordinationEfficiency = this.calculateCoordinationEfficiency(sessionId, interactions ?? []);
    if (coordinationEfficiency < this.config.alertThresholds.minCoordinationEfficiency) {
      issues.push(`Low coordination efficiency: ${(coordinationEfficiency * 100).toFixed(0)}%`);
      health.status = "degraded";
    }
  }

  /**
   * Calculate failure ratio from interactions
   */
  private outcomeOf(sessionId: string): { success: number; failed: number; total: number } {
    const outcomes = this.outcomeTotals.get(sessionId);
    const success = outcomes?.success ?? 0;
    const failed = outcomes?.failed ?? 0;
    return { success, failed, total: success + failed };
  }

  private responseAverage(sessionId: string): number {
    const totals = this.responseTotals.get(sessionId);
    if (!totals || totals.count === 0) return 0;
    return totals.sum / totals.count;
  }

  private hasDiverseRecentAgents(interactions: InteractionRecord[]): boolean {
    const start = Math.max(0, interactions.length - 10);
    let first: string | undefined;
    for (let index = start; index < interactions.length; index += 1) {
      const agentId = interactions[index]?.agentId;
      if (!agentId) continue;
      if (first === undefined) first = agentId;
      else if (agentId !== first) return true;
    }
    return false;
  }

  private calculateFailureRatio(sessionId: string): number {
    const { failed, total } = this.outcomeOf(sessionId);
    if (total === 0) return 0;
    return failed / total;
  }

  /**
   * Calculate conflict resolution rate from interactions
   */
  private calculateConflictResolutionRate(sessionId: string): number {
    const { success, total } = this.outcomeOf(sessionId);
    if (total === 0) return 1.0;
    return success / total;
  }

  /**
   * Calculate coordination efficiency from interactions
   */
  private calculateCoordinationEfficiency(
    sessionId: string,
    interactions: InteractionRecord[],
  ): number {
    const { success, total } = this.outcomeOf(sessionId);
    if (total === 0) return 1.0;

    const baseEfficiency = success / total;
    const agentDiversityBonus = this.hasDiverseRecentAgents(interactions) ? 0.1 : 0;

    return Math.min(1.0, baseEfficiency + agentDiversityBonus);
  }

  private calculateSessionMemoryUsage(sessionId: string): number {
    // Estimate memory usage based on session activity
    const interactions = this.interactionHistory.get(sessionId) || [];

    // Base memory + per-interaction overhead
    const baseMemory = 1024 * 1024; // 1MB base
    const perInteractionMemory = 8 * 1024; // 8KB per interaction
    const totalInteractions = interactions.length;

    return baseMemory + totalInteractions * perInteractionMemory;
  }

  private countSessionConflicts(sessionId: string): number {
    // Conflicts are estimated as failed interactions that might indicate coordination issues
    return Math.floor(this.outcomeOf(sessionId).failed * 0.1);
  }

  private calculateAverageResponseTime(sessionId: string): number {
    const history = this.metricsHistory.get(sessionId);
    if (!history || history.length === 0) return 0;

    const start = Math.max(0, history.length - 10);
    let totalResponseTime = 0;
    let counted = 0;
    for (let index = start; index < history.length; index += 1) {
      const metric = history[index];
      if (!metric) continue;
      totalResponseTime +=
        metric.successfulInteractions > 0
          ? 1000 / metric.successfulInteractions
          : 1000;
      counted += 1;
    }

    return counted === 0 ? 0 : totalResponseTime / counted;
  }
}

export const createSessionMonitor = (
  stateManager: XrayStateManager,
  sessionCoordinator: SessionCoordinator,
  cleanupManager: SessionCleanupManager,
  config?: Partial<MonitorConfig>,
): SessionMonitor => {
  return new SessionMonitor(
    stateManager,
    sessionCoordinator,
    cleanupManager,
    config,
  );
};
