#!/usr/bin/env node
/**
 * Synthesis P1 outcome fixture — analyze does not clear; consult todos clear checkpoint.
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
const { buildSynthesisCheckpointPlan } = await import(
  join(packageRoot, 'dist/nucleus/autonomy-kernel.js')
);
const {
  savePersistedLeadDevPlan,
  updatePlanTodoStatus,
  getSynthesisConsultTodos,
} = await import(join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js'));
const { writeSynthesisConsultReceipt } = await import(
  join(packageRoot, 'dist/nucleus/synthesis-consult-receipt.js'),
);

const sessionId = 'verify-synthesis-outcome';
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-outcome-'));
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    multi_agent_orchestration: { lead_dev_mode: true, auto_consult_major_work: true },
    synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
  }),
);

try {
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  if (!isSynthesisCheckpointDue(tmp, sessionId)) fail('checkpoint due after gate');
  else pass('checkpoint due after gate');

  const plan = buildSynthesisCheckpointPlan('gate threshold (1/1)');
  savePersistedLeadDevPlan(
    { ...plan, persistedAt: new Date().toISOString(), sessionId },
    tmp,
  );
  if (!isSynthesisCheckpointDue(tmp, sessionId)) fail('still due after plan persist');
  else pass('still due after realignment plan persisted');

  const todos = getSynthesisConsultTodos(plan);
  for (const todo of todos) {
    writeSynthesisConsultReceipt(
      todo.id,
      {
        sessionId,
        subagent: todo.subagent,
        verdict: 'PASS',
        topRisks: [],
        hardeningNote: 'verify fixture receipt',
      },
      tmp,
    );
    if (!updatePlanTodoStatus(todo.id, 'completed', tmp)) {
      fail('consult todo completion', todo.id);
    }
  }

  if (!isSynthesisCheckpointDue(tmp, sessionId)) pass('checkpoint cleared after consult todos');
  else fail('checkpoint clear', 'still due after todos');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Synthesis outcome verify passed (3/3).'
      : `⚠️  ${failed} outcome check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);