import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seatPresence, presentSeat, foldSeatTouch, configuredRoster } from '../app/presence.mjs';

test('seatPresence keeps a string and accepts an array of dest seats', () => {
  assert.deepEqual(seatPresence(''), {});
  assert.deepEqual(seatPresence('{"builder-cloud":"builder"}'), { 'builder-cloud': ['builder'] });
  assert.deepEqual(seatPresence('{"builder-cloud":["builder","coord"]}'), { 'builder-cloud': ['builder', 'coord'] });
  assert.deepEqual(seatPresence('[["builder-cloud","builder"]]'), { 'builder-cloud': ['builder'] });
  assert.deepEqual(seatPresence('{'), { 'builder-cloud': ['builder'] });
});

test('presentSeat folds every dest in an array', () => {
  const seats = {
    'builder-cloud': { last_ct: '2026-10-12T12:00:00Z', working: true },
    builder: { last_ct: '2026-10-12T10:00:00Z', working: false },
  };
  const presence = { 'builder-cloud': ['builder', 'coord'] };
  const builder = presentSeat(seats, 'Builder', presence);
  assert.equal(builder.working, true);
  assert.equal(builder.last, Date.parse('2026-10-12T12:00:00Z'));
  const coord = presentSeat(seats, 'coord', presence);
  assert.equal(coord.working, true);
});

test('foldSeatTouch: wake / inbox read / ack within the window makes a seat active; old touches only update last_ct', () => {
  const now = Date.parse('2026-10-13T15:00:00Z');
  const fleet = { window_min: 15, seats: { forge: { active: false, last_ct: '2026-10-13T12:00:00Z', via: 'github' }, critic: { active: false, last_ct: null } }, active: 0, total: 2 };
  const f = foldSeatTouch(fleet, { forge: now - 60000, critic: now - 3600000, mill: now - 1000 }, now);
  assert.equal(f.seats.forge.active, true); assert.equal(f.seats.forge.via, 'inbox');
  assert.equal(f.seats.critic.active, false); assert.equal(f.seats.critic.last_ct, '2026-10-13T14:00:00.000Z');
  assert.equal(f.seats.mill.active, true);
  assert.deepEqual([f.active, f.total], [2, 3]);
  assert.equal(fleet.seats.forge.active, false);   // pure
  assert.equal(foldSeatTouch(fleet, {}, now), fleet);
});

test('an inbox touch does not mark the seat working', () => {
  const now = Date.parse('2026-10-28T15:00:00Z');
  const fleet = { window_min: 15, seats: { arch1: { active: false, working: false, last_ct: null, via: null } }, working: {}, active: 0, total: 1 };
  const f = foldSeatTouch(fleet, { arch1: now - 1000, mill: now - 1000 }, now);
  assert.equal(f.seats.arch1.active, true);
  assert.equal(f.seats.arch1.working, false);
  assert.equal(f.seats.arch1.via, 'inbox');
  assert.equal(f.seats.mill.working, false);
  assert.equal(f.working.arch1, undefined);
  assert.equal(fleet.seats.arch1.working, false);
});

const FEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed');

test('configuredRoster unions the live seat list with the committed roster and ignores a short board', () => {
  const file = JSON.parse(fs.readFileSync(path.join(FEED, 'fleet-roster.json'), 'utf8'));
  const extra = 'seat-from-env';
  const env = { LIVE_FLEET_SEATS: JSON.stringify({ board: ['blinky', 'critic', 'forge'], seats: [extra, 'forge', 'critic', 'blinky'] }) };
  const roster = configuredRoster(env, [FEED]);
  assert.ok(roster.names.length > 3);
  assert.equal(roster.names[0], extra);
  for (const name of file.seats) assert.ok(roster.names.includes(name), name);
  for (const name of file.parked) assert.ok(roster.names.includes(name), name);
  assert.equal(roster.roles.blinky, 'chief of staff');
  assert.equal(roster.roles.critic, 'reviewer');
  assert.equal(roster.roles.forge, 'eng primary');
  assert.ok(!roster.names.includes('Blaze'));
  assert.ok(!roster.names.includes('CI'));
});

test('configuredRoster uses the node map only when no seat list is configured', () => {
  const roster = configuredRoster({
    LIVE_NODE_MAP: JSON.stringify({ 'forge0x1[bot]': 'forge', 'critic0x[bot]': 'critic', 'github-actions[bot]': 'CI' }),
  }, []);
  assert.deepEqual(roster.names, ['critic', 'forge']);
});

test('a bad LIVE_FLEET_SEATS value does not hide the committed roster', () => {
  const file = JSON.parse(fs.readFileSync(path.join(FEED, 'fleet-roster.json'), 'utf8'));
  const roster = configuredRoster({ LIVE_FLEET_SEATS: '{not json' }, [FEED]);
  assert.deepEqual(roster.names, file.seats);
  assert.ok(roster.names.length > 3);
});

test('the server publishes that roster on the feed header', () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs'), 'utf8');
  assert.match(src, /configuredRoster\(process\.env/);
  assert.match(src, /h\.roster = roster\.names/);
  assert.match(src, /h\.roster_roles = roster\.roles/);
});
