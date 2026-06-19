#!/usr/bin/env node
/**
 * Synthesis E2E fixture — gate due → plan → consult todos → checkpoint clear.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const { recordExecutionSlice, isSynthesisCheckpointDue, loadSynthesisCheckpointState } =
  await import(join(packageRoot, 'dist/nucleus/synthesis.js'));
const { buildSynthesisCheckpointPlan } = await import(
  join(packageRoot, 'dist/nucleus/autonomy-kernel.js')
);
const {
  savePersistedLeadDevPlan,
  updatePlanTodoStatus,
  getSynthesisConsultTodos,
} = await import(join(packageRoot, 'dist/nucleus/lead-dev-plan-persistence.js'));
const { evaluateSynthesisGate } = await import(
  join(packageRoot, 'dist/nucleus/delegation-gate.js')
);

const sessionId = 'verify-synthesis-e2e';
const features = { lead_dev_mode: true, auto_chain_delegations: true };
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-e2e-'));
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
  if (!isSynthesisCheckpointDue(tmp, sessionId)) fail('step 1: gate due');
  else pass('step 1: gate triggers synthesis due');

  const writeBlock = evaluateSynthesisGate(
    'write',
    { path: 'src/foo.ts' },
    { projectRoot: tmp, sessionId, features },
  );
  if (!writeBlock.allow) pass('step 2: writes blocked while due');
  else fail('step 2: write block');

  const governBlock = evaluateSynthesisGate(
    'CallMcpTool',
    {
      server: 'xray-orchestrator',
      toolName: 'govern-and-apply',
      arguments: { proposals: [] },
    },
    { projectRoot: tmp, sessionId, features },
  );
  if (!governBlock.allow) pass('step 3: govern-and-apply blocked while due');
  else fail('step 3: govern block');

  const plan = buildSynthesisCheckpointPlan('gate threshold (1/1)');
  if (!plan) fail('step 4: synthesis plan');
  else {
    savePersistedLeadDevPlan(
      { ...plan, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    pass('step 4: realignment plan persisted');
  }

  const todos = getSynthesisConsultTodos(plan);
  if (todos.length !== 3) fail('step 5: consult todo count', String(todos.length));
  else pass('step 5: three mandatory consult todos');

  for (const todo of todos) {
    const spawn = evaluateSynthesisGate(
      'Task',
      {
        prompt: `Synthesis consult ${todo.subagent} plan todo ${todo.id}`,
        subagent_type: todo.subagent,
        planTodoId: todo.id,
      },
      { projectRoot: tmp, sessionId, features },
    );
    if (!spawn.allow) fail(`step 6: spawn ${todo.id}`, JSON.stringify(spawn));
    updatePlanTodoStatus(todo.id, 'completed', tmp);
  }
  pass('step 6: consult spawns allowed and todos completed');

  if (!isSynthesisCheckpointDue(tmp, sessionId)) pass('step 7: checkpoint cleared');
  else fail('step 7: checkpoint still due');

  const state = loadSynthesisCheckpointState(tmp);
  if (state && state.synthesisCount === 1) pass('step 8: synthesisCount incremented');
  else fail('step 8: synthesisCount', JSON.stringify(state?.synthesisCount));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Synthesis E2E verify passed (8/8).'
      : `⚠️  ${failed} E2E check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);