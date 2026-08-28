#!/usr/bin/env node
/**
 * Load compiled delegation-gate SSOT from consumer or package dist.
 * Used by Grok hooks, Hermes bridge, and verify fixtures.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function loadDelegationGate() {
  const root = resolvePackageRoot();
  const envRoot = process.env.XRAY_AI_PATH || '';
  const candidates = [
    join(__dirname, '../../nucleus/delegation-gate.js'),
    join(root, 'dist/nucleus/delegation-gate.js'),
    envRoot ? join(envRoot, 'dist/nucleus/delegation-gate.js') : '',
    ...markedRoots().map((r) => join(r, 'dist/nucleus/delegation-gate.js')),
    join(process.cwd(), 'node_modules/0xray/dist/nucleus/delegation-gate.js'),
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'delegation-gate.js missing — run npm run build in 0xray or npm install 0xray',
    );
  }
  return createRequire(import.meta.url)(found);
}

const gate = loadDelegationGate();

export const writeSuitSessionBoot = gate.writeSuitSessionBoot;

export const {
  loadDelegationGateFeatures,
  normalizeHostToolInput,
  evaluatePreToolGate,
  evaluatePendingDelegationGate,
  evaluateSpawnPlanGate,
  evaluatePostToolSpawn,
  checkPendingDelegationGate,
  checkSubagentGate,
  satisfyDelegationsFromToolInput,
  isSubagentTool,
  isOrchestrateToolEvent,
  isReadOnlyTool,
  isWriteTool,
  isShellTool,
  getActivePendingDelegations,
  validateSpawnMatchesTodo,
  updatePlanTodoStatus,
  updatePlanTodoStatusInPlace,
  writeSynthesisConsultReceipt,
  hasValidSynthesisConsultReceipt,
  tryRecordSynthesisConsultReceipt,
  buildReceiptFromConsultOutput,
  parseConsultVerdictFromText,
  isSynthesisConsultTodoId,
  archiveStaleLeadDevPlan,
  findRecentStalePlanArchive,
} = gate;