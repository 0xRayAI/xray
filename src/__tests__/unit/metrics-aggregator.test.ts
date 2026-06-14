/**
 * Metrics Aggregator Unit Tests
 *
 * Tests for delegation and orchestration metrics aggregation functions.
 *
 * @version 1.0.0
 * @since 2026-04-16
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StringRayStateManager } from "../../state/state-manager.js";
import {
  getDelegationMetrics,
  getOrchestrationMetrics,
  aggregateDelegationMetrics,
  aggregateOrchestrationMetrics,
  summarizeByAgent,
  summarizeByComplexityLevel,
  summarizeByTimePeriod,
  rotateMetrics,
  cleanupOldMetrics,
  exportMetrics,
} from "../../delegation/metrics-aggregator.js";

describe("MetricsAggregator", () => {
  let stateManager: StringRayStateManager;

  beforeEach(() => {
    stateManager = new StringRayStateManager();
  });

  describe("getDelegationMetrics", () => {
    it("should return empty array when no metrics exist", () => {
      const metrics = getDelegationMetrics(stateManager);
      expect(metrics).toEqual([]);
    });

    it("should return stored delegation metrics", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "test",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const metrics = getDelegationMetrics(stateManager);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe("test");
    });
  });

  describe("getOrchestrationMetrics", () => {
    it("should return empty array when no metrics exist", () => {
      const metrics = getOrchestrationMetrics(stateManager);
      expect(metrics).toEqual([]);
    });

    it("should return stored orchestration metrics", () => {
      stateManager.set("orchestration_metrics", [
        {
          timestamp: Date.now(),
          parentTask: "Test task",
          operation: "test",
          orchestratorType: "orchestrator-led",
          subAgents: [{ name: "enforcer", role: "primary", confidence: 0.9 }],
          complexityLevel: "simple",
          complexityScore: 5,
        },
      ]);

      const metrics = getOrchestrationMetrics(stateManager);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].subAgents).toHaveLength(1);
    });
  });

  describe("aggregateDelegationMetrics", () => {
    it("should return empty aggregation for no metrics", () => {
      const aggregated = aggregateDelegationMetrics(stateManager);
      expect(aggregated.summary.totalEntries).toBe(0);
      expect(aggregated.byAgent).toEqual({});
    });

    it("should aggregate metrics by agent", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "format",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
        {
          timestamp: Date.now(),
          operation: "analyze",
          strategy: "orchestrator-led",
          complexity: { level: "complex", score: 35 },
          estimatedDuration: 5000,
          agents: ["orchestrator", "enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 3000,
        },
      ]);

      const aggregated = aggregateDelegationMetrics(stateManager);
      expect(aggregated.summary.totalEntries).toBe(2);
      expect(aggregated.byAgent["enforcer"]).toBeDefined();
      expect(aggregated.byAgent["enforcer"]?.count).toBe(2);
    });

    it("should aggregate metrics by complexity level", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "format",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
        {
          timestamp: Date.now(),
          operation: "security",
          strategy: "orchestrator-led",
          complexity: { level: "complex", score: 35 },
          estimatedDuration: 5000,
          agents: ["security-auditor"],
          analysisOnly: false,
          success: true,
          totalTime: 3000,
        },
      ]);

      const aggregated = aggregateDelegationMetrics(stateManager);
      expect(aggregated.byComplexityLevel["simple"]).toBeDefined();
      expect(aggregated.byComplexityLevel["complex"]).toBeDefined();
    });
  });

  describe("aggregateOrchestrationMetrics", () => {
    it("should return empty aggregation for no metrics", () => {
      const aggregated = aggregateOrchestrationMetrics(stateManager);
      expect(aggregated.summary.totalEntries).toBe(0);
    });

    it("should aggregate orchestration metrics", () => {
      stateManager.set("orchestration_metrics", [
        {
          timestamp: Date.now(),
          parentTask: "Task 1",
          operation: "delegate",
          orchestratorType: "orchestrator-led",
          subAgents: [{ name: "enforcer", role: "primary", confidence: 0.9 }],
          complexityLevel: "simple",
          complexityScore: 5,
        },
      ]);

      const aggregated = aggregateOrchestrationMetrics(stateManager);
      expect(aggregated.summary.totalEntries).toBe(1);
    });
  });

  describe("summarizeByAgent", () => {
    it("should summarize delegation metrics by agent", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "format",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const summary = summarizeByAgent(stateManager, "delegation");
      expect(summary["enforcer"]).toBeDefined();
      expect((summary["enforcer"] as { invocationCount: number }).invocationCount).toBe(1);
    });

    it("should summarize orchestration metrics by agent", () => {
      stateManager.set("orchestration_metrics", [
        {
          timestamp: Date.now(),
          parentTask: "Task",
          operation: "delegate",
          orchestratorType: "orchestrator-led",
          subAgents: [{ name: "orchestrator", role: "primary", confidence: 0.9 }],
          complexityLevel: "simple",
          complexityScore: 5,
        },
      ]);

      const summary = summarizeByAgent(stateManager, "orchestration");
      expect(summary["orchestrator"]).toBeDefined();
    });
  });

  describe("summarizeByComplexityLevel", () => {
    it("should summarize metrics by complexity level", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "format",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const summary = summarizeByComplexityLevel(stateManager, "delegation");
      expect(summary["simple"]).toBeDefined();
      expect((summary["simple"] as { count: number }).count).toBe(1);
    });
  });

  describe("summarizeByTimePeriod", () => {
    it("should summarize metrics by time period", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "format",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const summary = summarizeByTimePeriod(stateManager, "delegation");
      const periods = Object.keys(summary);
      expect(periods.length).toBeGreaterThan(0);
    });
  });

  describe("rotateMetrics", () => {
    it("should remove oldest entries when over limit", () => {
      const metrics = [];
      for (let i = 0; i < 110; i++) {
        metrics.push({
          timestamp: Date.now() - i,
          operation: `op${i}`,
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        });
      }
      stateManager.set("delegation_metrics", metrics);
      stateManager.set("orchestration_metrics", []);

      const result = rotateMetrics(stateManager, 100);
      expect(result.delegation).toBe(10);

      const remaining = getDelegationMetrics(stateManager);
      expect(remaining).toHaveLength(100);
    });

    it("should not remove entries when under limit", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "test",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const result = rotateMetrics(stateManager, 100);
      expect(result.delegation).toBe(0);
    });
  });

  describe("cleanupOldMetrics", () => {
    it("should remove metrics older than specified time", () => {
      const now = Date.now();
      stateManager.set("delegation_metrics", [
        {
          timestamp: now,
          operation: "recent",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
        {
          timestamp: now - 100000,
          operation: "old",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const result = cleanupOldMetrics(stateManager, 50000);
      expect(result.delegation).toBe(1);

      const remaining = getDelegationMetrics(stateManager);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].operation).toBe("recent");
    });
  });

  describe("exportMetrics", () => {
    it("should export in JSON format", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "test",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const export_ = exportMetrics(stateManager, "json");
      expect(export_.format).toBe("json");
      expect(export_.entryCount).toBe(1);
      expect((export_.data as { delegation: unknown }).delegation).toBeDefined();
    });

    it("should export in CSV format", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "test",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const export_ = exportMetrics(stateManager, "csv");
      expect(export_.format).toBe("csv");
      expect(typeof export_.data).toBe("string");
      expect((export_.data as string).startsWith("type")).toBe(true);
    });

    it("should export in summary format", () => {
      stateManager.set("delegation_metrics", [
        {
          timestamp: Date.now(),
          operation: "test",
          strategy: "single",
          complexity: { level: "simple", score: 5 },
          estimatedDuration: 1000,
          agents: ["enforcer"],
          analysisOnly: false,
          success: true,
          totalTime: 500,
        },
      ]);

      const export_ = exportMetrics(stateManager, "summary");
      expect(export_.format).toBe("summary");
      expect((export_.data as { delegation: unknown }).delegation).toBeDefined();
    });
  });
});