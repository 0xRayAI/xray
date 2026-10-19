// Per-PR buffer. Collapse on PR + sha. Flush only on run_end and ci_pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBatch, headColor, paceHolds } from '../app/pr-batch.mjs';

const REPO = '0xrayai/xray';
const SHA = 'abc1234';
const NEXT = 'def5678';

function line(over = {}) {
  return { id: 'l1', repo: REPO, number: 402, sha: SHA, from: 'forge', title: 'note', ...over };
}

test('head color is red only after a required check fails', () => {
  assert.equal(headColor([]), 'pending');
  assert.equal(headColor([{ name: 'ci', status: 'in_progress', required: true }]), 'pending');
  assert.equal(headColor([{ name: 'ci', conclusion: 'failure', required: true }]), 'red');
  assert.equal(headColor([{ name: 'opt', conclusion: 'failure', required: false }, { name: 'ci', conclusion: 'success' }]), 'green');
  assert.equal(headColor([{ name: 'a', conclusion: 'success' }, { name: 'b', status: 'queued' }]), 'pending');
});

test('pace holds a flush at 75% or over pace, and a hotfix still flushes', () => {
  assert.equal(paceHolds('weekly burn: 74%'), false);
  assert.equal(paceHolds('Weekly burn is 75% of the cap'), true);
  assert.equal(paceHolds('the day is over pace'), true);
  assert.equal(paceHolds('Pipe down is full'), true);
  assert.equal(paceHolds('weekly burn: 90%', true), false);
});

test('one push is one batch, and a new head replaces it without flushing', () => {
  const batch = createBatch();
  const key = REPO + '#402';
  assert.equal(batch.absorb(line({ id: 'a', kind: 'critic_fail', title: 'first' }), true), true);
  assert.equal(batch.absorb(line({ id: 'b', kind: 'handoff', title: 'same head' }), true), true);
  assert.equal(batch.absorb(line({ id: 'a', kind: 'critic_fail' }), true), true);
  assert.equal(batch.inBeat(key), true);
  assert.equal(batch.absorb(line({ id: 'c', sha: NEXT, kind: 'ci_fail', title: 'new head' }), true), true);
  const end = batch.runEnd(line({ id: 'end', sha: NEXT, from: 'forge' }), {});
  assert.equal(end.action, 'wait');
  assert.equal(batch.inBeat(key), true);
});

test('run_end waits while checks are pending and routes a red head to the worker', () => {
  const batch = createBatch();
  batch.observeCi({ id: 'p', kind: 'check_run', repo: REPO, number: 402, sha: SHA, status: 'in_progress' });
  assert.equal(batch.runEnd(line({ id: 'end-p' }), {}).action, 'wait');
  const red = createBatch();
  red.observeCi({ id: 'f', kind: 'ci_fail', repo: REPO, number: 402, sha: SHA });
  const out = red.runEnd(line({ id: 'end-r', title: 'build' }), {});
  assert.equal(out.action, 'worker');
  assert.equal(out.line.seat, 'forge');
  assert.equal(out.line.kind, 'ci_fail');
  assert.equal(typeof out.line.batch, 'string');
  assert.equal(out.line.type, 'batch');
  assert.equal(red.observeCi({ id: 'later', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA }), null);
});

test('ci_pass queues critic only after run_end, and not while the worker is live', () => {
  const batch = createBatch();
  batch.observeCi({ id: 'p', kind: 'check_run', repo: REPO, number: 402, sha: SHA, name: 'ci', status: 'in_progress' });
  assert.equal(batch.runEnd(line({ id: 'end' }), {}).action, 'wait');
  const queued = batch.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA, name: 'ci' });
  assert.equal(queued.action, 'critic');
  assert.equal(queued.line.seat, 'critic');
  assert.equal(queued.line.kind, 'ci_pass');
  assert.equal(batch.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA, name: 'ci' }), null);
});

test('a head already green before run_end queues critic when the run ends', () => {
  const batch = createBatch();
  assert.equal(batch.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA }), null);
  const queued = batch.runEnd(line({ id: 'end' }), {});
  assert.equal(queued.action, 'critic');
  assert.equal(queued.line.seat, 'critic');
  assert.equal(queued.line.kind, 'ci_pass');
  assert.equal(queued.line.title, 'ci_pass');
  assert.equal(batch.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA }), null);
  assert.equal(batch.runEnd(line({ id: 'end' }), {}).action, 'wait');
});

