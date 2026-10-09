import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptLine, validActivity } from './activity.mjs';

const now = Date.parse('2026-10-09T14:00:00Z');

test('a turn start is stored under the seat the caller names', () => {
  const lines = [];
  const out = acceptLine(lines, {
    t_ct: '2026-10-09T14:00:00Z',
    kind: 'turn',
    action: 'start',
    tag: 'issue-212',
  }, 'SEAT1', now);
  assert.equal(out.ok, true);
  assert.equal(lines[0].by, 'SEAT1');
  assert.equal(lines[0].seq, 1);
});

test('free text and unknown fields are refused', () => {
  assert.equal(validActivity({ t_ct: '2026-10-09T14:00:00Z', kind: 'turn', action: 'start', note: 'hello' }, now), 'unknown field');
  assert.equal(validActivity({ t_ct: '2026-10-09T14:00:00Z', kind: 'turn', action: 'start', tag: 'see the body' }, now), 'free text is not accepted');
});

test('a cloud agent line needs an agent id', () => {
  assert.equal(validActivity({
    t_ct: '2026-10-09T14:00:00Z', kind: 'cloud_agent', action: 'launch',
  }, now), 'cloud_agent needs agent id');
});
