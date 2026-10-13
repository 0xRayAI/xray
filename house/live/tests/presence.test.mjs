import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatPresence, presentSeat, foldSeatTouch } from '../app/presence.mjs';

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
