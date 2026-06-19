#!/usr/bin/env node
/**
 * Synthesis P2 fixtures — turn threshold, govern-and-apply deny during due.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { recordExecutionSlice, isSynthesisCheckpointDue } = await import(
  join(packageRoot, 'dist/nucleus/synthesis.js')
);
const { evaluateSynthesisGate } = await import(
  join(packageRoot, 'dist/nucleus/delegation-gate.js')
);
const { prepareSynthesisCollocatedContext } = await import(
  join(packageRoot, 'dist/nucleus/synthesis-context.js')
);

const sessionId = 'verify-synthesis-p2';
const features = { lead_dev_mode: true, auto_chain_delegations: true };
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-p2-'));
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    synthesis: { enabled: true, every_n_gates: 0, every_n_turns: 2, every_n_todos_completed: 0 },
  }),
);

try {
  recordExecutionSlice('turn', { projectRoot: tmp, sessionId });
  if (isSynthesisCheckpointDue(tmp, sessionId)) fail('turn due after 1');
  else pass('not due after 1 turn');

  recordExecutionSlice('turn', { projectRoot: tmp, sessionId });
  if (isSynthesisCheckpointDue(tmp, sessionId)) pass('due after turn threshold (2/2)');
  else fail('turn threshold');

  const governBlock = evaluateSynthesisGate(
    'CallMcpTool',
    {
      server: 'xray-orchestrator',
      toolName: 'govern-and-apply',
      arguments: { proposals: [{ id: 'p1', title: 't', description: 'd', type: 'fix', confidence: 0.9, evidence: [] }] },
    },
    { projectRoot: tmp, sessionId, features },
  );
  if (!governBlock.allow && governBlock.gate === 'synthesis-checkpoint') {
    pass('denies govern-and-apply when synthesis due');
  } else {
    fail('govern deny', JSON.stringify(governBlock));
  }

  const analyzeAllow = evaluateSynthesisGate(
    'CallMcpTool',
    {
      server: 'xray-orchestrator',
      toolName: 'analyze-complexity',
      arguments: { tasks: [{ description: 'reflect', type: 'plan' }] },
    },
    { projectRoot: tmp, sessionId, features },
  );
  if (analyzeAllow.allow) pass('allows analyze-complexity when synthesis due');
  else fail('analyze allow', JSON.stringify(analyzeAllow));

  const ctx = await prepareSynthesisCollocatedContext(tmp, 'turn threshold (2/2)');
  if (ctx?.collatedText?.includes('Synthesis')) pass('prepareSynthesisCollocatedContext returns collation');
  else fail('prepare collation', JSON.stringify(ctx));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Synthesis P2 verify passed (5/5).'
      : `⚠️  ${failed} P2 check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);