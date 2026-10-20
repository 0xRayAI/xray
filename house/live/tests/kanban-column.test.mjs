// Stage column and GitHub face link for the read-only kanban.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');

function loadLive() {
  const L = {
    SOURCES: [], AGENTS: [], SEAT_NAMES: [], SATS: {}, COLOR: {}, LABEL: {}, SUB: {}, GLYPH: {}, SQUARE: {},
    EDGES: [], BOT_IMAGES: [], KIND_WORD: {}, applyFeed: (st, feed) => ({ state: { events: feed.events } }),
  };
  new Function('window', 'location', fs.readFileSync(path.join(APP, 'live-config.js'), 'utf8'))(
    { LiveMesh: L, LIVE_FEED_URL: '/live-events.json' }, { search: '' });
  return L;
}

test('kanbanColumn uses stage and parks a closed card in done', () => {
  const L = loadLive();
  assert.deepEqual(L.KANBAN_STAGES, ['open', 'review', 'fix', 'merge', 'retest', 'done']);
  assert.equal(L.kanbanColumn({ stage: 'review', state: 'live' }), 'review');
  assert.equal(L.kanbanColumn({ stage: 'fix', state: 'live' }), 'fix');
  assert.equal(L.kanbanColumn({ stage: 'review', state: 'closed' }), 'done');
  assert.equal(L.kanbanColumn({ stage: 'done', state: 'live' }), 'done');
  assert.equal(L.kanbanColumn({ stage: 'nope', state: 'live' }), 'open');
  assert.equal(L.kanbanColumn(null), 'open');
});

test('cardGithubUrl prefers a GitHub url and builds one from repo and number', () => {
  const L = loadLive();
  assert.equal(L.cardGithubUrl({ url: 'https://github.com/acme/app/pull/4', kind: 'pr' }), 'https://github.com/acme/app/pull/4');
  assert.equal(L.cardGithubUrl({ repo: 'acme/app', number: 8, kind: 'issue' }), 'https://github.com/acme/app/issues/8');
  assert.equal(L.cardGithubUrl({ repo: 'acme/app', number: 9, kind: 'pr' }), 'https://github.com/acme/app/pull/9');
  assert.equal(L.cardGithubUrl({ pinned: true, title: 'note' }), '');
  assert.equal(L.cardGithubUrl({ url: 'https://example.com/not-github' }), '');
});
