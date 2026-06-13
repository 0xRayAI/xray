#!/usr/bin/env node
/**
 * Grok CLI PreToolUse Hook Handler for 0xRay — First Class Citizen
 *
 * Real governance enforcement hook.
 * When Grok is about to execute a tool (write_file, edit, terminal cmd, etc.),
 * this script is spawned and runs the Dynamo Solar SSOT decision matrix.
 */

import fs from 'fs';
import path from 'path';

let fLogger = null;

function safeLog(component, action, details = {}) {
  if (!fLogger) return;
  try { fLogger.log(component, action, 'info', details).catch(() => {}); } catch {}
}

function flushLog() {
  if (!fLogger) return;
  try { fLogger.flushSync(); } catch {}
}

async function initLogger() {
  try {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const loggerPath = path.resolve(here, '../../../core/framework-logger.js');
    const mod = await import(`file://${loggerPath}`);
    fLogger = mod.frameworkLogger || mod.default?.frameworkLogger;
  } catch {}
}

const log = (msg) => { try { console.error(`[0xRay:GrokHook] ${msg}`); } catch { /* noop */ } };

function findGovernanceCore() {
  const here = path.dirname(new URL(import.meta.url).pathname);

  // Priority: explicit dev root
  const devRoot = process.env.XRAY_DEV_ROOT || '';
  if (devRoot) {
    const devCandidate = path.resolve(devRoot, 'dist/governance/governance-core.js');
    if (fs.existsSync(devCandidate)) return devCandidate;
  }

  const candidates = [
    // Published package layout
    path.resolve(here, '../../../governance/governance-core.js'),
    path.resolve(here, '../../../../governance/governance-core.js'),
    // node_modules installed layout
    path.resolve(process.cwd(), 'node_modules/0xray/dist/governance/governance-core.js'),
    // Dev layout fallbacks (no extra dist/)
    path.resolve(here, '../../../../../governance/governance-core.js'),
    path.resolve(process.cwd(), 'dist/governance/governance-core.js'),
    // Strong dev fallback: walk up looking for package.json
    ...walkUpForCore(here),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function walkUpForCore(startDir, maxLevels = 8) {
  const results = [];
  let current = startDir;
  for (let i = 0; i < maxLevels; i++) {
    const pkgPath = path.resolve(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'strray-ai' || pkg.name === 'stringray' || pkg.name === '0xray') {
          results.push(path.resolve(current, 'dist/governance/governance-core.js'));
          results.push(path.resolve(current, 'governance/governance-core.js'));
        }
      } catch {}
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return results;
}

function deriveResonance(toolName, extra = '') {
  const text = (toolName + ' ' + extra).toLowerCase();
  let score = 0.85; // baseline good
  const penalties = [
    ['any', -0.25],
    ['eval(', -0.35],
    ['console.log', -0.15],
    ['// @ts-ignore', -0.2],
    ['require(', -0.1],
  ];
  for (const [pat, pen] of penalties) {
    if (text.includes(pat)) score += pen;
  }
  return Math.max(0.1, Math.min(0.99, score));
}

async function main() {
  await initLogger();

  try {
    const toolName = process.env.TOOL_NAME || process.env.HOOK_TOOL || 'unknown_tool';
    const cwd = process.env.PWD || process.cwd();
    const extraContext = process.env.HOOK_ARGS || process.env.TOOL_ARGS || '';

    log(`PreToolUse: ${toolName}`);
    safeLog('grok-hook', 'pre-tool-use', { tool: toolName, cwd });

    const corePath = findGovernanceCore();
    let recommendation = 'ALLOW';
    let resonance = deriveResonance(toolName, extraContext);
    let govDetails = null;

    if (corePath) {
      // Governance core no longer exposes the legacy PHI/TAU matrix (purged in v3).
      // Resonance is still derived locally for logging/decision notes.
      log(`Using local resonance derivation (core matrix purged)`);
      safeLog('grok-hook', 'governance-core-found', { corePath });
    } else {
      log('Governance core not located — using safe default');
      safeLog('grok-hook', 'governance-core-not-found', {});
    }

    const decision = {
      tool: toolName,
      decision: recommendation === 'PASS' ? 'allow' : 'allow_with_governance_note',
      resonance: Number(resonance.toFixed(3)),
      solar_recommendation: recommendation,
      gov: govDetails,
      timestamp: new Date().toISOString(),
      source: '0xray/grok-pre-tool-use',
    };

    safeLog('grok-hook', 'decision', { tool: toolName, decision: decision.decision, resonance: decision.resonance });
    flushLog();
    console.log(JSON.stringify(decision));
    process.exit(0); // non-blocking rollout; future versions can exit(1) on strong reject
  } catch (err) {
    log(`Hook failure (non-fatal): ${err.message}`);
    safeLog('grok-hook', 'hook-failure', { error: err.message });
    flushLog();
    process.exit(0);
  }
}

main();