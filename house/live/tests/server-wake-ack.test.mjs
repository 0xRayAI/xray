// Hotfix: the server records a delivered wake as turn start and an inbox ack as turn end for that seat. (CI re-run after merge.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listenPort } from './free-port.mjs';

const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
const APP = fileURLToPath(new URL('../app/server.mjs', import.meta.url));
test('wake opens and ack closes the seat turn server-side', () => {
  assert.match(src, /noteSent\(wakeState, seat, batch, Date\.now\(\)\)/);
  assert.match(src, /persistWakeOk\(\);\n\s*serverActivity\(seat, 'turn', 'start', 'wake', \{ moves: false \}\)/);
  assert.match(src, /ackLines\(who, what, review\); touchSeat\(who\);\n\s*if \(n === -2\) return json\(req, res, 400, \{ error: 'merge handoff requires a review link' \}\);\n\s*if \(n < 0\) return json\(req, res, 404, \{ error: 'no such line' \}\);\n\s*if \(n\) serverActivity\(who, 'turn', 'end', 'ack'\)/);
  assert.match(src, /function serverActivity\(seat, kind, action, tag, opts\)/);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

function wakeLine(seat, id) {
  return {
    id, t_ct: new Date().toISOString(), seat, type: 'nudge',
    repo: 'example/repo', number: 7, title: 't', url: 'https://github.com/example/repo/issues/7', reason: 'wake',
  };
}

function wakeRows(data, seat) {
  const file = path.join(data, 'live', 'wakes.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(row => !seat || row.seat === seat);
}

function wakeOk(data) {
  const file = path.join(data, 'live', 'wake-ok.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function openMock(onHit) {
  const hits = [];
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    const seat = String(req.url || '').split('?')[0].replace(/^\//, '');
    hits.push({ seat });
    req.on('data', () => {});
    req.on('error', () => {});
    req.on('end', () => onHit(req, res, seat));
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        hits,
        port: server.address().port,
        close() {
          for (const socket of sockets) socket.destroy();
          return new Promise(r => server.close(() => r()));
        },
      });
    });
  });
}

function hooksFor(port, seats) {
  const hooks = {};
  for (const seat of seats) hooks[seat] = { url: `http://127.0.0.1:${port}/${seat}`, key_env: 'WAKE_KEY_' + seat.toUpperCase().replace(/-/g, '_') };
  return hooks;
}

async function stopChild(child) {
  if (!child || child.exitCode != null || child.signalCode) return;
  const done = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
  await done;
  clearTimeout(timer);
}

async function startServer(data, hooks) {
  const secret = crypto.randomBytes(32).toString('hex');
  const password = 'pw-' + crypto.randomBytes(8).toString('hex');
  const env = {
    PORT: '0',
    PATH: process.env.PATH,
    MESH_DATA_DIR: data,
    INGEST_SECRET: secret,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_PASSWORD: password,
    COLLECTOR: 'off',
    GITHUB_API_URL: 'http://127.0.0.1:1',
    SEAT_WEBHOOKS: JSON.stringify(hooks),
    WAKE_DEBOUNCE_S: '0',
    WAKE_STAGGER_MS: '0',
    WAKE_COALESCE_MS: '20',
    WAKE_RETRY_MS: '20',
    // Main's wake gate (absent at pin 9ead691) would hold a second line for 900s. Zero it so the later outcome is the one under test.
    WAKE_KIND_COOLDOWN_S: '0',
    WAKE_MAX_PER_HOUR: '100',
    LIVE_TURN_OPEN_MIN: '0',
  };
  for (const cfg of Object.values(hooks)) env[cfg.key_env] = 'k-' + cfg.key_env;
  let logs = '';
  const child = spawn(process.execPath, [APP], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const portPromise = listenPort(child);
  try {
    const port = await portPromise;
    const base = `http://127.0.0.1:${port}`;
    await ready(base);
    return { child, base, secret, password, logs: () => logs };
  } catch (err) {
    await stopChild(child);
    throw new Error(String(err && err.message || err) + '\n' + logs.slice(-800));
  }
}

async function ready(base) {
  const deadline = Date.now() + 8000;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(base + '/healthz');
      const text = await res.text();
      const body = JSON.parse(text);
      if (body && body.wakes && typeof body.wakes === 'object' && !Array.isArray(body.wakes)) return body;
      last = text.slice(0, 240);
    } catch (err) { last = err.message; }
    await sleep(40);
  }
  throw new Error('healthz wakes never became an object: ' + last);
}

async function healthWakes(base) {
  const res = await fetch(base + '/healthz');
  return (await res.json()).wakes;
}

