import type { ParsedLogEntry, OrchestrationMetrics, ReportConfig } from "./types.js";

export function calculateTimeRange(
  logs: ParsedLogEntry[],
  timeRange?: ReportConfig["timeRange"],
): { start: Date; end: Date } {
  if (logs.length === 0) {
    return { start: new Date(), end: new Date() };
  }

  let min = Infinity;
  let max = -Infinity;
  for (const log of logs) {
    const ts = log.timestamp;
    if (Number.isNaN(ts)) {
      return { start: new Date(NaN), end: new Date(NaN) };
    }
    if (ts < min) min = ts;
    if (ts > max) max = ts;
  }
  return {
    start: new Date(min),
    end: new Date(max),
  };
}

export function calculateMetrics(logs: ParsedLogEntry[]): OrchestrationMetrics {
  const agentUsage = new Map<string, number>();
  const complexityDistribution = new Map<string, number>();
  const commandUsage = new Map<string, number>();
  const toolSuccessRate = new Map<
    string,
    { success: number; total: number; rate: number }
  >();
  let totalDelegations = 0;
  let contextOperations = 0;
  let enhancementFailures = 0;
  let enhancementSuccesses = 0;
  let fileOperations = 0;
  let searchOperations = 0;
  let terminalOperations = 0;
  let analysisOperations = 0;
  let orchestrationOperations = 0;
  let successCount = 0;
  const responseTimes: number[] = [];

  for (const log of logs) {
    if (log.status === "success") successCount++;

    if (log.agent) {
      agentUsage.set(log.agent, (agentUsage.get(log.agent) || 0) + 1);
    }

    if (log.action === "delegation decision made") {
      totalDelegations++;
      orchestrationOperations++;
    }

    if (log.component.includes("context") || log.component.includes("ast")) {
      contextOperations++;
      analysisOperations++;
    }

    if (log.action === "context-enhancement-failed") {
      enhancementFailures++;
    }
    if (log.component === "complexity-analyzer" && log.status === "success") {
      enhancementSuccesses++;
    }

    if (log.component === "framework-activity") {
      const toolName = (log.details?.tool as string) || log.action;
      commandUsage.set(toolName, (commandUsage.get(toolName) || 0) + 1);

      if (!toolSuccessRate.has(toolName)) {
        toolSuccessRate.set(toolName, { success: 0, total: 0, rate: 0 });
      }
      const toolStats = toolSuccessRate.get(toolName)!;
      toolStats.total++;
      if (log.status === "success") {
        toolStats.success++;
      }

      if (["write", "edit", "read"].includes(toolName)) {
        fileOperations++;
      } else if (["grep", "glob"].includes(toolName)) {
        searchOperations++;
      } else if (toolName === "bash") {
        terminalOperations++;
      }
    }

    if (
      log.component.includes("analyzer") ||
      log.action.includes("analysis")
    ) {
      analysisOperations++;
    }
  }

  toolSuccessRate.forEach((stats) => {
    stats.rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
  });

  const successRate =
    logs.length > 0 ? (successCount / logs.length) * 100 : 100;

  const enhancementSuccessRate =
    enhancementSuccesses + enhancementFailures > 0
      ? (enhancementSuccesses /
          (enhancementSuccesses + enhancementFailures)) *
        100
      : 100;

  let mostUsedTool = "";
  let maxUsage = 0;
  for (const [tool, count] of commandUsage) {
    if (count > maxUsage) {
      maxUsage = count;
      mostUsedTool = tool;
    }
  }

  return {
    totalDelegations,
    agentUsage,
    complexityDistribution,
    successRate,
    averageResponseTime:
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
        : 0,
    contextOperations,
    enhancementSuccessRate,
    commandUsage,
    toolExecutionStats: {
      totalCommands: Array.from(commandUsage.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      uniqueTools: commandUsage.size,
      mostUsedTool,
      toolSuccessRate,
    },
    systemOperationDetails: {
      fileOperations,
      searchOperations,
      terminalOperations,
      analysisOperations,
      orchestrationOperations,
    },
  };
}

export function calculatePeakActivity(logs: ParsedLogEntry[]): {
  timestamp: Date;
  eventsPerMinute: number;
} {
  const minuteGroups = new Map<number, number>();

  for (const log of logs) {
    const ts = log.timestamp;
    const minute = Number.isFinite(ts)
      ? Math.floor(ts / 60000) * 60000
      : new Date(new Date(ts).toISOString().slice(0, 16) + ":00Z").getTime();
    minuteGroups.set(minute, (minuteGroups.get(minute) || 0) + 1);
  }

  let peakMinute = 0;
  let peakCount = 0;
  let found = false;

  for (const [minute, count] of minuteGroups) {
    if (count > peakCount) {
      peakCount = count;
      peakMinute = minute;
      found = true;
    }
  }

  return {
    timestamp: found ? new Date(peakMinute) : new Date(),
    eventsPerMinute: peakCount,
  };
}

export function calculateHealthScore(logs: ParsedLogEntry[]): number {
  let successCount = 0;
  let errorCount = 0;
  for (const log of logs) {
    if (log.status === "success") successCount++;
    else if (log.status === "error") errorCount++;
  }

  if (successCount + errorCount === 0) return 100;

  return (successCount / (successCount + errorCount)) * 100;
}

export function generateInsights(
  logs: ParsedLogEntry[],
  metrics: OrchestrationMetrics,
): string[] {
  const insights: string[] = [];

  if (metrics.totalDelegations > 0) {
    insights.push(
      `Successfully orchestrated ${metrics.totalDelegations} agent delegations`,
    );
  }

  if (metrics.contextOperations > 0) {
    insights.push(
      `Performed ${metrics.contextOperations} context awareness operations`,
    );
  }

  if (metrics.successRate > 95) {
    insights.push(
      `Excellent system health with ${metrics.successRate.toFixed(1)}% success rate`,
    );
  }

  const mostUsedAgent = Array.from(metrics.agentUsage.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0];

  if (mostUsedAgent) {
    insights.push(
      `Primary agent: ${mostUsedAgent[0]} (${mostUsedAgent[1]} invocations)`,
    );
  }

  return insights;
}

export function generateRecommendations(metrics: OrchestrationMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.successRate < 95) {
    recommendations.push(
      "Investigate and resolve error conditions to improve system reliability",
    );
  }

  if (metrics.totalDelegations === 0) {
    recommendations.push(
      "Consider running delegation scenarios to test agent orchestration",
    );
  }

  if (metrics.contextOperations === 0) {
    recommendations.push(
      "Enable context awareness features for enhanced intelligence",
    );
  }

  if (metrics.agentUsage.size === 0) {
    recommendations.push(
      "Run agent-based operations to populate usage analytics",
    );
  }

  return recommendations;
}

export function generateAlerts(logs: ParsedLogEntry[]): string[] {
  const alerts: string[] = [];
  let errorsKept = 0;
  for (const log of logs) {
    if (log.status !== "error") continue;
    alerts.push(`${log.component}:${log.action} failed`);
    errorsKept++;
    if (errorsKept === 3) break;
  }

  const highFrequencyComponents = getHighFrequencyComponents(logs);
  for (const component of highFrequencyComponents) {
    alerts.push(`High activity detected in ${component}`);
  }

  return alerts;
}

export function getHighFrequencyComponents(logs: ParsedLogEntry[]): string[] {
  const componentCounts = new Map<string, number>();
  const timeWindowMs = 5 * 60 * 1000;
  const cutoffTime = Date.now() - timeWindowMs;

  for (const log of logs) {
    if (log.timestamp > cutoffTime) {
      componentCounts.set(
        log.component,
        (componentCounts.get(log.component) || 0) + 1,
      );
    }
  }

  return Array.from(componentCounts.entries())
    .filter(([, count]) => count > 10)
    .map(([component]) => component);
}