/**
 * User aside — parallel work tracks (worktree-like) declared by the user.
 * SSOT: `.xray/state/asides/{id}.json` + `_active.json`.
 * Todo ids use `a.*` prefix — distinct from main plan (1.*) and synthesis (s.*).
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildLeadDevPlan,
  isLeadDevModeActive,
  type LeadDevPlan,
  type LeadDevPlanTaskInput,
  type LeadDevPhase,
  type LeadDevTodo,
} from './autonomy-kernel.js';
import {
  allPlanTodos,
  getNextRequiredTodo,
  getOutstandingTodos,
  hasValidLeadDevPlanForSpawn,
  loadPersistedLeadDevPlan,
  type PersistedLeadDevPlan,
} from './lead-dev-plan-persistence.js';

export const USER_ASIDE_TODO_PATTERN = /^a\.\d+/;
export const USER_ASIDE_STATE_VERSION = 1 as const;

export type UserAsideStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface UserAsideGovernance {
  conferOnPhaseStart?: boolean;
  trapSignals?: string[];
}

export interface UserAside {
  version: typeof USER_ASIDE_STATE_VERSION;
  id: string;
  title: string;
  status: UserAsideStatus;
  owner?: string;
  description: string;
  definitionOfDone?: string;
  worktree?: string;
  branch?: string;
  persistedAt?: string;
  sessionId?: string;
  governance?: UserAsideGovernance;
  plan: LeadDevPlan;
}

export interface ActiveAsidePointer {
  asideId: string;
  activatedAt: string;
  sessionId?: string;
}

export function userAsidesDir(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'asides');
}

export function userAsidePath(asideId: string, projectRoot = process.cwd()): string {
  return path.join(userAsidesDir(projectRoot), `${asideId}.json`);
}

export function activeAsidePointerPath(projectRoot = process.cwd()): string {
  return path.join(userAsidesDir(projectRoot), '_active.json');
}

export function isUserAsideTodoId(todoId: string): boolean {
  return USER_ASIDE_TODO_PATTERN.test(todoId);
}

export function isUserAsidesEnabled(projectRoot = process.cwd()): boolean {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return true;
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: { user_asides?: { enabled?: boolean } };
    };
    const raw = data.multi_agent_orchestration?.user_asides;
    if (raw?.enabled === false) return false;
    return isLeadDevModeActive();
  } catch {
    return isLeadDevModeActive();
  }
}

function remapPhasesToAsidePrefix(phases: LeadDevPhase[]): LeadDevPhase[] {
  return phases.map((phase, phaseIndex) => ({
    ...phase,
    id: phase.id.startsWith('phase-') ? `aside-phase-${phaseIndex + 1}` : phase.id,
    todos: phase.todos.map((todo, todoIndex) => ({
      ...todo,
      id: `a.${phaseIndex + 1}.${todoIndex + 1}`,
      status: todo.status ?? 'pending',
    })),
  }));
}

/** Build a phased aside plan from task intake (mirrors lead-dev plan, a.* todo ids). */
export function buildUserAsidePlan(
  asideId: string,
  title: string,
  description: string,
  taskInputs: LeadDevPlanTaskInput[] = [],
  mcpOverallComplexity?: number,
): UserAside | null {
  if (!isUserAsidesEnabled()) return null;

  const taskTypes = taskInputs.map((t) => t.type ?? 'implement');
  const basePlan = buildLeadDevPlan(description, taskTypes, taskInputs, mcpOverallComplexity);
  if (!basePlan) return null;

  return {
    version: USER_ASIDE_STATE_VERSION,
    id: asideId,
    title,
    status: 'active',
    description,
    persistedAt: new Date().toISOString(),
    plan: {
      ...basePlan,
      description: `[Aside ${asideId}] ${description}`,
      phases: remapPhasesToAsidePrefix(basePlan.phases),
    },
  };
}

