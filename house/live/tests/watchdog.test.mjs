// A collector child that never ticks is restarted, and /healthz says stalled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('hung feed loop restarts and is visible on the board and on healthz', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-watch-'));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-py-'));
  fs.writeFileSync(path.join(bin, 'python3'), '#!/bin/sh\nsleep 60\n');
  fs.chmodSync(path.join(bin, 'python3'), 0o755);
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', LIVE_PUBLIC: '1', PATH: bin + ':' + (process.env.PATH || ''),
      MESH_DATA_DIR: data, GITHUB_READ_TOKEN: 'token-for-watchdog',
      COLLECTOR_WATCH_S: '1', COLLECTOR_WATCHDOG_N: '2',
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  try {
    let base = null, body = null;
    for (let i = 0; i < 40; i++) {
      const m = /listening on :(\d+)/.exec(logs);
      if (m) base = `http://127.0.0.1:${m[1]}`;
      if (base && /feed loop stalled/.test(logs)) {
        body = await (await fetch(base + '/healthz')).json();
        if (body.stalled) break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    assert.match(logs, /feed loop stalled/);
    assert.equal(body.stalled, true);
    assert.equal(body.last_tick, null);
    const feed = await (await fetch(base + '/live-events.json')).json();
    const line = (feed.events || []).find(e => e.id === 'health:feed-loop');
    assert.ok(line, JSON.stringify(feed.events));
    assert.equal(line.kind, 'health_fail');
    assert.match(line.label, /feed loop stalled/);
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});

test('stale feed on disk does not kill a fresh collector; a real stall still does', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-watch-stale-'));
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-py-'));
  fs.writeFileSync(path.join(bin, 'python3'), '#!/bin/sh\nsleep 60\n');
  fs.chmodSync(path.join(bin, 'python3'), 0o755);
  const feed = path.join(data, 'feed', 'github-events.json');
  fs.mkdirSync(path.dirname(feed), { recursive: true });
  fs.writeFileSync(feed, JSON.stringify({
    generated_at: '2020-01-01T00:00:00Z',
    events: [{ id: 'e1', t_ct: '2020-01-01T00:00:00Z', kind: 'note' }],
  }));
  const old = new Date(Date.now() - 10 * 60 * 1000);
  fs.utimesSync(feed, old, old);
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', LIVE_PUBLIC: '1', PATH: bin + ':' + (process.env.PATH || ''),
      MESH_DATA_DIR: data, GITHUB_READ_TOKEN: 'token-for-watchdog',
      COLLECTOR_WATCH_S: '1', COLLECTOR_WATCHDOG_N: '3',
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  try {
    let port = null;
    for (let i = 0; i < 80 && !(port && /collector: started/.test(logs)); i++) {
      port = /listening on :(\d+)/.exec(logs);
      if (!(port && /collector: started/.test(logs))) await new Promise(r => setTimeout(r, 50));
    }
    port = /listening on :(\d+)/.exec(logs);
    assert.match(logs, /collector: started/);
    assert.ok(port, logs);
    const base = `http://127.0.0.1:${port[1]}`;
    const early = await (await fetch(base + '/healthz')).json();
    assert.equal(early.stalled, false);
    let body = null;
    for (let i = 0; i < 40 && !/feed loop stalled/.test(logs); i++) await new Promise(r => setTimeout(r, 250));
    assert.match(logs, /feed loop stalled \d+s; restarting/);
    const age = Number(/feed loop stalled (\d+)s; restarting/.exec(logs)[1]);
    assert.ok(age < 30, `stall age ${age}s is the on-disk file, not this start`);
    body = await (await fetch(base + '/healthz')).json();
    assert.equal(body.stalled, true);
  } finally {
    const done = new Promise(r => child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  }
});
