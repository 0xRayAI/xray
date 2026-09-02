/**
 * Spawn plan resolution SSOT — main lead-dev plan vs active user aside.
 * Extracted to avoid circular imports between user-aside and lead-dev-plan-persistence.
 */

import {
  getOutstandingTodos,
  hasValidLeadDevPlanForSpawn,
  loadPersistedLeadDevPlan,
  type PersistedLeadDevPlan,
} from './lead-dev-plan-persistence.js';
import {
  asideToSpawnPlan,
  findAsideContainingTodo,
  isAsideActiveForSession,
  isUserAsideTodoId,
  isUserAsidesEnabled,
  loadActiveUserAside,
  parseAsideIdFromTodoId,
} from './user-aside.js';

export interface SpawnPlanResolution {
  source: 'main' | 'aside' | 'none';
  asideId?: string;
  plan: PersistedLeadDevPlan | null;
  worktree?: string;
  branch?: string;
}

export interface SpawnPlanToolInput {
  planTodoId?: string;
  prompt?: string;
  description?: string;
  task?: string;
}

export function resolveSpawnPlan(
  toolInput: SpawnPlanToolInput,
  projectRoot = process.cwd(),
  sessionId?: string | null,
): SpawnPlanResolution {
  const explicitTodo = toolInput.planTodoId;

  if (explicitTodo && isUserAsideTodoId(explicitTodo)) {
    const parsedAsideId = parseAsideIdFromTodoId(explicitTodo);
    const aside = findAsideContainingTodo(explicitTodo, projectRoot, parsedAsideId ?? undefined);
    if (aside && isAsideActiveForSession(aside.id, projectRoot, sessionId)) {
      return asideResolution(aside);
    }
  }

  const active = loadActiveUserAside(projectRoot, sessionId);
  if (active) {
    return asideResolution(active);
  }

  const main = loadPersistedLeadDevPlan(projectRoot);
  if (main?.active) {
    return { source: 'main', plan: main };
  }
  return { source: 'none', plan: null };
}

function asideResolution(aside: import('./user-aside.js').UserAside): SpawnPlanResolution {
  return {
    source: 'aside',
    asideId: aside.id,
    plan: asideToSpawnPlan(aside),
    ...(aside.worktree ? { worktree: aside.worktree } : {}),
    ...(aside.branch ? { branch: aside.branch } : {}),
  };
}

export function hasValidSpawnPlanContext(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): boolean {
  const active = loadActiveUserAside(projectRoot, sessionId);
  if (active && isUserAsidesEnabled(projectRoot)) {
    const plan = asideToSpawnPlan(active);
    return getOutstandingTodos(plan).length > 0 || plan.active;
  }
  return hasValidLeadDevPlanForSpawn(projectRoot, sessionId);
}