// Server inbox routing: a collector pass routes new events into seat inboxes (inbox_pass.py rules), fires the seat
// wake, and never routes the same event twice, including across a restart (state on the volume).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-route-'));
const wakes = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { wakes.push({ path: q.url, auth: q.headers.authorization, body: JSON.parse(b) }); s.writeHead(200); s.end('{}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const hooks = Object.fromEntries(['forge', 'critic', 'mill', 'blinky'].map(s => [s, { url: `${W}/${s}`, key_env: `K_${s.toUpperCase()}` }]));
delete hooks.mill.key_env;   // #275: mill uses the per-seat WAKE_KEY_MILL
let srv = null, logs = '', srvPort = 0;
function start() {
  srvPort = 0;   // #304: port 0, the real port comes from the listening line
  logs = '';
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH,
    MESH_PASSWORD: 'x' + crypto.randomBytes(4).toString('hex'), SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA, SEAT_WEBHOOKS: JSON.stringify(hooks),
    K_FORGE: 'kf', WAKE_KEY_MILL: 'km', WAKE_KEY_FORGE: 'ignored', K_BLINKY: 'kb', WAKE_DEBOUNCE_S: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => { logs += d; const m = /listening on :(\d+)/.exec(logs); if (m) srvPort = Number(m[1]); }); srv.stderr.on('data', d => logs += d);
}
async function stop() { if (!srv) return; const p = new Promise(r => srv.once('exit', r)); srv.kill(); await p; srv = null; }
after(async () => { await stop(); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const count = re => (logs.match(new RegExp(re.source, 'g')) || []).length;
const until = async (fn, n = 100) => { for (let i = 0; i < n && !fn(); i++) await sleep(100); return fn(); };
const ct = ago => new Date(Date.now() - ago * 1000).toISOString();
const R = 'acme/one';
const old = [{ id: `${R}#1:open`, t_ct: ct(900), kind: 'pr_open', repo: R, number: 1, label: 'old pr' }];
const fresh = [
  { id: `${R}#5:comment:1`, t_ct: ct(60), kind: 'pr_comment', repo: R, number: 5, label: 'comment on #5', from: 'critic', to: 'forge',
    pr_merged: true, mentions: ['mill'], source: 'https://github.com/acme/one/pull/5', body: 'SECRET body' },
  { id: `${R}#6:comment:2`, t_ct: ct(30), kind: 'issue_comment', repo: R, number: 6, label: 'comment on issue #6', from: 'mill' }];
let gen = 0;
function writeFeed(events) {
  fs.mkdirSync(path.join(DATA, 'feed'), { recursive: true });
  const f = path.join(DATA, 'feed', 'github-events.json');
  fs.writeFileSync(f + '.tmp', JSON.stringify({ generated_at: ct(0).replace('Z', '+00:00'), gen: ++gen, events })); fs.renameSync(f + '.tmp', f);
}
const inbox = s => { try { return fs.readFileSync(path.join(DATA, 'live', 'inbox', s + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } };

test('first pass seeds silently: history is never delivered', async () => {
  writeFeed(old); start();
  assert.ok(await until(() => /route: pass 0 0/.test(logs)), logs);
  for (const s of ['forge', 'critic', 'mill', 'blinky']) assert.equal(inbox(s).length, 0, s);
  assert.equal(wakes.length, 0);
});

test('new events route by inbox-roles.json rules and wake the seat', async () => {
  writeFeed([...old, ...fresh]);
  assert.ok(await until(() => /route: pass 2 \d+/.test(logs)), logs);
  const ids = s => inbox(s).map(l => l.id).sort();
  assert.deepEqual(ids('forge'), [`${R}#5:comment:1`]);                         // PR author, merged PR
  assert.match(inbox('forge')[0].reason, /comment on your PR \(merged PR\)/);
  assert.deepEqual(ids('mill'), [`${R}#5:comment:1`]);                          // @mill from the body (handle only)
  assert.deepEqual(ids('blinky'), [`${R}#5:comment:1`, `${R}#6:comment:2`]);    // comment watch
  assert.deepEqual(ids('critic'), []);                                           // own action never routed back
  assert.ok(!JSON.stringify(['forge', 'mill', 'blinky'].map(inbox)).includes('SECRET'), 'body copied');
  assert.ok(await until(() => new Set(wakes.map(w => w.path)).size === 3), JSON.stringify(wakes));
  assert.deepEqual([...new Set(wakes.map(w => w.path))].sort(), ['/blinky', '/forge', '/mill']);
  assert.equal(wakes.find(w => w.path === '/forge').auth, 'Bearer kf');
});

test('#275: WAKE_KEY_<SEAT> works without key_env (key_env still wins); /healthz has wakes + liveness ages, no url or key', async () => {
  assert.equal(wakes.find(w => w.path === '/mill').auth, 'Bearer km');
  assert.equal(wakes.find(w => w.path === '/forge').auth, 'Bearer kf');
  const h = await (await fetch(`http://127.0.0.1:${srvPort}/healthz`)).json();
  assert.deepEqual(h.wakes, { forge: 'ok', critic: 'no_key', mill: 'ok', blinky: 'ok' });
  for (const k of ['box_age', 'collector_age', 'card_age']) assert.ok(k in h, k);
  assert.equal(h.box_age, null);   // no box push in this test
  assert.ok(Number.isInteger(h.collector_age) && h.collector_age >= 0);
  const raw = JSON.stringify(h);
  for (const bad of [W, 'kf', 'km', 'kb', 'K_FORGE', 'WAKE_KEY']) assert.ok(!raw.includes(bad), bad);
});

test('same events again, and after a restart: nothing routed twice, no second wake', async () => {
  const before = wakes.length, n = ['forge', 'mill', 'blinky'].map(s => inbox(s).length);
  writeFeed([...old, ...fresh]);
  assert.ok(await until(() => count(/route: pass 0 0/) >= 2), logs);
  await stop(); start();
  assert.ok(await until(() => /route: pass 0 0/.test(logs)), logs);              // warm start re-reads the feed
  writeFeed([...old, ...fresh]);
  assert.ok(await until(() => count(/route: pass 0 0/) >= 2), logs);
  await sleep(300);
  assert.deepEqual(['forge', 'mill', 'blinky'].map(s => inbox(s).length), n);
  assert.equal(wakes.length, before);
  const next = { id: `${R}#5:comment:3`, t_ct: ct(5), kind: 'pr_comment', repo: R, number: 5, label: 'comment on #5', from: 'blinky', to: 'forge' };
  writeFeed([...old, ...fresh, next]);
  assert.ok(await until(() => /route: pass 1 \d+/.test(logs)), logs);
  assert.ok(inbox('forge').some(l => l.id === next.id) && !inbox('blinky').some(l => l.id === next.id));
  // the wake for `next` is async: wait for it here, or it lands inside the next test's count (the old 1-in-6 flake)
  assert.ok(await until(() => wakes.length === before + 1), JSON.stringify(wakes));
});

test('a stored-but-unmarked line (crash between store and sent) is not stored or woken twice', async () => {
  const st = path.join(DATA, 'route', 'inbox-state.json'); const s = JSON.parse(fs.readFileSync(st, 'utf8'));
  s.sent = []; fs.writeFileSync(st, JSON.stringify(s));
  const before = wakes.length, n = ['forge', 'mill', 'blinky'].map(x => inbox(x).length);
  await stop(); start();
  assert.ok(await until(() => /route: pass 0 0/.test(logs)), logs);
  await sleep(300);
  assert.deepEqual(['forge', 'mill', 'blinky'].map(x => inbox(x).length), n);
  assert.equal(wakes.length, before);
});

