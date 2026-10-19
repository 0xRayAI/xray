import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createClock, wakeTitle } from '../app/governor.mjs';
import { listenPort } from './free-port.mjs';
import { loadSeedFile, refuseLiveApply } from '../tools/load-wave-seed.mjs';
import { PLAN_FLAG, PLAN_TITLE, cardClosed, cardsFromSeed, liveWorkCount, postedCards, resolveWaveSeed, scheduleWaves } from '../app/wave-schedule.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'app');
const SEED = path.join(APP, 'bifrost-waves.json');
const TEMPLATE = path.join(HERE, '..', '..', '..', 'grok-bot', 'templates', 'house', 'bifrost-waves.json');
const TOOL = path.join(HERE, '..', 'tools', 'load-wave-seed.mjs');
const seed = loadSeedFile(SEED);

function close(cards, wave) {
  return cards.map((card) => (card.wave === wave ? { ...card, state: 'closed', stage: 'done' } : card));
}

test('the seed is W1 through W5 and synthetic cards are closed', () => {
  const cards = cardsFromSeed(seed, { now: 1_000, coord: 'blinky' });
  assert.deepEqual(cards.map((card) => [card.wave, card.title]), [
    ['W1', 're-wear close'],
    ['W2', '#389 ponder/reflections'],
    ['W3', '#386 boot-read hook'],
    ['W4', 'the 7 pre-existing npm test failures'],
    ['W5', 'the synthesize and syncopate lexicon entry'],
  ]);
  assert.equal(cards.find((card) => card.wave === 'W2').key, '0xrayai/xray#389');
  assert.equal(cards.find((card) => card.wave === 'W4').number, 397);
  assert.equal(cards.find((card) => card.wave === 'W1').kind, 'wave');
  assert.equal(cards.find((card) => card.wave === 'W1').state, 'closed');
  assert.equal(cards.find((card) => card.wave === 'W5').state, 'closed');
  assert.deepEqual(postedCards(seed, { now: 1_000 }).map((card) => card.wave), ['W2']);
});

test('a house template seed has no fleet issues', () => {
  const starter = loadSeedFile(TEMPLATE);
  assert.deepEqual(starter.waves, []);
  assert.equal(JSON.stringify(starter).includes('0xRayAI/xray'), false);
});

test('the server reads house/bifrost-waves.json and the image bundles a copy', () => {
  const house = path.join(APP, '..', '..', '..', 'house', 'bifrost-waves.json');
  assert.equal(resolveWaveSeed(APP, {}, () => false), path.join(APP, 'bifrost-waves.json'));
  assert.equal(resolveWaveSeed(APP, {}, (file) => file === house), house);
  assert.equal(resolveWaveSeed(APP, { BIFROST_WAVE_SEED: '/tmp/seed.json' }, () => false), '/tmp/seed.json');
  const dock = fs.readFileSync(path.join(APP, 'Dockerfile'), 'utf8');
  const dep = fs.readFileSync(path.join(APP, 'deploy.sh'), 'utf8');
  for (const file of ['wave-schedule.mjs', 'bifrost-waves.json']) {
    assert.equal(dock.includes(file), true, file);
    assert.equal(dep.includes(file), true, file);
  }
  assert.equal(fs.existsSync(path.join(APP, 'bifrost-waves.json')), true);
});

test('a closed wave raises one plan next wave card naming only the next wave', () => {
  const open = postedCards(seed, { now: 5_000, coord: 'blinky' });
  assert.equal(scheduleWaves(open, seed, { now: 5_000, coord: 'blinky', window: '* * * * *' }).cards.some((card) => card.title === PLAN_TITLE), false);
  const closed = close(open, 'W2');
  const first = scheduleWaves(closed, seed, { now: 5_000, coord: 'blinky', window: '* * * * *' });
  const plans = first.cards.filter((card) => card.title === PLAN_TITLE);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].owner, 'blinky');
  assert.deepEqual(plans[0].backlog.map((item) => item.wave), ['W3']);
  assert.match(plans[0].packet.constraints, /W3 #386 boot-read hook/);
  assert.equal(plans[0].packet.path, 'house/bifrost-waves.json');
  assert.equal(first.cards.some((card) => card.wave === 'W4'), false);
  const again = scheduleWaves(first.cards, seed, { now: 6_000, coord: 'blinky', prior: first.cards, window: '* * * * *', nudgeMs: 1 });
  assert.equal(again.cards.filter((card) => card.title === PLAN_TITLE).length, 1);
  assert.equal(again.planDue, false);
  const kept = again.cards.find((card) => card.kind === 'plan');
  assert.equal(kept.due_at, plans[0].due_at);
  assert.equal(kept.last_beat_t, 6_000);
  const withNext = first.cards.concat(cardsFromSeed(seed, { now: 1 }).filter((card) => card.wave === 'W3').map((card) => ({ ...card, state: 'closed' })));
  const moved = scheduleWaves(withNext, seed, { now: 7_000, coord: 'blinky', prior: first.cards, window: '* * * * *' });
  assert.deepEqual(moved.cards.find((card) => card.kind === 'plan').backlog.map((item) => item.wave), ['W4']);
  assert.equal(moved.cards.find((card) => card.kind === 'plan').due_at, plans[0].due_at);
});

