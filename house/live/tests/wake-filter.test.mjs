import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWakeState } from '../app/wake-gate.mjs';
import { allowWake, readWakeFilter, filterMode } from '../app/wake-filter.mjs';

const NOW = 1_700_000_000_000;
const on = readWakeFilter({});
function ctx(over = {}) {
  return { now: NOW, state: createWakeState(), owner: '', head: '', ...over };
}
const line = (over) => ({ id: 'l', type: 'pr_comment', repo: 'acme/one', number: 5, title: 't', reason: 'note', ...over });

test('the default is actionable, and a seat can opt back to every wake', () => {
  assert.equal(filterMode(on, 'forge'), 'actionable');
  assert.equal(filterMode(readWakeFilter({ SEAT_WAKE_FILTER: 'all' }), 'forge'), 'all');
  const mixed = readWakeFilter({ SEAT_WAKE_FILTER: JSON.stringify({ mode: 'actionable', seats: { blinky: 'all' } }) });
  assert.equal(filterMode(mixed, 'blinky'), 'all');
  assert.equal(filterMode(mixed, 'forge'), 'actionable');
  assert.equal(allowWake(mixed, 'blinky', line({ type: 'pr_open' }), ctx()).allow, true);
});

test('a mention or an owner prompt wakes, and a bare comment does not', () => {
  assert.equal(allowWake(on, 'forge', line({ title: 'please @forge' }), ctx()).allow, true);
  assert.equal(allowWake(on, 'forge', line({ mentions: ['forge'] }), ctx()).allow, true);
  assert.equal(allowWake(on, 'critic', line({ type: 'prompt', kind: 'seat_prompt' }), ctx()).allow, true);
  const bare = allowWake(on, 'forge', line({ type: 'issue_comment', title: 'hello' }), ctx());
  assert.deepEqual(bare, { allow: false, reason: 'filter' });
  for (const type of ['pr_update', 'pr_open', 'issue_open', 'deploy', 'cloud_finished', 'cloud_reply']) {
    assert.equal(allowWake(on, 'forge', line({ type }), ctx()).allow, false, type);
  }
});

test('a review or a current-head ci_fail wakes only the owner', () => {
  const own = ctx({ owner: 'forge', head: 'abc123' });
  assert.equal(allowWake(on, 'forge', line({ type: 'critic_pass', sha: 'abc123' }), own).allow, true);
  assert.equal(allowWake(on, 'forge', line({ type: 'critic_fail', sha: 'abc123' }), own).allow, true);
  assert.equal(allowWake(on, 'critic', line({ type: 'critic_fail', sha: 'abc123' }), own).allow, false);
  assert.equal(allowWake(on, 'forge', line({ type: 'ci_fail', sha: 'abc123' }), own).allow, true);
  assert.equal(allowWake(on, 'forge', line({ type: 'ci_fail', sha: 'old' }), own).allow, false);
  assert.equal(allowWake(on, 'forge', line({ type: 'ci_fail', sha: 'abc123', conclusion: 'cancelled' }), own).allow, false);
});

test('critic gets one green head, and near or mill get an R assignment', () => {
  const state = createWakeState();
  const green = line({ type: 'ci_pass', sha: 'abc', repo: 'acme/one', number: 9 });
  assert.equal(allowWake(on, 'critic', green, ctx({ state })).allow, true);
  assert.equal(allowWake(on, 'critic', green, ctx({ state })).allow, false);
  assert.equal(allowWake(on, 'forge', green, ctx({ state, owner: 'forge' })).allow, false);
  assert.equal(allowWake(on, 'mill', line({ reason: 'packet R' }), ctx()).allow, true);
  assert.equal(allowWake(on, 'near', line({ raci: 'R=near A=forge' }), ctx()).allow, true);
  assert.equal(allowWake(on, 'forge', line({ reason: 'packet R' }), ctx()).allow, false);
});

test('a ladder nudge and the stall clock still wake', () => {
  assert.equal(allowWake(on, 'forge', line({ type: 'nudge', reason: 'nudge L1: stale' }), ctx()).allow, true);
  assert.equal(allowWake(on, 'critic', line({ type: 'timed_run', id: 'clock:1:critic' }), ctx()).allow, true);
});

test('a second station nudge inside the hour is filtered', () => {
  const state = createWakeState();
  const nudge = line({ id: 'nudge:station:forge:2026-11-16T04', type: 'station' });
  assert.equal(allowWake(on, 'forge', nudge, ctx({ state })).allow, true);
  assert.equal(allowWake(on, 'forge', nudge, ctx({ state, now: NOW + 30 * 60 * 1000 })).allow, false);
  assert.equal(allowWake(on, 'forge', nudge, ctx({ state, now: NOW + 61 * 60 * 1000 })).allow, true);
});
