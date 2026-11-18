// A cloud turn (tag bc-…) is the agent. It does not mark the seat that posted it, or any other seat.
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

function lay(data, { activity, agents }) {
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'activity.jsonl'), activity.map(l => JSON.stringify(l)).join('\n') + '\n');
  if (agents) fs.writeFileSync(path.join(data, 'live', 'agents.jsonl'), agents.map(l => JSON.stringify(l)).join('\n') + '\n');
  const ago = new Date(Date.now() - 60 * 1000).toISOString();
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    fleet: {
      window_min: 15,
      seats: {
        forge: { active: true, last_ct: ago, via: 'turn', working: true, working_via: 'turn' },
        critic: { active: true, last_ct: ago, via: 'turn', working: true, working_via: 'turn' },
      },
      working: {
        forge: { via: 'turn', since_ct: ago },
        critic: { via: 'turn', since_ct: ago },
      },
      cloud: { open_agents: [], active: false, working: false },
    },
    events: [
      { id: 'ci', t_ct: ago, kind: 'check_run', conclusion: 'success', repo: 'example/repo', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
  }));
}

function line(seat, action, agoMs, tag) {
  const row = { id: seat + '.' + action + '.' + agoMs + '.' + (tag || ''), seq: 1, seat, t_ct: new Date(Date.now() - agoMs).toISOString(), kind: 'turn', action };
  if (tag) row.tag = tag;
  return row;
}

function seatWorking(fleet, seat) {
  return !!(fleet && fleet.working && fleet.working[seat]) || !!(fleet && fleet.seats && fleet.seats[seat] && fleet.seats[seat].working);
}

async function liveOf(srv, ready) {
  let live = null;
  for (let i = 0; i < 40; i++) {
    const base = srv.baseOf();
    if (base) {
      live = await (await fetch(base + '/live-events.json')).json();
      if (live && live.fleet && ready(live)) break;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return live;
}

test('a cloud turn start with no seat turn marks the agent, and the seats stay idle', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-cloud-turn-'));
  lay(data, {
    activity: [line('forge', 'start', 60 * 1000, 'bc-9748f0dc reviewer')],
  });
  const srv = start(data);
  try {
    const live = await liveOf(srv, row => (row.fleet.cloud.open_agents || []).includes('bc-9748f0dc'));
    assert.ok(live, srv.logs());
    const fleet = live.fleet;
    assert.equal(seatWorking(fleet, 'forge'), false, JSON.stringify(fleet.working));
    assert.equal(seatWorking(fleet, 'critic'), false, JSON.stringify(fleet.working));
    assert.equal(fleet.cloud.working, true);
    assert.ok(fleet.cloud.open_agents.includes('bc-9748f0dc'));
    const agent = (live.cloud_agents || []).find(row => row && String(row.bcId).startsWith('bc-9748f0dc'));
    assert.ok(agent, JSON.stringify(live.cloud_agents));
    assert.equal(agent.state, 'running');
    assert.equal(agent.seat, '');
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('the seat own turn marks that seat, and the cloud agent stays on its own id', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-seat-turn-'));
  lay(data, {
    activity: [
      line('forge', 'start', 90 * 1000, 'bc-9748f0dc track'),
      line('forge', 'start', 30 * 1000),
    ],
  });
  const srv = start(data);
  try {
    const live = await liveOf(srv, row => row.fleet.working && row.fleet.working.forge && (row.fleet.cloud.open_agents || []).includes('bc-9748f0dc'));
    assert.ok(live, srv.logs());
    const fleet = live.fleet;
    assert.equal(seatWorking(fleet, 'forge'), true, JSON.stringify(fleet.working));
    assert.equal(fleet.working.forge.via, 'turn');
    assert.equal(seatWorking(fleet, 'critic'), false, JSON.stringify(fleet.working));
    assert.equal(fleet.cloud.working, true);
    assert.ok(fleet.cloud.open_agents.includes('bc-9748f0dc'));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a cloud turn end does not clear the seat own turn', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-cloud-end-'));
  lay(data, {
    activity: [
      line('forge', 'start', 3 * 60 * 1000),
      line('forge', 'start', 2 * 60 * 1000, 'bc-9748f0dc track'),
      line('forge', 'end', 60 * 1000, 'bc-9748f0dc'),
    ],
  });
  const srv = start(data);
  try {
    const live = await liveOf(srv, row => row.fleet.working && row.fleet.working.forge && !row.fleet.working.critic);
    assert.ok(live, srv.logs());
    const fleet = live.fleet;
    assert.equal(seatWorking(fleet, 'forge'), true, JSON.stringify(fleet.working));
    assert.equal(seatWorking(fleet, 'critic'), false, JSON.stringify(fleet.working));
    assert.equal((fleet.cloud.open_agents || []).includes('bc-9748f0dc'), false, JSON.stringify(fleet.cloud));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a reviewer-seated running agent does not mark critic', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-reviewer-agent-'));
  const id = 'bc-review0001';
  lay(data, {
    activity: [line('forge', 'start', 60 * 1000, 'bc-9748f0dc track')],
    agents: [{
      event_id: 'ag-review', agent: id, status: 'running', rank: 2, seat: 'reviewer',
      t_ct: new Date(Date.now() - 30 * 1000).toISOString(), title: 'review',
    }],
  });
  const srv = start(data);
  try {
    const live = await liveOf(srv, row => (row.fleet.cloud.open_agents || []).includes(id));
    assert.ok(live, srv.logs());
    const fleet = live.fleet;
    assert.equal(seatWorking(fleet, 'critic'), false, JSON.stringify({ working: fleet.working, critic: fleet.seats && fleet.seats.critic }));
    assert.equal(seatWorking(fleet, 'forge'), false, JSON.stringify(fleet.working));
    assert.equal(fleet.cloud.working, true);
    const agent = (live.cloud_agents || []).find(row => row && row.bcId === id);
    assert.ok(agent, JSON.stringify(live.cloud_agents));
    assert.equal(agent.state, 'running');
    assert.equal(agent.seat, 'critic');
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
