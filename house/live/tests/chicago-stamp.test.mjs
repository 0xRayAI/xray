// The start_after writer uses America/Chicago at the instant it writes.
// The two 01:30s on the 2026-11-01 fall-back stay distinct. Stored stamps are not rewritten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockStamp, keepStoredStartAfter, writeStartAfter } from '../app/chicago-stamp.mjs';

test('a summer instant and a winter instant take the Chicago offset', () => {
  assert.equal(writeStartAfter('2026-07-15T16:00:00+00:00'), '2026-07-15T11:00:00-05:00');
  assert.equal(writeStartAfter('2026-12-15T18:00:00+00:00'), '2026-12-15T12:00:00-06:00');
});

test('writes across the 2026-11-01 fall-back without merging the two 01:30s', () => {
  const first = writeStartAfter('2026-11-01T01:30:00-05:00');
  const second = writeStartAfter('2026-11-01T01:30:00-06:00');
  assert.equal(first, '2026-11-01T01:30:00-05:00');
  assert.equal(second, '2026-11-01T01:30:00-06:00');
  assert.notEqual(first, second);
  assert.equal(writeStartAfter('2026-11-01T06:30:00+00:00'), '2026-11-01T01:30:00-05:00');
  assert.equal(writeStartAfter('2026-11-01T07:30:00+00:00'), '2026-11-01T01:30:00-06:00');
});

test('clockStamp writes Chicago wall time with milliseconds', () => {
  assert.equal(clockStamp(Date.parse('2026-10-15T15:00:00.123Z')), '2026-10-15T10:00:00.123-05:00');
  assert.equal(clockStamp(Date.parse('2026-12-15T18:00:00.004Z')), '2026-12-15T12:00:00.004-06:00');
  assert.equal(clockStamp('not-a-time'), null);
});

test('an offset that is already Chicago is kept, and a stored stamp is not migrated', () => {
  assert.equal(writeStartAfter('2020-01-01T08:00-06:00'), '2020-01-01T08:00-06:00');
  const stale = '2026-12-15T12:00:00-05:00';
  assert.equal(keepStoredStartAfter(stale), stale);
  assert.notEqual(writeStartAfter(stale), stale);
});
