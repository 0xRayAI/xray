#!/usr/bin/env node
/**
 * Shared 4/4 delegation gate fixture against nucleus SSOT (any host adapter).
 * Usage: node scripts/mjs/verify-delegation-gate-core.mjs [--host=grok|hermes|opencode]
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIXTURE_SESSION_ID,
  seedDelegationGateFixture,
  seedSpawnTodoPlan,
} from './delegation-gate-fixture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const hostArg = process.argv.find((a) => a.startsWith('--host='));
const host = hostArg?.split('=')[1] || 'generic';

const { evaluatePreToolGate, loadDelegationGateFeatures } = await import(
  join(packageRoot, 'dist/integrations/hooks/delegation-gate-runtime.mjs')
);

const WRITE_TOOL =
  host === 'hermes' ? 'write_file' : host === 'opencode' ? 'write' : 'search_replace';
const READ_TOOL = host === 'hermes' ? 'read_file' : 'read_file';
const SPAWN_TOOL =
  host === 'hermes' ? 'delegate_task' : host === 'opencode' ? 'task' : 'Task';

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-gate-core-'));
seedDelegationGateFixture(tmp);

const ctx = () => ({
  projectRoot: tmp,
  sessionId: FIXTURE_SESSION_ID,
  features: loadDelegationGateFeatures(tmp),
  host,
});

try {
  const deny = evaluatePreToolGate(
    WRITE_TOOL,
    host === 'opencode'
      ? { filePath: 'src/a.ts', content: 'x' }
      : { path: 'src/a.ts', new_string: 'x', content: 'x' },
    ctx(),
  );
  if (!deny.allow && deny.gate === 'auto-chain-pending') {
    pass('denies write while pending');
  } else {
    fail('write deny', JSON.stringify(deny));
  }

  const allowRead = evaluatePreToolGate(READ_TOOL, { path: 'src/a.ts' }, ctx());
  if (allowRead.allow) pass('allows read while pending');
  else fail('read allow', JSON.stringify(allowRead));

  const allowSpawn = evaluatePreToolGate(
    SPAWN_TOOL,
    { prompt: 'plan todo 2.1 swap deps', subagent_type: 'backend-engineer' },
    ctx(),
  );
  if (allowSpawn.allow) pass('allows spawn while pending');
  else fail('spawn allow', JSON.stringify(allowSpawn));

  seedSpawnTodoPlan(tmp);
  const denyWrongTodo = evaluatePreToolGate(
    SPAWN_TOOL,
    { prompt: 'explore only', subagent_type: 'explore' },
    ctx(),
  );
  if (!denyWrongTodo.allow && denyWrongTodo.gate === 'spawn-todo-persistence') {
    pass('denies spawn skipping required plan todo');
  } else {
    fail('spawn todo persistence', JSON.stringify(denyWrongTodo));
  }

  const staleTmp = mkdtempSync(join(tmpdir(), 'xray-gate-stale-'));
  const staleAt = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
  mkdirSync(join(staleTmp, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(staleTmp, '.xray', 'features.json'),
    JSON.stringify({
      multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
    }),
  );
  writeFileSync(
    join(staleTmp, '.xray', 'state', 'lead-dev-plan.json'),
    JSON.stringify({
      active: true,
      persistedAt: staleAt,
      phases: [
        {
          id: 'phase-1',
          todos: [
            {
              id: '1.1',
              task: 'stale unstarted todo',
              subagent: 'researcher',
              status: 'pending',
            },
          ],
        },
      ],
    }),
  );
  const denyStale = evaluatePreToolGate(
    SPAWN_TOOL,
    { prompt: 'plan todo 1.1 consult', subagent_type: 'researcher' },
    {
      projectRoot: staleTmp,
      sessionId: FIXTURE_SESSION_ID,
      features: loadDelegationGateFeatures(staleTmp),
      host,
    },
  );
  if (!denyStale.allow && denyStale.gate === 'spawn-plan-stale') {
    pass('denies spawn when lead-dev plan is stale');
  } else {
    fail('spawn plan stale', JSON.stringify(denyStale));
  }
  rmSync(staleTmp, { recursive: true, force: true });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const label = host === 'generic' ? 'core' : host;
console.log(
  '\n' +
    (failed === 0
      ? `🎉 Delegation gate verify passed (5/5) [${label}].`
      : `⚠️  ${failed} gate check(s) failed [${label}].`),
);
process.exit(failed === 0 ? 0 : 1);