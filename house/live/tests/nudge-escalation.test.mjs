// Nudge ownership: the owning seat is woken L1 -> L3; at L3 with no move the CoS role (routing seats.coord, not a
// name) is woken too, to reassign. A stalled-board timed run also tells the CoS role.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const got = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { got.push({ path: q.url, body: JSON.parse(b || '{}') }); s.writeHead(200); s.end('{}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-esc-')), ROUTE = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-esc-r-'));
fs.mkdirSync(path.join(DATA, 'live', 'inbox'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'live', 'inbox', 'forge.jsonl'), JSON.stringify({ id: 'old-1', t_ct: new Date(Date.now() - 3600e3).toISOString(),
  seat: 'forge', type: 'pr_comment', repo: 'example-org/x', number: 9, title: 't', url: 'https://github.com/example-org/x/pull/9', reason: 'ask' }) + '\n');
fs.writeFileSync(path.join(ROUTE, 'inbox-roles.json'), JSON.stringify({ seats: { coord: { seat: 'critic' } }, extra_seats: { forge: { needles: ['@forge'] } } }));
fs.writeFileSync(path.join(ROUTE, 'roster.json'), JSON.stringify({ seats: ['forge', 'critic'] }));
const PORT = 27000 + Math.floor(Math.random() * 1000), BASE = `http://127.0.0.1:${PORT}`;
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: String(PORT), PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA,
  SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${W}/forge` }, critic: { url: `${W}/critic` } }), WAKE_KEY_FORGE: 'k', WAKE_KEY_CRITIC: 'k',
  WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0', NUDGE_LINE_S: '1', BIFROST_TICK_S: '0.2',
  BIFROST_TRIPWIRE_MINUTES: '0.1', BIFROST_ROUTING_DIR: ROUTE, BIFROST_ROSTER: path.join(ROUTE, 'roster.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
after(() => { srv.kill(); sink.close(); fs.rmSync(DATA, { recursive: true, force: true }); fs.rmSync(ROUTE, { recursive: true, force: true }); });
const until = async fn => { for (let i = 0; i < 150 && !fn(); i++) await new Promise(r => setTimeout(r, 100)); return fn(); };

test('owner is nudged L1 -> L3, then the CoS role is woken to reassign (once)', async () => {
  assert.ok(await until(() => got.some(g => g.path === '/critic' && /L3 no move on forge: reassign/.test(g.body.reason))), logs);
  const levels = got.filter(g => g.path === '/forge').map(g => (/^nudge (L\d)/.exec(g.body.reason) || [])[1]).filter(Boolean);
  assert.deepEqual(levels.slice(0, 3), ['L1', 'L2', 'L3']);
  await new Promise(r => setTimeout(r, 1500));
  assert.equal(got.filter(g => g.path === '/critic' && /reassign/.test(g.body.reason)).length, 1);
  assert.ok(levels.length <= 3 && got.filter(g => g.path === '/forge' && /^nudge L/.test(g.body.reason)).length === 3, 'stops after L3');
});

test('an empty board (no open cards) wakes the CoS role with pull-next-work, once per window', async () => {
  assert.ok(await until(() => got.some(g => g.path === '/critic' && /board empty, pull next work/.test(g.body.reason))), logs);
  await new Promise(r => setTimeout(r, 2000));   // well inside the 6 s window
  assert.equal(got.filter(g => g.path === '/critic' && /board empty/.test(g.body.reason)).length, 1, 'once per window');
});
