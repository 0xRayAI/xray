/**
 * Multi-host delegation gate SSOT — pending-delegations + spawn todo enforcement.
 * Grok / Hermes / OpenCode adapters call evaluatePreToolGate via delegation-gate-runtime.
 * Constitution (cite + pattern gate + 11/29/69/70 + destructive shell) lives here. Grok may still extra-block Codex 2/7.
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
import { copyRootForWrite, staleWriteReason } from './work-freshness.mjs';
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
  maybeHeatHostStation,
  type CeremonyLevel,
  type SpawnPlanMode,
  type SuitHost,
  type SuitProfile,
  type SuitTemperamentConfig,
} from './suit-temperament.js';

export { writeSuitSessionBoot, maybeHeatHostStation };

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
  hookEvent?: string;
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
  for (const key of ['path', 'file_path', 'filePath', 'target_file', 'target_notebook'] as const) {
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

const IMPL_EXT = /\.(?:tsx|ts|jsx|js|mjs|cjs)$/i;
const PATTERN_DENY =
  'Pattern gate: a call uses the pattern already in the tree, the same way a controller calls a model. This file has no sibling in its directory. Name this directory or file as pattern: in PACKET.md, or add the call beside a sibling.';
const PATTERN_FIELD = /(?:^|\n)[ \t]*pattern[ \t]*:[ \t]*(\S[^\n]*)/gi;

function isTestSource(file: string): boolean {
  const norm = file.replace(/\\/g, '/');
  return /(?:^|\/)(?:__tests__|tests)\//.test(norm) || /\.(?:test|spec)\.[^.]+$/.test(norm);
}

function isImplementationSource(file: string): boolean {
  const base = file.replace(/\\/g, '/').split('/').pop() ?? file;
  if (base.endsWith('.d.ts')) return false;
  return IMPL_EXT.test(base) && !isTestSource(base);
}

function isCodeSibling(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return IMPL_EXT.test(name);
}

function hasPatternSibling(abs: string): boolean {
  let names: string[] = [];
  try {
    names = fs.readdirSync(path.dirname(abs));
  } catch {
    return false;
  }
  const base = path.basename(abs);
  return names.some((name) => name !== base && isCodeSibling(name));
}

function patternTokens(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((token) => token.replace(/^['"`]+|['"`]+$/g, '').replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, ''))
    .filter((token) => token.length > 0 && token !== '.');
}

/** True when one pattern: value names this file or its directory. */
function patternNamesModule(value: string, absFile: string, copyRoot: string): boolean {
  let rel = path.relative(path.resolve(copyRoot), path.resolve(absFile)).replace(/\\/g, '/');
  if (!rel || rel === '.' || rel.startsWith('../') || rel === '..') return false;
  if (rel.startsWith('./')) rel = rel.slice(2);
  const parent = path.posix.dirname(rel);
  const base = path.posix.basename(rel);
  const parentName = parent === '.' ? '' : path.posix.basename(parent);
  return patternTokens(value).some((token) => {
    if (token === rel || token === base) return true;
    if (parent !== '.' && (token === parent || token === parentName)) return true;
    return token.includes('/') && rel.startsWith(`${token}/`);
  });
}

