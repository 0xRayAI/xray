import { evaluateTask as evaluateTask_011 } from './gates/term-011.mjs';
import { evaluateTask as evaluateTask_029 } from './gates/term-029.mjs';
import { evaluateTask as evaluateTask_059 } from './gates/term-059.mjs';
import { evaluateTask as evaluateTask_069 } from './gates/term-069.mjs';

export const GATE_EVALUATORS = [
  evaluateTask_011,
  evaluateTask_029,
  evaluateTask_059,
  evaluateTask_069,
];

export function runGovernanceGate(task, ctx) {
  return GATE_EVALUATORS.map((fn) => fn(task, ctx));
}

export function governanceGateSummary(results) {
  const failed = results.filter((r) => !r.pass);
  return { total: results.length, failed: failed.length, ok: failed.length === 0 };
}
