/**
 * Multi-host delegation gate SSOT — pending-delegations + spawn todo enforcement.
 * Grok / Hermes / OpenCode adapters call evaluatePreToolGate; Grok-only logic was
 * previously duplicated in grok-hook-utils.js.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getActivePendingDelegations,
  satisfyDelegation,
  type PendingDelegation,
} from './pending-delegations.js';

export { getActivePendingDelegations } from './pending-delegations.js';
import {
  allPlanTodos,
  areSynthesisConsultTodosComplete,
  hasValidLeadDevPlanForSpawn,
  isSynthesisRealignmentPlan,
  loadPersistedLeadDevPlan,
  getNextRequiredTodo,
  validateSpawnMatchesTodo,
  updatePlanTodoStatus,
  type SpawnToolInput,
  type SpawnTodoValidation,
} from './lead-dev-plan-persistence.js';
import {
  getSynthesisDueReason,
  isSynthesisCheckpointDue,
  recordExecutionSlice,
} from './synthesis.js';

export {
  validateSpawnMatchesTodo,
  updatePlanTodoStatus,
  savePersistedLeadDevPlan,
} from './lead-dev-plan-persistence.js';
export const updatePlanTodoStatusInPlace = updatePlanTodoStatus;

export type DelegationGateHost = 'grok' | 'hermes' | 'opencode' | 'openclaw' | 'generic';

export interface DelegationGateFeatures {
  lead_dev_mode: boolean;
  auto_chain_delegations: boolean;
}

export interface ToolGateInput {
  prompt?: string;
  description?: string;
  task?: string;
  subagent_type?: string;
  agent?: string;
  delegationId?: string;
  delegation_id?: string;
  planTodoId?: string;
  command?: string;
  path?: string;
  file_path?: string;
  filePath?: string;
  toolName?: string;
  tool?: string;
  name?: string;
  server?: string;
  mcpServer?: string;
  arguments?: Record<string, unknown>;
  args?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreToolGateContext {
  projectRoot: string;
  sessionId: string | null;
  features: DelegationGateFeatures;
  host?: DelegationGateHost;
}

export interface PreToolGateDeny {
  allow: false;
  reason: string;
  gate: string;
  hint?: Record<string, unknown>;
  pendingCount?: number;
  delegationId?: string;
}

export interface PreToolGateAllow {
  allow: true;
}

export type PreToolGateResult = PreToolGateAllow | PreToolGateDeny;

export interface PostToolSpawnResult {
  satisfied: PendingDelegation[];
  clearedAll: boolean;
  expectedTodoId?: string | null;
}

const READ_TOOLS = new Set([
  'read_file',
  'Read',
  'read',
  'grep',
  'Grep',
  'glob',
  'Glob',
  'list_dir',
  'ListDir',
  'web_search',
  'WebSearch',
  'codebase_search',
  'SemanticSearch',
  'search_files',
]);

const SUBAGENT_TOOLS = new Set(['spawn_subagent', 'task', 'Task', 'delegate_task']);

const ORCHESTRATOR_CONSULT_TOOLS = new Set([
  'analyze-complexity',
  'analyze_complexity',
  'govern-and-apply',
  'govern_and_apply',
  'get-orchestration-status',
  'get_orchestration_status',
  'orchestrate-task',
  'orchestrate_task',
]);

const HERMES_WRITE_TOOLS = new Set(['write_file', 'patch', 'write', 'edit']);

const OPENCODE_WRITE_TOOLS = new Set(['write', 'edit', 'multiedit']);

export function loadDelegationGateFeatures(projectRoot = process.cwd()): DelegationGateFeatures {
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) {
    return { lead_dev_mode: true, auto_chain_delegations: true };
  }
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      multi_agent_orchestration?: {
        enabled?: boolean;
        lead_dev_mode?: boolean;
        auto_chain_delegations?: boolean;
      };
    };
    const orch = data.multi_agent_orchestration ?? {};
    return {
      lead_dev_mode: orch.enabled !== false && orch.lead_dev_mode !== false,
      auto_chain_delegations: orch.auto_chain_delegations !== false,
    };
  } catch {
    return { lead_dev_mode: true, auto_chain_delegations: true };
  }
}

export function normalizeHostToolInput(
  toolInput: ToolGateInput,
): SpawnToolInput & { command?: string } {
  const normalized: SpawnToolInput & { command?: string } = {
    prompt: String(toolInput.prompt ?? toolInput.description ?? toolInput.task ?? ''),
    subagent_type: String(toolInput.subagent_type ?? toolInput.agent ?? ''),
  };
  if (toolInput.description != null) normalized.description = String(toolInput.description);
  if (toolInput.task != null) normalized.task = String(toolInput.task);
  if (toolInput.agent != null) normalized.agent = String(toolInput.agent);
  const delegationId = toolInput.delegationId ?? toolInput.delegation_id;
  if (delegationId != null) normalized.delegationId = String(delegationId);
  if (toolInput.planTodoId != null) normalized.planTodoId = String(toolInput.planTodoId);
  if (toolInput.command != null) normalized.command = String(toolInput.command);
  return normalized;
}

export function isSubagentTool(toolName: string): boolean {
  return SUBAGENT_TOOLS.has(toolName) || /^task$/i.test(toolName) || toolName === 'spawn_subagent';
}

export function isShellTool(toolName: string): boolean {
  return /terminal|bash|shell|run_terminal/i.test(toolName);
}

export function isWriteTool(toolName: string, host: DelegationGateHost = 'generic'): boolean {
  if (host === 'hermes' && HERMES_WRITE_TOOLS.has(toolName)) return true;
  if (host === 'opencode' && OPENCODE_WRITE_TOOLS.has(toolName)) return true;
  return (
    /write|edit|replace|patch|notebook/i.test(toolName) &&
    !isReadOnlyTool(toolName)
  );
}

export function isReadOnlyTool(toolName: string): boolean {
  return READ_TOOLS.has(toolName) || /^(read|grep|glob|list|search_files)/i.test(toolName);
}

function extractMcpToolName(toolInput: ToolGateInput): string {
  const candidates = [
    toolInput.toolName,
    toolInput.tool,
    toolInput.name,
    toolInput.mcpToolName,
  ];
  for (const c of candidates) {
    if (c) return String(c);
  }
  const server = String(toolInput.server ?? toolInput.mcpServer ?? '');
  const args = (toolInput.arguments ?? toolInput.args ?? {}) as Record<string, unknown>;
  if (args.toolName) return String(args.toolName);
  if (server.includes('orchestrator') && args.name) return String(args.name);
  return '';
}

function isOrchestratorConsultMcp(toolName: string, toolInput: ToolGateInput): boolean {
  if (!/mcp|CallMcpTool/i.test(toolName)) return false;
  const inner = extractMcpToolName(toolInput).toLowerCase();
  if (!inner) return false;
  for (const t of ORCHESTRATOR_CONSULT_TOOLS) {
    if (inner.includes(t) || inner.includes(t.replace(/-/g, '_'))) return true;
  }
  return false;
}

function isFocusedTestCommand(cmd: string): boolean {
  const cmdText = (cmd || '').toLowerCase();
  return (
    /\b(npm\s+(run\s+)?test|vitest\s+run|pnpm\s+test|yarn\s+test)\b/.test(cmdText) &&
    (/--\s+\S+\.test/.test(cmdText) || /vitest\s+run\s+\S+\.test/.test(cmdText))
  );
}

function denyFromSpawnValidation(validation: SpawnTodoValidation): PreToolGateDeny {
  const deny: PreToolGateDeny = {
    allow: false,
    reason: validation.reason ?? 'Spawn blocked by lead-dev plan',
    gate: validation.gate ?? 'spawn-todo-persistence',
  };
  if (validation.hint) deny.hint = validation.hint;
  return deny;
}

function denyFromPending(
  primary: PendingDelegation,
  pendingCount: number,
): PreToolGateDeny {
  return {
    allow: false,
    reason: 'Pending implementation delegation — spawn host Task before other work',
    gate: 'auto-chain-pending',
    hint: { ...(primary.spawnHint ?? {
      tool: 'Task',
      subagent_type: primary.agent,
      description: primary.taskDescription,
      planTodoId: primary.planTodoId,
      delegationId: primary.id,
    }) },
    pendingCount,
    delegationId: primary.id,
  };
}

/** Spawn plan missing — applies before auto_chain opt-out for subagent tools. */
export function evaluateSpawnPlanGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  if (!ctx.features.lead_dev_mode || !isSubagentTool(toolName)) {
    return { allow: true };
  }

  if (!hasValidLeadDevPlanForSpawn(ctx.projectRoot, ctx.sessionId)) {
    return {
      allow: false,
      reason:
        'Codex 59/67: call xray-orchestrator analyze-complexity first — ' +
        'writes .xray/state/lead-dev-plan.json required before spawn_subagent',
      gate: 'spawn-plan-missing',
    };
  }

  if (ctx.features.auto_chain_delegations === false) {
    return { allow: true };
  }

  const pending = getActivePendingDelegations(ctx.sessionId, ctx.projectRoot);
  const plan = loadPersistedLeadDevPlan(ctx.projectRoot);
  const expectedTodo =
    pending[0]?.planTodoId && plan
      ? allPlanTodos(plan).find((t) => t.id === pending[0]!.planTodoId) ?? null
      : null;

  const validation = validateSpawnMatchesTodo(
    normalizeHostToolInput(toolInput),
    ctx.projectRoot,
    expectedTodo,
  );
  if (!validation.valid) {
    return denyFromSpawnValidation(validation);
  }

  return { allow: true };
}

