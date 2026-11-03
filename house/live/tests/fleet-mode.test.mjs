import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySchedule, cursorLaunchAllowed, scheduledFleetMode, wakeAllowed } from '../app/fleet-mode.mjs';
import { listenPort } from './free-port.mjs';

test('P1 and a scheduled run pass in every mode', () => {
  const p1 = { title: 'P1: fleet mode' };
  const plain = { title: 'quiet card' };
  const marked = { title: 'lights-on: keep the board' };
  for (const mode of ['full', 'lights-on', 'dark']) {
    assert.equal(wakeAllowed(mode, p1), true);
    assert.equal(wakeAllowed(mode, plain, { scheduled: true }), true);
  }
  assert.equal(wakeAllowed('lights-on', marked), true);
  assert.equal(wakeAllowed('lights-on', plain), false);
  assert.equal(wakeAllowed('dark', plain), false);
  assert.equal(wakeAllowed('dark', marked), false);
  assert.equal(wakeAllowed('full', plain), true);
  assert.equal(scheduledFleetMode(Date.parse('2026-11-02T14:00:00Z')), 'full');
  assert.equal(scheduledFleetMode(Date.parse('2026-11-02T13:29:00Z')), 'lights-on');
  assert.equal(scheduledFleetMode(Date.parse('2026-11-02T21:30:00Z')), 'lights-on');
  assert.equal(scheduledFleetMode(Date.parse('2026-11-01T18:00:00Z')), 'lights-on');
  const held = { mode: 'dark', route: 'none', by: 'blaze', source: 'manual', boundary: '2026-11-02 full' };
  assert.equal(applySchedule(held, Date.parse('2026-11-02T14:00:00Z')).mode, 'dark');
  assert.equal(applySchedule(held, Date.parse('2026-11-02T21:30:00Z')).mode, 'lights-on');
  assert.equal(applySchedule(held, Date.parse('2026-11-02T21:30:00Z')).by, 'schedule');
  assert.equal(applySchedule({ mode: 'full', source: 'env', route: 'none' }, Date.parse('2026-11-02T21:30:00Z')).mode, 'full');
  assert.equal(cursorLaunchAllowed({ route: 'cursor-cloud', readable: true, p1: false }), true);
  assert.equal(cursorLaunchAllowed({ route: 'none', readable: true, p1: true }), false);
  assert.equal(cursorLaunchAllowed({ route: 'none', readable: false, p1: true }), true);
  assert.equal(cursorLaunchAllowed({ route: 'cursor-cloud', readable: false, p1: false }), false);
});

test('the board shows the mode, and only Blaze or blinky can set it', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-mode-'));
  const ingest = 'fleet-mode-ingest-secret-32bytes-ok';
  const forgeKey = 'forge-fleet-mode';
  const blinkyKey = 'blinky-fleet-mode';
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const child = spawn(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', SERVER_ROUTING: 'off', LIVE_PUBLIC: '1',
      MESH_DATA_DIR: data, INGEST_SECRET: ingest,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      NUDGE_L1_S: '1', NUDGE_L2_S: '3600', NUDGE_L3_S: '3600', BIFROST_TICK_S: '3600',
      LIVE_SEAT_IDS: 'forge,blinky,critic',
      SEAT_KEYS: JSON.stringify({ forge: sha(forgeKey), blinky: sha(blinkyKey) }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    const port = await listenPort(child);
    const base = `http://127.0.0.1:${port}`;
    const shown = await (await fetch(base + '/fleet-mode')).json();
    assert.equal(shown.mode, 'lights-on');
    assert.equal(shown.by, 'default');
    const denied = await fetch(base + '/fleet-mode', {
      method: 'POST', headers: { Authorization: 'Bearer ' + forgeKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dark' }),
    });
    assert.equal(denied.status, 403);
    const set = await fetch(base + '/fleet-mode', {
      method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dark' }),
    });
    assert.equal(set.status, 200, await set.clone().text());
    const dark = await (await fetch(base + '/fleet-mode')).json();
    assert.equal(dark.mode, 'dark');
    assert.equal(dark.by, 'blaze');
    assert.equal(dark.route, 'none');
    const routed = await fetch(base + '/fleet-mode', {
      method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dark', route: 'cursor-cloud' }),
    });
    assert.equal(routed.status, 200, await routed.text());
    assert.equal((await (await fetch(base + '/fleet-mode')).json()).route, 'cursor-cloud');
    const health = await (await fetch(base + '/healthz')).json();
    assert.equal(health.fleet_mode.mode, 'dark');
    assert.equal(health.fleet_mode.by, 'blaze');
    const posted = await fetch(base + '/inbox', {
      method: 'POST', headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [{ id: 'note-1', t_ct: new Date().toISOString(), seat: 'forge', type: 'note', repo: 'acme/app', number: 1, title: 'seat wake', url: 'https://github.com/acme/app/issues/1', reason: 'note' }] }),
    });
    assert.equal(posted.status, 200, await posted.text());
    assert.equal((await (await fetch(base + '/fleet-mode')).json()).mode, 'dark');
    const now = Date.now();
    const card = (number, title) => ({
      key: 'acme/app#' + number, kind: 'issue', repo: 'acme/app', number, title,
      url: 'https://github.com/acme/app/issues/' + number, owner: 'forge', stage: 'open', state: 'live',
      packet: {}, beats: [{ t: now - 10000, what: 'opened' }], last_beat_t: now - 10000, stall: true,
    });
    const board = await fetch(base + '/ingest', {
      method: 'POST', headers: { Authorization: 'Bearer ' + ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'mode', event_count: 0, generated_at: new Date().toISOString(), events: [], board: { updated_ct: new Date().toISOString(), cards: [card(1, 'quiet card'), card(2, 'P1: fleet mode')] } }),
    });
    assert.equal(board.status, 200, logs.slice(-300) + await board.clone().text());
    let nudges = [];
    for (let i = 0; i < 30; i++) {
      nudges = ((await (await fetch(base + '/nudges', { headers: { Authorization: 'Bearer ' + forgeKey } })).json()).nudges) || [];
      if (nudges.some((row) => row.card === 'acme/app#2')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(nudges.some((row) => row.card === 'acme/app#2'), true);
    assert.equal(nudges.some((row) => row.card === 'acme/app#1'), false);
    const byBlinky = await fetch(base + '/fleet-mode', {
      method: 'POST', headers: { Authorization: 'Bearer ' + blinkyKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'full' }),
    });
    assert.equal(byBlinky.status, 200, await byBlinky.text());
    assert.equal((await (await fetch(base + '/fleet-mode')).json()).by, 'blinky');
  } finally {
    const done = new Promise((r) => child.exitCode != null || child.signalCode ? r() : child.once('exit', r));
    child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
