/**
 * Agent Metrics Integration Tests
 *
 * Tests the integration of AgentMetricsSystem with AgentDelegator.
 *
 * @version 1.0.0
 * @since 2026-04-17
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AgentMetricsSystem } from "./agent-metrics.js";

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

describe("Agent Metrics Integration", () => {
  describe("AgentMetricsSystem with state persistence", () => {
    it("should track invocations and persist across instances", () => {
      const mockState = createMockStateManager();
      
      const system1 = new AgentMetricsSystem(mockState as any);
      system1.trackInvocation({
        agentName: "test-agent",
        agentType: "custom",
        operation: "integration-test",
        success: true,
        duration: 100,
      });

      expect(system1.getStatistics().totalInvocations).toBe(1);

      const system2 = new AgentMetricsSystem(mockState as any);
      expect(system2.getStatistics().totalInvocations).toBe(1);

      system1.destroy();
      system2.destroy();
    });

    it("should aggregate metrics correctly after multiple invocations", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any);

      const agents = ["orchestrator", "code-analyzer", "security-auditor", "researcher"];
      agents.forEach((agent, index) => {
        system.trackInvocation({
          agentName: agent,
          agentType: agent as any,
          operation: `operation-${index}`,
          success: index % 2 === 0,
          complexityLevel: index < 2 ? "simple" : "complex",
          complexityScore: index < 2 ? 15 : 45,
          duration: 100 * (index + 1),
        });
      });

      const aggregated = system.aggregateMetrics();
      expect(aggregated.summary.totalInvocations).toBe(4);
      expect(aggregated.summary.totalAgents).toBe(4);
      expect(aggregated.summary.overallSuccessRate).toBe(50);
      expect(Object.keys(aggregated.byAgent)).toHaveLength(4);
      expect(Object.keys(aggregated.byComplexity)).toHaveLength(2);

      system.destroy();
    });

    it("should filter and export metrics correctly", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any);

      system.trackInvocation({
        agentName: "orchestrator",
        agentType: "orchestrator",
        operation: "delegate",
        success: true,
        complexityLevel: "complex",
        duration: 200,
      });

      system.trackInvocation({
        agentName: "code-analyzer",
        agentType: "code-analyzer",
        operation: "analyze",
        success: false,
        error: "Analysis failed",
        complexityLevel: "simple",
        duration: 50,
      });

      const jsonExport = system.exportMetrics("json");
      expect(jsonExport.format).toBe("json");
      expect(jsonExport.entryCount).toBe(2);

      const csvExport = system.exportMetrics("csv");
      expect(csvExport.format).toBe("csv");
      expect(typeof csvExport.data).toBe("string");
      expect((csvExport.data as string).includes("orchestrator")).toBe(true);

      const summaryExport = system.exportMetrics("summary");
      expect(summaryExport.format).toBe("summary");
      expect(summaryExport.entryCount).toBe(2);

      const filteredExport = system.exportMetrics("json", {
        successOnly: true,
      });
      expect(filteredExport.entryCount).toBe(1);

      system.destroy();
    });
  });

  describe("AgentMetricsSystem cleanup behavior", () => {
    it("should respect maxEntries limit", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any, {
        maxEntries: 10,
        maxAgeMs: 30 * 24 * 60 * 60 * 1000,
        enableAutoCleanup: false,
        cleanupIntervalMs: 60 * 60 * 1000,
      });

      for (let i = 0; i < 25; i++) {
        system.trackInvocation({
          agentName: `agent-${i}`,
          agentType: "custom",
          operation: "cleanup-test",
          success: true,
        });
      }

      expect(system.getStatistics().totalInvocations).toBe(10);

      system.destroy();
    });

    it("should cleanup old entries by age", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any, {
        maxEntries: 1000,
        maxAgeMs: 24 * 60 * 60 * 1000,
        enableAutoCleanup: false,
        cleanupIntervalMs: 60 * 60 * 1000,
      });

      system.trackInvocation({
        agentName: "old-agent",
        agentType: "custom",
        operation: "old-op",
        success: true,
        duration: 100,
      });

      const stored = mockState.store.get("agent_invocations") as any[];
      if (stored && stored.length > 0) {
        stored[0].timestamp = Date.now() - 48 * 60 * 60 * 1000;
      }

      system.trackInvocation({
        agentName: "new-agent",
        agentType: "custom",
        operation: "new-op",
        success: true,
        duration: 100,
      });

      const result = system.cleanup(24 * 60 * 60 * 1000);
      expect(result.removed).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeLessThanOrEqual(2);

      system.destroy();
    });
  });

  describe("AgentMetricsSystem time period aggregation", () => {
    it("should aggregate by hour correctly", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any);

      for (let i = 0; i < 10; i++) {
        system.trackInvocation({
          agentName: "hourly-agent",
          agentType: "custom",
          operation: `hourly-op-${i}`,
          success: true,
          duration: 100,
        });
      }

      const aggregated = system.aggregateMetrics();
      const now = new Date();
      const hourKey = `${now.toISOString().slice(0, 13)}:00`;
      
      expect(aggregated.byTimePeriod[hourKey]).toBeDefined();
      expect(aggregated.byTimePeriod[hourKey].totalInvocations).toBe(10);

      system.destroy();
    });

    it("should aggregate by day correctly", () => {
      const mockState = createMockStateManager();
      const system = new AgentMetricsSystem(mockState as any);

      const dayKey = new Date().toISOString().slice(0, 10);

      for (let i = 0; i < 5; i++) {
        system.trackInvocation({
          agentName: "daily-agent",
          agentType: "custom",
          operation: `daily-op-${i}`,
          success: true,
          duration: 100,
        });
      }

      const aggregated = system.aggregateMetrics();
      expect(aggregated.byTimePeriod[dayKey]).toBeDefined();
      expect(aggregated.byTimePeriod[dayKey].totalInvocations).toBe(5);

      system.destroy();
    });
  });
});