/** Block writes / spawns / shell while synthesis checkpoint is due. */
export function evaluateSynthesisGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  if (!ctx.sessionId || !isSynthesisCheckpointDue(ctx.projectRoot, ctx.sessionId)) {
    return { allow: true };
  }

  if (isReadOnlyTool(toolName)) return { allow: true };
  if (isOrchestratorConsultMcp(toolName, toolInput)) return { allow: true };

  const plan = loadPersistedLeadDevPlan(ctx.projectRoot);
  if (
    plan &&
    isSynthesisRealignmentPlan(plan) &&
    !areSynthesisConsultTodosComplete(plan) &&
    isSubagentTool(toolName)
  ) {
    const nextTodo = getNextRequiredTodo(plan);
    const validation = validateSpawnMatchesTodo(
      normalizeHostToolInput(toolInput),
      ctx.projectRoot,
      nextTodo,
    );
    if (validation.valid) return { allow: true };
  }

  const dueReason = getSynthesisDueReason(ctx.projectRoot, ctx.sessionId);
  const realignmentPending =
    plan && isSynthesisRealignmentPlan(plan) && !areSynthesisConsultTodosComplete(plan);

  return {
    allow: false,
    reason: realignmentPending
      ? 'Synthesis realignment in progress — complete mandatory consult todos (s.1–s.3) before other work'
      : 'Synthesis checkpoint due — call xray-orchestrator analyze-complexity to reflect and realign before continuing',
    gate: 'synthesis-checkpoint',
    hint: {
      tool: realignmentPending ? 'Task' : 'analyze-complexity',
      dueReason,
      primitive: 'synthesis',
      sessionId: ctx.sessionId,
      ...(realignmentPending && plan
        ? { nextTodoId: getNextRequiredTodo(plan)?.id }
        : {}),
    },
  };
}

