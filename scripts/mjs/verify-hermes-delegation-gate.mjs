#!/usr/bin/env node
/**
 * Hermes bridge delegation gate fixture (4/4) — uses bridge delegation-gate command.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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
const bridge = join(packageRoot, 'dist/integrations/hermes-agent/bridge.mjs');

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function runBridge(payload, cwd) {
  const json = JSON.stringify(payload).replace(/'/g, "'\\''");
  const out = execSync(`node "${bridge}" delegation-gate --cwd "${cwd}" '${json}'`, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, XRAY_ROOT: cwd },
  });
  return JSON.parse(out.trim());
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-hermes-gate-'));
seedDelegationGateFixture(tmp);

const base = {
  command: 'delegation-gate',
  phase: 'pre',
  sessionId: FIXTURE_SESSION_ID,
  host: 'hermes',
};

try {
  const deny = runBridge({ ...base, tool: 'write_file', args: { path: 'src/a.ts', content: 'x' } }, tmp);
  if (deny.allow === false && deny.gate === 'auto-chain-pending') pass('bridge denies write while pending');
  else fail('write deny', JSON.stringify(deny));

  const allowRead = runBridge({ ...base, tool: 'read_file', args: { path: 'src/a.ts' } }, tmp);
  if (allowRead.allow === true) pass('bridge allows read while pending');
  else fail('read allow', JSON.stringify(allowRead));

  const allowSpawn = runBridge(
    {
      ...base,
      tool: 'delegate_task',
      args: { prompt: 'plan todo 2.1 swap deps', subagent_type: 'backend-engineer' },
    },
    tmp,
  );
  if (allowSpawn.allow === true) pass('bridge allows delegate_task while pending');
  else fail('spawn allow', JSON.stringify(allowSpawn));

  seedSpawnTodoPlan(tmp);
  const denyTodo = runBridge(
    { ...base, tool: 'delegate_task', args: { prompt: 'explore only', subagent_type: 'explore' } },
    tmp,
  );
  if (denyTodo.allow === false && denyTodo.gate === 'spawn-todo-persistence') {
    pass('bridge denies spawn skipping required plan todo');
  } else {
    fail('spawn todo persistence', JSON.stringify(denyTodo));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Hermes delegation gate verify passed (4/4).'
      : `⚠️  ${failed} Hermes gate check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);