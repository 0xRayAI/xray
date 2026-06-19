#!/usr/bin/env node
/**
 * Shared utilities for Grok CLI hooks — codex load, features, surface checks.
 * Pure JS (no TS build) so hooks run from dist/ without compilation surprises.
 */

import fs from 'fs';
import path from 'path';

export const LEAD_DEV_RULES = [
  'Phased plan + todos; assign best subagent; monitor output',
  'Lead dev loops test→fix until green; no permission pings',
  'Per-suite test triage; full suite last',
  'Lead stays main; subagents execute; update todos',
  'Read all output; triage fix rerun',
  'No buck-passing — resolve every error',
  'Zero open errors at phase completion',
];

/** Blocking codex patterns detectable in proposed edits (term → regex + message) */
export const CODEX_BLOCK_PATTERNS = [
  { terms: [11], pattern: /:\s*any\b|as\s+any\b/g, message: 'Codex 11 Type Safety: no `any` types' },
  { terms: [11], pattern: /@ts-ignore|@ts-expect-error/g, message: 'Codex 11 Type Safety: no @ts-ignore / @ts-expect-error' },
  { terms: [29], pattern: /\beval\s*\(/g, message: 'Codex 29 Security: eval() prohibited' },
  { terms: [2], pattern: /\bTODO\b|\bFIXME\b|\bSTUB\b/g, message: 'Codex 2: no TODO/FIXME/STUB in production code' },
  { terms: [7], pattern: /console\.log\s*\(/g, message: 'Codex 7: no console.log debugging' },
];

/** New-surface paths blocked when no_new_surface is on (codex 69) */
export const SURFACE_DENY_PATTERNS = [
  { pattern: /(?:^|\/)src\/mcps\/[^/]+\.server\.(ts|js)$/i, message: 'Codex 69: new MCP server — rewire existing mcps/' },
  { pattern: /(?:^|\/)src\/skills\/[^/]+\/SKILL\.md$/i, message: 'Codex 69: new skill — extend orchestrator skill or existing mcps' },
  { pattern: /(?:^|\/)src\/mcps\/orchestrator\/handlers\/[^/]+-handler\.(ts|js)$/i, message: 'Codex 69: new orchestrator handler — merge into complexity-handler' },
  { pattern: /(?:^|\/)src\/nucleus\/autonomy-kernel\.(ts|js)$/i, message: 'Codex 69: parallel autonomy kernel — use existing nucleus' },
  { pattern: /(?:^|\/)src\/mcps\/[^/]+\/handlers\/autonomy-handler\.(ts|js)$/i, message: 'Codex 69: autonomy-handler removed — use complexity-handler' },
];

const SUBAGENT_TOOLS = new Set([
  'spawn_subagent',
  'task',
  'Task',
]);

const WRITE_TOOLS = new Set([
  'search_replace',
  'write',
  'Write',
  'Edit',
  'MultiEdit',
  'edit_notebook',
  'EditNotebook',
]);

export function workspaceRoot() {
  return (
    process.env.GROK_WORKSPACE_ROOT ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.XRAY_ROOT ||
    process.cwd()
  );
}

export function resolveFeaturesPath(root = workspaceRoot()) {
  for (const p of [
    path.join(root, '.xray', 'features.json'),
    path.join(process.cwd(), '.xray', 'features.json'),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function resolveCodexPath(root = workspaceRoot()) {
  for (const p of [
    path.join(root, '.xray', 'codex.json'),
    path.join(process.cwd(), '.xray', 'codex.json'),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadFeatures() {
  const featuresPath = resolveFeaturesPath();
  if (!featuresPath) return { lead_dev_mode: true, no_new_surface: true, per_suite_triage: true };
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
    const orch = data.multi_agent_orchestration ?? {};
    return {
      lead_dev_mode: orch.enabled !== false && orch.lead_dev_mode !== false,
      no_new_surface: orch.no_new_surface !== false,
      per_suite_test_triage: orch.per_suite_test_triage !== false,
      auto_chain_delegations: orch.auto_chain_delegations !== false,
    };
  } catch {
    return {
      lead_dev_mode: true,
      no_new_surface: true,
      per_suite_triage: true,
      auto_chain_delegations: true,
    };
  }
}

export function loadBlockingCodexTerms() {
  const codexPath = resolveCodexPath();
  if (!codexPath) return [];
  try {
    const data = JSON.parse(fs.readFileSync(codexPath, 'utf8'));
    const terms = data.terms ?? {};
    return Object.values(terms).filter(
      (t) => t.enforcementLevel === 'blocking' || t.zeroTolerance === true,
    );
  } catch {
    return [];
  }
}

export function leadDevPlanPath(root = workspaceRoot()) {
  return path.join(root, '.xray', 'state', 'lead-dev-plan.json');
}

export function hasFreshLeadDevPlan(maxAgeMs = 4 * 60 * 60 * 1000) {
  const planPath = leadDevPlanPath();
  if (!fs.existsSync(planPath)) return false;
  try {
    const stat = fs.statSync(planPath);
    if (Date.now() - stat.mtimeMs > maxAgeMs) return false;
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    return plan.active === true;
  } catch {
    return false;
  }
}

export function extractToolContext(event) {
  const toolName = event.toolName || process.env.TOOL_NAME || 'unknown';
  const toolInput = event.toolInput ?? {};
  const paths = [];
  let content = '';

  if (toolInput.path) paths.push(String(toolInput.path));
  if (toolInput.file_path) paths.push(String(toolInput.file_path));
  if (toolInput.target_notebook) paths.push(String(toolInput.target_notebook));
  if (Array.isArray(toolInput.paths)) paths.push(...toolInput.paths.map(String));

  if (toolInput.new_string) content += String(toolInput.new_string);
  if (toolInput.contents) content += String(toolInput.contents);
  if (toolInput.command) content += String(toolInput.command);
  if (toolInput.prompt) content += String(toolInput.prompt);

  return { toolName, toolInput, paths, content, cmd: String(toolInput.command || '') };
}

export function checkCodexPatterns(content) {
  if (!content) return null;
  for (const { message, pattern } of CODEX_BLOCK_PATTERNS) {
    if (pattern.test(content)) return message;
    pattern.lastIndex = 0;
  }
  return null;
}

export function checkSurfaceArea(paths, root = workspaceRoot()) {
  for (const rel of paths) {
    const normalized = rel.replace(/\\/g, '/');
    const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
    if (fs.existsSync(abs)) continue;
    for (const { pattern, message } of SURFACE_DENY_PATTERNS) {
      if (pattern.test(normalized)) return `${message} (blocked: ${normalized})`;
    }
  }
  return null;
}

export function checkSubagentGate(toolName, features) {
  if (!features.lead_dev_mode) return null;
  if (!SUBAGENT_TOOLS.has(toolName)) return null;
  if (hasFreshLeadDevPlan()) return null;
  return (
    'Codex 59/67: call xray-orchestrator analyze-complexity first — ' +
    'writes .xray/state/lead-dev-plan.json required before spawn_subagent'
  );
}

export function checkFullTestSuite(cmd, features) {
  if (!features.per_suite_test_triage) return null;
  const cmdText = cmd.toLowerCase();
  const isFullTestSuite =
    /\b(npm\s+(run\s+)?test|vitest\s+run|pnpm\s+test|yarn\s+test)\b/.test(cmdText) &&
    !/--\s+\S+\.test/.test(cmdText) &&
    !/vitest\s+run\s+\S+\.test/.test(cmdText);
  if (!isFullTestSuite) return null;
  return (
    'Lead-dev test protocol: run individual test files first; ' +
    'full suite only after per-suite passes (override with focused test path)'
  );
}

export function isWriteTool(toolName) {
  return WRITE_TOOLS.has(toolName) || /write|edit|replace/i.test(toolName);
}

export function isShellTool(toolName) {
  return /terminal|bash|shell|run_terminal/i.test(toolName);
}

export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function sessionBootPath(root = workspaceRoot()) {
  return path.join(root, '.xray', 'state', 'session-boot.json');
}

export function buildSessionBootPayload(root, source = '0xray/grok-session-start', extra = {}) {
  const features = loadFeatures();
  const blockingTerms = loadBlockingCodexTerms();
  return {
    hook: source,
    lead_dev_mode: features.lead_dev_mode,
    no_new_surface: features.no_new_surface,
    codexBlockingTermCount: blockingTerms.length,
    codexTerms: [59, 67, 68, 69],
    rules: features.lead_dev_mode ? LEAD_DEV_RULES : [],
    mcpIntake: 'xray-orchestrator → analyze-complexity (required before spawn_subagent)',
    enforcement: 'PreToolUse hook — codex patterns + surface area + spawn gate',
    workspaceRoot: root,
    sessionId: process.env.GROK_SESSION_ID || null,
    timestamp: new Date().toISOString(),
    source,
    ...extra,
  };
}

export function writeSessionBoot(root, payload) {
  try {
    const stateDir = path.join(root, '.xray', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(sessionBootPath(root), JSON.stringify(payload, null, 2));
    return sessionBootPath(root);
  } catch {
    return null;
  }
}

/** Boot on SessionStart, UserPromptSubmit, or first PreToolUse if missing. */
export function ensureSessionBoot(root = workspaceRoot(), source = '0xray/grok-boot') {
  const bootPath = sessionBootPath(root);
  if (fs.existsSync(bootPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(bootPath, 'utf8'));
      if (existing.lead_dev_mode !== undefined) return bootPath;
    } catch {
      /* rewrite corrupt boot */
    }
  }
  return writeSessionBoot(root, buildSessionBootPayload(root, source));
}

const READ_TOOLS = new Set([
  'read_file',
  'Read',
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
]);

const ORCHESTRATOR_CONSULT_TOOLS = new Set([
  'analyze-complexity',
  'analyze_complexity',
  'get-orchestration-status',
  'get_orchestration_status',
  'orchestrate-task',
  'orchestrate_task',
]);

export function pendingDelegationsPath(root = workspaceRoot()) {
  return path.join(root, '.xray', 'state', 'pending-delegations.json');
}

export function loadPendingDelegationsState(root = workspaceRoot()) {
  const filePath = pendingDelegationsPath(root);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function savePendingDelegationsState(state, root = workspaceRoot()) {
  const filePath = pendingDelegationsPath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

export function resolveSessionId(event) {
  return (
    event.sessionId ||
    process.env.GROK_SESSION_ID ||
    null
  );
}

export function isPendingStateActive(state, sessionId) {
  if (!state || !sessionId || state.sessionId !== sessionId) return false;
  const age = Date.now() - new Date(state.createdAt).getTime();
  if (age > (state.ttlMs ?? 4 * 60 * 60 * 1000)) return false;
  return state.delegations?.some((d) => d.status === 'pending');
}

export function getActivePendingDelegations(root, sessionId) {
  const state = loadPendingDelegationsState(root);
  if (!isPendingStateActive(state, sessionId)) return [];
  return state.delegations.filter((d) => d.status === 'pending');
}

export function clearPendingDelegationsForSessionChange(newSessionId, root = workspaceRoot()) {
  const state = loadPendingDelegationsState(root);
  if (!state) return false;
  if (newSessionId && state.sessionId === newSessionId) return false;
  try {
    fs.unlinkSync(pendingDelegationsPath(root));
    return true;
  } catch {
    return false;
  }
}

function isFocusedTestCommand(cmd) {
  const cmdText = (cmd || '').toLowerCase();
  return (
    /\b(npm\s+(run\s+)?test|vitest\s+run|pnpm\s+test|yarn\s+test)\b/.test(cmdText) &&
    (/--\s+\S+\.test/.test(cmdText) || /vitest\s+run\s+\S+\.test/.test(cmdText))
  );
}

function isReadOnlyTool(toolName) {
  return READ_TOOLS.has(toolName) || /^(read|grep|glob|list)/i.test(toolName);
}

export function isSubagentTool(toolName) {
  return SUBAGENT_TOOLS.has(toolName) || /^task$/i.test(toolName) || toolName === 'spawn_subagent';
}

function extractMcpToolName(toolInput) {
  const candidates = [
    toolInput.toolName,
    toolInput.tool,
    toolInput.name,
    toolInput.mcpToolName,
  ];
  for (const c of candidates) {
    if (c) return String(c);
  }
  const server = String(toolInput.server || toolInput.mcpServer || '');
  const args = toolInput.arguments ?? toolInput.args ?? {};
  if (args.toolName) return String(args.toolName);
  if (server.includes('orchestrator') && args.name) return String(args.name);
  return '';
}

function isOrchestratorConsultMcp(toolName, toolInput) {
  if (!/mcp|CallMcpTool/i.test(toolName)) return false;
  const inner = extractMcpToolName(toolInput).toLowerCase();
  if (!inner) return false;
  for (const t of ORCHESTRATOR_CONSULT_TOOLS) {
    if (inner.includes(t) || inner.includes(t.replace(/-/g, '_'))) return true;
  }
  return false;
}

export function isOrchestrateToolEvent(toolName, toolInput = {}) {
  const inner = extractMcpToolName(toolInput).toLowerCase();
  if (/orchestrate[-_]?task/.test(inner)) return true;
  const blob = JSON.stringify(toolInput).toLowerCase();
  return /orchestrate[-_]?task/.test(blob);
}

export function satisfyDelegationsFromToolInput(toolInput, root = workspaceRoot()) {
  const state = loadPendingDelegationsState(root);
  if (!state) return { satisfied: [], clearedAll: false };

  const prompt = String(
    toolInput.prompt || toolInput.description || toolInput.task || '',
  ).toLowerCase();
  const subagent = String(toolInput.subagent_type || toolInput.agent || '').toLowerCase();
  const delegationId = toolInput.delegationId || toolInput.delegation_id;

  const pending = state.delegations.filter((d) => d.status === 'pending');
  if (pending.length === 0) return { satisfied: [], clearedAll: false };

  let matches = [];
  if (delegationId) {
    matches = pending.filter((d) => d.id === delegationId);
  } else {
    for (const d of pending) {
      if (d.planTodoId && prompt.includes(d.planTodoId.toLowerCase())) {
        matches.push(d);
        break;
      }
      if (prompt.includes(d.taskId.toLowerCase())) {
        matches.push(d);
        break;
      }
      if (subagent && d.agent.toLowerCase().includes(subagent)) {
        matches.push(d);
        break;
      }
    }
  }

  if (matches.length === 0 && pending.length === 1) {
    const only = pending[0];
    const hint = (only.spawnHint?.description || '').toLowerCase();
    if (prompt && hint && prompt.includes(hint.slice(0, 30))) {
      matches = [only];
    }
  }

  if (matches.length === 0) return { satisfied: [], clearedAll: false };

  const now = new Date().toISOString();
  const ids = new Set(matches.map((m) => m.id));
  for (const d of state.delegations) {
    if (ids.has(d.id) && d.status === 'pending') {
      d.status = 'satisfied';
      d.satisfiedAt = now;
    }
  }
  savePendingDelegationsState(state, root);
  const clearedAll = !state.delegations.some((d) => d.status === 'pending');
  return { satisfied: matches, clearedAll };
}

/**
 * Surgical gate: block writes and unrelated work while pending delegations exist.
 * Allows read-only tools, orchestrator consult MCP, focused test shell, and Task/spawn.
 */
export function checkPendingDelegationGate(toolName, toolInput, features, root, sessionId) {
  if (!features.lead_dev_mode || features.auto_chain_delegations === false) return null;
  if (!sessionId) return null;

  const pending = getActivePendingDelegations(root, sessionId);
  if (pending.length === 0) return null;

  if (isSubagentTool(toolName)) return null;

  if (isReadOnlyTool(toolName)) return null;

  if (isOrchestratorConsultMcp(toolName, toolInput)) return null;

  if (isShellTool(toolName)) {
    const cmd = String(toolInput.command || '');
    if (isFocusedTestCommand(cmd)) return null;
  }

  const primary = pending[0];
  return {
    reason: 'Pending implementation delegation — spawn host Task before other work',
    gate: 'auto-chain-pending',
    hint: primary.spawnHint ?? {
      tool: 'Task',
      subagent_type: primary.agent,
      description: primary.taskDescription,
      planTodoId: primary.planTodoId,
      delegationId: primary.id,
    },
    pendingCount: pending.length,
    delegationId: primary.id,
  };
}