async function postLines(base, secret, lines) {
  const res = await fetch(base + '/inbox', {
    method: 'POST',
    headers: { 'X-Live-Ingest': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  const text = await res.text();
  assert.equal(res.status, 200, text);
}

async function until(fn, ms, why) {
  const deadline = Date.now() + ms;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) { last = err.message; }
    await sleep(40);
  }
  throw new Error(why + (last ? ' ' + last : ''));
}

function reply(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

test('seat 409 fails', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-409-'));
  const mock = await openMock((req, res) => reply(res, 409, { 'content-type': 'application/json' }, '{"ok":false}'));
  const srv = await startServer(data, hooksFor(mock.port, ['forge']));
  try {
    await postLines(srv.base, srv.secret, [wakeLine('forge', 'seat-409')]);
    const row = await until(() => {
      const list = wakeRows(data, 'forge');
      return list.length && list.at(-1).attempts === 3 ? list.at(-1) : null;
    }, 8000, 'seat 409 row ' + srv.logs().slice(-500));
    assert.equal(mock.hits.filter(hit => hit.seat === 'forge').length, 3);
    assert.equal(row.outcome, 'failed');
    assert.equal(row.ok, false);
    assert.equal(row.error, 'http_409');
    assert.equal(row.http, undefined);
    assert.equal((await healthWakes(srv.base)).forge, 'fail');
  } finally {
    await stopChild(srv.child);
    await mock.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('401/404/timeout fail', { timeout: 45000 }, async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-fail-'));
  const code = { forge: 401, critic: 404 };
  const mock = await openMock((req, res, seat) => {
    if (!code[seat]) return;
    reply(res, code[seat], { 'content-type': 'application/json' }, '{}');
  });
  const srv = await startServer(data, hooksFor(mock.port, ['forge', 'critic', 'blinky']));
  try {
    await postLines(srv.base, srv.secret, [wakeLine('forge', 'e401'), wakeLine('critic', 'e404'), wakeLine('blinky', 'etime')]);
    await until(() => {
      const forge = wakeRows(data, 'forge').at(-1);
      const critic = wakeRows(data, 'critic').at(-1);
      const blinky = wakeRows(data, 'blinky').at(-1);
      return forge && critic && blinky && forge.attempts === 3 && critic.attempts === 3 && blinky.attempts === 3 ? true : null;
    }, 40000, 'failure rows ' + srv.logs().slice(-600));
    const wakes = await healthWakes(srv.base);
    assert.equal(wakes.forge, 'fail');
    assert.equal(wakes.critic, 'fail');
    assert.equal(wakes.blinky, 'fail');
    assert.equal(wakeRows(data, 'forge').at(-1).error, 'http_401');
    assert.equal(wakeRows(data, 'critic').at(-1).error, 'http_404');
    assert.equal(wakeRows(data, 'blinky').at(-1).error, 'timeout');
    assert.equal(wakeRows(data, 'blinky').at(-1).outcome, 'failed');
    assert.equal(mock.hits.filter(hit => hit.seat === 'blinky').length, 3);
  } finally {
    await stopChild(srv.child);
    await mock.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('skip no-retry', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-skip-'));
  const mock = await openMock((req, res) => {
    reply(res, 409, { 'x-bifrost-wake': 'noop', 'content-type': 'application/json' }, '{"ok":true,"woken":false,"dropped":1,"reason":"already_done"}');
  });
  const srv = await startServer(data, hooksFor(mock.port, ['forge']));
  try {
    await postLines(srv.base, srv.secret, [wakeLine('forge', 'noop-1')]);
    const row = await until(() => wakeRows(data, 'forge').find(item => item.outcome === 'skipped') || null, 8000, 'skipped row ' + srv.logs().slice(-500));
    await sleep(400);
    assert.equal(mock.hits.filter(hit => hit.seat === 'forge').length, 1);
    assert.equal(row.ok, true);
    assert.equal(row.attempts, 1);
    assert.equal(row.http, 409);
    assert.equal(row.error, undefined);
    assert.equal(wakeOk(data), null);
    assert.equal((await healthWakes(srv.base)).forge, 'idle');
    assert.equal(srv.logs().split('\n').filter(line => line.includes('wake: forge skipped (noop)')).length, 1);
    assert.equal(srv.logs().includes('wake: forge fail'), false);
  } finally {
    await stopChild(srv.child);
    await mock.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test("later skip doesn't replace", async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-later-'));
  const phase = { forge: 200, critic: 500, blinky: 500 };
  const mock = await openMock((req, res, seat) => {
    if (phase[seat] === 'noop') {
      reply(res, 409, { 'x-bifrost-wake': 'noop', 'content-type': 'application/json' }, '{"ok":true,"woken":false,"dropped":1,"reason":"already_done"}');
      return;
    }
    reply(res, phase[seat], { 'content-type': 'application/json' }, '{}');
  });
  const srv = await startServer(data, hooksFor(mock.port, ['forge', 'critic', 'blinky']));
  try {
    await postLines(srv.base, srv.secret, [wakeLine('forge', 'keep-ok'), wakeLine('critic', 'keep-fail'), wakeLine('blinky', 'clear-fail')]);
    await until(() => {
      const forge = wakeRows(data, 'forge').at(-1);
      const critic = wakeRows(data, 'critic').at(-1);
      const blinky = wakeRows(data, 'blinky').at(-1);
      return forge && critic && blinky && forge.outcome === 'delivered' && critic.attempts === 3 && blinky.attempts === 3 ? true : null;
    }, 8000, 'first outcomes ' + srv.logs().slice(-600));
    const firstOk = wakeOk(data);
    const deliveredAt = wakeRows(data, 'forge').find(row => row.outcome === 'delivered').t_ct;
    assert.equal(firstOk.forge, deliveredAt);
    assert.equal(Object.hasOwn(firstOk, 'critic'), false);
    assert.equal(Object.hasOwn(firstOk, 'blinky'), false);
    phase.forge = 'noop';
    phase.critic = 'noop';
    phase.blinky = 200;
    await postLines(srv.base, srv.secret, [wakeLine('forge', 'keep-skip'), wakeLine('critic', 'fail-skip'), wakeLine('blinky', 'clear-ok')]);
    await until(() => {
      const forge = wakeRows(data, 'forge').at(-1);
      const critic = wakeRows(data, 'critic').at(-1);
      const blinky = wakeRows(data, 'blinky').find(row => row.outcome === 'delivered');
      return forge && critic && blinky && forge.outcome === 'skipped' && critic.outcome === 'skipped' ? blinky : null;
    }, 8000, 'second outcomes ' + srv.logs().slice(-600));
    const wakes = await healthWakes(srv.base);
    assert.equal(wakes.forge, 'ok');
    assert.equal(wakes.critic, 'fail');
    assert.equal(wakes.blinky, 'ok');
    const saved = wakeOk(data);
    assert.equal(saved.forge, deliveredAt);
    const cleared = wakeRows(data, 'blinky').find(row => row.outcome === 'delivered');
    const failed = wakeRows(data, 'blinky').find(row => row.error === 'http_500');
    assert.equal(failed.outcome, 'failed');
    assert.notEqual(cleared.t_ct, failed.t_ct);
    assert.equal(saved.blinky, cleared.t_ct);
    assert.equal(Object.hasOwn(saved, 'critic'), false);
    assert.equal(wakeRows(data, 'critic').at(-1).attempts, 1);
    assert.equal(mock.hits.filter(hit => hit.seat === 'forge').length, 2);
  } finally {
    await stopChild(srv.child);
    await mock.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('restart last non-noop', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wake-boot-'));
  const live = path.join(data, 'live');
  fs.mkdirSync(live, { recursive: true });
  const deliveredAt = '2026-10-26T15:00:00.000Z';
  const legacyOk = '2026-10-26T14:00:00.000Z';
  const text = [
    JSON.stringify({ seat: 'forge', ok: true, outcome: 'delivered', attempts: 1, t_ct: deliveredAt, id: 'd1' }),
    JSON.stringify({ seat: 'forge', ok: true, outcome: 'skipped', http: 409, attempts: 1, t_ct: '2026-10-26T15:05:00.000Z', id: 's1' }),
    JSON.stringify({ seat: 'critic', ok: true, attempts: 1, t_ct: legacyOk, id: 'c1' }),
    JSON.stringify({ seat: 'critic', ok: false, error: 'http_409', attempts: 3, t_ct: '2026-10-26T14:05:00.000Z', id: 'c2' }),
    JSON.stringify({ seat: 'blinky', ok: false, error: 'http_409', attempts: 3, t_ct: '2026-10-26T13:00:00.000Z', id: 'b1' }),
    JSON.stringify({ seat: 'herald', ok: true, outcome: 'skipped', http: 409, attempts: 1, t_ct: '2026-10-26T12:00:00.000Z', id: 'h1' }),
    JSON.stringify({ seat: 'herald', ok: true, outcome: 'skipped', http: 409, attempts: 1, t_ct: '2026-10-26T12:05:00.000Z', id: 'h2' }),
  ].join('\n') + '\n';
  const file = path.join(live, 'wakes.jsonl');
  fs.writeFileSync(file, text);
  const before = fs.readFileSync(file);
  const mock = await openMock(() => {});
  const srv = await startServer(data, hooksFor(mock.port, ['forge', 'critic', 'blinky', 'herald']));
  try {
    const wakes = await healthWakes(srv.base);
    assert.equal(wakes.forge, 'ok');
    assert.equal(wakes.critic, 'ok');
    assert.equal(wakes.blinky, 'fail');
    assert.equal(wakes.herald, 'idle');
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(fs.existsSync(path.join(live, 'wake-ok.json')), false);
    const login = await fetch(srv.base + '/login', {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=' + encodeURIComponent(srv.password),
    });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const board = (await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json()).wakes;
    assert.equal(board.forge.last_ok, deliveredAt);
    assert.equal(board.critic.last_ok, legacyOk);
    assert.equal(board.blinky.last_ok, null);
    assert.equal(board.herald.last_ok, null);
  } finally {
    await stopChild(srv.child);
    await mock.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});
