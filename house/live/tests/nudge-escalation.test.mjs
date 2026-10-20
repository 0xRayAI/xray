import { listenPort } from './free-port.mjs';
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
let PORT = 0, BASE = '';
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA,
  SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${W}/forge` }, critic: { url: `${W}/critic` } }), WAKE_KEY_FORGE: 'k', WAKE_KEY_CRITIC: 'k',
  WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0', LIVE_TURN_OPEN_MIN: '0', NUDGE_LINE_S: '1', BIFROST_TICK_S: '0.2',
  BIFROST_TRIPWIRE_MINUTES: '0.1', BIFROST_ROUTING_DIR: ROUTE, BIFROST_ROSTER: path.join(ROUTE, 'roster.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
PORT = await listenPort(srv); BASE = `http://127.0.0.1:${PORT}`;   // #304: port 0, read the assigned port
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); fs.rmSync(ROUTE, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
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

test('a live packet card and a holding card nudge L1, and a pull request attach closes the holding nudge', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-esc-card-'));
  const forgeKey = 'forge-' + crypto.randomBytes(4).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'on', SERVER_ROUTING: 'off', MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ingest,
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
      SEAT_KEYS: JSON.stringify({ forge: crypto.createHash('sha256').update(forgeKey).digest('hex') }),
      NUDGE_L1_S: '1', BIFROST_TICK_S: '0.2', ARCH1_LAUNCH_ENABLED: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const port = await listenPort(child);
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: 'Bearer ' + forgeKey };
  const line = (id, number) => ({
    id, t_ct: new Date().toISOString(), seat: 'forge', type: 'packet', repo: 'example-org/x', number,
    title: id, url: 'https://github.com/example-org/x/issues/' + number, reason: 'packet',
  });
  try {
    const posted = await fetch(base + '/inbox', {
      method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [line('live-nudge', 15), line('hold-nudge', 0)] }),
    });
    assert.equal(posted.status, 200, await posted.text());
    const openNudge = async (card) => {
      for (let i = 0; i < 40; i++) {
        const body = await (await fetch(base + '/nudges', { headers: auth })).json();
        const hit = (body.nudges || []).find(n => n.card === card && n.level === 1 && !n.closed_at);
        if (hit) return hit;
        await new Promise(r => setTimeout(r, 150));
      }
      return null;
    };
    assert.ok(await openNudge('example-org/x#15'), logs);
    assert.equal((await openNudge('packet:hold-nudge')).seat, 'forge');
    fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
    const t = new Date().toISOString();
    fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
      generated_at: t,
      events: [
        { id: 'push-hold', t_ct: t, kind: 'push', repo: 'example-org/x', branch: 'cursor/hold-nudge', card: 'packet:hold-nudge' },
        { id: 'pr-hold', t_ct: t, kind: 'pr_open', repo: 'example-org/x', number: 88, head: 'cursor/hold-nudge', url: 'https://github.com/example-org/x/pull/88' },
      ],
    }));
    let closed = false;
    for (let i = 0; i < 30; i++) {
      const cards = await (await fetch(base + '/cards?seat=forge', { headers: auth })).json();
      const nudges = await (await fetch(base + '/nudges', { headers: auth })).json();
      const card = (cards.cards || []).find(c => c.key === 'example-org/x#88');
      const nudge = (nudges.nudges || []).find(n => n.card === 'packet:hold-nudge' && n.level === 1);
      if (card && card.alias === 'packet:hold-nudge' && nudge && nudge.closed_at) { closed = true; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    assert.equal(closed, true, logs);
  } finally {
    const done = new Promise(r => child.exitCode != null || child.signalCode ? r() : child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
