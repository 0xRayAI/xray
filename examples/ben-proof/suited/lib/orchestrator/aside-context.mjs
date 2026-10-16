/**
 * AsideContext — ported from xray src/mcps/orchestrator/aside-context.ts
 * Bounded subcontext for wear pipeline governance observations.
 */

let asideCounter = 0;
const activeAsides = new Map();

export function getActiveAsideCount() {
  return activeAsides.size;
}

export function getActiveAsideIds() {
  return Array.from(activeAsides.keys());
}

export function getAsideState(asideId) {
  return activeAsides.get(asideId);
}

export function addObservations(asideId, observations) {
  const aside = activeAsides.get(asideId);
  if (!aside) return false;
  aside.observations.push(...observations);
  return true;
}

export function extractComplexityObservations(analysis) {
  const obs = [];
  obs.push({
    key: 'complexityScore',
    value: String(analysis.overallComplexity),
    source: 'mcps/orchestrator/execution/execution-planner.ts',
  });
  obs.push({
    key: 'recommendedStrategy',
    value: analysis.recommendedStrategy,
    source: 'mcps/orchestrator/execution/execution-planner.ts',
  });
  obs.push({
    key: 'parallelPotential',
    value: String(analysis.parallelPotential),
    source: 'mcps/orchestrator/execution/execution-planner.ts',
  });
  obs.push({
    key: 'estimatedDuration',
    value: `${analysis.estimatedDuration}ms`,
    source: 'mcps/orchestrator/execution/execution-planner.ts',
  });
  for (const tc of analysis.taskComplexity ?? []) {
    obs.push({
      key: 'taskComplexity',
      value: `${tc.complexity} (${tc.category})`,
      source: 'mcps/orchestrator/execution/execution-planner.ts',
    });
  }
  return obs;
}

export function extractWearObservations(wearResult) {
  const obs = extractComplexityObservations({
    overallComplexity: wearResult.score ?? 0,
    recommendedStrategy: wearResult.level ?? 'simple',
    parallelPotential: 0,
    estimatedDuration: 0,
    taskComplexity: [{ complexity: wearResult.score ?? 0, category: 'implementation' }],
  });
  obs.push({
    key: 'benchLessonRecorded',
    value: String(Boolean(wearResult.signals?.length)),
    source: 'memory-routing/record-lesson.js',
  });
  obs.push({
    key: 'thinDispatchVersion',
    value: String(wearResult.thinDispatchVersion ?? ''),
    source: 'nucleus/thin-dispatch.ts',
  });
  return obs;
}

export async function spawnAside(options) {
  const asideId = options.parentAsideId
    ? `${options.parentAsideId}.aside-${++asideCounter}`
    : `aside-${++asideCounter}-${Date.now()}`;
  const startTime = Date.now();
  const aside = {
    asideId,
    description: options.description,
    startedAt: startTime,
    observations: [],
  };
  if (options.inheritedContext !== undefined) aside.inheritedContext = options.inheritedContext;
  if (options.parentAsideId !== undefined) aside.parentAsideId = options.parentAsideId;
  if (options.sessionId !== undefined) aside.sessionId = options.sessionId;
  activeAsides.set(asideId, aside);
  if (options.priorVerdictContext?.decision) {
    aside.observations.push({
      key: 'governanceDecision',
      value: String(options.priorVerdictContext.decision),
      source: 'priorVerdictContext',
    });
  }
  const duration = Date.now() - startTime;
  return {
    asideId,
    description: options.description,
    success: true,
    duration,
    observations: aside.observations,
  };
}

export function closeAside(asideId) {
  const aside = activeAsides.get(asideId);
  if (!aside) return false;
  activeAsides.delete(asideId);
  return true;
}

export function closeAllAsides() {
  const count = activeAsides.size;
  activeAsides.clear();
  return count;
}

export function resetAsideContext() {
  activeAsides.clear();
  asideCounter = 0;
}
