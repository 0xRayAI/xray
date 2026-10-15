// Missed handoff: one inbox packet to the routed seat clears it. A room post does not. The server does not send the packet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { missingHandoffs, packetCovers } from '../app/handoff.mjs';
import { listenPort } from './free-port.mjs';

const ROLES = {
  handoffs: {
    reviewer: 'mill',
    merger: 'herald',
    kinds: {
      ready: { to: 'reviewer', owes: 'author' },
      critic_fail: { to: 'author', owes: 'reviewer' },
      merge: { to: 'merger', owes: 'author' },
      live_pass: { to: 'reviewer', owes: 'merger' },
      ci_fail: { to: 'author', owes: 'merger' },
    },
  },
};
const LOGINS = new Map([['forge0x1[bot]', 'forge']]);
const REPO = '0xrayai/xray';
const L1 = 3600_000;

function ev(kind, n, t, extra = {}) {
  return { id: kind + n + t, t_ct: new Date(t).toISOString(), kind, repo: REPO, number: n, ...extra };
}
function opened(n, t, sha = 'a'.repeat(40)) {
  return ev('pr_open', n, t, { sha, actor: 'forge0x1[bot]', author: 'forge0x1[bot]' });
}
function packet(ob, over = {}) {
  return { type: 'packet', kind: ob.kind, seat: ob.to, to: ob.to, from: ob.owes, repo: ob.repo, number: ob.number, sha: ob.sha, ...over };
}
function one(events, lines, now) {
  const due = missingHandoffs({ events, lines, roles: ROLES, loginToSeat: LOGINS, now, l1ms: L1 });
  assert.equal(due.length, 1);
  return due[0];
}

test('PR opened owes the author one ready packet to the routed reviewer', () => {
  const t0 = 1_700_000_000_000;
  const events = [opened(10, t0)];
  assert.equal(missingHandoffs({ events, lines: [], roles: ROLES, loginToSeat: LOGINS, now: t0 + L1 - 1, l1ms: L1 }).length, 0);
  const ob = one(events, [], t0 + L1);
  assert.equal(ob.kind, 'ready');
  assert.equal(ob.to, 'mill');
  assert.equal(ob.owes, 'forge');
  assert.equal(ob.flag, 'handoff missing');
  const room = { type: 'prompt_message', kind: 'ready', seat: 'mill', repo: REPO, number: 10, sha: ob.sha };
  assert.equal(packetCovers([room], ob), false);
  assert.equal(one(events, [room], t0 + L1).kind, 'ready');
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + L1, l1ms: L1 }).length, 0);
  assert.equal(one(events, [packet(ob, { seat: 'herald' })], t0 + L1).to, 'mill');
});

test('PR ready is the same ready handoff, and the same head is one obligation', () => {
  const t0 = 1_700_000_000_000;
  const sha = 'b'.repeat(40);
  const events = [opened(11, t0, sha), ev('pr_ready', 11, t0 + 1000, { sha, actor: 'forge0x1[bot]' })];
  const ob = one(events, [], t0 + 1000 + L1);
  assert.equal(ob.kind, 'ready');
  assert.equal(ob.sha, sha);
  assert.equal(ob.to, 'mill');
});

test('a new head after a FAIL is one ready handoff, and the old head does not cover it', () => {
  const t0 = 1_700_000_000_000;
  const oldSha = 'c'.repeat(40);
  const head = 'd'.repeat(40);
  const events = [
    opened(12, t0, oldSha),
    ev('review', 12, t0 + 1000, { state: 'CHANGES_REQUESTED', sha: oldSha }),
    ev('pr_commit', 12, t0 + 2000, { sha: head }),
  ];
  const ob = one(events, [], t0 + 2000 + L1);
  assert.equal(ob.kind, 'ready');
  assert.equal(ob.sha, head);
  assert.equal(ob.owes, 'forge');
  assert.equal(ob.to, 'mill');
  const stale = packet({ ...ob, sha: oldSha });
  assert.equal(packetCovers([stale], ob), false);
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + 2000 + L1, l1ms: L1 }).length, 0);
});

