/**
 * Intake pass — mirrors ComplexityHandler.normalizeAnalyzeTasks + validateTasks slice.
 */
import { getExecutionPlanner } from '../processors/execution-planner.mjs';

export function normalizeWearTask(task, sessionId) {
  return {
    id: `wear:${sessionId}`,
    description: String(task ?? ''),
    type: 'implementation',
    priority: 'high',
    dependencies: [],
    estimatedComplexity: 25,
    metadata: {},
  };
}

export function runIntakePass(task, ctx = {}) {
  const sessionId = ctx.sessionId ?? '';
  const normalized = normalizeWearTask(task, sessionId);
  const planner = getExecutionPlanner();
  const validation = planner.validateTasks([normalized]);
  const text = String(task ?? '').toLowerCase();
  const flags = {
    ontological: text.includes('ontological'),
    trap: text.includes('trap'),
    attestation: text.includes('attestation'),
    consumer: text.includes('consumer'),
    revalidation: text.includes('revalidation'),
  };
  const complexity = planner.calculateTaskComplexity(normalized);
  return {
    normalized,
    validation,
    flags,
    complexity,
    sessionOk: sessionId.length > 0,
    tokenEstimate: Math.ceil(text.length / 4),
  };
}
