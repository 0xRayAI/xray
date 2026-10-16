/**
 * User aside — parallel work tracks (worktree-like) declared by the user.
 * SSOT: `.xray/state/asides/{id}.json` + `_active.json`.
 * Todo ids: `{asideId}.a.{phase}.{todo}` — globally unique per aside.
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
  type PersistedLeadDevPlan,
} from './lead-dev-plan-persistence.js';

export const USER_ASIDE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
/** Namespaced aside todo: `suit-nft.a.1.1` */
export const USER_ASIDE_TODO_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}\.a\.\d+\.\d+$/;
export const USER_ASIDE_STATE_VERSION = 1 as const;

export type UserAsideStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface UserAsideGovernance {
  /** Session-boot hint to run confer before aside phase work (manual MCP — not auto confer). */
  conferOnPhaseStart?: boolean;
  /** Repertoire trap signal names surfaced in session-boot for aside work. */
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

export class UserAsideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserAsideValidationError';
  }
}

export function assertSafeAsideId(asideId: string): string {
  const trimmed = asideId.trim();
  if (!trimmed || !USER_ASIDE_ID_PATTERN.test(trimmed)) {
    throw new UserAsideValidationError(
      `Invalid aside id "${asideId}" — use [a-zA-Z0-9][a-zA-Z0-9._-]{0,63}`,
    );
  }
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new UserAsideValidationError(`Invalid aside id "${asideId}" — path characters forbidden`);
  }
  return trimmed;
}

export function asideTodoId(asideId: string, phaseIndex: number, todoIndex: number): string {
  return `${assertSafeAsideId(asideId)}.a.${phaseIndex + 1}.${todoIndex + 1}`;
}

export function isUserAsideTodoId(todoId: string): boolean {
  return USER_ASIDE_TODO_PATTERN.test(todoId);
}

export function parseAsideIdFromTodoId(todoId: string): string | null {
  if (!isUserAsideTodoId(todoId)) return null;
  const dotA = todoId.indexOf('.a.');
  if (dotA <= 0) return null;
  const asideId = todoId.slice(0, dotA);
  try {
    return assertSafeAsideId(asideId);
  } catch {
    return null;
  }
}

export function userAsidesDir(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'asides');
}

export function userAsidePath(asideId: string, projectRoot = process.cwd()): string {
  const safe = assertSafeAsideId(asideId);
  const resolved = path.resolve(userAsidesDir(projectRoot), `${safe}.json`);
  const base = path.resolve(userAsidesDir(projectRoot));
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new UserAsideValidationError(`Aside path escapes asides directory: ${asideId}`);
  }
  return resolved;
}

export function activeAsidePointerPath(projectRoot = process.cwd()): string {
  return path.join(userAsidesDir(projectRoot), '_active.json');
}

export function isUserAsidesEnabled(projectRoot = process.cwd()): boolean {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return isLeadDevModeActive();
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

function validateLoadedAside(parsed: unknown, expectedId?: string): UserAside | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as UserAside;
  if (row.version !== USER_ASIDE_STATE_VERSION) return null;
  if (!row.id || !row.title || !row.description || !row.plan) return null;
  if (!Array.isArray(row.plan.phases)) return null;
  try {
    assertSafeAsideId(row.id);
  } catch {
    return null;
  }
  if (expectedId && row.id !== expectedId) return null;
  for (const phase of row.plan.phases) {
    if (!phase?.todos || !Array.isArray(phase.todos)) return null;
  }
  return row;
}

function remapPhasesToAsidePrefix(asideId: string, phases: LeadDevPhase[]): LeadDevPhase[] {
  const safeId = assertSafeAsideId(asideId);
  return phases.map((phase, phaseIndex) => ({
    ...phase,
    id: phase.id.startsWith('phase-') ? `aside-phase-${phaseIndex + 1}` : phase.id,
    todos: phase.todos.map((todo, todoIndex) => ({
      ...todo,
      id: asideTodoId(safeId, phaseIndex, todoIndex),
      status: todo.status ?? 'pending',
    })),
  }));
}

