// agent-line.sh posts {kind:agent} and the board draws seat_agent toward cloud. The key stays off the output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('agent-line.sh records a launch and does not print the key', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-agent-'));
  const key = 'agent-key-' + crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      SEAT_KEYS: JSON.stringify({ 'builder-cloud': hash }),
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
    const out = await new Promise((resolve, reject) => {
      const sh = spawn('sh', [path.join(APP, 'agent-line.sh'), 'launch', 'bc-agentline1', 'wave'], {
        env: { ...process.env, LIVE_URL: base, LIVE_KEY: key, LIVE_SEAT: 'Builder-cloud' },
      });
      let text = '';
      sh.stdout.on('data', d => { text += d; });
      sh.stderr.on('data', d => { text += d; });
      sh.on('error', reject);
      sh.on('close', code => resolve({ code, text }));
    });
    assert.equal(out.code, 0, out.text);
    assert.equal(out.text.trim(), '202');
    assert.ok(!out.text.includes(key));
    assert.ok(!logs.includes(key));
    const feed = await (await fetch(base + '/live-events.json')).json();
    const line = (feed.events || []).find(e => e.kind === 'seat_agent');
    assert.ok(line, JSON.stringify(feed.events));
    assert.equal(line.to, 'cloud');
    assert.equal(line.from, 'Builder-cloud');
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