/** Block writes / unrelated work while pending delegations exist. */
export function evaluatePendingDelegationGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  if (!ctx.features.lead_dev_mode || ctx.features.auto_chain_delegations === false) {
    return { allow: true };
  }
  if (!ctx.sessionId) return { allow: true };

  const pending = getActivePendingDelegations(ctx.sessionId, ctx.projectRoot);
  if (pending.length === 0) return { allow: true };

  if (isSubagentTool(toolName)) return { allow: true };
  if (isReadOnlyTool(toolName)) return { allow: true };
  if (isOrchestratorConsultMcp(toolName, toolInput)) return { allow: true };

  if (isShellTool(toolName)) {
    const cmd = String(toolInput.command ?? '');
    if (isFocusedTestCommand(cmd)) return { allow: true };
  }

  return denyFromPending(pending[0]!, pending.length);
}

/**
 * Full pre-tool evaluation — synthesis gate first, slice recording, then
 * pending gate, then spawn todo gate for subagent tools.
 */
export function evaluatePreToolGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  const synthesisBlock = evaluateSynthesisGate(toolName, toolInput, ctx);
  if (!synthesisBlock.allow) return synthesisBlock;

  if (!isSynthesisCheckpointDue(ctx.projectRoot, ctx.sessionId)) {
    recordExecutionSlice('gate', {
      projectRoot: ctx.projectRoot,
      sessionId: ctx.sessionId,
    });
  }

  const pendingBlock = evaluatePendingDelegationGate(toolName, toolInput, ctx);
  if (!pendingBlock.allow) return pendingBlock;

  const spawnBlock = evaluateSpawnPlanGate(toolName, toolInput, ctx);
  if (!spawnBlock.allow) return spawnBlock;

  return { allow: true };
}

