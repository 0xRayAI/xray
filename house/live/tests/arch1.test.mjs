import { listenPort } from './free-port.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
let PORT = 0, BASE = '';
const K = 'arch1-' + crypto.randomBytes(8).toString('hex'), C = 'rev-' + crypto.randomBytes(8).toString('hex');
const INGEST = crypto.randomBytes(32).toString('hex'), H = k => crypto.createHash('sha256').update(k).digest('hex');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch1-')); let srv, logs = '';
before(async () => {
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', MESH_PASSWORD: 'x'+crypto.randomBytes(4).toString('hex'), PATH: process.env.PATH,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA, COLLECTOR: 'off', GITHUB_API_URL: 'http://127.0.0.1:1',
    SEAT_KEYS: JSON.stringify({ arch1: H(K), critic: H(C) }) }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
  PORT = await listenPort(srv); BASE = `http://127.0.0.1:${PORT}`;   // #304: port 0, read the assigned port
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
});
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const A = k => ({ Authorization: 'Bearer ' + k });
test('arch1 inbox: own key reads, wrong/other/no key refused, key never logged', async () => {
  const ln = { id: 'a1:x#262', t_ct: new Date().toISOString(), seat: 'arch1', type: 'issue_comment', repo: 'example-org/x', number: 262, sha: 'abc', title: 'deep review ask', url: '', reason: 'deep-review / Gate B ask for Arch1' };
  assert.equal((await fetch(BASE + '/inbox', { method: 'POST', body: JSON.stringify({ lines: [ln] }), headers: { 'X-Live-Ingest': INGEST, 'Content-Type': 'application/json' } })).status, 200);
  const r = await fetch(BASE + '/inbox/arch1', { headers: A(K) });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).lines.map(l => l.id), ['a1:x#262']);
  assert.equal((await fetch(BASE + '/inbox/arch1', { headers: A('wrong-' + K) })).status, 401);
  assert.equal((await fetch(BASE + '/inbox/arch1', {})).status, 401);
  assert.equal((await fetch(BASE + '/inbox/arch1', { headers: A(C) })).status, 403);
  await new Promise(r => setTimeout(r, 200));
  assert.ok(!logs.includes(K) && !logs.includes(H(K)), 'key leaked to server log');
});
