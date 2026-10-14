// Hotfix: seat turn events target the 'Bifrost' node and carry a CT offset t_ct, never a bare Z.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
const ctOffset = new Function(src.match(/function ctOffset[\s\S]*?\n}\n/)[0] + 'return ctOffset;')();
test('ctOffset gives CT wall time with offset', () => {
  assert.equal(ctOffset('2026-10-14T20:21:03.000Z'), '2026-10-14T15:21:03-05:00');
  assert.equal(ctOffset('2026-01-14T20:00:00Z'), '2026-01-14T14:00:00-06:00');
});
test('turn events go to Bifrost', () => {
  assert.match(src, /line\.agent \? 'cloud' : 'Bifrost'/);
  assert.doesNotMatch(src, /'bifrost'/);
});
