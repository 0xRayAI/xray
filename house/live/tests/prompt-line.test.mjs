// A prompt event is one readable line. The activity log truncates it and keeps the full note.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public', 'live.js');

function mesh() {
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(pub, 'utf8'), ctx);
  return ctx.LiveMesh;
}

test('prompt events read as Blaze → seat, truncated, with the full note kept', () => {
  const L = mesh();
  const bare = L.promptView({ kind: 'seat_prompt', from: 'Blaze', to: 'forge', label: 'Blaze prompt sent' });
  assert.equal(bare.line, 'Blaze → forge');
  assert.equal(bare.note, '');
  assert.equal(bare.short, bare.line);
  const room = L.promptView({ kind: 'seat_prompt', from: 'Blaze', to: 'forge', room: 'ops', label: 'Blaze prompt sent · ops' });
  assert.equal(room.line, 'Blaze → forge');
  const legacy = L.promptView({ kind: 'prompt_message', from: 'Lead', to: 'Operator', label: 'message' });
  assert.equal(legacy.line, 'Lead → Operator');
  assert.equal(legacy.note, '');
  const note = 'check the message on the board';
  const said = L.promptView({ kind: 'seat_prompt', from: 'Blaze', to: 'forge', note, label: 'Blaze → forge: ' + note });
  assert.equal(said.line, 'Blaze → forge: ' + note);
  assert.equal(said.note, note);
  const long = 'look at the board. '.repeat(20).trim();
  const wide = L.promptView({ kind: 'seat_prompt', from: 'Blaze', to: 'forge', note: long });
  assert.equal(wide.line, 'Blaze → forge: ' + long);
  assert.equal(wide.short.length, 72);
  assert.ok(wide.short.endsWith('…'));
  assert.ok(wide.line.length > wide.short.length);
  assert.equal(L.promptView({ kind: 'seat_turn', from: 'forge', label: 'forge turn start' }), null);
});
