// A packet post creates the board card. The server attaches the branch and the pull request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardKeyOf } from '../app/arch1-launch.mjs';
import { acceptWaveCards, attachPacketCards, missingCardRuns, retainSeedCards } from '../app/wave-schedule.mjs';
import { boardCloudAgents } from '../app/worktrack.mjs';
import { listenPort } from './free-port.mjs';

test('a pull or cloud run with no card fails', () => {
  const cards = [{ key: 'acme/app#9', repo: 'acme/app', number: 9, state: 'live' }];
  const gaps = missingCardRuns([
    { kind: 'pr_open', repo: 'acme/app', number: 9 },
    { kind: 'pr_open', repo: 'acme/app', number: 10 },
    { kind: 'cloud', bcId: 'bc-ok', card: 'acme/app#9' },
    { kind: 'cloud', bcId: 'bc-none', card: '' },
  ], cards);
  assert.equal(gaps.some(gap => gap.kind === 'pull' && gap.key === 'acme/app#9'), false);
  assert.equal(gaps.some(gap => gap.kind === 'pull' && gap.key === 'acme/app#10'), true);
  assert.deepEqual(gaps.filter(gap => gap.kind === 'cloud'), [{ kind: 'cloud', key: '' }]);
  const rows = boardCloudAgents({
    agents: [{ agent: 'bc-none', seat: 'forge', status: 'running', t_ct: '2026-10-25T12:00:00-05:00' }],
    board: cards,
    now: Date.parse('2026-10-25T12:05:00-05:00'),
  });
  assert.equal(rows[0].label, 'no card');
  assert.equal(rows[0].card, '');
});

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const FEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed');
const COLLECTOR = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'collector-held-pr.json'), 'utf8'));

test('card ids share number >= 1, and a collector list keeps a packet card', () => {
  assert.equal(cardKeyOf({ repo: 'Acme/App', number: 2, id: 'line-2' }), 'acme/app#2');
  assert.equal(cardKeyOf({ repo: 'Acme/App', number: 0, id: 'line-0' }), 'packet:line-0');
  assert.equal(cardKeyOf({ repo: 'Acme/App', number: 0, id: 'line-0' }).endsWith('#0'), false);
  const packet = { key: 'packet:abc', born: 'packet', repo: 'acme/app', number: 0, state: 'live', title: 'held' };
  const accepted = acceptWaveCards([{ key: 'acme/app#1', repo: 'acme/app', number: 1, title: 'open' }], [packet]);
  const kept = retainSeedCards(accepted, [packet], []);
  assert.equal(kept.some(card => card.key === 'packet:abc'), true);
  const replaced = retainSeedCards([{ key: 'packet:abc', title: 'collector', repo: 'acme/app', number: 2 }], [packet], []);
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].title, 'collector');
  const ghost = { key: '0xrayai/xray#485', born: 'packet', kind: 'packet', repo: '0xRayAI/xray', number: 485, state: 'live', title: 'handoff critic_fail' };
  const dropped = retainSeedCards(
    [{ key: '0xrayai/xray#1', repo: '0xRayAI/xray', number: 1, kind: 'issue', state: 'live', title: 'open' }],
    [ghost], [], card => Number(card.number) === 485,
  );
  assert.equal(dropped.some(card => card.number === 485), false);
  const openPacket = retainSeedCards(
    [{ key: '0xrayai/xray#1', repo: '0xRayAI/xray', number: 1, kind: 'issue', state: 'live', title: 'open' }],
    [ghost], [], () => false,
  );
  assert.equal(openPacket.some(card => card.number === 485), true);
});

test('a push sets branch and a matching pr_open rewrites the holding key', () => {
  const held = { key: 'packet:line-9', born: 'packet', repo: 'acme/app', number: 0, state: 'live', title: 'hold', owner: 'forge' };
  const pushed = attachPacketCards([held], [
    { kind: 'push', repo: 'acme/app', branch: 'cursor/hold', card: 'packet:line-9' },
  ]);
  assert.equal(pushed[0].key, 'packet:line-9');
  assert.equal(pushed[0].branch, 'cursor/hold');
  const opened = attachPacketCards(pushed, [
    { kind: 'push', repo: 'acme/app', branch: 'cursor/hold', card: 'packet:line-9' },
    { kind: 'pr_open', repo: 'Acme/App', number: 9, head: 'cursor/hold', url: 'https://github.com/acme/app/pull/9' },
  ]);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].key, 'acme/app#9');
  assert.equal(opened[0].alias, 'packet:line-9');
  assert.equal(opened[0].branch, 'cursor/hold');
  const stay = attachPacketCards([
    { key: 'acme/app#4', born: 'packet', repo: 'acme/app', number: 4, state: 'live', title: 'kept' },
  ], [
    { kind: 'pr_open', repo: 'acme/app', number: 4, head: 'cursor/other' },
  ]);
  assert.equal(stay.length, 1);
  assert.equal(stay[0].key, 'acme/app#4');
  assert.equal(stay[0].alias, undefined);
});

