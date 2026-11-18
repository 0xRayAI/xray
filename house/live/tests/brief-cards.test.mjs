// The badge is packet_ok === false, and only on a packet PR whose PACKET.md is missing.
// Docs #388 and hotfix #500 are ordinary PRs. #495's body carries ## Packet, so the
// reduced snapshot's missing packet_file is not the live card.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyBrief } from '../app/wave-schedule.mjs';
import { boardCloudAgents } from '../app/worktrack.mjs';

const fixture = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'live-cards.json'), 'utf8'));

test('docs #388 and hotfix #500 do not need a brief; a packet PR with no PACKET.md does', () => {
  const cards = fixture.cards.map(card => applyBrief(card.number === 495 ? { ...card, packet_file: true } : card));
  const issues = cards.filter(card => card.kind === 'issue');
  assert.ok(issues.length >= 36);
  for (const card of issues) {
    assert.equal(card.packet_ok, true, card.key);
    assert.deepEqual(card.missing, []);
  }
  const packet = cards.find(card => card.number === 485);
  assert.equal(packet.kind, 'packet');
  assert.equal(packet.packet_ok, true);
  const docs = cards.find(card => card.number === 388);
  assert.equal(docs.title.startsWith('docs:'), true);
  assert.equal(docs.packet_ok, true);
  assert.deepEqual(docs.missing, []);
  const hotfix = applyBrief({ key: '0xrayai/xray#500', kind: 'pr', repo: '0xRayAI/xray', number: 500, title: 'fix(live): brief only packet PRs and credit CI seats', packet_file: true, packet: {}, packet_ok: false, missing: ['acceptance', 'next owner'] });
  assert.equal(hotfix.packet_ok, true);
  assert.deepEqual(hotfix.missing, []);
  const ordinary = applyBrief({ key: '0xrayai/xray#500', kind: 'pr', repo: '0xRayAI/xray', number: 500, title: 'fix(live): brief only packet PRs and credit CI seats', packet: {}, packet_ok: false, missing: ['acceptance', 'next owner'] });
  assert.equal(ordinary.packet_ok, true);
  const carried = cards.find(card => card.number === 495);
  assert.equal(carried.packet_ok, true);
  const missingFile = applyBrief({ key: '0xrayai/xray#495', kind: 'pr', repo: '0xRayAI/xray', number: 495, title: 'Packet: owner sign-in card under the Bifrost mesh', packet: {}, packet_ok: true, missing: [] });
  assert.equal(missingFile.packet_ok, false);
  assert.equal(cards.filter(card => card.packet_ok !== true).length, 0);
});

test('live cloud rows link from a turn tag or a head_ref, and a finished PR drops card missing', () => {
  const board = fixture.cards;
  const agents = fixture.cloud_agents.map(row => ({
    agent: row.bcId, seat: row.seat, status: row.state === 'stale' ? 'finished' : row.state, t_ct: row.updated_ct, pr: row.pr,
  }));
  const rows = boardCloudAgents({
    agents,
    activity: [
      { kind: 'turn', action: 'end', tag: 'bc-f35e4c51 485', seat: 'forge', t_ct: '2026-10-15T05:38:56-05:00' },
    ],
    events: [
      { kind: 'pr_open', repo: '0xRayAI/xray', number: 388, head_ref: 'cursor/bc-22f1b70d-a78d-5505-8ee0-9714f6ca1e99', source: 'https://github.com/0xRayAI/xray/pull/388' },
    ],
    board,
  });
  const by = Object.fromEntries(rows.map(row => [row.bcId, row]));
  assert.equal(by['bc-f35e4c51'].card, '0xrayai/xray#485');
  assert.equal(by['bc-f35e4c51'].flag, undefined);
  assert.equal(by['bc-22f1b70d-a78d-5505-8ee0-9714f6ca1e99'].card, '0xrayai/xray#388');
  assert.equal(by['bc-22f1b70d-a78d-5505-8ee0-9714f6ca1e99'].pr, 'https://github.com/0xRayAI/xray/pull/388');
  assert.equal(by['bc-22f1b70d-a78d-5505-8ee0-9714f6ca1e99'].flag, undefined);
  assert.equal(by['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f'].card, '');
  assert.equal(by['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f'].flag, undefined);
  assert.equal(by['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f'].label, 'no card');
  const finished = boardCloudAgents({
    agents: [{ agent: 'bc-f0dc0299', status: 'finished', pr: 'https://github.com/0xRayAI/xray/pull/367', t_ct: '2026-10-15T05:38:55-05:00' }],
    board,
  });
  assert.equal(finished[0].pr, 'https://github.com/0xRayAI/xray/pull/367');
  assert.equal(finished[0].flag, undefined);
});

test('a cloud run with no PR uses the TRACKS card, and an unnamed run says no card', () => {
  const tracks = [
    '# Tracks',
    '| Cloud id | Seat | Card | State |',
    '|----------|------|------|-------|',
    '| bc-92de28a2 | forge | 0xRayAI/xray#502 | running |',
    '| bc-22f1b70d-a78d-5505-8ee0-9714f6ca1e99 | forge | 0xRayAI/xray#388 | finished |',
  ].join('\n');
  const board = [
    { key: '0xrayai/xray#502', repo: '0xRayAI/xray', number: 502, kind: 'pr', url: 'https://github.com/0xRayAI/xray/pull/502', title: 'closed column' },
    { key: '0xrayai/xray#388', repo: '0xRayAI/xray', number: 388, kind: 'pr', url: 'https://github.com/0xRayAI/xray/pull/388', title: 'docs: seek map' },
  ];
  const rows = boardCloudAgents({
    agents: [
      { agent: 'bc-92de28a2', seat: 'forge', status: 'running', t_ct: '2026-10-20T18:40:00-05:00' },
      { agent: 'bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f', seat: 'forge', status: 'finished', t_ct: '2026-10-18T17:30:55-05:00' },
      { agent: 'bc-f0dc0299', seat: 'forge', status: 'finished', t_ct: '2026-10-15T05:38:55-05:00' },
    ],
    tracks,
    board,
    now: Date.parse('2026-10-20T18:45:00-05:00'),
  });
  const by = Object.fromEntries(rows.map(row => [row.bcId, row]));
  assert.equal(by['bc-92de28a2'].card, '0xRayAI/xray#502');
  assert.equal(by['bc-92de28a2'].url, 'https://github.com/0xRayAI/xray/pull/502');
  assert.equal(by['bc-92de28a2'].pr, '');
  assert.equal(by['bc-92de28a2'].flag, undefined);
  assert.equal(by['bc-92de28a2'].label, undefined);
  for (const id of ['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f', 'bc-f0dc0299']) {
    assert.equal(by[id].card, '', id);
    assert.equal(by[id].pr, '', id);
    assert.equal(by[id].flag, undefined, id);
    assert.equal(by[id].label, 'no card', id);
  }
});
