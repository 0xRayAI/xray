import { listenPort } from './free-port.mjs';
// An acked line and a handled cursor key get no L1/L2/L3. A stale unacked line still escalates.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const got = [];
const sink = http.createServer((q, s) => {
  let b = '';
  q.on('data', d => { b += d; });
  q.on('end', () => {
    got.push({ path: q.url, body: JSON.parse(b || '{}') });
    s.writeHead(200);
    s.end('{}');
  });
});
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const hook = `http://127.0.0.1:${sink.address().port}`;
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-handled-'));
const route = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-handled-r-'));
const cursors = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-handled-c-'));
const old = new Date(Date.now() - 3600e3).toISOString();
const line = (id, number, sha, kind) => ({
  id, t_ct: old, seat: 'forge', type: 'pr_comment', repo: 'example-org/x', number,
  sha, kind, title: id, url: 'https://github.com/example-org/x/pull/' + number, reason: 'ask',
});
fs.mkdirSync(path.join(data, 'live', 'inbox'), { recursive: true });
fs.writeFileSync(path.join(data, 'live', 'inbox', 'forge.jsonl'), [
  line('acked-old', 9, 'aaaaaaaa', 'ready'),
  line('handled-old', 10, 'bbbbbbbb', 'ready'),
  line('stale-old', 11, 'cccccccc', 'ready'),
].map(row => JSON.stringify(row)).join('\n') + '\n');
fs.writeFileSync(path.join(data, 'live', 'acks.json'), JSON.stringify({ forge: ['acked-old'] }));
fs.writeFileSync(path.join(cursors, 'forge.txt'), 'example-org/x#10|bbbbbbbb|ready\n');
fs.writeFileSync(path.join(route, 'inbox-roles.json'), JSON.stringify({
  seats: { coord: { seat: 'critic' } }, extra_seats: { forge: { needles: ['@forge'] } },
}));
fs.writeFileSync(path.join(route, 'roster.json'), JSON.stringify({ seats: ['forge', 'critic'] }));
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, HOME: os.homedir(), COLLECTOR: 'off', LIVE_PUBLIC: '1',
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_DATA_DIR: data, LIVE_CURSORS: cursors,
    SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${hook}/forge` }, critic: { url: `${hook}/critic` } }),
    WAKE_KEY_FORGE: 'k', WAKE_KEY_CRITIC: 'k',
    WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0', LIVE_TURN_OPEN_MIN: '0',
    NUDGE_LINE_S: '1', BIFROST_TICK_S: '0.2', BIFROST_TRIPWIRE_MINUTES: '0.1',
    BIFROST_ROUTING_DIR: route, BIFROST_ROSTER: path.join(route, 'roster.json'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
srv.stdout.on('data', d => { logs += d; });
srv.stderr.on('data', d => { logs += d; });
await listenPort(srv);
after(async () => {
  srv.kill();
  await new Promise(r => (srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)));
  sink.close();
  fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  fs.rmSync(route, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  fs.rmSync(cursors, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});
const until = async fn => {
  for (let i = 0; i < 150 && !fn(); i++) await new Promise(r => setTimeout(r, 100));
  return fn();
};
const idsOf = body => (Array.isArray(body.ids) ? body.ids : [body.inbox_id]).filter(Boolean);

test('an acked line and a handled line get no ladder, and a stale unacked line still reaches L3', async () => {
  assert.ok(await until(() => got.some(g => g.path === '/forge' && idsOf(g.body).includes('stale-old') && /^nudge L3/.test(g.body.reason))), logs);
  const forge = got.filter(g => g.path === '/forge');
  const banned = forge.filter(g => idsOf(g.body).some(id => id === 'acked-old' || id === 'handled-old'));
  assert.equal(banned.length, 0, JSON.stringify(banned.map(g => g.body)));
  const levels = forge
    .filter(g => idsOf(g.body).includes('stale-old') && /^nudge L\d/.test(String(g.body.reason || '')))
    .map(g => (/^nudge (L\d)/.exec(g.body.reason) || [])[1]);
  assert.deepEqual(levels.slice(0, 3), ['L1', 'L2', 'L3']);
});
