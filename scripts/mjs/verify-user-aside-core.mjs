#!/usr/bin/env node
/**
 * verify-user-aside-core — user aside SSOT + spawn routing.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveUserAsideBoot } from '../../dist/integrations/hooks/user-aside-hook-runtime.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

function dist(rel) {
  return join(packageRoot, 'dist', rel);
}

const {
  buildUserAsidePlan,
  saveUserAside,
  setActiveAsideId,
  clearActiveAside,
  getActiveAsideId,
  isUserAsideTodoId,
  assertSafeAsideId,
  UserAsideValidationError,
  getUserAsideBootHints,
} = await import(dist('nucleus/user-aside.js'));
const { resolveSpawnPlan } = await import(dist('nucleus/spawn-plan-resolution.js'));
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
  const namespaced = 'suit-nft.a.1.1';
  if (!isUserAsideTodoId(namespaced)) fail('step 1: namespaced todo pattern');
  else pass('step 1: namespaced todo pattern');

  try {
    assertSafeAsideId('../bad');
    fail('step 2: path rejection');
  } catch (err) {
    if (err instanceof UserAsideValidationError) pass('step 2: rejects unsafe aside id');
    else fail('step 2: path rejection', String(err));
  }

  const aside = buildUserAsidePlan(
    'suit-nft',
    'Suit NFT',
    'Mint on Base',
    [{ description: 'Groover proof', type: 'research' }],
    35,
    tmp,
  );
  if (aside?.plan.phases[0]?.todos[0]?.id !== 'suit-nft.a.1.1') {
    fail('step 3: build aside plan', aside?.plan.phases[0]?.todos[0]?.id);
  } else pass('step 3: namespaced aside todos');

  saveUserAside(aside, tmp);
  setActiveAsideId('suit-nft', tmp, 'verify-session');
  if (getActiveAsideId(tmp, 'verify-session') !== 'suit-nft') fail('step 4: active pointer');
  else pass('step 4: active aside pointer with session');

  const todo = aside.plan.phases[0].todos[0];
  const resolved = resolveSpawnPlan({ planTodoId: todo.id }, tmp, 'verify-session');
  if (resolved.source !== 'aside') fail('step 5: resolve spawn plan', JSON.stringify(resolved));
  else pass('step 5: spawn plan resolves to aside');

  const validation = validateSpawnMatchesTodo(
    { planTodoId: todo.id, subagent_type: todo.subagent, prompt: todo.id },
    tmp,
    undefined,
    'verify-session',
  );
  if (!validation.valid) fail('step 6: spawn gate', validation.reason);
  else pass('step 6: spawn gate accepts aside todo');

  const boot = getUserAsideBootHints(tmp, 'verify-session');
  if (!boot?.activeAside) fail('step 7: boot hints', JSON.stringify(boot));
  else pass('step 7: session-boot hints from getUserAsideBootHints');

  const hookBoot = getActiveUserAsideBoot(tmp, 'verify-session');
  if (!hookBoot?.activeAside) fail('step 8: hook runtime', JSON.stringify(hookBoot));
  else pass('step 8: user-aside-hook-runtime import');

  clearActiveAside(tmp);
  if (getActiveAsideId(tmp) !== null) fail('step 9: clear active');
  else pass('step 9: clear active aside');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(
  `\n${failed === 0 ? `✅ verify-user-aside-core ${passed}/${passed}` : `⚠️  ${failed} user-aside check(s) failed`}\n`,
);
process.exit(failed > 0 ? 1 : 0);