test('a collector commit, pr_commit, and pr_open leave one card per id', () => {
  const events = COLLECTOR.one;
  const held = { key: 'packet:line-9', born: 'packet', repo: 'acme/app', number: 0, state: 'live', title: 'hold', owner: 'forge' };
  const commits = events.filter(event => event.kind === 'commit');
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].branches, ['main']);
  const prCommit = events.find(event => event.kind === 'pr_commit');
  const prOpen = events.find(event => event.kind === 'pr_open');
  assert.equal(prCommit.number, 9);
  assert.equal(prCommit.sha, prOpen.sha);
  assert.equal(Object.hasOwn(prCommit, 'branch'), false);
  assert.equal(Object.hasOwn(prCommit, 'branches'), false);
  assert.equal(prOpen.base, 'main');
  assert.equal(prOpen.sha, prCommit.sha);
  const stamped = attachPacketCards([held], commits);
  assert.equal(stamped[0].key, 'packet:line-9');
  assert.equal(stamped[0].branch, undefined);
  const opened = { key: 'acme/app#9', repo: 'acme/app', number: 9, state: 'live', title: 'opened' };
  const cards = attachPacketCards([held, opened], events);
  assert.deepEqual(cards.map(card => card.key), ['acme/app#9']);
  assert.equal(cards[0].alias, 'packet:line-9');
  assert.equal(cards[0].branch, prOpen.head_ref);
  const alone = attachPacketCards([held], events);
  assert.equal(alone.length, 1);
  assert.equal(alone[0].key, 'acme/app#9');
  assert.equal(alone[0].alias, 'packet:line-9');
  assert.equal(alone[0].branch, prOpen.head_ref);
  const both = attachPacketCards([
    held,
    { key: 'acme/app#9', repo: 'acme/app', number: 9, state: 'live', title: 'opened' },
    { key: 'acme/app#10', repo: 'acme/app', number: 10, state: 'live', title: 'other' },
  ], COLLECTOR.two);
  assert.deepEqual(both.map(card => card.key).sort(), ['acme/app#10', 'acme/app#9', 'packet:line-9']);
  assert.equal(both.every(card => card.alias == null), true);
  const script = `
import json, os
from pathlib import Path
root = Path(os.environ["MESH_RUN"])
(root / "live").mkdir(parents=True)
events = json.loads(Path(os.environ["FIXTURE_EVENTS"]).read_text())
held = [{"key":"packet:line-9","born":"packet","repo":"acme/app","number":0,"state":"live","title":"hold","owner":"forge","last_beat_t":1}]
(root / "live" / "cards.json").write_text(json.dumps({"cards": held}))
import live_board
def one(cards):
    keys = [c["key"] for c in cards]
    assert keys.count("acme/app#9") == 1, keys
    assert "packet:line-9" not in keys, keys
    assert len(keys) == len(set(keys)), keys
    card = next(c for c in cards if c["key"] == "acme/app#9")
    head_ref = next(e.get("head_ref") for e in events if e.get("kind") == "pr_open")
    assert card.get("alias") == "packet:line-9", card
    assert card.get("branch") == head_ref, card
one(live_board.run(events, write=False, held=held)["cards"])
one(live_board.run(events, write=False)["cards"])
print("ok")
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-held-'));
  try {
    const eventsFile = path.join(dir, 'events.json');
    fs.writeFileSync(eventsFile, JSON.stringify(events));
    const ran = spawnSync('python3', ['-c', script], {
      cwd: FEED,
      env: { ...process.env, PYTHONPATH: FEED, PYTHONDONTWRITEBYTECODE: '1', MESH_RUN: dir, FIXTURE_EVENTS: eventsFile },
      encoding: 'utf8',
    });
    assert.equal(ran.status, 0, ran.stderr || ran.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the collector model rewrites a held card the same way', () => {
  const script = `
