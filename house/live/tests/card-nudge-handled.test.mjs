import { listenPort } from './free-port.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
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
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-handled-'));
const route = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-handled-r-'));
const cursors = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-handled-c-'));
const old = Date.now() - 3 * 3600e3;
fs.mkdirSync(path.join(data, 'live'), { recursive: true });
fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
  cards: [
    { key: 'example-org/x#12', repo: 'example-org/x', number: 12, title: 'handled head', owner: 'forge', state: 'live', stage: 'open', sha: 'bbbbbbbb', last_beat_t: old, url: 'https://github.com/example-org/x/pull/12' },
    { key: 'example-org/x#13', repo: 'example-org/x', number: 13, title: 'open head', owner: 'forge', state: 'live', stage: 'open', sha: 'dddddddd', last_beat_t: old, url: 'https://github.com/example-org/x/pull/13' },
  ],
}));
fs.writeFileSync(path.join(cursors, 'forge.txt'), 'example-org/x#12|bbbbbbbb|ready\n');
fs.writeFileSync(path.join(route, 'inbox-roles.json'), JSON.stringify({ seats: { coord: { seat: 'critic' } } }));
fs.writeFileSync(path.join(route, 'roster.json'), JSON.stringify({ seats: ['forge', 'critic'] }));
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, HOME: os.homedir(), COLLECTOR: 'off', LIVE_PUBLIC: '1',
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_DATA_DIR: data, LIVE_CURSORS: cursors,
    SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${hook}/forge` } }),
    WAKE_KEY_FORGE: 'k', WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0',
    NUDGE_L1_S: '1', BIFROST_TICK_S: '0.2', BIFROST_TRIPWIRE_MINUTES: '60',
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
  fs.rmSync(data, { recursive: true, force: true });
  fs.rmSync(route, { recursive: true, force: true });
  fs.rmSync(cursors, { recursive: true, force: true });
});
const until = async fn => {
  for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 100));
  return fn();
};

test('a handled card head gets no ladder and an unhandled head still does', async () => {
  assert.ok(await until(() => got.some(g => g.path === '/forge' && String(g.body.reason || g.body.title || '').includes('open head') || String(g.body.line || '').includes('13') || JSON.stringify(g.body).includes('#13') || JSON.stringify(g.body).includes('open head'))), logs + '\n' + JSON.stringify(got));
  const handled = got.filter(g => JSON.stringify(g.body).includes('handled head') || JSON.stringify(g.body).includes('#12'));
  assert.equal(handled.length, 0, JSON.stringify(handled));
});
