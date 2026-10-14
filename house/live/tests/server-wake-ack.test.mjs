// Hotfix: the server records a delivered wake as turn start and an inbox ack as turn end for that seat.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
test('wake opens and ack closes the seat turn server-side', () => {
  assert.match(src, /persistWakeOk\(\); serverActivity\(seat, 'turn', 'start', 'wake'\)/);
  assert.match(src, /ackLines\(who, what\); touchSeat\(who\); if \(n\) serverActivity\(who, 'turn', 'end', 'ack'\)/);
  assert.match(src, /function serverActivity\(seat, kind, action, tag\)/);
});
