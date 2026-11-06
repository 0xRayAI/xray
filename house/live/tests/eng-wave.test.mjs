import assert from 'node:assert/strict';
import test from 'node:test';
import { cutAfterClose } from '../app/eng-wave.mjs';

const close = { repo: '0xRayAI/xray', number: 848, closed: true, sha: '0ff063e77' };
const next = { repo: '0xRayAI/xray', number: 828, title: 'eng-wave auto-cut', sha: '0ff063e77' };

test('a closed beat tips the next beat and does not wait for chat', () => {
  const cut = cutAfterClose(close, { candidates: [next], quiet: true });
  assert.equal(cut.op, 'tip');
  assert.equal(cut.card.number, 828);
  assert.match(cut.comment, /@arch10x/);
  assert.match(cut.comment, /0xRayAI\/xray#828/);
  assert.equal(cut.handoff.seat, 'arch1');
  assert.equal(cut.handoff.kind, 'ready');
  assert.equal(cut.handoff.reason, 'eng-wave cut');
  assert.doesNotMatch(`${cut.comment} ${cut.handoff.reason}`, /waits for forge chat/i);
});

test('quiet does not change the cut', () => {
  const loud = cutAfterClose(close, { candidates: [next], quiet: false });
  const quiet = cutAfterClose(close, { candidates: [next], quiet: true });
  assert.deepEqual(quiet, loud);
});

test('an open head blocks a second tip', () => {
  const cut = cutAfterClose(close, { candidates: [next], openHead: { repo: '0xRayAI/xray', number: 790 } });
  assert.equal(cut.op, 'hold');
  assert.equal(cut.reason, 'head-open');
  assert.equal(cut.card.number, 790);
});

test('no next beat is one no-cut line', () => {
  const cut = cutAfterClose(close, { candidates: [] });
  assert.equal(cut.op, 'block');
  assert.equal(cut.reason, 'no-cut');
  assert.match(cut.note, /NOTES no-cut/);
  assert.doesNotMatch(cut.note, /waits for forge chat/i);
});

test('an open card is not a cut', () => {
  assert.equal(cutAfterClose({ ...close, closed: false }, { candidates: [next] }).op, 'skip');
});