test('PASS plus green CI owes the author one merge packet to the routed merger', () => {
  const t0 = 1_700_000_000_000;
  const sha = 'e'.repeat(40);
  const events = [opened(13, t0, sha), ev('review', 13, t0 + 1000, { state: 'APPROVED', sha }), ev('ci_pass', 13, t0 + 2000, { sha, head_sha: sha })];
  const ob = one(events, [], t0 + 2000 + L1);
  assert.equal(ob.kind, 'merge');
  assert.equal(ob.to, 'herald');
  assert.equal(ob.owes, 'forge');
  const room = ev('pr_comment', 13, t0 + 3000, { sha, label: '@herald merge' });
  assert.equal(one([...events, room], [], t0 + 2000 + L1).kind, 'merge');
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + 2000 + L1, l1ms: L1 }).length, 0);
});

test('merge plus deploy SUCCESS owes the merger one live_pass packet to the reviewer', () => {
  const t0 = 1_700_000_000_000;
  const sha = 'f'.repeat(40);
  const events = [opened(14, t0, sha), ev('merged', 14, t0 + 1000, { sha }), ev('op_deploy', 14, t0 + 2000, { sha, status: 'SUCCESS' })];
  const ob = one(events, [], t0 + 2000 + L1);
  assert.equal(ob.kind, 'live_pass');
  assert.equal(ob.to, 'mill');
  assert.equal(ob.owes, 'herald');
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + 2000 + L1, l1ms: L1 }).length, 0);
});

test('a FAIL owes the reviewer one critic_fail packet to the author', () => {
  const t0 = 1_700_000_000_000;
  const sha = '1'.repeat(40);
  const events = [opened(15, t0, sha), ev('review', 15, t0 + 1000, { state: 'CHANGES_REQUESTED', sha })];
  const ob = one(events, [], t0 + 1000 + L1);
  assert.equal(ob.kind, 'critic_fail');
  assert.equal(ob.to, 'forge');
  assert.equal(ob.owes, 'mill');
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + 1000 + L1, l1ms: L1 }).length, 0);
});

test('a CI failure owes the merger one ci_fail packet to the author', () => {
  const t0 = 1_700_000_000_000;
  const sha = '2'.repeat(40);
  const events = [opened(16, t0, sha), ev('ci_fail', 16, t0 + 1000, { sha, head_sha: sha })];
  const ob = one(events, [], t0 + 1000 + L1);
  assert.equal(ob.kind, 'ci_fail');
  assert.equal(ob.to, 'forge');
  assert.equal(ob.owes, 'herald');
  const comment = { type: 'pr_comment', kind: 'ci_fail', seat: 'forge', repo: REPO, number: 16, sha };
  assert.equal(packetCovers([comment], ob), false);
  assert.equal(missingHandoffs({ events, lines: [packet(ob)], roles: ROLES, loginToSeat: LOGINS, now: t0 + 1000 + L1, l1ms: L1 }).length, 0);
});

