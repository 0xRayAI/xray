import { buildLeadDevPlan } from '../node_modules/0xray/dist/nucleus/autonomy-kernel.js';
import { projectRoot } from './repertoire-config.mjs';

/** Mirrors analyze-complexity lead-dev plan slice for a single task string. */
export function leadDevPlanSnapshot(description, taskTypes = ['implement']) {
  const root = projectRoot();
  const taskInputs = [{ description, type: 'implement' }];
  const plan = buildLeadDevPlan(description, taskTypes, taskInputs, undefined, root);
  if (!plan) return { active: false, phases: 0, todos: 0 };
  const todos = (plan.phases || []).flatMap((p) => p.todos || []);
  return {
    active: Boolean(plan.active),
    complexity: plan.complexity ?? null,
    requiresPhasedPlan: Boolean(plan.requiresPhasedPlan),
    phases: plan.phases?.length ?? 0,
    todos: todos.length,
    firstTodo: todos[0]?.subagent ?? null,
  };
}
