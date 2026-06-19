/**
 * Todo-level lead-dev plan persistence — spawn gate survives beyond 4h mtime
 * while outstanding todos remain. SSOT for plan todo status sync.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LeadDevPlan, LeadDevTodo } from './autonomy-kernel.js';
import { SYNTHESIS_REALIGNMENT_PHASE_ID } from './autonomy-kernel.js';
import { DEFAULT_PENDING_TTL_MS } from './pending-delegations.js';
import {
  completeSynthesisCheckpoint,
  getSynthesisCheckpointSessionId,
  isSynthesisCheckpointDue,
  recordExecutionSlice,
} from './synthesis.js';
import {
  hasValidSynthesisConsultReceipt,
  isSynthesisConsultTodoId,
} from './synthesis-consult-receipt.js';

export interface PersistedLeadDevPlan extends LeadDevPlan {
  persistedAt?: string;
  sessionId?: string;
  planGeneration?: number;
}

export interface SpawnTodoValidation {
  valid: boolean;
  reason?: string;
  gate?: string;
  hint?: Record<string, unknown>;
  expectedTodoId?: string | null;
}

export const DEFAULT_PLAN_STALE_MS = 8 * 60 * 60 * 1000;

export function leadDevPlanStatePath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'lead-dev-plan.json');
}

export function loadLeadDevPlanStaleMs(projectRoot = process.cwd()): number {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) return DEFAULT_PLAN_STALE_MS;
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: { plan_stale_hours?: number };
    };
    const hours = data.multi_agent_orchestration?.plan_stale_hours;
    if (typeof hours === 'number' && hours > 0) {
      return hours * 60 * 60 * 1000;
    }
  } catch {
    /* keep default */
  }
  return DEFAULT_PLAN_STALE_MS;
}

function planAgeMs(plan: PersistedLeadDevPlan, projectRoot: string): number {
  const persistedAt = plan.persistedAt;
  if (persistedAt) {
    return Date.now() - new Date(persistedAt).getTime();
  }
  try {
    const stat = fs.statSync(leadDevPlanStatePath(projectRoot));
    return Date.now() - stat.mtimeMs;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Stale when every outstanding todo is still pending and plan age exceeds TTL.
 * In-progress or completed todos imply active work — plan stays valid.
 */
export function isLeadDevPlanStale(
  plan: PersistedLeadDevPlan,
  projectRoot = process.cwd(),
): boolean {
  if (!plan.active) return false;
  const outstanding = getOutstandingTodos(plan);
  if (outstanding.length === 0) return false;
  const allStillPending = outstanding.every((t) => t.status === 'pending');
  if (!allStillPending) return false;
  return planAgeMs(plan, projectRoot) > loadLeadDevPlanStaleMs(projectRoot);
}

export function archiveStaleLeadDevPlan(
  projectRoot = process.cwd(),
): { archived: boolean; archivePath?: string; reason?: string } {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan || !isLeadDevPlanStale(plan, projectRoot)) {
    return { archived: false };
  }

  const stateDir = path.dirname(leadDevPlanStatePath(projectRoot));
  fs.mkdirSync(stateDir, { recursive: true });
  const archivePath = path.join(
    stateDir,
    `lead-dev-plan.archived-${Date.now()}.json`,
  );
  const payload = {
    ...plan,
    active: false,
    archivedAt: new Date().toISOString(),
    archiveReason: 'stale-unstarted-todos',
  };
  fs.writeFileSync(archivePath, JSON.stringify(payload, null, 2));
  fs.unlinkSync(leadDevPlanStatePath(projectRoot));
  return { archived: true, archivePath, reason: 'stale-unstarted-todos' };
}

export function loadPersistedLeadDevPlan(
  projectRoot = process.cwd(),
): PersistedLeadDevPlan | null {
  const planPath = leadDevPlanStatePath(projectRoot);
  if (!fs.existsSync(planPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(planPath, 'utf8')) as PersistedLeadDevPlan;
  } catch {
    return null;
  }
}

export function savePersistedLeadDevPlan(
  plan: PersistedLeadDevPlan,
  projectRoot = process.cwd(),
): string {
  const planPath = leadDevPlanStatePath(projectRoot);
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  return planPath;
}

export function allPlanTodos(plan: PersistedLeadDevPlan): LeadDevTodo[] {
  return (plan.phases ?? []).flatMap((p) => p.todos ?? []);
}

export function getOutstandingTodos(plan: PersistedLeadDevPlan): LeadDevTodo[] {
  return allPlanTodos(plan).filter(
    (t) => t.status === 'pending' || t.status === 'in_progress',
  );
}

/** First outstanding todo in phase order */
export function getNextRequiredTodo(
  plan: PersistedLeadDevPlan,
): LeadDevTodo | null {
  for (const phase of plan.phases ?? []) {
    const next = (phase.todos ?? []).find(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    );
    if (next) return next;
  }
  return null;
}

/**
 * Plan valid for spawn when active and either:
 * - outstanding todos remain (ignores 4h mtime), or
 * - all todos complete and persistedAt within TTL
 */
export function hasValidLeadDevPlanForSpawn(
  projectRoot = process.cwd(),
  _sessionId?: string | null,
): boolean {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan?.active) return false;
  if (isLeadDevPlanStale(plan, projectRoot)) return false;

  const outstanding = getOutstandingTodos(plan);
  if (outstanding.length > 0) return true;

  const persistedAt = plan.persistedAt;
  if (!persistedAt) {
    try {
      const stat = fs.statSync(leadDevPlanStatePath(projectRoot));
      return Date.now() - stat.mtimeMs <= DEFAULT_PENDING_TTL_MS;
    } catch {
      return false;
    }
  }
  return Date.now() - new Date(persistedAt).getTime() <= DEFAULT_PENDING_TTL_MS;
}

