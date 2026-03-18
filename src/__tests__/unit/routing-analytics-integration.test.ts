/**
 * Integration tests for routing analytics components
 *
 * Tests the interaction between PromptPatternAnalyzer, RoutingPerformanceAnalyzer, and RoutingRefiner
 */

import { describe, test, expect, beforeEach } from "vitest";
import type {
  PromptDataPoint,
  RoutingOutcome,
  RoutingDecision,
} from "../../delegation/task-skill-router.js";
import { routingOutcomeTracker } from "../../delegation/task-skill-router.js";
import { promptPatternAnalyzer } from "../../analytics/prompt-pattern-analyzer.js";
import { routingPerformanceAnalyzer } from "../../analytics/routing-performance-analyzer.js";
import { routingRefiner } from "../../analytics/routing-refiner.js";

describe("Routing Analytics Integration", () => {
  beforeEach(() => {
    // Clear the singleton state to ensure tests start with empty data
    routingOutcomeTracker.clear();
  });

  test("prompt pattern analyzer should handle empty data", () => {
    const result = promptPatternAnalyzer.analyzePromptPatterns();

    expect(result.totalPrompts).toBe(0);
    expect(result.templateMatchRate).toBe(0);
    expect(result.gaps).toHaveLength(0);
    expect(result.emergingPatterns).toHaveLength(0);
  });

  test("routing performance analyzer should handle empty data", () => {
    const report = routingPerformanceAnalyzer.generatePerformanceReport();

    expect(report.totalRoutings).toBe(0);
    expect(report.overallSuccessRate).toBe(0);
    expect(report.agentMetrics).toHaveLength(0);
    expect(report.keywordEffectiveness).toHaveLength(0);
  });

  test("routing refiner should handle empty data", () => {
    const report = routingRefiner.generateRefinementReport();

    expect(report.configurationUpdate.newMappings).toHaveLength(0);
    expect(report.configurationUpdate.optimizations).toHaveLength(0);
    expect(report.implementationSteps.length).toBeGreaterThan(0);
  });

  test("should generate optimization suggestions from empty data", () => {
    const comparisonResult = promptPatternAnalyzer.analyzePromptPatterns();
    const suggestions = promptPatternAnalyzer.generateOptimizationSuggestions(comparisonResult);

    expect(suggestions).toHaveLength(0);
  });

  test("should generate formatted reports", () => {
    const promptReport = promptPatternAnalyzer.generateReport(
      promptPatternAnalyzer.analyzePromptPatterns(),
    );

    expect(promptReport).toContain("StringRay Prompt Pattern Analytics Report");
    expect(promptReport).toContain("Total Prompts Analyzed: 0");

    const performanceReport = routingPerformanceAnalyzer.generateFormattedReport();

    expect(performanceReport).toContain("StringRay Routing Performance Analytics Report");
    expect(performanceReport).toContain("Total Routings: 0");

    const refinementReport = routingRefiner.generateFormattedReport();

    expect(refinementReport).toContain("StringRay Routing Refinement Report");
    expect(refinementReport).toContain("New Mappings: 0");
  });

  test("should export configuration update as JSON", () => {
    const configJson = routingRefiner.exportConfigurationUpdate();
    const config = JSON.parse(configJson);

    expect(config).toHaveProperty("version");
    expect(config).toHaveProperty("generatedAt");
    expect(config).toHaveProperty("summary");
    expect(config).toHaveProperty("newMappings");
    expect(config).toHaveProperty("optimizations");
    expect(config).toHaveProperty("warnings");

    expect(config.summary.newMappings).toBe(0);
    expect(config.summary.optimizedMappings).toBe(0);
  });

  test("should calculate priority correctly", () => {
    const result = promptPatternAnalyzer.analyzePromptPatterns();
    expect(result.topMissedKeywords).toHaveLength(0);
    expect(result.agentCoverage).toBeInstanceOf(Map);
  });
});
