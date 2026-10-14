// Hotfix: board traffic is packets only; state-only kinds and unfinished deploys never burst.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
const isTraffic = new Function(src.match(/const CI_KINDS[^\n]*\n/)[0] + src.match(/const NOT_TRAFFIC[^\n]*\n/)[0] + src.match(/const isTraffic[^\n]*\n/)[0] + 'return isTraffic;')();
test('packets pass, state does not', () => {
  for (const k of ['merged', 'review', 'pr_open', 'pr_comment', 'issue_comment', 'seat_turn', 'pr_commit', 'deploy_fail']) assert.ok(isTraffic({ kind: k }), k);
  for (const k of ['check_run', 'workflow_run', 'commit', 'pr_edit', 'pr_review_requested', 'pr_activity', 'issue_activity']) assert.ok(!isTraffic({ kind: k }), k);
  assert.ok(isTraffic({ kind: 'deploy', state: 'success' }));
  assert.ok(!isTraffic({ kind: 'deploy', state: 'building' }));
});
