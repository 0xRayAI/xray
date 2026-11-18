// A seat stays working only when an open board card is that work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const FORGE_KEY = 'forge-card-' + crypto.randomBytes(8).toString('hex');
const CRITIC_KEY = 'critic-card-' + crypto.randomBytes(8).toString('hex');

function start(data) {
  const ingest = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: ingest,
      SEAT_KEYS: JSON.stringify({
        forge: crypto.createHash('sha256').update(FORGE_KEY).digest('hex'),
        critic: crypto.createHash('sha256').update(CRITIC_KEY).digest('hex'),
      }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  return { child, baseOf, logs: () => logs, ingest };
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

function stamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

test('working follows an open card, and a seen seat is not that sheen', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-work-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [
      {
        key: '0xrayai/xray#704', kind: 'pr', repo: '0xRayAI/xray', number: 704,
        title: 'activity', owner: 'critic', state: 'live', stage: 'open', packet_ok: true,
        beats: [], last_beat_t: Date.now(),
      },
      {
        key: '0xrayai/xray#1', kind: 'pr', repo: '0xRayAI/xray', number: 1,
        title: 'old', owner: 'forge', state: 'closed', stage: 'done', packet_ok: true,
        beats: [], last_beat_t: Date.now(),
      },
    ],
  }));
  const srv = start(data);
  let base = null;
  for (let i = 0; i < 50 && !base; i++) {
    base = srv.baseOf();
    if (!base) await new Promise(r => setTimeout(r, 50));
  }
  try {
    if (!base) throw new Error(srv.logs());
    const post = (key, body) => fetch(base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const forgePrompt = await post(FORGE_KEY, { t_ct: stamp(), seat: 'forge', kind: 'prompt', action: 'sent', from: 'blaze', to: 'forge' });
    assert.equal(forgePrompt.status, 202, await forgePrompt.text());
    let live = await (await fetch(base + '/live-events.json')).json();
    assert.notEqual(live.fleet.seats.forge && live.fleet.seats.forge.working, true);
    assert.equal(live.fleet.working && live.fleet.working.forge, undefined);
    const criticPrompt = await post(CRITIC_KEY, { t_ct: stamp(), seat: 'critic', kind: 'prompt', action: 'sent', from: 'blaze', to: 'critic' });
    assert.equal(criticPrompt.status, 202, await criticPrompt.text());
    live = await (await fetch(base + '/live-events.json')).json();
    assert.equal(live.fleet.seats.critic.working, true);
    assert.equal(live.fleet.working.critic.via, 'prompt');
    assert.equal(live.fleet.seats.critic.working_on, '0xRayAI/xray#704');
    assert.equal(live.fleet.working.critic.working_on, '0xRayAI/xray#704');
    const ingest = async (event) => {
      const res = await fetch(base + '/ingest', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + srv.ingest, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 't', generated_at: new Date().toISOString(), event_count: 1, events: [event],
        }),
      });
      assert.equal(res.status, 200, await res.text());
    };
    await ingest({
      id: 'miss#9', t_ct: stamp(), kind: 'pr_comment', from: 'forge', actor: 'forge',
      repo: '0xRayAI/xray', number: 9, label: 'no card', src_file: 'github-api',
    });
    live = await (await fetch(base + '/live-events.json')).json();
    assert.notEqual(live.fleet.seats.forge && live.fleet.seats.forge.working, true);
    assert.equal(live.fleet.working && live.fleet.working.forge, undefined);
    await ingest({
      id: 'hit#704', t_ct: stamp(), kind: 'pr_comment', from: 'critic', actor: 'critic',
      repo: '0xRayAI/xray', number: 704, label: 'on the card', src_file: 'github-api',
    });
    live = await (await fetch(base + '/live-events.json')).json();
    assert.equal(live.fleet.seats.critic.working, true);
    assert.equal(live.fleet.working.critic.working_on, '0xRayAI/xray#704');
    assert.notEqual(live.fleet.seats.forge && live.fleet.seats.forge.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a next-owner label that names the seat keeps that seat working', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-label-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  const archKey = 'arch1-card-' + crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [
      {
        key: '0xrayai/xray#719', kind: 'issue', repo: '0xRayAI/xray', number: 719,
        title: 'model', owner: 'Blaze', state: 'live', stage: 'open', packet_ok: true,
        packet: { 'next owner': 'Arch1 (@arch10x)' },
        beats: [], last_beat_t: Date.now(),
      },
    ],
  }));
  const ingest = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'off', LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: ingest,
      SEAT_KEYS: JSON.stringify({
        arch1: crypto.createHash('sha256').update(archKey).digest('hex'),
      }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  let base = null;
  for (let i = 0; i < 50 && !base; i++) {
    const m = /listening on :(\d+)/.exec(logs);
    base = m ? `http://127.0.0.1:${m[1]}` : null;
    if (!base) await new Promise((r) => setTimeout(r, 50));
  }
  try {
    if (!base) throw new Error(logs);
    const posted = await fetch(base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + archKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: stamp(), seat: 'arch1', kind: 'subagent', action: 'start', tag: 'suba1b2c3d4e5f6' }),
    });
    assert.equal(posted.status, 202, await posted.text());
    const live = await (await fetch(base + '/live-events.json')).json();
    assert.equal(live.fleet.seats.arch1.working, true);
    assert.equal(live.fleet.working.arch1.via, 'subagent');
    assert.equal(live.fleet.seats.arch1.working_on, '0xRayAI/xray#719');
  } finally {
    if (child.exitCode == null) {
      const done = new Promise((r) => child.once('exit', r));
      child.kill();
      await done;
    }
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a board of only closed cards does not mark a seat working', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-card-closed-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [
      {
        key: '0xrayai/xray#1', kind: 'pr', repo: '0xRayAI/xray', number: 1,
        title: 'old', owner: 'forge', state: 'closed', stage: 'done', packet_ok: true,
        beats: [], last_beat_t: Date.now(),
      },
    ],
  }));
  const srv = start(data);
  let base = null;
  for (let i = 0; i < 50 && !base; i++) {
    base = srv.baseOf();
    if (!base) await new Promise(r => setTimeout(r, 50));
  }
  try {
    if (!base) throw new Error(srv.logs());
    const res = await fetch(base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + FORGE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: stamp(), seat: 'forge', kind: 'prompt', action: 'sent', from: 'blaze', to: 'forge' }),
    });
    assert.equal(res.status, 202, await res.text());
    const live = await (await fetch(base + '/live-events.json')).json();
    assert.notEqual(live.fleet.seats.forge && live.fleet.seats.forge.working, true);
    assert.equal(live.fleet.working && live.fleet.working.forge, undefined);
    const comment = await fetch(base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + srv.ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 't', generated_at: new Date().toISOString(), event_count: 1,
        events: [{
          id: 'closed#1', t_ct: stamp(), kind: 'pr_comment', from: 'forge', actor: 'forge',
          repo: '0xRayAI/xray', number: 1, label: 'closed card', src_file: 'github-api',
        }],
      }),
    });
    assert.equal(comment.status, 200, await comment.text());
    const after = await (await fetch(base + '/live-events.json')).json();
    assert.notEqual(after.fleet.seats.forge && after.fleet.seats.forge.working, true);
    assert.equal(after.fleet.working && after.fleet.working.forge, undefined);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
