// Cloud agents are board rows: bcId, owning seat, linked card, state, last update.
// A webhook ERROR or an activity cancel is failed. Without that fold the assertions below fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureWorkTrack, acceptCursorWebhook, applyCloudOwners, boardCloudAgents, classifyCursor, criticCloudId, deriveTrackFromDir, readJsonl, stampCriticCloud } from '../app/worktrack.mjs';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public', 'index.html');
const SECRET = 'cursor-webhook-secret-test-fixture-32';

configureWorkTrack({ seatIds: ['critic', 'arch1', 'mill', 'forge'] });

test('a PR keeps one critic cloud id and a new head resumes it', () => {
  const card = '0xRayAI/xray#399';
  const agents = [
    { bcId: 'bc-old-critic', seat: 'critic', card, state: 'finished', updated_ct: '2026-10-19T12:00:00Z' },
    { bcId: 'bc-mill-build', seat: 'mill', card, state: 'running', updated_ct: '2026-10-19T13:00:00Z' },
    { bcId: 'bc-live-critic', seat: 'critic', card: '0xrayai/xray#399', state: 'running', updated_ct: '2026-10-19T14:00:00Z' },
    { bcId: 'bc-other-pr', seat: 'critic', card: '0xRayAI/xray#400', state: 'running', updated_ct: '2026-10-19T15:00:00Z' },
  ];
  assert.equal(criticCloudId(card, agents), 'bc-live-critic');
  const [stamped, other] = stampCriticCloud([{ key: card, title: 'wake' }, { key: '0xRayAI/xray#400' }], agents);
  assert.equal(stamped.critic_bc, 'bc-live-critic');
  assert.equal(other.critic_bc, 'bc-other-pr');
  const failedOnly = [{ bcId: 'bc-refused', seat: 'critic', card, state: 'failed', updated_ct: '2026-10-19T16:00:00Z' }];
  assert.equal(criticCloudId(card, failedOnly), 'bc-refused');
  const kept = stampCriticCloud([{ key: card, critic_bc: 'bc-stored' }], []);
  assert.equal(kept[0].critic_bc, 'bc-stored');
});

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sign(secret, body) { return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex'); }

function stopped(child) {
  return new Promise(resolve => {
    if (child.exitCode != null) return resolve();
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, 2000);
  });
}

