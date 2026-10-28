// Freshness light, card history, and the open queue. Example repos only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initArchive, appendArchive, appendTransition, cardHistory } from '../app/archive.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const html = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');

test('freshness stays green when a non-card event is newer than the cards', () => {
  const L = { SOURCES: [], AGENTS: [], SEAT_NAMES: [], SATS: {}, COLOR: {}, LABEL: {}, SUB: {}, GLYPH: {}, SQUARE: {},
    EDGES: [], BOT_IMAGES: [], KIND_WORD: {}, applyFeed: (st, feed) => ({ state: { events: feed.events } }) };
  new Function('window', 'location', fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8'))({ LiveMesh: L }, { search: '' });
  const now = Date.parse('2026-10-13T15:00:00-05:00');
  const min = 60000;
  const comment = L.freshTone(now - min, now - 10 * min, now - 10 * min, now);
  assert.equal(comment.tone, 'green');
  assert.equal(comment.line, 'Last activity 1 min ago');
  const quiet = L.freshTone(now - 5 * min, now - 70 * min, now - 70 * min, now);
  assert.equal(quiet.tone, 'green');
  assert.equal(quiet.line, 'Last activity 5 min ago');
  const behind = L.freshTone(now - min, now - 70 * min, now - min, now);
  assert.equal(behind.tone, 'red');
  assert.equal(behind.line, 'Cards last changed 1 h ago');
  const building = L.freshTone(now - min, 0, 0, now);
  assert.equal(building.tone, 'amber');
  assert.equal(building.line, 'Cards still building');
  assert.match(html, /L\.freshTone\(light\.dataAt, light\.cardsAt, light\.moveAt, now\)/);
  assert.match(html, /github_card_latest_ct/);
  assert.match(html, /No recent changes/);
  const cfg = fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8');
  assert.match(cfg, /var state = L\.statusId\(c\.state\)/);
  assert.match(cfg, /if \(state === 'parked'\) return 'parked'/);
  assert.doesNotMatch(html, /dataAt > cardsAt/);
});

test('card history keeps a later state and drops a row with no key', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-hist-'));
  initArchive(data);
  const open = { key: 'example/repo#1', state: 'live', stage: 'review', owner: 'builder', title: 'One', t_ct: '2026-05-12T15:00:00Z', updated_ct: '2026-05-12T15:00:00Z', repo: 'example/repo', number: 1 };
  const parked = { key: 'example/repo#2', state: 'parked', stage: 'review', owner: 'builder', title: 'Held aside', t_ct: '2026-05-13T15:00:00Z', updated_ct: '2026-05-13T15:00:00Z', repo: 'example/repo', number: 2 };
  assert.equal(appendArchive('cards', open), true);
  assert.equal(appendArchive('cards', { ...open, state: 'closed', stage: 'done', updated_ct: '2026-05-20T15:00:00Z', t_ct: '2026-05-20T15:00:00Z' }), true);
  assert.equal(appendArchive('cards', parked), true);
  assert.equal(appendArchive('cards', { state: 'live', title: 'missing key' }), false);
  const hist = cardHistory();
  const by = Object.fromEntries(hist.cards.map(c => [c.id, c]));
  assert.equal(by['example/repo#1'].state, 'closed');
  assert.equal(by['example/repo#1'].opened_ct, '2026-05-12T15:00:00Z');
  assert.ok(by['example/repo#1'].closed_ct);
  assert.equal(by['example/repo#2'].state, 'parked');
  assert.equal(by['example/repo#2'].closed_ct, '');
  assert.ok(hist.cards.every(c => c.id));
  fs.rmSync(data, { recursive: true, force: true });
});

test('card history takes verb from the last merged row when no beat names a merge', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-verb-'));
  initArchive(data);
  const open = { key: 'example/repo#485', state: 'live', stage: 'open', owner: 'forge', title: 'Packet', repo: 'example/repo', number: 485, t_ct: '2026-10-20T12:00:00Z', updated_ct: '2026-10-20T12:00:00Z' };
  assert.equal(appendArchive('cards', open), true);
  assert.equal(appendArchive('cards', { ...open, state: 'closed', stage: 'done', verb: 'merged', t_ct: '2026-10-20T18:00:00Z', updated_ct: '2026-10-20T18:00:00Z' }), true);
  const merged = cardHistory().cards.find(c => c.id === 'example/repo#485');
  assert.equal(merged.state, 'closed');
  assert.equal(merged.verb, 'merged');
  assert.equal(appendArchive('cards', { ...open, state: 'live', stage: 'open', t_ct: '2026-10-21T12:00:00Z', updated_ct: '2026-10-21T12:00:00Z' }), true);
  const reopened = cardHistory().cards.find(c => c.id === 'example/repo#485');
  assert.equal(reopened.state, 'live');
  assert.equal(reopened.verb, 'live');
  fs.rmSync(data, { recursive: true, force: true });
});