/** Build a phased aside plan from task intake (mirrors lead-dev plan, namespaced todo ids). */
export function buildUserAsidePlan(
  asideId: string,
  title: string,
  description: string,
  taskInputs: LeadDevPlanTaskInput[] = [],
  mcpOverallComplexity?: number,
  projectRoot = process.cwd(),
): UserAside | null {
  if (!isUserAsidesEnabled(projectRoot)) return null;

  const safeId = assertSafeAsideId(asideId);
  const taskTypes = taskInputs.map((t) => t.type ?? 'implement');
  const basePlan = buildLeadDevPlan(
    description,
    taskTypes,
    taskInputs,
    mcpOverallComplexity,
    projectRoot,
  );
  if (!basePlan) return null;

  return {
    version: USER_ASIDE_STATE_VERSION,
    id: safeId,
    title,
    status: 'active',
    description,
    persistedAt: new Date().toISOString(),
    plan: {
      ...basePlan,
      description: `[Aside ${safeId}] ${description}`,
      phases: remapPhasesToAsidePrefix(safeId, basePlan.phases),
    },
  };
}

/** Merge new task intake into an existing aside (re-intake). */
export function mergeUserAsideIntake(
  existing: UserAside,
  description: string,
  taskInputs: LeadDevPlanTaskInput[],
  mcpOverallComplexity?: number,
  projectRoot = process.cwd(),
): UserAside {
  const fresh = buildUserAsidePlan(
    existing.id,
    existing.title,
    description || existing.description,
    taskInputs.length > 0 ? taskInputs : [{ description: existing.description, type: 'implement' }],
    mcpOverallComplexity,
    projectRoot,
  );
  if (!fresh) return existing;

  const mergedPhases = [...existing.plan.phases];
  for (const phase of fresh.plan.phases) {
    const match = mergedPhases.find((p) => p.id === phase.id);
    if (match) {
      const existingIds = new Set(match.todos.map((t) => t.id));
      for (const todo of phase.todos) {
        if (!existingIds.has(todo.id)) match.todos.push(todo);
      }
    } else {
      mergedPhases.push(phase);
    }
  }

  return {
    ...existing,
    description: description || existing.description,
    status: existing.status === 'completed' ? 'active' : existing.status,
    plan: { ...existing.plan, phases: mergedPhases },
  };
}

export function loadUserAside(
  asideId: string,
  projectRoot = process.cwd(),
): UserAside | null {
  try {
    const filePath = userAsidePath(asideId, projectRoot);
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return validateLoadedAside(parsed, assertSafeAsideId(asideId));
  } catch {
    return null;
  }
}

export function saveUserAside(aside: UserAside, projectRoot = process.cwd()): string {
  assertSafeAsideId(aside.id);
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
    .map((f) => f.replace(/\.json$/, ''))
    .filter((id) => USER_ASIDE_ID_PATTERN.test(id));
}

export function loadActiveAsidePointer(projectRoot = process.cwd()): ActiveAsidePointer | null {
  const pointerPath = activeAsidePointerPath(projectRoot);
  if (!fs.existsSync(pointerPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(pointerPath, 'utf8')) as ActiveAsidePointer;
    if (!parsed?.asideId) return null;
    assertSafeAsideId(parsed.asideId);
    return parsed;
  } catch {
    return null;
  }
}

export function getActiveAsideId(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): string | null {
  if (!isUserAsidesEnabled(projectRoot)) return null;
  const pointer = loadActiveAsidePointer(projectRoot);
  if (!pointer) return null;
  if (pointer.sessionId) {
    if (!sessionId || pointer.sessionId !== sessionId) return null;
  }
  const aside = loadUserAside(pointer.asideId, projectRoot);
  if (!aside || aside.status !== 'active') return null;
  return pointer.asideId;
}

