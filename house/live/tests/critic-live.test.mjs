// Critic live pass: Chicago clocks, burst-live off the feed JSON, closed work chips, idle cloud.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

async function boot(data) {
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', LIVE_PUBLIC: '1', COLLECTOR: 'on', SERVER_ROUTING: 'off',
      LIVE_NODE_MAP: '{"sound0x[bot]":"sound"}',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  let base = null;
  for (let i = 0; i < 50; i++) {
    const m = /listening on :(\d+)/.exec(logs);
    if (m) { base = `http://127.0.0.1:${m[1]}`; break; }
    if (child.exitCode != null) break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!base) { child.kill(); throw new Error(logs); }
  return { child, base, logs: () => logs };
}

async function stop(child) {
  if (child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

function writeFeed(data, feed) {
  const dir = path.join(data, 'feed');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'github-events.json');
  fs.writeFileSync(dest + '.tmp', JSON.stringify(feed));
  fs.renameSync(dest + '.tmp', dest);
}

async function liveOf(base) {
  let live = null;
  for (let i = 0; i < 40; i++) {
    live = await (await fetch(base + '/live-events.json')).json();
    if (live.fleet && live.fleet.seats) break;
    await new Promise(r => setTimeout(r, 50));
  }
  return live;
}

function clockEnds(node, bad, prefix) {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if ((k === 'as_of' || k.endsWith('_ct') || k === 'cards_at') && typeof v === 'string') {
      if (v.endsWith('Z')) bad.push(prefix + k + '=' + v);
    } else if (v && typeof v === 'object') clockEnds(v, bad, prefix + k + '.');
  }
}

