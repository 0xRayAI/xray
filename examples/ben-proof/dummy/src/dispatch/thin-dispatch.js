/**
 * thinDispatch resolver — derived from xray orchestrator routing slices.
 */

import { getComplexityAnalyzer } from "../delegation/complexity-analyzer.js";
import { getLevelFromScore, getStrategyForLevel } from "../delegation/complexity-core.js";

/**
 * @param {{ operation: string; context?: Record<string, unknown> }} input
 */
export function resolveThinDispatch(input) {
  const analyzer = getComplexityAnalyzer();
  const metrics = analyzer.analyzeComplexity(input.operation, input.context ?? {});
  const score = analyzer.calculateComplexityScore(metrics);
  const level = getLevelFromScore(score.score);
  const strategy = getStrategyForLevel(level);
  return {
    metrics,
    score,
    level,
    strategy,
    route:
      strategy === "single-agent"
        ? "direct"
        : strategy === "multi-agent"
          ? "coordinated"
          : "orchestrator-led",
  };
}
