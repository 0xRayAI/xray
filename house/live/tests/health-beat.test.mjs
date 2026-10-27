import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startHealthBeat } from '../app/health-beat.mjs';

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

test('a missed health beat fires once', async () => {
  let misses = 0;
  const beat = startHealthBeat({ observe: true, missMs: 80, everyMs: 1000, checkMs: 20, onMiss: () => { misses += 1; } });
  await wait(180);
  assert.equal(misses, 1);
  await beat.stop();
});

test('a live beat does not fire', async () => {
  let misses = 0;
  const beat = startHealthBeat({ observe: true, missMs: 200, everyMs: 40, checkMs: 20, onMiss: () => { misses += 1; } });
  await wait(320);
  assert.equal(misses, 0);
  await beat.stop();
});