export function isSynthesisRealignmentPlan(plan: PersistedLeadDevPlan): boolean {
  return (plan.phases ?? []).some((p) => p.id === SYNTHESIS_REALIGNMENT_PHASE_ID);
}

export function getSynthesisConsultTodos(plan: PersistedLeadDevPlan): LeadDevTodo[] {
  const phase = (plan.phases ?? []).find((p) => p.id === SYNTHESIS_REALIGNMENT_PHASE_ID);
  return phase?.todos ?? [];
}

export function areSynthesisConsultTodosComplete(plan: PersistedLeadDevPlan): boolean {
  const todos = getSynthesisConsultTodos(plan);
  return todos.length > 0 && todos.every((t) => t.status === 'completed');
}

function shouldRecordGeneralTodoSlice(
  plan: PersistedLeadDevPlan,
  todoId: string,
): boolean {
  if (!isSynthesisRealignmentPlan(plan)) return true;
  const consultIds = new Set(getSynthesisConsultTodos(plan).map((t) => t.id));
  return !consultIds.has(todoId);
}

function tryCompleteSynthesisCheckpointAfterTodo(
  projectRoot: string,
  sessionId?: string | null,
): void {
  const sid = sessionId ?? getSynthesisCheckpointSessionId(projectRoot);
  if (!sid || !isSynthesisCheckpointDue(projectRoot, sid)) return;

  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan || !isSynthesisRealignmentPlan(plan)) return;
  if (!areSynthesisConsultTodosComplete(plan)) return;

  const completed = completeSynthesisCheckpoint(projectRoot, sid);
  if (completed) {
    void import('./synthesis-completion.js').then(({ runSynthesisCheckpointSideEffects }) =>
      runSynthesisCheckpointSideEffects(projectRoot, sid, plan, completed),
    );
  }
}

