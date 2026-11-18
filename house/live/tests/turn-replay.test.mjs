// A line stored during a live turn wakes the seat once when that turn ends.
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
import { createWakeState, gateLine, releaseForTurn, wakeConfig } from '../app/wake-gate.mjs';

test('a turn-scoped hold is due at turn end and a longer cooldown stays held', () => {
  const st = createWakeState();
  const cfg = wakeConfig({ LIVE_TURN_OPEN_MIN: '20' });
  const started = 1_700_000_000_000;
  st.turnOpen.set('critic', started);
  const line = { id: 'mid', type: 'pr_update', repo: 'acme/app', number: 347, sha: '20ea5fb', title: 'review ask', t_ct: new Date(started + 1000).toISOString() };
  const held = gateLine({ seat: 'critic', line }, st, started + 1000, cfg);
  assert.equal(held.op, 'queue');
  st.hold.push({ seat: 'critic', line, until: held.until });
  st.hold.push({ seat: 'critic', line: { ...line, id: 'cool' }, until: started + cfg.turnOpenMs + 60_000 });
  const due = releaseForTurn(st, 'critic', started, started + 5_000, cfg.turnOpenMs);
  assert.deepEqual(due.map((row) => row.id), ['mid']);
  assert.equal(st.hold.length, 1);
  assert.equal(st.hold[0].line.id, 'cool');
});

test('a line stored mid-turn wakes the seat once at turn end', async () => {
  const hits = [];
  const hook = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      hits.push(Buffer.concat(chunks).toString('utf8'));
      if (hits.length === 1) {
        res.writeHead(409, { 'x-bifrost-wake': 'noop', 'content-type': 'application/json' });
        res.end('{"ok":true,"woken":false,"dropped":1,"reason":"claim"}');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true,"woken":true}');
    });
  });
  await new Promise((r) => hook.listen(0, '127.0.0.1', r));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-replay-'));
  const key = 'critic-' + crypto.randomBytes(4).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', SERVER_ROUTING: 'off', LIVE_PUBLIC: '1', FLEET_MODE: 'full',
      MESH_DATA_DIR: data, INGEST_SECRET: ingest,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      LIVE_SEAT_IDS: 'critic,forge',
      SEAT_KEYS: JSON.stringify({ critic: crypto.createHash('sha256').update(key).digest('hex') }),
      SEAT_WEBHOOKS: JSON.stringify({ critic: { url: 'http://127.0.0.1:' + hook.address().port + '/critic' } }),
      WAKE_KEY_CRITIC: 'k', WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    const port = await listenPort(child);
    const base = `http://127.0.0.1:${port}`;
    const act = (action) => fetch(base + '/activity', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: new Date().toISOString(), kind: 'turn', action, tag: 'wake' }),
    });
    assert.equal((await act('start')).status, 202);
    const posted = await fetch(base + '/inbox', {
      method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [{
        id: 'pr:usmail-ai/postalocity-ai#347@20ea5fb', t_ct: new Date().toISOString(), seat: 'critic',
        type: 'pr_update', repo: 'usmail-ai/postalocity-ai', number: 347, sha: '20ea5fb14bef',
        title: 'review ask', url: 'https://github.com/usmail-ai/postalocity-ai/pull/347', reason: 'review ask',
      }] }),
    });
    assert.equal(posted.status, 200, await posted.text());
    await new Promise((r) => setTimeout(r, 200));
    const before = hits.length;
    assert.equal((await act('end')).status, 202);
    for (let i = 0; i < 30 && hits.length < before + 1; i++) await new Promise((r) => setTimeout(r, 50));
    assert.equal(hits.length - before, 1, logs);
  } finally {
    const done = new Promise((r) => child.exitCode != null || child.signalCode ? r() : child.once('exit', r));
    child.kill();
    await done;
    await new Promise((r) => hook.close(r));
    fs.rmSync(data, { recursive: true, force: true });
  }
});
