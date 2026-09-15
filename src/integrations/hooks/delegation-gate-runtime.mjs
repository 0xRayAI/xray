#!/usr/bin/env node
/**
 * Load compiled delegation-gate SSOT from consumer or package dist.
 * Import must not throw when dist is missing — Cursor preCompact / afterFileEdit
 * still have to write Station on cloud snapshots that have not run `npm run build`.
 * Used by Grok hooks, Hermes bridge, and verify fixtures.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MISSING_GATE =
  'delegation-gate.js missing — run npm run build in 0xray or npm install 0xray';

const CONSTITUTION_DESTRUCTIVE =
  /\brm\s+-rf\s+\/(?:\s|$)|\bmkfs\b|\bdd\s+if=|:()\s*\{\s*:\|&\s*\}\s*;:/i;

/** 0xray package root — never use consumer workspace env (GROK_WORKSPACE_ROOT / XRAY_ROOT). */
function resolvePackageRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const require = createRequire(join(dir, 'package.json'));
        const name = require('./package.json').name;
        if (name === '0xray') return dir;
      } catch {
        /* continue */
      }
    }
    const nm = join(dir, 'node_modules', '0xray', 'package.json');
    if (existsSync(nm)) {
      return dirname(nm);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(__dirname, '../../..');
}

function markedRoots() {
  const files = [
    join(homedir(), '.hermes', 'plugins', 'xray-hermes', 'xray-consumer-root.txt'),
    join(homedir(), '.openclaw', 'xray-consumer-root.txt'),
  ];
  const roots = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    try {
      const marked = readFileSync(file, 'utf8').trim();
      if (marked) {
        roots.push(marked, join(marked, 'node_modules', '0xray'));
      }
    } catch {
      /* ignore unreadable marker */
    }
  }
  return roots;
}

function gateCandidates() {
  const override = process.env.XRAY_DELEGATION_GATE_JS;
  if (override === 'none') return [];
  const root = resolvePackageRoot();
  const envRoot = process.env.XRAY_AI_PATH || '';
  const list = [];
  if (override) list.push(override);
  list.push(
    join(__dirname, '../../nucleus/delegation-gate.js'),
    join(root, 'dist/nucleus/delegation-gate.js'),
    envRoot ? join(envRoot, 'dist/nucleus/delegation-gate.js') : '',
    ...markedRoots().map((r) => join(r, 'dist/nucleus/delegation-gate.js')),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/delegation-gate.js'),
  );
  return list.filter(Boolean);
}

function resolveDelegationGatePath() {
  return gateCandidates().find((p) => existsSync(p)) || null;
}

let cachedGate = undefined;

function getGate() {
  if (cachedGate !== undefined) return cachedGate;
  const found = resolveDelegationGatePath();
  if (!found) {
    cachedGate = null;
    return null;
  }
  cachedGate = createRequire(import.meta.url)(found);
  return cachedGate;
}

function fallbackFeatures(projectRoot = process.cwd()) {
  const fallback = {
    lead_dev_mode: true,
    auto_chain_delegations: true,
    spawn_plan_mode: 'deny',
    ceremony: 'full',
    suit_profile: 'guided',
    no_new_surface: true,
  };
  const featuresPath = join(projectRoot, '.xray', 'features.json');
  if (!existsSync(featuresPath)) return fallback;
  try {
    const data = JSON.parse(readFileSync(featuresPath, 'utf8'));
    const orch = data.multi_agent_orchestration ?? {};
    const profile = data.suit_temperament?.profile;
    const frontier = profile === 'auto' || profile === 'frontier';
    return {
      lead_dev_mode: orch.enabled !== false && orch.lead_dev_mode !== false,
      auto_chain_delegations: orch.auto_chain_delegations !== false,
      spawn_plan_mode: frontier ? 'warn' : 'deny',
      ceremony: frontier ? 'lite' : 'full',
      suit_profile: frontier ? 'auto' : 'guided',
      no_new_surface: orch.no_new_surface !== false,
    };
  } catch {
    return fallback;
  }
}

