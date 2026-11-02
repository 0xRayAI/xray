import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unbackedDefects } from '../tools/exit-gate.mjs';

test('a prose-only bug fails the exit gate', () => {
  const bad = unbackedDefects('- bug: the wake token is never stamped\n');
  assert.equal(bad.length, 1);
});

test('an issue opened the same turn passes the exit gate', () => {
  const bad = unbackedDefects('- bug: wake token. 0xRayAI/xray#812\nFell out: nothing\n');
  assert.deepEqual(bad, []);
});

test('a follow-up with a pull comment URL passes', () => {
  const bad = unbackedDefects('follow-up https://github.com/0xRayAI/xray/pull/811#issuecomment-1\n');
  assert.deepEqual(bad, []);
});
