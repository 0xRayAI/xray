import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createClock } from '../app/governor.mjs';
import { loadSeedFile, refuseLiveApply } from '../tools/load-wave-seed.mjs';
import { PLAN_FLAG, PLAN_TITLE, cardClosed, cardsFromSeed, scheduleWaves } from '../app/wave-schedule.mjs';

const SEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'grok-bot', 'templates', 'house', 'bifrost-waves.json');
const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'load-wave-seed.mjs');
const seed = loadSeedFile(SEED);

function close(cards, wave) {
  return cards.map((card) => (card.wave === wave ? { ...card, state: 'closed', stage: 'done' } : card));
}

test('the seed is W1 through W5', () => {
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
});

test('a closed wave raises one plan next wave card for the CoS with the ranked backlog', () => {
  const open = cardsFromSeed(seed, { now: 5_000, coord: 'blinky' });
  assert.equal(scheduleWaves(open, seed, { now: 5_000, coord: 'blinky' }).cards.some((card) => card.title === PLAN_TITLE), false);
  const closed = close(open, 'W1');
  const first = scheduleWaves(closed, seed, { now: 5_000, coord: 'blinky', tripMs: 30 * 60_000 });
  const plans = first.cards.filter((card) => card.title === PLAN_TITLE);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].owner, 'blinky');
  assert.deepEqual(plans[0].backlog.map((item) => item.wave), ['W2', 'W3', 'W4', 'W5']);
  assert.match(plans[0].packet.constraints, /W2 #389 ponder\/reflections/);
  const again = scheduleWaves(first.cards, seed, { now: 6_000, coord: 'blinky', prior: first.cards, tripMs: 30 * 60_000 });
  assert.equal(again.cards.filter((card) => card.title === PLAN_TITLE).length, 1);
  assert.equal(again.planDue, false);
});

test('a merged card closes its wave, and a later closed wave drops out of the backlog', () => {
  const cards = cardsFromSeed(seed, { now: 1, coord: 'blinky' }).map((card) => {
    if (card.wave === 'W1') return { ...card, state: 'live', beats: [{ what: 'merged' }] };
    if (card.wave === 'W3') return { ...card, state: 'closed' };
    return card;
  });
  assert.equal(cardClosed(cards[0]), true);
  const scheduled = scheduleWaves(cards, seed, { now: 1, coord: 'blinky' });
  assert.deepEqual(scheduled.cards.find((card) => card.kind === 'plan').backlog.map((item) => item.wave), ['W2', 'W4', 'W5']);
});

test('the tripwire flags the plan card when nothing is carded in the window', () => {
  const raisedAt = 10_000;
  const closed = close(cardsFromSeed(seed, { now: raisedAt, coord: 'blinky' }), 'W1');
  const raised = scheduleWaves(closed, seed, { now: raisedAt, coord: 'blinky', tripMs: 1_000 });
  const plan = raised.cards.find((card) => card.kind === 'plan');
  assert.equal(plan.flag, '');
  const flagged = scheduleWaves(raised.cards, seed, { now: raisedAt + 1_000, coord: 'blinky', prior: raised.cards, tripMs: 1_000 });
  assert.equal(flagged.cards.find((card) => card.kind === 'plan').flag, PLAN_FLAG);
  assert.equal(flagged.planDue, true);
  const clock = createClock({ tripMs: 1_000, perSeatMs: 10, now: 0 });
  clock.observe('fp', 0, { openCards: 1, openSeats: ['forge'], coord: 'blinky', planDue: true });
  assert.equal(clock.observe('fp', 1_000, { openCards: 1, openSeats: ['forge'], coord: 'blinky', planDue: true }), 'plan');
  assert.deepEqual(Object.keys(clock.run.deadlines), ['blinky']);
  const carded = flagged.cards.concat([{ key: '0xrayai/xray#400', title: 'next', state: 'live', wave: 'W2' }]);
  const cleared = scheduleWaves(carded, seed, { now: raisedAt + 2_000, coord: 'blinky', prior: flagged.cards, tripMs: 1_000 });
  assert.equal(cleared.cards.find((card) => card.kind === 'plan').flag, '');
  assert.equal(cleared.planDue, false);
});

test('the load command prints the seed and refuses the live board', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wave-seed-')), 'cards.json');
  const printed = spawnSync(process.execPath, [TOOL, '--out', out], {
    encoding: 'utf8',
    env: { ...process.env, LIVE_URL: `https://${'burst-live-production.up.railway.app'}` },
  });
  assert.equal(printed.status, 0, printed.stderr);
  assert.match(printed.stderr, /not posted/);
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