function fallbackIsShellTool(toolName) {
  return /shell|bash|zsh/i.test(String(toolName || ''));
}

function fallbackIsWriteTool(toolName) {
  return /write|edit|replace|search_replace/i.test(String(toolName || ''));
}

function fallbackEvaluatePreToolGate(toolName, toolInput = {}) {
  if (fallbackIsShellTool(toolName) && CONSTITUTION_DESTRUCTIVE.test(String(toolInput.command ?? ''))) {
    return {
      allow: false,
      reason: 'Blocked destructive shell command',
      gate: 'destructive-shell',
    };
  }
  return { allow: true };
}

function callGate(name, fallbackFn) {
  return (...args) => {
    const gate = getGate();
    if (gate && typeof gate[name] === 'function') return gate[name](...args);
    if (fallbackFn) return fallbackFn(...args);
    throw new Error(`${MISSING_GATE} (${name})`);
  };
}

export function delegationGateDistPresent() {
  return Boolean(getGate());
}

export { resolveDelegationGatePath };

export const writeSuitSessionBoot = callGate('writeSuitSessionBoot', () => null);
export const maybeHeatHostStation = callGate('maybeHeatHostStation', () => null);
export const loadDelegationGateFeatures = callGate('loadDelegationGateFeatures', fallbackFeatures);
export const normalizeHostToolInput = callGate('normalizeHostToolInput', (input) => input || {});
export const evaluatePreToolGate = callGate('evaluatePreToolGate', fallbackEvaluatePreToolGate);
export const evaluatePendingDelegationGate = callGate('evaluatePendingDelegationGate', () => ({
  allow: true,
}));
export const evaluateSpawnPlanGate = callGate('evaluateSpawnPlanGate', () => ({ allow: true }));
export const evaluatePostToolSpawn = callGate('evaluatePostToolSpawn', () => ({
  satisfied: false,
}));
export const checkPendingDelegationGate = callGate('checkPendingDelegationGate', () => null);
export const checkSubagentGate = callGate('checkSubagentGate', () => null);
export const satisfyDelegationsFromToolInput = callGate(
  'satisfyDelegationsFromToolInput',
  () => ({ satisfied: [] }),
);
export const isSubagentTool = callGate('isSubagentTool', (name) =>
  /spawn_subagent|^task$/i.test(String(name || '')),
);
export const isOrchestrateToolEvent = callGate('isOrchestrateToolEvent', () => false);
export const isReadOnlyTool = callGate('isReadOnlyTool', (name) => !fallbackIsWriteTool(name));
export const isWriteTool = callGate('isWriteTool', fallbackIsWriteTool);
export const isShellTool = callGate('isShellTool', fallbackIsShellTool);
export const getActivePendingDelegations = callGate('getActivePendingDelegations', () => []);
export const validateSpawnMatchesTodo = callGate('validateSpawnMatchesTodo', () => ({
  valid: true,
}));
export const updatePlanTodoStatus = callGate('updatePlanTodoStatus', () => null);
export const updatePlanTodoStatusInPlace = callGate('updatePlanTodoStatusInPlace', () => null);
export const writeSynthesisConsultReceipt = callGate('writeSynthesisConsultReceipt', () => null);
export const hasValidSynthesisConsultReceipt = callGate(
  'hasValidSynthesisConsultReceipt',
  () => false,
);
export const tryRecordSynthesisConsultReceipt = callGate(
  'tryRecordSynthesisConsultReceipt',
  () => false,
);
export const buildReceiptFromConsultOutput = callGate('buildReceiptFromConsultOutput', () => null);
export const parseConsultVerdictFromText = callGate('parseConsultVerdictFromText', () => null);
export const isSynthesisConsultTodoId = callGate('isSynthesisConsultTodoId', () => false);
export const archiveStaleLeadDevPlan = callGate('archiveStaleLeadDevPlan', () => null);
export const findRecentStalePlanArchive = callGate('findRecentStalePlanArchive', () => null);