test('a merged card closes its wave, and the plan names only the next wave', () => {
  const cards = cardsFromSeed(seed, { now: 1, coord: 'blinky' }).map((card) => {
    if (card.wave === 'W2') return { ...card, state: 'live', beats: [{ what: 'merged' }] };
    if (card.wave === 'W4') return { ...card, state: 'closed' };
    return card;
  });
  assert.equal(cardClosed(cards.find((card) => card.wave === 'W2')), true);
  const scheduled = scheduleWaves(cards, seed, { now: 1, coord: 'blinky', window: '* * * * *' });
  assert.deepEqual(scheduled.cards.find((card) => card.kind === 'plan').backlog.map((item) => item.wave), ['W3']);
  assert.equal(scheduled.cards.some((card) => card.wave === 'W5' && card.state === 'live'), false);
});

test('the Chicago cron flags the plan card, a restart keeps the due time, and weekly burn stays quiet', () => {
  const raisedAt = Date.parse('2026-10-19T15:00:30Z');
  const closed = close(postedCards(seed, { now: raisedAt, coord: 'blinky' }), 'W2');
  const raised = scheduleWaves(closed, seed, { now: raisedAt, coord: 'blinky', window: '* * * * *' });
  const plan = raised.cards.find((card) => card.kind === 'plan');
  assert.equal(plan.flag, '');
  assert.equal(raised.planDue, false);
  const due = Number(plan.due_at);
  assert.ok(due > raisedAt);
  const early = scheduleWaves(raised.cards, seed, { now: due - 1, coord: 'blinky', prior: raised.cards, window: '* * * * *' });
  assert.equal(early.planDue, false);
  assert.equal(early.cards.find((card) => card.kind === 'plan').due_at, plan.due_at);
  const flagged = scheduleWaves(raised.cards, seed, { now: due, coord: 'blinky', prior: raised.cards, window: '* * * * *' });
  assert.equal(flagged.cards.find((card) => card.kind === 'plan').flag, PLAN_FLAG);
  assert.equal(flagged.planDue, true);
  const quiet = scheduleWaves(raised.cards, seed, { now: due, coord: 'blinky', prior: raised.cards, window: '* * * * *', weeklyBurn: 0.75 });
  assert.equal(quiet.planDue, false);
  assert.equal(quiet.cards.find((card) => card.kind === 'plan').flag, '');
  const clock = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  clock.observe('fp', 0, { openCards: 1, openSeats: ['forge'], coord: 'blinky', planDue: true });
  assert.equal(clock.observe('fp', 1_000, { openCards: 1, openSeats: ['forge'], coord: 'blinky', planDue: true }), 'stall');
  assert.deepEqual(Object.keys(clock.run.deadlines).sort(), ['blinky', 'forge']);
  assert.equal(wakeTitle(clock.run, 'blinky', 1), 'plan next wave');
  assert.equal(wakeTitle(clock.run, 'forge', 1), 'timed run: 1 open line(s)');
  const planOnly = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  const board = [{ state: 'live', kind: 'plan', title: PLAN_TITLE }, { state: 'closed', title: 'done' }];
  assert.equal(liveWorkCount(board), 0);
  planOnly.observe('fp', 0, { openCards: liveWorkCount(board), openSeats: [], coord: 'blinky', planDue: true });
  assert.equal(planOnly.observe('fp', 1_000, { openCards: liveWorkCount(board), openSeats: [], coord: 'blinky', planDue: true }), 'plan');
  assert.equal(wakeTitle(planOnly.run, 'blinky', 0), 'plan next wave');
  const carded = flagged.cards.concat([{ key: '0xrayai/xray#400', repo: '0xRayAI/xray', number: 400, title: 'next', state: 'live', wave: 'W3' }]);
  const cleared = scheduleWaves(carded, seed, { now: due + 60_000, coord: 'blinky', prior: flagged.cards, window: '* * * * *' });
  assert.equal(cleared.cards.find((card) => card.kind === 'plan').flag, '');
  assert.equal(cleared.planDue, false);
});

test('a restart does not re-arm the trip window', () => {
  const windowMs = 60_000;
  const board = { openCards: 1, openSeats: ['forge'], coord: 'blinky', planDue: true };
  const clock = createClock({ tripMs: windowMs, perSeatMs: 1_000, now: 0 });
  clock.observe('a', 0, board);
  clock.observe('a', windowMs - 1_000, board);
  const restarted = createClock({ tripMs: windowMs, perSeatMs: 1_000, now: windowMs - 1_000, state: clock.snapshot() });
  assert.equal(restarted.observe('a', windowMs - 1_000, board), null);
  assert.equal(restarted.observe('a', windowMs, board), 'stall');
  assert.ok(Object.keys(restarted.run.deadlines).includes('forge'));
});

