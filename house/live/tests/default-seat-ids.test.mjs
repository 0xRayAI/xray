// LIVE_SEAT_IDS unset: the default seat list still holds mill, near, and nibbler.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-default-seats-'));
const wakes = [];
const sink = http.createServer((q, s) => {
  let b = '';
  q.on('data', d => { b += d; });
  q.on('end', () => { wakes.push(q.url); s.writeHead(200); s.end('{}'); });
});
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const secret = crypto.randomBytes(32).toString('hex');
const hooks = Object.fromEntries(['mill', 'near', 'nibbler'].map(s => [s, { url: `${W}/${s}` }]));
let logs = '';
const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, MESH_DATA_DIR: DATA, INGEST_SECRET: secret,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
    SEAT_WEBHOOKS: JSON.stringify(hooks),
    WAKE_KEY_MILL: 'km', WAKE_KEY_NEAR: 'kn', WAKE_KEY_NIBBLER: 'ki',
    WAKE_DEBOUNCE_S: '0', LIVE_TURN_OPEN_MIN: '0', COLLECTOR: 'off',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', d => { logs += d; });
child.stderr.on('data', d => { logs += d; });
after(async () => {
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
  sink.close();
  fs.rmSync(DATA, { recursive: true, force: true });
});

function base() {
  const m = /listening on :(\d+)/.exec(logs);
  return m ? `http://127.0.0.1:${m[1]}` : null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const line = (seat) => ({
  id: `${seat}:default`, t_ct: new Date().toISOString(), seat, type: 'prompt', repo: 'acme/one', number: 1,
  title: `@${seat}`, url: 'https://github.com/acme/one/issues/1', reason: `owner prompt @${seat}`,
});

test('an unset LIVE_SEAT_IDS still stores and wakes mill, near, and nibbler', async () => {
  for (let i = 0; i < 50 && !base(); i++) await sleep(100);
  assert.ok(base(), logs);
  const health = await (await fetch(base() + '/healthz')).json();
  for (const seat of ['mill', 'near', 'nibbler']) assert.equal(health.wakes[seat], 'idle', seat);
  const posted = await fetch(base() + '/inbox', {
    method: 'POST',
    headers: { 'X-Live-Ingest': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: ['mill', 'near', 'nibbler'].map(line) }),
  });
  const body = await posted.json();
  assert.equal(posted.status, 200, JSON.stringify(body));
  assert.equal(body.added, 3);
  for (let i = 0; i < 40 && ['/mill', '/near', '/nibbler'].some(p => !wakes.includes(p)); i++) await sleep(100);
  for (const path of ['/mill', '/near', '/nibbler']) assert.ok(wakes.includes(path), JSON.stringify(wakes) + '\n' + logs);
});
