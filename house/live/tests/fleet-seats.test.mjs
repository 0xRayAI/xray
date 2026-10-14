// Fleet inbox seats: each seat key reads its own inbox (200), wrong/no key 401, another seat's inbox 403.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const SEATS = ['arch1', 'forge', 'critic', 'mill', 'blinky', 'herald', 'nibbler', 'sound', 'magnet'];
const PORT = 22000 + Math.floor(Math.random() * 1000), BASE = `http://127.0.0.1:${PORT}`;
const KEY = Object.fromEntries(SEATS.map(s => [s, s + '-' + crypto.randomBytes(8).toString('hex')]));
const INGEST = crypto.randomBytes(32).toString('hex'), H = k => crypto.createHash('sha256').update(k).digest('hex');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-fleet-')); let srv, logs = '';
before(async () => {
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: String(PORT), MESH_PASSWORD: 'x' + crypto.randomBytes(4).toString('hex'), PATH: process.env.PATH,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA, COLLECTOR: 'off', GITHUB_API_URL: 'http://127.0.0.1:1',
    SEAT_KEYS: JSON.stringify(Object.fromEntries(SEATS.map(s => [s, H(KEY[s])]))) }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
});
after(() => { srv.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });
const A = k => ({ Authorization: 'Bearer ' + k });
test('every fleet seat: own key 200 with its line, wrong/none 401, cross-seat 403, keys never logged', async () => {
  const lines = SEATS.map(s => ({ id: `${s}:x#262`, t_ct: new Date().toISOString(), seat: s, type: 'issue_comment', repo: 'example-org/x', number: 262, sha: 'abc', title: 'ask', url: '', reason: 'test' }));
  assert.equal((await fetch(BASE + '/inbox', { method: 'POST', body: JSON.stringify({ lines }), headers: { 'X-Live-Ingest': INGEST, 'Content-Type': 'application/json' } })).status, 200);
  for (const [i, s] of SEATS.entries()) {
    const r = await fetch(BASE + '/inbox/' + s, { headers: A(KEY[s]) });
    assert.equal(r.status, 200, s);
    assert.deepEqual((await r.json()).lines.map(l => l.id), [`${s}:x#262`], s);
    assert.equal((await fetch(BASE + '/inbox/' + s, { headers: A('wrong-' + KEY[s]) })).status, 401, s);
    assert.equal((await fetch(BASE + '/inbox/' + s, {})).status, 401, s);
    const other = SEATS[(i + 1) % SEATS.length];
    assert.equal((await fetch(BASE + '/inbox/' + s, { headers: A(KEY[other]) })).status, 403, `${other} on ${s}`);
  }
  await new Promise(r => setTimeout(r, 200));
  for (const s of SEATS) assert.ok(!logs.includes(KEY[s]) && !logs.includes(H(KEY[s])), 'key leaked: ' + s);
});
