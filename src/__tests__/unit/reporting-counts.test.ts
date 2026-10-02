import { describe, expect, it } from "vitest";
import { FrameworkReportingSystem } from "../../reporting/framework-reporting-system.js";
import { formatAsMarkdown } from "../../reporting/report-formatter.js";
import {
  filterLogsByConfig,
  parseLogLine,
} from "../../reporting/log-parser.js";
import {
  calculateHealthScore,
  calculateMetrics,
  calculatePeakActivity,
  calculateTimeRange,
  generateAlerts,
} from "../../reporting/metrics.js";
import type { ParsedLogEntry, ReportData } from "../../reporting/types.js";

const MIN_TS = 1700000000000;
const MAX_TS = 1700000060000;

function row(
  over: Partial<ParsedLogEntry> &
    Pick<ParsedLogEntry, "component" | "action" | "status">,
): ParsedLogEntry {
  return {
    timestamp: over.timestamp ?? MIN_TS,
    component: over.component,
    action: over.action,
    message: over.message ?? over.action,
    level: over.level ?? "info",
    status: over.status,
    agent: over.agent ?? "system",
    jobId: over.jobId ?? null,
    ...(over.sessionId !== undefined ? { sessionId: over.sessionId } : {}),
    ...(over.details !== undefined ? { details: over.details } : {}),
  };
}

function sampleLogs(): ParsedLogEntry[] {
  return [
    row({
      component: "agent-delegator",
      action: "delegation decision made",
      status: "success",
      agent: "architect",
      sessionId: "sess",
    }),
    row({
      timestamp: MIN_TS + 1000,
      component: "context-ast",
      action: "context-enhancement-failed",
      status: "error",
      agent: "enforcer",
    }),
    row({
      timestamp: MIN_TS + 2000,
      component: "complexity-analyzer",
      action: "score",
      status: "success",
      agent: "architect",
    }),
    row({
      timestamp: MIN_TS + 3000,
      component: "framework-activity",
      action: "edit",
      status: "success",
      agent: "system",
      details: { tool: "edit" },
    }),
    row({
      timestamp: MIN_TS + 4000,
      component: "framework-activity",
      action: "grep",
      status: "error",
      agent: "system",
      jobId: "job-9",
      details: { tool: "grep" },
    }),
    row({
      timestamp: MAX_TS,
      component: "plain",
      action: "tick",
      status: "info",
      agent: "",
    }),
  ];
}

