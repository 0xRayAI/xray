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

test('a short repo number passes', () => {
  assert.deepEqual(unbackedDefects('xray#808 Soft FU: the stamp\n'), []);
  assert.deepEqual(unbackedDefects('gap on bifrost#29\n'), []);
});

test('an older notes section does not fail the current turn', () => {
  const notes = '## 2026-10-01\n- bug: old and unlinked\n## 2026-11-02\n- bug: stamped. xray#809\n';
  assert.deepEqual(unbackedDefects(notes), []);
});

test('the newest notes section still fails a prose bug', () => {
  const notes = '## old\n- fine\n## now\n- bug: still prose\n';
  assert.equal(unbackedDefects(notes).length, 1);
});
