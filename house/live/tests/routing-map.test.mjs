import { listenPort } from './free-port.mjs';
// Routing map: every login resolves against GitHub (mocked), cached and rate-limit safe; an unknown login is refused and
// flagged on the board; GET /routing serves logins + aliases only (no keys, no webhook URLs).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const { routingMap, createLoginResolver, auditLogins } = await import(path.join(APP, 'routes.mjs'));
const res = (status, headers = {}) => ({ status, headers: { get: k => headers[k.toLowerCase()] ?? null } });

test('resolver: ok / missing, cached, no token = unverified', async () => {
  const seen = [];
  const r = createLoginResolver({ token: 't', fetchImpl: async u => { seen.push(u); return res(u.endsWith('/ghost') ? 404 : 200); } });
  assert.equal(await r.resolve('forge0x1[bot]'), 'ok');
  assert.equal(await r.resolve('FORGE0X1[bot]'), 'ok');   // cache is case-insensitive
  assert.equal(await r.resolve('ghost'), 'missing');
  assert.deepEqual(seen.map(u => u.replace('https://api.github.com', '')), ['/users/forge0x1%5Bbot%5D', '/users/ghost']);
  assert.equal(await createLoginResolver({ token: '', fetchImpl: async () => { throw new Error('no call'); } }).resolve('x'), 'unverified');
});

test('resolver: rate limit pauses every lookup until reset and keeps the cache', async () => {
  let t = 1000e3, n = 0;
  const r = createLoginResolver({ token: 't', ttlMs: 10, now: () => t,
    fetchImpl: async () => { n++; return n === 1 ? res(200) : res(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(t / 1000 + 60) }); } });
  assert.equal(await r.resolve('a'), 'ok');
  t += 100;   // cache expired
  assert.equal(await r.resolve('a'), 'ok');          // 403 rate limit: answer from cache
  assert.equal(await r.resolve('b'), 'unverified');  // paused: no call at all
  assert.equal(r.calls, 2);
  t += 61e3;
  await r.resolve('b'); assert.equal(r.calls, 3);    // after reset it asks again
});

test('audit: refused, unverified and no-login seats', async () => {
  const entries = routingMap({ routing: { forge: { login: 'forge0x1[bot]', aliases: ['Forge'] }, arch1: { login: 'arch1', aliases: [] }, mill: { login: null } } });
  const a = await auditLogins(entries, async l => (l === 'arch1' ? 'missing' : 'ok'));
  assert.deepEqual([a.refused, a.no_login], [['arch1'], ['mill']]);
});

// server end to end with a mock GitHub
const gh = http.createServer((q, s) => { const ok = /forge0x1%5Bbot%5D|arch10x/.test(q.url); s.writeHead(ok ? 200 : 404); s.end('{}'); });
await new Promise(r => gh.listen(0, '127.0.0.1', r));
const ROUTE = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-rmap-')), DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-rmap-d-'));
fs.writeFileSync(path.join(ROUTE, 'inbox-roles.json'), JSON.stringify({
  routing: { forge: { login: 'forge0x1[bot]', aliases: ['forge', 'Forge'] }, arch1: { login: 'arch10x', aliases: ['arch1', 'Arch1'] },
    critic: { login: 'nobody-here', aliases: ['critic'] }, mill: { login: null, aliases: ['mill'] } },
  seats: { coord: { seat: 'forge' } }, extra_seats: { forge: { needles: ['@forge'] }, arch1: { needles: ['@arch10x'] }, critic: { needles: ['@critic'] }, mill: { needles: ['@mill'] } } }));
fs.writeFileSync(path.join(ROUTE, 'roster.json'), JSON.stringify({ seats: ['forge', 'arch1', 'critic', 'mill'] }));
let PORT = 0, BASE = '';
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA,
  GITHUB_API_URL: `http://127.0.0.1:${gh.address().port}`, GITHUB_READ_TOKEN: 'read-tok-xyz', BIFROST_ROUTING_DIR: ROUTE,
  BIFROST_ROSTER: path.join(ROUTE, 'roster.json'), SEAT_WEBHOOKS: JSON.stringify({ forge: { url: 'http://127.0.0.1:9/hook-secret' } }) },
  stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
PORT = await listenPort(srv); BASE = `http://127.0.0.1:${PORT}`;   // #304: port 0, read the assigned port
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); gh.close(); fs.rmSync(ROUTE, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const until = async fn => { for (let i = 0; i < 100; i++) { try { const v = await fn(); if (v) return v; } catch {} await new Promise(r => setTimeout(r, 100)); } return null; };

test('GET /routing: logins + aliases + status only; unknown login refused and flagged on the board', async () => {
  const body = await until(async () => { const j = await (await fetch(`${BASE}/routing`)).json(); return j.seats?.some(e => e.status === 'missing') && j; });
  assert.ok(body, logs);
  const by = Object.fromEntries(body.seats.map(e => [e.seat, e]));
  assert.deepEqual(by.forge, { seat: 'forge', login: 'forge0x1[bot]', aliases: ['forge', 'Forge'], status: 'ok' });
  assert.equal(by.arch1.status, 'ok'); assert.equal(by.critic.status, 'missing'); assert.equal(by.mill.status, 'no_login');
  assert.equal(body.ok, false);
  const raw = JSON.stringify(body);
  for (const bad of ['hook-secret', 'read-tok-xyz', 'url', 'key']) assert.ok(!raw.includes(bad), bad);
  const h = await (await fetch(`${BASE}/healthz`)).json();
  assert.equal(h.routing, 'fail');
  assert.match(logs, /ROUTING: FAIL login not on GitHub for critic/);
  assert.equal((await fetch(`${BASE}/routing`, { method: 'POST' })).status, 405);
});
