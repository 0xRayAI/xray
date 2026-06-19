#!/usr/bin/env node
/**
 * Hook fixture verify — PreToolUse delegation gate with seeded pending-delegations.json.
 * Run: node scripts/mjs/verify-grok-delegation-gate.mjs
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIXTURE_SESSION_ID,
  seedDelegationGateFixture,
  seedSpawnTodoPlan,
} from './delegation-gate-fixture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const preToolHook = join(packageRoot, 'dist/integrations/grok/hooks/pre-tool-use.js');

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function runHook(fixture, env = {}) {
  const payload = JSON.stringify(fixture);
  const out = execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${preToolHook}"`, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return JSON.parse(out.trim());
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-gate-verify-'));
seedDelegationGateFixture(tmp);

const baseEnv = {
  GROK_WORKSPACE_ROOT: tmp,
  GROK_SESSION_ID: FIXTURE_SESSION_ID,
};

try {
  const deny = runHook(
    {
      toolName: 'search_replace',
      workspaceRoot: tmp,
      sessionId: 'verify-gate',
      toolInput: { path: 'src/a.ts', new_string: 'x' },
    },
    baseEnv,
  );
  if (deny.decision === 'deny' && deny.gate === 'auto-chain-pending') {
    pass('PreToolUse denies write while pending');
  } else {
    fail('write deny', JSON.stringify(deny));
  }

  const allowRead = runHook(
    {
      toolName: 'read_file',
      workspaceRoot: tmp,
      sessionId: 'verify-gate',
      toolInput: { path: 'src/a.ts' },
    },
    baseEnv,
  );
  if (allowRead.decision === 'allow') pass('PreToolUse allows read while pending');
  else fail('read allow', JSON.stringify(allowRead));

  const allowTask = runHook(
    {
      toolName: 'Task',
      workspaceRoot: tmp,
      sessionId: 'verify-gate',
      toolInput: { prompt: 'plan todo 2.1 swap deps', subagent_type: 'backend-engineer' },
    },
    baseEnv,
  );
  if (allowTask.decision === 'allow') pass('PreToolUse allows Task while pending');
  else fail('Task allow', JSON.stringify(allowTask));

  seedSpawnTodoPlan(tmp);

  const denyWrongTodo = runHook(
    {
      toolName: 'Task',
      workspaceRoot: tmp,
      sessionId: 'verify-gate',
      toolInput: { prompt: 'explore only', subagent_type: 'explore' },
    },
    baseEnv,
  );
  if (denyWrongTodo.decision === 'deny' && denyWrongTodo.gate === 'spawn-todo-persistence') {
    pass('PreToolUse denies spawn skipping required plan todo');
  } else {
    fail('spawn todo persistence', JSON.stringify(denyWrongTodo));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Grok delegation gate verify passed (4/4).'
      : `⚠️  ${failed} gate check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);