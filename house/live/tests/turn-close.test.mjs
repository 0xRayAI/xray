// Hotfix: an ack (tag ack) closes the turn a wake (tag wake) opened; an open turn expires after LIVE_TURN_OPEN_MIN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
test('turn key ignores tag, open turns expire', () => {
  assert.match(src, /line\.agent \|\| \(line\.kind === 'turn' \? '-' : line\.tag\)/);
  assert.match(src, /=== 'turn' \? TURN_OPEN_MS :/);
});