export function updatePlanTodoStatus(
  todoId: string,
  status: LeadDevTodo['status'],
  projectRoot = process.cwd(),
): boolean {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan) return false;

  let targetTodo: LeadDevTodo | undefined;
  for (const phase of plan.phases) {
    for (const todo of phase.todos) {
      if (todo.id === todoId) {
        targetTodo = todo;
        break;
      }
    }
    if (targetTodo) break;
  }

  if (status === 'completed' && isSynthesisConsultTodoId(todoId)) {
    const receiptExpected: { sessionId?: string | null; subagent?: string } = {};
    if (plan.sessionId !== undefined) receiptExpected.sessionId = plan.sessionId;
    if (targetTodo?.subagent) receiptExpected.subagent = targetTodo.subagent;
    if (!hasValidSynthesisConsultReceipt(todoId, projectRoot, receiptExpected)) {
      return false;
    }
  }

  let updated = false;
  for (const phase of plan.phases) {
    for (const todo of phase.todos) {
      if (todo.id === todoId) {
        todo.status = status;
        updated = true;
      }
    }
  }
  if (updated) {
    savePersistedLeadDevPlan(plan, projectRoot);
    if (status === 'completed') {
      if (shouldRecordGeneralTodoSlice(plan, todoId)) {
        const sid = plan.sessionId ?? getSynthesisCheckpointSessionId(projectRoot);
        if (sid) {
          recordExecutionSlice('todo_completed', { projectRoot, sessionId: sid });
        }
      }
      tryCompleteSynthesisCheckpointAfterTodo(projectRoot, plan.sessionId);
    }
  }
  return updated;
}

export function bindPlanToSession(
  sessionId: string,
  projectRoot = process.cwd(),
): PersistedLeadDevPlan | null {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan) return null;
  const generation = (plan.planGeneration ?? 0) + 1;
  const next: PersistedLeadDevPlan = {
    ...plan,
    sessionId,
    planGeneration: generation,
    persistedAt: new Date().toISOString(),
  };
  savePersistedLeadDevPlan(next, projectRoot);
  return next;
}

function normalizeAgent(agent: string): string {
  const key = agent.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'bug-triage-specialist': 'bug-triage',
    'code-reviewer': 'code-review',
  };
  return aliases[key] ?? key;
}

function agentsAlign(expected: string, actual: string): boolean {
  const e = normalizeAgent(expected);
  const a = normalizeAgent(actual);
  return e === a || e.includes(a) || a.includes(e);
}

export interface SpawnToolInput {
  prompt?: string;
  description?: string;
  task?: string;
  subagent_type?: string;
  agent?: string;
  delegationId?: string;
  planTodoId?: string;
}

export function validateSpawnMatchesTodo(
  toolInput: SpawnToolInput,
  projectRoot = process.cwd(),
  expectedTodo?: LeadDevTodo | null,
): SpawnTodoValidation {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  const nextTodo = expectedTodo ?? (plan ? getNextRequiredTodo(plan) : null);

  if (!nextTodo) {
    return { valid: true };
  }

  const prompt = String(
    toolInput.prompt || toolInput.description || toolInput.task || '',
  ).toLowerCase();
  const subagent = String(toolInput.subagent_type || toolInput.agent || '');
  const explicitTodo = toolInput.planTodoId || toolInput.delegationId;

  if (explicitTodo && explicitTodo === nextTodo.id) {
    return { valid: true, expectedTodoId: nextTodo.id };
  }

  if (prompt.includes(nextTodo.id.toLowerCase())) {
    return { valid: true, expectedTodoId: nextTodo.id };
  }

  if (prompt.includes(nextTodo.task.toLowerCase().slice(0, 30))) {
    return { valid: true, expectedTodoId: nextTodo.id };
  }

  if (subagent && agentsAlign(nextTodo.subagent, subagent) && prompt.length > 20) {
    return { valid: true, expectedTodoId: nextTodo.id };
  }

  return {
    valid: false,
    reason: `Spawn must target plan todo ${nextTodo.id} before other work`,
    gate: 'spawn-todo-persistence',
    expectedTodoId: nextTodo.id,
    hint: {
      tool: 'Task',
      subagent_type: nextTodo.subagent,
      planTodoId: nextTodo.id,
      description:
        `Lead-dev todo ${nextTodo.id}: ${nextTodo.task}. ` +
        `Include plan todo id in Task prompt.`,
    },
  };
}

export function markTodoInProgressOnSpawn(
  toolInput: SpawnToolInput,
  projectRoot = process.cwd(),
): string | null {
  const plan = loadPersistedLeadDevPlan(projectRoot);
  if (!plan) return null;

  const validation = validateSpawnMatchesTodo(toolInput, projectRoot);
  if (!validation.valid || !validation.expectedTodoId) return null;

  updatePlanTodoStatus(validation.expectedTodoId, 'in_progress', projectRoot);
  return validation.expectedTodoId;
}