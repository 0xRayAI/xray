// Boot smoke: a seeded open turn must not trip the #338 TDZ (TURN_OPEN_MS read during module replay).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('GET /healthz is 200 when boot replays an open turn', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-boot-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), JSON.stringify({
    id: 'boot.1', seq: 1, seat: 'forge', t_ct: new Date().toISOString(), kind: 'turn', action: 'start', tag: 'boot',
  }) + '\n');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', PATH: process.env.PATH, MESH_DATA_DIR: data,
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  try {
    let base = null;
    for (let i = 0; i < 50; i++) {
      const m = /listening on :(\d+)/.exec(logs);
      if (m) { base = `http://127.0.0.1:${m[1]}`; break; }
      if (child.exitCode != null) break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.ok(base, logs);
    assert.doesNotMatch(logs, /ReferenceError/);
    const res = await fetch(base + '/healthz');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  } finally {
    if (child.exitCode == null) {
      const done = new Promise(r => child.once('exit', r));
      child.kill();
      await done;
    }
    fs.rmSync(data, { recursive: true, force: true });
  }
});
