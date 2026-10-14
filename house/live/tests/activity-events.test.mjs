// Hotfix: seat activity (POST /activity, server wake/ack) becomes a board event, so seat-to-seat traffic is drawn live.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
test('activity lines are upserted as seat events', () => {
  assert.match(src, /function activityEvent\(line\)/);
  assert.match(src, /appendArchive\('activity', line\);\n    activityEvent\(line\);/);
  assert.match(src, /appendArchive\('activity', line\); activityEvent\(line\);/);
});
