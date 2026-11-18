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
  assert.equal(L.kanbanColumn({ stage: 'Review', state: 'Live' }), 'review');
  assert.equal(L.kanbanColumn({ stage: 'fix', state: 'live' }), 'fix');
  assert.equal(L.kanbanColumn({ stage: 'review', state: 'closed' }), 'done');
  assert.equal(L.kanbanColumn({ stage: 'review', state: 'Closed' }), 'done');
  assert.equal(L.kanbanColumn({ stage: 'done', state: 'live' }), 'done');
  assert.equal(L.kanbanColumn({ stage: 'nope', state: 'live' }), 'nope');
  assert.equal(L.kanbanColumn({ stage: 'Nope', state: 'live' }), 'nope');
  assert.equal(L.kanbanColumn(null), 'open');
  assert.equal(L.statusFlagged('nope'), true);
  assert.equal(L.statusFlagged('Nope'), true);
  assert.equal(L.statusFlagged('review'), false);
  assert.equal(L.statusFlagged('Review'), false);
  assert.equal(L.statusName('in_flight'), 'In Flight');
  assert.equal(L.statusName('In Flight'), 'In Flight');
});

test('a stored id and its display name share a column and a filter', () => {
  const L = loadLive();
  const cards = [
    { key: 'id', stage: 'in_flight', state: 'live' },
    { key: 'name', stage: 'In Flight', state: 'live' },
    { key: 'review-id', stage: 'review', state: 'live' },
    { key: 'review-name', stage: 'Review', state: 'live' },
    { key: 'odd', stage: 'nope', state: 'live' },
  ];
  assert.equal(L.kanbanColumn(cards[0]), 'in_flight');
  assert.equal(L.kanbanColumn(cards[1]), L.kanbanColumn(cards[0]));
  assert.equal(L.statusFlagged('in_flight'), true);
  assert.equal(L.kanbanColumn(cards[2]), 'review');
  assert.equal(L.kanbanColumn(cards[3]), 'review');
  assert.equal(L.cardBucket(cards[2]), 'review');
  assert.equal(L.cardBucket(cards[3]), 'review');
  assert.deepEqual(L.cardsForStatus(cards, 'In Flight').map((c) => c.key), ['id', 'name']);
  assert.deepEqual(L.cardsForStatus(cards, 'in_flight').map((c) => c.key), ['id', 'name']);
  assert.deepEqual(L.cardsForStatus(cards, 'review').map((c) => c.key), ['review-id', 'review-name']);
  assert.deepEqual(L.cardsForStatus(cards, 'Nope').map((c) => c.key), ['odd']);
  assert.equal(L.kanbanColumn(cards[4]), 'nope');
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  assert.equal(html.includes("if (!cols[col]) col = 'open'"), false);
  assert.match(html, /dataset\.flagged = 'unknown'/);
});

test('cardGithubUrl prefers a GitHub url and builds one from repo and number', () => {
  const L = loadLive();
  assert.equal(L.cardGithubUrl({ url: 'https://github.com/acme/app/pull/4', kind: 'pr' }), 'https://github.com/acme/app/pull/4');
  assert.equal(L.cardGithubUrl({ repo: 'acme/app', number: 8, kind: 'issue' }), 'https://github.com/acme/app/issues/8');
  assert.equal(L.cardGithubUrl({ repo: 'acme/app', number: 9, kind: 'pr' }), 'https://github.com/acme/app/pull/9');
  assert.equal(L.cardGithubUrl({ pinned: true, title: 'note' }), '');
  assert.equal(L.cardGithubUrl({ url: 'https://example.com/not-github' }), '');
});
