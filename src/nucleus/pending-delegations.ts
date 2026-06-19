/**
 * Pending delegations SSOT — written by task-handler on delegate-deferred.
 * Grok hooks read the same file; PostToolUse never re-parses MCP output.
 */

import * as fs from 'fs';
import * as path from 'path';
import { featuresConfigLoader } from '../core/features-config.js';
import type { LeadDevPlan, LeadDevTodo, SubagentRoute } from './autonomy-kernel.js';

export const DEFAULT_PENDING_TTL_MS = 4 * 60 * 60 * 1000;

export type DelegationMatchMethod = 'taskId' | 'description' | 'agent-only' | 'none';

export interface SpawnHint {
  tool: 'Task';
  subagent_type: string;
  description: string;
  planTodoId: string | null;
  delegationId: string;
}

export interface PendingDelegation {
  id: string;
  taskId: string;
  agent: string;
  taskDescription: string;
  taskType: string;
  sessionId: string;
  planTodoId: string | null;
  planTodoTask: string | null;
  matchMethod: DelegationMatchMethod;
  matchConfidence: number;
  status: 'pending' | 'satisfied';
  createdAt: string;
  satisfiedAt: string | null;
  spawnHint: SpawnHint;
}

export interface PendingDelegationsState {
  sessionId: string;
  createdAt: string;
  ttlMs: number;
  delegations: PendingDelegation[];
}

export interface DeferredTaskRecord {
  taskId: string;
  agent: string;
  description: string;
  type?: string;
}

const AGENT_ALIASES: Record<string, string> = {
  'bug-triage-specialist': 'bug-triage',
  'code-reviewer': 'code-review',
  'security-auditor': 'security-audit',
};

const TASK_TYPE_BY_AGENT: Record<string, string> = {
  'backend-engineer': 'backend-engineer',
  'frontend-engineer': 'frontend-engineer',
  'bug-triage': 'bug-triage',
  'bug-triage-specialist': 'bug-triage',
  strategist: 'strategist',
  researcher: 'generalPurpose',
  'architect-tools': 'generalPurpose',
  'code-review': 'code-review',
  'code-reviewer': 'code-review',
};

export function pendingDelegationsPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'pending-delegations.json');
}

export function leadDevPlanPath(projectRoot = process.cwd()): string {
  return path.join(projectRoot, '.xray', 'state', 'lead-dev-plan.json');
}

export function isAutoChainDelegationsEnabled(projectRoot = process.cwd()): boolean {
  try {
    const localPath = path.join(projectRoot, '.xray', 'features.json');
    if (fs.existsSync(localPath)) {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8')) as {
        multi_agent_orchestration?: {
          enabled?: boolean;
          lead_dev_mode?: boolean;
          auto_chain_delegations?: boolean;
        };
      };
      const cfg = data.multi_agent_orchestration ?? {};
      if (cfg.enabled === false || cfg.lead_dev_mode === false) return false;
      return cfg.auto_chain_delegations !== false;
    }
    const cfg = featuresConfigLoader.loadConfig().multi_agent_orchestration;
    if (!cfg.enabled || cfg.lead_dev_mode === false) return false;
    return cfg.auto_chain_delegations !== false;
  } catch {
    return false;
  }
}

function normalizeAgent(agent: string): string {
  const key = agent.toLowerCase().trim();
  return AGENT_ALIASES[key] ?? key;
}

function loadLeadDevPlan(projectRoot: string): LeadDevPlan | null {
  const planPath = leadDevPlanPath(projectRoot);
  if (!fs.existsSync(planPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(planPath, 'utf8')) as LeadDevPlan;
  } catch {
    return null;
  }
}

function allPlanTodos(plan: LeadDevPlan): LeadDevTodo[] {
  return plan.phases.flatMap((p) => p.todos);
}

