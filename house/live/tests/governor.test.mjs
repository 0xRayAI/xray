import { listenPort } from './free-port.mjs';
// Governor: nudges (evalNudges, the one nudge path: unacked line L1-L3 with one re-wake per window, ack closes; unrouted
// and quiet seats) and the tripwire clock.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkRoutes } from '../app/routes.mjs';
import { fingerprint, tripwire, realEvents, createClock, mutedSeats } from '../app/governor.mjs';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const got = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { got.push({ path: q.url, body: b, at: Date.now() }); s.writeHead(200); s.end('{}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-gov-'));
const old = new Date(Date.now() - 3600e3).toISOString();
fs.mkdirSync(path.join(DATA, 'live', 'inbox'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'live', 'inbox', 'forge.jsonl'),
  JSON.stringify({ id: 'stale-1', t_ct: old, seat: 'forge', type: 'pr_comment', repo: 'example-org/x', number: 7, title: 't', url: 'https://github.com/example-org/x/pull/7', reason: 'merge ask' }) + '\n');
const ROUTE = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-gov-route-'));
fs.writeFileSync(path.join(ROUTE, 'inbox-roles.json'), JSON.stringify({ extra_seats: { forge: { needles: ['@forge'] } } }));
fs.writeFileSync(path.join(ROUTE, 'roster.json'), JSON.stringify({ seats: ['forge', 'mill'] }));
const FKEY = 'fk-' + crypto.randomBytes(8).toString('hex');
let PORT = 0, BASE = '';
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA,
  SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${W}/forge` }, critic: { url: `${W}/critic` } }), WAKE_KEY_FORGE: 'wk', WAKE_KEY_CRITIC: 'wk',
  SEAT_KEYS: JSON.stringify({ forge: crypto.createHash('sha256').update(FKEY).digest('hex') }),
  WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0',
  NUDGE_LINE_S: '8',   // wide window: a loaded box (#304 parallel runs) delays wakes by seconds
  BIFROST_TICK_S: '0.2', BIFROST_WAKE_QUIET_MINUTES: '0.001',
  BIFROST_ROUTING_DIR: ROUTE, BIFROST_CLOCK_SEATS: 'forge', BIFROST_ROSTER: path.join(ROUTE, 'roster.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
PORT = await listenPort(srv); BASE = `http://127.0.0.1:${PORT}`;   // #304: port 0, read the assigned port
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); fs.rmSync(ROUTE, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const until = async fn => { for (let i = 0; i < 80 && !(await fn()); i++) await new Promise(r => setTimeout(r, 100)); return fn(); };
const header = async () => { const j = await (await fetch(BASE + '/live-events.json')).json(); return j; };
const openNudges = async kind => (await (await fetch(BASE + '/nudges', { headers: { Authorization: 'Bearer ' + FKEY } })).json()).nudges.filter(n => n.kind === kind && !n.closed_at);
const forgeWakes = () => got.filter(g => g.path === '/forge');

test('an unacked line past its window gets nudge L1 on the board and one re-wake per window', async () => {
  assert.ok(await until(() => forgeWakes().length >= 1), logs);
  assert.deepEqual((await openNudges('line')).map(n => [n.seat, n.line, n.number, n.level]), [['forge', 'stale-1', 7, 1]]);
  assert.match(JSON.parse(forgeWakes()[0].body).reason, /^nudge L1: merge ask/);
  await new Promise(r => setTimeout(r, 1500));
  // judged by arrival times of the line-nudge wakes only (a loaded box can see the first wake late, and the tripwire may wake too)
  const w = forgeWakes().filter(g => /^nudge L/.test(JSON.parse(g.body).reason));
  assert.ok(w.length === 1 || w[1].at - w[0].at >= 6000, 'one re-wake per window, no loop: ' + forgeWakes().map(g => (g.at - w[0].at) + ' ' + JSON.parse(g.body).reason));
  assert.equal(JSON.parse(await (await fetch(BASE + '/healthz')).text()).nudged_lines, 1);
});

test('the CoS path starts the same timed run by hand: wake with a deadline, countdown on the board', async () => {
  const r = await fetch(BASE + '/clock', { method: 'POST', headers: { Authorization: 'Bearer ' + FKEY } });
  const j = await r.json();
  assert.deepEqual([r.status, j.started, Object.keys(j.clock.deadlines)], [200, true, ['forge']]);
  assert.ok(await until(() => forgeWakes().some(g => /timed run \(cos\).*blocker in one line by/.test(JSON.parse(g.body).reason))));
  await new Promise(r => setTimeout(r, 400));
  const clock = (await header()).clock;
  assert.equal(clock && clock.reason, 'cos');
});

test('ack closes the line nudge', async () => {
  const r = await fetch(BASE + '/inbox/forge/ack', { method: 'POST', headers: { Authorization: 'Bearer ' + FKEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'stale-1' }) });
  assert.equal(r.status, 200);
  assert.ok(await until(async () => (await openNudges('line')).length === 0));
  assert.ok(await until(async () => (await header()).clock === null), 'a seat move (ack) clears the clock');
  const n = forgeWakes().length;
  await new Promise(r => setTimeout(r, 8500));   // past the window: an acked line never re-wakes
  assert.equal(forgeWakes().length, n);
});

