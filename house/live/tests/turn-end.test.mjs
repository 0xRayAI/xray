// Turn end and ack clear fleet.working. An open turn expires after the default 20 minutes.
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

function lay(data, { activity, events, working }) {
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), activity.map(l => JSON.stringify(l)).join('\n') + '\n');
  const seats = {};
  for (const seat of Object.keys(working)) seats[seat] = { active: true, last_ct: new Date().toISOString(), via: 'feed', working: true };
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    fleet: { window_min: 15, seats, working, cloud: { open_agents: [], active: false } },
    events,
  }));
}

function line(seat, action, agoMs, tag) {
  const row = { id: seat + '.' + action + '.' + agoMs, seq: 1, seat, t_ct: new Date(Date.now() - agoMs).toISOString(), kind: 'turn', action };
  if (tag) row.tag = tag;
  return row;
}

async function fleetOf(srv) {
  let live = null;
  for (let i = 0; i < 40; i++) {
    const base = srv.baseOf();
    if (base) {
      live = await (await fetch(base + '/live-events.json')).json();
      if (live.event_count > 0 && live.fleet && live.fleet.seats && live.fleet.seats.forge) break;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return live && live.fleet;
}

test('a turn end or ack clears fleet.working, and a later tick does not reopen it', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-'));
  const older = 90 * 1000;
  lay(data, {
    working: {
      forge: { via: 'feed', since_ct: new Date(Date.now() - older).toISOString() },
      critic: { via: 'feed', since_ct: new Date(Date.now() - older).toISOString() },
      blinky: { via: 'feed', since_ct: new Date(Date.now() - older).toISOString() },
      herald: { via: 'feed', since_ct: new Date(Date.now() - older).toISOString() },
    },
    activity: [
      line('forge', 'start', 3 * 60 * 1000),
      line('forge', 'tick', 2 * 60 * 1000),
      line('forge', 'end', 60 * 1000),
      line('forge', 'tick', 10 * 1000),
      line('critic', 'start', 3 * 60 * 1000, 'wake'),
      line('critic', 'end', 60 * 1000, 'ack'),
      line('blinky', 'start', 3 * 60 * 1000),
      line('blinky', 'end', 60 * 1000),
      line('herald', 'start', 60 * 1000),
    ],
    events: [
      { id: 'c-forge', t_ct: new Date(Date.now() - older).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
      { id: 'c-critic', t_ct: new Date(Date.now() - older).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 8, actor: 'critic0x[bot]' },
      { id: 'c-blinky', t_ct: new Date(Date.now() - older).toISOString(), kind: 'issue_comment', repo: 'example/repo', number: 9, actor: 'blinky' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv);
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.forge.working, false);
    assert.equal(fleet.working.critic, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.critic.working, false);
    assert.equal(fleet.working.blinky, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.blinky.working, false);
    assert.ok(fleet.working.herald, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.herald.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('an open turn expires after 20 minutes and a younger one stays', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-expire-'));
  lay(data, {
    working: {
      forge: { via: 'feed', since_ct: new Date(Date.now() - 21 * 60 * 1000).toISOString() },
      critic: { via: 'feed', since_ct: new Date(Date.now() - 19 * 60 * 1000).toISOString() },
    },
    activity: [
      line('forge', 'start', 21 * 60 * 1000),
      line('critic', 'start', 19 * 60 * 1000),
    ],
    events: [
      { id: 'c-forge', t_ct: new Date(Date.now() - 60 * 1000).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
      { id: 'c-critic', t_ct: new Date(Date.now() - 60 * 1000).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 8, actor: 'critic0x[bot]' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv);
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.forge.working, false);
    assert.ok(fleet.working.critic, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.critic.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a running cloud agent stays on its own id after the seat turn ends', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-agent-'));
  lay(data, {
    working: {},
    activity: [
      line('forge', 'start', 4 * 60 * 1000),
      line('forge', 'end', 60 * 1000),
    ],
    events: [
      { id: 'ci', t_ct: new Date(Date.now() - 30 * 1000).toISOString(), kind: 'check_run', conclusion: 'success', repo: 'example/repo', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
  });
  fs.writeFileSync(path.join(data, 'live', 'agents.jsonl'), JSON.stringify({
    event_id: 'ag-1', agent: 'bc-forge0001', status: 'running', rank: 2, seat: 'forge',
    t_ct: new Date(Date.now() - 3 * 60 * 1000).toISOString(), title: 'ship',
  }) + '\n');
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv);
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.notEqual(fleet.seats.forge && fleet.seats.forge.working, true);
    assert.equal(fleet.working.critic, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.cloud.working, true);
    assert.ok(fleet.cloud.open_agents.includes('bc-forge0001'));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a GitHub event newer than the turn end keeps the seat working', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-gh-'));
  lay(data, {
    working: {},
    activity: [
      line('forge', 'start', 4 * 60 * 1000),
      line('forge', 'end', 60 * 1000),
      line('critic', 'start', 4 * 60 * 1000),
      line('critic', 'end', 60 * 1000, 'ack'),
    ],
    events: [
      { id: 'c-forge', t_ct: new Date(Date.now() - 10 * 1000).toISOString(), kind: 'pr_review', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
      { id: 'c-critic', t_ct: new Date(Date.now() - 90 * 1000).toISOString(), kind: 'pr_comment', repo: 'example/repo', number: 8, actor: 'critic0x[bot]' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv);
    assert.ok(fleet, srv.logs());
    assert.ok(fleet.working.forge, JSON.stringify(fleet.working));
    assert.equal(fleet.working.forge.via, 'github');
    assert.equal(fleet.seats.forge.working, true);
    assert.equal(fleet.working.critic, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.critic.working, false);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a turn end clears a mark at the end time and keeps a later mark and a mark with no time', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-end-bound-'));
  const endMs = Date.now() - 60 * 1000;
  const endIso = new Date(endMs).toISOString();
  const laterIso = new Date(endMs + 1000).toISOString();
  const ended = (seat, tag) => ({ id: seat + '.end.bound', seq: 1, seat, t_ct: endIso, kind: 'turn', action: 'end', ...(tag ? { tag } : {}) });
  lay(data, {
    working: {
      forge: { via: 'feed', since_ct: endIso },
      herald: { via: 'feed', since_ct: laterIso },
      critic: { via: 'feed' },
    },
    activity: [
      line('forge', 'start', 4 * 60 * 1000),
      ended('forge'),
      line('herald', 'start', 4 * 60 * 1000),
      ended('herald'),
      line('critic', 'start', 4 * 60 * 1000),
      ended('critic', 'ack'),
    ],
    events: [
      { id: 'c-forge', t_ct: endIso, kind: 'pr_review', repo: 'example/repo', number: 7, actor: 'forge0x1[bot]' },
      { id: 'c-herald', t_ct: laterIso, kind: 'pr_comment', repo: 'example/repo', number: 8, actor: 'herald0x[bot]' },
    ],
  });
  const srv = start(data);
  try {
    const fleet = await fleetOf(srv);
    assert.ok(fleet, srv.logs());
    assert.equal(fleet.working.forge, undefined, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.forge.working, false);
    assert.ok(fleet.working.herald, JSON.stringify(fleet.working));
    assert.equal(fleet.seats.herald.working, true);
    assert.ok(fleet.working.critic, JSON.stringify(fleet.working));
    assert.equal(fleet.working.critic.via, 'feed');
    assert.equal(fleet.working.critic.since_ct, undefined);
    assert.equal(fleet.seats.critic.working, true);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
