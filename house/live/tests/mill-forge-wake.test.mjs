// A pr_open that mentions mill, and a terminal op_deploy, each attempt a wake.
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
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-wake-'));
const wakes = [];
const sink = http.createServer((q, s) => {
  let b = '';
  q.on('data', d => { b += d; });
  q.on('end', () => { wakes.push(q.url); s.writeHead(200); s.end('{}'); });
});
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const secret = crypto.randomBytes(32).toString('hex');
const hooks = { mill: { url: W + '/mill', key_env: 'K_MILL' }, forge: { url: W + '/forge', key_env: 'K_FORGE' } };
let logs = '';
const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, MESH_DATA_DIR: DATA, INGEST_SECRET: secret,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
    SEAT_WEBHOOKS: JSON.stringify(hooks), K_MILL: 'km', K_FORGE: 'kf', WAKE_DEBOUNCE_S: '0',
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

test('mill and forge webhooks fire for a mention and a terminal deploy', async () => {
  fs.mkdirSync(path.join(DATA, 'feed'), { recursive: true });
  const feed = path.join(DATA, 'feed', 'github-events.json');
  const old = [{ id: 'acme/one#1:open', t_ct: new Date(Date.now() - 900000).toISOString(), kind: 'pr_open', repo: 'acme/one', number: 1, label: 'old' }];
  fs.writeFileSync(feed, JSON.stringify({ generated_at: new Date().toISOString(), events: old }));
  for (let i = 0; i < 50 && !/route: pass 0 0/.test(logs); i++) await sleep(100);
  assert.match(logs, /route: pass 0 0/);
  const fresh = old.concat([
    { id: 'acme/one#9:open', t_ct: new Date(Date.now() - 30000).toISOString(), kind: 'pr_open', repo: 'acme/one', number: 9, from: 'critic', label: 'pr 9', mentions: ['mill'], source: 'https://github.com/acme/one/pull/9' },
    { id: 'op:rw:abcd1234:SUCCESS', t_ct: new Date(Date.now() - 10000).toISOString(), kind: 'op_deploy', status: 'SUCCESS', from: 'Operator', repo: 'acme/one', number: 0, label: 'deploy success', service: 'burst-live' },
  ]);
  fs.writeFileSync(feed + '.tmp', JSON.stringify({ generated_at: new Date().toISOString(), events: fresh }));
  fs.renameSync(feed + '.tmp', feed);
  for (let i = 0; i < 80 && !(wakes.includes('/mill') && wakes.includes('/forge')); i++) await sleep(100);
  assert.ok(wakes.includes('/mill'), logs + '\n' + JSON.stringify(wakes));
  assert.ok(wakes.includes('/forge'), logs + '\n' + JSON.stringify(wakes));
  const line = { id: 'op-line', t_ct: new Date().toISOString(), seat: 'operator', type: 'nudge', repo: 'acme/one', number: 1, title: 't', url: 'https://github.com/acme/one/pull/1', reason: 'operator line' };
  const posted = await fetch(base() + '/inbox', { method: 'POST', headers: { 'X-Live-Ingest': secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [line] }) });
  assert.equal(posted.status, 200);
  const before = wakes.filter(w => w === '/forge').length;
  for (let i = 0; i < 40 && wakes.filter(w => w === '/forge').length <= before; i++) await sleep(100);
  assert.ok(wakes.filter(w => w === '/forge').length > before);
});