export function setActiveAsideId(
  asideId: string,
  projectRoot = process.cwd(),
  sessionId?: string | null,
): ActiveAsidePointer {
  const safeId = assertSafeAsideId(asideId);
  const aside = loadUserAside(safeId, projectRoot);
  if (!aside) {
    throw new UserAsideValidationError(
      `Cannot activate aside "${safeId}" — file not found at .xray/state/asides/${safeId}.json`,
    );
  }
  if (aside.status !== 'active' && aside.status !== 'paused') {
    throw new UserAsideValidationError(
      `Cannot activate aside "${safeId}" — status is ${aside.status}`,
    );
  }
  if (aside.status === 'paused') {
    aside.status = 'active';
    saveUserAside(aside, projectRoot);
  }

  const dir = userAsidesDir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const pointer: ActiveAsidePointer = {
    asideId: safeId,
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

export function loadActiveUserAside(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): UserAside | null {
  const id = getActiveAsideId(projectRoot, sessionId);
  if (!id) {
    const pointer = loadActiveAsidePointer(projectRoot);
    if (pointer) {
      const aside = loadUserAside(pointer.asideId, projectRoot);
      if (aside && aside.status !== 'active') clearActiveAside(projectRoot);
    }
    return null;
  }
  const aside = loadUserAside(id, projectRoot);
  if (!aside || aside.status !== 'active') {
    clearActiveAside(projectRoot);
    return null;
  }
  return aside;
}

/** PersistedLeadDevPlan view of an aside for spawn-gate reuse. */
export function asideToSpawnPlan(aside: UserAside): PersistedLeadDevPlan {
  const plan: PersistedLeadDevPlan = { ...aside.plan };
  if (aside.persistedAt) plan.persistedAt = aside.persistedAt;
  if (aside.sessionId) plan.sessionId = aside.sessionId;
  return plan;
}

/** Aside routable when active for session, or pointer is unscoped (accepted exception). */
export function isAsideActiveForSession(
  asideId: string,
  projectRoot = process.cwd(),
  sessionId?: string | null,
): boolean {
  const activeId = getActiveAsideId(projectRoot, sessionId);
  if (activeId === asideId) return true;
  const pointer = loadActiveAsidePointer(projectRoot);
  if (!pointer || pointer.asideId !== asideId) return false;
  if (!pointer.sessionId) return true;
  return Boolean(sessionId && pointer.sessionId === sessionId);
}

export function findAsideContainingTodo(
  todoId: string,
  projectRoot = process.cwd(),
  preferredAsideId?: string,
): UserAside | null {
  if (!isUserAsideTodoId(todoId)) return null;

  if (preferredAsideId) {
    const direct = loadUserAside(preferredAsideId, projectRoot);
    if (direct) {
      const hit = allPlanTodos(asideToSpawnPlan(direct)).some((t) => t.id === todoId);
      if (hit) return direct;
    }
  }

  const parsedId = parseAsideIdFromTodoId(todoId);
  if (parsedId) {
    const aside = loadUserAside(parsedId, projectRoot);
    if (aside) {
      const hit = allPlanTodos(asideToSpawnPlan(aside)).some((t) => t.id === todoId);
      if (hit) return aside;
    }
  }

  return null;
}

export function updateUserAsideTodoStatus(
  todoId: string,
  status: LeadDevTodo['status'],
  projectRoot = process.cwd(),
  sessionId?: string | null,
): boolean {
  const parsedId = parseAsideIdFromTodoId(todoId);
  let aside = parsedId
    ? findAsideContainingTodo(todoId, projectRoot, parsedId)
    : null;
  if (aside && parsedId && !isAsideActiveForSession(parsedId, projectRoot, sessionId)) {
    aside = null;
  }
  if (!aside) aside = loadActiveUserAside(projectRoot, sessionId);
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
  if (outstanding.length === 0) {
    aside.status = 'completed';
    clearActiveAside(projectRoot);
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

export function getUserAsideBootHints(
  projectRoot = process.cwd(),
  sessionId?: string | null,
): Record<string, unknown> | null {
  if (!isUserAsidesEnabled(projectRoot)) return null;
  const aside = loadActiveUserAside(projectRoot, sessionId);
  if (!aside) return null;

  const hints: Record<string, unknown> = {
    activeAside: aside.id,
    asideTitle: aside.title,
    asideStatus: aside.status,
    asideTodoPrefix: `${aside.id}.a.*`,
    asideHint:
      'Spawns route to active aside todos; orchestrate-task clearActiveAside to resume main',
  };
  if (aside.worktree) hints.asideWorktree = aside.worktree;
  if (aside.branch) hints.asideBranch = aside.branch;
  if (aside.governance?.trapSignals?.length) {
    hints.asideTrapSignals = aside.governance.trapSignals;
  }
  if (aside.governance?.conferOnPhaseStart) {
    hints.asideConferRecommended = true;
    hints.asideConferTrigger = 'orchestrate-task { confer: true } or synthesis analyze-complexity';
  }
  return hints;
}