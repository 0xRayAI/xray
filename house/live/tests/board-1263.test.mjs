// #1263: prompt lines name their receiver, the owner draws as the owner node, a line naming a card links to it,
// the archive keeps the note, and a seat token reads /history.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { project } from '../app/archive.mjs';

const serverSrc = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
const liveSrc = fs.readFileSync(new URL('../app/public/live.js', import.meta.url), 'utf8');

function mesh() {
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(liveSrc, ctx);
  return ctx.LiveMesh;
}

function cardRef() {
  const re = /const CARD_REF = [^\n]+\nfunction activityCardRef\(text, repos\) \{[\s\S]*?\n\}\n/.exec(serverSrc);
  assert.ok(re, 'activityCardRef is defined in server.mjs');
  return new Function(re[0] + 'return activityCardRef;')();
}

test('owner, the owner name, and any case resolve through NODE_KEY to the owner node', () => {
  const L = mesh();
  L.SATS.Lead = [1, 1];
  L.SATS.critic = L.SATS.critic || [2, 2];
  L.NODE_KEY = { Blaze: 'Lead' };
  assert.deepEqual([...L.resolveNodes({ kind: 'seat_prompt', from: 'Blaze', to: 'critic' })], ['Lead', 'critic']);
  assert.deepEqual([...L.resolveNodes({ kind: 'seat_prompt', from: 'blaze', to: 'CRITIC' })], ['Lead', 'critic']);
  assert.deepEqual([...L.resolveNodes({ kind: 'seat_prompt', from: 'owner', to: 'critic' })], ['Lead', 'critic']);
  L.SATS.Boss = [3, 3];
  L.NODE_KEY = { owner: 'Boss' };
  L.OWNER_NAME = 'Pat';
  assert.equal(L.drawnNode('pat'), 'Boss');
  assert.equal(L.drawnNode('Owner'), 'Boss');
  assert.equal(L.drawnNode('nobody'), 'nobody');
  assert.deepEqual([...L.resolveNodes({ kind: 'seat_prompt', from: 'nobody', to: 'critic' })], ['X', 'critic']);
});

test('a note or tag naming owner/repo#n links the line to that card', () => {
  const ref = cardRef();
  assert.deepEqual(ref('board check example-org/app#12 done', []), { repo: 'example-org/app', number: 12 });
  assert.deepEqual(ref('look at app#7', ['example-org/app', 'example-org/site']), { repo: 'example-org/app', number: 7 });
  assert.equal(ref('look at app#7', ['a/app', 'b/app']), null);
  assert.equal(ref('look at app#7', []), null);
  assert.deepEqual(ref('board ship check xray#1263', []), { repo: '0xRayAI/xray', number: 1263 });
  assert.equal(ref('PR #12 is next', ['example-org/app']), null);
  assert.equal(ref('', []), null);
  assert.match(serverSrc, /if \(ref\) \{ ev\.repo = ref\.repo; ev\.number = ref\.number; \}/);
});

test('the archive keeps a prompt note on events and activity rows', () => {
  const ev = project('events', { id: 'act:1.2', kind: 'seat_prompt', from: 'Blaze', to: 'critic', note: 'hello board', room: 'ops', repo: 'example-org/app', number: 3 });
  assert.equal(ev.note, 'hello board');
  assert.equal(ev.room, 'ops');
  assert.equal(ev.number, 3);
  const act = project('activity', { id: '1.2', seq: 2, seat: 'operator', kind: 'prompt', action: 'sent', from: 'Blaze', to: 'critic', note: 'hello board' });
  assert.equal(act.note, 'hello board');
  assert.equal(act.to, 'critic');
  assert.equal(project('activity', { id: '1', message: 'x', token: 'y' }).message, undefined);
});

test('/history read routes accept a valid seat token, else 401', () => {
  const at = serverSrc.indexOf("p === '/history' || p === '/history/cards'");
  assert.ok(at > 0);
  const block = serverSrc.slice(at, at + 600);
  assert.match(block, /if \(!validSession\(req\)\) \{/);
  assert.match(block, /who = await seatOf\(req\)/);
  assert.match(block, /if \(!who\) return json\(req, res, 401, \{ error: 'unauthorized' \}\);/);
});
