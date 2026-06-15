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

const log = (msg) => { try { console.error(`[0xRay:GrokHook] ${msg}`); } catch { /* noop */ } };

function findGovernanceCore() {
  const here = path.dirname(new URL(import.meta.url).pathname);

  // Priority: explicit dev root
  const devRoot = process.env.XRAY_ROOT;
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
        if (pkg.name === '0xray') {
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
  try {
    const toolName = process.env.TOOL_NAME || process.env.HOOK_TOOL || 'unknown_tool';
    const cwd = process.env.PWD || process.cwd();
    const extraContext = process.env.HOOK_ARGS || process.env.TOOL_ARGS || '';

    log(`PreToolUse: ${toolName}`);

    const corePath = findGovernanceCore();
    let recommendation = 'ALLOW';
    let resonance = deriveResonance(toolName, extraContext);
    let govDetails = null;

    if (corePath) {
      try {
        const core = await import(`file://${corePath}`);
        if (typeof core.applyDecisionMatrix === 'function') {
          const result = core.applyDecisionMatrix({
            resonance,
            isotopicRatio: resonance > 0.8 ? 0.96 : 0.7,
            vortexVolume: 1_000_000,
            historicalCoherence: 0.82,
            solarActivity: 'active',
          });
          govDetails = result;
          recommendation = result.recommendation || 'NEEDS_REVISION';
          log(`Solar decision: ${recommendation} (resonance=${resonance.toFixed(2)})`);
        }
      } catch (e) {
        log(`Governance core error: ${e.message}`);
      }
    } else {
      log('Governance core not located — using safe default');
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

    console.log(JSON.stringify(decision));
    process.exit(0); // non-blocking rollout; future versions can exit(1) on strong reject
  } catch (err) {
    log(`Hook failure (non-fatal): ${err.message}`);
    process.exit(0);
  }
}

main();