async function boot(data, extra = {}) {
  const child = spawn(process.execPath, [APP], {
    env: { PATH: process.env.PATH, ...extra, PORT: '0', MESH_DATA_DIR: data, COLLECTOR: 'off', GITHUB_API_URL: 'http://127.0.0.1:9' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const port = await listenPort(child);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/healthz')).status) return { child, base, logs: () => logs }; } catch { /* booting */ }
    await new Promise(r => setTimeout(r, 40));
  }
  child.kill();
  throw new Error('server did not boot: ' + logs.slice(0, 500));
}

test('the page renders cloud agents as board rows', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.match(html, /cloud agents \(/);
  assert.match(html, /owning seat/);
  assert.match(html, /r\.feed\.cloud_agents/);
  assert.match(html, /last update/);
});

test('ERROR is a failed cloud agent, not a finish', () => {
  const classified = classifyCursor({ id: 'bc-fail0001', status: 'ERROR' });
  assert.equal(classified.status, 'failed');
  assert.equal(classified.closed, true);
  assert.equal(classifyCursor({ id: 'bc-ok000001', status: 'FINISHED' }).status, 'finished');
  assert.equal(classifyCursor({ id: 'bc-run00001', status: 'RUNNING' }).status, 'running');
});

test('a running cloud agent makes its owner seat active and the row shows its status', () => {
  const id = 'bc-531f2033-90e0-595f-87de-8dfe576ec69c';
  const rows = boardCloudAgents({
    activity: [
      { kind: 'cloud_agent', action: 'launch', agent: 'bc-531f2033', seat: 'forge', t_ct: '2026-10-20T11:00:00-05:00' },
      { kind: 'cloud_agent', action: 'launch', agent: id, seat: '', t_ct: '2026-10-20T11:32:00-05:00' },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bcId, id);
  assert.equal(rows[0].seat, 'forge');
  assert.equal(rows[0].state, 'running');
  const fleet = {
    seats: {
      critic: { active: true, working: true, working_via: 'github', last_ct: '2026-10-20T11:20:00-05:00', via: 'github' },
      forge: { active: false, working: false, last_ct: '2026-10-20T06:18:00-05:00', via: 'github' },
    },
    working: { critic: { via: 'github', since_ct: '2026-10-20T11:20:00-05:00' } },
    cloud: { active: false, open_agents: [], working: false },
  };
  const next = applyCloudOwners(fleet, rows, Date.parse('2026-10-20T11:40:00-05:00'));
  assert.equal(next.seats.forge.active, true);
  assert.equal(next.seats.forge.working, true);
  assert.equal(next.seats.forge.working_via, 'cloud');
  assert.equal(next.working.forge.via, 'cloud');
  assert.equal(next.working.forge.agent, id);
  assert.equal(next.seats.critic.working_via, 'github');
  assert.equal(next.working.critic.via, 'github');
  assert.equal(next.cloud.active, true);
  assert.ok(next.cloud.open_agents.includes(id));
});

test('a running row with no update for more than 6h is stale and does not light its seat', () => {
  const now = Date.parse('2026-10-20T11:40:00-05:00');
  const old = ['bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f', 'bc-72f1b3b2-a56e-5ce3-9162-76f264e06aea'];
  const rows = boardCloudAgents({
    activity: [
      { kind: 'cloud_agent', action: 'launch', agent: old[0], seat: 'forge', t_ct: '2026-10-18T17:30:55-05:00' },
      { kind: 'cloud_agent', action: 'launch', agent: old[1], seat: 'forge', t_ct: '2026-10-15T04:18:10-05:00' },
      { kind: 'cloud_agent', action: 'launch', agent: 'bc-fresh00001', seat: 'forge', t_ct: '2026-10-20T06:00:00-05:00' },
    ],
    now,
  });
  assert.equal(rows.find(row => row.bcId === 'bc-fresh00001').state, 'running');
  for (const id of old) assert.equal(rows.find(row => row.bcId === id).state, 'stale');
  const fleet = { seats: { forge: { active: false, working: false, via: 'github' } }, working: {}, cloud: { active: false, open_agents: [], working: false } };
  const next = applyCloudOwners(fleet, rows, now);
  assert.equal(next.seats.forge.active, true);
  assert.equal(next.seats.forge.working, true);
  assert.equal(next.working.forge.agent, 'bc-fresh00001');
  const ghosts = applyCloudOwners(fleet, rows.filter(row => row.state === 'stale'), now);
  assert.equal(ghosts.seats.forge.active, false);
  assert.equal(ghosts.seats.forge.working, false);
  assert.equal(ghosts.cloud.active, false);
  assert.deepEqual(ghosts.cloud.open_agents, []);
});

test('a later cancel keeps the seat and linked card and marks the row failed', () => {
  const rows = boardCloudAgents({
    agents: [{
      agent: 'bc-board0001', status: 'running', seat: 'critic',
      pr: 'https://github.com/acme/app/pull/15', t_ct: '2026-10-15T14:00:00Z',
    }],
    activity: [{
      kind: 'cloud_agent', action: 'cancel', agent: 'bc-board0001', seat: 'critic',
      tag: 'acme/app#15', t_ct: '2026-10-15T14:05:00Z',
    }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bcId, 'bc-board0001');
  assert.equal(rows[0].seat, 'critic');
  assert.equal(rows[0].card, 'acme/app#15');
  assert.equal(rows[0].pr, 'https://github.com/acme/app/pull/15');
  assert.equal(rows[0].state, 'failed');
  assert.equal(rows[0].updated_ct, '2026-10-15T14:05:00Z');
});

test('an older finish does not reopen a newer launch, and a launch link fills a missing card', () => {
  const rows = boardCloudAgents({
    activity: [
      { kind: 'cloud_agent', action: 'finished', agent: 'bc-old000001', seat: 'mill', t_ct: '2026-10-15T14:00:00Z' },
      { kind: 'agent', action: 'launch', agent: 'bc-old000001', seat: 'mill', tag: 'acme/app#3', t_ct: '2026-10-15T12:00:00Z' },
    ],
    links: [{ bcId: 'bc-arch00001', card: '0xrayai/xray#320', seat: 'arch1', state: 'running', updated_ct: '2026-10-15T15:01:00Z' }],
    agents: [{ agent: 'bc-arch00001', status: 'running', seat: 'unassigned', t_ct: '2026-10-15T15:00:00Z' }],
    now: Date.parse('2026-10-15T16:00:00Z'),
  });
  const older = rows.find(row => row.bcId === 'bc-old000001');
  const launched = rows.find(row => row.bcId === 'bc-arch00001');
  assert.equal(older.state, 'finished');
  assert.equal(older.card, 'acme/app#3');
  assert.equal(launched.seat, 'arch1');
  assert.equal(launched.card, '0xrayai/xray#320');
  assert.equal(launched.state, 'running');
});

test('a FINISHED webhook stores pr only after safePrUrl', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-board-pr-'));
  const owner40 = 'a' + '-b'.repeat(19) + 'c';
  const bad = 'https://github.com/' + owner40 + '/app/pull/1';
  const good = 'https://github.com/acme/app/pull/15';
  const classified = classifyCursor({ id: 'bc-fin000001', status: 'FINISHED', target: { prUrl: bad } });
  assert.ok(classified, 'FINISHED keeps classifyCursor from returning null');
  assert.equal(classified.pr, '');
  try {
    const refused = acceptCursorWebhook({
      dir,
      raw: Buffer.from(JSON.stringify({ id: 'bc-fin000001', status: 'FINISHED', metadata: { seat: 'critic' }, target: { prUrl: bad }, summary: 'done' })),
      headers: { 'x-webhook-id': 'fin-bad' },
      map: {},
      now: Date.parse('2026-10-15T15:00:00Z'),
    });
    assert.equal(refused.appended, true);
    assert.equal(refused.record.pr, '');
    const kept = acceptCursorWebhook({
      dir,
      raw: Buffer.from(JSON.stringify({ id: 'bc-fin000002', status: 'FINISHED', metadata: { seat: 'critic' }, target: { prUrl: good }, summary: 'done' })),
      headers: { 'x-webhook-id': 'fin-good' },
      map: {},
      now: Date.parse('2026-10-15T15:00:01Z'),
    });
    assert.equal(kept.record.pr, good);
    const view = deriveTrackFromDir(dir, Date.parse('2026-10-15T15:00:00Z'), 3600 * 1000, []);
    const empty = view.items.find(row => row.agent === 'bc-fin000001');
    const shown = view.items.find(row => row.agent === 'bc-fin000002');
    assert.equal(empty.pr, '');
    assert.equal(empty.url, '');
    assert.equal(shown.pr, good);
    assert.equal(shown.url, good);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a webhook ERROR is a failed board row and is not working', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-board-'));
  try {
    const noted = acceptCursorWebhook({
      dir,
      raw: Buffer.from(JSON.stringify({ id: 'bc-err000001', status: 'ERROR', metadata: { seat: 'critic' }, summary: 'boom' })),
      headers: { 'x-webhook-id': 'err-1' },
      map: {},
      now: Date.parse('2026-10-15T15:00:00Z'),
    });
    assert.equal(noted.appended, true);
    const view = deriveTrackFromDir(dir, Date.parse('2026-10-15T15:00:00Z'), 3600 * 1000, []);
    const item = view.items.find(row => row.agent === 'bc-err000001');
    assert.equal(item.label, 'failed');
    assert.equal(item.state, 'failed');
    assert.equal(item.working, false);
    const board = boardCloudAgents({ agents: readJsonl(path.join(dir, 'agents.jsonl')) });
    assert.equal(board.length, 1);
    assert.equal(board[0].bcId, 'bc-err000001');
    assert.equal(board[0].seat, 'critic');
    assert.equal(board[0].state, 'failed');
    assert.ok(board[0].updated_ct);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the live feed lists a running cloud agent, then a cancel as failed', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-board-srv-'));
  const pw = crypto.randomBytes(8).toString('hex');
  const criticKey = 'critic-' + crypto.randomBytes(4).toString('hex');
  const ctx = await boot(data, {
    MESH_PASSWORD: pw,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    CURSOR_WEBHOOK_SECRET: SECRET,
    SEAT_KEYS: JSON.stringify({ critic: sha(criticKey) }),
    SEAT_AGENT_MAP: JSON.stringify({ 'bc-board0001': 'critic' }),
  });
  try {
    const login = await fetch(ctx.base + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=' + encodeURIComponent(pw), redirect: 'manual',
    });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const payload = { id: 'bc-board0001', status: 'RUNNING', metadata: { seat: 'critic' }, target: { prUrl: 'https://github.com/acme/app/pull/15' }, summary: 'board row' };
    const body = Buffer.from(JSON.stringify(payload));
    const hooked = await fetch(ctx.base + '/cursor/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign(SECRET, body), 'X-Webhook-Id': 'run-1' },
      body,
    });
    assert.equal(hooked.status, 200, await hooked.clone().text());
    const feed = async () => {
      const res = await fetch(ctx.base + '/live-events.json', { headers: { Cookie: cookie } });
      assert.equal(res.status, 200);
      return res.json();
    };
    let live = await feed();
    let row = (live.cloud_agents || []).find(item => item.bcId === 'bc-board0001');
    assert.ok(row, 'running agent missing from cloud_agents');
    assert.equal(row.seat, 'critic');
    assert.equal(row.state, 'running');
    assert.equal(row.card, 'acme/app#15');
    assert.equal(live.fleet.seats.critic.active, true);
    assert.equal(live.fleet.seats.critic.working, true);
    assert.equal(live.fleet.seats.critic.working_via, 'cloud');
    assert.ok(live.fleet.cloud.open_agents.includes('bc-board0001'));
    assert.equal(live.fleet.cloud.active, true);
    assert.equal(row.pr, 'https://github.com/acme/app/pull/15');
    assert.ok(row.updated_ct);
    const stamp = new Date(Date.now() + 2000).toISOString();
    const posted = await fetch(ctx.base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + criticKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ t_ct: stamp, kind: 'cloud_agent', action: 'cancel', agent: 'bc-board0001', tag: 'acme/app#15' }),
    });
    assert.equal(posted.status, 202, await posted.clone().text());
    live = await feed();
    row = (live.cloud_agents || []).find(item => item.bcId === 'bc-board0001');
    assert.equal(row.state, 'failed');
    assert.equal(row.seat, 'critic');
    assert.equal(row.card, 'acme/app#15');
    assert.equal(row.updated_ct, stamp);
  } finally {
    await stopped(ctx.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
