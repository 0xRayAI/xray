import { listenPort } from './free-port.mjs';
// Wake POST shape is pinned to what #273 (8f5143a7) sent and Cursor accepted; a non-2xx body is logged (key + url redacted);
// seats due together are staggered (WAKE_STAGGER_MS) instead of firing at once.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const KEY = 'crsr_' + 'a'.repeat(64), AUTO = 'automation-0123456789';
const got = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  got.push({ path: q.url, method: q.method, headers: q.headers, raw: b, at: Date.now() });
  if (q.url.includes('/critic')) { s.writeHead(400); return s.end(`{"error":"bad thing for ${KEY} at ${AUTO}"}`); }
  s.writeHead(200); s.end('{"success":true}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-wake-'));
let PORT = 0, BASE = '', ING = crypto.randomBytes(32).toString('hex');
const hooks = { forge: { url: `${W}/forge/${AUTO}`, key_env: 'FORGE_WAKE_KEY' }, critic: { url: `${W}/critic/${AUTO}`, key_env: 'CRITIC_WAKE_KEY' } };
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off',
  MESH_PASSWORD: 'x1', SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ING, MESH_DATA_DIR: DATA,
  SEAT_WEBHOOKS: JSON.stringify(hooks), FORGE_WAKE_KEY: KEY, CRITIC_WAKE_KEY: KEY, WAKE_KEY_FORGE: 'not-this-one',
  WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '2000', WAKE_BATCH_S: '0', WAKE_KIND_COOLDOWN_S: '0', LIVE_TURN_OPEN_MIN: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
PORT = await listenPort(srv); BASE = `http://127.0.0.1:${PORT}`;   // #304: port 0, read the assigned port
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/healthz')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const until = async fn => { for (let i = 0; i < 160 && !fn(); i++) await new Promise(r => setTimeout(r, 100)); return fn(); };

test('wake request shape = #273: one target, POST, Bearer key_env key, json headers, exact body keys and order', async () => {
  const t = new Date().toISOString();
  const lines = [{ id: 'w1:forge', t_ct: t, seat: 'forge', type: 'ci_fail', repo: 'example-org/x', number: 5, title: 'merge ask', url: 'https://github.com/example-org/x/pull/5', reason: 'ci red' }];
  assert.equal((await fetch(BASE + '/inbox', { method: 'POST', body: JSON.stringify({ lines }), headers: { 'X-Live-Ingest': ING, 'Content-Type': 'application/json' } })).status, 200);
  assert.ok(await until(() => got.some(g => g.path.startsWith('/forge'))), logs);
  assert.equal(got.some(g => g.path.startsWith('/critic')), false);
  const f = got.find(g => g.path.startsWith('/forge'));
  assert.equal(f.method, 'POST');
  assert.equal(f.headers.authorization, 'Bearer ' + KEY);   // key_env wins over WAKE_KEY_<SEAT>
  assert.equal(f.headers['content-type'], 'application/json');
  assert.equal(f.headers['user-agent'], 'bifrost-live');
  assert.equal(f.raw, JSON.stringify({ seat: 'forge', inbox_id: 'w1:forge', ids: ['w1:forge'], type: 'ci_fail', repo: 'example-org/x', number: 5,
    title: 'merge ask', url: 'https://github.com/example-org/x/pull/5', reason: 'ci red',
    lines: [{ id: 'w1:forge', type: 'ci_fail', repo: 'example-org/x', number: 5, title: 'merge ask', url: 'https://github.com/example-org/x/pull/5', reason: 'ci red' }] }));
});

test('two real targets are staggered, not fired together', async () => {
  const t = new Date().toISOString();
  const lines = [
    { id: 'w2:critic', t_ct: t, seat: 'critic', type: 'pr_commit', repo: 'example-org/x', number: 8, sha: 'abc123', title: 'new head', url: 'https://github.com/example-org/x/pull/8', reason: 'new head' },
    { id: 'w2:forge', t_ct: t, seat: 'forge', type: 'deploy_fail', repo: 'example-org/x', number: 8, title: 'deploy red', url: 'https://github.com/example-org/x/pull/8', reason: 'deploy failed' },
  ];
  assert.equal((await fetch(BASE + '/inbox', { method: 'POST', body: JSON.stringify({ lines }), headers: { 'X-Live-Ingest': ING, 'Content-Type': 'application/json' } })).status, 200);
  assert.ok(await until(() => got.some(g => g.raw && g.raw.includes('w2:forge')) && got.some(g => g.path.startsWith('/critic')) && /wake: critic fail/.test(logs)), logs);
  const f = got.find(g => g.path.startsWith('/forge') && g.raw.includes('w2:forge'));
  const c = got.find(g => g.path.startsWith('/critic'));
  assert.ok(f && c);
  assert.ok(Math.abs(c.at - f.at) >= 1000, `${c.at - f.at}ms ${logs}`);
});

test('a non-2xx wake logs the response body, with the key and the automation id redacted', () => {
  assert.match(logs, /wake: critic fail attempts=3 http_400 body=.*bad thing for \[redacted\] at \[redacted\]/);
  assert.ok(!logs.includes(KEY) && !logs.includes(AUTO), logs);
});
