// Live writer order: presence, applyStoredActivity, track, GitHub, applyTurnRelease,
// then refreshWorking on the feed read. A later GitHub mark must not pin working
// after it leaves TURN_OPEN_MS, and an ended turn still clears once that window passes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

function start(data) {
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'on', LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
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

async function fleetOf(srv, ready) {
  let fleet = null;
  for (let i = 0; i < 40; i++) {
    const base = srv.baseOf();
    if (base) {
      const live = await (await fetch(base + '/live-events.json')).json();
      if (live.fleet && live.fleet.seats && ready(live)) {
        fleet = live.fleet;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return fleet;
}

function lay(data, { activity, events, working, seats }) {
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), activity.map(l => JSON.stringify(l)).join('\n') + '\n');
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    fleet: {
      window_min: 15,
      seats,
      working,
      cloud: { open_agents: [], active: false },
    },
    events,
  }));
}

function line(seat, action, at) {
  return { id: seat + '.' + action, seq: 1, seat, t_ct: new Date(at).toISOString(), kind: 'turn', action };
}

test('an ended turn clears working after the GitHub mark expires', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-order-'));
  const now = Date.now();
  const criticStart = now - 27 * 60 * 1000;
  const forgeStart = now - 25 * 60 * 1000;
  const ghBefore = now - 24 * 60 * 1000;
  const forgeEnd = now - 23 * 60 * 1000;
  const ghAfter = now - 22 * 60 * 1000;
  const criticEnd = now - 25 * 60 * 1000;
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  const activity = [
    line('forge', 'start', forgeStart),
    line('forge', 'end', forgeEnd),
    line('critic', 'start', criticStart),
    line('critic', 'end', criticEnd),
  ];
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), activity.map(l => JSON.stringify(l)).join('\n') + '\n');
  const seat = (at) => ({ active: false, last_ct: new Date(at).toISOString(), via: 'github', working: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date(ghAfter).toISOString(),
    fleet: {
      window_min: 15,
      seats: { forge: seat(ghAfter), critic: seat(criticEnd) },
      working: {
        forge: { via: 'github', since_ct: new Date(ghAfter).toISOString(), working_on: 'example/repo#7' },
        critic: { via: 'feed', since_ct: new Date(criticStart).toISOString() },
      },
      cloud: { open_agents: [], active: false },
    },
    events: [
      { id: 'gh-before', t_ct: new Date(ghBefore).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
      { id: 'gh-after', t_ct: new Date(ghAfter).toISOString(), kind: 'pr_review', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
    ],
  }));
  const srv = start(data);
  try {
    let fleet = null;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        const live = await (await fetch(base + '/live-events.json')).json();
        if (live.event_count > 0 && live.fleet && live.fleet.seats && live.fleet.seats.forge && live.fleet.seats.critic) {
          fleet = live.fleet;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.forge.working, false);
    assert.equal(fleet.seats.forge.active, false);
    assert.equal(fleet.working.critic, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.critic.working, false);
    assert.equal(fleet.seats.critic.active, false);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a fresh mark newer than the end stays working', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-fresh-'));
  const now = Date.now();
  const opened = now - 4 * 60 * 1000;
  const end = now - 60 * 1000;
  const mark = now - 10 * 1000;
  lay(data, {
    activity: [line('forge', 'start', opened), line('forge', 'end', end)],
    seats: { forge: { active: true, last_ct: new Date(mark).toISOString(), via: 'github', working: true } },
    working: { forge: { via: 'github', since_ct: new Date(mark).toISOString(), working_on: 'example/repo#7' } },
    events: [
      { id: 'gh-after', t_ct: new Date(mark).toISOString(), kind: 'pr_review', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv, live => live.event_count > 0 && live.fleet.seats.forge);
    assert.ok(fleet, srv.logs());
    assert.ok(fleet.working.forge, JSON.stringify(fleet.working));
    assert.equal(fleet.working.forge.via, 'github');
    assert.equal(fleet.seats.forge.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a cloud mark with no running agent does not keep the seat after the turn end', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-cloud-'));
  const now = Date.now();
  const cloudAt = now - 30 * 60 * 1000;
  const end = now - 23 * 60 * 1000;
  lay(data, {
    activity: [line('forge', 'start', now - 31 * 60 * 1000), line('forge', 'end', end)],
    seats: { forge: { active: false, last_ct: new Date(end).toISOString(), via: 'cloud', working: true } },
    working: { forge: { via: 'cloud', since_ct: new Date(cloudAt).toISOString() } },
    events: [
      { id: 'ci', t_ct: new Date(end).toISOString(), kind: 'check_run', conclusion: 'success', repo: 'example/repo', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv, live => live.event_count > 0 && live.fleet.seats.forge);
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.forge.working, false);
    assert.equal(fleet.working.critic, undefined);
    assert.notEqual(fleet.cloud && fleet.cloud.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
