/**
 * Metrics Aggregator
 *
 * Provides aggregation, reporting, and export functionality for delegation
 * and orchestration metrics stored in stateManager.
 *
 * @since 2026-04-16
 */

import type { XrayStateManager } from "../state/state-manager.js";

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
  results?: Array<{ agent: string; success: boolean }>;
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
    timeRange: { start: number; end: number };
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

const MAX_METRICS_ENTRIES = 100;

export function getDelegationMetrics(
  stateManager: XrayStateManager,
): DelegationMetricEntry[] {
  return (stateManager.get("delegation_metrics") as DelegationMetricEntry[]) || [];
}

export function getOrchestrationMetrics(
  stateManager: XrayStateManager,
): OrchestrationMetricEntry[] {
  return (stateManager.get("orchestration_metrics") as OrchestrationMetricEntry[]) || [];
}

export function aggregateDelegationMetrics(
  stateManager: XrayStateManager,
): AggregatedMetrics {
  const metrics = getDelegationMetrics(stateManager);
  return aggregateMetricsData(metrics, "delegation");
}

export function aggregateOrchestrationMetrics(
  stateManager: XrayStateManager,
): AggregatedMetrics {
  const metrics = getOrchestrationMetrics(stateManager);
  return aggregateMetricsData(metrics, "orchestration");
}

function aggregateMetricsData(
  metrics: Array<DelegationMetricEntry | OrchestrationMetricEntry>,
  type: "delegation" | "orchestration",
): AggregatedMetrics {
  if (metrics.length === 0) {
    return {
      summary: {
        totalEntries: 0,
        timeRange: { start: Date.now(), end: Date.now() },
        oldestEntry: 0,
        newestEntry: 0,
      },
      byAgent: {},
      byComplexityLevel: {},
      byTimePeriod: {},
    };
  }

  const timestamps = metrics.map((m) => m.timestamp);
  const result: AggregatedMetrics = {
    summary: {
      totalEntries: metrics.length,
      timeRange: { start: Math.min(...timestamps), end: Math.max(...timestamps) },
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    },
    byAgent: {},
    byComplexityLevel: {},
    byTimePeriod: {},
  };

  const byAgent = result.byAgent;
  const byComplexityLevel = result.byComplexityLevel;
  const byTimePeriod = result.byTimePeriod;

  for (const metric of metrics) {
    const agents =
      type === "delegation"
        ? (metric as DelegationMetricEntry).agents
        : (metric as OrchestrationMetricEntry).subAgents.map((s) => s.name);

    for (const agent of agents) {
      if (!byAgent[agent]) {
        byAgent[agent] = {
          count: 0,
          operations: [],
          avgComplexity: 0,
          successRate: 0,
        };
      }
      byAgent[agent].count++;
      byAgent[agent].operations.push(metric.operation);

      if (type === "delegation") {
        const delMetric = metric as DelegationMetricEntry;
        const complexityScore = (delMetric.complexity as Record<string, unknown>)
          ?.score as number;
        const success = delMetric.success;
        byAgent[agent].avgComplexity += complexityScore || 0;
        if (success) {
          byAgent[agent].successRate++;
        }
      }
    }

    const complexityLevel =
      type === "delegation"
        ? ((metric as DelegationMetricEntry).complexity as Record<string, unknown>)
            ?.level as string
        : (metric as OrchestrationMetricEntry).complexityLevel;

    const timePeriod = getTimePeriod(metric.timestamp);

    if (complexityLevel) {
      if (!byComplexityLevel[complexityLevel]) {
        byComplexityLevel[complexityLevel] = {
          count: 0,
          avgDuration: 0,
          operations: [],
        };
      }
      byComplexityLevel[complexityLevel].count++;
      byComplexityLevel[complexityLevel].operations.push(metric.operation);

      if (type === "delegation") {
        const delMetric = metric as DelegationMetricEntry;
        byComplexityLevel[complexityLevel].avgDuration +=
          (delMetric.totalTime as number) || 0;
      }
    }

    if (!byTimePeriod[timePeriod]) {
      byTimePeriod[timePeriod] = {
        count: 0,
        operations: [],
      };
    }
    byTimePeriod[timePeriod].count++;
    byTimePeriod[timePeriod].operations.push(metric.operation);
  }

  for (const agent of Object.keys(byAgent)) {
    const data = byAgent[agent];
    if (data) {
      data.operations = [...new Set(data.operations)];
      data.avgComplexity = data.count > 0 ? data.avgComplexity / data.count : 0;
      data.successRate = data.count > 0 ? (data.successRate / data.count) * 100 : 0;
    }
  }

  for (const level of Object.keys(byComplexityLevel)) {
    const data = byComplexityLevel[level];
    if (data) {
      data.operations = [...new Set(data.operations)];
      data.avgDuration = data.count > 0 ? data.avgDuration / data.count : 0;
    }
  }

  return result;
}

