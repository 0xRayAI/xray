#!/usr/bin/env node
/**
 * Confer quorum fixture — PASS completes; FAIL blocks; CONDITIONAL completes;
 * UNREVIEWED is recorded and blocks only under strict temperament.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { buildSynthesisCheckpointPlan } = await import(
  join(packageRoot, 'dist/nucleus/autonomy-kernel.js')
);
const {
  savePersistedLeadDevPlan,
  loadPersistedLeadDevPlan,
  areSynthesisConsultTodosComplete,
  getSynthesisConsultTodos,
} = await import(join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js'));
const { recordExecutionSlice, isSynthesisCheckpointDue } = await import(
  join(packageRoot, 'dist/nucleus/synthesis.js')
);
const { runConferQuorum, loadConferCheckpoint, conferUnreviewedBootHint, CONFER_AGENTS } =
  await import(join(packageRoot, 'dist/nucleus/confer.js'));

const sessionId = 'verify-confer-core';
let failed = 0;
let passed = 0;
function pass(n) {
  passed++;
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const roots = [];

function makeRoot(extra = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'xray-confer-verify-'));
  roots.push(tmp);
  mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(tmp, '.xray', 'features.json'),
    JSON.stringify({
      multi_agent_orchestration: { lead_dev_mode: true, confer_on_synthesis: true },
      synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
      ...extra,
    }),
  );
  return tmp;
}

function persistPlan(tmp) {
  const plan = buildSynthesisCheckpointPlan('gate threshold', tmp);
  if (!plan) return null;
  savePersistedLeadDevPlan(
    { ...plan, persistedAt: new Date().toISOString(), sessionId },
    tmp,
  );
  return plan;
}

function consultTodoStatus(tmp, todoId) {
  const plan = loadPersistedLeadDevPlan(tmp);
  if (!plan) return null;
  return getSynthesisConsultTodos(plan).find((todo) => todo.id === todoId)?.status ?? null;
}

try {
  const tmp = makeRoot();
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  if (!isSynthesisCheckpointDue(tmp, sessionId)) fail('step 1: synthesis due');
  else pass('step 1: synthesis checkpoint due');

  const plan = persistPlan(tmp);
  if (!plan) fail('step 2: synthesis plan');
  else pass('step 2: synthesis plan persisted');

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

  if (areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp))) {
    pass('step 6: synthesis consult todos complete after confer');
  } else {
    fail('step 6: consult todos incomplete');
  }

  if (!isSynthesisCheckpointDue(tmp, sessionId)) pass('step 7: synthesis checkpoint cleared');
  else fail('step 7: checkpoint still due');

  const failRoot = makeRoot();
  recordExecutionSlice('gate', { projectRoot: failRoot, sessionId });
  if (!persistPlan(failRoot)) fail('step 8: FAIL plan');
  const failResult = await runConferQuorum(failRoot, sessionId, {
    collocatedText: 'verify confer FAIL fixture',
    dueReason: 'gate threshold',
    fixture: true,
    fixtureVerdict: 'FAIL',
  });
  const failReceiptPath = join(failRoot, '.xray', 'state', 'synthesis-consult-s.1.json');
  const failReceipt = JSON.parse(readFileSync(failReceiptPath, 'utf8'));
  const failCheckpoint = loadConferCheckpoint(failRoot);
  if (
    failResult.status === 'partial' &&
    failResult.agents[0]?.verdict === 'FAIL' &&
    failResult.agents[0]?.todoCompleted === false &&
    failReceipt.verdict === 'FAIL' &&
    consultTodoStatus(failRoot, 's.1') !== 'completed' &&
    failCheckpoint?.status === 'failed' &&
    isSynthesisCheckpointDue(failRoot, sessionId)
  ) {
    pass('step 8: FAIL blocks — todo stays open and checkpoint does not clear');
  } else {
    fail(
      'step 8: FAIL did not block',
      JSON.stringify({
        status: failResult.status,
        verdict: failResult.agents[0]?.verdict,
        todoCompleted: failResult.agents[0]?.todoCompleted,
        todo: consultTodoStatus(failRoot, 's.1'),
        checkpoint: failCheckpoint?.status,
        due: isSynthesisCheckpointDue(failRoot, sessionId),
      }),
    );
  }

  const conditionalRoot = makeRoot();
  recordExecutionSlice('gate', { projectRoot: conditionalRoot, sessionId });
  if (!persistPlan(conditionalRoot)) fail('step 9: CONDITIONAL plan');
  const conditionalResult = await runConferQuorum(conditionalRoot, sessionId, {
    fixture: true,
    fixtureVerdict: 'CONDITIONAL',
  });
  if (
    conditionalResult.status === 'completed' &&
    conditionalResult.agents.length === 3 &&
    conditionalResult.agents.every((agent) => agent.verdict === 'CONDITIONAL' && agent.todoCompleted) &&
    loadConferCheckpoint(conditionalRoot)?.status === 'completed' &&
    !isSynthesisCheckpointDue(conditionalRoot, sessionId)
  ) {
    pass('step 9: CONDITIONAL completes and clears the checkpoint');
  } else {
    fail('step 9: CONDITIONAL', JSON.stringify(conditionalResult));
  }

  const unreviewedRoot = makeRoot();
  recordExecutionSlice('gate', { projectRoot: unreviewedRoot, sessionId });
  if (!persistPlan(unreviewedRoot)) fail('step 10: UNREVIEWED plan');
  const unreviewedResult = await runConferQuorum(unreviewedRoot, sessionId, {
    fixture: true,
    fixtureVerdict: 'UNREVIEWED',
  });
  const hint = conferUnreviewedBootHint(unreviewedRoot);
  const { buildSessionBootPayload } = await import(
    join(packageRoot, 'src/integrations/grok/hooks/grok-hook-utils.js')
  );
  const boot = buildSessionBootPayload(unreviewedRoot, 'verify/confer');
  if (
    unreviewedResult.status === 'completed' &&
    unreviewedResult.agents.every((agent) => agent.verdict === 'UNREVIEWED' && agent.todoCompleted) &&
    !isSynthesisCheckpointDue(unreviewedRoot, sessionId) &&
    hint?.conferUnreviewed === true &&
    typeof hint.conferUnreviewedHint === 'string' &&
    hint.conferUnreviewedHint.includes('UNREVIEWED') &&
    boot.conferUnreviewed === true &&
    boot.conferUnreviewedHint === hint.conferUnreviewedHint
  ) {
    pass('step 10: UNREVIEWED recorded, session-boot hint set, default quorum still completes');
  } else {
    fail(
      'step 10: UNREVIEWED default',
      JSON.stringify({
        status: unreviewedResult.status,
        verdicts: unreviewedResult.agents.map((agent) => agent.verdict),
        hint,
        bootHint: boot.conferUnreviewedHint ?? null,
      }),
    );
  }

  const strictRoot = makeRoot({ suit_temperament: { profile: 'strict' } });
  recordExecutionSlice('gate', { projectRoot: strictRoot, sessionId });
  if (!persistPlan(strictRoot)) fail('step 11: strict plan');
  const strictResult = await runConferQuorum(strictRoot, sessionId, {
    fixture: true,
    fixtureVerdict: 'UNREVIEWED',
  });
  const strictHint = conferUnreviewedBootHint(strictRoot);
  const strictCheckpoint = loadConferCheckpoint(strictRoot);
  if (
    strictResult.status === 'partial' &&
    strictResult.agents[0]?.verdict === 'UNREVIEWED' &&
    strictResult.agents[0]?.todoCompleted === false &&
    consultTodoStatus(strictRoot, 's.1') !== 'completed' &&
    strictCheckpoint?.status === 'failed' &&
    isSynthesisCheckpointDue(strictRoot, sessionId) &&
    strictHint?.conferUnreviewedHint?.includes('keeps the todo open')
  ) {
    pass('step 11: strict UNREVIEWED keeps the todo open and does not clear the checkpoint');
  } else {
    fail(
      'step 11: strict UNREVIEWED',
      JSON.stringify({
        status: strictResult.status,
        todoCompleted: strictResult.agents[0]?.todoCompleted,
        todo: consultTodoStatus(strictRoot, 's.1'),
        checkpoint: strictCheckpoint?.status,
        due: isSynthesisCheckpointDue(strictRoot, sessionId),
        hint: strictHint?.conferUnreviewedHint ?? null,
      }),
    );
  }
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? `🎉 Confer verify passed (${passed}/${passed}).`
      : `⚠️  ${failed} confer check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);
