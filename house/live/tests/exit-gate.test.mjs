import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unbackedDefects, unclosedAfterMerge } from '../tools/exit-gate.mjs';

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
  const notes = '## 2026-11-02\n- bug: stamped. xray#809\n## 2026-10-01\n- bug: old and unlinked\n';
  assert.deepEqual(unbackedDefects(notes), []);
});

test('a wake line that merged nothing does not fail', () => {
  const line = '0xRayAI/xray#820@278a29e ("fix(live): fail a merged turn that leaves the fixed issues open", refs 0xRayAI/xray#819)';
  assert.deepEqual(unclosedAfterMerge(line), []);
});

test('the merged pull itself is not a fixed issue', () => {
  const turn = 'merged xray#817 fix(live): the newest tip\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('a same-line pull ref is not a fixed issue', () => {
  const turn = 'merged xray#820, fixes xray#819\nclosed xray#819\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('a ref is not a fix', () => {
  const turn = 'merged xray#820\nrefs xray#819 (Soft FU later)\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('not closed does not count as closed', () => {
  const turn = 'merged xray#820\nfixes xray#819 — not closed xray#819 yet\n';
  assert.deepEqual(unclosedAfterMerge(turn), ['xray#819']);
});

test('a merged turn that leaves the fixed issue open fails', () => {
  const turn = '## now\nmerged xray#817\nfixes xray#813\nfixes xray#814\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), ['xray#814']);
});

test('closing the fixed issues in the same turn passes', () => {
  const turn = '## now\nmerged xray#817\nfixes xray#813\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('the top notes section still fails a prose bug', () => {
  const notes = '## now\n- bug: still prose\n## old\n- fine\n';
  assert.equal(unbackedDefects(notes).length, 1);
  assert.equal(unbackedDefects('## new\nFU: gap unref\n## old\nok').length, 1);
});
