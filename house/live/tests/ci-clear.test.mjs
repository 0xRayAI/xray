import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idsToAck, idsToAckOnClose } from '../app/ci-clear.mjs';

const R = 'example-org/app';
const SHA = 'b'.repeat(40);
const NEXT = 'c'.repeat(40);

test('a green current head acks the open ci_fail line', () => {
  const line = { id: `ci_fail:${R}#9:${SHA}`, type: 'ci_fail', repo: R, number: 9, sha: SHA };
  const red = [
    { id: 'open', t_ct: '2026-10-28T10:00:00-05:00', kind: 'pr_open', repo: R, number: 9, sha: SHA },
    { id: 'suite', t_ct: '2026-10-28T10:02:00-05:00', kind: 'check_suite', repo: R, sha: SHA, conclusion: 'failure' },
  ];
  assert.deepEqual(idsToAck([line], red), []);
  const green = red.concat([
    { id: 'push', t_ct: '2026-10-28T10:03:00-05:00', kind: 'pr_commit', repo: R, number: 9, sha: NEXT },
    { id: 'ok', t_ct: '2026-10-28T10:04:00-05:00', kind: 'check_suite', repo: R, sha: NEXT, conclusion: 'success' },
  ]);
  assert.deepEqual(idsToAck([line], green), [line.id]);
  const handoff = { id: `handoff:${R}#9:${SHA}:ci_fail`, type: 'packet', kind: 'ci_fail', repo: R, number: 9, sha: SHA };
  assert.deepEqual(idsToAck([handoff], green), [handoff.id]);
});

test('a merge acks the card lines and leaves the merge handoff', () => {
  const sha = 'd'.repeat(40);
  const ready = { id: `handoff:${R}#9:ready:${sha}`, type: 'packet', kind: 'ready', repo: R, number: 9, sha };
  const merge = { id: `handoff:${R}#9:merge:${sha}`, type: 'packet', kind: 'merge', repo: R, number: 9, sha };
  const open = [{ id: 'open', t_ct: '2026-10-28T10:00:00-05:00', kind: 'pr_open', repo: R, number: 9, sha }];
  assert.deepEqual(idsToAckOnClose([ready, merge], open), []);
  const merged = open.concat([{ id: 'done', t_ct: '2026-10-28T11:00:00-05:00', kind: 'merged', repo: R, number: 9, sha }]);
  assert.deepEqual(idsToAckOnClose([ready, merge], merged), [ready.id]);
  const reopened = merged.concat([{ id: 'back', t_ct: '2026-10-28T12:00:00-05:00', kind: 'reopen', repo: R, number: 9 }]);
  assert.deepEqual(idsToAckOnClose([ready], reopened), []);
});
