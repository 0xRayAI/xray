/**
 * Assess Complexity Tool
 *
 * Wraps ComplexityAnalyzer so the main AI can query task complexity
 * and decide whether to delegate to subagents.
 *
 * Exposes:
 *  - assessComplexity() — full analysis returning score, level, strategy, agents
 *  - simple assess() helper for quick threshold checks
 */

import {
  ComplexityAnalyzer,
  getComplexityAnalyzer,
} from "../delegation/complexity-analyzer.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface AssessmentInput {
  taskDescription: string;
  files?: string[];
  dependencies?: string[];
  changeVolume?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  estimatedDuration?: number;
}

export interface AssessmentResult {
  score: number;
  level: "simple" | "moderate" | "complex" | "enterprise";
  strategy: "single-agent" | "multi-agent" | "orchestrator-led";
  estimatedAgents: number;
  reasoning: string[];
}

const analyzer: ComplexityAnalyzer = getComplexityAnalyzer();

export function assessComplexity(input: AssessmentInput): AssessmentResult {
  const metrics = analyzer.analyzeComplexity(input.taskDescription, {
    files: input.files ?? [],
    dependencies: input.dependencies ?? [],
    changeVolume: input.changeVolume ?? 0,
    riskLevel: input.riskLevel ?? "low",
    estimatedDuration: input.estimatedDuration ?? 30,
  });

  const score = analyzer.calculateComplexityScore(metrics);

  frameworkLogger.log("assess-complexity-tool", "assessment-complete", "info", {
    taskDescription: input.taskDescription.substring(0, 80),
    score: score.score,
    level: score.level,
    strategy: score.recommendedStrategy,
    estimatedAgents: score.estimatedAgents,
  });

  return {
    score: score.score,
    level: score.level,
    strategy: score.recommendedStrategy,
    estimatedAgents: score.estimatedAgents,
    reasoning: score.reasoning,
  };
}

export function shouldDelegate(input: AssessmentInput): boolean {
  const result = assessComplexity(input);
  return result.score > 15;
}

export function getDelegationStrategy(input: AssessmentInput): AssessmentResult {
  return assessComplexity(input);
}
