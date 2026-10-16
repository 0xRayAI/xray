// Activity on the volume is append-only. A restart keeps every line already written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');

function start(data, extra) {
  const child = spawn(process.execPath, [APP], {
    env: {
      PORT: '0',
      MESH_PASSWORD: extra.password,
      SESSION_SECRET: extra.session,
      INGEST_SECRET: extra.ingest,
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      COLLECTOR: 'off',
      SEAT_KEYS: extra.keys,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  const ready = (async () => {
    for (let i = 0; i < 300; i++) {
      const base = baseOf();
      try { if (base && (await fetch(base + '/healthz')).ok) return; } catch { /* booting */ }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('healthz did not come up\n' + logs);
  })();
  return { child, get base() { return baseOf(); }, ready };
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

test('activity.jsonl on the volume survives a restart and a new line is appended', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-act-'));
  const live = path.join(data, 'live');
  fs.mkdirSync(live, { recursive: true });
  const actFile = path.join(live, 'activity.jsonl');
  const now = new Date().toISOString();
  const seed = { id: 'pre.1', seq: 1, seat: 'builder-cloud', t_ct: now, kind: 'turn', action: 'start', tag: 'board' };
  fs.writeFileSync(actFile, JSON.stringify(seed) + '\n');
  const password = 'pw-' + crypto.randomBytes(4).toString('hex');
  const session = crypto.randomBytes(32).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const cloudKey = 'bc-' + crypto.randomBytes(8).toString('hex');
  const keys = JSON.stringify({ 'builder-cloud': crypto.createHash('sha256').update(cloudKey).digest('hex') });
  const env = { password, session, ingest, keys };

  async function board(base) {
    const login = await fetch(base + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=' + encodeURIComponent(password), redirect: 'manual',
    });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    return (await fetch(base + '/live-events.json', { headers: { Cookie: cookie } })).json();
  }

  const first = start(data, env);
  try {
    await first.ready;
    const before = fs.readFileSync(actFile, 'utf8').trim().split('\n');
    assert.equal(before.length, 1);
    assert.equal(JSON.parse(before[0]).id, 'pre.1');
    const live0 = await board(first.base);
    assert.equal(live0.fleet.seats['builder-cloud'].working, true);
    const posted = await fetch(first.base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cloudKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: new Date().toISOString(), kind: 'turn', action: 'tick', tag: 'board' }),
    });
    assert.equal(posted.status, 202);
    const lines = fs.readFileSync(actFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).id, 'pre.1');
    assert.equal(JSON.parse(lines[1]).seat, 'Builder-cloud');
  } finally {
    await stop(first.child);
  }

  const second = start(data, env);
  try {
    await second.ready;
    const kept = fs.readFileSync(actFile, 'utf8').trim().split('\n');
    assert.equal(kept.length, 2);
    assert.equal(JSON.parse(kept[0]).id, 'pre.1');
    const live1 = await board(second.base);
    assert.equal(live1.fleet.seats['builder-cloud'].working, true);
    const again = await fetch(second.base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cloudKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: new Date().toISOString(), kind: 'turn', action: 'tick', tag: 'still' }),
    });
    assert.equal(again.status, 202);
    const after = fs.readFileSync(actFile, 'utf8').trim().split('\n');
    assert.equal(after.length, 3);
    assert.equal(JSON.parse(after[0]).id, 'pre.1');
  } finally {
    await stop(second.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