test('startup route check flags the unrouted seat loudly without crashing', async () => {
  assert.match(logs, /ROUTING: FAIL.*no route for mill/);
  const h = await header();
  assert.deepEqual([h.routing.ok, h.routing.unrouted], [false, ['mill']]);
  assert.equal(JSON.parse(await (await fetch(BASE + '/healthz')).text()).routing, 'fail');
  assert.ok(await until(async () => (await openNudges('unrouted')).some(n => n.about === 'mill')), 'unrouted seat is a nudge on the board');
});

test('board shows each seat\'s last good wake; a quiet seat gets a nudge', async () => {
  const w = (await header()).wakes;
  assert.ok(w.forge.last_ok && !Number.isNaN(Date.parse(w.forge.last_ok)));
  assert.deepEqual([w.critic.last_ok, w.critic.quiet], [null, true]);   // never woke within the window, no open line needed
  assert.ok(await until(async () => (await openNudges('quiet')).some(n => n.about === 'critic')), 'quiet seat is a nudge on the board');
});

test('checkRoutes: our rules (same as bifrost-init) on a clean config', () => {
  assert.deepEqual(checkRoutes({ extra_seats: { a: { needles: ['@a'] } }, fallback: { seat: 'b' } }, ['a', 'b']), { ok: true, unrouted: [], unknown: [] });
  assert.deepEqual(checkRoutes({ seats: { builder: { seat: 'ghost' } }, extra_seats: { a: { needles: ['@a'] } } }, ['a']).unknown, ['ghost']);
});

test('tripwire: fires only on a real change; feed_push and generated_at never trip it', () => {
  const a = [{ id: 'e1', kind: 'pr_open', t_ct: 't1' }];
  const t = tripwire();
  assert.equal(t(fingerprint(a)), true);
  assert.equal(t(fingerprint(a)), false);
  assert.equal(t(fingerprint([...a, { id: 'p1', kind: 'feed_push', t_ct: 't2' }])), false, 'own feed_push: no self-loop');
  assert.equal(t(fingerprint(a.map(e => ({ ...e, generated_at: 'later' })))), false);
  assert.equal(t(fingerprint(a, { nudges: ['nudge:line:forge:x:L1'] })), true, 'nudge state is part of the fingerprint');
  assert.equal(t(fingerprint([...a, { id: 'e2', kind: 'merged', t_ct: 't3' }], { nudges: ['nudge:line:forge:x:L1'] })), true);
  assert.equal(realEvents([{ kind: 'feed_push' }, { kind: 'merged' }]).length, 1);
});

