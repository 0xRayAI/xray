// Live /cards snapshot: issues, the packet card, and a release title do not need a brief.
// A PR with neither a packet nor a release title still does. The badge is packet_ok === false.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyBrief } from '../app/wave-schedule.mjs';
import { boardCloudAgents } from '../app/worktrack.mjs';

const fixture = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'live-cards.json'), 'utf8'));

test('the live card snapshot clears the brief badge for issues, the packet, and a release PR', () => {
  const cards = fixture.cards.map(applyBrief);
  const issues = cards.filter(card => card.kind === 'issue');
  assert.ok(issues.length >= 36);
  for (const card of issues) {
    assert.equal(card.packet_ok, true, card.key);
    assert.deepEqual(card.missing, []);
  }
  const packet = cards.find(card => card.number === 485);
  assert.equal(packet.kind, 'packet');
  assert.equal(packet.born, 'packet');
  assert.equal(packet.packet_ok, true);
  const release = applyBrief({ key: '0xrayai/xray#490', kind: 'pr', repo: '0xRayAI/xray', number: 490, title: 'release(grok-bot): 0.1.11', packet: {}, packet_ok: false, missing: ['acceptance', 'next owner'] });
  assert.equal(release.packet_ok, true);
  assert.deepEqual(release.missing, []);
  const carried = applyBrief({ key: '0xrayai/xray#493', kind: 'pr', repo: '0xRayAI/xray', number: 493, title: 'fix(reflection)', packet_file: true, packet: {}, packet_ok: false, missing: ['acceptance', 'next owner'] });
  assert.equal(carried.packet_ok, true);
  const plain = cards.find(card => card.number === 388);
  assert.equal(plain.kind, 'pr');
  assert.equal(plain.packet_ok, false);
  assert.deepEqual(plain.missing, ['acceptance', 'next owner']);
  const briefed = cards.filter(card => card.packet_ok === true);
  assert.equal(briefed.length, cards.length - 1);
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
  assert.equal(by['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f'].flag, 'card missing');
  const finished = boardCloudAgents({
    agents: [{ agent: 'bc-f0dc0299', status: 'finished', pr: 'https://github.com/0xRayAI/xray/pull/367', t_ct: '2026-10-15T05:38:55-05:00' }],
    board,
  });
  assert.equal(finished[0].pr, 'https://github.com/0xRayAI/xray/pull/367');
  assert.equal(finished[0].flag, undefined);
});
