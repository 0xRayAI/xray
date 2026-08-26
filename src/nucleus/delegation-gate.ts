/**
 * Multi-host delegation gate SSOT — pending-delegations + spawn todo enforcement.
 * Grok / Hermes / OpenCode adapters call evaluatePreToolGate via delegation-gate-runtime.
 * Constitution (11/29/69 + destructive shell) lives here. Grok may still extra-block Codex 2/7.
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
  findRecentStalePlanArchive,
  getSynthesisConsultTodos,
  hasValidLeadDevPlanForSpawn,
  isLeadDevPlanStale,
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
import {
  isSynthesisConsultTodoId,
  tryRecordSynthesisConsultReceipt,
} from './synthesis-consult-receipt.js';
import { resolveSpawnPlan, hasValidSpawnPlanContext } from './spawn-plan-resolution.js';
import {
  isUserAsidesEnabled,
  isUserAsideTodoId,
  loadActiveAsidePointer,
  loadActiveUserAside,
} from './user-aside.js';
import {
  validateAsideWorktreeCwd,
  type AsideWorktreeCwdResult,
} from './aside-worktree.js';
import {
  ceremonyForProfile,
  resolveSuitProfile,
  spawnPlanModeForProfile,
  writeSuitSessionBoot,
  type CeremonyLevel,
  type SpawnPlanMode,
  type SuitHost,
  type SuitProfile,
  type SuitTemperamentConfig,
} from './suit-temperament.js';

export { writeSuitSessionBoot };

export { extractSpawnCwd, validateAsideWorktreeCwd, provisionGitWorktree } from './aside-worktree.js';

function denyAsideWorktreeCwd(cwdCheck: AsideWorktreeCwdResult): PreToolGateResult {
  const base = {
    allow: false as const,
    reason: cwdCheck.reason ?? 'Aside spawn cwd must match worktree',
    gate: cwdCheck.gate ?? 'aside-worktree-cwd-missing',
  };
  return cwdCheck.hint ? { ...base, hint: cwdCheck.hint } : base;
}

function asideWorktreeCwdDenyIfNeeded(
  activeAside: { worktree?: string } | null | undefined,
  toolInput: ToolGateInput,
  projectRoot: string,
): PreToolGateResult | undefined {
  if (!activeAside?.worktree) return undefined;
  const cwdCheck = validateAsideWorktreeCwd(activeAside.worktree, toolInput, projectRoot);
  if (!cwdCheck.valid) return denyAsideWorktreeCwd(cwdCheck);
  return undefined;
}


export {
  validateSpawnMatchesTodo,
  updatePlanTodoStatus,
  savePersistedLeadDevPlan,
  archiveStaleLeadDevPlan,
  findRecentStalePlanArchive,
} from './lead-dev-plan-persistence.js';
export {
  buildReceiptFromConsultOutput,
  hasValidSynthesisConsultReceipt,
  isSynthesisConsultTodoId,
  loadSynthesisConsultReceipt,
  parseConsultVerdictFromText,
  tryRecordSynthesisConsultReceipt,
  writeSynthesisConsultReceipt,
  type SynthesisConsultReceipt,
  type SynthesisConsultVerdict,
} from './synthesis-consult-receipt.js';
export const updatePlanTodoStatusInPlace = updatePlanTodoStatus;

export type DelegationGateHost = SuitHost;

export interface DelegationGateFeatures {
  lead_dev_mode: boolean;
  auto_chain_delegations: boolean;
  /** v3 — deny (guided/strict), warn (frontier), off */
  spawn_plan_mode?: SpawnPlanMode;
  ceremony?: CeremonyLevel;
  suit_profile?: SuitProfile;
  no_new_surface?: boolean;
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
  reason?: string;
  gate?: string;
  hint?: Record<string, unknown>;
}

export type PreToolGateResult = PreToolGateAllow | PreToolGateDeny;

export interface PostToolSpawnResult {
  satisfied: PendingDelegation[];
  clearedAll: boolean;
  expectedTodoId?: string | null;
  receiptRecorded?: boolean;
  todoCompleted?: boolean;
}

