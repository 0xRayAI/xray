/**
 * AsideContext — bounded subcontext for depth, continuity, and layered exploration
 *
 * Phase 3: enables Engine to spawn sub-investigations that inherit session context,
 * priorVerdictContext, and reclamation pressure state. Results are structured for
 * Governance feedback loop consumption. Lightweight — no new dependencies.
 */

import { frameworkLogger } from "../../core/framework-logger.js";

export interface AsideContextOptions {
  description: string;
  inheritedContext?: Record<string, unknown>;
  priorVerdictContext?: Record<string, unknown>;
  sessionId?: string;
  parentAsideId?: string;
}

export interface AsideObservation {
  key: string;
  value: string;
  source: string;
}

export interface AsideResult {
  asideId: string;
  description: string;
  success: boolean;
  duration: number;
  observations: AsideObservation[];
  priorVerdictContext?: Record<string, unknown>;
  error?: string;
}

interface ActiveAside {
  asideId: string;
  description: string;
  sessionId?: string;
  parentAsideId?: string;
  startedAt: number;
  inheritedContext?: Record<string, unknown>;
  priorVerdictContext?: Record<string, unknown>;
  observations: AsideObservation[];
}

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

function extractObservations(ctx: Record<string, unknown>): AsideObservation[] {
  const obs: AsideObservation[] = [];
  const recSummary = ctx["reclamationPressureSummary"];
  if (recSummary) {
    obs.push({ key: "reclamationPressureSummary", value: String(recSummary).substring(0, 120), source: "dispatchStats.dispatchStats" });
  }
  const codexBoost = ctx["codexBoostActive"];
  if (codexBoost) {
    obs.push({ key: "codexBoostActive", value: String(codexBoost), source: "dispatchStats.dispatchStats" });
  }
  const decision = ctx["decision"];
  if (decision) {
    obs.push({ key: "governanceDecision", value: String(decision), source: "governanceService" });
  }
  const perProcPreferred = ctx["perProcPreferredForTheseFlows"];
  if (perProcPreferred) {
    obs.push({ key: "perProcPreferredForTheseFlows", value: String(perProcPreferred), source: "planner" });
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
    note: "Phase 3: aside subcontext spawned with inherited context — available for depth exploration",
  });

  if (options.priorVerdictContext) {
    const obs = extractObservations(options.priorVerdictContext);
    aside.observations.push(...obs);
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
    note: "Phase 3: aside subcontext completed — results available for Governance feedback loop",
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
    note: "Phase 3: aside subcontext closed and removed from active registry",
  });
  return true;
}

export function closeAllAsides(): number {
  const count = activeAsides.size;
  activeAsides.clear();
  frameworkLogger.log("aside-context", "aside-close-all", "info", {
    closedCount: count,
    note: "Phase 3: all aside subcontexts closed",
  });
  return count;
}
