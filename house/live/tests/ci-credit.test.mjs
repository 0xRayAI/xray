// Stored CI rows from 2026-10-20: from is GitHub. The actor or the app names the seat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creditCiFrom, loadCiNodes } from '../app/ci-credit.mjs';

const nodes = loadCiNodes();
const store = JSON.parse(fs.readFileSync(new URL('./fixtures/ci_github_store.json', import.meta.url), 'utf8'));

test('stored and new CI rows take the seat from the actor or the app', () => {
  const rows = Object.values(store.events).map(row => creditCiFrom(row, nodes));
  const from = Object.fromEntries(rows.map(row => [row.id.split(':').pop(), row.from]));
  assert.equal(from.forge, 'forge');
  assert.equal(from.cursor, 'GitHub');
  assert.equal(from.blaze, 'Blaze');
  assert.equal(from.actions, 'GitHub');
  assert.equal(from.app, 'forge');
  const fresh = creditCiFrom({
    id: '0xRayAI/xray:run:new',
    kind: 'workflow_run',
    from: 'CI',
    actor: 'forge0x1[bot]',
    credit: 'forge',
  }, nodes);
  assert.equal(fresh.from, 'forge');
  const bugbot = creditCiFrom({
    id: '0xRayAI/xray:run:bugbot',
    kind: 'workflow_run',
    from: 'CI',
    actor: 'cursor[bot]',
    credit: 'github',
  }, nodes);
  assert.equal(bugbot.from, 'CI');
});

test('the history page badges a brief only on a packet PR', () => {
  const html = fs.readFileSync(new URL('../app/public/index.html', import.meta.url), 'utf8');
  const start = html.indexOf('function wbNeedsBrief');
  const end = html.indexOf('function card(', start);
  assert.ok(start > 0 && end > start);
  const wbNeedsBrief = new Function(`${html.slice(start, end)}; return wbNeedsBrief;`)();
  const shape = JSON.parse(fs.readFileSync(new URL('./fixtures/brief-cards.json', import.meta.url), 'utf8'));
  for (const card of shape.issues.concat([shape.plain_pr, shape.packet_card, shape.packet_pr_done])) {
    assert.equal(wbNeedsBrief(card), false, card.key);
  }
  assert.equal(wbNeedsBrief(shape.packet_pr_open), true);
  assert.match(html, /else if \(brief\) meta\.appendChild\(wbEl\('span', 'wbadge', 'needs a brief'\)\)/);
  assert.match(html, /wbadge cloud/);
});
