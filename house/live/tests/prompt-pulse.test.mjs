// A prompt posted to /activity keeps the seat working for 10 minutes and credits Blaze.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const KEY = 'forge-prompt-' + crypto.randomBytes(8).toString('hex');

function start(data) {
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      SEAT_KEYS: JSON.stringify({ forge: crypto.createHash('sha256').update(KEY).digest('hex') }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  return { child, baseOf, logs: () => logs };
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

function stamp(msAgo) {
  return new Date(Date.now() - msAgo).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function post(base, body) {
  return fetch(base + '/activity', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('a prompt pulse keeps the seat working for 10 minutes and credits Blaze', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-prompt-'));
  const srv = start(data);
  let base = null;
  for (let i = 0; i < 50 && !base; i++) {
    base = srv.baseOf();
    if (!base) await new Promise(r => setTimeout(r, 50));
  }
  try {
    if (!base) throw new Error(srv.logs());
    const old = await post(base, { t_ct: stamp(11 * 60 * 1000), seat: 'forge', kind: 'prompt', action: 'sent', from: 'blaze', to: 'forge' });
    assert.equal(old.status, 202, await old.text());
    let live = await (await fetch(base + '/live-events.json')).json();
    assert.notEqual(live.fleet.seats.forge.working, true);
    assert.equal(live.fleet.working && live.fleet.working.forge, undefined);
    const aged = live.events.filter(e => e.kind === 'seat_prompt');
    assert.equal(aged.length, 1);
    assert.equal(aged[0].from, 'Blaze');
    assert.equal(aged[0].to, 'forge');
    const fresh = await post(base, { t_ct: stamp(0), seat: 'forge', kind: 'prompt', action: 'sent', from: 'blaze', to: 'forge', room: 'ops' });
    assert.equal(fresh.status, 202, await fresh.text());
    live = await (await fetch(base + '/live-events.json')).json();
    assert.equal(live.fleet.seats.forge.working, true);
    assert.equal(live.fleet.working.forge.via, 'prompt');
    const pulses = live.events.filter(e => e.kind === 'seat_prompt');
    assert.equal(pulses.length, 2);
    assert.ok(pulses.every(e => e.from === 'Blaze' && e.to === 'forge'));
    assert.ok(pulses.some(e => String(e.label).includes('ops')));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
