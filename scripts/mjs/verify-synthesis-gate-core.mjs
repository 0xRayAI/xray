#!/usr/bin/env node
/**
 * Synthesis PR2 fixture — pre-tool gate deny + orchestrator consult allow.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { evaluatePreToolGate, evaluateSynthesisGate } = await import(
  join(packageRoot, 'dist/nucleus/delegation-gate.js')
);
const { recordExecutionSlice } = await import(join(packageRoot, 'dist/nucleus/synthesis.js'));

const sessionId = 'verify-synthesis-gate';
const features = { lead_dev_mode: true, auto_chain_delegations: true };
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-gate-'));
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
  }),
);

try {
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });

  const writeBlock = evaluateSynthesisGate(
    'search_replace',
    { path: 'src/foo.ts' },
    { projectRoot: tmp, sessionId, features },
  );
  if (!writeBlock.allow && writeBlock.gate === 'synthesis-checkpoint') {
    pass('denies write when synthesis due');
  } else {
    fail('write deny', JSON.stringify(writeBlock));
  }

  const consult = evaluatePreToolGate(
    'CallMcpTool',
    {
      server: 'xray-orchestrator',
      toolName: 'analyze-complexity',
      arguments: { tasks: [{ description: 'synthesis reflect', type: 'plan' }] },
    },
    { projectRoot: tmp, sessionId, features },
  );
  if (consult.allow) pass('allows analyze-complexity consult');
  else fail('consult allow', JSON.stringify(consult));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Synthesis gate verify passed (2/2).'
      : `⚠️  ${failed} synthesis gate check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);