// A body-only critic FIX can ring ready again on the same sha. A pass on that sha keeps it buried.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const CKEY = 'critic-' + crypto.randomBytes(8).toString('hex');
const INGEST = crypto.randomBytes(32).toString('hex');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-rering-'));
const SHA = 'abcdef1234567890';
const READY = `handoff:0xrayai/xray#849:ready:${SHA}`;
const FAIL = `handoff:0xrayai/xray#849:critic_fail:${SHA}`;
const PASS = `handoff:0xrayai/xray#849:live_pass:${SHA}`;
let srv, BASE;

function row(id, kind) {
  return {
    id, t_ct: new Date().toISOString(), seat: 'critic', from: 'arch1', to: 'critic',
    type: 'packet', kind, repo: '0xRayAI/xray', number: 849, sha: SHA,
    title: 'handoff ' + kind, url: 'https://github.com/0xRayAI/xray/pull/849', reason: 'handoff ' + kind,
  };
}

before(async () => {
  srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', MESH_PASSWORD: crypto.randomBytes(8).toString('hex'), PATH: process.env.PATH,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA,
      COLLECTOR: 'off', FLEET_MODE: 'full', GITHUB_API_URL: 'http://127.0.0.1:1',
      SEAT_KEYS: JSON.stringify({ critic: crypto.createHash('sha256').update(CKEY).digest('hex') }),
    },
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const port = await listenPort(srv);
  BASE = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE + '/healthz')).ok) break; } catch { /* boot */ }
    await new Promise((r) => setTimeout(r, 100));
  }
});
after(async () => {
  srv.kill();
  await new Promise((r) => (srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)));
  fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

const ingest = (lines) => fetch(BASE + '/inbox', {
  method: 'POST',
  headers: { 'X-Live-Ingest': INGEST, 'Content-Type': 'application/json' },
  body: JSON.stringify({ lines }),
});
const criticAuth = { Authorization: 'Bearer ' + CKEY };

test('a popped ready rings again after critic_fail on the same sha, and stays buried after a pass', async () => {
  const first = await (await ingest([row(READY, 'ready')])).json();
  assert.equal(first.added, 1);
  const ack = await fetch(BASE + '/inbox/critic/ack', {
    method: 'POST', headers: { ...criticAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: READY }),
  });
  assert.equal((await ack.json()).acked, 1);
  const buried = await (await ingest([row(READY, 'ready')])).json();
  assert.equal(buried.added, 0);
  assert.equal((await (await ingest([row(FAIL, 'critic_fail')])).json()).added, 1);
  const again = await (await ingest([row(READY, 'ready')])).json();
  assert.equal(again.added, 1);
  const open = await (await fetch(BASE + '/inbox/critic', { headers: criticAuth })).json();
  assert.equal(open.lines.some((line) => line.id === READY), true);
  assert.equal((await (await ingest([row(PASS, 'live_pass')])).json()).added, 1);
  await fetch(BASE + '/inbox/critic/ack', {
    method: 'POST', headers: { ...criticAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: READY }),
  });
  const afterPass = await (await ingest([row(READY, 'ready')])).json();
  assert.equal(afterPass.added, 0);
});