test('the load command prints the seed and refuses the live board', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wave-seed-')), 'cards.json');
  const printed = spawnSync(process.execPath, [TOOL, '--out', out], {
    encoding: 'utf8',
    env: { ...process.env, LIVE_URL: `https://${'burst-live-production.up.railway.app'}` },
  });
  assert.equal(printed.status, 0, printed.stderr);
  assert.match(printed.stderr, /not posted/);
  assert.match(printed.stderr, /current wave posts 1 card/);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).cards.map((card) => card.wave), ['W1', 'W2', 'W3', 'W4', 'W5']);
  const refused = spawnSync(process.execPath, [TOOL, '--apply'], {
    encoding: 'utf8',
    env: { ...process.env, LIVE_URL: 'https://burst-live-production.up.railway.app' },
  });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /refusing to post the seed to the live board/);
  assert.equal(refuseLiveApply('https://burst-live-production.up.railway.app', ''), 'refusing to post the seed to the live board');
  assert.equal(refuseLiveApply('http://127.0.0.1:9', ''), '');
});

function planOnlyCard() {
  return {
    key: 'plan:next-wave', kind: 'plan', title: PLAN_TITLE, state: 'live', owner: 'blinky',
    due_at: 1, raised_at: 1, last_beat_t: Date.now(), flag: '', seen: [],
    backlog: [
      { rank: 2, wave: 'W2', title: '#389' },
      { rank: 3, wave: 'W3', title: '#386' },
      { rank: 4, wave: 'W4', title: '#397' },
    ],
  };
}

async function bootPlanBoard(burn) {
  const hits = [];
  const sink = http.createServer((q, s) => {
    let body = '';
    q.on('data', (d) => { body += d; });
    q.on('end', () => {
      try { hits.push(JSON.parse(body || '{}')); } catch { hits.push({ raw: body }); }
      s.writeHead(200); s.end('{}');
    });
  });
  await new Promise((resolve) => sink.listen(0, '127.0.0.1', resolve));
  const hook = sink.address().port;
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-burn-'));
  const route = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-burn-route-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({ updated_ct: new Date().toISOString(), cards: [planOnlyCard()] }));
  fs.writeFileSync(path.join(route, 'inbox-roles.json'), JSON.stringify({ seats: { coord: { seat: 'blinky' } } }));
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
      MESH_DATA_DIR: data, BIFROST_ROUTING_DIR: route, BIFROST_WEEKLY_BURN: burn,
      BIFROST_TICK_S: '0.2', BIFROST_TRIPWIRE_MINUTES: '0.02', BIFROST_RUN_SEAT_MINUTES: '0.01',
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      SEAT_WEBHOOKS: JSON.stringify({ blinky: { url: `http://127.0.0.1:${hook}/blinky` } }),
      WAKE_KEY_BLINKY: 'wk', WAKE_DEBOUNCE_S: '0', WAKE_STAGGER_MS: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    await listenPort(child);
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (/clock: (plan|empty) run started/.test(logs) || /weekly burn quiet/.test(logs)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { logs, hits };
  } finally {
    if (child.exitCode == null) {
      const done = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await done;
    }
    sink.close();
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(route, { recursive: true, force: true });
  }
}

test('a plan-only board at BIFROST_WEEKLY_BURN=0.75 does not wake blinky', async () => {
  const quietBoard = { openCards: 0, openSeats: [], coord: 'blinky', planDue: false, burnQuiet: true };
  const quietClock = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  quietClock.observe('fp', 0, quietBoard);
  assert.equal(quietClock.observe('fp', 1_000, quietBoard), 'quiet');
  assert.equal(quietClock.run, null);
  const below = { openCards: 0, openSeats: [], coord: 'blinky', planDue: false, burnQuiet: false };
  const belowClock = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  belowClock.observe('fp', 0, below);
  assert.equal(belowClock.observe('fp', 1_000, below), 'empty');
  assert.equal(wakeTitle(belowClock.run, 'blinky', 0), 'board empty');
  const due = { openCards: 0, openSeats: [], coord: 'blinky', planDue: true, burnQuiet: false };
  const dueClock = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  dueClock.observe('fp', 0, due);
  assert.equal(dueClock.observe('fp', 1_000, due), 'plan');
  assert.equal(wakeTitle(dueClock.run, 'blinky', 0), 'plan next wave');

  const burned = await bootPlanBoard('0.75');
  assert.match(burned.logs, /clock: weekly burn quiet, empty board not woken/);
  assert.doesNotMatch(burned.logs, /clock: (empty|plan) run started/);
  assert.equal(burned.hits.length, 0);
  const open = await bootPlanBoard('0.74');
  assert.match(open.logs, /clock: plan run started/);
  assert.equal(open.hits.some((hit) => hit.seat === 'blinky' && hit.title === 'plan next wave'), true);
});
