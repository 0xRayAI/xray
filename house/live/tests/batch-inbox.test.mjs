// batch is a string on the inbox line. run_end is a kind, not a key.
import { listenPort } from './free-port.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-batch-'));
const FKEY = 'forge-' + crypto.randomBytes(8).toString('hex');
const INGEST = crypto.randomBytes(32).toString('hex');
const H = (k) => crypto.createHash('sha256').update(k).digest('hex');
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA,
    SEAT_KEYS: JSON.stringify({ forge: H(FKEY) }),
    BIFROST_TICK_S: '3600',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const port = await listenPort(srv);
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 100));
}
const ingest = { 'X-Live-Ingest': INGEST, 'Content-Type': 'application/json' };
const forge = { Authorization: 'Bearer ' + FKEY };

function row(over = {}) {
  return {
    id: 'row-' + crypto.randomBytes(4).toString('hex'),
    t_ct: new Date().toISOString(),
    seat: 'forge', type: 'packet', repo: '0xRayAI/xray', number: 402,
    title: 'ask', url: 'https://github.com/0xRayAI/xray/pull/402', reason: 'ask',
    ...over,
  };
}

test('a batch string is stored, run_end is a kind, and run_end is not a field', async () => {
  const good = await fetch(base + '/inbox', { method: 'POST', headers: ingest, body: JSON.stringify({ lines: [row({ batch: 'critic_fail: round 1' })] }) });
  assert.equal(good.status, 200);
  const lines = (await (await fetch(base + '/inbox/forge', { headers: forge })).json()).lines;
  assert.equal(lines.some((item) => item.batch === 'critic_fail: round 1'), true);
  const bad = await fetch(base + '/inbox', { method: 'POST', headers: ingest, body: JSON.stringify({ lines: [row({ batch: 1 })] }) });
  assert.equal(bad.status, 400);
  const named = await fetch(base + '/inbox', { method: 'POST', headers: ingest, body: JSON.stringify({ lines: [row({ run_end: 'now' })] }) });
  assert.equal(named.status, 400);
  const kind = await fetch(base + '/inbox', { method: 'POST', headers: ingest, body: JSON.stringify({ lines: [row({ kind: 'run_end', sha: 'abc1234' })] }) });
  assert.equal(kind.status, 200);
  srv.kill();
  await new Promise((r) => (srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)));
  fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});
