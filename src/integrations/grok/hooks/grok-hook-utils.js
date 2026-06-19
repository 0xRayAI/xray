#!/usr/bin/env node
/**
 * Shared utilities for Grok CLI hooks — codex load, features, surface checks.
 * Pure JS (no TS build) so hooks run from dist/ without compilation surprises.
 */

import fs from 'fs';
import path from 'path';
import {
  checkPendingDelegationGate,
  checkSubagentGate,
  satisfyDelegationsFromToolInput,
  isSubagentTool,
  isOrchestrateToolEvent,
  isReadOnlyTool,
  isShellTool,
  getActivePendingDelegations,
  validateSpawnMatchesTodo,
  updatePlanTodoStatusInPlace,
} from '../../hooks/delegation-gate-runtime.mjs';
import { isConferPendingForSession } from '../../hooks/confer-hook-runtime.mjs';

export {
  checkPendingDelegationGate,
  checkSubagentGate,
  satisfyDelegationsFromToolInput,
  isSubagentTool,
  isOrchestrateToolEvent,
  isReadOnlyTool,
  isShellTool,
  getActivePendingDelegations,
  validateSpawnMatchesTodo,
  updatePlanTodoStatusInPlace,
};

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

export function resolveSiblingWorkspaceRoots(root = workspaceRoot()) {
  const featuresPath = resolveFeaturesPath(root);
  if (!featuresPath) return [];
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
    const siblings = data.multi_agent_orchestration?.sibling_repos ?? [];
    if (!Array.isArray(siblings)) return [];
    const resolved = [];
    for (const entry of siblings) {
      const rel = typeof entry === 'string' ? entry : entry?.path;
      if (!rel || typeof rel !== 'string') continue;
      const abs = path.isAbsolute(rel) ? rel : path.resolve(root, rel);
      if (!fs.existsSync(abs)) continue;
      resolved.push({
        path: abs,
        label: typeof entry === 'object' && entry.label ? entry.label : path.basename(abs),
      });
    }
    return resolved;
  } catch {
    return [];
  }
}

export function loadFeatures(root = workspaceRoot()) {
  const featuresPath = resolveFeaturesPath(root);
  if (!featuresPath) return { lead_dev_mode: true, no_new_surface: true, per_suite_triage: true };
  try {
    const data = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
    const orch = data.multi_agent_orchestration ?? {};
    return {
      lead_dev_mode: orch.enabled !== false && orch.lead_dev_mode !== false,
      no_new_surface: orch.no_new_surface !== false,
      per_suite_test_triage: orch.per_suite_test_triage !== false,
      auto_chain_delegations: orch.auto_chain_delegations !== false,
      sibling_repos: resolveSiblingWorkspaceRoots(root),
    };
  } catch {
    return {
      lead_dev_mode: true,
      no_new_surface: true,
      per_suite_triage: true,
      auto_chain_delegations: true,
      sibling_repos: [],
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

export function loadConferPending(root = workspaceRoot(), sessionId = null) {
  try {
    return isConferPendingForSession(root, sessionId);
  } catch {
    return false;
  }
}

export function buildSessionBootPayload(root, source = '0xray/grok-session-start', extra = {}) {
  const features = loadFeatures(root);
  const blockingTerms = loadBlockingCodexTerms();
  const siblingRoots = features.sibling_repos ?? resolveSiblingWorkspaceRoots(root);
  const sessionId =
    extra.sessionId || process.env.GROK_SESSION_ID || process.env.GROK_SESSION || null;
  const conferPending = loadConferPending(root, sessionId);
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
    ...(siblingRoots.length > 0 ? { siblingWorkspaceRoots: siblingRoots } : {}),
    ...(conferPending ? { conferPending: true, conferTrigger: 'analyze-complexity at synthesis checkpoint' } : {}),
    sessionId,
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

export function resolveSessionId(event) {
  return (
    event.sessionId ||
    process.env.GROK_SESSION_ID ||
    null
  );
}

export function clearPendingDelegationsForSessionChange(newSessionId, root = workspaceRoot()) {
  const filePath = path.join(root, '.xray', 'state', 'pending-delegations.json');
  if (!fs.existsSync(filePath)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (newSessionId && state.sessionId === newSessionId) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}