test('fleet.as_of, seat and cloud clocks, and freshness are America/Chicago', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-ct-'));
  const z = '2026-10-14T20:21:03.000Z';
  const ct = '2026-10-14T15:21:03.000-05:00';
  writeFeed(data, {
    generated_at: z,
    product_nodes: ['Bifrost'],
    services: ['GitHub'],
    fleet: {
      as_of: z, window_min: 15, total: 1, active: 1,
      seats: { forge: { active: true, last_ct: z, via: 'github' } },
      cloud: { active: false, open_agents: [], last_ct: z, github_last_ct: z },
    },
    events: [{ id: 'm1', t_ct: z, kind: 'merged', repo: '0xRayAI/xray', number: 1, from: 'forge', actor: 'forge0x1[bot]' }],
  });
  const srv = await boot(data);
  try {
    const live = await liveOf(srv.base);
    assert.equal(live.fleet.seats.forge.last_ct, ct);
    assert.equal(live.fleet.cloud.last_ct, ct);
    assert.equal(live.fleet.cloud.github_last_ct, ct);
    assert.equal(live.freshness.github_latest_ct, ct);
    assert.equal(live.freshness.github_card_latest_ct, ct);
    assert.match(live.fleet.as_of, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-05:00$/);
    if (live.freshness.cards_at) assert.match(live.freshness.cards_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-0[56]:00$/);
    const bad = [];
    clockEnds(live.fleet, bad, 'fleet.');
    clockEnds(live.freshness, bad, 'freshness.');
    assert.deepEqual(bad, []);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('feed JSON drops burst-live from product_nodes and services', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-board-'));
  const z = new Date().toISOString();
  writeFeed(data, {
    generated_at: z,
    product_nodes: ['Bifrost', 'burst-live'],
    services: ['GitHub', 'burst-live'],
    fleet: { window_min: 15, seats: { forge: { active: false, last_ct: z } }, cloud: { open_agents: [], active: false } },
    events: [{ id: 'e1', t_ct: z, kind: 'pr_comment', repo: '0xRayAI/xray', number: 1, from: 'forge', actor: 'forge0x1[bot]', label: 'note' }],
  });
  const srv = await boot(data);
  try {
    const live = await liveOf(srv.base);
    assert.deepEqual(live.product_nodes, ['Bifrost', 'CloudAgents']);
    assert.deepEqual(live.services, ['GitHub']);
    assert.equal(JSON.stringify(live.product_nodes).includes('burst-live'), false);
    assert.equal(JSON.stringify(live.services).includes('burst-live'), false);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a merge with no actor still lights the seat when from is the seat', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-merge-'));
  const now = new Date().toISOString();
  writeFeed(data, {
    generated_at: now,
    product_nodes: ['Bifrost'],
    fleet: { window_min: 15, seats: { arch1: { active: false, working: false, last_ct: now } }, cloud: { open_agents: [], active: false } },
    events: [{ id: 'm698', t_ct: now, kind: 'merged', repo: '0xRayAI/xray', number: 698, from: 'arch1', label: 'merged' }],
  });
  const srv = await boot(data);
  try {
    let live = null;
    for (let i = 0; i < 40; i++) {
      live = await (await fetch(srv.base + '/live-events.json')).json();
      if (live.fleet && live.fleet.seats && live.fleet.seats.arch1 && live.fleet.seats.arch1.working) break;
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(live.fleet.seats.arch1.working, true);
    assert.equal(live.fleet.working.arch1.via, 'github');
    assert.equal(live.fleet.seats.arch1.working_on, undefined);
    assert.equal(live.fleet.working.arch1.working_on, undefined);
    assert.equal(live.fleet.cloud.working, false);
    assert.ok(live.product_nodes.includes('CloudAgents'));
    assert.equal(live.product_nodes.includes('burst-live'), false);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('an issue close, a PR close, and a merge clear working_on; an open item stays', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-work-'));
  const now = new Date().toISOString();
  writeFeed(data, {
    generated_at: now,
    fleet: { window_min: 15, seats: {}, cloud: { open_agents: [], active: false } },
    events: [
      { id: 'c340', t_ct: now, kind: 'issue_comment', repo: '0xRayAI/xray', number: 340, from: 'forge', actor: 'forge0x1[bot]', label: 'forge note' },
      { id: 'x340', t_ct: now, kind: 'issue_close', repo: '0xRayAI/xray', number: 340, from: 'forge', actor: 'forge0x1[bot]', label: 'closed #340' },
      { id: 'c341', t_ct: now, kind: 'pr_comment', repo: '0xRayAI/xray', number: 341, from: 'critic', actor: 'critic0x[bot]', label: 'critic note' },
      { id: 'm341', t_ct: now, kind: 'merged', repo: '0xRayAI/xray', number: 341, from: 'critic', actor: 'critic0x[bot]', label: 'merged #341' },
      { id: 'c7', t_ct: now, kind: 'pr_comment', repo: 'example/repo', number: 7, from: 'sound', actor: 'sound0x[bot]', label: 'sound note' },
      { id: 'x7', t_ct: now, kind: 'pr_close', repo: 'example/repo', number: 7, from: 'sound', actor: 'sound0x[bot]', label: 'closed #7' },
      { id: 'c8', t_ct: now, kind: 'pr_comment', repo: 'example/repo', number: 8, from: 'herald', actor: 'herald0x[bot]', label: 'herald note' },
    ],
  });
  const srv = await boot(data);
  try {
    let live = null;
    for (let i = 0; i < 40; i++) {
      live = await (await fetch(srv.base + '/live-events.json')).json();
      const herald = live.fleet && live.fleet.seats && live.fleet.seats.herald;
      if (herald && herald.working_on === 'example/repo#8') break;
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(live.fleet.seats.forge.working_on, undefined);
    assert.equal(live.fleet.working.forge && live.fleet.working.forge.working_on, undefined);
    assert.equal(live.fleet.seats.critic.working_on, undefined);
    assert.equal(live.fleet.working.critic && live.fleet.working.critic.working_on, undefined);
    assert.equal(live.fleet.seats.sound.working_on, undefined);
    assert.equal(live.fleet.working.sound && live.fleet.working.sound.working_on, undefined);
    assert.equal(live.fleet.seats.herald.working_on, 'example/repo#8');
    assert.equal(live.fleet.working.herald.working_on, 'example/repo#8');
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('fleet.cloud.active is false when open_agents is empty and true when one is open', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-cloud-'));
  const z = new Date().toISOString();
  writeFeed(data, {
    generated_at: z,
    fleet: {
      window_min: 15,
      seats: { forge: { active: true, last_ct: z, via: 'github' } },
      cloud: { active: true, open_agents: [], last_ct: z, github_last_ct: z },
    },
    events: [{ id: 'e1', t_ct: z, kind: 'pr_comment', repo: '0xRayAI/xray', number: 1, from: 'forge', actor: 'forge0x1[bot]', label: 'note' }],
  });
  const idle = await boot(data);
  try {
    const live = await liveOf(idle.base);
    assert.deepEqual(live.fleet.cloud.open_agents, []);
    assert.equal(live.fleet.cloud.active, false);
  } finally {
    await stop(idle.child);
  }
  const data2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-cloud-'));
  writeFeed(data2, {
    generated_at: z,
    fleet: {
      window_min: 15,
      seats: { forge: { active: true, last_ct: z, via: 'github' } },
      cloud: { active: false, open_agents: ['bc-abcdef'], last_ct: '2020-01-01T00:00:00.000Z', github_last_ct: null },
    },
    events: [{ id: 'e1', t_ct: z, kind: 'pr_comment', repo: '0xRayAI/xray', number: 1, from: 'forge', actor: 'forge0x1[bot]', label: 'note' }],
  });
  const busy = await boot(data2);
  try {
    const live = await liveOf(busy.base);
    assert.deepEqual(live.fleet.cloud.open_agents, ['bc-abcdef']);
    assert.equal(live.fleet.cloud.active, true);
  } finally {
    await stop(busy.child);
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(data2, { recursive: true, force: true });
  }
});

test('a CI event leaves cards_behind false and a card-worthy event advances cards_at', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-clock-'));
  const card = { key: '0xRayAI/xray#6', repo: '0xRayAI/xray', number: 6, title: 'clock', state: 'live', stage: 'review', kind: 'pr', owner: 'forge', head: '1111111111111111111111111111111111111111' };
  const opened = new Date(Date.now() - 21 * 60 * 1000).toISOString();
  const ci = new Date(Date.now() - 60 * 1000).toISOString();
  const fleet = { window_min: 15, seats: {}, cloud: { open_agents: [], active: false } };
  writeFeed(data, {
    generated_at: ci,
    fleet,
    events: [
      { id: 'open6', t_ct: opened, kind: 'pr_open', repo: '0xRayAI/xray', number: 6, from: 'forge', actor: 'forge0x1[bot]' },
      { id: 'ci-mill', t_ct: ci, kind: 'check_run', conclusion: 'success', repo: '0xRayAI/xray', sha: '635859a88e187554848815811b0b21f63e7a8081', label: 'mill-ci-report' },
    ],
    board: { updated_ct: new Date().toISOString(), cards: [card] },
  });
  const srv = await boot(data);
  try {
    let health = null;
    let first = null;
    for (let i = 0; i < 40; i++) {
      health = await (await fetch(srv.base + '/healthz')).json();
      const live = await (await fetch(srv.base + '/live-events.json')).json();
      if (typeof health.data_age === 'number' && live.freshness && live.freshness.cards_at) {
        first = live.freshness.cards_at;
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(health.cards_behind, false, JSON.stringify(health) + srv.logs());
    const worthy = new Date().toISOString();
    const openedCard = { key: '0xRayAI/xray#8', repo: '0xRayAI/xray', number: 8, title: 'opened', state: 'live', stage: 'review', kind: 'pr', owner: 'forge' };
    writeFeed(data, {
      generated_at: worthy,
      fleet,
      events: [
        { id: 'open6', t_ct: opened, kind: 'pr_open', repo: '0xRayAI/xray', number: 6, from: 'forge', actor: 'forge0x1[bot]' },
        { id: 'ci-mill', t_ct: ci, kind: 'check_run', conclusion: 'success', repo: '0xRayAI/xray', sha: '635859a88e187554848815811b0b21f63e7a8081', label: 'mill-ci-report' },
        { id: 'open8', t_ct: worthy, kind: 'pr_open', repo: '0xRayAI/xray', number: 8, from: 'forge', actor: 'forge0x1[bot]' },
      ],
      board: { updated_ct: worthy, cards: [card, openedCard] },
    });
    let second = null;
    for (let i = 0; i < 30; i++) {
      const live = await (await fetch(srv.base + '/live-events.json')).json();
      const at = live.freshness && live.freshness.cards_at;
      if (at && Date.parse(at) > Date.parse(first)) { second = at; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(Date.parse(second) > Date.parse(first), srv.logs() + ' first=' + first + ' second=' + second);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