export function matchPlanTodo(
  agent: string,
  taskDescription: string,
  taskId: string,
  plan: LeadDevPlan | null,
): { todo: LeadDevTodo | null; method: DelegationMatchMethod; confidence: number } {
  if (!plan) {
    return { todo: null, method: 'none', confidence: 0 };
  }

  const normalizedAgent = normalizeAgent(agent);
  const pendingTodos = allPlanTodos(plan).filter((t) => t.status === 'pending');

  const byTaskId = pendingTodos.find(
    (t) => t.id === taskId || t.task.includes(taskId),
  );
  if (byTaskId) {
    return { todo: byTaskId, method: 'taskId', confidence: 0.95 };
  }

  const desc = taskDescription.toLowerCase().trim();
  if (desc) {
    const byDesc = pendingTodos.find((t) => {
      const todoText = t.task.toLowerCase();
      return todoText.includes(desc) || desc.includes(todoText.slice(0, 40));
    });
    if (byDesc) {
      return { todo: byDesc, method: 'description', confidence: 0.75 };
    }
  }

  const byAgent = pendingTodos.find(
    (t) => normalizeAgent(t.subagent) === normalizedAgent,
  );
  if (byAgent) {
    return { todo: byAgent, method: 'agent-only', confidence: 0.5 };
  }

  return { todo: null, method: 'none', confidence: 0 };
}

export function mapSubagentToTaskType(agent: string): string {
  const key = agent.toLowerCase().trim();
  return TASK_TYPE_BY_AGENT[key] ?? TASK_TYPE_BY_AGENT[normalizeAgent(key)] ?? 'generalPurpose';
}

export function buildSpawnHint(
  delegation: Pick<
    PendingDelegation,
    'id' | 'agent' | 'taskDescription' | 'planTodoId' | 'planTodoTask'
  >,
): SpawnHint {
  const todoLine = delegation.planTodoTask
    ? `[plan todo ${delegation.planTodoId}] ${delegation.planTodoTask}`
    : delegation.taskDescription;
  return {
    tool: 'Task',
    subagent_type: mapSubagentToTaskType(delegation.agent),
    description:
      `Lead-dev implementation delegation. ${todoLine}. ` +
      `Complete this todo per .xray/state/lead-dev-plan.json; run per-suite tests; report results.`,
    planTodoId: delegation.planTodoId,
    delegationId: delegation.id,
  };
}

export function loadPendingDelegationsState(
  projectRoot = process.cwd(),
): PendingDelegationsState | null {
  const filePath = pendingDelegationsPath(projectRoot);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PendingDelegationsState;
  } catch {
    return null;
  }
}

