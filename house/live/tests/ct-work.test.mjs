// fleet last_ct and freshness *_ct use America/Chicago offset (#336). A close or merge clears working_on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

async function boot(data, ingest) {
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', LIVE_PUBLIC: '1', COLLECTOR: 'on', SERVER_ROUTING: 'off',
      LIVE_NODE_MAP: '{"mill0x[bot]":"mill"}',
      PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: ingest,
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

test('fleet last_ct and freshness clocks are America/Chicago, not UTC Z', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-ct-'));
  const z = '2026-10-14T20:21:03.000Z';
  const ct = '2026-10-14T15:21:03.000-05:00';
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: z,
    fleet: {
      window_min: 15, total: 1, active: 1,
      seats: { forge: { active: true, last_ct: z, via: 'github' } },
      cloud: { last_ct: z, github_last_ct: z },
    },
    board: { cards: [{ key: '0xRayAI/xray#341', repo: '0xRayAI/xray', number: 341, kind: 'pr', state: 'closed', title: 'Port', owner: 'forge', stage: 'done' }] },
    events: [{ id: 'm341', t_ct: z, kind: 'merged', repo: '0xRayAI/xray', number: 341, from: 'forge', actor: 'forge0x1[bot]' }],
  }));
  const ingest = crypto.randomBytes(32).toString('hex');
  const srv = await boot(data, ingest);
  try {
    let live = null;
    for (let i = 0; i < 40; i++) {
      live = await (await fetch(srv.base + '/live-events.json')).json();
      if (live.fleet && live.fleet.seats && live.fleet.seats.forge) break;
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(live.fleet.seats.forge.last_ct, ct);
    assert.equal(live.fleet.cloud.last_ct, ct);
    assert.equal(live.fleet.cloud.github_last_ct, ct);
    assert.equal(live.freshness.github_latest_ct, ct);
    assert.equal(live.freshness.github_card_latest_ct, ct);
    assert.match(live.freshness.cards_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-0[56]:00$/);
    for (const stamp of [live.fleet.seats.forge.last_ct, live.fleet.cloud.last_ct, live.fleet.cloud.github_last_ct, live.freshness.github_latest_ct, live.freshness.github_card_latest_ct, live.freshness.cards_at]) {
      assert.equal(stamp.endsWith('Z'), false, stamp);
    }
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a close or merge clears that seat working_on and leaves a different open item', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-workon-'));
  const now = new Date().toISOString();
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: now,
    events: [
      { id: 'c341', t_ct: now, kind: 'pr_comment', repo: '0xRayAI/xray', number: 341, from: 'forge', actor: 'forge0x1[bot]', label: 'forge note' },
      { id: 'c7', t_ct: now, kind: 'issue_comment', repo: 'example/repo', number: 7, from: 'critic', actor: 'critic0x[bot]', label: 'critic note' },
      { id: 'c8', t_ct: now, kind: 'pr_comment', repo: 'example/repo', number: 8, from: 'mill', actor: 'mill0x[bot]', label: 'mill note' },
    ],
  }));
  const ingest = crypto.randomBytes(32).toString('hex');
  const srv = await boot(data, ingest);
  try {
    let live = null;
    for (let i = 0; i < 40; i++) {
      live = await (await fetch(srv.base + '/live-events.json')).json();
      const forge = live.fleet && live.fleet.seats && live.fleet.seats.forge;
      const critic = live.fleet && live.fleet.seats && live.fleet.seats.critic;
      const mill = live.fleet && live.fleet.seats && live.fleet.seats.mill;
      if (forge && forge.working_on === '0xRayAI/xray#341' && critic && critic.working_on === 'example/repo#7' && mill && mill.working_on === 'example/repo#8') break;
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(live.fleet.seats.forge.working_on, '0xRayAI/xray#341');
    assert.equal(live.fleet.working.forge.working_on, '0xRayAI/xray#341');
    assert.equal(live.fleet.seats.critic.working_on, 'example/repo#7');
    assert.equal(live.fleet.seats.mill.working_on, 'example/repo#8');
    const posted = await fetch(srv.base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generated_at: new Date().toISOString(),
        events: [
          { id: 'm341', t_ct: new Date().toISOString(), kind: 'merged', repo: '0xRayAI/xray', number: 341, from: 'forge' },
          { id: 'x7', t_ct: new Date().toISOString(), kind: 'issue_close', repo: 'example/repo', number: 7, from: 'critic' },
        ],
      }),
    });
    assert.equal(posted.status, 200, await posted.text());
    live = await (await fetch(srv.base + '/live-events.json')).json();
    assert.equal(live.fleet.seats.forge.working_on, undefined);
    assert.equal(live.fleet.working.forge.working_on, undefined);
    assert.equal(live.fleet.seats.critic.working_on, undefined);
    assert.equal(live.fleet.working.critic.working_on, undefined);
    assert.equal(live.fleet.seats.mill.working_on, 'example/repo#8');
    assert.equal(live.fleet.working.mill.working_on, 'example/repo#8');
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
