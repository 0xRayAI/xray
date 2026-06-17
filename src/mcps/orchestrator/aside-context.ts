/**
 * AsideContext — bounded subcontext for depth, continuity, and layered exploration
 *
 * Enables the orchestrator to spawn sub-investigations that inherit session context,
 * accumulate structured observations from v3 subsystems (governance, orchestration,
 * complexity analysis), and feed results back into the governance loop.
 */

import { frameworkLogger } from "../../core/framework-logger.js";
import type {
  AsideContextOptions,
  AsideObservation,
  AsideResult,
  ActiveAside,
} from "./types.js";
import type { InferenceCycleResult } from "../../inference/inference-cycle.js";
import type { OrchestrationResult, ComplexityAnalysis } from "./types.js";

let asideCounter = 0;
const activeAsides = new Map<string, ActiveAside>();

export function getActiveAsideCount(): number {
  return activeAsides.size;
}

export function getActiveAsideIds(): string[] {
  return Array.from(activeAsides.keys());
}

export function getAsideState(asideId: string): ActiveAside | undefined {
  return activeAsides.get(asideId);
}

export function addObservations(
  asideId: string,
  observations: AsideObservation[],
): boolean {
  const aside = activeAsides.get(asideId);
  if (!aside) return false;
  aside.observations.push(...observations);
  return true;
}

export function extractGovernanceObservations(
  result: InferenceCycleResult,
): AsideObservation[] {
  const obs: AsideObservation[] = [];
  obs.push({
    key: "governanceCycleId",
    value: result.cycleId,
    source: "inference/inference-cycle.ts",
  });
  obs.push({
    key: "governanceVoteCount",
    value: String(result.votes.length),
    source: "inference/inference-cycle.ts",
  });
  const approved = result.votes.filter((v) => v.decision === "approve").length;
  const rejected = result.votes.filter((v) => v.decision === "reject").length;
  obs.push({
    key: "governanceApprovedCount",
    value: String(approved),
    source: "inference/inference-cycle.ts",
  });
  obs.push({
    key: "governanceRejectedCount",
    value: String(rejected),
    source: "inference/inference-cycle.ts",
  });
  if (result.corpusSummary) {
    obs.push({
      key: "corpusSessionCount",
      value: String(result.corpusSummary.sessions),
      source: "inference/inference-cycle.ts",
    });
    obs.push({
      key: "corpusPatternCount",
      value: String(result.corpusSummary.recurringPatterns),
      source: "inference/inference-cycle.ts",
    });
  }
  return obs;
}

export function extractOrchestrationObservations(
  result: OrchestrationResult,
): AsideObservation[] {
  const obs: AsideObservation[] = [];
  obs.push({
    key: "orchestrationSuccess",
    value: String(result.success),
    source: "mcps/orchestrator/types.ts",
  });
  obs.push({
    key: "tasksCompleted",
    value: String(result.completedTasks),
    source: "mcps/orchestrator/types.ts",
  });
  obs.push({
    key: "tasksFailed",
    value: String(result.failedTasks),
    source: "mcps/orchestrator/types.ts",
  });
  obs.push({
    key: "orchestrationDuration",
    value: `${result.duration}ms`,
    source: "mcps/orchestrator/types.ts",
  });
  for (const b of result.bottlenecks) {
    obs.push({
      key: "bottleneck",
      value: b.substring(0, 200),
      source: "mcps/orchestrator/types.ts",
    });
  }
  for (const r of result.recommendations) {
    obs.push({
      key: "recommendation",
      value: r.substring(0, 200),
      source: "mcps/orchestrator/types.ts",
    });
  }
  return obs;
}

export function extractComplexityObservations(
  analysis: ComplexityAnalysis,
): AsideObservation[] {
  const obs: AsideObservation[] = [];
  obs.push({
    key: "complexityScore",
    value: String(analysis.overallComplexity),
    source: "mcps/orchestrator/execution/execution-planner.ts",
  });
  obs.push({
    key: "recommendedStrategy",
    value: analysis.recommendedStrategy,
    source: "mcps/orchestrator/execution/execution-planner.ts",
  });
  obs.push({
    key: "parallelPotential",
    value: String(analysis.parallelPotential),
    source: "mcps/orchestrator/execution/execution-planner.ts",
  });
  obs.push({
    key: "estimatedDuration",
    value: `${analysis.estimatedDuration}ms`,
    source: "mcps/orchestrator/execution/execution-planner.ts",
  });
  for (const tc of analysis.taskComplexity) {
    obs.push({
      key: `taskComplexity`,
      value: `${tc.complexity} (${tc.category})`,
      source: "mcps/orchestrator/execution/execution-planner.ts",
    });
  }
  return obs;
}

export async function spawnAside(
  options: AsideContextOptions,
): Promise<AsideResult> {
  const asideId = options.parentAsideId
    ? `${options.parentAsideId}.aside-${++asideCounter}`
    : `aside-${++asideCounter}-${Date.now()}`;
  const startTime = Date.now();

  const aside: ActiveAside = {
    asideId,
    description: options.description,
    startedAt: startTime,
    observations: [],
    ...(options.inheritedContext !== undefined ? { inheritedContext: options.inheritedContext } : {}),
    ...(options.parentAsideId !== undefined ? { parentAsideId: options.parentAsideId } : {}),
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
    ...(options.priorVerdictContext !== undefined ? { priorVerdictContext: options.priorVerdictContext } : {}),
  };

  activeAsides.set(asideId, aside);

  frameworkLogger.log("aside-context", "aside-spawn", "info", {
    asideId,
    description: options.description,
    sessionId: options.sessionId,
    parentAsideId: options.parentAsideId,
    activeAsideCount: activeAsides.size,
  });

  if (options.priorVerdictContext) {
    const decision = options.priorVerdictContext["decision"];
    if (decision) {
      aside.observations.push({
        key: "governanceDecision",
        value: String(decision),
        source: "priorVerdictContext",
      });
    }
  }

  const duration = Date.now() - startTime;

  const result: AsideResult = {
    asideId,
    description: options.description,
    success: true,
    duration,
    observations: aside.observations,
    ...(options.priorVerdictContext !== undefined ? { priorVerdictContext: options.priorVerdictContext } : {}),
  };

  frameworkLogger.log("aside-context", "aside-complete", "info", {
    asideId,
    duration,
    observationCount: aside.observations.length,
    activeAsideCount: activeAsides.size,
  });

  return result;
}

export function closeAside(asideId: string): boolean {
  const aside = activeAsides.get(asideId);
  if (!aside) return false;
  activeAsides.delete(asideId);
  frameworkLogger.log("aside-context", "aside-closed", "info", {
    asideId,
    duration: Date.now() - aside.startedAt,
    remainingActive: activeAsides.size,
  });
  return true;
}

export function closeAllAsides(): number {
  const count = activeAsides.size;
  activeAsides.clear();
  frameworkLogger.log("aside-context", "aside-close-all", "info", {
    closedCount: count,
  });
  return count;
}

export function resetAsideContext(): void {
  activeAsides.clear();
  asideCounter = 0;
}
