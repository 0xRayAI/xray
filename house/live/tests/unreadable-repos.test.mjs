// A feed that records per-repo 403/404 lists those repos on /healthz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('healthz counts and lists repos the collector could not read', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-unread-'));
  const names = ['0xRayAI/0xray-moltbook', '0xRayAI/grok-bot-house', '0xRayAI/muse-house-skills'];
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    repos_unreadable: names,
    events: [{ id: 'e1', t_ct: new Date().toISOString(), kind: 'pr_open', repo: '0xRayAI/xray', number: 1 }],
  }));
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'on', PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  try {
    let body;
    for (let i = 0; i < 40; i++) {
      const m = /listening on :(\d+)/.exec(logs);
      if (m) {
        body = await (await fetch(`http://127.0.0.1:${m[1]}/healthz`)).json();
        if (body.repos_unreadable) break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(body.repos_unreadable, 3, JSON.stringify(body));
    assert.deepEqual(body.unreadable_repos, names);
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