describe("reporting counts", () => {
  it("keeps the same metric counts and report text", () => {
    const logs = sampleLogs();
    const metrics = calculateMetrics(logs);
    const healthScore = calculateHealthScore(logs);
    const peak = calculatePeakActivity(logs);
    const timeRange = calculateTimeRange(logs);

    expect(metrics.totalDelegations).toBe(1);
    expect(metrics.contextOperations).toBe(1);
    expect(metrics.systemOperationDetails.analysisOperations).toBe(2);
    expect(metrics.systemOperationDetails.fileOperations).toBe(1);
    expect(metrics.systemOperationDetails.searchOperations).toBe(1);
    expect(metrics.systemOperationDetails.orchestrationOperations).toBe(1);
    expect(metrics.successRate).toBe(50);
    expect(metrics.enhancementSuccessRate).toBe(50);
    expect(metrics.toolExecutionStats.mostUsedTool).toBe("edit");
    expect(metrics.toolExecutionStats.totalCommands).toBe(2);
    expect(metrics.toolExecutionStats.uniqueTools).toBe(2);
    expect(metrics.toolExecutionStats.toolSuccessRate.get("edit")).toEqual({
      success: 1,
      total: 1,
      rate: 100,
    });
    expect(metrics.toolExecutionStats.toolSuccessRate.get("grep")).toEqual({
      success: 0,
      total: 1,
      rate: 0,
    });
    expect(metrics.agentUsage.get("architect")).toBe(2);
    expect(metrics.agentUsage.has("")).toBe(false);
    expect(healthScore).toBe(60);
    expect(peak.eventsPerMinute).toBe(5);
    expect(peak.timestamp.toISOString()).toBe("2023-11-14T22:13:00.000Z");
    expect(timeRange.start.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(timeRange.end.toISOString()).toBe("2023-11-14T22:14:20.000Z");

    const data: ReportData = {
      generatedAt: new Date("2026-01-15T12:00:00.000Z"),
      timeRange,
      metrics,
      chronologicalEvents: logs,
      insights: [],
      recommendations: [],
      summary: {
        totalEvents: logs.length,
        activeComponents: ["agent-delegator", "context-ast"],
        peakActivity: peak,
        healthScore,
      },
    };
    const report = formatAsMarkdown(data);
    expect(report).toContain("**Total Events**: 6");
    expect(report).toContain("**Delegations**: 1");
    expect(report).toContain("**Context Operations**: 1");
    expect(report).toContain("**Success Rate**: 50.0%");
    expect(report).toContain("**Enhancement Success**: 50.0%");
    expect(report).toContain("**Health Score**: 60.0%");
    expect(report).toContain("architect: 2 invocations");
    expect(report).toContain("edit: 1/1 (100.0% success)");
    expect(report).toContain("grep: 0/1 (0.0% success)");
    expect(report).toContain("**File Operations**: 1");
    expect(report).toContain("**Search Operations**: 1");
    expect(report).toContain(
      "**Time Range**: 2023-11-14T22:13:20.000Z to 2023-11-14T22:14:20.000Z",
    );
  });

  it("filters the same rows for each report type", () => {
    const logs = sampleLogs();
    const base = {
      outputFormat: "markdown" as const,
    };

    expect(
      filterLogsByConfig(logs, { ...base, type: "full-analysis" }),
    ).toHaveLength(6);
    expect(
      filterLogsByConfig(logs, { ...base, type: "orchestration" }),
    ).toHaveLength(1);
    expect(
      filterLogsByConfig(logs, { ...base, type: "context-awareness" }),
    ).toHaveLength(1);
    expect(
      filterLogsByConfig(logs, { ...base, type: "performance" }),
    ).toHaveLength(1);
    expect(
      filterLogsByConfig(logs, { ...base, type: "agent-usage" }),
    ).toHaveLength(5);
    expect(
      filterLogsByConfig(logs, {
        ...base,
        type: "full-analysis",
        sessionId: "sess",
      }),
    ).toHaveLength(1);
    expect(
      filterLogsByConfig(logs, {
        ...base,
        type: "full-analysis",
        jobId: "job-9",
      }),
    ).toHaveLength(1);
    expect(
      filterLogsByConfig(logs, {
        ...base,
        type: "full-analysis",
        timeRange: {
          start: new Date(MIN_TS),
          end: new Date(MIN_TS + 4000),
        },
      }),
    ).toHaveLength(5);
  });

  it("parses a log line into the same fields", () => {
    const parsed = parseLogLine(
      "2026-01-15T12:00:00.000Z [job-1] [code-review] delegation decision made: ok - INFO",
    );
    expect(parsed).toMatchObject({
      timestamp: Date.parse("2026-01-15T12:00:00.000Z"),
      jobId: "job-1",
      component: "code-review",
      action: "delegation decision made",
      message: "delegation decision made: ok",
      level: "info",
      status: "success",
      agent: "code-reviewer",
    });

    const fallback = parseLogLine(
      "2026-01-15T12:00:00.000Z [only-component] hello - DEBUG",
    );
    expect(fallback).toMatchObject({
      jobId: null,
      component: "only-component",
      action: "hello",
      level: "debug",
      status: "info",
      agent: "system",
    });
  });

  it("keeps the first three errors in order", () => {
    const logs = [1, 2, 3, 4].map((n) =>
      row({
        timestamp: MIN_TS + n,
        component: `c${n}`,
        action: `a${n}`,
        status: "error",
      }),
    );
    expect(generateAlerts(logs).slice(0, 3)).toEqual([
      "c1:a1 failed",
      "c2:a2 failed",
      "c3:a3 failed",
    ]);
  });

  it("returns the same report text on a second read", async () => {
    const reporting = new FrameworkReportingSystem();
    const config = {
      type: "full-analysis" as const,
      outputFormat: "markdown" as const,
      timeRange: { lastHours: 1 },
    };
    const first = await reporting.generateReport(config);
    const second = await reporting.generateReport(config);
    expect(second).toBe(first);
    expect(first).toContain("# Framework Report");
  });

  it("ties the peak minute to the first row that reaches the max", () => {
    const logs = [
      row({
        timestamp: Date.parse("2026-03-01T00:00:30.000Z"),
        component: "a",
        action: "tick",
        status: "info",
      }),
      row({
        timestamp: Date.parse("2026-03-01T00:05:30.000Z"),
        component: "b",
        action: "tick",
        status: "info",
      }),
    ];
    const peak = calculatePeakActivity(logs);
    expect(peak.eventsPerMinute).toBe(1);
    expect(peak.timestamp.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
