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
import { acceptWaveCards, attachPacketCards, retainSeedCards } from '../app/wave-schedule.mjs';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const FEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed');

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

test('a collector commit and pr_open leave one card per id', () => {
  const sha = 'ab' + 'c'.repeat(38);
  const held = { key: 'packet:line-9', born: 'packet', repo: 'acme/app', number: 0, state: 'live', title: 'hold', owner: 'forge' };
  const opened = { key: 'acme/app#9', repo: 'acme/app', number: 9, state: 'live', title: 'opened' };
  const events = [
    { kind: 'commit', repo: 'acme/app', sha, branches: ['main', 'cursor/hold'], src_file: 'github-api' },
    { kind: 'pr_open', repo: 'Acme/App', number: 9, base: 'main', sha, source: 'https://github.com/acme/app/pull/9' },
  ];
  const cards = attachPacketCards([held, opened], events);
  const keys = cards.map(card => card.key);
  assert.equal(keys.length, 1);
  assert.equal(keys[0], 'acme/app#9');
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(cards[0].alias, 'packet:line-9');
  assert.equal(cards[0].branch, 'cursor/hold');
  const script = `
import json, os
from pathlib import Path
root = Path(os.environ["MESH_RUN"])
(root / "live").mkdir(parents=True)
held = [{"key":"packet:line-9","born":"packet","repo":"acme/app","number":0,"state":"live","title":"hold","owner":"forge","last_beat_t":1}]
(root / "live" / "cards.json").write_text(json.dumps({"cards": held}))
import live_board
sha = ${JSON.stringify(sha)}
evs = [
  {"id":"c","t_ct":"2026-10-20T12:00:00-05:00","kind":"commit","repo":"acme/app","sha":sha,"branches":["main","cursor/hold"],"from":"forge","src_file":"github-api"},
  {"id":"o","t_ct":"2026-10-20T12:01:00-05:00","kind":"pr_open","repo":"acme/app","number":9,"base":"main","sha":sha,"source":"https://github.com/acme/app/pull/9","from":"forge","title":"held","pr_state":"open"},
]
def one(cards):
    keys = [c["key"] for c in cards]
    assert keys.count("acme/app#9") == 1, keys
    assert "packet:line-9" not in keys, keys
    assert len(keys) == len(set(keys)), keys
    card = next(c for c in cards if c["key"] == "acme/app#9")
    assert card.get("alias") == "packet:line-9", card
    assert card.get("branch") == "cursor/hold", card
one(live_board.run(evs, write=False, held=held)["cards"])
one(live_board.run(evs, write=False)["cards"])
print("ok")
`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-held-'));
  try {
    const ran = spawnSync('python3', ['-c', script], {
      cwd: FEED,
      env: { ...process.env, PYTHONPATH: FEED, PYTHONDONTWRITEBYTECODE: '1', MESH_RUN: dir },
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
    const t = new Date().toISOString();
    fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
    fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
      generated_at: t,
      events: [
        { id: 'push-1', t_ct: t, kind: 'push', repo: '0xRayAI/xray', branch: 'cursor/card-required', card: 'packet:hold-1' },
      ],
    }));
    let branched = null;
    for (let i = 0; i < 20; i++) {
      body = await cards();
      branched = (body.cards || []).find(card => card.key === 'packet:hold-1');
      if (branched && branched.branch === 'cursor/card-required') break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(branched && branched.branch, 'cursor/card-required', logs);
    fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
      generated_at: new Date().toISOString(),
      events: [
        { id: 'push-1', t_ct: t, kind: 'push', repo: '0xRayAI/xray', branch: 'cursor/card-required', card: 'packet:hold-1' },
        { id: 'pr-1', t_ct: new Date().toISOString(), kind: 'pr_open', repo: '0xRayAI/xray', number: 471, head: 'cursor/card-required', url: 'https://github.com/0xRayAI/xray/pull/471' },
      ],
    }));
    let attached = null;
    for (let i = 0; i < 20; i++) {
      body = await cards();
      attached = (body.cards || []).find(card => card.key === '0xrayai/xray#471');
      if (attached && attached.alias === 'packet:hold-1') break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(attached && attached.alias, 'packet:hold-1', JSON.stringify(body.cards));
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
