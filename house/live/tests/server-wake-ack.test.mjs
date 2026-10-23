// Hotfix: the server records a delivered wake as turn start and an inbox ack as turn end for that seat. (CI re-run after merge.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
test('wake opens and ack closes the seat turn server-side', () => {
  assert.match(src, /noteSent\(wakeState, seat, batch, Date\.now\(\)\)/);
  assert.match(src, /persistWakeOk\(\);\n\s*serverActivity\(seat, 'turn', 'start', 'wake', \{ moves: false \}\)/);
  assert.match(src, /ackLines\(who, what, review\); touchSeat\(who\);\n\s*if \(n < 0\) return json\(req, res, 404, \{ error: 'no such line' \}\);\n\s*if \(n\) serverActivity\(who, 'turn', 'end', 'ack'\)/);
  assert.match(src, /function serverActivity\(seat, kind, action, tag, opts\)/);
});
