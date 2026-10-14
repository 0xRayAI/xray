// An open turn expires at read time. A restart is not required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('forge working clears after TURN_OPEN_MS without a restart', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-turn-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), JSON.stringify({
    id: 'turn.1', seq: 1, seat: 'forge', t_ct: new Date().toISOString(), kind: 'turn', action: 'start', tag: 'live',
  }) + '\n');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', LIVE_TURN_OPEN_MIN: '0.02',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
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
      await new Promise(r => setTimeout(r, 100));
    }
    assert.ok(base, logs);
    const first = await (await fetch(base + '/live-events.json')).json();
    assert.ok(first.fleet && first.fleet.working && first.fleet.working.forge, JSON.stringify(first.fleet));
    await new Promise(r => setTimeout(r, 1500));
    const second = await (await fetch(base + '/live-events.json')).json();
    assert.ok(!second.fleet.working.forge, JSON.stringify(second.fleet.working));
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
