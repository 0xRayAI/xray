import { getOrgan } from './organ.mjs';

/** Mirrors ExecutionPlanner.createExecutionPlan memory slice (enrichTasks + buildInheritedContext). */
export function enrichWearTask(organ, task, sessionId) {
  const seed = [
    {
      id: `wear:${sessionId}`,
      description: task,
      type: 'implementation',
      priority: 'high',
      dependencies: [],
      estimatedComplexity: 25,
      metadata: {},
    },
  ];
  const enriched = organ.enrichTasks(seed);
  const inherited = organ.buildInheritedContext(enriched);
  return { enriched: enriched[0] ?? null, inherited };
}

export function enrichWearTaskFromArgv(task, sessionId) {
  const organ = getOrgan();
  if (!organ.isAvailable()) {
    throw new Error(`repertoire unavailable: ${JSON.stringify(organ.getAvailabilityStatus())}`);
  }
  return enrichWearTask(organ, task, sessionId);
}
