#!/usr/bin/env node
/**
 * Confer quorum fixture.
 * PASS completes. FAIL and no-LLM UNREVIEWED leave the todo open and the checkpoint due.
 * Temp projects opt into synthesis so a due checkpoint can be observed. The repo default stays off.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

// Fixture PASS is refused unless this process is a test. The live orchestrate-task
// flag and XRAY_CONFER_FIXTURE stay unreachable when NODE_ENV is not test.
process.env.NODE_ENV = 'test';

const { buildSynthesisCheckpointPlan } = await import(
  join(packageRoot, 'dist/nucleus/autonomy-kernel.js')
);
const { savePersistedLeadDevPlan, areSynthesisConsultTodosComplete, loadPersistedLeadDevPlan } = await import(
  join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js')
);
const { recordExecutionSlice, isSynthesisCheckpointDue } = await import(
  join(packageRoot, 'dist/nucleus/synthesis.js')
);
const { runConferQuorum, loadConferCheckpoint, CONFER_AGENTS } = await import(
  join(packageRoot, 'dist/nucleus/confer.js')
);
const { loadSynthesisConsultReceipt } = await import(
  join(packageRoot, 'dist/nucleus/synthesis-consult-receipt.js')
);
const { readConferReviewHint } = await import(
  join(packageRoot, 'src/integrations/hooks/confer-hook-runtime.mjs')
);
const { buildSessionBootPayload } = await import(
  join(packageRoot, 'src/integrations/grok/hooks/grok-hook-utils.js')
);

let failed = 0;
let checks = 0;
function pass(n) {
  checks++;
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  checks++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function assertRepoSynthesisStaysOff() {
  const source = readFileSync(join(packageRoot, 'src/nucleus/synthesis.ts'), 'utf8');
  const defaults = source.match(/function defaultSynthesisConfig\(\)[\s\S]*?return \{([\s\S]*?)\n  \};/);
  if (defaults && /enabled:\s*false/.test(defaults[1])) pass('repo defaultSynthesisConfig stays enabled: false');
  else fail('repo defaultSynthesisConfig stays enabled: false');

  for (const rel of ['xray/features.json', '.xray/features.json']) {
    const data = JSON.parse(readFileSync(join(packageRoot, rel), 'utf8'));
    if (data.synthesis?.enabled === false) pass(`${rel} synthesis.enabled stays false`);
    else fail(`${rel} synthesis.enabled stays false`, JSON.stringify(data.synthesis));
  }
}

function makeProject() {
  const tmp = mkdtempSync(join(tmpdir(), 'xray-confer-verify-'));
  mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(tmp, '.xray', 'features.json'),
    JSON.stringify({
      multi_agent_orchestration: { lead_dev_mode: true, confer_on_synthesis: true },
      synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
    }),
  );
  return tmp;
}

function seedDuePlan(tmp, sessionId) {
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  const due = isSynthesisCheckpointDue(tmp, sessionId);
  const plan = buildSynthesisCheckpointPlan('gate threshold (1/1)', tmp);
  if (plan) {
    savePersistedLeadDevPlan(
      { ...plan, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
  }
  return { due, plan };
}

function blocksCheckpoint(label, tmp, sessionId, result, verdict) {
  const receipt = loadSynthesisConsultReceipt('s.1', tmp);
  if (result.status === 'partial' && result.agents[0]?.verdict === verdict && result.agents[0]?.todoCompleted === false) {
    pass(`${label}: quorum stopped on ${verdict}`);
  } else {
    fail(`${label}: quorum stopped on ${verdict}`, JSON.stringify(result));
  }
  if (receipt?.verdict === verdict) pass(`${label}: receipt verdict ${verdict}`);
  else fail(`${label}: receipt verdict ${verdict}`, JSON.stringify(receipt));
  if (!areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp))) {
    pass(`${label}: consult todo stays open`);
  } else {
    fail(`${label}: consult todo stays open`);
  }
  if (isSynthesisCheckpointDue(tmp, sessionId)) pass(`${label}: synthesis checkpoint stays due`);
  else fail(`${label}: synthesis checkpoint stays due`);
  const state = loadConferCheckpoint(tmp);
  if (state?.status === 'failed') pass(`${label}: confer checkpoint not cleared`);
  else fail(`${label}: confer checkpoint not cleared`, JSON.stringify(state));
}

assertRepoSynthesisStaysOff();

const passRoot = makeProject();
const passSession = 'verify-confer-core-pass';
try {
  const seeded = seedDuePlan(passRoot, passSession);
  if (!seeded.due) fail('step 1: synthesis due');
  else pass('step 1: synthesis checkpoint due');
  if (!seeded.plan) fail('step 2: synthesis plan');
  else pass('step 2: synthesis plan persisted');

  if (CONFER_AGENTS.length !== 3) fail('step 3: confer agent count', String(CONFER_AGENTS.length));
  else pass('step 3: three confer agents defined');

  const result = await runConferQuorum(passRoot, passSession, {
    collocatedText: 'verify confer fixture context',
    dueReason: 'gate threshold',
    fixture: true,
  });

  if (result.status === 'completed' && result.agents.length === 3) {
    pass('step 4: confer quorum completed all agents');
  } else {
    fail('step 4: confer quorum', JSON.stringify(result));
  }

  const state = loadConferCheckpoint(passRoot);
  if (state?.status === 'completed' && state.completedAgents.length === 3) {
    pass('step 5: confer checkpoint state completed');
  } else {
    fail('step 5: confer state', JSON.stringify(state));
  }

  if (areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(passRoot))) {
    pass('step 6: synthesis consult todos complete after confer');
  } else {
    fail('step 6: consult todos incomplete');
  }

  if (!isSynthesisCheckpointDue(passRoot, passSession)) pass('step 7: synthesis checkpoint cleared');
  else fail('step 7: checkpoint still due');
} finally {
  rmSync(passRoot, { recursive: true, force: true });
}

const failRoot = makeProject();
const failSession = 'verify-confer-core-fail';
try {
  seedDuePlan(failRoot, failSession);
  const result = await runConferQuorum(failRoot, failSession, {
    fixture: true,
    fixtureVerdict: 'FAIL',
  });
  blocksCheckpoint('FAIL', failRoot, failSession, result, 'FAIL');
} finally {
  rmSync(failRoot, { recursive: true, force: true });
}

const unreviewedRoot = makeProject();
const unreviewedSession = 'verify-confer-core-unreviewed';
try {
  seedDuePlan(unreviewedRoot, unreviewedSession);
  const result = await runConferQuorum(unreviewedRoot, unreviewedSession, {
    fixture: true,
    fixtureNoLlm: true,
  });
  blocksCheckpoint('no-LLM', unreviewedRoot, unreviewedSession, result, 'UNREVIEWED');
  if (readConferReviewHint(unreviewedRoot) === 'UNREVIEWED') {
    pass('no-LLM: confer review hint is UNREVIEWED');
  } else {
    fail('no-LLM: confer review hint is UNREVIEWED');
  }
  const boot = buildSessionBootPayload(unreviewedRoot, 'verify/session-start');
  if (boot.conferReview === 'UNREVIEWED' && String(boot.conferReviewHint).includes('UNREVIEWED')) {
    pass('no-LLM: session-boot hint records UNREVIEWED');
  } else {
    fail('no-LLM: session-boot hint records UNREVIEWED', JSON.stringify({
      conferReview: boot.conferReview,
      conferReviewHint: boot.conferReviewHint,
    }));
  }
} finally {
  rmSync(unreviewedRoot, { recursive: true, force: true });
}

const conditionalRoot = makeProject();
const conditionalSession = 'verify-confer-core-conditional';
try {
  seedDuePlan(conditionalRoot, conditionalSession);
  const result = await runConferQuorum(conditionalRoot, conditionalSession, {
    fixture: true,
    fixtureVerdict: 'CONDITIONAL',
  });
  const verdicts = result.agents.map((agent) => agent.verdict);
  if (result.status === 'partial' && verdicts[0] === 'CONDITIONAL' && result.agents[0]?.todoCompleted === false) {
    pass('CONDITIONAL: explicit conditional does not complete');
  } else {
    fail('CONDITIONAL: explicit conditional does not complete', JSON.stringify(result));
  }
  if (isSynthesisCheckpointDue(conditionalRoot, conditionalSession)) {
    pass('CONDITIONAL: checkpoint stays due');
  } else {
    fail('CONDITIONAL: checkpoint stays due');
  }
} finally {
  rmSync(conditionalRoot, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? `🎉 Confer verify passed (${checks}/${checks}).`
      : `⚠️  ${failed} confer check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);
