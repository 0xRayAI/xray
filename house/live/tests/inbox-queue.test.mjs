import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backlogOf, keepStation, lineRank, queueView } from '../app/inbox-queue.mjs';

const line = (id, extra) => ({ id, t_ct: extra.t || '2026-10-30T10:00:00Z', type: 'issue_comment', repo: '0xRayAI/xray', number: 1, title: id, url: '', reason: 'ask', ...extra });

test('ready handoffs and a hotfix are the head, and nudges stay back', () => {
  const ready = line('h', { type: 'packet', kind: 'ready', title: 'handoff ready', t: '2026-10-30T12:00:00Z' });
  const hot = line('f', { type: 'issue_open', title: 'hotfix: pack the module', t: '2026-10-30T11:00:00Z' });
  const nudge = line('n', { type: 'nudge', kind: 'line', title: 'old card', t: '2026-10-30T09:00:00Z' });
  const station = line('s', { type: 'nudge', kind: 'station', title: 'Run station and re-read OP-PROC', t: '2026-10-30T08:00:00Z' });
  const comment = line('c', { title: 'soft follow-up', t: '2026-10-30T07:00:00Z' });
  assert.equal(lineRank(ready), 0);
  assert.equal(lineRank(hot), 1);
  assert.equal(lineRank(comment), 2);
  assert.equal(lineRank(nudge), 3);
  assert.equal(lineRank(station), 4);
  assert.deepEqual(queueView([nudge, station, comment, hot, ready]).map((row) => row.id), ['h', 'f']);
  assert.deepEqual(backlogOf([nudge, station, comment, hot, ready]).map((row) => row.id), ['n', 's', 'c']);
});

test('with no head, real lines show, then one oldest nudge, then one station line', () => {
  const older = line('a', { t: '2026-10-30T01:00:00Z' });
  const newer = line('b', { t: '2026-10-30T02:00:00Z' });
  assert.deepEqual(queueView([newer, older]).map((row) => row.id), ['a', 'b']);
  const n1 = line('n1', { type: 'nudge', t: '2026-10-30T03:00:00Z' });
  const n2 = line('n2', { type: 'nudge', t: '2026-10-30T04:00:00Z' });
  assert.deepEqual(queueView([n2, n1]).map((row) => row.id), ['n1']);
  const s1 = line('s1', { type: 'nudge', kind: 'station', t: '2026-10-30T05:00:00Z' });
  const s2 = line('s2', { type: 'nudge', kind: 'station', t: '2026-10-30T06:00:00Z' });
  assert.deepEqual(queueView([s1, s2]).map((row) => row.id), ['s2']);
});

test('a P1 line joins the head and a station nudge waits for an empty inbox', () => {
  const p1 = line('p', { title: 'P1: wake path', t: '2026-10-30T01:00:00Z' });
  const noise = line('n', { type: 'nudge', t: '2026-10-30T02:00:00Z' });
  assert.deepEqual(queueView([noise, p1]).map((row) => row.id), ['p']);
  assert.equal(keepStation([]), true);
  assert.equal(keepStation([p1]), false);
  assert.equal(keepStation([noise]), false);
});