test('an older card row with no updated_ct fills it from last_beat_t', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-stamp-'));
  initArchive(data);
  const beat = Date.parse('2026-10-12T18:00:00Z');
  assert.equal(appendArchive('cards', { key: 'example/repo#9', state: 'live', stage: 'review', owner: 'mill', title: 'Old row', repo: 'example/repo', number: 9, last_beat_t: beat }), true);
  const aged = cardHistory();
  assert.equal(aged.cards.find(c => c.id === 'example/repo#9').updated_ct, new Date(beat).toISOString());
  fs.rmSync(data, { recursive: true, force: true });
});

function start(data, extra) {
  const port = 22000 + Math.floor(Math.random() * 20000);
  const ingest = crypto.randomBytes(32).toString('hex');
  const password = 'pw-' + crypto.randomBytes(4).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: String(port), MESH_PASSWORD: password,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ingest,
      PATH: process.env.PATH, MESH_DATA_DIR: data, COLLECTOR: 'on', ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const base = `http://127.0.0.1:${port}`;
  return { child, base, ingest, password, logs: () => logs };
}

async function ready(base, logs) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(base + '/healthz');
      if (res.status === 200 || res.status === 503) return;
    } catch { /* not up */ }
    await new Promise(r => setTimeout(r, 80));
  }
  throw new Error('healthz did not come up\n' + logs());
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

