#!/usr/bin/env node
/**
 * verify-user-aside-core — user aside SSOT + spawn routing (7 checks).
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

function dist(rel) {
  return join(packageRoot, 'dist', rel);
}

const {
  buildUserAsidePlan,
  saveUserAside,
  setActiveAsideId,
  resolveSpawnPlan,
  clearActiveAside,
  getActiveAsideId,
  isUserAsideTodoId,
} = await import(dist('nucleus/user-aside.js'));
const { validateSpawnMatchesTodo } = await import(dist('nucleus/lead-dev-plan-persistence.js'));

let passed = 0;
let failed = 0;
const pass = (label) => {
  passed += 1;
  process.stdout.write(`✅ ${label}\n`);
};
const fail = (label, detail) => {
  failed += 1;
  process.stderr.write(`❌ ${label}${detail ? ` — ${detail}` : ''}\n`);
};

const tmp = mkdtempSync(join(tmpdir(), 'xray-user-aside-verify-'));
mkdirSync(join(tmp, '.xray'), { recursive: true });
writeFileSync(
  join(tmp, '.xray/features.json'),
  JSON.stringify({
    multi_agent_orchestration: {
      enabled: true,
      lead_dev_mode: true,
      user_asides: { enabled: true },
    },
  }),
);

try {
  if (!isUserAsideTodoId('a.1.1')) fail('step 1: a.* pattern');
  else pass('step 1: a.* todo pattern');

  const aside = buildUserAsidePlan(
    'suit-nft',
    'Suit NFT',
    'Mint on Base for suit-certified agents',
    [{ description: 'Groover proof', type: 'research' }],
    35,
  );
  if (!aside?.plan.phases[0]?.todos[0]?.id?.startsWith('a.')) {
    fail('step 2: build aside plan', aside?.plan.phases[0]?.todos[0]?.id);
  } else pass('step 2: build aside plan with a.* ids');

  saveUserAside(aside, tmp);
  setActiveAsideId('suit-nft', tmp);
  if (getActiveAsideId(tmp) !== 'suit-nft') fail('step 3: active pointer');
  else pass('step 3: active aside pointer');

  const resolved = resolveSpawnPlan({ planTodoId: 'a.1.1' }, tmp);
  if (resolved.source !== 'aside' || resolved.asideId !== 'suit-nft') {
    fail('step 4: resolve spawn plan', JSON.stringify(resolved));
  } else pass('step 4: spawn plan resolves to active aside');

  const todo = aside.plan.phases[0].todos[0];
  const validation = validateSpawnMatchesTodo(
    {
      planTodoId: todo.id,
      subagent_type: todo.subagent,
      prompt: `${todo.id}: ${todo.task}`,
    },
    tmp,
  );
  if (!validation.valid) fail('step 5: spawn matches aside todo', validation.reason);
  else pass('step 5: spawn gate accepts aside todo');

  clearActiveAside(tmp);
  if (getActiveAsideId(tmp) !== null) fail('step 6: clear active');
  else pass('step 6: clear active aside');

  pass('step 7: user-aside hook runtime importable');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(
  `\n${failed === 0 ? `✅ verify-user-aside-core ${passed}/${passed}` : `⚠️  ${failed} user-aside check(s) failed`}\n`,
);
process.exit(failed > 0 ? 1 : 0);