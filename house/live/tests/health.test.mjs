// Health body: building / empty / live, stale card_age and data_age, HTTP stays 200.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

function start(data, extra = {}) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: String(port),
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      COLLECTOR: 'off',
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const base = `http://127.0.0.1:${port}`;
  const ready = (async () => {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(base + '/healthz')).ok) return; } catch { /* not up */ }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('healthz did not come up\n' + logs);
  })();
  return { child, base, ready, logs: () => logs };
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

test('building when no cards; empty when a board was built with zero cards', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-health-'));
  const srv = start(data);
  try {
    await srv.ready;
    const res = await fetch(srv.base + '/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    const body = await res.json();
    assert.equal(body.board, 'building');
    assert.equal(body.ok, true);
    assert.equal(body.card_age, null);
    assert.equal(body.data_age, null);
    assert.equal(body.origin, null);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-health-'));
  fs.mkdirSync(path.join(emptyDir, 'live'), { recursive: true });
  fs.writeFileSync(path.join(emptyDir, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(), cards: [],
  }));
  const empty = start(emptyDir);
  try {
    await empty.ready;
    const body = await (await fetch(empty.base + '/healthz')).json();
    assert.equal(body.board, 'empty');
    assert.equal(body.ok, true);
    assert.equal(typeof body.card_age, 'number');
    assert.ok(body.card_age < 600);
  } finally {
    await stop(empty.child);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('stale card_age sets ok false and keeps HTTP 200', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-health-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date(Date.now() - 3600 * 1000).toISOString(),
    cards: [{ key: 'acme/one#1', stage: 'review', state: 'live', title: 't', repo: 'acme/one', number: 1 }],
  }));
  const srv = start(data);
  try {
    await srv.ready;
    const res = await fetch(srv.base + '/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.board, 'live');
    assert.ok(body.card_age > 600);
    assert.equal(body.data_age, null);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('stale data_age sets ok false while collector_age stays small; a full replace clears it', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-health-'));
  const feed = path.join(data, 'feed', 'github-events.json');
  fs.mkdirSync(path.dirname(feed), { recursive: true });
  const old = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  fs.writeFileSync(feed, JSON.stringify({
    generated_at: new Date().toISOString(),
    events: [{ id: 'old-gh', t_ct: old, kind: 'push', label: 'old' }],
  }));
  const srv = start(data, { COLLECTOR: 'on' });
  try {
    await srv.ready;
    let body, res;
    for (let i = 0; i < 40; i++) {
      res = await fetch(srv.base + '/healthz');
      body = await res.json();
      if (typeof body.data_age === 'number') break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    assert.equal(body.ok, false);
    assert.ok(body.data_age > 21600);
    assert.ok(typeof body.collector_age === 'number' && body.collector_age < 30);
    fs.writeFileSync(feed, JSON.stringify({ generated_at: new Date().toISOString(), events: [] }));
    let cleared;
    for (let i = 0; i < 40; i++) {
      cleared = await (await fetch(srv.base + '/healthz')).json();
      if (cleared.data_age === null) break;
      await new Promise(r => setTimeout(r, 150));
    }
    assert.equal(cleared.data_age, null);
    assert.equal(cleared.ok, true);
    assert.ok(cleared.collector_age < 30);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