test('server governor tick republishes only on change (governor_changes stays put when idle)', async () => {
  const h1 = JSON.parse(await (await fetch(BASE + '/healthz')).text()).governor_changes;
  assert.ok(h1 >= 1);
  await new Promise(r => setTimeout(r, 1200));   // six idle ticks
  assert.equal(JSON.parse(await (await fetch(BASE + '/healthz')).text()).governor_changes, h1);
});

test('clock: a frozen board with open cards trips, wakes seats with open work with deadlines, a move clears it, no re-trip until it stalls again', () => {
  const W = 60000, c = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const board = { openCards: 2, openSeats: ['forge', 'mill'], coord: 'blinky' };
  assert.equal(c.observe('a', 0, board), null);
  assert.equal(c.observe('a', W - 1, board), null);
  assert.equal(c.observe('a', W, board), 'stall');
  assert.deepEqual(c.run.deadlines, { forge: new Date(W + 120000).toISOString(), mill: new Date(W + 240000).toISOString() });
  assert.equal(c.observe('a', W + 1000, board), null, 'once per window, not every tick');
  assert.equal(c.observe('b', W + 2000, board), 'cleared');
  assert.equal(c.run, null);
  assert.equal(c.observe('b', W + 3000, board), null, 'no re-trip right after a move');
  assert.equal(c.observe('b', 2 * W + 2000, board), 'stall', 're-arms after the board stalls again');
});

test('clock: a card waiting on start_after does not pull an empty board', () => {
  const W = 60000, c = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const waiting = { openCards: 0, openSeats: [], coord: 'cos-seat', scheduled: 1 };
  c.observe('x', 0, waiting);
  assert.equal(c.observe('x', W, waiting), null);
  assert.equal(c.run, null);
});

test('clock: parked or dark seats are not woken, and they do not fall back to coord', () => {
  const roster = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed', 'fleet-roster.json'), 'utf8'));
  const muted = mutedSeats(roster);
  assert.equal(muted.has('herald') && muted.has('sound'), true);
  assert.equal(muted.has('forge'), false);
  const dark = mutedSeats({ parked: ['herald'], dark: ['sound'] });
  assert.equal(dark.has('sound') && dark.has('herald'), true);
  const W = 60000;
  const parkedOnly = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const held = { openCards: 2, openSeats: [], heldSeats: ['herald', 'sound'], coord: 'blinky' };
  parkedOnly.observe('a', 0, held);
  assert.equal(parkedOnly.observe('a', W, held), null);
  assert.equal(parkedOnly.run, null);
  const mixed = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const board = { openCards: 2, openSeats: ['forge'], heldSeats: ['sound'], coord: 'blinky' };
  mixed.observe('b', 0, board);
  assert.equal(mixed.observe('b', W, board), 'stall');
  assert.deepEqual(Object.keys(mixed.run.deadlines), ['forge']);
  const open = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const noneHeld = { openCards: 1, openSeats: [], coord: 'blinky' };
  open.observe('c', 0, noneHeld);
  assert.equal(open.observe('c', W, noneHeld), 'stall');
  assert.deepEqual(Object.keys(open.run.deadlines), ['blinky']);
});

test('clock: an empty board wakes the coord (CoS) role once per window; re-arms after the window passes', () => {
  const W = 60000, c = createClock({ tripMs: W, perSeatMs: 120000, now: 0 });
  const empty = { openCards: 0, openSeats: [], coord: 'cos-seat' };
  c.observe('x', 0, empty);
  assert.equal(c.observe('x', W, empty), 'empty');
  assert.deepEqual([c.run.reason, Object.keys(c.run.deadlines)], ['empty', ['cos-seat']]);
  for (let t = W + 1; t < 2 * W; t += 5000) assert.equal(c.observe('x', t, empty), null);
  assert.equal(c.observe('x', 2 * W, empty), 'empty', 'a full window later it may fire once more');
  assert.equal(c.observe('x', 2 * W + 1, { ...empty, coord: null }), null);
  const none = createClock({ tripMs: W, perSeatMs: 1, now: 0 }); none.observe('y', 0, {});
  assert.equal(none.observe('y', W, { openCards: 0, coord: null }), null, 'no CoS role: nothing to wake');
});