test('the server flags a missed handoff and does not post the packet', async () => {
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  const forgeKey = 'forge-key-' + crypto.randomBytes(6).toString('hex');
  const criticKey = 'critic-key-' + crypto.randomBytes(6).toString('hex');
  const pw = crypto.randomBytes(6).toString('hex');
  const keys = {
    forge: crypto.createHash('sha256').update(forgeKey).digest('hex'),
    critic: crypto.createHash('sha256').update(criticKey).digest('hex'),
  };
  const gh = http.createServer((_req, res) => { res.writeHead(404); res.end('{}'); });
  await new Promise(r => gh.listen(0, '127.0.0.1', r));
  const srv = spawn(process.execPath, [path.join(app, 'server.mjs')], {
    env: {
      PORT: '0', MESH_PASSWORD: pw, SESSION_SECRET: crypto.randomBytes(16).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(16).toString('hex'), PATH: process.env.PATH, MESH_DATA_DIR: data,
      SERVER_ROUTING: 'off', NUDGE_L1_S: '1', NUDGE_L3_S: '1',
      GITHUB_API_URL: `http://127.0.0.1:${gh.address().port}`,
      SEAT_KEYS: JSON.stringify(keys),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const port = await listenPort(srv);
    const base = `http://127.0.0.1:${port}`;
    const login = await fetch(base + '/login', { method: 'POST', body: 'password=' + pw, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const sha = 'ab'.repeat(20);
    const openedAt = new Date(Date.now() - 10_000).toISOString();
    const card = { key: '0xrayai/xray#70', kind: 'pr', repo: '0xRayAI/xray', number: 70, title: 'handoff', url: '', owner: 'forge', stage: 'review', state: 'live', packet: {}, beats: [], last_beat_t: Date.now() };
    const feed = {
      title: 't', generated_at: new Date().toISOString(), event_count: 2,
      events: [
        { id: 'open-70', t_ct: openedAt, kind: 'pr_open', repo: '0xRayAI/xray', number: 70, sha, actor: 'forge0x1[bot]', author: 'forge0x1[bot]' },
        { id: 'room-70', t_ct: new Date().toISOString(), kind: 'pr_comment', repo: '0xRayAI/xray', number: 70, sha, actor: 'blinky', label: 'critic please look' },
      ],
      board: { updated_ct: 't', cards: [card] },
    };
    const file = path.join(data, 'feed', 'github-events.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(feed));
    let body;
    for (let i = 0; i < 30; i++) {
      body = await (await fetch(base + '/live-events.json', { headers: { Cookie: cookie } })).json();
      const hit = (body.board && body.board.cards || []).find(c => c.number === 70);
      if (hit && (hit.flags || []).includes('handoff missing')) break;
      await new Promise(r => setTimeout(r, 200));
    }
    const cardNow = (body.board.cards || []).find(c => c.number === 70);
    assert.ok(cardNow.flags.includes('handoff missing'));
    await new Promise(r => setTimeout(r, 1200));
    const escalated = await (await fetch(base + '/nudges', { headers: { Authorization: 'Bearer ' + forgeKey } })).json();
    assert.ok(escalated.nudges.some(n => n.kind === 'reassign' && n.seat === 'blinky' && String(n.id).includes(':handoff:') && !n.closed_at));
    const before = await (await fetch(base + '/inbox/critic', { headers: { Authorization: 'Bearer ' + criticKey } })).json();
    assert.equal((before.lines || []).some(l => l.type === 'packet'), false);
    const line = { id: `handoff:0xrayai/xray#70:ready:${sha}`, t_ct: new Date().toISOString(), seat: 'critic', from: 'forge', to: 'critic', type: 'packet', kind: 'ready', repo: '0xRayAI/xray', number: 70, sha, title: 'handoff ready', url: 'https://github.com/0xRayAI/xray/pull/70', reason: 'handoff ready' };
    const post = await fetch(base + '/inbox', { method: 'POST', headers: { Authorization: 'Bearer ' + forgeKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [line] }) });
    assert.equal((await post.json()).added, 1);
    const again = await fetch(base + '/inbox', { method: 'POST', headers: { Authorization: 'Bearer ' + forgeKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [line] }) });
    assert.equal((await again.json()).added, 0);
    let cleared;
    for (let i = 0; i < 20; i++) {
      cleared = await (await fetch(base + '/live-events.json', { headers: { Cookie: cookie } })).json();
      const hit = (cleared.board && cleared.board.cards || []).find(c => c.number === 70);
      if (hit && !(hit.flags || []).includes('handoff missing')) break;
      await new Promise(r => setTimeout(r, 200));
    }
    const done = (cleared.board.cards || []).find(c => c.number === 70);
    assert.equal((done.flags || []).includes('handoff missing'), false);
    const seen = await (await fetch(base + '/inbox/critic', { headers: { Authorization: 'Bearer ' + criticKey } })).json();
    assert.equal(seen.lines.length, 1);
    await new Promise(r => setTimeout(r, 1200));
    const nudges = await (await fetch(base + '/nudges', { headers: { Authorization: 'Bearer ' + forgeKey } })).json();
    assert.equal(nudges.nudges.some(n => n.kind === 'handoff' && !n.closed_at), false);
  } finally {
    srv.kill();
    await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r));
    gh.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});
