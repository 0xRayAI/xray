#!/usr/bin/env node
/**
 * Confer quorum fixture — 3-agent synthesis consult completes via fixture mode.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { buildSynthesisCheckpointPlan } = await import(
  join(packageRoot, 'dist/nucleus/autonomy-kernel.js')
);
const { savePersistedLeadDevPlan, areSynthesisConsultTodosComplete } = await import(
  join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js')
);
const { recordExecutionSlice, isSynthesisCheckpointDue } = await import(
  join(packageRoot, 'dist/nucleus/synthesis.js')
);
const { runConferQuorum, loadConferCheckpoint, CONFER_AGENTS } = await import(
  join(packageRoot, 'dist/nucleus/confer.js')
);

const sessionId = 'verify-confer-core';
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-confer-verify-'));
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    multi_agent_orchestration: { lead_dev_mode: true, confer_on_synthesis: true },
    synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
  }),
);

try {
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  if (!isSynthesisCheckpointDue(tmp, sessionId)) fail('step 1: synthesis due');
  else pass('step 1: synthesis checkpoint due');

  const plan = buildSynthesisCheckpointPlan('gate threshold (1/1)');
  if (!plan) fail('step 2: synthesis plan');
  else {
    savePersistedLeadDevPlan(
      { ...plan, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    pass('step 2: synthesis plan persisted');
  }

  if (CONFER_AGENTS.length !== 3) fail('step 3: confer agent count', String(CONFER_AGENTS.length));
  else pass('step 3: three confer agents defined');

  const result = await runConferQuorum(tmp, sessionId, {
    collocatedText: 'verify confer fixture context',
    dueReason: 'gate threshold',
    fixture: true,
  });

  if (result.status === 'completed' && result.agents.length === 3) {
    pass('step 4: confer quorum completed all agents');
  } else {
    fail('step 4: confer quorum', JSON.stringify(result));
  }

  const state = loadConferCheckpoint(tmp);
  if (state?.status === 'completed' && state.completedAgents.length === 3) {
    pass('step 5: confer checkpoint state completed');
  } else {
    fail('step 5: confer state', JSON.stringify(state));
  }

  if (areSynthesisConsultTodosComplete(
    (await import(join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js'))).loadPersistedLeadDevPlan(tmp),
  )) {
    pass('step 6: synthesis consult todos complete after confer');
  } else {
    fail('step 6: consult todos incomplete');
  }

  if (!isSynthesisCheckpointDue(tmp, sessionId)) pass('step 7: synthesis checkpoint cleared');
  else fail('step 7: checkpoint still due');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Confer verify passed (7/7).'
      : `⚠️  ${failed} confer check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);