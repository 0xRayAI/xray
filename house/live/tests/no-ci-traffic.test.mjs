// Hotfix: CI is not work, so CI kinds are filtered out of board traffic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
test('CI kinds are not shown', () => {
  assert.match(src, /const CI_KINDS = new Set\(\['check_run', 'check_suite', 'workflow_run', 'ci_pass', 'ci_fail'\]\)/);
  assert.match(src, /const isTraffic = e => !CI_KINDS\.has\(e\.kind\)/);
});