/** True when PACKET.md names this file or its directory, not every module. */
export function packetNamesPattern(dir: string, absFile: string): boolean {
  try {
    const text = fs.readFileSync(path.join(dir, 'PACKET.md'), 'utf8');
    for (const match of text.matchAll(PATTERN_FIELD)) {
      const named = match[1]?.trim();
      if (named && patternNamesModule(named, absFile, dir)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isFdTarget(file: string): boolean {
  return file === '|' || file === '&-' || /^&\d+$/.test(file);
}

/** Files a shell command would create or replace. /dev/null and a file-descriptor redirect are not source writes. */
export function shellWritePaths(command: string): string[] {
  const paths: string[] = [];
  const redir = /(?:^|[\s;|])(?<!\d)>{1,2}\|?[ \t]*(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  for (const match of command.matchAll(redir)) {
    const file = (match[1] || match[2] || match[3] || '').trim();
    if (!file || file === '-' || file.startsWith('/dev/') || isFdTarget(file)) continue;
    paths.push(file);
  }
  const copy = /(?:^|[\s;|&])(?:cp|mv)[ \t]+\S+[ \t]+(?:"([^"]+)"|'([^']+)'|(\S+))[ \t]*$/.exec(
    command.trim(),
  );
  if (copy) {
    const file = (copy[1] || copy[2] || copy[3] || '').trim();
    if (file && IMPL_EXT.test(file) && !paths.includes(file)) paths.push(file);
  }
  return paths;
}

const CITE_FILE =
  'Cite the source: this message is background. Read this file and name it before the edit continues.';
const CITE_PATTERN =
  'Cite the source: this message is background. Read the pattern this file extends and name it before the edit continues.';
const CITE_MAX_READS = 80;
const CITE_MAX_SESSIONS = 8;

function citeLogFile(projectRoot: string): string {
  return path.join(projectRoot, '.xray', 'state', 'cite-reads.json');
}

function citeSessionKey(sessionId: string | null): string {
  const raw = String(sessionId || 'none').replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 80);
  return raw || 'none';
}

function citeParent(rel: string): string {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '' : rel.slice(0, i);
}

function canonicalPath(file: string): string {
  const abs = path.resolve(file);
  const missing: string[] = [];
  let cursor = abs;
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    missing.push(path.basename(cursor));
    cursor = parent;
  }
  let base = cursor;
  try {
    base = fs.realpathSync(cursor);
  } catch {
    base = path.resolve(cursor);
  }
  return missing.length ? path.join(base, ...missing.reverse()) : base;
}

/** Repo-relative path, or empty when the path is suit state or outside this checkout. */
export function citeRel(projectRoot: string, file: string): string {
  if (!file) return '';
  const root = copyRootForWrite(file, projectRoot);
  if (!root) return '';
  const abs = path.isAbsolute(file) ? path.resolve(file) : path.resolve(projectRoot, file);
  let rel = path.relative(canonicalPath(root), canonicalPath(abs)).replace(/\\/g, '/');
  if (!rel || rel === '.' || rel.startsWith('../') || rel === '..') return '';
  if (rel.startsWith('./')) rel = rel.slice(2);
  if (rel === '.xray' || rel.startsWith('.xray/')) return '';
  return rel;
}

function loadCiteMap(projectRoot: string): Record<string, string[]> {
  try {
    const parsed = JSON.parse(fs.readFileSync(citeLogFile(projectRoot), 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

/** Remember files this session opened. A missed write must not block the read. */
export function rememberCiteRead(
  projectRoot: string,
  sessionId: string | null,
  files: readonly string[],
): void {
  const added = files.map((file) => citeRel(projectRoot, file)).filter(Boolean);
  if (!added.length) return;
  const key = citeSessionKey(sessionId);
  const map = loadCiteMap(projectRoot);
  const prior = Array.isArray(map[key]) ? map[key] : [];
  const next = [...new Set([...prior, ...added])].slice(-CITE_MAX_READS);
  map[key] = next;
  const keys = Object.keys(map);
  if (keys.length > CITE_MAX_SESSIONS) {
    for (const old of keys) {
      if (old === key) continue;
      delete map[old];
      if (Object.keys(map).length <= CITE_MAX_SESSIONS) break;
    }
  }
  const dest = citeLogFile(projectRoot);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(map));
}

function loadCiteReads(projectRoot: string, sessionId: string | null): Set<string> {
  const list = loadCiteMap(projectRoot)[citeSessionKey(sessionId)];
  return new Set(Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []);
}

function reachedFile(rel: string, reads: Set<string>): boolean {
  if (reads.has(rel)) return true;
  const parent = citeParent(rel);
  return Boolean(parent && reads.has(parent));
}

function reachedPattern(rel: string, reads: Set<string>): boolean {
  if (reachedFile(rel, reads)) return true;
  const parent = citeParent(rel);
  for (const read of reads) {
    if (citeParent(read) === parent) return true;
  }
  return false;
}

function nearestCitedDir(projectRoot: string, abs: string): string {
  let cursor = path.dirname(path.resolve(abs));
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) return '';
    cursor = parent;
  }
  return citeRel(projectRoot, cursor);
}

function readNamesPacket(projectRoot: string, abs: string, reads: Set<string>): boolean {
  let sawPacket = false;
  for (const read of reads) {
    if (read === 'PACKET.md' || read.endsWith('/PACKET.md')) {
      sawPacket = true;
      break;
    }
  }
  if (!sawPacket) return false;
  const root = copyRootForWrite(abs, projectRoot);
  if (root && packetNamesPattern(root, abs)) return true;
  const project = path.resolve(projectRoot);
  if (!root || path.resolve(root) !== project) return packetNamesPattern(project, abs);
  return false;
}

/** A missing parent still needs a read of the nearest directory, a sibling, or the packet line. */
function reachedNewModule(projectRoot: string, rel: string, abs: string, reads: Set<string>): boolean {
  if (reachedPattern(rel, reads)) return true;
  const nearest = nearestCitedDir(projectRoot, abs);
  if (nearest) {
    if (reads.has(nearest)) return true;
    for (const read of reads) {
      if (citeParent(read) === nearest) return true;
    }
  }
  return readNamesPacket(projectRoot, abs, reads);
}

/** Empty when this session has opened the file, or the pattern a new file extends. */
export function citeWriteReason(
  projectRoot: string,
  sessionId: string | null,
  paths: readonly string[],
): string {
  const reads = loadCiteReads(projectRoot, sessionId);
  for (const file of paths) {
    const rel = citeRel(projectRoot, file);
    if (!rel) continue;
    const abs = path.isAbsolute(file) ? path.resolve(file) : path.resolve(projectRoot, file);
    if (fs.existsSync(abs)) {
      if (!reachedFile(rel, reads)) return CITE_FILE;
      continue;
    }
    const parentAbs = path.dirname(abs);
    if (!fs.existsSync(parentAbs)) {
      if (!reachedNewModule(projectRoot, rel, abs, reads)) return CITE_PATTERN;
      continue;
    }
    if (!reachedPattern(rel, reads)) return CITE_PATTERN;
  }
  return '';
}

/** Empty when the file sits beside code, or PACKET.md names this directory or file. */
export function patternWriteReason(projectRoot: string, paths: string[]): string {
  for (const file of paths) {
    if (!file || !copyRootForWrite(file, projectRoot)) continue;
    const abs = path.isAbsolute(file) ? path.resolve(file) : path.resolve(projectRoot, file);
    const norm = abs.replace(/\\/g, '/');
    if (isTestSource(norm) || !isImplementationSource(norm)) continue;
    if (hasPatternSibling(abs)) continue;
    const root = copyRootForWrite(file, projectRoot);
    if (root && packetNamesPattern(root, abs)) continue;
    if (packetNamesPattern(projectRoot, abs)) continue;
    return PATTERN_DENY;
  }
  return '';
}

/** Cite + pattern + Codex 11 / 29 / 69 / 70 + destructive shell — always on, all hosts that call this SSOT. */
export function evaluateConstitutionGate(
  toolName: string,
  toolInput: ToolGateInput,
  ctx: PreToolGateContext,
): PreToolGateResult {
  const content = collectWriteContent(toolInput);
  const shellPaths = isShellTool(toolName) ? shellWritePaths(String(toolInput.command ?? '')) : [];
  const paths = [...collectWritePaths(toolInput), ...shellPaths];
  const writing = isWriteTool(toolName, ctx.host ?? 'generic') || shellPaths.length > 0;

  if (writing) {
    const reason = staleWriteReason(ctx.projectRoot, paths);
    if (reason) {
      return {
        allow: false,
        reason,
        gate: 'codex-70',
      };
    }
    const pattern = patternWriteReason(ctx.projectRoot, paths);
    if (pattern) {
      return {
        allow: false,
        reason: pattern,
        gate: 'pattern',
      };
    }
    const cite = citeWriteReason(ctx.projectRoot, ctx.sessionId, paths);
    if (cite) {
      return {
        allow: false,
        reason: cite,
        gate: 'cite',
      };
    }
  }

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
  const host = ctx.host || 'generic';
  try {
    maybeHeatHostStation(ctx.projectRoot, host, {
      source: `0xray/${host}-pre-tool`,
      sessionId: ctx.sessionId || host,
      hookEvent: ctx.hookEvent || 'pre_tool_use',
    });
  } catch {
    /* station heat is best-effort — constitution still runs */
  }

  if (isReadOnlyTool(toolName)) {
    try {
      rememberCiteRead(ctx.projectRoot, ctx.sessionId, collectWritePaths(toolInput));
    } catch {
      /* a missed read log must not block the read */
    }
  }

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