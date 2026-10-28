import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idsToAck } from '../app/ci-clear.mjs';

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
});
