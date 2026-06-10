/**
 * xray Nucleus — thinDispatch (Phase 1E)
 *
 * Stable nucleus surface for complexity scoring and agent routing.
 * Wraps ComplexityAnalyzer; delegates routing to complexity-core utilities.
 *
 * Import from here or from delegation/index.ts (which re-exports these).
 */

import { frameworkLogger } from "../core/framework-logger.js";
import {
  ComplexityMetrics,
  ComplexityScore,
  ComplexityLevel,
  ComplexityThresholds,
  DEFAULT_THRESHOLDS,
  getLevelFromScore,
  getAgentForTier,
  levelToTier,
} from "../delegation/complexity-core.js";
import { ComplexityAnalyzer } from "../delegation/complexity-analyzer.js";

export type { ComplexityMetrics, ComplexityScore, ComplexityLevel, ComplexityThresholds };

export const NUCLEUS_THIN_DISPATCH_VERSION = "0.1.0";

/**
 * Score the complexity of an operation given its description and context.
 * Primary entry point for thinDispatch complexity scoring in the nucleus.
 */
export function scoreComplexity(
  operation: string,
  context: unknown,
  thresholds?: ComplexityThresholds
): ComplexityScore {
  const analyzer = new ComplexityAnalyzer();
  const metrics = analyzer.analyzeComplexity(operation, context);
  const score = analyzer.calculateComplexityScore(metrics);

  frameworkLogger.log("nucleus-thin-dispatch", "score-complexity", "info", {
    operation: operation.substring(0, 100),
    score: score.score,
    level: score.level,
    strategy: score.recommendedStrategy,
  });

  return score;
}

/**
 * Route a complexity score / level to the appropriate agent type.
 * Uses core complexity-core mappings (tier → agent).
 */
export function routeToAgent(
  scoreOrLevel: number | ComplexityScore,
  level?: ComplexityLevel
): string {
  let effectiveLevel: ComplexityLevel;

  if (level) {
    effectiveLevel = level;
  } else if (typeof scoreOrLevel === "object" && scoreOrLevel !== null) {
    effectiveLevel = (scoreOrLevel as ComplexityScore).level;
  } else if (typeof scoreOrLevel === "number") {
    effectiveLevel = getLevelFromScore(scoreOrLevel);
  } else {
    effectiveLevel = "simple";
  }

  const tier = levelToTier(effectiveLevel);
  return getAgentForTier(tier);
}

/**
 * Convenience: score first, then route — one call.
 */
export function scoreAndRoute(
  operation: string,
  context: unknown,
  thresholds?: ComplexityThresholds
): { score: ComplexityScore; agent: string } {
  const score = scoreComplexity(operation, context, thresholds);
  const agent = routeToAgent(score);
  return { score, agent };
}