export function savePendingDelegationsState(
  state: PendingDelegationsState,
  projectRoot = process.cwd(),
): string {
  const filePath = pendingDelegationsPath(projectRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  return filePath;
}

function newDelegationId(): string {
  return `del-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordDeferredDelegations(
  sessionId: string,
  deferrals: DeferredTaskRecord[],
  projectRoot = process.cwd(),
): PendingDelegation[] {
  if (!isAutoChainDelegationsEnabled(projectRoot) || deferrals.length === 0) {
    return [];
  }

  const plan = loadLeadDevPlan(projectRoot);
  const existing = loadPendingDelegationsState(projectRoot);
  const now = new Date().toISOString();

  const base: PendingDelegationsState =
    existing && existing.sessionId === sessionId
      ? existing
      : {
          sessionId,
          createdAt: now,
          ttlMs: DEFAULT_PENDING_TTL_MS,
          delegations: [],
        };

  const created: PendingDelegation[] = [];

  for (const d of deferrals) {
    const { todo, method, confidence } = matchPlanTodo(
      d.agent,
      d.description,
      d.taskId,
      plan,
    );
    const partial = {
      id: newDelegationId(),
      taskId: d.taskId,
      agent: d.agent,
      taskDescription: d.description,
      taskType: d.type ?? 'implement',
      sessionId,
      planTodoId: todo?.id ?? null,
      planTodoTask: todo?.task ?? null,
      matchMethod: method,
      matchConfidence: confidence,
      status: 'pending' as const,
      createdAt: now,
      satisfiedAt: null as string | null,
    };
    created.push({
      ...partial,
      spawnHint: buildSpawnHint(partial),
    });
  }

  base.delegations = [
    ...base.delegations.filter((d) => d.status === 'pending'),
    ...created,
  ];
  if (base.sessionId !== sessionId) {
    base.sessionId = sessionId;
    base.createdAt = now;
    base.delegations = created;
  }

  savePendingDelegationsState(base, projectRoot);
  return created;
}

export function isPendingStateActive(
  state: PendingDelegationsState | null,
  sessionId: string | null | undefined,
): boolean {
  if (!state) return false;
  if (!sessionId || state.sessionId !== sessionId) return false;
  const age = Date.now() - new Date(state.createdAt).getTime();
  if (age > state.ttlMs) return false;
  return state.delegations.some((d) => d.status === 'pending');
}

export function getActivePendingDelegations(
  sessionId: string | null | undefined,
  projectRoot = process.cwd(),
): PendingDelegation[] {
  const state = loadPendingDelegationsState(projectRoot);
  if (!isPendingStateActive(state, sessionId)) return [];
  return state!.delegations.filter((d) => d.status === 'pending');
}

export interface SatisfyDelegationInput {
  delegationId?: string;
  taskId?: string;
  planTodoId?: string;
  agent?: string;
  toolPrompt?: string;
}

export function satisfyDelegation(
  input: SatisfyDelegationInput,
  projectRoot = process.cwd(),
): { satisfied: PendingDelegation[]; clearedAll: boolean } {
  const state = loadPendingDelegationsState(projectRoot);
  if (!state) return { satisfied: [], clearedAll: false };

  const pending = state.delegations.filter((d) => d.status === 'pending');
  if (pending.length === 0) return { satisfied: [], clearedAll: false };

  const prompt = (input.toolPrompt ?? '').toLowerCase();
  let matches: PendingDelegation[] = [];

  if (input.delegationId) {
    matches = pending.filter((d) => d.id === input.delegationId);
  } else if (input.planTodoId) {
    matches = pending.filter(
      (d) => d.planTodoId === input.planTodoId || prompt.includes(input.planTodoId!.toLowerCase()),
    );
  } else if (input.taskId) {
    matches = pending.filter(
      (d) => d.taskId === input.taskId || prompt.includes(input.taskId!.toLowerCase()),
    );
  } else if (input.agent) {
    const norm = normalizeAgent(input.agent);
    matches = pending.filter((d) => normalizeAgent(d.agent) === norm);
  }

  if (matches.length === 0 && prompt) {
    for (const d of pending) {
      if (d.planTodoId && prompt.includes(d.planTodoId.toLowerCase())) {
        matches.push(d);
        break;
      }
      if (prompt.includes(d.taskId.toLowerCase())) {
        matches.push(d);
        break;
      }
    }
  }

  if (matches.length === 0 && pending.length === 1) {
    const only = pending[0]!;
    const hint = only.spawnHint.description.toLowerCase();
    if (prompt && hint && prompt.includes(hint.slice(0, 40))) {
      matches = [only];
    }
  }

  if (matches.length === 0) {
    return { satisfied: [], clearedAll: false };
  }

  const now = new Date().toISOString();
  const matchIds = new Set(matches.map((m) => m.id));
  for (const d of state.delegations) {
    if (matchIds.has(d.id) && d.status === 'pending') {
      d.status = 'satisfied';
      d.satisfiedAt = now;
    }
  }

  savePendingDelegationsState(state, projectRoot);
  const stillPending = state.delegations.some((d) => d.status === 'pending');
  return { satisfied: matches, clearedAll: !stillPending };
}

export function clearPendingDelegationsForSessionChange(
  newSessionId: string | null | undefined,
  projectRoot = process.cwd(),
): boolean {
  const state = loadPendingDelegationsState(projectRoot);
  if (!state) return false;
  if (newSessionId && state.sessionId === newSessionId) return false;
  fs.unlinkSync(pendingDelegationsPath(projectRoot));
  return true;
}

export function delegationSummaryForResponse(
  delegations: PendingDelegation[],
): Array<Record<string, unknown>> {
  return delegations.map((d) => ({
    id: d.id,
    taskId: d.taskId,
    agent: d.agent,
    planTodoId: d.planTodoId,
    matchMethod: d.matchMethod,
    matchConfidence: d.matchConfidence,
    spawnHint: d.spawnHint,
  }));
}