function getTimePeriod(timestamp: number): string {
  const date = new Date(timestamp);
  const hour = date.getHours();
  if (hour >= 0 && hour < 6) return "night";
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function summarizeByAgent(
  stateManager: XrayStateManager,
  type: "delegation" | "orchestration" = "delegation",
): Record<string, unknown> {
  const metrics =
    type === "delegation"
      ? getDelegationMetrics(stateManager)
      : getOrchestrationMetrics(stateManager);

  const byAgent: Record<string, {
    count: number;
    operations: Set<string>;
    avgComplexity: number;
    successCount: number;
  }> = {};

  for (const metric of metrics) {
    const agents =
      type === "delegation"
        ? (metric as DelegationMetricEntry).agents
        : (metric as OrchestrationMetricEntry).subAgents.map((s) => s.name);

    for (const agent of agents) {
      if (!byAgent[agent]) {
        byAgent[agent] = {
          count: 0,
          operations: new Set(),
          avgComplexity: 0,
          successCount: 0,
        };
      }
      byAgent[agent].count++;
      byAgent[agent].operations.add(metric.operation);

      if (type === "delegation") {
        const delMetric = metric as DelegationMetricEntry;
        const complexityScore = (delMetric.complexity as Record<string, unknown>)
          ?.score as number;
        byAgent[agent].avgComplexity += complexityScore || 0;
        if (delMetric.success) {
          byAgent[agent].successCount++;
        }
      }
    }
  }

  const result: Record<string, unknown> = {};
  for (const [agent, data] of Object.entries(byAgent)) {
    result[agent] = {
      invocationCount: data.count,
      operations: [...data.operations],
      avgComplexity: data.count > 0 ? data.avgComplexity / data.count : 0,
      successRate:
        data.count > 0 ? (data.successCount / data.count) * 100 : 0,
    };
  }

  return result;
}

export function summarizeByComplexityLevel(
  stateManager: XrayStateManager,
  type: "delegation" | "orchestration" = "delegation",
): Record<string, unknown> {
  const metrics =
    type === "delegation"
      ? getDelegationMetrics(stateManager)
      : getOrchestrationMetrics(stateManager);

  const byLevel: Record<string, {
    count: number;
    totalDuration: number;
    operations: Set<string>;
  }> = {};

  for (const metric of metrics) {
    const complexityLevel =
      type === "delegation"
        ? ((metric as DelegationMetricEntry).complexity as Record<string, unknown>)
            ?.level as string
        : (metric as OrchestrationMetricEntry).complexityLevel;

    if (!complexityLevel) continue;

    if (!byLevel[complexityLevel]) {
      byLevel[complexityLevel] = {
        count: 0,
        totalDuration: 0,
        operations: new Set(),
      };
    }
    byLevel[complexityLevel].count++;
    byLevel[complexityLevel].operations.add(metric.operation);

    if (type === "delegation") {
      byLevel[complexityLevel].totalDuration +=
        ((metric as DelegationMetricEntry).totalTime as number) || 0;
    }
  }

  const result: Record<string, unknown> = {};
  for (const [level, data] of Object.entries(byLevel)) {
    result[level] = {
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
      operations: [...data.operations],
    };
  }

  return result;
}

export function summarizeByTimePeriod(
  stateManager: XrayStateManager,
  type: "delegation" | "orchestration" = "delegation",
): Record<string, unknown> {
  const metrics =
    type === "delegation"
      ? getDelegationMetrics(stateManager)
      : getOrchestrationMetrics(stateManager);

  const periods: Record<string, {
    count: number;
    operations: Set<string>;
  }> = {};

  for (const metric of metrics) {
    const period = getTimePeriod(metric.timestamp);

    if (!periods[period]) {
      periods[period] = {
        count: 0,
        operations: new Set(),
      };
    }
    periods[period].count++;
    periods[period].operations.add(metric.operation);
  }

  const result: Record<string, unknown> = {};
  for (const [period, data] of Object.entries(periods)) {
    result[period] = {
      count: data.count,
      operations: [...data.operations],
    };
  }

  return result;
}

export function rotateMetrics(
  stateManager: XrayStateManager,
  maxEntries = MAX_METRICS_ENTRIES,
): { delegation: number; orchestration: number } {
  const delegationMetrics = getDelegationMetrics(stateManager);
  const orchestrationMetrics = getOrchestrationMetrics(stateManager);

  const delegationRemoved = Math.max(
    0,
    delegationMetrics.length - maxEntries,
  );
  const orchestrationRemoved = Math.max(
    0,
    orchestrationMetrics.length - maxEntries,
  );

  const rotatedDelegation = delegationMetrics.slice(-maxEntries);
  const rotatedOrchestration = orchestrationMetrics.slice(-maxEntries);

  stateManager.set("delegation_metrics", rotatedDelegation);
  stateManager.set("orchestration_metrics", rotatedOrchestration);

  return {
    delegation: delegationRemoved,
    orchestration: orchestrationRemoved,
  };
}

export function cleanupOldMetrics(
  stateManager: XrayStateManager,
  olderThan: number,
): { delegation: number; orchestration: number } {
  const currentDelegation = getDelegationMetrics(stateManager);
  const currentOrchestration = getOrchestrationMetrics(stateManager);

  const cutoff = Date.now() - olderThan;

  const filteredDelegation = currentDelegation.filter(
    (m) => m.timestamp >= cutoff,
  );
  const filteredOrchestration = currentOrchestration.filter(
    (m) => m.timestamp >= cutoff,
  );

  const removedDelegation = currentDelegation.length - filteredDelegation.length;
  const removedOrchestration =
    currentOrchestration.length - filteredOrchestration.length;

  stateManager.set("delegation_metrics", filteredDelegation);
  stateManager.set("orchestration_metrics", filteredOrchestration);

  return {
    delegation: removedDelegation,
    orchestration: removedOrchestration,
  };
}

export function exportMetrics(
  stateManager: XrayStateManager,
  format: "json" | "csv" | "summary" = "json",
): MetricsExport {
  const delegation = getDelegationMetrics(stateManager);
  const orchestration = getOrchestrationMetrics(stateManager);

  const exportedAt = Date.now();

  switch (format) {
    case "json": {
      return {
        format: "json",
        data: {
          delegation,
          orchestration,
          exportedAt,
        },
        exportedAt,
        entryCount: delegation.length + orchestration.length,
      };
    }

    case "csv": {
      const rows = [
        ["type", "timestamp", "operation", "agents", "complexity", "success"].join(
          ",",
        ),
      ];

      for (const d of delegation) {
        const complexity = (d.complexity as Record<string, unknown>)?.level;
        const agents = d.agents.join(";");
        rows.push(
          [
            "delegation",
            d.timestamp,
            d.operation,
            agents,
            complexity,
            d.success,
          ].join(","),
        );
      }

      for (const o of orchestration) {
        const agents = o.subAgents.map((s) => s.name).join(";");
        rows.push(
          [
            "orchestration",
            o.timestamp,
            o.operation,
            agents,
            o.complexityLevel,
            "N/A",
          ].join(","),
        );
      }

      return {
        format: "csv",
        data: rows.join("\n"),
        exportedAt,
        entryCount: delegation.length + orchestration.length,
      };
    }

    case "summary": {
      return {
        format: "summary",
        data: {
          delegation: aggregateMetricsData(delegation, "delegation"),
          orchestration: aggregateMetricsData(orchestration, "orchestration"),
        },
        exportedAt,
        entryCount: delegation.length + orchestration.length,
      };
    }

    default:
      return exportMetrics(stateManager, "json");
  }
}