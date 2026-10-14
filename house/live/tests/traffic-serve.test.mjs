// Served board: pr_commit is not traffic; a github deploy drops when the Railway poll has that sha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('live-events drops pr_commit and a covered github deploy, keeps the poll and a recent unmatched terminal', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-traffic-'));
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: secret,
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
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
    const events = [
      { id: 'c1', t_ct: now, kind: 'pr_commit', repo: 'acme/one', number: 1 },
      { id: 'f1', t_ct: now, kind: 'pr_force_push', repo: 'acme/one', number: 1 },
      { id: 'r1', t_ct: now, kind: 'pr_ready', repo: 'acme/one', number: 1 },
      { id: 'd1', t_ct: now, kind: 'deploy', state: 'success', src_file: 'github-api', sha: 'abc123def456', context: 'burst-live' },
      { id: 'o1', t_ct: now, kind: 'op_deploy', sha: 'abc123def456', service: 'burst-live', status: 'SUCCESS' },
      { id: 'd2', t_ct: now, kind: 'deploy', state: 'success', src_file: 'github-api', sha: 'unique999aaa', context: 'other-app' },
      { id: 'd3', t_ct: old, kind: 'deploy_fail', state: 'failure', src_file: 'github-api', sha: 'oldoldold111', context: 'nope' },
    ];
    const posted = await fetch(base + '/ingest', { method: 'POST', headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' }, body: JSON.stringify({ events }) });
    assert.equal(posted.status, 200);
    const feed = await (await fetch(base + '/live-events.json')).json();
    const ids = new Set((feed.events || []).map(e => e.id));
    assert.ok(!ids.has('c1'));
    assert.ok(ids.has('f1'));
    assert.ok(ids.has('r1'));
    assert.ok(!ids.has('d1'));
    assert.ok(ids.has('o1'));
    assert.ok(ids.has('d2'));
    assert.ok(!ids.has('d3'));
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
