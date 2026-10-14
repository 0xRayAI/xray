// Local end-to-end: the collector file owns the board. One feed yields a card and its packet,
// a later comment wakes the seat, and an ack clears the line. No token and no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const REPO = 'example/app';
const LINE_ID = `${REPO}#7:comment:1`;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function writeFeed(dir, events, board) {
  const feedDir = path.join(dir, 'feed');
  fs.mkdirSync(feedDir, { recursive: true });
  const body = { generated_at: new Date().toISOString(), events };
  if (board) body.board = board;
  const file = path.join(feedDir, 'github-events.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(body));
  fs.renameSync(file + '.tmp', file);
}

test('collector feed shows a card and packet, wakes the seat, and an ack clears the line', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-flow-'));
  const wakes = [];
  const sink = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      wakes.push({ path: req.url || '', body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });
  const wakePort = await listen(sink);
  const forgeKey = 'forge-' + crypto.randomBytes(8).toString('hex');
  const forgeHash = crypto.createHash('sha256').update(forgeKey).digest('hex');
  const ago = sec => new Date(Date.now() - sec * 1000).toISOString();
  writeFeed(data, [{
    id: `${REPO}#1:open`, t_ct: ago(900), kind: 'pr_open', repo: REPO, number: 1, label: 'older pr',
  }]);
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0',
      PATH: process.env.PATH,
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_DATA_DIR: data,
      COLLECTOR: 'on',
      COLLECTOR_STALE_S: '180',
      SEAT_KEYS: JSON.stringify({ forge: forgeHash }),
      SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `http://127.0.0.1:${wakePort}/forge`, key_env: 'WAKE_KEY_FORGE' } }),
      WAKE_KEY_FORGE: 'wake-secret-for-forge',
      WAKE_DEBOUNCE_S: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const stop = async () => {
    if (child.exitCode == null) {
      const done = new Promise(r => child.once('exit', r));
      child.kill();
      await done;
    }
    sink.close();
    fs.rmSync(data, { recursive: true, force: true });
  };
  try {
    const port = await listenPort(child);
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50 && !/route: pass 0 0/.test(logs); i++) await new Promise(r => setTimeout(r, 100));
    assert.match(logs, /route: pass 0 0/);
    const now = Date.now();
    writeFeed(data, [
      { id: `${REPO}#1:open`, t_ct: ago(900), kind: 'pr_open', repo: REPO, number: 1, label: 'older pr' },
      { id: LINE_ID, t_ct: ago(5), kind: 'pr_comment', repo: REPO, number: 7, label: 'please review', from: 'critic', to: 'forge' },
    ], { cards: [{
      key: `${REPO}#7`, kind: 'pr', repo: REPO, number: 7, title: 'Ship the board', state: 'live', stage: 'review',
      owner: 'forge', url: 'https://github.com/example/app/pull/7',
      packet: { 'next owner': 'critic', ask: 'review the diff' }, packet_ok: true, missing: [],
      beats: [{ t: now, what: 'opened', url: '', id: 'b7' }], last_beat_t: now,
    }] });
    const auth = { Authorization: 'Bearer ' + forgeKey };
    let card;
    for (let i = 0; i < 40; i++) {
      const res = await fetch(base + '/cards?seat=forge', { headers: auth });
      const body = await res.json();
      card = (body.cards || []).find(c => c.number === 7);
      if (card && wakes.some(w => w.path === '/forge' && w.body.inbox_id === LINE_ID)) break;
      await new Promise(r => setTimeout(r, 150));
    }
    assert.ok(card, 'card missing\n' + logs);
    assert.equal(card.packet['next owner'], 'critic');
    assert.equal(card.packet.ask, 'review the diff');
    assert.equal(card.packet_ok, true);
    const wake = wakes.find(w => w.path === '/forge');
    assert.ok(wake, 'wake missing ' + JSON.stringify(wakes));
    assert.equal(wake.body.seat, 'forge');
    assert.deepEqual(wake.body.ids, [LINE_ID]);
    const open = await (await fetch(base + '/inbox/forge', { headers: auth })).json();
    assert.ok(open.lines.some(l => l.id === LINE_ID));
    const acked = await fetch(base + '/inbox/forge/ack', {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: LINE_ID }),
    });
    assert.equal(acked.status, 200);
    const afterAck = await acked.json();
    assert.equal(afterAck.ok, true);
    assert.equal(afterAck.acked, 1);
    const cleared = await (await fetch(base + '/inbox/forge', { headers: auth })).json();
    assert.equal(cleared.lines.some(l => l.id === LINE_ID), false);
    const healthRes = await fetch(base + '/healthz');
    const health = await healthRes.json();
    assert.equal(healthRes.status, 200);
    assert.equal(health.ok, true);
    assert.equal(health.feed_quiet, false);
    assert.equal(health.cards_behind, false);
    assert.equal(health.board, 'live');
    assert.equal(health.wakes.forge, 'ok');
    assert.equal(health.box_informational, true);
    assert.equal(JSON.stringify(health).includes('wake-secret-for-forge'), false);
  } finally {
    await stop();
  }
});
