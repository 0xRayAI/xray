// Server inbox routing: a collector pass routes new events into seat inboxes (inbox_pass.py rules), fires the seat
// wake, and never routes the same event twice, including across a restart (state on the volume).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
const APP = process.env.MESH_APP_DIR;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-route-'));
const wakes = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { wakes.push({ path: q.url, auth: q.headers.authorization, body: JSON.parse(b) }); s.writeHead(200); s.end('{}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const hooks = Object.fromEntries(['forge', 'critic', 'mill', 'blinky'].map(s => [s, { url: `${W}/${s}`, key_env: `K_${s.toUpperCase()}` }]));
let srv = null, logs = '';
function start() {
  const PORT = 24000 + Math.floor(Math.random() * 1000);
  logs = '';
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: String(PORT), PATH: process.env.PATH,
    MESH_PASSWORD: 'x' + crypto.randomBytes(4).toString('hex'), SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA, SEAT_WEBHOOKS: JSON.stringify(hooks),
    K_FORGE: 'kf', K_CRITIC: 'kc', K_MILL: 'km', K_BLINKY: 'kb', WAKE_DEBOUNCE_S: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
}
async function stop() { if (!srv) return; const p = new Promise(r => srv.once('exit', r)); srv.kill(); await p; srv = null; }
after(async () => { await stop(); sink.close(); fs.rmSync(DATA, { recursive: true, force: true }); });
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
