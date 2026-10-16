import { listenPort } from './free-port.mjs';
// A plain read still shows a merged card. ?stale=1 lists merged, closed, and off-board lines. {stale:true} acks only those.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
let BASE = '';
const CKEY = 'critic-' + crypto.randomBytes(8).toString('hex');
const INGEST = crypto.randomBytes(32).toString('hex');
const H = k => crypto.createHash('sha256').update(k).digest('hex');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-stale-'));
let srv;
before(async () => {
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH,
    MESH_PASSWORD: crypto.randomBytes(8).toString('hex'), SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA, COLLECTOR: 'off', GITHUB_API_URL: 'http://127.0.0.1:1',
    SEAT_KEYS: JSON.stringify({ critic: H(CKEY) }) }, stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await listenPort(srv); BASE = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
});
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const CK = () => ({ Authorization: 'Bearer ' + CKEY });

test('stale ack settles merged, closed, and off-board lines and leaves the live card on the plain read', async () => {
  const R = 'example-org/stale';
  const t0 = new Date().toISOString();
  const mk = (id, n) => ({ id, t_ct: t0, seat: 'critic', type: 'pr_comment', repo: R, number: n, title: 'note', url: '', reason: 'ask' });
  const posted = await fetch(BASE + '/inbox', { method: 'POST', body: JSON.stringify({ lines: [mk('stale:done', 71), mk('stale:closed', 72), mk('stale:gone', 73), mk('stale:live', 74)] }), headers: { 'X-Live-Ingest': INGEST, 'Content-Type': 'application/json' } });
  assert.equal(posted.status, 200);
  const card = (n, stage, state) => ({ key: R + '#' + n, kind: 'pr', repo: R, number: n, title: 'c', url: '', owner: 'forge', stage, state, packet: {}, beats: [], last_beat_t: Date.now() });
  const board = await fetch(BASE + '/ingest', { method: 'POST', body: JSON.stringify({ title: 't', event_count: 1, generated_at: new Date().toISOString(), events: [{ id: R + '#72:close', t_ct: t0, kind: 'issue_close', repo: R, number: 72 }], board: { updated_ct: 'x', cards: [card(71, 'done', 'live'), card(72, 'review', 'closed'), card(74, 'review', 'live')] } }), headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' } });
  assert.equal(board.status, 200);
  const ids = async (q = '') => (await (await fetch(BASE + '/inbox/critic' + q, { headers: CK() })).json()).lines.map(l => l.id).filter(id => id.startsWith('stale:')).sort();
  assert.deepEqual(await ids(), ['stale:closed', 'stale:done', 'stale:gone', 'stale:live']);
  assert.deepEqual(await ids('?stale=1'), ['stale:closed', 'stale:done', 'stale:gone']);
  const acked = await (await fetch(BASE + '/inbox/critic/ack', { method: 'POST', body: JSON.stringify({ stale: true }), headers: { ...CK(), 'Content-Type': 'application/json' } })).json();
  assert.equal(acked.acked, 3);
  assert.deepEqual(await ids(), ['stale:live']);
  assert.deepEqual((await ids('?all=1')).filter(id => id !== 'stale:live').sort(), ['stale:closed', 'stale:done', 'stale:gone']);
});