export function evaluatePostToolSpawn(
  toolName: string,
  toolInput: ToolGateInput,
  projectRoot: string,
): PostToolSpawnResult {
  const normalized = normalizeHostToolInput(toolInput);
  const spawnCheck = validateSpawnMatchesTodo(normalized, projectRoot);
  const satisfyInput: Parameters<typeof satisfyDelegation>[0] = {
    toolPrompt: normalized.prompt ?? '',
  };
  if (normalized.delegationId) satisfyInput.delegationId = normalized.delegationId;
  const agent = normalized.subagent_type || normalized.agent;
  if (agent) satisfyInput.agent = agent;
  if (normalized.planTodoId) satisfyInput.planTodoId = normalized.planTodoId;
  const result = satisfyDelegation(satisfyInput, projectRoot);
  if (spawnCheck.valid && spawnCheck.expectedTodoId) {
    updatePlanTodoStatus(spawnCheck.expectedTodoId, 'completed', projectRoot);
  }
  return {
    ...result,
    expectedTodoId: spawnCheck.expectedTodoId ?? null,
  };
}

export function isOrchestrateToolEvent(toolName: string, toolInput: ToolGateInput = {}): boolean {
  const inner = extractMcpToolName(toolInput).toLowerCase();
  if (/orchestrate[-_]?task/.test(inner)) return true;
  const blob = JSON.stringify(toolInput).toLowerCase();
  return /orchestrate[-_]?task/.test(blob);
}

/** Back-compat shims for Grok hook-utils and tests. */
export function checkPendingDelegationGate(
  toolName: string,
  toolInput: ToolGateInput,
  features: DelegationGateFeatures,
  projectRoot: string,
  sessionId: string | null,
): PreToolGateDeny | null {
  const result = evaluatePendingDelegationGate(toolName, toolInput, {
    projectRoot,
    sessionId,
    features,
  });
  return result.allow ? null : result;
}

export function checkSubagentGate(
  toolName: string,
  features: DelegationGateFeatures,
  projectRoot: string,
  sessionId: string | null,
  toolInput: ToolGateInput = {},
): PreToolGateDeny | null {
  const result = evaluateSpawnPlanGate(toolName, toolInput, {
    projectRoot,
    sessionId,
    features,
  });
  return result.allow ? null : result;
}

export function satisfyDelegationsFromToolInput(
  toolInput: ToolGateInput,
  projectRoot: string,
): { satisfied: PendingDelegation[]; clearedAll: boolean } {
  const normalized = normalizeHostToolInput(toolInput);
  const satisfyInput: Parameters<typeof satisfyDelegation>[0] = {
    toolPrompt: normalized.prompt ?? '',
  };
  if (normalized.delegationId) satisfyInput.delegationId = normalized.delegationId;
  const agent = normalized.subagent_type || normalized.agent;
  if (agent) satisfyInput.agent = agent;
  if (normalized.planTodoId) satisfyInput.planTodoId = normalized.planTodoId;
  return satisfyDelegation(satisfyInput, projectRoot);
}