export interface PostToolSpawnOptions {
  toolOutput?: unknown;
  sessionId?: string | null;
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

/** Allowed orchestrator MCP tools while synthesis checkpoint is due (govern-and-apply excluded). */
const SYNTHESIS_ALLOWED_CONSULT_TOOLS = new Set([
  'analyze-complexity',
  'analyze_complexity',
  'get-orchestration-status',
  'get_orchestration_status',
]);

const HERMES_WRITE_TOOLS = new Set(['write_file', 'patch', 'write', 'edit']);

const OPENCODE_WRITE_TOOLS = new Set(['write', 'edit', 'multiedit']);

export function loadDelegationGateFeatures(
  projectRoot = process.cwd(),
  host: DelegationGateHost = 'generic',
): DelegationGateFeatures {
  const fallback = (profile: SuitProfile): DelegationGateFeatures => ({
    lead_dev_mode: true,
    auto_chain_delegations: true,
    spawn_plan_mode: spawnPlanModeForProfile(profile),
    ceremony: ceremonyForProfile(profile),
    suit_profile: profile,
    no_new_surface: true,
  });
  const featuresPath = path.join(projectRoot, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) {
    return fallback(resolveSuitProfile(undefined, host));
  }
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as {
      suit_temperament?: SuitTemperamentConfig;
      multi_agent_orchestration?: {
        enabled?: boolean;
        lead_dev_mode?: boolean;
        auto_chain_delegations?: boolean;
        no_new_surface?: boolean;
      };
    };
    const orch = data.multi_agent_orchestration ?? {};
    const profile = resolveSuitProfile(data.suit_temperament, host);
    return {
      lead_dev_mode: orch.enabled !== false && orch.lead_dev_mode !== false,
      auto_chain_delegations: orch.auto_chain_delegations !== false,
      spawn_plan_mode: spawnPlanModeForProfile(profile),
      ceremony: ceremonyForProfile(profile),
      suit_profile: profile,
      no_new_surface: profile === 'strict' ? true : orch.no_new_surface !== false,
    };
  } catch {
    return fallback(resolveSuitProfile(undefined, host));
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

function isSynthesisAllowedOrchestratorConsult(
  toolName: string,
  toolInput: ToolGateInput,
): boolean {
  if (!/mcp|CallMcpTool/i.test(toolName)) return false;
  const inner = extractMcpToolName(toolInput).toLowerCase();
  if (!inner) return false;
  for (const t of SYNTHESIS_ALLOWED_CONSULT_TOOLS) {
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

function spawnPlanSoftAllow(gate: string, reason: string): PreToolGateAllow {
  return { allow: true, reason, gate };
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
  const spawnMode = ctx.features.spawn_plan_mode ?? 'deny';
  if (spawnMode === 'off') {
    return { allow: true };
  }

  const activeAside =
    isUserAsidesEnabled(ctx.projectRoot)
      ? loadActiveUserAside(ctx.projectRoot, ctx.sessionId)
      : null;
  const plan = loadPersistedLeadDevPlan(ctx.projectRoot);
  if (!activeAside && plan && isLeadDevPlanStale(plan, ctx.projectRoot)) {
    const stale = {
      reason:
        'Lead-dev plan is stale (unstarted todos exceeded TTL) — ' +
        're-run xray-orchestrator analyze-complexity to refresh the plan',
      gate: 'spawn-plan-stale',
      hint: { tool: 'analyze-complexity', mcp: 'xray-orchestrator' },
    };
    if (spawnMode === 'warn') return spawnPlanSoftAllow(stale.gate, stale.reason);
    return { allow: false, ...stale };
  }

  if (!hasValidSpawnPlanContext(ctx.projectRoot, ctx.sessionId)) {
    if (findRecentStalePlanArchive(ctx.projectRoot)) {
      const archived = {
        reason:
          'Lead-dev plan was stale and archived — ' +
          're-run xray-orchestrator analyze-complexity to refresh the plan',
        gate: 'spawn-plan-stale',
        hint: { tool: 'analyze-complexity', mcp: 'xray-orchestrator' },
      };
      if (spawnMode === 'warn') return spawnPlanSoftAllow(archived.gate, archived.reason);
      return { allow: false, ...archived };
    }
    const missing = {
      reason:
        'Codex 59/67: call xray-orchestrator analyze-complexity first — ' +
        'writes .xray/state/lead-dev-plan.json required before spawn_subagent',
      gate: 'spawn-plan-missing',
    };
    if (spawnMode === 'warn') return spawnPlanSoftAllow(missing.gate, missing.reason);
    return { allow: false, ...missing };
  }

  if (ctx.features.auto_chain_delegations === false) {
    const cwdDeny = asideWorktreeCwdDenyIfNeeded(activeAside, toolInput, ctx.projectRoot);
    if (cwdDeny) return cwdDeny;
    return { allow: true };
  }

  const normalized = normalizeHostToolInput(toolInput);
  const resolved = isUserAsidesEnabled(ctx.projectRoot)
    ? resolveSpawnPlan(normalized, ctx.projectRoot, ctx.sessionId)
    : { source: 'main' as const, plan: loadPersistedLeadDevPlan(ctx.projectRoot) };

  const pending = getActivePendingDelegations(ctx.sessionId, ctx.projectRoot);
  const expectedTodo =
    pending[0]?.planTodoId && resolved.plan
      ? allPlanTodos(resolved.plan).find((t) => t.id === pending[0]!.planTodoId) ?? null
      : null;

  const cwdDeny = asideWorktreeCwdDenyIfNeeded(activeAside, toolInput, ctx.projectRoot);
  if (cwdDeny) return cwdDeny;

  const validation = validateSpawnMatchesTodo(
    normalized,
    ctx.projectRoot,
    expectedTodo,
    ctx.sessionId,
  );
  if (!validation.valid) {
    if (spawnMode === 'warn') {
      return spawnPlanSoftAllow(
        validation.gate ?? 'spawn-todo-persistence',
        validation.reason ?? 'Spawn did not match lead-dev plan todo (frontier: warn, not deny)',
      );
    }
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
  if (isSynthesisAllowedOrchestratorConsult(toolName, toolInput)) return { allow: true };

  // Active user aside: allow aside-track subagent spawns during main synthesis checkpoint.
  if (isUserAsidesEnabled(ctx.projectRoot)) {
    const normalized = normalizeHostToolInput(toolInput);
    const resolved = resolveSpawnPlan(normalized, ctx.projectRoot, ctx.sessionId);
    if (
      resolved.source === 'aside' &&
      isSubagentTool(toolName) &&
      (normalized.planTodoId
        ? isUserAsideTodoId(normalized.planTodoId)
        : Boolean(resolved.asideId))
    ) {
      const validation = validateSpawnMatchesTodo(
        normalized,
        ctx.projectRoot,
        undefined,
        ctx.sessionId,
      );
      if (validation.valid) {
        const activeAside = loadActiveUserAside(ctx.projectRoot, ctx.sessionId);
        const cwdDeny = asideWorktreeCwdDenyIfNeeded(activeAside, toolInput, ctx.projectRoot);
        if (cwdDeny) return cwdDeny;
        return { allow: true };
      }
    }
  }

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
      ctx.sessionId,
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

  // Aside-track work: pending main delegations do not block aside spawns.
  if (isUserAsidesEnabled(ctx.projectRoot) && isSubagentTool(toolName)) {
    const normalized = normalizeHostToolInput(toolInput);
    const resolved = resolveSpawnPlan(normalized, ctx.projectRoot, ctx.sessionId);
    if (resolved.source === 'aside') return { allow: true };
  }

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
const CONSTITUTION_ANY = /:\s*any\b|as\s+any\b/;
const CONSTITUTION_TS_IGNORE = /@ts-ignore|@ts-expect-error/;
const CONSTITUTION_EVAL = /\beval\s*\(/;
const CONSTITUTION_DESTRUCTIVE =
  /\brm\s+-rf\s+\/(?:\s|$)|\bmkfs\b|\bdd\s+if=|:()\s*\{\s*:\|&\s*\}\s*;:/i;
const SURFACE_DENY = [
  /(?:^|\/)src\/mcps\/[^/]+\.server\.(ts|js)$/i,
  /(?:^|\/)src\/skills\/[^/]+\/SKILL\.md$/i,
  /(?:^|\/)src\/mcps\/orchestrator\/handlers\/[^/]+-handler\.(ts|js)$/i,
  /(?:^|\/)src\/nucleus\/autonomy-kernel\.(ts|js)$/i,
  /(?:^|\/)src\/mcps\/[^/]+\/handlers\/autonomy-handler\.(ts|js)$/i,
];

function collectWriteContent(toolInput: ToolGateInput): string {
  return [
    toolInput.new_string,
    toolInput.contents,
    toolInput.content,
    toolInput.command,
    toolInput.prompt,
  ]
    .filter((v) => v != null)
    .map(String)
    .join('\n');
}

function collectWritePaths(toolInput: ToolGateInput): string[] {
  const paths: string[] = [];
  for (const key of ['path', 'file_path', 'filePath', 'target_notebook'] as const) {
    const v = toolInput[key];
    if (typeof v === 'string' && v) paths.push(v);
  }
  const extra = toolInput.paths;
  if (Array.isArray(extra)) {
    for (const p of extra) {
      if (typeof p === 'string' && p) paths.push(p);
    }
  }
  return paths;
}

/** Codex 11 / 29 / 69 + destructive shell — always on, all hosts that call this SSOT. */
export function evaluateConstitutionGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  const content = collectWriteContent(toolInput);
  const paths = collectWritePaths(toolInput);
  const writing = isWriteTool(toolName, ctx.host ?? 'generic');

  if (writing && ctx.features.no_new_surface !== false) {
    for (const p of paths) {
      const normalized = p.replace(/\\/g, '/');
      const abs = path.isAbsolute(p) ? p : path.join(ctx.projectRoot, p);
      if (fs.existsSync(abs)) continue;
      if (SURFACE_DENY.some((re) => re.test(normalized))) {
        return {
          allow: false,
          reason: 'Codex 69: new MCP/skill/handler surface — rewire existing',
          gate: 'no-new-surface',
        };
      }
    }
  }

  if (writing && content) {
    if (CONSTITUTION_ANY.test(content) || CONSTITUTION_TS_IGNORE.test(content)) {
      return {
        allow: false,
        reason: 'Codex 11 Type Safety: no `any` / @ts-ignore / @ts-expect-error',
        gate: 'codex-11',
      };
    }
    if (CONSTITUTION_EVAL.test(content)) {
      return {
        allow: false,
        reason: 'Codex 29 Security: eval() prohibited',
        gate: 'codex-29',
      };
    }
  }

  if (isShellTool(toolName) && CONSTITUTION_DESTRUCTIVE.test(String(toolInput.command ?? ''))) {
    return {
      allow: false,
      reason: 'Blocked destructive shell command',
      gate: 'destructive-shell',
    };
  }

  return { allow: true };
}

export function evaluatePreToolGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  const constitution = evaluateConstitutionGate(toolName, toolInput, ctx);
  if (!constitution.allow) return constitution;

  const lite = ctx.features.ceremony === 'lite';
  const synthesisBlock = lite
    ? ({ allow: true } as PreToolGateAllow)
    : evaluateSynthesisGate(toolName, toolInput, ctx);
  if (!synthesisBlock.allow) return synthesisBlock;

  if (!isSynthesisCheckpointDue(ctx.projectRoot, ctx.sessionId)) {
    recordExecutionSlice('gate', {
      projectRoot: ctx.projectRoot,
      sessionId: ctx.sessionId,
    });
  }

  const pendingBlock = lite
    ? ({ allow: true } as PreToolGateAllow)
    : evaluatePendingDelegationGate(toolName, toolInput, ctx);
  if (!pendingBlock.allow) return pendingBlock;

  const spawnBlock = evaluateSpawnPlanGate(toolName, toolInput, ctx);
  if (!spawnBlock.allow) return spawnBlock;

  return spawnBlock;
}

export function evaluatePostToolSpawn(
  toolName: string,
  toolInput: ToolGateInput,
  projectRoot: string,
  options: PostToolSpawnOptions = {},
): PostToolSpawnResult {
  const normalized = normalizeHostToolInput(toolInput);
  const pointer = loadActiveAsidePointer(projectRoot);
  const mainPlan = loadPersistedLeadDevPlan(projectRoot);
  const sessionId =
    options.sessionId ?? mainPlan?.sessionId ?? pointer?.sessionId ?? null;
  const spawnCheck = validateSpawnMatchesTodo(
    normalized,
    projectRoot,
    undefined,
    sessionId,
  );
  const satisfyInput: Parameters<typeof satisfyDelegation>[0] = {
    toolPrompt: normalized.prompt ?? '',
  };
  if (normalized.delegationId) satisfyInput.delegationId = normalized.delegationId;
  const agent = normalized.subagent_type || normalized.agent;
  if (agent) satisfyInput.agent = agent;
  if (normalized.planTodoId) satisfyInput.planTodoId = normalized.planTodoId;
  const result = satisfyDelegation(satisfyInput, projectRoot);

  let receiptRecorded = false;
  let todoCompleted = false;
  const expectedTodoId = spawnCheck.expectedTodoId ?? null;

  if (spawnCheck.valid && expectedTodoId) {
    const plan = loadPersistedLeadDevPlan(projectRoot);
    const consultTodo = plan
      ? getSynthesisConsultTodos(plan).find((t) => t.id === expectedTodoId)
      : undefined;

    if (
      isSynthesisConsultTodoId(expectedTodoId) &&
      consultTodo &&
      sessionId &&
      options.toolOutput != null
    ) {
      const receipt = tryRecordSynthesisConsultReceipt(
        expectedTodoId,
        consultTodo.subagent,
        sessionId,
        options.toolOutput,
        projectRoot,
      );
      receiptRecorded = receipt != null;
    }

    if (updatePlanTodoStatus(expectedTodoId, 'completed', projectRoot, sessionId)) {
      todoCompleted = true;
    }
  }

  return {
    ...result,
    expectedTodoId,
    receiptRecorded,
    todoCompleted,
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