import live_board
held = [{"key":"packet:line-9","born":"packet","repo":"acme/app","number":0,"state":"live","title":"hold","owner":"forge","last_beat_t":1}]
evs = [
  {"id":"p","t_ct":"2026-10-20T12:00:00-05:00","kind":"push","repo":"acme/app","branch":"cursor/hold","card":"packet:line-9"},
  {"id":"o","t_ct":"2026-10-20T12:01:00-05:00","kind":"pr_open","repo":"acme/app","number":9,"head":"cursor/hold","source":"https://github.com/acme/app/pull/9","from":"forge","title":"held"},
]
cards = {c["key"]: c for c in live_board.model(evs, held=held)["cards"]}
assert "packet:line-9" not in cards, cards
card = cards["acme/app#9"]
assert card["alias"] == "packet:line-9", card
assert card["branch"] == "cursor/hold", card
kept = [{"key":"acme/app#3","born":"packet","repo":"acme/app","number":3,"state":"live","title":"stay"}]
again = {c["key"]: c for c in live_board.model([], held=kept)["cards"]}
assert again["acme/app#3"]["key"] == "acme/app#3"
print("ok")
`;
  const ran = spawnSync('python3', ['-c', script], {
    cwd: FEED,
    env: { ...process.env, PYTHONPATH: FEED, PYTHONDONTWRITEBYTECODE: '1' },
    encoding: 'utf8',
  });
  assert.equal(ran.status, 0, ran.stderr || ran.stdout);
});

function line(id, number) {
  return {
    id, t_ct: new Date().toISOString(), seat: 'forge', type: 'packet', repo: '0xRayAI/xray', number,
    title: 'card ' + id, url: 'https://github.com/0xRayAI/xray/issues/' + number, reason: 'packet post',
  };
}

test('a packet post creates one card, and no activity line carries card', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-packet-card-'));
  const forgeKey = 'forge-' + crypto.randomBytes(4).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [APP], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'on', SERVER_ROUTING: 'off', MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ingest,
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
      SEAT_KEYS: JSON.stringify({ forge: crypto.createHash('sha256').update(forgeKey).digest('hex') }),
      ARCH1_LAUNCH_ENABLED: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const port = await listenPort(child);
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: 'Bearer ' + forgeKey };
  const cards = async () => (await fetch(base + '/cards?seat=forge', { headers: auth })).json();
  try {
    const post = async (lines) => {
      const res = await fetch(base + '/inbox', {
        method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      });
      const text = await res.text();
      assert.equal(res.status, 200, text);
      return JSON.parse(text);
    };
    await post([line('live-1', 12)]);
    let body = await cards();
    const first = (body.cards || []).filter(card => card.key === '0xrayai/xray#12');
    assert.equal(first.length, 1);
    assert.equal(first[0].state, 'live');
    assert.equal(String(first[0].owner).toLowerCase(), 'forge');
    assert.equal(first[0].packet && first[0].packet.acceptance, undefined);
    await post([line('live-1', 12)]);
    body = await cards();
    assert.equal((body.cards || []).filter(card => card.key === '0xrayai/xray#12').length, 1);
    await post([line('hold-1', 0)]);
    body = await cards();
    assert.equal((body.cards || []).some(card => card.key === 'packet:hold-1'), true);
    assert.equal((body.cards || []).some(card => card.key === '0xrayai/xray#0'), false);
    fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
    const commitEvents = COLLECTOR.xray;
    const prCommit = commitEvents.find(event => event.kind === 'pr_commit');
    const prOpen = commitEvents.find(event => event.kind === 'pr_open');
    assert.equal(prOpen.base, 'main');
    assert.equal(prOpen.sha, prCommit.sha);
    assert.equal(Object.hasOwn(prCommit, 'branches'), false);
    assert.equal(commitEvents.some(event => event.kind === 'commit' && (event.branches || []).some(name => name !== 'main' && name !== 'develop')), false);
    fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
      generated_at: new Date().toISOString(),
      events: commitEvents,
    }));
    let attached = null;
    for (let i = 0; i < 30; i++) {
      body = await cards();
      attached = (body.cards || []).find(card => card.key === '0xrayai/xray#471');
      if (attached && attached.alias === 'packet:hold-1') break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(attached && attached.alias, 'packet:hold-1', JSON.stringify(body.cards));
    assert.equal(attached && attached.branch, prOpen.head_ref);
    assert.equal((body.cards || []).some(card => card.key === 'packet:hold-1'), false);
    const refused = await fetch(base + '/activity', {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: new Date().toISOString(), kind: 'cloud_agent', action: 'launch', agent: 'bc-hold00001', card: 'packet:hold-1' }),
    });
    assert.equal(refused.status, 422);
    assert.equal((await refused.json()).error, 'unknown field');
    const stored = path.join(data, 'live', 'activity.jsonl');
    if (fs.existsSync(stored)) assert.equal(fs.readFileSync(stored, 'utf8').includes('"card"'), false);
  } finally {
    const done = new Promise(r => child.exitCode != null || child.signalCode ? r() : child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
