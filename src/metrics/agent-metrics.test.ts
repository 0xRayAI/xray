/**
 * Agent Metrics System Unit Tests
 *
 * Comprehensive test suite for the AgentMetricsSystem including:
 * - Invocation tracking
 * - Aggregation functions
 * - History tracking with configurable retention
 * - Export functionality
 *
 * @version 1.0.0
 * @since 2026-04-17
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AgentMetricsSystem } from "./agent-metrics.js";
import type {
  AgentInvocation,
  AgentMetricsFilter,
  AgentType,
  ComplexityLevel,
  AggregatedAgentMetrics,
  MetricsExport,
} from "./agent-metrics.js";

interface MockStateManager {
  store: Map<string, unknown>;
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T) => void;
  clear: (key: string) => void;
}

function createMockStateManager(): MockStateManager {
  const store = new Map<string, unknown>();
  return {
    store,
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    set<T>(key: string, value: T): void {
      store.set(key, value);
    },
    clear(key: string): void {
      store.delete(key);
    },
  };
}

function createMetricsSystem(mockStateManager?: MockStateManager): {
  system: AgentMetricsSystem;
  mockState: MockStateManager;
} {
  const mock = mockStateManager || createMockStateManager();
  const system = new AgentMetricsSystem(mock as any, {
    maxEntries: 100,
    maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    enableAutoCleanup: false,
    cleanupIntervalMs: 60 * 60 * 1000,
  });
  return { system, mockState: mock };
}

function createSampleInvocation(overrides: Partial<AgentInvocation> = {}): Omit<AgentInvocation, "id" | "timestamp"> {
  const defaultInvocation = {
    agentName: "test-agent",
    agentType: "orchestrator" as AgentType,
    operation: "test-operation",
    description: "Test operation description",
    complexityLevel: "moderate" as ComplexityLevel,
    complexityScore: 25,
    duration: 1000,
    success: true,
    error: undefined,
    sessionId: "session-123",
    parentTaskId: undefined,
    inputTokens: 100,
    outputTokens: 200,
    metadata: undefined,
  };
  return { ...defaultInvocation, ...overrides };
}

describe("AgentMetricsSystem", () => {
  let metricsSystem: AgentMetricsSystem;
  let mockState: MockStateManager;

  beforeEach(() => {
    const { system, mockState: mock } = createMetricsSystem();
    metricsSystem = system;
    mockState = mock;
  });

  afterEach(() => {
    metricsSystem.destroy();
  });

  describe("trackInvocation", () => {
    it("should track a successful invocation", () => {
      const invocation = metricsSystem.trackInvocation({
        agentName: "code-analyzer",
        agentType: "code-analyzer",
        operation: "analyze",
        description: "Analyze codebase",
        complexityLevel: "moderate",
        complexityScore: 30,
        duration: 500,
        success: true,
        sessionId: "session-1",
      });

      expect(invocation).toBeDefined();
      expect(invocation.id).toMatch(/^inv-\d+-[a-z0-9]+$/);
      expect(invocation.agentName).toBe("code-analyzer");
      expect(invocation.success).toBe(true);
      expect(invocation.duration).toBe(500);
    });

    it("should track a failed invocation with error", () => {
      const invocation = metricsSystem.trackInvocation({
        agentName: "security-auditor",
        agentType: "security-auditor",
        operation: "scan",
        success: false,
        error: "Permission denied",
        duration: 200,
      });

      expect(invocation.success).toBe(false);
      expect(invocation.error).toBe("Permission denied");
    });

    it("should store invocations in state manager", () => {
      metricsSystem.trackInvocation({
        agentName: "researcher",
        agentType: "researcher",
        operation: "research",
        success: true,
      });

      const stored = mockState.get<AgentInvocation[]>("agent_invocations");
      expect(stored).toBeDefined();
      expect(stored!.length).toBe(1);
      expect(stored![0].agentName).toBe("researcher");
    });

    it("should limit stored invocations to maxEntries", () => {
      const { system: limitedSystem, mockState: limitedMock } = createMetricsSystem();

      for (let i = 0; i < 150; i++) {
        limitedSystem.trackInvocation({
          agentName: `agent-${i}`,
          agentType: "custom",
          operation: "test",
          success: true,
        });
      }

      const stored = limitedMock.get<AgentInvocation[]>("agent_invocations");
      expect(stored!.length).toBe(100);
      limitedSystem.destroy();
    });
  });

  describe("trackSuccess and trackFailure", () => {
    it("should track success with trackSuccess helper", () => {
      const invocation = metricsSystem.trackSuccess({
        agentName: "enforcer",
        agentType: "enforcer",
        operation: "validate",
        duration: 100,
      });

      expect(invocation.success).toBe(true);
      expect(invocation.error).toBeUndefined();
    });

    it("should track failure with trackFailure helper", () => {
      const invocation = metricsSystem.trackFailure({
        agentName: "code-reviewer",
        agentType: "code-reviewer",
        operation: "review",
        error: "Timeout exceeded",
        duration: 50,
      });

      expect(invocation.success).toBe(false);
      expect(invocation.error).toBe("Timeout exceeded");
    });
  });

  describe("filterInvocations", () => {
    beforeEach(() => {
      const agents = [
        { name: "code-analyzer", type: "code-analyzer" as AgentType, sessionId: "session-1" },
        { name: "security-auditor", type: "security-auditor" as AgentType, sessionId: "session-1" },
        { name: "researcher", type: "researcher" as AgentType, sessionId: "session-2" },
        { name: "enforcer", type: "enforcer" as AgentType, sessionId: "session-2" },
      ];

      agents.forEach((agent, index) => {
        metricsSystem.trackInvocation({
          agentName: agent.name,
          agentType: agent.type,
          operation: `operation-${index}`,
          success: index % 2 === 0,
          sessionId: agent.sessionId,
          complexityLevel: index < 2 ? "simple" : "complex",
          duration: 100 * (index + 1),
        });
      });
    });

    it("should filter by agent names", () => {
      const filter: AgentMetricsFilter = {
        agentNames: ["code-analyzer", "security-auditor"],
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every((inv) => ["code-analyzer", "security-auditor"].includes(inv.agentName))).toBe(true);
    });

    it("should filter by agent types", () => {
      const filter: AgentMetricsFilter = {
        agentTypes: ["security-auditor"],
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(1);
      expect(filtered[0].agentType).toBe("security-auditor");
    });

    it("should filter by time range", () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const filter: AgentMetricsFilter = {
        timeRange: { start: oneHourAgo, end: now },
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(4);
    });

    it("should filter by complexity levels", () => {
      const filter: AgentMetricsFilter = {
        complexityLevels: ["simple"],
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every((inv) => inv.complexityLevel === "simple")).toBe(true);
    });

    it("should filter by success only", () => {
      const filter: AgentMetricsFilter = {
        successOnly: true,
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every((inv) => inv.success)).toBe(true);
    });

    it("should filter by failure only", () => {
      const filter: AgentMetricsFilter = {
        failureOnly: true,
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every((inv) => !inv.success)).toBe(true);
    });

    it("should filter by session ID", () => {
      const filter: AgentMetricsFilter = {
        sessionId: "session-1",
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
      expect(filtered.every((inv) => inv.sessionId === "session-1")).toBe(true);
    });

    it("should combine multiple filters", () => {
      const filter: AgentMetricsFilter = {
        agentNames: ["code-analyzer", "researcher"],
        complexityLevels: ["simple", "complex"],
      };

      const filtered = metricsSystem.filterInvocations(filter);
      expect(filtered.length).toBe(2);
    });
  });

  describe("aggregateMetrics", () => {
    beforeEach(() => {
      const testData = [
        { agent: "code-analyzer", type: "code-analyzer" as AgentType, complexity: "simple" as ComplexityLevel, success: true, duration: 100 },
        { agent: "code-analyzer", type: "code-analyzer" as AgentType, complexity: "simple" as ComplexityLevel, success: true, duration: 150 },
        { agent: "security-auditor", type: "security-auditor" as AgentType, complexity: "complex" as ComplexityLevel, success: true, duration: 300 },
        { agent: "security-auditor", type: "security-auditor" as AgentType, complexity: "complex" as ComplexityLevel, success: false, duration: 400 },
        { agent: "researcher", type: "researcher" as AgentType, complexity: "moderate" as ComplexityLevel, success: true, duration: 200 },
      ];

      testData.forEach((data, index) => {
        metricsSystem.trackInvocation({
          agentName: data.agent,
          agentType: data.type,
          operation: `operation-${index}`,
          success: data.success,
          complexityLevel: data.complexity,
          complexityScore: data.complexity === "simple" ? 10 : data.complexity === "moderate" ? 25 : 40,
          duration: data.duration,
        });
      });
    });

    it("should aggregate all metrics", () => {
      const aggregated = metricsSystem.aggregateMetrics();

      expect(aggregated.summary.totalInvocations).toBe(5);
      expect(aggregated.summary.totalAgents).toBe(3);
      expect(aggregated.summary.overallSuccessRate).toBe(80);
    });

    it("should aggregate by agent", () => {
      const aggregated = metricsSystem.aggregateMetrics();

      expect(aggregated.byAgent["code-analyzer"]).toBeDefined();
      expect(aggregated.byAgent["code-analyzer"].totalInvocations).toBe(2);
      expect(aggregated.byAgent["code-analyzer"].successRate).toBe(100);

      expect(aggregated.byAgent["security-auditor"]).toBeDefined();
      expect(aggregated.byAgent["security-auditor"].totalInvocations).toBe(2);
      expect(aggregated.byAgent["security-auditor"].successRate).toBe(50);
    });

    it("should aggregate by time period", () => {
      const aggregated = metricsSystem.aggregateMetrics();

      const dayKey = new Date().toISOString().slice(0, 10);
      expect(aggregated.byTimePeriod[dayKey]).toBeDefined();
      expect(aggregated.byTimePeriod[dayKey].totalInvocations).toBe(5);
    });

    it("should aggregate by complexity", () => {
      const aggregated = metricsSystem.aggregateMetrics();

      expect(aggregated.byComplexity["simple"]).toBeDefined();
      expect(aggregated.byComplexity["simple"].totalInvocations).toBe(2);

      expect(aggregated.byComplexity["complex"]).toBeDefined();
      expect(aggregated.byComplexity["complex"].totalInvocations).toBe(2);
    });

    it("should aggregate with filter applied", () => {
      const aggregated = metricsSystem.aggregateMetrics({
        agentNames: ["code-analyzer"],
      });

      expect(aggregated.summary.totalInvocations).toBe(2);
      expect(aggregated.summary.totalAgents).toBe(1);
    });

    it("should return empty aggregation for no data", () => {
      const { system: emptySystem } = createMetricsSystem();
      const aggregated = emptySystem.aggregateMetrics();

      expect(aggregated.summary.totalInvocations).toBe(0);
      expect(aggregated.byAgent).toEqual({});
    });
  });

  describe("getAgentSummary", () => {
    beforeEach(() => {
      const durations = [100, 200, 300];
      durations.forEach((duration, index) => {
        metricsSystem.trackInvocation({
          agentName: "refactorer",
          agentType: "refactorer",
          operation: `refactor-${index}`,
          success: index < 2,
          complexityScore: 20 + index * 5,
          duration,
        });
      });
    });

    it("should return agent summary", () => {
      const summary = metricsSystem.getAgentSummary("refactorer");

      expect(summary).toBeDefined();
      expect(summary!.agentName).toBe("refactorer");
      expect(summary!.totalInvocations).toBe(3);
      expect(summary!.successfulInvocations).toBe(2);
      expect(summary!.failedInvocations).toBe(1);
      expect(summary!.successRate).toBeCloseTo(66.67, 1);
      expect(summary!.averageDuration).toBe(200);
      expect(summary!.operations.length).toBe(3);
    });

    it("should return null for unknown agent", () => {
      const summary = metricsSystem.getAgentSummary("unknown-agent");
      expect(summary).toBeNull();
    });
  });

  describe("getTimePeriodSummary", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        metricsSystem.trackInvocation({
          agentName: `agent-${i % 2}`,
          agentType: "custom",
          operation: `op-${i}`,
          success: true,
          duration: 100 * (i + 1),
        });
      }
    });

    it("should return day summary", () => {
      const dayKey = new Date().toISOString().slice(0, 10);
      const summary = metricsSystem.getTimePeriodSummary(dayKey, "day");

      expect(summary).toBeDefined();
      expect(summary!.periodType).toBe("day");
      expect(summary!.totalInvocations).toBe(5);
    });

    it("should return null for unknown period", () => {
      const summary = metricsSystem.getTimePeriodSummary("2020-01-01", "day");
      expect(summary).toBeNull();
    });
  });

  describe("getComplexitySummary", () => {
    beforeEach(() => {
      const levels: ComplexityLevel[] = ["simple", "moderate", "complex"];
      levels.forEach((level, index) => {
        for (let i = 0; i <= index; i++) {
          metricsSystem.trackInvocation({
            agentName: "test-agent",
            agentType: "custom",
            operation: `op-${level}-${i}`,
            success: i > 0,
            complexityLevel: level,
            duration: 100 * (index + 1),
          });
        }
      });
    });

    it("should return complexity summary for existing level", () => {
      const summary = metricsSystem.getComplexitySummary("moderate");

      expect(summary).toBeDefined();
      expect(summary!.level).toBe("moderate");
      expect(summary!.totalInvocations).toBe(2);
    });

    it("should return null for unknown complexity level", () => {
      const summary = metricsSystem.getComplexitySummary("enterprise");
      expect(summary).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should cleanup old entries by age", () => {
      const { system: cleanupSystem, mockState: cleanupMock } = createMetricsSystem();

      for (let i = 0; i < 10; i++) {
        cleanupSystem.trackInvocation({
          agentName: `agent-${i}`,
          agentType: "custom",
          operation: "test",
          success: true,
        });
      }

      // Manually set an old timestamp
      const stored = cleanupMock.get<AgentInvocation[]>("agent_invocations")!;
      stored[0].timestamp = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
      cleanupMock.set("agent_invocations", stored);

      const result = cleanupSystem.cleanup(24 * 60 * 60 * 1000);

      expect(result.removed).toBe(1);
      expect(result.total).toBe(9);

      cleanupSystem.destroy();
    });

    it("should cleanup entries exceeding max count", () => {
      const { system: countSystem } = createMetricsSystem();

      for (let i = 0; i < 15; i++) {
        countSystem.trackInvocation({
          agentName: "agent",
          agentType: "custom",
          operation: "test",
          success: true,
        });
      }

      const result = countSystem.cleanup(undefined, 10);

      expect(result.removed).toBe(5);
      expect(result.total).toBe(10);

      countSystem.destroy();
    });
  });

  describe("exportMetrics", () => {
    beforeEach(() => {
      const testData = [
        { agent: "orchestrator", type: "orchestrator" as AgentType, success: true, complexity: "moderate" as ComplexityLevel },
        { agent: "code-analyzer", type: "code-analyzer" as AgentType, success: true, complexity: "simple" as ComplexityLevel },
        { agent: "security-auditor", type: "security-auditor" as AgentType, success: false, complexity: "complex" as ComplexityLevel },
      ];

      testData.forEach((data, index) => {
        metricsSystem.trackInvocation({
          agentName: data.agent,
          agentType: data.type,
          operation: `operation-${index}`,
          success: data.success,
          complexityLevel: data.complexity,
          complexityScore: data.complexity === "simple" ? 10 : data.complexity === "moderate" ? 25 : 40,
          duration: 100 * (index + 1),
        });
      });
    });

    it("should export as JSON", () => {
      const exported = metricsSystem.exportMetrics("json");

      expect(exported.format).toBe("json");
      expect(exported.entryCount).toBe(3);
      expect(Array.isArray(exported.data)).toBe(true);
      expect(exported.metadata).toBeDefined();
    });

    it("should export as CSV", () => {
      const exported = metricsSystem.exportMetrics("csv");

      expect(exported.format).toBe("csv");
      expect(typeof exported.data).toBe("string");
      expect((exported.data as string).includes("id,agentName")).toBe(true);
    });

    it("should export as summary", () => {
      const exported = metricsSystem.exportMetrics("summary");

      expect(exported.format).toBe("summary");
      expect(exported.data).toHaveProperty("summary");
      expect(exported.data).toHaveProperty("byAgent");
    });

    it("should export as detailed", () => {
      const exported = metricsSystem.exportMetrics("detailed");

      expect(exported.format).toBe("detailed");
      expect(exported.data).toHaveProperty("invocations");
      expect(exported.data).toHaveProperty("aggregated");
    });

    it("should apply filter to export", () => {
      const exported = metricsSystem.exportMetrics("json", {
        agentNames: ["orchestrator"],
      });

      expect(exported.entryCount).toBe(1);
      const invocations = exported.data as AgentInvocation[];
      expect(invocations[0].agentName).toBe("orchestrator");
    });

    it("should include metadata in export", () => {
      const now = Date.now();
      const exported = metricsSystem.exportMetrics("json", {
        timeRange: { start: now - 3600000, end: now },
      });

      expect(exported.metadata.fromDate).toBe(now - 3600000);
      expect(exported.metadata.toDate).toBe(now);
    });
  });

  describe("getStatistics", () => {
    beforeEach(() => {
      const testData = [
        { agent: "orchestrator", success: true, duration: 100 },
        { agent: "orchestrator", success: true, duration: 200 },
        { agent: "code-analyzer", success: false, duration: 300 },
        { agent: "researcher", success: true, duration: 150 },
      ];

      testData.forEach((data) => {
        metricsSystem.trackInvocation({
          agentName: data.agent,
          agentType: "custom",
          operation: "test",
          success: data.success,
          duration: data.duration,
        });
      });
    });

    it("should return comprehensive statistics", () => {
      const stats = metricsSystem.getStatistics();

      expect(stats.totalInvocations).toBe(4);
      expect(stats.uniqueAgents).toBe(3);
      expect(stats.oldestInvocation).not.toBeNull();
      expect(stats.newestInvocation).not.toBeNull();
      expect(stats.successRate).toBe(75);
      expect(stats.averageDuration).toBe(187.5);
      expect(stats.topAgents.length).toBe(3);
      expect(stats.topAgents[0].name).toBe("orchestrator");
      expect(stats.topAgents[0].count).toBe(2);
    });

    it("should return empty statistics for no data", () => {
      const { system: emptySystem } = createMetricsSystem();
      const stats = emptySystem.getStatistics();

      expect(stats.totalInvocations).toBe(0);
      expect(stats.uniqueAgents).toBe(0);
      expect(stats.topAgents).toEqual([]);
    });
  });

  describe("resetMetrics", () => {
    it("should clear all metrics", () => {
      for (let i = 0; i < 5; i++) {
        metricsSystem.trackInvocation({
          agentName: "test-agent",
          agentType: "custom",
          operation: `op-${i}`,
          success: true,
        });
      }

      expect(metricsSystem.getStatistics().totalInvocations).toBe(5);

      metricsSystem.resetMetrics();

      expect(metricsSystem.getStatistics().totalInvocations).toBe(0);
    });
  });

  describe("updateRetentionConfig", () => {
    it("should update retention configuration", () => {
      metricsSystem.updateRetentionConfig({
        maxEntries: 500,
        maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      });

      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "test",
        success: true,
      });

      const stats = metricsSystem.getStatistics();
      expect(stats.totalInvocations).toBe(1);
    });

    it("should disable auto cleanup", () => {
      metricsSystem.updateRetentionConfig({
        enableAutoCleanup: false,
      });

      // System should still work, just no auto cleanup
      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "test",
        success: true,
      });

      expect(metricsSystem.getStatistics().totalInvocations).toBe(1);
    });
  });

  describe("getInvocationsByAgent", () => {
    beforeEach(() => {
      for (let i = 0; i < 3; i++) {
        metricsSystem.trackInvocation({
          agentName: "code-analyzer",
          agentType: "code-analyzer",
          operation: `analyze-${i}`,
          success: true,
        });
      }
      metricsSystem.trackInvocation({
        agentName: "security-auditor",
        agentType: "security-auditor",
        operation: "scan",
        success: true,
      });
    });

    it("should get invocations by agent name", () => {
      const invocations = metricsSystem.getInvocationsByAgent("code-analyzer");
      expect(invocations.length).toBe(3);
      expect(invocations.every((inv) => inv.agentName === "code-analyzer")).toBe(true);
    });

    it("should return empty array for unknown agent", () => {
      const invocations = metricsSystem.getInvocationsByAgent("unknown");
      expect(invocations.length).toBe(0);
    });
  });

  describe("getInvocationsBySession", () => {
    beforeEach(() => {
      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "op1",
        success: true,
        sessionId: "session-A",
      });
      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "op2",
        success: true,
        sessionId: "session-A",
      });
      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "op3",
        success: true,
        sessionId: "session-B",
      });
    });

    it("should get invocations by session ID", () => {
      const invocations = metricsSystem.getInvocationsBySession("session-A");
      expect(invocations.length).toBe(2);
    });
  });

  describe("getInvocationsByTimeRange", () => {
    it("should get invocations by time range", () => {
      const now = Date.now();

      metricsSystem.trackInvocation({
        agentName: "test",
        agentType: "custom",
        operation: "op1",
        success: true,
      });

      const invocations = metricsSystem.getInvocationsByTimeRange(now - 1000, now + 1000);
      expect(invocations.length).toBe(1);
    });
  });
});

describe("Agent Metrics System - Integration with State Manager", () => {
  it("should persist invocations across system instances", () => {
    const mockState = createMockStateManager();
    const { system: system1 } = createMetricsSystem(mockState);

    system1.trackInvocation({
      agentName: "persistence-test",
      agentType: "custom",
      operation: "persist",
      success: true,
    });

    expect(mockState.get<AgentInvocation[]>("agent_invocations")!.length).toBe(1);

    const { system: system2 } = createMetricsSystem(mockState);
    expect(system2.getStatistics().totalInvocations).toBe(1);

    system1.destroy();
    system2.destroy();
  });

  it("should handle concurrent track invocations", () => {
    const mockState = createMockStateManager();
    const { system } = createMetricsSystem(mockState);

    const promises = Array.from({ length: 10 }, (_, i) =>
      Promise.resolve(
        system.trackInvocation({
          agentName: `agent-${i}`,
          agentType: "custom",
          operation: "concurrent",
          success: i % 2 === 0,
        }),
      ),
    );

    Promise.all(promises);

    expect(system.getStatistics().totalInvocations).toBe(10);

    system.destroy();
  });
});
