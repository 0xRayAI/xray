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
    K_FORGE: 'kf', WAKE_KEY_MILL: 'km', WAKE_KEY_FORGE: 'ignored', K_BLINKY: 'kb', WAKE_DEBOUNCE_S: '0',
    WAKE_KIND_COOLDOWN_S: '0', LIVE_TURN_OPEN_MIN: '0',
    LIVE_SEAT_IDS: 'arch1,forge,critic,blinky,herald,nibbler,sound,magnet,near,mill' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => { logs += d; const m = /listening on :(\d+)/.exec(logs); if (m) srvPort = Number(m[1]); }); srv.stderr.on('data', d => logs += d);
}
async function stop() { if (!srv) return; const p = new Promise(r => srv.once('exit', r)); srv.kill(); await p; srv = null; }
after(async () => { await stop(); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tick() {
  const h = await (await fetch(`http://127.0.0.1:${srvPort}/healthz`)).json();
  return h.last_tick || '';
}
async function sawNewTick(prev) {
  for (let i = 0; i < 80; i++) {
    try { const now = await tick(); if (now && now !== prev) return true; } catch { /* not up */ }
    await sleep(100);
  }
  return false;
}
const count = re => (logs.match(new RegExp(re.source, 'g')) || []).length;
const until = async (fn, n = 100) => { for (let i = 0; i < n && !fn(); i++) await sleep(100); return fn(); };
const ct = ago => new Date(Date.now() - ago * 1000).toISOString();
const R = 'acme/one';
const old = [{ id: `${R}#1:open`, t_ct: ct(900), kind: 'pr_open', repo: R, number: 1, label: 'old pr' }];
const fresh = [
  { id: `${R}#5:comment:1`, t_ct: ct(60), kind: 'pr_comment', repo: R, number: 5, label: 'comment on #5', from: 'Others', to: 'forge',
    pr_merged: true, mentions: ['mill'], source: 'https://github.com/acme/one/pull/5', body: 'SECRET body' },
  { id: `${R}#6:comment:2`, t_ct: ct(30), kind: 'issue_comment', repo: R, number: 6, label: 'comment on issue #6', from: 'Others' },
  { id: `${R}#7:comment:impl`, t_ct: ct(20), kind: 'issue_comment', repo: R, number: 7, label: 'implement ask on #7', from: 'Others' },
  { id: `${R}#8:comment:wave`, t_ct: ct(15), kind: 'issue_comment', repo: R, number: 8, label: 'mill wave 4', from: 'Others' }];
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
  assert.ok(await until(() => /route: pass 4 \d+/.test(logs)), logs);
  const ids = s => inbox(s).map(l => l.id).sort();
  assert.deepEqual(ids('forge'), [`${R}#5:comment:1`, `${R}#7:comment:impl`, `${R}#8:comment:wave`]);
  assert.match(inbox('forge').find(l => l.id.endsWith('comment:1')).reason, /comment on your PR \(merged PR\)/);
  assert.match(inbox('forge').find(l => l.id.endsWith('comment:impl')).reason, /implement/);
  assert.match(inbox('forge').find(l => l.id.endsWith('comment:wave')).title, /mill wave/);
  assert.equal(ids('mill').includes(`${R}#8:comment:wave`), false);
  assert.equal(ids('mill').includes(`${R}#7:comment:impl`), false);
  assert.deepEqual(ids('mill'), [`${R}#5:comment:1`]);
  assert.deepEqual(ids('blinky'), [`${R}#5:comment:1`, `${R}#6:comment:2`, `${R}#7:comment:impl`, `${R}#8:comment:wave`]);
  assert.deepEqual(ids('critic'), []);
  assert.ok(!JSON.stringify(['forge', 'blinky', 'mill'].map(inbox)).includes('SECRET'), 'body copied');
  assert.ok(await until(() => wakes.some(w => w.path === '/mill')), JSON.stringify(wakes) + '\n' + logs);
  assert.deepEqual([...new Set(wakes.map(w => w.path))], ['/mill']);
  assert.equal(wakes.find(w => w.path === '/mill').auth, 'Bearer km');
  assert.match(logs, /wake: skip forge filter/);
  assert.match(logs, /wake: skip blinky filter/);
});

test('#275: WAKE_KEY_<SEAT> works without key_env (key_env still wins); /healthz has wakes + liveness ages, no url or key', async () => {
  const h = await (await fetch(`http://127.0.0.1:${srvPort}/healthz`)).json();
  assert.deepEqual(h.wakes, { forge: 'idle', critic: 'no_key', blinky: 'idle', mill: 'ok' });
  for (const k of ['box_age', 'collector_age', 'card_age']) assert.ok(k in h, k);
  assert.equal(h.box_age, null);   // no box push in this test
  assert.ok(Number.isInteger(h.collector_age) && h.collector_age >= 0);
  const raw = JSON.stringify(h);
  for (const bad of [W, 'kf', 'km', 'kb', 'K_FORGE', 'WAKE_KEY']) assert.ok(!raw.includes(bad), bad);
});

test('same events again, and after a restart: nothing routed twice, no second wake', async () => {
  const before = wakes.length, n = ['forge', 'blinky', 'mill'].map(s => inbox(s).length);
  const passes = count(/route: pass /);
  const prev = await tick();
  writeFeed([...old, ...fresh]);
  assert.ok(await sawNewTick(prev), logs);   // unchanged events refresh the header and do not route
  assert.equal(count(/route: pass /), passes, logs);
  await stop(); start();
  assert.ok(await until(() => srvPort > 0 && /route: pass 0 0/.test(logs)), logs);   // warm start re-reads the feed
  const passes2 = count(/route: pass /);
  const prev2 = await tick();
  writeFeed([...old, ...fresh]);
  assert.ok(await sawNewTick(prev2), logs);
  assert.equal(count(/route: pass /), passes2, logs);
  await sleep(300);
  assert.deepEqual(['forge', 'blinky', 'mill'].map(s => inbox(s).length), n);
  assert.equal(wakes.length, before);
  const next = { id: `${R}#5:comment:3`, t_ct: ct(5), kind: 'pr_comment', repo: R, number: 5, label: 'comment on #5', from: 'blinky', to: 'forge' };
  writeFeed([...old, ...fresh, next]);
  assert.ok(await until(() => /route: pass 1 \d+/.test(logs)), logs);
  assert.ok(inbox('forge').some(l => l.id === next.id) && !inbox('blinky').some(l => l.id === next.id));
  // xray#976: a comment blinky wrote is stored for forge but never wakes it
  await sleep(600);
  assert.equal(wakes.length, before, JSON.stringify(wakes));
  assert.match(logs, /wake: skip forge filter acme\/one#5:comment:3/);
});

test('a stored-but-unmarked line (crash between store and sent) is not stored or woken twice', async () => {
  const st = path.join(DATA, 'route', 'inbox-state.json'); const s = JSON.parse(fs.readFileSync(st, 'utf8'));
  s.sent = []; fs.writeFileSync(st, JSON.stringify(s));
  const before = wakes.length, n = ['forge', 'blinky', 'mill'].map(x => inbox(x).length);
  await stop(); start();
  assert.ok(await until(() => /route: pass 0 0/.test(logs)), logs);
  await sleep(300);
  assert.deepEqual(['forge', 'blinky', 'mill'].map(x => inbox(x).length), n);
  assert.equal(wakes.length, before);
});

