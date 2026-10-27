// A collector pass rewrites github-events.json even when no event changed. The server must publish the new
// header (generated_at, board clock) without walking those events again, and still ingest a real new event.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-reread-'));
const FEED = path.join(DATA, 'feed', 'github-events.json');
const WORKER = new URL('../app/feed-read-worker.mjs', import.meta.url);
const ev = { id: 'acme/one#1:open', t_ct: '2026-10-24T12:00:00Z', kind: 'pr_open', repo: 'acme/one', number: 1 };

function writeFeed(generatedAt, events) {
  fs.mkdirSync(path.dirname(FEED), { recursive: true });
  const tmp = FEED + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ generated_at: generatedAt, notes: [generatedAt], events }));
  fs.renameSync(tmp, FEED);
}
function readWorker(prevHash) {
  return new Promise((resolve, reject) => {
    const w = new Worker(WORKER, { workerData: { file: FEED, prevHash } });
    w.once('message', (msg) => { w.terminate(); resolve(msg); });
    w.once('error', reject);
  });
}

test('same events are a header update; a new event is not', async () => {
  writeFeed('2026-10-24T12:00:00+00:00', [ev]);
  const first = await readWorker('');
  assert.equal(first.ok, true);
  assert.equal(first.same, false);
  assert.equal(first.feed.events.length, 1);
  writeFeed('2026-10-24T12:01:00+00:00', [ev]);
  const again = await readWorker(first.eventHash);
  assert.equal(again.same, true);
  assert.equal(again.header.generated_at, '2026-10-24T12:01:00+00:00');
  assert.equal(again.feed, undefined);
  writeFeed('2026-10-24T12:02:00+00:00', [{ ...ev, id: 'acme/one#2:open' }]);
  const changed = await readWorker(again.eventHash);
  assert.equal(changed.same, false);
  assert.equal(changed.feed.events[0].id, 'acme/one#2:open');
});

const pw = 'x' + crypto.randomBytes(4).toString('hex');
let srv = null, srvPort = 0;
function start() {
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, MESH_PASSWORD: pw, SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA, SERVER_ROUTING: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => { const m = /listening on :(\d+)/.exec(String(d)); if (m) srvPort = Number(m[1]); });
  srv.stderr.on('data', () => {});
}
async function stop() {
  if (!srv) return;
  const p = new Promise(r => srv.once('exit', r));
  srv.kill();
  await p;
  srv = null;
}
after(async () => { await stop(); fs.rmSync(DATA, { recursive: true, force: true }); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

test('the live feed takes a new generated_at when the events stay, and a new event when they do not', async () => {
  writeFeed('2026-10-24T12:00:00+00:00', [ev]);
  start();
  for (let i = 0; i < 50 && !srvPort; i++) await sleep(50);
  assert.ok(srvPort);
  const login = await fetch(`http://127.0.0.1:${srvPort}/login`, {
    method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'password=' + encodeURIComponent(pw),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const feed = async () => (await fetch(`http://127.0.0.1:${srvPort}/live-events.json`, { headers: { Cookie: cookie } })).json();
  let body = null;
  for (let i = 0; i < 40; i++) {
    body = await feed();
    if (body.generated_at === '2026-10-24T12:00:00+00:00') break;
    await sleep(100);
  }
  assert.equal(body.generated_at, '2026-10-24T12:00:00+00:00');
  assert.ok(body.events.some(e => e.id === ev.id));
  writeFeed('2026-10-24T12:01:00+00:00', [ev]);
  const t0 = Date.now();
  const health = await fetch(`http://127.0.0.1:${srvPort}/healthz`);
  assert.equal(health.status, 200);
  assert.ok(Date.now() - t0 < 2000);
  for (let i = 0; i < 80; i++) {
    body = await feed();
    if (body.generated_at === '2026-10-24T12:01:00+00:00') break;
    await sleep(100);
  }
  assert.equal(body.generated_at, '2026-10-24T12:01:00+00:00');
  assert.deepEqual(body.events.map(e => e.id), [ev.id]);
  fs.writeFileSync(FEED.replace(/\.json$/, '.beat.json'), JSON.stringify({ generated_at: '2026-10-24T12:01:30+00:00', notes: ['beat'] }));
  for (let i = 0; i < 80; i++) {
    body = await feed();
    if (body.generated_at === '2026-10-24T12:01:30+00:00') break;
    await sleep(100);
  }
  assert.equal(body.generated_at, '2026-10-24T12:01:30+00:00');
  assert.deepEqual(body.events.map(e => e.id), [ev.id]);
  const beatHealth = await fetch(`http://127.0.0.1:${srvPort}/healthz`);
  assert.equal(beatHealth.status, 200);
  writeFeed('2026-10-24T12:02:00+00:00', [{ ...ev, id: 'acme/one#2:open' }]);
  for (let i = 0; i < 40; i++) {
    body = await feed();
    if (body.events.some(e => e.id === 'acme/one#2:open')) break;
    await sleep(100);
  }
  assert.ok(body.events.some(e => e.id === 'acme/one#2:open'));
  assert.equal(body.generated_at, '2026-10-24T12:02:00+00:00');
});