export function loadUserAside(
  asideId: string,
  projectRoot = process.cwd(),
): UserAside | null {
  const filePath = userAsidePath(asideId, projectRoot);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as UserAside;
    if (parsed.version !== USER_ASIDE_STATE_VERSION || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveUserAside(aside: UserAside, projectRoot = process.cwd()): string {
  const dir = userAsidesDir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = userAsidePath(aside.id, projectRoot);
  const payload: UserAside = {
    ...aside,
    version: USER_ASIDE_STATE_VERSION,
    persistedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

export function listUserAsideIds(projectRoot = process.cwd()): string[] {
  const dir = userAsidesDir(projectRoot);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== '_active.json')
    .map((f) => f.replace(/\.json$/, ''));
}

export function loadActiveAsidePointer(projectRoot = process.cwd()): ActiveAsidePointer | null {
  const pointerPath = activeAsidePointerPath(projectRoot);
  if (!fs.existsSync(pointerPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pointerPath, 'utf8')) as ActiveAsidePointer;
  } catch {
    return null;
  }
}

export function getActiveAsideId(projectRoot = process.cwd()): string | null {
  if (!isUserAsidesEnabled(projectRoot)) return null;
  return loadActiveAsidePointer(projectRoot)?.asideId ?? null;
}

export function setActiveAsideId(
  asideId: string,
  projectRoot = process.cwd(),
  sessionId?: string | null,
): ActiveAsidePointer {
  const dir = userAsidesDir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const pointer: ActiveAsidePointer = {
    asideId,
    activatedAt: new Date().toISOString(),
    ...(sessionId ? { sessionId } : {}),
  };
  fs.writeFileSync(activeAsidePointerPath(projectRoot), JSON.stringify(pointer, null, 2));
  return pointer;
}

export function clearActiveAside(projectRoot = process.cwd()): boolean {
  const pointerPath = activeAsidePointerPath(projectRoot);
  if (!fs.existsSync(pointerPath)) return false;
  fs.unlinkSync(pointerPath);
  return true;
}

export function loadActiveUserAside(projectRoot = process.cwd()): UserAside | null {
  const id = getActiveAsideId(projectRoot);
  if (!id) return null;
  return loadUserAside(id, projectRoot);
}

/** PersistedLeadDevPlan view of an aside for spawn-gate reuse. */
export function asideToSpawnPlan(aside: UserAside): PersistedLeadDevPlan {
  const plan: PersistedLeadDevPlan = { ...aside.plan };
  if (aside.persistedAt) plan.persistedAt = aside.persistedAt;
  if (aside.sessionId) plan.sessionId = aside.sessionId;
  return plan;
}

export function findAsideContainingTodo(
  todoId: string,
  projectRoot = process.cwd(),
): UserAside | null {
  if (!isUserAsideTodoId(todoId)) return null;
  for (const id of listUserAsideIds(projectRoot)) {
    const aside = loadUserAside(id, projectRoot);
    if (!aside) continue;
    const hit = allPlanTodos(asideToSpawnPlan(aside)).some((t) => t.id === todoId);
    if (hit) return aside;
  }
  return null;
}

export interface SpawnPlanResolution {
  source: 'main' | 'aside' | 'none';
  asideId?: string;
  plan: PersistedLeadDevPlan | null;
  worktree?: string;
  branch?: string;
}

export function resolveSpawnPlan(
  toolInput: { planTodoId?: string; prompt?: string; description?: string; task?: string },
  projectRoot = process.cwd(),
): SpawnPlanResolution {
  const explicitTodo = toolInput.planTodoId;
  if (explicitTodo && isUserAsideTodoId(explicitTodo)) {
    const aside = findAsideContainingTodo(explicitTodo, projectRoot);
    if (aside) {
      return {
        source: 'aside',
        asideId: aside.id,
        plan: asideToSpawnPlan(aside),
        ...(aside.worktree ? { worktree: aside.worktree } : {}),
        ...(aside.branch ? { branch: aside.branch } : {}),
      };
    }
  }

  const active = loadActiveUserAside(projectRoot);
  if (active && active.status === 'active') {
    return {
      source: 'aside',
      asideId: active.id,
      plan: asideToSpawnPlan(active),
      ...(active.worktree ? { worktree: active.worktree } : {}),
      ...(active.branch ? { branch: active.branch } : {}),
    };
  }

  const main = loadPersistedLeadDevPlan(projectRoot);
  if (main?.active) {
    return { source: 'main', plan: main };
  }
  return { source: 'none', plan: null };
}

/** Whether spawn gate should accept the current plan context (main or active aside). */
export function hasValidSpawnPlanContext(projectRoot = process.cwd()): boolean {
  const active = loadActiveUserAside(projectRoot);
  if (active?.status === 'active' && isUserAsidesEnabled(projectRoot)) {
    const plan = asideToSpawnPlan(active);
    return getOutstandingTodos(plan).length > 0 || plan.active;
  }
  return hasValidLeadDevPlanForSpawn(projectRoot);
}

export function updateUserAsideTodoStatus(
  todoId: string,
  status: LeadDevTodo['status'],
  projectRoot = process.cwd(),
): boolean {
  const aside =
    findAsideContainingTodo(todoId, projectRoot) ??
    loadActiveUserAside(projectRoot);
  if (!aside) return false;

  let updated = false;
  for (const phase of aside.plan.phases) {
    for (const todo of phase.todos) {
      if (todo.id === todoId) {
        todo.status = status;
        updated = true;
      }
    }
  }
  if (!updated) return false;

  const outstanding = getOutstandingTodos(asideToSpawnPlan(aside));
  if (outstanding.length === 0 && status === 'completed') {
    aside.status = 'completed';
  }

  saveUserAside(aside, projectRoot);
  return true;
}

export function getNextAsideTodo(aside: UserAside): LeadDevTodo | null {
  return getNextRequiredTodo(asideToSpawnPlan(aside));
}

export function formatUserAsideSummary(aside: UserAside): string {
  const todos = allPlanTodos(asideToSpawnPlan(aside));
  const done = todos.filter((t) => t.status === 'completed').length;
  const lines = [
    `**Aside \`${aside.id}\`** — ${aside.title}`,
    `Status: ${aside.status} | Todos: ${done}/${todos.length}`,
    aside.worktree ? `Worktree: \`${aside.worktree}\`` : null,
    aside.branch ? `Branch: \`${aside.branch}\`` : null,
    '',
    ...todos.map(
      (t) => `- [${t.status === 'completed' ? 'x' : ' '}] ${t.id} (${t.subagent}): ${t.task}`,
    ),
  ].filter(Boolean);
  return lines.join('\n');
}