test('a later head queued from head_sha still reaches critic at run_end', () => {
  const batch = createBatch();
  batch.observeCi({ id: 'g0', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA, name: 'ci' });
  assert.equal(batch.runEnd(line({ id: 'end0' }), {}).action, 'critic');
  assert.equal(batch.observeCi({
    id: 'g1', kind: 'ci_pass', repo: REPO, number: 402, head_sha: NEXT, name: 'ci', conclusion: 'success',
  }), null);
  const queued = batch.runEnd(line({ id: 'end1', sha: NEXT }), {});
  assert.equal(queued.action, 'critic');
  assert.equal(queued.line.seat, 'critic');
  assert.equal(queued.line.sha, NEXT);
  assert.equal(batch.observeCi({
    id: 'g1', kind: 'ci_pass', repo: REPO, number: 402, head_sha: NEXT, name: 'ci', conclusion: 'success',
  }), null);
});

test('a second critic FAIL goes to Blaze and the first returns to the worker', () => {
  const batch = createBatch();
  batch.absorb(line({ id: 'cf1', from: 'critic', kind: 'critic_fail', title: 'round 1' }), true);
  const first = batch.runEnd(line({ id: 'cr1', from: 'critic' }), {});
  assert.equal(first.action, 'worker');
  assert.match(first.line.batch, /critic_fail/);
  batch.absorb(line({ id: 'cf2', from: 'critic', kind: 'critic_fail', title: 'round 2' }), true);
  const second = batch.runEnd(line({ id: 'cr2', from: 'critic' }), {});
  assert.equal(second.action, 'blaze');
  assert.equal(second.line.seat, 'blinky');
  assert.equal(second.line.to, 'human');
  assert.equal(second.line.kind, 'needs_human');
});

test('a flush is held over pace unless it is a hotfix', () => {
  const batch = createBatch();
  batch.observeCi({ id: 'f', kind: 'ci_fail', repo: REPO, number: 402, sha: SHA });
  assert.equal(batch.runEnd(line({ id: 'end' }), { attention: 'weekly burn: 80%' }).action, 'hold');
  assert.equal(batch.drain({ attention: 'weekly burn: 80%' }).length, 0);
  const released = batch.drain({ attention: 'weekly burn: 40%' });
  assert.equal(released.length, 1);
  assert.equal(released[0].action, 'worker');
  assert.equal(batch.drain({ attention: '' }).length, 0);
  const hot = createBatch();
  hot.observeCi({ id: 'f', kind: 'ci_fail', repo: REPO, number: 402, sha: SHA });
  assert.equal(hot.runEnd(line({ id: 'end', flag: 'hotfix' }), { attention: 'over pace', hotfix: true }).action, 'worker');
  const green = createBatch();
  green.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA });
  assert.equal(green.runEnd(line({ id: 'end' }), { attention: 'over pace' }).action, 'hold');
  const critic = green.drain({ attention: '' });
  assert.equal(critic.length, 1);
  assert.equal(critic[0].action, 'critic');
});

test('a pending head waits, then a required failure routes to the worker', () => {
  const batch = createBatch();
  batch.observeCi({ id: 'p', kind: 'check_run', repo: REPO, number: 402, sha: SHA, name: 'ci', status: 'in_progress' });
  assert.equal(batch.runEnd(line({ id: 'end' }), {}).action, 'wait');
  const out = batch.observeCi({ id: 'f', kind: 'ci_fail', repo: REPO, number: 402, sha: SHA, name: 'ci' });
  assert.equal(out.action, 'worker');
  assert.match(out.line.batch, /ci_fail/);
  assert.equal(batch.observeCi({ id: 'g', kind: 'ci_pass', repo: REPO, number: 402, sha: SHA, name: 'ci' }), null);
});

test('close records rounds and why once', () => {
  const batch = createBatch();
  batch.absorb(line({ id: 'cf', kind: 'critic_fail', title: 'no' }), true);
  batch.runEnd(line({ id: 'cr', from: 'critic' }), {});
  const row = batch.ponder(REPO + '#402', 'closed');
  assert.equal(row.rounds, 1);
  assert.equal(row.why, 'red head');
  assert.equal(batch.ponder(REPO + '#402', 'closed'), null);
});