test('a CI push after a merge does not move the card clock; the queue does not delete the inbox', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-ci-'));
  const now = Date.now();
  const opened = new Date(now - 70 * 60 * 1000).toISOString();
  const mergedAt = new Date(now - 40 * 60 * 1000).toISOString();
  const onHead = new Date(now - 20 * 60 * 1000).toISOString();
  const onNumber = new Date(now - 10 * 60 * 1000).toISOString();
  const mergeCi = new Date(now - 60 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    board: { cards: [
      { key: 'example/repo#7', repo: 'example/repo', number: 7, kind: 'pr', state: 'live', title: 'Open', head: 'deadbee', owner: 'builder', stage: 'review', last_beat_t: now - 40 * 60 * 1000 },
      { key: 'example/repo#8', repo: 'example/repo', number: 8, kind: 'pr', state: 'closed', title: 'Merged', head: 'c10sed1', owner: 'builder', stage: 'done' },
    ] },
    events: [
      { id: 'gh-open', t_ct: opened, kind: 'pr_open', repo: 'example/repo', number: 7, title: 'Open', from: 'builder', sha: 'deadbee0123456789abcdef' },
      { id: 'gh-merged', t_ct: mergedAt, kind: 'merged', repo: 'example/repo', number: 7, title: 'Open', from: 'builder', sha: 'abc9999deadbeef000000000' },
      { id: 'gh-head', t_ct: onHead, kind: 'check_run', conclusion: 'success', repo: 'example/repo', sha: 'deadbee0123456789abcdef', from: 'GitHub' },
      { id: 'gh-num', t_ct: onNumber, kind: 'ci_pass', conclusion: 'success', repo: 'example/repo', number: 7, from: 'GitHub' },
      { id: 'gh-merge', t_ct: mergeCi, kind: 'check_run', conclusion: 'success', repo: 'example/repo', sha: 'abc9999deadbeef000000000', from: 'GitHub' },
    ],
  }));
  const srv = start(data);
  try {
    await ready(srv.base, srv.logs);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const live = await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.equal(Date.parse(live.freshness.github_latest_ct), Date.parse(mergeCi));
    assert.equal(Date.parse(live.freshness.github_card_latest_ct), Date.parse(mergedAt));
    const line = { id: 'line-1', t_ct: new Date().toISOString(), seat: 'forge', type: 'pr', repo: 'example/repo', number: 9, title: 'Needs a look', url: 'https://github.com/example/repo/pull/9', reason: 'review' };
    const posted = await fetch(srv.base + '/inbox', { method: 'POST', headers: { 'X-Live-Ingest': srv.ingest, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [line] }) });
    assert.equal(posted.status, 200, await posted.text());
    const again = await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.ok(again.queue.some(l => l.id === 'line-1' && l.seat === 'forge'));
    const file = path.join(data, 'live', 'inbox', 'forge.jsonl');
    assert.ok(fs.readFileSync(file, 'utf8').includes('line-1'));
    const cards = await (await fetch(srv.base + '/history/cards', { headers: { Cookie: cookie } })).json();
    assert.ok(cards.cards.some(c => c.id === 'example/repo#7' && c.state === 'closed' && c.verb === 'merged' && c.closed_ct));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a merge on a closed card advances the card clock; a later check does not', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-clock-'));
  const openAt = '2026-10-14T07:24:57-05:00';
  const mergedAt = '2026-10-14T12:42:25-05:00';
  const ciAt = '2026-10-14T12:47:15-05:00';
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: ciAt,
    board: { cards: [
      { key: 'example/repo#310', repo: 'example/repo', number: 310, kind: 'issue', state: 'live', title: 'Open', owner: 'critic', stage: 'open' },
      { key: 'example/repo#317', repo: 'example/repo', number: 317, kind: 'pr', state: 'closed', title: 'Merged', owner: 'forge', stage: 'done' },
    ] },
    events: [
      { id: 'open-310', t_ct: openAt, kind: 'issue_open', repo: 'example/repo', number: 310, from: 'critic' },
      { id: 'merge-317', t_ct: mergedAt, kind: 'merged', repo: 'example/repo', number: 317, from: 'forge' },
      { id: 'ci-317', t_ct: ciAt, kind: 'check_run', conclusion: 'success', repo: 'example/repo', number: 317, from: 'GitHub' },
    ],
  }));
  const srv = start(data, { SERVER_ROUTING: 'off' });
  try {
    await ready(srv.base, srv.logs);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const live = await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json();
    assert.equal(Date.parse(live.freshness.github_latest_ct), Date.parse(ciAt));
    assert.equal(Date.parse(live.freshness.github_card_latest_ct), Date.parse(mergedAt));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a saved wake is last_ok after restart; a seat that never woke stays null', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-wake-'));
  const iso = '2026-10-14T17:40:00.000Z';
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'wake-ok.json'), JSON.stringify({ forge: iso, sound: iso }));
  const srv = start(data, {
    COLLECTOR: 'off', SERVER_ROUTING: 'off',
    SEAT_WEBHOOKS: JSON.stringify({
      forge: { url: 'http://127.0.0.1:9/forge' },
      sound: { url: 'http://127.0.0.1:9/sound' },
      critic: { url: 'http://127.0.0.1:9/critic' },
    }),
  });
  try {
    await ready(srv.base, srv.logs);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const w = (await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json()).wakes;
    assert.equal(w.forge.last_ok, iso);
    assert.equal(w.sound.last_ok, iso);
    assert.equal(w.critic.last_ok, null);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('the open queue hides parked seats and arch10x lines from a previous Chicago day', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-queue-'));
  const now = Date.now();
  const day = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  let old = now - 26 * 3600 * 1000;
  if (day(old) >= day(now)) old = now - 48 * 3600 * 1000;
  const srv = start(data, { COLLECTOR: 'off', SERVER_ROUTING: 'off' });
  try {
    await ready(srv.base, srv.logs);
    const lines = [
      { id: 'parked-herald', t_ct: new Date(now).toISOString(), seat: 'herald', type: 'issue', repo: 'example/repo', number: 1, title: 'verify herald', url: 'https://github.com/example/repo/issues/1', reason: 'parked' },
      { id: 'arch-old', t_ct: new Date(old).toISOString(), seat: 'critic', type: 'issue_comment', repo: 'example/repo', number: 269, title: 'arch10x[bot] comment on 269', url: 'https://github.com/example/repo/issues/269', reason: 'comment' },
      { id: 'arch-today', t_ct: new Date(now - 60000).toISOString(), seat: 'critic', type: 'issue_comment', repo: 'example/repo', number: 310, title: 'arch10x[bot] comment today', url: 'https://github.com/example/repo/issues/310', reason: 'comment' },
      { id: 'forge-live', t_ct: new Date(now - 30000).toISOString(), seat: 'forge', type: 'pr', repo: 'example/repo', number: 9, title: 'Needs a look', url: 'https://github.com/example/repo/pull/9', reason: 'review' },
    ];
    const posted = await fetch(srv.base + '/inbox', { method: 'POST', headers: { 'X-Live-Ingest': srv.ingest, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
    assert.equal(posted.status, 200, await posted.text());
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const queue = (await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json()).queue;
    const ids = queue.map(l => l.id);
    assert.ok(ids.includes('arch-today'));
    assert.ok(ids.includes('forge-live'));
    assert.ok(!ids.includes('parked-herald'));
    assert.ok(!ids.includes('arch-old'));
    assert.ok(fs.readFileSync(path.join(data, 'live', 'inbox', 'herald.jsonl'), 'utf8').includes('parked-herald'));
    assert.ok(fs.readFileSync(path.join(data, 'live', 'inbox', 'critic.jsonl'), 'utf8').includes('arch-old'));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('openLines skips a parked seat until the roster reloads, and an owner prompt unmutes it', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-open-lines-'));
  const roster = path.join(data, 'roster.json');
  const writeRoster = (parked) => fs.writeFileSync(roster, JSON.stringify({ seats: ['forge', 'herald', 'blinky'], parked, dark: [] }));
  writeRoster(['herald']);
  const heraldKey = 'hk-' + crypto.randomBytes(8).toString('hex');
  const forgeKey = 'fk-' + crypto.randomBytes(8).toString('hex');
  const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const srv = start(data, {
    COLLECTOR: 'off', SERVER_ROUTING: 'off', BIFROST_ROSTER: roster, BIFROST_CLOCK_SEATS: 'forge',
    SEAT_KEYS: JSON.stringify({ herald: hash(heraldKey), forge: hash(forgeKey) }),
  });
  try {
    await ready(srv.base, srv.logs);
    const now = new Date().toISOString();
    const posted = await fetch(srv.base + '/inbox', { method: 'POST', headers: { 'X-Live-Ingest': srv.ingest, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [
      { id: 'parked-herald', t_ct: now, seat: 'herald', type: 'issue', repo: 'example/repo', number: 1, title: 'verify herald', url: 'https://github.com/example/repo/issues/1', reason: 'parked' },
    ] }) });
    assert.equal(posted.status, 200, await posted.text());
    const own = await fetch(srv.base + '/inbox/herald', { headers: { Authorization: 'Bearer ' + heraldKey } });
    assert.equal(own.status, 200);
    assert.deepEqual((await own.json()).lines.map(l => l.id), ['parked-herald']);
    assert.ok(fs.readFileSync(path.join(data, 'live', 'inbox', 'herald.jsonl'), 'utf8').includes('parked-herald'));
    const clockFor = async () => {
      const res = await fetch(srv.base + '/clock', { method: 'POST', headers: { Authorization: 'Bearer ' + forgeKey } });
      return res.json();
    };
    assert.equal((await clockFor()).started, false);
    writeRoster([]);
    const reloaded = await clockFor();
    assert.equal(reloaded.started, true, 'a roster rewrite is visible without a restart');
    assert.deepEqual(Object.keys(reloaded.clock.deadlines), ['herald']);
    writeRoster(['herald']);
    assert.equal((await clockFor()).started, false);
    const prompt = await fetch(srv.base + '/activity', { method: 'POST', headers: { Authorization: 'Bearer ' + heraldKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ t_ct: new Date().toISOString(), seat: 'herald', kind: 'prompt', action: 'sent', from: 'blaze', to: 'herald' }) });
    assert.equal(prompt.status, 202, await prompt.text());
    const unmuted = await clockFor();
    assert.equal(unmuted.started, true);
    assert.deepEqual(Object.keys(unmuted.clock.deadlines), ['herald']);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a persisted mill ack today marks mill active over a 10/13 github last_ct', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-mill-'));
  const touch = Date.now();
  const tCt = new Date(touch).toISOString();
  const day = tCt.slice(0, 10);
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.mkdirSync(path.join(data, 'archive', day), { recursive: true });
  fs.writeFileSync(path.join(data, 'archive', day, 'acks.jsonl'), JSON.stringify({ id: 'mill:line-1', seat: 'mill', line: 'line-1', t_ct: tCt }) + '\n');
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    event_count: 1,
    fleet: { window_min: 15, total: 4, active: 0, seats: { mill: { active: false, last_ct: '2026-10-13T14:32:10-05:00', via: 'github' } } },
    board: { cards: [] },
    events: [{ id: 'e1', t_ct: new Date().toISOString(), kind: 'issue_open', repo: 'example/repo', number: 1, from: 'forge' }],
  }));
  const srv = start(data, { SERVER_ROUTING: 'off' });
  try {
    await ready(srv.base, srv.logs);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const mill = (await (await fetch(srv.base + '/live-events.json', { headers: { Cookie: cookie } })).json()).fleet.seats.mill;
    assert.equal(mill.active, true);
    assert.equal(mill.via, 'inbox');
    assert.equal(Date.parse(mill.last_ct), touch);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

function archiveCardRows(data) {
  const root = path.join(data, 'archive');
  const rows = [];
  if (!fs.existsSync(root)) return rows;
  const files = [path.join(root, 'cards.jsonl')];
  for (const day of fs.readdirSync(root)) {
    const file = path.join(root, day, 'cards.jsonl');
    if (fs.existsSync(file)) files.push(file);
  }
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      rows.push(JSON.parse(line));
    }
  }
  return rows;
}

