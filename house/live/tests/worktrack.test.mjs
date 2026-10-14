// Automatic work tracking: Cursor webhooks, inbox packets, wakes, and blockers.
// State is read back from the volume, including after a process restart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureWorkTrack, acceptCursorWebhook, deriveTrackFromDir, decideAgent, isPacket } from '../app/worktrack.mjs';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const SECRET = 'cursor-webhook-secret-test-fixture-32';

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sign(secret, body) { return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex'); }

// Unit tests configure their own seats; the server tests use the server's roster.
const SEATS = ['builder', 'builder-cloud', 'critic', 'forge', 'blinky', 'mill', 'nibbler'];
configureWorkTrack({ seatIds: SEATS, mirror: { builder: 'builder-cloud' } });

function stopped(child) {
  return new Promise(resolve => {
    if (child.exitCode != null) return resolve();
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, 2000);
  });
}

function line(over = {}) {
  return {
    id: over.id || ('ln-' + crypto.randomBytes(3).toString('hex')),
    t_ct: over.t_ct || new Date().toISOString(),
    seat: over.seat || 'critic',
    type: over.type || 'dispatch',
    repo: over.repo || 'acme/app',
    number: over.number ?? 4,
    title: over.title || 'ship the board',
    url: over.url || 'https://example.com/4',
    reason: over.reason || 'handoff',
    ...over,
  };
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

async function login(base, pw) {
  const res = await fetch(base + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'password=' + encodeURIComponent(pw), redirect: 'manual',
  });
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

async function trackOf(base, cookie) {
  const res = await fetch(base + '/live-events.json', { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
  const body = await res.json();
  return body.track || { items: [], overdue: [], lanes: [] };
}

async function until(fn, ms = 4000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < ms) {
    last = await fn();
    if (last) return last;
    await new Promise(r => setTimeout(r, 40));
  }
  return last;
}

test('isPacket is packet kinds and human blockers, not every from-seat line', () => {
  assert.equal(isPacket({ type: 'comment', from: 'forge', seat: 'critic' }), false);
  assert.equal(isPacket({ type: 'nudge', from: 'forge' }), false);
  for (const type of ['dispatch', 'ready', 'packet', 'critic_fail', 'needs_human']) assert.equal(isPacket({ type }), true, type);
  assert.equal(isPacket({ kind: 'needs_human' }), true);
  assert.equal(isPacket({ type: 'note', to: 'human', flag: 'needs_human' }), true);
});

test('quiet directory raises no overdue; a missed ack past the window is flagged from disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-unit-'));
  const now = Date.parse('2026-10-14T18:00:00Z');
  const quiet = deriveTrackFromDir(dir, now, 60 * 1000, []);
  assert.deepEqual(quiet.overdue, []);
  assert.equal(quiet.items.length, 0);
  fs.mkdirSync(path.join(dir, 'inbox'), { recursive: true });
  const late = line({ id: 'late-1', seat: 'forge', type: 'ready', title: 'missed', t_ct: '2026-10-14T17:00:00Z' });
  const fresh = line({ id: 'fresh-1', seat: 'forge', type: 'ready', title: 'fresh', t_ct: '2026-10-14T17:59:30Z' });
  const nudge = line({ id: 'nudge-old', seat: 'forge', type: 'nudge', title: 'not a packet', t_ct: '2026-10-14T17:00:00Z' });
  fs.writeFileSync(path.join(dir, 'inbox', 'forge.jsonl'), [late, fresh, nudge].map(row => JSON.stringify(row)).join('\n') + '\n');
  const open = deriveTrackFromDir(dir, now, 60 * 1000, []);
  assert.deepEqual(open.overdue, ['late-1']);
  assert.equal(open.items.find(item => item.id === 'late-1').flagged, true);
  assert.equal(open.items.find(item => item.id === 'fresh-1').overdue, false);
  assert.equal(open.items.some(item => item.id === 'nudge-old'), false);
  fs.writeFileSync(path.join(dir, 'acks.json'), JSON.stringify({ forge: ['late-1'] }));
  const acked = deriveTrackFromDir(dir, now, 60 * 1000, []);
  assert.deepEqual(acked.overdue, []);
  assert.equal(acked.items.find(item => item.id === 'late-1').phase, 'acked');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('webhook deliveries dedupe by event id and status rank', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-agent-'));
  const send = (eventId, body) => acceptCursorWebhook({
    dir, raw: Buffer.from(JSON.stringify(body)), headers: { 'x-webhook-id': eventId }, map: { 'bc-mill0001': 'mill' }, now: Date.parse('2026-10-14T18:00:00Z'),
  });
  assert.equal(send('e1', { id: 'bc-order0001', status: 'FINISHED' }).appended, true);
  assert.equal(send('e2', { id: 'bc-order0001', status: 'CREATED' }).action, 'stale');
  assert.equal(send('e1', { id: 'bc-order0001', status: 'FINISHED' }).action, 'duplicate');
  const rows = fs.readFileSync(path.join(dir, 'agents.jsonl'), 'utf8').trim().split('\n');
  assert.equal(rows.length, 1);
  const view = deriveTrackFromDir(dir, Date.parse('2026-10-14T18:00:00Z'), 3600 * 1000, []);
  const cards = view.items.filter(item => item.agent === 'bc-order0001');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].label, 'closed');
  assert.equal(cards[0].working, false);
  assert.equal(decideAgent([{ agent: 'bc-x', status: 'running', rank: 2, event_id: 'a' }], { agent: 'bc-x', status: 'running', rank: 2, event_id: 'b' }), 'duplicate');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('bad signature is rejected; replays and out-of-order deliveries do not duplicate cards', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-hook-'));
  const pw = crypto.randomBytes(8).toString('hex');
  const ctx = await boot(data, {
    MESH_PASSWORD: pw,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    CURSOR_WEBHOOK_SECRET: SECRET,
    SEAT_AGENT_MAP: JSON.stringify({ 'bc-mill0001': 'mill', 'bc-nib*': 'nibbler' }),
  });
  const file = path.join(data, 'live', 'agents.jsonl');
  try {
    const cookie = await login(ctx.base, pw);
    const badBody = Buffer.from(JSON.stringify({ id: 'bc-bad00001', status: 'RUNNING' }));
    const bad = await fetch(ctx.base + '/cursor/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign('wrong-secret-wrong-secret-wrong-32', badBody), 'X-Webhook-Id': 'bad-1' },
      body: badBody,
    });
    assert.equal(bad.status, 401);
    assert.equal(fs.existsSync(file), false);
    const post = async (id, payload, eventId) => {
      const body = Buffer.from(JSON.stringify(payload));
      const res = await fetch(ctx.base + '/cursor/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign(SECRET, body), 'X-Webhook-Id': eventId },
        body,
      });
      assert.equal(res.status, 200, await res.clone().text());
    };
    await post('bc-order0001', { id: 'bc-order0001', status: 'FINISHED', summary: 'done first' }, 'ord-fin');
    await post('bc-order0001', { id: 'bc-order0001', status: 'CREATED' }, 'ord-create');
    await post('bc-order0001', { id: 'bc-order0001', status: 'FINISHED', summary: 'done first' }, 'ord-fin');
    let lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    let view = await trackOf(ctx.base, cookie);
    let card = view.items.filter(item => item.agent === 'bc-order0001');
    assert.equal(card.length, 1);
    assert.equal(card[0].label, 'closed');
    assert.equal(card[0].lane, 'unassigned');
    assert.equal(card[0].working, false);

    const pr = 'https://github.com/acme/app/pull/15';
    await post('bc-critic0001', { id: 'bc-critic0001', status: 'CREATED', metadata: { seat: 'CRITIC' }, summary: 'review the diff' }, 'cr-1');
    await post('bc-critic0001', { id: 'bc-critic0001', status: 'RUNNING', metadata: { launching_seat: 'critic' } }, 'cr-2');
    await post('bc-critic0001', { id: 'bc-critic0001', status: 'PR_OPENED', target: { prUrl: pr }, summary: 'review the diff' }, 'cr-3');
    await post('bc-critic0001', { id: 'bc-critic0001', status: 'RUNNING', target: { prUrl: pr } }, 'cr-4');
    view = await trackOf(ctx.base, cookie);
    card = view.items.filter(item => item.agent === 'bc-critic0001');
    assert.equal(card.length, 1);
    assert.equal(card[0].label, 'working');
    assert.equal(card[0].lane, 'critic');
    assert.equal(card[0].pr, pr);
    assert.equal(card[0].working, true);
    const live = await (await fetch(ctx.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.equal(live.fleet.seats.critic.working, true);

    await post('bc-critic0001', { id: 'bc-critic0001', status: 'FINISHED', metadata: { seat: 'critic' }, target: { prUrl: pr }, summary: 'review the diff' }, 'cr-5');
    view = await trackOf(ctx.base, cookie);
    card = view.items.filter(item => item.agent === 'bc-critic0001');
    assert.equal(card.length, 1);
    assert.equal(card[0].label, 'closed');
    assert.equal(card[0].pr, pr);
    assert.equal(card[0].working, false);

    await post('bc-mill0001', { id: 'bc-mill0001', status: 'RUNNING', summary: 'mapped' }, 'ch-1');
    await post('bc-nib0001', { id: 'bc-nib0001', status: 'CREATED', summary: 'prefix' }, 'lab-1');
    view = await trackOf(ctx.base, cookie);
    assert.equal(view.items.find(item => item.agent === 'bc-mill0001').lane, 'mill');
    assert.equal(view.items.find(item => item.agent === 'bc-nib0001').lane, 'nibbler');
    lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const before = lines.length;
    await post('bc-mill0001', { id: 'bc-mill0001', status: 'RUNNING', summary: 'mapped' }, 'ch-1');
    lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(lines.length, before);
    assert.equal(JSON.parse(lines[0]).agent, 'bc-order0001');
    assert.equal(view.items.filter(item => item.kind === 'agent').length, (await trackOf(ctx.base, cookie)).items.filter(item => item.kind === 'agent').length);
  } finally {
    await stopped(ctx.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('packets move sent to acked for sender and recipient; blockers sit in the human lane', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-pkt-'));
  const pw = crypto.randomBytes(8).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const criticKey = 'critic-' + crypto.randomBytes(4).toString('hex');
  const opKey = 'op-' + crypto.randomBytes(4).toString('hex');
  const cosKey = 'blinky-' + crypto.randomBytes(4).toString('hex');
  const hook = http.createServer((req, res) => { res.writeHead(204); res.end(); });
  await new Promise(r => hook.listen(0, '127.0.0.1', r));
  const hookUrl = `http://127.0.0.1:${hook.address().port}/wake`;
  const seats = ['critic', 'forge', 'blinky'];
  const ctx = await boot(data, {
    MESH_PASSWORD: pw,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: ingest,
    SEAT_KEYS: JSON.stringify({ critic: sha(criticKey), forge: sha(opKey), blinky: sha(cosKey) }),
    SEAT_WEBHOOKS: JSON.stringify(Object.fromEntries(seats.map(seat => [seat, { url: hookUrl, key_env: 'WAKE_KEY' }]))),
    WAKE_KEY: 'wake-test-key',
    WAKE_DEBOUNCE_S: '0',
    WAKE_COALESCE_MS: '20',
    WAKE_RETRY_MS: '20',
    NUDGE_L1_S: '30',
  });
  try {
    const cookie = await login(ctx.base, pw);
    const quiet = await trackOf(ctx.base, cookie);
    assert.deepEqual(quiet.overdue, []);
    assert.equal(quiet.items.length, 0);
    const post = async rows => {
      const res = await fetch(ctx.base + '/inbox', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Live-Ingest': ingest },
        body: JSON.stringify({ lines: rows }),
      });
      assert.equal(res.status, 200, await res.clone().text());
    };
    const old = new Date(Date.now() - 120000).toISOString();
    await post([
      line({ id: 'pkt-1', seat: 'critic', from: 'forge', title: 'ship the board' }),
      line({ id: 'late-1', seat: 'forge', type: 'ready', title: 'missed', t_ct: old, number: 5 }),
      line({ id: 'fresh-1', seat: 'forge', type: 'dispatch', from: 'critic', title: 'fresh', number: 6 }),
      line({ id: 'nudge-old', seat: 'forge', type: 'nudge', title: 'not a packet', t_ct: old, number: 0 }),
      line({ id: 'blk-to', seat: 'blinky', from: 'forge', to: 'human', title: 'ask human', number: 7 }),
      line({ id: 'blk-flag', seat: 'blinky', from: 'forge', type: 'dispatch', flag: 'needs_human', title: 'flagged human', number: 8 }),
      line({ id: 'blk-kind', seat: 'blinky', type: 'needs_human', title: 'kind human', number: 9 }),
      line({ id: 'blk-closed', seat: 'blinky', to: 'human', title: 'already closed', number: 10, repo: 'acme/app' }),
    ]);
    const opened = await until(async () => {
      const view = await trackOf(ctx.base, cookie);
      const pkt = view.items.find(item => item.id === 'pkt-1');
      return pkt && pkt.phase === 'woken' ? view : null;
    });
    assert.ok(opened, 'wake did not persist');
    const pkt = opened.items.find(item => item.id === 'pkt-1');
    assert.deepEqual(pkt.steps, ['sent', 'delivered', 'woken']);
    assert.equal(pkt.label.includes('working on ship the board'), true);
    assert.deepEqual(pkt.seats.slice().sort(), ['critic', 'forge']);
    assert.deepEqual(pkt.lanes.slice().sort(), ['critic', 'forge']);
    const live = await (await fetch(ctx.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.equal(live.fleet.seats.critic.working, true);
    assert.equal(live.fleet.seats.critic.working_on, 'working on ship the board');
    assert.equal(opened.overdue.includes('late-1'), true);
    assert.equal(opened.items.find(item => item.id === 'fresh-1').overdue, false);
    assert.equal(opened.items.some(item => item.id === 'nudge-old'), false);
    for (const id of ['blk-to', 'blk-flag', 'blk-kind', 'blk-closed']) {
      assert.deepEqual(opened.items.find(item => item.id === id).lanes, ['Waiting on a human']);
    }
    const ack = async (seat, key, id) => {
      const res = await fetch(ctx.base + '/inbox/' + seat + '/ack', {
        method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      assert.equal(res.status, 200, await res.clone().text());
    };
    await ack('critic', criticKey, 'pkt-1');
    await ack('forge', opKey, 'late-1');
    await ack('blinky', cosKey, 'blk-to');
    let view = await trackOf(ctx.base, cookie);
    const done = view.items.find(item => item.id === 'pkt-1');
    assert.equal(done.phase, 'acked');
    assert.deepEqual(done.steps, ['sent', 'delivered', 'woken', 'acked']);
    assert.equal(done.working, false);
    assert.equal(view.overdue.includes('late-1'), false);
    assert.equal(view.items.find(item => item.id === 'blk-to').lanes.includes('Waiting on a human'), false);
    assert.equal(view.items.find(item => item.id === 'blk-flag').lanes[0], 'Waiting on a human');
    const inboxFile = path.join(data, 'live', 'inbox', 'critic.jsonl');
    const wakeFile = path.join(data, 'live', 'wakes.jsonl');
    const inboxLines = fs.readFileSync(inboxFile, 'utf8').trim().split('\n').length;
    const wakeLines = fs.readFileSync(wakeFile, 'utf8').trim().split('\n').length;
    assert.ok(wakeLines >= 1);
    const ingested = await fetch(ctx.base + '/ingest', {
      method: 'POST', headers: { Authorization: 'Bearer ' + ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 't', generated_at: new Date().toISOString(), event_count: 0, events: [],
        board: { updated_ct: new Date().toISOString(), cards: [{
          key: 'acme/app#10', kind: 'issue', repo: 'acme/app', number: 10, title: 'already closed', url: 'https://example.com/10',
          owner: 'blinky', state: 'closed', stage: 'done', packet: { goal: 'x' }, packet_ok: false, missing: [],
          beats: [{ t: Date.now(), what: 'closed', url: '', id: 'b10' }], last_beat_t: Date.now(),
        }] },
      }),
    });
    assert.equal(ingested.status, 200);
    view = await trackOf(ctx.base, cookie);
    assert.equal(view.items.find(item => item.id === 'blk-closed').lanes.includes('Waiting on a human'), false);
    assert.equal(fs.readFileSync(inboxFile, 'utf8').trim().split('\n').length, inboxLines);
    assert.ok(fs.readFileSync(wakeFile, 'utf8').trim().split('\n').length >= wakeLines);
  } finally {
    await stopped(ctx.child);
    hook.closeAllConnections(); hook.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a wake fired before restart is still working on the packet after boot', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-restart-'));
  const pw = crypto.randomBytes(8).toString('hex');
  const session = crypto.randomBytes(32).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const criticKey = 'critic-' + crypto.randomBytes(4).toString('hex');
  const hook = http.createServer((req, res) => { res.writeHead(204); res.end(); });
  await new Promise(r => hook.listen(0, '127.0.0.1', r));
  const hookUrl = `http://127.0.0.1:${hook.address().port}/wake`;
  const common = {
    MESH_PASSWORD: pw, SESSION_SECRET: session, INGEST_SECRET: ingest,
    SEAT_KEYS: JSON.stringify({ critic: sha(criticKey) }),
    NUDGE_L1_S: '3600',
  };
  const first = await boot(data, {
    ...common,
    SEAT_WEBHOOKS: JSON.stringify({ critic: { url: hookUrl, key_env: 'WAKE_KEY' } }),
    WAKE_KEY: 'wake-test-key', WAKE_DEBOUNCE_S: '0', WAKE_COALESCE_MS: '20', WAKE_RETRY_MS: '20',
  });
  const wakeFile = path.join(data, 'live', 'wakes.jsonl');
  try {
    const posted = await fetch(first.base + '/inbox', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Live-Ingest': ingest },
      body: JSON.stringify({ lines: [line({ id: 'wake-1', seat: 'critic', from: 'forge', title: 'hold this' })] }),
    });
    assert.equal(posted.status, 200);
    const fired = await until(async () => fs.existsSync(wakeFile) && fs.readFileSync(wakeFile, 'utf8').includes('wake-1'));
    assert.equal(fired, true);
    const cookie = await login(first.base, pw);
    const before = await until(async () => {
      const view = await trackOf(first.base, cookie);
      const item = view.items.find(row => row.id === 'wake-1');
      return item && item.phase === 'woken' ? item : null;
    });
    assert.equal(before.working, true);
    assert.equal(before.label.includes('working on hold this'), true);
  } finally {
    await stopped(first.child);
  }
  const linesBefore = fs.readFileSync(wakeFile, 'utf8').trim().split('\n');
  // same webhook config, no key: boot must not re-send, and the last wake status comes back from wakes.jsonl
  const second = await boot(data, { ...common, SEAT_WEBHOOKS: JSON.stringify({ critic: { url: hookUrl, key_env: 'WAKE_KEY' } }) });
  try {
    const cookie = await login(second.base, pw);
    const view = await trackOf(second.base, cookie);
    const item = view.items.find(row => row.id === 'wake-1');
    assert.ok(item);
    assert.equal(item.phase, 'woken');
    assert.equal(item.working, true);
    assert.equal(item.label.includes('working on hold this'), true);
    assert.deepEqual(item.steps, ['sent', 'delivered', 'woken']);
    const live = await (await fetch(second.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.equal(live.fleet.seats.critic.working, true);
    assert.equal(live.fleet.seats.critic.working_on, 'working on hold this');
    assert.ok(live.wakes.critic && live.wakes.critic.last_ok, 'last good wake survives the restart');
    const hz = await (await fetch(second.base + '/healthz')).json();
    assert.equal(hz.wakes.critic, 'ok');
    assert.equal(fs.readFileSync(wakeFile, 'utf8').trim().split('\n').length, linesBefore.length);
    assert.equal(JSON.parse(linesBefore[0]).id, 'wake-1');
  } finally {
    await stopped(second.child);
    hook.closeAllConnections(); hook.close();
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a pr_comment by critic0x[bot] marks critic working on that PR', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-track-gh-'));
  const pw = crypto.randomBytes(8).toString('hex');
  const ingest = crypto.randomBytes(32).toString('hex');
  const ctx = await boot(data, {
    MESH_PASSWORD: pw,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    INGEST_SECRET: ingest,
  });
  try {
    const cookie = await login(ctx.base, pw);
    const posted = await fetch(ctx.base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 't', generated_at: new Date().toISOString(), event_count: 1,
        events: [{
          id: 'acme/app#5:comment:1', t_ct: new Date().toISOString(), kind: 'pr_comment',
          from: 'critic', to: 'GitHub', actor: 'critic0x[bot]', repo: 'acme/app', number: 5,
          label: 'critic0x comment', src_file: 'github-api',
        }],
      }),
    });
    assert.equal(posted.status, 200, await posted.clone().text());
    const live = await (await fetch(ctx.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.ok(live.fleet.working.critic, 'critic missing from fleet.working');
    assert.equal(live.fleet.working.critic.working_on, 'acme/app#5');
    assert.equal(live.fleet.seats.critic.working_on, 'acme/app#5');
  } finally {
    await stopped(ctx.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