test('a display drop and a merged packet stay in history, and a restart does not prune them', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-keep-'));
  const now = Date.now();
  const ghostAt = new Date(now - 2 * 3600 * 1000).toISOString();
  const mergedAt = new Date(now - 30 * 3600 * 1000).toISOString();
  const stamp = '2026-10-21T05:00:00.000Z';
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: ghostAt,
    cards: [{
      key: 'example/repo#485', born: 'packet', kind: 'packet', repo: 'example/repo', number: 485,
      title: 'Packet 485', state: 'live', stage: 'open', owner: 'forge', updated_ct: ghostAt, last_beat_t: now - 2 * 3600 * 1000,
    }],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: stamp,
    board: {
      updated_ct: stamp,
      cards: [{
        key: 'example/repo#1', repo: 'example/repo', number: 1, kind: 'issue', state: 'live', stage: 'open',
        title: 'Open issue', owner: 'forge', last_beat_t: now - 60 * 1000,
      }],
      settled: [{
        key: 'example/repo#493', repo: 'example/repo', number: 493, kind: 'pr', state: 'closed', stage: 'done',
        verb: 'merged', title: 'Merged 493', owner: 'forge', updated_ct: mergedAt, last_beat_t: now - 30 * 3600 * 1000,
      }],
    },
    events: [
      { id: 'open-1', t_ct: new Date(now - 60 * 1000).toISOString(), kind: 'issue_open', repo: 'example/repo', number: 1, from: 'forge', title: 'Open issue' },
      { id: 'merge-485', t_ct: new Date(now - 3 * 3600 * 1000).toISOString(), kind: 'merged', repo: 'example/repo', number: 485, from: 'forge', title: 'Packet 485' },
      { id: 'merge-493', t_ct: mergedAt, kind: 'merged', repo: 'example/repo', number: 493, from: 'forge', merged_by: 'forge', title: 'Merged 493' },
    ],
  }));
  async function session() {
    const srv = start(data, { SERVER_ROUTING: 'off' });
    await ready(srv.base, srv.logs);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    return { srv, cookie };
  }
  const first = await session();
  try {
    let hist;
    let live;
    for (let i = 0; i < 25; i++) {
      hist = await (await fetch(first.srv.base + '/history/cards', { headers: { Cookie: first.cookie } })).json();
      live = await (await fetch(first.srv.base + '/live-events.json', { headers: { Cookie: first.cookie } })).json();
      const by = Object.fromEntries((hist.cards || []).map(c => [c.id, c]));
      if (by['example/repo#485'] && by['example/repo#485'].verb === 'merged' && by['example/repo#493'] && by['example/repo#493'].verb === 'merged') break;
      await new Promise(r => setTimeout(r, 80));
    }
    const by = Object.fromEntries(hist.cards.map(c => [c.id, c]));
    assert.equal(by['example/repo#485'].state, 'closed', first.srv.logs());
    assert.equal(by['example/repo#485'].verb, 'merged');
    assert.equal(by['example/repo#493'].state, 'closed');
    assert.equal(by['example/repo#493'].verb, 'merged');
    const shown = (live.board && live.board.cards) || [];
    assert.equal(shown.some(c => c.number === 485 && c.state === 'live'), false);
    assert.equal(shown.some(c => c.number === 485), false);
    const kept = archiveCardRows(data).map(row => row.id);
    assert.ok(kept.some(id => String(id).startsWith('example/repo#485|') && String(id).includes('|closed|')));
    assert.ok(kept.some(id => String(id).startsWith('example/repo#493|') && String(id).includes('|closed|')));
    await stop(first.srv.child);
    const second = await session();
    try {
      const again = await (await fetch(second.srv.base + '/history/cards', { headers: { Cookie: second.cookie } })).json();
      const after = Object.fromEntries(again.cards.map(c => [c.id, c]));
      assert.equal(after['example/repo#485'].state, 'closed');
      assert.equal(after['example/repo#485'].verb, 'merged');
      assert.equal(after['example/repo#493'].verb, 'merged');
      const still = new Set(archiveCardRows(data).map(row => row.id));
      for (const id of kept) assert.equal(still.has(id), true, id);
      assert.ok(still.size <= kept.length + 6, 'restart added ' + (still.size - kept.length) + ' card rows');
      assert.ok(still.size < 40, 'card archive grew to ' + still.size);
      const listed = await (await fetch(second.srv.base + '/history/transitions?card=example/repo%23485', { headers: { Cookie: second.cookie } })).json();
      assert.ok(listed.transitions.some(row => row.transition === 'merged' && row.card === 'example/repo#485'));
    } finally {
      await stop(second.srv.child);
    }
  } finally {
    if (first.srv.child.exitCode == null) await stop(first.srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('transition pages do not repeat an id, and export rejects a bad date', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'board-page-'));
  initArchive(data);
  assert.equal(appendArchive('cards', {
    key: 'example/repo#8', state: 'live', stage: 'review', title: 'Still live',
    repo: 'example/repo', number: 8, t_ct: '2026-10-21T04:00:00Z', updated_ct: '2026-10-21T04:00:00Z',
  }), true);
  assert.equal(appendTransition({
    card: 'example/repo#8', transition: 'opened', source_id: 'open-8', t_ct: '2026-10-20T12:00:00-05:00',
    to_state: 'live', to_stage: 'review', actor: { seat: 'forge', login: 'forge', bc: '' }, packet: 'Still live',
  }), true);
  assert.equal(appendTransition({
    card: 'example/repo#8', transition: 'merged', source_id: 'merge-8', t_ct: '2026-10-20T19:00:00-05:00',
    to_state: 'closed', to_stage: 'done', actor: { seat: 'forge', login: 'forge', bc: 'bc-abc' }, packet: 'Still live',
  }), true);
  const srv = start(data, { SERVER_ROUTING: 'off', ARCHIVE_KEY: 'archive-key' });
  try {
    await ready(srv.base, srv.logs);
    const bare = await fetch(srv.base + '/history/transitions');
    assert.equal(bare.status, 401);
    const locked = await fetch(srv.base + '/archive?date=2026-10-20&kind=events');
    assert.equal(locked.status, 401);
    const login = await fetch(srv.base + '/login', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'password=' + encodeURIComponent(srv.password) });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const bad = await fetch(srv.base + '/history/export?date=2026-02-31', { headers: { Cookie: cookie } });
    assert.equal(bad.status, 400);
    const first = await (await fetch(srv.base + '/history/transitions?limit=1', { headers: { Cookie: cookie } })).json();
    assert.equal(first.transitions.length, 1);
    const second = await (await fetch(srv.base + '/history/transitions?limit=1&cursor=' + encodeURIComponent(first.transitions[0].id), { headers: { Cookie: cookie } })).json();
    assert.equal(second.transitions.length, 1);
    assert.notEqual(second.transitions[0].id, first.transitions[0].id);
    const cards = await (await fetch(srv.base + '/history/cards?state=merged', { headers: { Cookie: cookie } })).json();
    const card = cards.cards.find(row => row.id === 'example/repo#8');
    assert.equal(card.verb, 'merged');
    assert.equal(card.closed_ct, '2026-10-20T19:00:00-05:00');
    const exported = await (await fetch(srv.base + '/history/export?date=2026-10-20', { headers: { Cookie: cookie } })).text();
    assert.ok(exported.includes('example/repo#8|merged|merge-8'));
    assert.ok(exported.includes('2026-10-20T19:00:00-05:00'));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
});
